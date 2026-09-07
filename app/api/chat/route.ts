import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '../../../lib/auth';
import { executeRAGPipeline, buildInlineDocumentContext } from '../../../lib/rag/pipeline';
import { searchSemanticDocuments, buildRagPromptContext } from '../../../lib/vectorDb';
import {
  MODEL_MAPPINGS,
  resolveProviderKeys,
  streamWithProvider,
  createErrorStream,
} from '../../../lib/providers';

interface RequestPayload {
  prompt: string;
  model: string;
  chatId?: string;
  attachments?: { name: string; content?: string }[];
  apiKeys?: { openai?: string; anthropic?: string; google?: string; azureEndpoint?: string };
  history?: { role: 'user' | 'assistant' | 'system'; content: string }[];
  useRag?: boolean;
  workspaceId?: string;
}

/**
 * POST /api/chat
 *
 * Slim orchestrator that:
 * 1. Validates the request
 * 2. Builds RAG context (Azure AI Search if available, fallback to in-memory)
 * 3. Routes to the correct AI provider via the provider registry
 */
export async function POST(req: NextRequest) {
  try {
    // ─── Auth ───
    if (!(await getAuthSession())) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // ─── Parse & Validate ───
    const body: RequestPayload = await req.json();
    const {
      prompt,
      model: modelId,
      attachments = [],
      apiKeys = {},
      history = [],
      workspaceId = 'default',
    } = body;

    if (!modelId) {
      return NextResponse.json({ error: 'Missing model identifier' }, { status: 400 });
    }
    if (typeof prompt !== 'string' || !prompt.trim() || prompt.length > 50_000) {
      return NextResponse.json({ error: 'Prompt must contain 1 to 50,000 characters' }, { status: 400 });
    }
    if (!Array.isArray(history) || history.length > 100 || !Array.isArray(attachments) || attachments.length > 10) {
      return NextResponse.json({ error: 'Chat request exceeds the supported limits' }, { status: 413 });
    }
    const attachmentCharacters = attachments.reduce(
      (total, attachment) => total + (typeof attachment.content === 'string' ? attachment.content.length : 0),
      0,
    );
    if (attachmentCharacters > 2_000_000) {
      return NextResponse.json({ error: 'Attachment content is too large' }, { status: 413 });
    }

    // ─── Resolve Provider & Keys ───
    const mapping = MODEL_MAPPINGS[modelId] || { provider: 'azure' as const, targetModel: 'gpt-4o' };
    const keys = resolveProviderKeys(apiKeys);

    // ─── Build RAG Context ───
    let combinedPrompt = prompt;

    // Strategy 1: Query persistent Azure AI Search index (server-side uploaded docs)
    const ragResult = await executeRAGPipeline({
      query: prompt,
      workspaceId,
      apiKey: keys.openaiKey,
      azureEndpoint: keys.isAzureKey ? keys.azureEndpoint : undefined,
      topK: 4,
    });

    if (ragResult.chunks.length > 0) {
      combinedPrompt = `${ragResult.contextPrompt}\n\nUser Question: ${prompt}`;
    }

    // Strategy 2: Inline attachments (client-uploaded docs not yet in vector store)
    if (attachments.length > 0 && ragResult.chunks.length === 0) {
      // Try in-memory hybrid search on inline attachments (legacy path)
      const inlineResults = await searchSemanticDocuments(
        prompt,
        attachments,
        keys.openaiKey,
        4,
        keys.isAzureKey ? keys.azureEndpoint : undefined,
      );

      if (inlineResults.length > 0) {
        const { contextPrompt } = buildRagPromptContext(inlineResults);
        combinedPrompt = `${contextPrompt}\n\nUser Question: ${prompt}`;
      } else {
        combinedPrompt = buildInlineDocumentContext(prompt, attachments);
      }
    }

    // ─── Stream Response ───
    return await streamWithProvider(mapping, keys, combinedPrompt, history, modelId, attachments);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error occurred';
    return createErrorStream(`⚠️ **Internal Server Error**: ${message}`);
  }
}
