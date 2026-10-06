import { SYSTEM_PROMPT } from './systemPrompt';

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

// Cache discovered models for 1 hour to eliminate 200-500ms TTFT latency on repeated calls
const modelsCache = new Map<string, { models: string[]; timestamp: number }>();
const CACHE_TTL_MS = 60 * 60 * 1000;

/**
 * Intelligent Google Gemini API Streaming with Cached Model Discovery
 */
export async function streamGoogleGemini(
  apiKey: string,
  requestedModel: string,
  prompt: string,
  history: { role: string; content: string }[],
): Promise<Response> {
  let activeModel = requestedModel;

  // Step 1: Check cache or discover available models
  try {
    const cached = modelsCache.get(apiKey);
    let available: string[] = [];

    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      available = cached.models;
    } else {
      const listRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
      );
      if (listRes.ok) {
        const listData = await listRes.json();
        if (Array.isArray(listData.models)) {
          available = listData.models
            .filter((m: any) => m.supportedGenerationMethods?.includes('generateContent'))
            .map((m: any) => m.name.replace(/^models\//, ''));
          modelsCache.set(apiKey, { models: available, timestamp: Date.now() });
        }
      }
    }

    if (available.length > 0) {
      if (available.includes(requestedModel)) {
        activeModel = requestedModel;
      } else if (available.includes('gemini-2.5-flash')) {
        activeModel = 'gemini-2.5-flash';
      } else if (available.includes('gemini-2.0-flash')) {
        activeModel = 'gemini-2.0-flash';
      } else {
        const match =
          available.find((m) => m === 'gemini-2.5-flash' || m === 'gemini-2.0-flash') ||
          available.find((m) => m.includes('flash') && !m.includes('tts') && !m.includes('preview')) ||
          available.find((m) => m.includes('gemini')) ||
          available[0];
        activeModel = match || requestedModel;
      }
    }
  } catch {
    activeModel = requestedModel || 'gemini-2.5-flash';
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
    const requestBody = JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents,
    });

    let res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: requestBody,
    });

    if (res.status === 503 && activeModel !== 'gemini-2.5-flash-lite') {
      endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:streamGenerateContent?alt=sse&key=${apiKey}`;
      res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: requestBody,
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
                    const parts = parsed.candidates?.[0]?.content?.parts;
                    if (Array.isArray(parts)) {
                      for (const part of parts) {
                        if (part?.text) {
                          controller.enqueue(encoder.encode(part.text));
                        }
                      }
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
