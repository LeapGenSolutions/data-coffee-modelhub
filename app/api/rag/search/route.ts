import { NextRequest, NextResponse } from 'next/server';
import { searchSemanticDocuments, buildRagPromptContext } from '../../../../lib/vectorDb';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { query, documents = [], apiKey, topK = 3 } = body;

    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'Missing query parameter' }, { status: 400 });
    }

    const keyToUse = apiKey || process.env.OPENAI_API_KEY;
    const results = await searchSemanticDocuments(query, documents, keyToUse, topK);
    const { contextPrompt, citations } = buildRagPromptContext(results);

    return NextResponse.json({
      query,
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
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'RAG search error' }, { status: 500 });
  }
}
