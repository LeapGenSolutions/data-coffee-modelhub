import {
  DocumentChunk,
  VectorSearchResult,
  BM25Result,
  HybridSearchResult,
  RerankedChunk,
  SemanticCitation,
} from '../types';

const EMBEDDING_MODEL = 'text-embedding-3-small';
const VECTOR_DIMENSION = 1536;

/* ─── 1. Document Chunking with Line Tracking ─── */

/**
 * Splits document content into semantic line-tracked chunks for vector & lexical indexing.
 */
export function chunkDocument(
  documentName: string,
  content: string,
  chunkSizeLines = 25,
  overlapLines = 5
): DocumentChunk[] {
  if (!content || !content.trim()) return [];

  const lines = content.split(/\r?\n/);
  const chunks: DocumentChunk[] = [];
  let chunkIndex = 0;
  let currentStart = 0;

  while (currentStart < lines.length) {
    const currentEnd = Math.min(lines.length, currentStart + chunkSizeLines);
    const chunkLines = lines.slice(currentStart, currentEnd);
    const chunkText = chunkLines.join('\n').trim();

    if (chunkText.length > 0) {
      // Rough token estimation (~3.8 chars/token)
      const tokenCount = Math.max(1, Math.ceil(chunkText.length / 3.8));
      chunks.push({
        id: `chunk_${documentName.replace(/[^a-zA-Z0-9]/g, '_')}_${chunkIndex}`,
        documentName,
        chunkIndex,
        startLine: currentStart + 1, // 1-indexed
        endLine: currentEnd,
        content: chunkText,
        tokenCount,
      });
      chunkIndex++;
    }

    if (currentEnd >= lines.length) break;
    currentStart += chunkSizeLines - overlapLines;
  }

  return chunks;
}

/* ─── 2. Okapi BM25 Lexical Search Engine ─── */

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s\-\.\_\/]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

/**
 * Computes Okapi BM25 lexical scores across a collection of document chunks.
 * Parameters: k1 = 1.5, b = 0.75
 */
export function computeBM25Scores(query: string, chunks: DocumentChunk[], k1 = 1.5, b = 0.75): BM25Result[] {
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0 || chunks.length === 0) {
    return chunks.map((c) => ({ chunk: c, bm25Score: 0 }));
  }

  const N = chunks.length;
  const chunkTokenLists = chunks.map((c) => tokenize(c.content));
  const docLengths = chunkTokenLists.map((tokens) => tokens.length);
  const avgdl = docLengths.reduce((sum, len) => sum + len, 0) / Math.max(1, N);

  // Compute Document Frequency (DF) for each query token
  const dfMap = new Map<string, number>();
  for (const token of queryTokens) {
    let df = 0;
    for (const tokens of chunkTokenLists) {
      if (tokens.includes(token)) df++;
    }
    dfMap.set(token, df);
  }

  // Calculate BM25 for each chunk
  return chunks.map((chunk, idx) => {
    const tokens = chunkTokenLists[idx];
    const docLen = docLengths[idx];
    const tfMap = new Map<string, number>();

    for (const t of tokens) {
      tfMap.set(t, (tfMap.get(t) || 0) + 1);
    }

    let score = 0;
    for (const qToken of queryTokens) {
      const tf = tfMap.get(qToken) || 0;
      if (tf > 0) {
        const df = dfMap.get(qToken) || 0;
        // Robertson-Spärck Jones IDF
        const idf = Math.log(1 + (N - df + 0.5) / (df + 0.5));
        const numerator = tf * (k1 + 1);
        const denominator = tf + k1 * (1 - b + b * (docLen / Math.max(1, avgdl)));
        score += idf * (numerator / denominator);
      }
    }

    return {
      chunk,
      bm25Score: Math.max(0, score),
    };
  });
}

/* ─── 3. Vector Embeddings & Cosine Similarity ─── */

/**
 * Generates normalized 1536-dimensional embeddings.
 * Tries OpenAI / Microsoft Foundry text-embedding-3-small endpoint first;
 * falls back to high-fidelity deterministic vector hashing when offline or without API key.
 */
export async function generateEmbedding(text: string, apiKey?: string, customEndpoint?: string): Promise<number[]> {
  const clean = text.slice(0, 8000);

  if (apiKey) {
    try {
      let endpoint = 'https://api.openai.com/v1/embeddings';
      const azureEndpoint = customEndpoint || process.env.AZURE_OPENAI_ENDPOINT || (!apiKey.startsWith('sk-') ? 'https://data-coffee-persona.openai.azure.com' : undefined);

      if (azureEndpoint) {
        // Strip trailing slash and any trailing /openai/v1 paths for Azure OpenAI
        const baseUrl = azureEndpoint.replace(/\/openai\/v1\/?$/, '').replace(/\/$/, '');
        endpoint = `${baseUrl}/openai/deployments/text-embedding-3-small/embeddings?api-version=2024-02-01`;
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'api-key': apiKey,
        },
        body: JSON.stringify({
          input: clean,
          model: EMBEDDING_MODEL,
          dimensions: VECTOR_DIMENSION,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        const embedding = json.data?.[0]?.embedding;
        if (Array.isArray(embedding) && embedding.length > 0) {
          return embedding;
        }
      }
    } catch {
      // Fall through to deterministic vector generator
    }
  }

  return generateDeterministicVector(clean, VECTOR_DIMENSION);
}

export async function embedChunks(chunks: DocumentChunk[], apiKey?: string, customEndpoint?: string): Promise<DocumentChunk[]> {
  const embeddedChunks: DocumentChunk[] = [];
  for (const chunk of chunks) {
    const embedding = await generateEmbedding(chunk.content, apiKey, customEndpoint);
    embeddedChunks.push({
      ...chunk,
      embedding,
    });
  }
  return embeddedChunks;
}

export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;
  return dotProduct / denominator;
}

/* ─── 4. Reciprocal Rank Fusion (RRF) Hybrid Search ─── */

/**
 * Executes enterprise Hybrid Search combining Dense Vector Cosine Similarity
 * and Sparse BM25 Lexical Keyword search using Reciprocal Rank Fusion (RRF).
 */
export async function searchHybridSemanticDocuments(
  query: string,
  documents: { name: string; content?: string }[],
  apiKey?: string,
  topK = 5,
  denseWeight = 0.6,
  bm25Weight = 0.4,
  rrfK = 60,
  customEndpoint?: string
): Promise<HybridSearchResult[]> {
  if (!query.trim() || !documents.length) return [];

  const allChunks: DocumentChunk[] = [];
  for (const doc of documents) {
    if (doc.content) {
      const chunks = chunkDocument(doc.name, doc.content);
      allChunks.push(...chunks);
    }
  }

  if (allChunks.length === 0) return [];

  // 1. Dense Vector Scoring
  const queryVec = await generateEmbedding(query, apiKey, customEndpoint);
  const embedded = await embedChunks(allChunks, apiKey, customEndpoint);
  const denseScored = embedded.map((chunk) => ({
    chunk,
    denseSimilarity: chunk.embedding ? cosineSimilarity(queryVec, chunk.embedding) : 0,
  }));
  denseScored.sort((a, b) => b.denseSimilarity - a.denseSimilarity);

  // 2. BM25 Lexical Scoring
  const bm25Scored = computeBM25Scores(query, allChunks);
  bm25Scored.sort((a, b) => b.bm25Score - a.bm25Score);

  // 3. Reciprocal Rank Fusion (RRF)
  const hybridMap = new Map<string, HybridSearchResult>();

  // Assign dense ranks
  denseScored.forEach((item, rank) => {
    const rrfDense = denseWeight / (rrfK + (rank + 1));
    hybridMap.set(item.chunk.id, {
      chunk: item.chunk,
      denseSimilarity: item.denseSimilarity,
      bm25Score: 0,
      rrfScore: rrfDense,
      denseRank: rank + 1,
      bm25Rank: allChunks.length,
      combinedScore: rrfDense,
    });
  });

  // Merge BM25 ranks
  bm25Scored.forEach((item, rank) => {
    const existing = hybridMap.get(item.chunk.id);
    const rrfBM25 = bm25Weight / (rrfK + (rank + 1));
    if (existing) {
      existing.bm25Score = item.bm25Score;
      existing.bm25Rank = rank + 1;
      existing.rrfScore += rrfBM25;
      existing.combinedScore = existing.rrfScore;
    } else {
      hybridMap.set(item.chunk.id, {
        chunk: item.chunk,
        denseSimilarity: 0,
        bm25Score: item.bm25Score,
        rrfScore: rrfBM25,
        denseRank: allChunks.length,
        bm25Rank: rank + 1,
        combinedScore: rrfBM25,
      });
    }
  });

  const hybridResults = Array.from(hybridMap.values());
  hybridResults.sort((a, b) => b.combinedScore - a.combinedScore);

  return hybridResults.slice(0, topK);
}

/* ─── 5. Second-Stage Cross-Score Re-ranking ─── */

/**
 * Cross-score re-ranks candidate retrieved chunks based on exact term density,
 * keyword proximity clustering, and structural importance (headers, code symbols).
 */
export function rerankContextChunks(
  query: string,
  candidates: HybridSearchResult[],
  topK = 3,
  minRelevanceThreshold = 0.005
): HybridSearchResult[] {
  if (candidates.length === 0) return [];

  const queryTerms = tokenize(query);

  const reranked = candidates.map((item) => {
    const content = item.chunk.content.toLowerCase();
    let exactMatches = 0;
    let headerBonus = 0;
    let proximityScore = 0;

    // Check query terms match
    for (const term of queryTerms) {
      if (content.includes(term)) {
        exactMatches++;
        // Boost if term is in markdown header or code definition
        if (content.includes(`# ${term}`) || content.includes(`function ${term}`) || content.includes(`class ${term}`)) {
          headerBonus += 0.25;
        }
      }
    }

    // Positional proximity heuristic for multi-term queries
    if (queryTerms.length >= 2) {
      const positions: number[] = [];
      for (const term of queryTerms) {
        const idx = content.indexOf(term);
        if (idx !== -1) positions.push(idx);
      }
      if (positions.length >= 2) {
        positions.sort((a, b) => a - b);
        const span = positions[positions.length - 1] - positions[0];
        if (span < 200) proximityScore = 0.2;
      }
    }

    const exactMatchRatio = exactMatches / Math.max(1, queryTerms.length);
    const rerankScore = item.combinedScore * (1 + exactMatchRatio * 0.8 + headerBonus + proximityScore);

    return {
      ...item,
      combinedScore: rerankScore,
      relevanceExplanation: `Hybrid RRF: ${(item.rrfScore * 100).toFixed(2)} | Exact Terms: ${exactMatches}/${queryTerms.length}`,
    };
  });

  // Filter out chunks below relevance threshold
  const filtered = reranked.filter((item) => item.combinedScore >= minRelevanceThreshold);
  filtered.sort((a, b) => b.combinedScore - a.combinedScore);

  return filtered.slice(0, topK);
}

/**
 * Primary search function — runs Hybrid RAG (Vector + BM25) + Cross-Re-ranking.
 */
export async function searchSemanticDocuments(
  query: string,
  documents: { name: string; content?: string }[],
  apiKey?: string,
  topK = 4,
  customEndpoint?: string
): Promise<VectorSearchResult[]> {
  const hybridCandidates = await searchHybridSemanticDocuments(query, documents, apiKey, topK * 3, 0.6, 0.4, 60, customEndpoint);
  const reranked = rerankContextChunks(query, hybridCandidates, topK);

  return reranked.map((item) => ({
    chunk: item.chunk,
    similarity: Math.min(0.99, Math.max(0.01, item.denseSimilarity || item.combinedScore * 10)),
  }));
}

/* ─── 6. RAG Prompt Context Builder ─── */

export function buildRagPromptContext(results: VectorSearchResult[]): {
  contextPrompt: string;
  citations: SemanticCitation[];
} {
  const citations: SemanticCitation[] = [];

  const contextBlocks = results.map((res, idx) => {
    const { chunk, similarity } = res;
    const citationId = `cite_${idx + 1}`;
    citations.push({
      id: citationId,
      documentName: chunk.documentName,
      startLine: chunk.startLine,
      endLine: chunk.endLine,
      snippet: chunk.content.slice(0, 180),
      score: Math.round(similarity * 100) / 100,
    });

    return `[SOURCE ${idx + 1}: ${chunk.documentName} (Lines ${chunk.startLine}-${chunk.endLine}) | Relevance: ${(similarity * 100).toFixed(1)}%]\n${chunk.content}`;
  });

  const contextPrompt = `=== VERIFIED WORKSPACE VECTOR & HYBRID RAG CONTEXT ===\n${contextBlocks.join('\n\n---\n\n')}\n=== END CONTEXT ===\n\nINSTRUCTION: Ground your response strictly in the verified sources above. For each referenced point or line range, ALWAYS cite using inline citation tags: [[cite:${citations[0]?.documentName || 'doc'}#L${citations[0]?.startLine || 1}-L${citations[0]?.endLine || 10}]] or [Doc: filename#L10-L25].`;

  return {
    contextPrompt,
    citations,
  };
}

/* ─── 7. Deterministic Fallback Vector Generator ─── */

function generateDeterministicVector(text: string, dim: number): number[] {
  const vec = new Float64Array(dim);
  const normalized = text.toLowerCase();
  const words = normalized.match(/[a-z0-9_]+/g) || ['empty'];

  // Word token and subword n-gram projections
  for (let w = 0; w < words.length; w++) {
    const word = words[w];
    let h1 = 0;
    for (let i = 0; i < word.length; i++) {
      h1 = (h1 * 31 + word.charCodeAt(i)) >>> 0;
    }
    vec[h1 % dim] += 2.0;

    // Character trigrams
    for (let i = 0; i < word.length - 2; i++) {
      const tri = word.slice(i, i + 3);
      let hTri = 0;
      for (let j = 0; j < 3; j++) {
        hTri = (hTri * 37 + tri.charCodeAt(j)) >>> 0;
      }
      vec[hTri % dim] += 0.8;
    }

    // Word bigram
    if (w < words.length - 1) {
      const bigram = `${word}_${words[w + 1]}`;
      let hBi = 0;
      for (let j = 0; j < bigram.length; j++) {
        hBi = (hBi * 41 + bigram.charCodeAt(j)) >>> 0;
      }
      vec[hBi % dim] += 1.5;
    }
  }

  // L2 Normalization
  let norm = 0;
  for (let i = 0; i < dim; i++) norm += vec[i] * vec[i];
  norm = Math.sqrt(norm) || 1;

  const result: number[] = new Array(dim);
  for (let i = 0; i < dim; i++) {
    result[i] = vec[i] / norm;
  }
  return result;
}
