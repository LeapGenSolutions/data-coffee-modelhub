import { createErrorStream } from './google';
import { streamGoogleGemini } from './google';
import { SYSTEM_PROMPT } from './systemPrompt';

/**
 * Azure OpenAI Chat Completions Streaming with Gemini fallback on 404
 */
export async function streamAzureOpenAI(
  apiKey: string,
  azureEndpoint: string,
  model: string,
  prompt: string,
  history: { role: string; content: string }[],
  googleKey?: string,
): Promise<Response> {
  const baseUrl = azureEndpoint.replace(/\/openai\/v1\/?$/, '').replace(/\/$/, '');
  const endpoint = `${baseUrl}/openai/deployments/${model}/chat/completions?api-version=2024-02-01`;

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history.map((h) => ({ role: h.role, content: h.content })),
    { role: 'user', content: prompt },
  ];

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify({
        messages,
        stream: true,
      }),
    });

    if (!res.ok) {
      if (res.status === 404) {
        // Azure resource may only host embeddings; delegate to Gemini if available
        const resolvedGoogleKey = (
          googleKey ||
          process.env.GOOGLE_AI_API_KEY ||
          process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
          process.env.GEMINI_API_KEY ||
          process.env.GOOGLE_API_KEY ||
          ''
        ).trim();

        if (resolvedGoogleKey) {
          return await streamGoogleGemini(resolvedGoogleKey, 'gemini-2.5-flash', prompt, history);
        }
        return createErrorStream(
          '⚠️ **Azure OpenAI deployment not found** and no Gemini fallback key configured.',
          404,
        );
      }

      const errorText = await res.text();
      let errorMsg = `HTTP ${res.status}`;
      try {
        const json = JSON.parse(errorText);
        errorMsg = json.error?.message || errorText;
      } catch {
        errorMsg = errorText;
      }
      return createErrorStream(`⚠️ **Azure OpenAI API Error (${res.status})**:\n\n> ${errorMsg}`);
    }

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        let buffer = '';
        try {
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              const trimmed = line.trim();
              if (trimmed === 'data: [DONE]') continue;
              if (trimmed.startsWith('data: ')) {
                const jsonStr = trimmed.slice(6);
                try {
                  const parsed = JSON.parse(jsonStr);
                  const chunk = parsed.choices?.[0]?.delta?.content;
                  if (chunk) {
                    controller.enqueue(encoder.encode(chunk));
                  }
                } catch { /* skip malformed SSE */ }
              }
            }
          }
        } catch (streamErr: any) {
          controller.enqueue(encoder.encode(`\n\n*[Stream error: ${streamErr?.message}]*`));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (err: any) {
    return createErrorStream(`⚠️ **Network Error connecting to Azure**: ${err?.message}`);
  }
}
