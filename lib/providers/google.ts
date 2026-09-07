/**
 * Shared error stream helper for provider responses.
 */
export function createErrorStream(errorMessage: string, status = 502): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(errorMessage));
      controller.close();
    },
  });
  return new Response(stream, {
    status,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

/**
 * Intelligent Google Gemini API Streaming with Dynamic Model Discovery
 */
export async function streamGoogleGemini(
  apiKey: string,
  requestedModel: string,
  prompt: string,
  history: { role: string; content: string }[],
): Promise<Response> {
  let activeModel = requestedModel;

  // Step 1: Discover available models
  try {
    const listRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
    );
    if (listRes.ok) {
      const listData = await listRes.json();
      if (Array.isArray(listData.models)) {
        const available: string[] = listData.models
          .filter((m: any) => m.supportedGenerationMethods?.includes('generateContent'))
          .map((m: any) => m.name.replace(/^models\//, ''));

        if (available.length > 0) {
          if (available.includes(requestedModel) && !requestedModel.includes('1.5')) {
            activeModel = requestedModel;
          } else if (available.includes('gemini-2.5-flash')) {
            activeModel = 'gemini-2.5-flash';
          } else if (available.includes('gemini-2.5-flash-lite')) {
            activeModel = 'gemini-2.5-flash-lite';
          } else {
            const match =
              available.find((m) => m === 'gemini-2.5-flash' || m === 'gemini-2.5-flash-lite') ||
              available.find((m) => m.includes('flash') && !m.includes('tts') && !m.includes('preview')) ||
              available.find((m) => m.includes('gemini')) ||
              available[0];
            activeModel = match || 'gemini-2.5-flash';
          }
        }
      }
    } else {
      const listError = await listRes.text();
      let errorMsg = `HTTP ${listRes.status}`;
      try {
        const json = JSON.parse(listError);
        errorMsg = json.error?.message || listError;
      } catch {
        errorMsg = listError;
      }
      return createErrorStream(
        `⚠️ **Google Gemini Key Error (${listRes.status})**:\n\n> ${errorMsg}\n\n*Please verify your Gemini API key in **API Keys (BYOK)**.*`,
        listRes.status,
      );
    }
  } catch {
    activeModel = 'gemini-2.5-flash';
  }

  // Step 2: Stream content
  let endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${activeModel}:streamGenerateContent?alt=sse&key=${apiKey}`;

  const contents = [
    ...history.map((h) => ({
      role: h.role === 'user' ? 'user' : 'model',
      parts: [{ text: h.content }],
    })),
    {
      role: 'user',
      parts: [{ text: prompt }],
    },
  ];

  try {
    let res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents }),
    });

    if (res.status === 503 && activeModel !== 'gemini-2.5-flash-lite') {
      endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:streamGenerateContent?alt=sse&key=${apiKey}`;
      res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents }),
      });
    }

    if (!res.ok) {
      const errorText = await res.text();
      let errorMsg = `HTTP ${res.status}`;
      try {
        const json = JSON.parse(errorText);
        errorMsg = json.error?.message || errorText;
      } catch {
        errorMsg = errorText;
      }
      return createErrorStream(`⚠️ **Google Gemini Error (${res.status})**:\n\n> ${errorMsg}`, res.status);
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
                if (jsonStr) {
                  try {
                    const parsed = JSON.parse(jsonStr);
                    const chunkText = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
                    if (chunkText) {
                      controller.enqueue(encoder.encode(chunkText));
                    }
                  } catch { /* skip malformed SSE */ }
                }
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
    return createErrorStream(`⚠️ **Network Error connecting to Google Gemini**: ${err?.message}`, 500);
  }
}
