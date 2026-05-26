import Anthropic from '@anthropic-ai/sdk';
import type { ChatMessage } from '@/types';

const MODEL = 'claude-sonnet-4-5';

export async function streamChat(
  apiKey: string,
  messages: ChatMessage[],
  brandContext: string
): Promise<ReadableStream<Uint8Array>> {
  const systemPrompt = `You are a concise e-commerce analyst. Answer using ONLY the data below. No fluff.

${brandContext}

RULES (non-negotiable):
1. Use ONLY numbers from the data above. Never invent, estimate, or assume.
2. Quote exact figures. Use ₹ for Indian rupees, $ for USD.
3. If data for something isn't above: say "No data for [X]." and stop — do not guess.
4. Every recommendation must cite a specific number. No generic advice.
5. Bad metrics = say so plainly. No sugarcoating.
6. Max 5 bullet points per response. No preamble. No sign-off.
7. Lead with the direct answer in one line, then bullets if needed.

FORMAT:
[One-line direct answer]
• [stat or insight with exact number]
• [stat or insight with exact number]
• [action if asked, citing a number]

If you don't have the data: "No data for that. I have: [list what's available]."`;

  const client = new Anthropic({ apiKey });

  const anthropicMessages = messages.map((m) => ({
    role: m.role === 'user' ? ('user' as const) : ('assistant' as const),
    content: m.content,
  }));

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const anthropicStream = client.messages.stream({
          model: MODEL,
          max_tokens: 1024,
          system: systemPrompt,
          messages: anthropicMessages,
        });

        for await (const chunk of anthropicStream) {
          if (
            chunk.type === 'content_block_delta' &&
            chunk.delta.type === 'text_delta' &&
            chunk.delta.text
          ) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`)
            );
          }
        }

        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      } catch (error) {
        const err = error as { status?: number; message?: string };
        let friendly = `AI error: ${err.message || 'Unknown error'}`;
        if (err.status === 401) friendly = 'Invalid Claude API key. Please check your ANTHROPIC_API_KEY environment variable.';
        else if (err.status === 429) friendly = 'Claude rate limit reached. Please wait a moment and try again.';
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: friendly })}\n\n`));
        controller.close();
      }
    },
  });

  return stream;
}
