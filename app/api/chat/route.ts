import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '../../../lib/auth';
import {
  MODEL_MAPPINGS,
  resolveProviderKeys,
  streamWithProvider,
  createErrorStream,
} from '../../../lib/providers';
import {
  getRagContext,
  ingestAttachment,
} from '../../../services/ragClient';
import { BackendClient } from '../../../services/backendClient';


interface RequestPayload {
  prompt: string;
  model: string;
  chatId?: string;

  attachments?: {
    name: string;
    content?: string;
    size?: string | number;
    type?: string;
    documentId?: string;
  }[];

  apiKeys?: {
    openai?: string;
    anthropic?: string;
    google?: string;
    azureEndpoint?: string;
  };

  history?: {
    role: 'user' | 'assistant' | 'system';
    content: string;
  }[];

  useRag?: boolean;
  workspaceId?: string;
}


export async function POST(
  req: NextRequest,
) {
  try {
    // ─── Auth ───
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json(
        {
          error: 'Authentication required',
        },
        {
          status: 401,
        },
      );
    }


    // ─── Parse & Validate ───
    const body: RequestPayload =
      await req.json();

    const {
      prompt,
      model: modelId,
      attachments = [],
      apiKeys = {},
      history = [],
      useRag = true,
      workspaceId = 'default',
    } = body;


    if (!modelId) {
      return NextResponse.json(
        {
          error: 'Missing model identifier',
        },
        {
          status: 400,
        },
      );
    }


    if (
      typeof prompt !== 'string' ||
      !prompt.trim() ||
      prompt.length > 50_000
    ) {
      return NextResponse.json(
        {
          error:
            'Prompt must contain 1 to 50,000 characters',
        },
        {
          status: 400,
        },
      );
    }


    if (
      !Array.isArray(history) ||
      history.length > 100 ||
      !Array.isArray(attachments) ||
      attachments.length > 10
    ) {
      return NextResponse.json(
        {
          error:
            'Chat request exceeds the supported limits',
        },
        {
          status: 413,
        },
      );
    }


    const attachmentCharacters =
      attachments.reduce(
        (
          total,
          attachment,
        ) => {
          return (
            total +
            (
              typeof attachment.content === 'string'
                ? attachment.content.length
                : 0
            )
          );
        },
        0,
      );


    if (
      attachmentCharacters > 2_000_000
    ) {
      return NextResponse.json(
        {
          error:
            'Attachment content is too large',
        },
        {
          status: 413,
        },
      );
    }


    // ─── Resolve Provider & Keys ───
    const mapping =
      MODEL_MAPPINGS[modelId] || {
        provider: 'azure' as const,
        targetModel: 'gpt-4o',
      };

    const keys =
      resolveProviderKeys(apiKeys);


    // ─── Build Grounded Prompt (Direct Attachment Context & Vector RAG) ───
    let combinedPrompt = prompt;

    // 1. Direct Attachment Context (if user attached files in current prompt)
    const validDocs = Array.isArray(attachments)
      ? attachments.filter((att) => att && typeof att.content === 'string' && att.content.trim())
      : [];

    if (validDocs.length > 0) {
      const docSections = validDocs
        .map((att) => `--- Attached Document: ${att.name} ---\n${att.content}`)
        .join('\n\n');

      combinedPrompt = `You have access to the following attached document(s):\n\n${docSections}\n\nUser Question / Instructions: ${prompt}`;

      // Asynchronously index attachments in the background so TTFT is not blocked
      if (useRag !== false) {
        for (const attachment of validDocs) {
          const ragDocumentId = attachment.documentId || `${workspaceId}:${attachment.name}`;
          ingestAttachment({
            name: attachment.name,
            size: typeof attachment.size === 'number' ? String(attachment.size) : attachment.size || '0',
            type: attachment.type || 'text/plain',
            content: attachment.content!,
            workspace_id: workspaceId,
            document_id: ragDocumentId,
          }).catch((err) => {
            console.warn(`[Chat] Background RAG ingestion deferred for ${attachment.name}:`, err.message);
          });
        }
      }
    } else if (useRag !== false) {
      // 2. Vector Store RAG Retrieval when no raw files are inlined
      try {
        const ragResult = await getRagContext({
          query: prompt,
          workspace_id: workspaceId,
          top_k: 4,
        });

        if (ragResult?.contextPrompt) {
          combinedPrompt = `${ragResult.contextPrompt}\n\nUser Question: ${prompt}`;
        }
      } catch (error: any) {
        console.warn('[Chat] RAG retrieval skipped, using direct model inference:', error?.message);
      }
    }

    // ─── Stream Response ───
    const responseStream = await streamWithProvider(
      mapping,
      keys,
      combinedPrompt,
      history,
      modelId,
      attachments,
    );

    // ─── Async Telemetry to Backend Middleware (Fire & Forget) ───
    const inputEstimate = Math.max(1, Math.ceil(combinedPrompt.length / 3.8));
    BackendClient.logInference({
      user_id: session?.user?.id || 'demo_user',
      workspace_id: workspaceId,
      timestamp: new Date().toISOString(),
      model_id: modelId,
      input_tokens: inputEstimate,
      output_tokens: 450, // Projected completion baseline
      credits_used: Math.round(((inputEstimate / 1_000_000) * 2.5 + (450 / 1_000_000) * 10) * 100) / 100,
      status: 'COMPLETED',
    }).catch(() => {
      // Silently proceed if middleware is offline
    });

    return responseStream;

  } catch (err: unknown) {

    const message =
      err instanceof Error
        ? err.message
        : 'Unknown error occurred';

    return createErrorStream(
      `⚠️ **Internal Server Error**: ${message}`,
    );
  }
}