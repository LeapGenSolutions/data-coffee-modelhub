import { createErrorStream } from './google';

/**
 * Direct OpenAI Chat Completions Streaming
 */
export async function streamOpenAI(
  apiKey: string,
  model: string,
  prompt: string,
  history: { role: string; content: string }[],
): Promise<Response> {
  const endpoint = 'https://api.openai.com/v1/chat/completions';

  const messages = [
    { role: 'system', content: 'You are an expert AI assistant on Data Coffee Model Hub. Format responses clearly with clean Markdown and code blocks.' },
    ...history.map((h) => ({ role: h.role, content: h.content })),
    { role: 'user', content: prompt },
  ];

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
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
      return createErrorStream(`⚠️ **OpenAI API Error (${res.status})**:\n\n> ${errorMsg}`);
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
    return createErrorStream(`⚠️ **Network Error connecting to OpenAI**: ${err?.message}`);
  }
}
