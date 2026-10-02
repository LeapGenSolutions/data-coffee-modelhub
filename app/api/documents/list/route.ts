import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '../../../../lib/auth';
import { listAllDocuments } from '../../../../lib/documentRegistry';

/**
 * GET /api/documents/list?workspaceId=xxx
 *
 * Returns all uploaded documents, optionally filtered by workspace.
 */
export async function GET(req: NextRequest) {
  try {
    if (!(await getAuthSession())) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const workspaceId = req.nextUrl.searchParams.get('workspaceId') || undefined;
    const documents = listAllDocuments(workspaceId);

    return NextResponse.json({
      documents,
      total: documents.length,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to list documents' },
      { status: 500 },
    );
  }
}
