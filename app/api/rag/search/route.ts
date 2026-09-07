import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '../../../../lib/auth';
import { executeRAGPipeline } from '../../../../lib/rag/pipeline';
import { searchSemanticDocuments, buildRagPromptContext } from '../../../../lib/vectorDb';
import { isSearchConfigured } from '../../../../lib/azure/searchClient';

const MAX_DOCUMENTS = 25;
const MAX_DOCUMENT_CHARACTERS = 2_000_000;

/**
 * POST /api/rag/search
 *
 * Hybrid RAG search endpoint.
 * Primary: Queries Azure AI Search persistent index.
 * Fallback: In-memory hybrid search on inline document content.
 */
export async function POST(req: NextRequest) {
  try {
    if (!(await getAuthSession())) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const body = await req.json();
    const { query, documents = [], apiKey, topK = 3, workspaceId = 'default' } = body;

    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'Missing query parameter' }, { status: 400 });
    }
    if (query.length > 20_000 || !Array.isArray(documents) || documents.length > MAX_DOCUMENTS) {
      return NextResponse.json({ error: 'RAG request exceeds the supported limits' }, { status: 413 });
    }
    const documentCharacters = documents.reduce(
      (total: number, document: { content?: unknown }) =>
        total + (typeof document?.content === 'string' ? document.content.length : 0),
      0,
    );
    if (documentCharacters > MAX_DOCUMENT_CHARACTERS) {
      return NextResponse.json({ error: 'Attached document content is too large' }, { status: 413 });
    }

    const keyToUse = apiKey || process.env.OPENAI_API_KEY;
    const safeTopK = Number.isInteger(topK) ? Math.min(Math.max(topK, 1), 20) : 3;

    // ─── Primary: Azure AI Search (persistent indexed documents) ───
    if (isSearchConfigured()) {
      const ragResult = await executeRAGPipeline({
        query,
        workspaceId,
        apiKey: keyToUse,
        topK: safeTopK,
      });

      return NextResponse.json({
        query,
        searchBackend: 'azure-ai-search',
        resultsCount: ragResult.chunks.length,
        searchTimeMs: ragResult.searchTimeMs,
        results: ragResult.chunks.map((r) => ({
          documentName: r.chunk.documentName,
          startLine: r.chunk.startLine,
          endLine: r.chunk.endLine,
          similarity: r.similarity,
          snippet: r.chunk.content,
        })),
        citations: ragResult.citations,
        contextPrompt: ragResult.contextPrompt,
      });
    }

    // ─── Fallback: In-memory hybrid search on inline documents ───
    const results = await searchSemanticDocuments(query, documents, keyToUse, safeTopK);
    const { contextPrompt, citations } = buildRagPromptContext(results);

    return NextResponse.json({
      query,
      searchBackend: 'in-memory',
      resultsCount: results.length,
      results: results.map((r) => ({
        documentName: r.chunk.documentName,
        startLine: r.chunk.startLine,
        endLine: r.chunk.endLine,
        similarity: r.similarity,
        snippet: r.chunk.content,
      })),
      citations,
      contextPrompt,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'RAG search error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
