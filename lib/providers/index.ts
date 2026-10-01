import { streamGoogleGemini, createErrorStream } from './google';
import { streamOpenAI } from './openai';
import { streamAnthropic } from './anthropic';
import { streamAzureOpenAI } from './azure';

export { createErrorStream };

export const MODEL_MAPPINGS: Record<string, { provider: 'openai' | 'anthropic' | 'google' | 'azure'; targetModel: string }> = {
  'ms-foundry':       { provider: 'azure',       targetModel: 'gpt-4o' },
  'claude-sonnet':    { provider: 'anthropic', targetModel: 'claude-3-5-sonnet-20241022' },
  'claude-opus':      { provider: 'anthropic', targetModel: 'claude-3-opus-20240229' },
  'gpt-5':            { provider: 'openai',    targetModel: 'gpt-4o' },
  'gpt-5-mini':       { provider: 'openai',    targetModel: 'gpt-4o-mini' },
  'gemini-2.5-flash': { provider: 'google',    targetModel: 'gemini-2.5-flash' },
  'gemini-2.5-pro':   { provider: 'google',    targetModel: 'gemini-2.5-flash' },
  'gemini-flash':     { provider: 'google',    targetModel: 'gemini-2.5-flash' },
  'gemini-pro':       { provider: 'google',    targetModel: 'gemini-2.5-flash' },
};

export function resolveProviderKeys(apiKeys: any = {}) {
  const openaiKey = (apiKeys.openai || process.env.OPENAI_API_KEY || '').trim();
  const anthropicKey = (apiKeys.anthropic || process.env.ANTHROPIC_API_KEY || '').trim();
  const googleKey = (
    apiKeys.google ||
    process.env.GOOGLE_AI_API_KEY ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    ''
  ).trim();
  const azureEndpoint = (
    apiKeys.azureEndpoint ||
    process.env.AZURE_OPENAI_ENDPOINT ||
    'https://data-coffee-persona.openai.azure.com'
  ).trim();

  const isAzureKey = !openaiKey.startsWith('sk-');
  
  return { openaiKey, anthropicKey, googleKey, azureEndpoint, isAzureKey };
}

export function generateSimulatedStream(prompt: string, modelId: string, attachments: any[]): Response {
  const encoder = new TextEncoder();
  const lower = (prompt || '').toLowerCase();

  let responseMarkdown = '';

  if (lower.includes('code') || lower.includes('implement') || lower.includes('build') || lower.includes('function') || lower.includes('python')) {
    responseMarkdown = `### Implementation Architecture\n\nHere is a complete, production-grade implementation for your request:\n\n\`\`\`typescript\ninterface TaskConfig {\n  id: string;\n  name: string;\n  retries: number;\n  timeoutMs: number;\n}\n\nexport async function executePipeline<T>(config: TaskConfig, runner: () => Promise<T>): Promise<T> {\n  console.log(\`[Pipeline] Initializing \${config.name} (ID: \${config.id})\`);\n  \n  let attempt = 0;\n  while (attempt <= config.retries) {\n    try {\n      const start = performance.now();\n      const result = await Promise.race([\n        runner(),\n        new Promise<never>((_, reject) => \n          setTimeout(() => reject(new Error('Timeout exceeded')), config.timeoutMs)\n        )\n      ]);\n      \n      const elapsed = Math.round(performance.now() - start);\n      console.log(\`[Pipeline] Completed successfully in \${elapsed}ms\`);\n      return result;\n    } catch (err) {\n      attempt++;\n      if (attempt > config.retries) throw err;\n      console.warn(\`[Pipeline] Retrying attempt \${attempt}/\${config.retries}...\`);\n    }\n  }\n  \n  throw new Error('Pipeline execution failed.');\n}\n\`\`\`\n\n#### Key Features:\n1. **Timeout & Race Protection**: Prevents hung async operations.\n2. **Exponential Resilience**: Automatic retries with graceful fallbacks.\n3. **Type-Safe**: Full TypeScript generic inference for result payload.`;
  } else if (lower.includes('compare') || lower.includes('difference') || lower.includes('vs') || lower.includes('storage') || lower.includes('pricing')) {
    responseMarkdown = `### Comparative Evaluation\n\n| Attribute | **Claude 3.5 Sonnet** | **GPT-4o** | **Gemini 2.0 Flash** |\n| :--- | :--- | :--- | :--- |\n| **Primary Strength** | Complex Coding & Logic | Speed & Multimodal Tools | Real-time Multimodal & 2M Context |\n| **Context Limit** | 200k Tokens | 128k Tokens | 2,000k Tokens |\n| **Latency (TTFT)** | ~420ms | ~310ms | ~220ms |\n| **Cost per 1M Input** | $3.00 | $2.50 | $0.10 |\n| **Best For** | Software engineering & deep analysis | General workflows & vision | Massive document RAG & fast chat |\n\n> **Recommendation:** Use **Gemini 2.0 / 2.5 Flash** for instant responses, and **Claude 3.5 Sonnet** for deep code synthesis.`;
  } else if (attachments.length > 0) {
    const primaryDoc = attachments[0]?.name || 'document.pdf';
    const docNames = attachments.map((d) => d.name).join(', ');
    responseMarkdown = `### Document Context & Semantic Analysis\n\nI have retrieved and analyzed the attached context from **${docNames}** using vector embeddings (\`text-embedding-3-small\`):\n\n#### Key Findings & Citations:\n- **Executive Synthesis**: Relevant specifications have been extracted from source sections [[cite:${primaryDoc}#L1-L25]].\n- **Technical Compliance**: Data structures and requirements align with enterprise workspace architecture [[cite:${primaryDoc}#L26-L55]].\n\n#### Verified Actions:\n1. Click on the citation badges above to inspect the cited line numbers in the **Interactive Document Inspector**.\n2. Proceed with workspace pipeline execution or team collaboration.`;
  } else {
    responseMarkdown = `### Analysis & Recommended Steps\n\nThank you for your prompt. Here is a clear breakdown:\n\n1. **Core Concept**: Modern multi-model orchestration enables teams to choose the most cost-effective and capable LLM for each specific task.\n2. **Performance Insight**: Balancing latency against reasoning depth delivers optimal user experience.\n3. **Next Steps**: You can also use **Model Arena** to compare this output side-by-side with other candidate models.`;
  }

  // Stream chunks smoothly via SSE / ReadableStream
  const chunks = responseMarkdown.split(' ');
  let index = 0;

  const stream = new ReadableStream({
    async start(controller) {
      // Send small initial chunk fast
      controller.enqueue(encoder.encode(chunks[0] + ' '));
      index = 1;

      const interval = setInterval(() => {
        if (index < chunks.length) {
          controller.enqueue(encoder.encode(chunks[index] + ' '));
          index++;
        } else {
          clearInterval(interval);
          controller.close();
        }
      }, 35);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

export async function streamWithProvider(
  mapping: { provider: 'openai' | 'anthropic' | 'google' | 'azure'; targetModel: string },
  keys: ReturnType<typeof resolveProviderKeys>,
  prompt: string,
  history: { role: string; content: string }[],
  modelId: string,
  attachments: any[] = []
): Promise<Response> {
  const { openaiKey, anthropicKey, googleKey, azureEndpoint, isAzureKey } = keys;

  /* ─── 1. Google Gemini Provider ─── */
  if (mapping.provider === 'google' && googleKey) {
    return await streamGoogleGemini(googleKey, mapping.targetModel, prompt, history as any);
  }

  /* ─── 2. OpenAI / Azure Microsoft Foundry Provider ─── */
  if ((mapping.provider === 'openai' || mapping.provider === 'azure') && openaiKey) {
    if (isAzureKey || mapping.provider === 'azure') {
      return await streamAzureOpenAI(openaiKey, azureEndpoint, mapping.targetModel, prompt, history as any, googleKey);
    }
    return await streamOpenAI(openaiKey, mapping.targetModel, prompt, history as any);
  }

  /* ─── 3. Anthropic Provider ─── */
  if (mapping.provider === 'anthropic' && anthropicKey) {
    return await streamAnthropic(anthropicKey, mapping.targetModel, prompt, history as any);
  }

  /* ─── 4. Cross-Provider Fallback ─── */
  if (mapping.provider === 'azure' || isAzureKey) {
    if (openaiKey) {
      return await streamAzureOpenAI(openaiKey, azureEndpoint, 'gpt-4o', prompt, history as any, googleKey);
    }
  }
  if (googleKey) {
    return await streamGoogleGemini(googleKey, 'gemini-2.5-flash', prompt, history as any);
  }
  if (openaiKey) {
    if (isAzureKey) {
      return await streamAzureOpenAI(openaiKey, azureEndpoint, 'gpt-4o', prompt, history as any, googleKey);
    }
    return await streamOpenAI(openaiKey, 'gpt-4o-mini', prompt, history as any);
  }
  if (anthropicKey) {
    return await streamAnthropic(anthropicKey, 'claude-3-5-sonnet-20241022', prompt, history as any);
  }

  /* ─── 5. Offline / Zero-Config Simulated Fallback Generator ─── */
  if (process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_ENABLE_DEMO_AUTH !== 'true') {
    return createErrorStream('No AI provider is configured for this request.', 503);
  }
  return generateSimulatedStream(prompt, modelId, attachments);
}
