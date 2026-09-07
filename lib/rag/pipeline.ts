import {
  VectorSearchResult,
  RAGResult,
} from '../../types';
import { generateEmbedding, buildRagPromptContext } from '../vectorDb';
import {
  hybridSearch,
  isSearchConfigured,
} from '../azure/searchClient';

/**
 * Executes the full RAG pipeline:
 * 1. Embed query via text-embedding-3-small
 * 2. Hybrid search (vector + BM25) against Azure AI Search
 * 3. Build grounded context prompt with citations
 *
 * Falls back to the legacy in-memory pipeline when Azure AI Search is not configured.
 */
export async function executeRAGPipeline(params: {
  query: string;
  workspaceId: string;
  apiKey?: string;
  azureEndpoint?: string;
  topK?: number;
  filters?: { documentIds?: string[]; fileTypes?: string[] };
}): Promise<RAGResult> {
  const { query, workspaceId, apiKey, azureEndpoint, topK = 4, filters } = params;
  const startTime = performance.now();

  if (!query.trim()) {
    return {
      contextPrompt: '',
      citations: [],
      chunks: [],
      searchTimeMs: 0,
    };
  }

  // ─── Primary path: Azure AI Search (persistent indexed vectors) ───
  if (isSearchConfigured()) {
    try {
      const isAzureKey = apiKey ? !apiKey.startsWith('sk-') : false;
      const queryVector = await generateEmbedding(
        query,
        apiKey,
        isAzureKey ? azureEndpoint : undefined,
      );

      const searchResults = await hybridSearch(query, queryVector, workspaceId, {
        topK,
        documentIds: filters?.documentIds,
        fileTypes: filters?.fileTypes,
      });

      const vectorResults: VectorSearchResult[] = searchResults.map((result) => ({
        chunk: {
          id: result.id,
          documentName: result.documentName,
          chunkIndex: result.chunkIndex,
          startLine: result.startLine,
          endLine: result.endLine,
          content: result.content,
          tokenCount: result.tokenCount,
        },
        similarity: result.score,
      }));

      const { contextPrompt, citations } = buildRagPromptContext(vectorResults);
      const searchTimeMs = Math.round(performance.now() - startTime);

      return {
        contextPrompt,
        citations,
        chunks: vectorResults,
        searchTimeMs,
      };
    } catch (err) {
      console.error('[RAG Pipeline] Azure AI Search failed, returning empty result:', err);
      return {
        contextPrompt: '',
        citations: [],
        chunks: [],
        searchTimeMs: Math.round(performance.now() - startTime),
      };
    }
  }

  // ─── Fallback: No Azure AI Search configured ───
  console.warn('[RAG Pipeline] Azure AI Search not configured. RAG search requires indexed documents.');
  return {
    contextPrompt: '',
    citations: [],
    chunks: [],
    searchTimeMs: Math.round(performance.now() - startTime),
  };
}

/**
 * Builds a combined prompt that injects RAG context + inline document content for
 * documents that were attached directly (not yet indexed in the vector store).
 * This supports the transitional case where documents are uploaded via the
 * composer but have not yet been processed through the server-side pipeline.
 */
export function buildInlineDocumentContext(
  prompt: string,
  attachments: { name: string; content?: string }[],
): string {
  if (!attachments.length) return prompt;

  const docContext = attachments
    .filter((doc) => doc.content && doc.content.trim().length > 0)
    .map(
      (doc) =>
        `--- FILE: ${doc.name} ---\n${doc.content}\n--- END FILE ---`,
    )
    .join('\n\n');

  if (!docContext) return prompt;

  return `Use the following attached document context if relevant:\n\n${docContext}\n\nUser Request: ${prompt}`;
}
