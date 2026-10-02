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
    if (!(await getAuthSession())) {
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


    // ─── Build Direct Document Context & RAG Context ───
    let combinedPrompt = prompt;

    // 1. Direct Document Context: if attachments are provided, inject their text directly so the model can analyze them
    if (Array.isArray(attachments) && attachments.length > 0) {
      const validDocs = attachments.filter(
        (att) => att && typeof att.content === 'string' && att.content.trim(),
      );

      if (validDocs.length > 0) {
        const docSections = validDocs
          .map((att) => `--- Attached Document: ${att.name} ---\n${att.content}`)
          .join('\n\n');

        combinedPrompt = `You have access to the following document(s) uploaded by the user:\n\n${docSections}\n\nUser Question / Instructions: ${prompt}`;
      }
    }

    if (useRag !== false) {
      // Ingest attachments to RAG service if available
      for (const attachment of attachments) {
        if (typeof attachment.content !== 'string' || !attachment.content.trim()) {
          continue;
        }

        const ragDocumentId =
          attachment.documentId ||
          `${workspaceId}:${attachment.name}`;

        try {
          await ingestAttachment({
            name: attachment.name,
            size:
              typeof attachment.size === 'number'
                ? String(attachment.size)
                : attachment.size || '0',
            type:
              attachment.type ||
              'text/plain',
            content:
              attachment.content,
            workspace_id:
              workspaceId,
            document_id:
              ragDocumentId,
          });
        } catch (error) {
          console.warn(`[Chat] RAG ingestion skipped for ${attachment.name}:`, error);
        }
      }

      try {
        const ragResult = await getRagContext({
          query: prompt,
          workspace_id: workspaceId,
          top_k: 4,
        });

        if (ragResult.contextPrompt) {
          combinedPrompt = `${ragResult.contextPrompt}\n\n${combinedPrompt}`;
        }
      } catch (error) {
        console.warn('[Chat] RAG search skipped (using direct document context):', error);
      }
    }


    // ─── Stream Response ───
    return await streamWithProvider(
      mapping,
      keys,
      combinedPrompt,
      history,
      modelId,
      attachments,
    );

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