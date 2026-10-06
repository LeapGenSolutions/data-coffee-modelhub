import { createErrorStream } from './google';
import { SYSTEM_PROMPT } from './systemPrompt';

/**
 * Direct Anthropic Messages API Streaming
 */
export async function streamAnthropic(
  apiKey: string,
  model: string,
  prompt: string,
  history: { role: string; content: string }[],
): Promise<Response> {
  const endpoint = 'https://api.anthropic.com/v1/messages';

  const messages = [
    ...history.map((h) => ({ role: h.role === 'user' ? 'user' : ('assistant' as const), content: h.content })),
    { role: 'user' as const, content: prompt },
  ];

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages,
        stream: true,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      let errorMsg = `HTTP ${res.status}`;
      try {
        const json = JSON.parse(errorText);
        errorMsg = json.error?.message || errorText;
      } catch {
        errorMsg = errorText;
      }
      return createErrorStream(`⚠️ **Anthropic API Error (${res.status})**:\n\n> ${errorMsg}`);
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
              if (line.startsWith('data: ')) {
                const jsonStr = line.slice(6).trim();
                try {
                  const parsed = JSON.parse(jsonStr);
                  if (parsed.type === 'content_block_delta') {
                    const chunk = parsed.delta?.text;
                    if (chunk) controller.enqueue(encoder.encode(chunk));
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
    return createErrorStream(`⚠️ **Network Error connecting to Anthropic**: ${err?.message}`);
  }
}
