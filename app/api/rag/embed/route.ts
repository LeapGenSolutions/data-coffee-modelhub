import { NextRequest, NextResponse } from 'next/server';
import { generateEmbedding, chunkDocument } from '../../../../lib/vectorDb';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, documentName = 'document.txt', apiKey } = body;

    if (!text) {
      return NextResponse.json({ error: 'Missing text payload' }, { status: 400 });
    }

    const chunks = chunkDocument(documentName, text);
    const keyToUse = apiKey || process.env.OPENAI_API_KEY;
    const embedding = await generateEmbedding(text, keyToUse);

    return NextResponse.json({
      model: 'text-embedding-3-small',
      dimensions: embedding.length,
      embedding,
      chunksCount: chunks.length,
      chunks: chunks.map((c) => ({
        id: c.id,
        startLine: c.startLine,
        endLine: c.endLine,
        tokenCount: c.tokenCount,
        preview: c.content.slice(0, 100),
      })),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Embedding error' }, { status: 500 });
  }
}
