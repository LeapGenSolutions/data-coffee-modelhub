import { NextRequest } from 'next/server';

export const runtime = 'edge';

const REPLIES = [
  "Good question — here’s a quick take. The main thing to get right is the goal: once that’s clear, the structure follows naturally. Want me to expand any part of this?",
  "Here’s a concise answer:\n\nStart simple, verify it works, then layer on complexity. Most problems in this area come from doing those steps in the opposite order.",
  "I’ve looked at what you sent. The short version: the approach is sound, but watch the edge cases — empty inputs and very large values are where it will break first.",
  "Sure — I’d suggest three options, from simplest to most robust, and I’d start with the simplest unless you already know you’ll outgrow it."
];

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { messages, model } = body;

  const lastUserMessage = messages?.[messages.length - 1]?.content || 'Hello';
  const selectedReply = REPLIES[Math.floor(Math.random() * REPLIES.length)];
  const fullText = `[Responding via ${model || 'Claude Sonnet'}]: ${selectedReply}`;

  const encoder = new TextEncoder();

  // Create a Server-Sent Events (SSE) stream compatible with Vercel AI SDK useChat
  const stream = new ReadableStream({
    async start(controller) {
      const words = fullText.split(' ');
      for (let i = 0; i < words.length; i++) {
        const chunk = (i === 0 ? '' : ' ') + words[i];
        // Format as Vercel AI SDK data protocol or plain text stream
        controller.enqueue(encoder.encode(`0:${JSON.stringify(chunk)}\n`));
        await new Promise((res) => setTimeout(res, 50));
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Vercel-AI-Data-Stream': 'v1',
    },
  });
}
