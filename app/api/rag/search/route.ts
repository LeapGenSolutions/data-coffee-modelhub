import { NextRequest, NextResponse } from 'next/server';
import { getRagContext } from '../../../../services/ragClient';


export async function POST(
  req: NextRequest,
) {
  try {
    const body = await req.json();

    if (
      typeof body.query !== 'string' ||
      !body.query.trim()
    ) {
      return NextResponse.json(
        {
          error: 'Query is required',
        },
        {
          status: 400,
        },
      );
    }

    const result = await getRagContext({
      query: body.query,
      workspace_id:
        typeof body.workspace_id === 'string'
          ? body.workspace_id
          : typeof body.workspaceId === 'string'
            ? body.workspaceId
            : 'default',

      document_ids:
        Array.isArray(body.document_ids)
          ? body.document_ids
          : Array.isArray(body.documentIds)
            ? body.documentIds
            : undefined,

      top_k:
        typeof body.top_k === 'number'
          ? body.top_k
          : typeof body.topK === 'number'
            ? body.topK
            : 4,
    });

    return NextResponse.json(
      result,
    );
  } catch (error) {
    console.error(
      '[RAG Search] Failed:',
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'RAG search failed',
      },
      {
        status: 500,
      },
    );
  }
}