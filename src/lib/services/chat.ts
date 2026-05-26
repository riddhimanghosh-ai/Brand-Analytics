import Anthropic from '@anthropic-ai/sdk';
import type { ChatMessage } from '@/types';

const MODEL = 'claude-sonnet-4-5';

export async function streamChat(
  apiKey: string,
  messages: ChatMessage[],
  brandContext: string
): Promise<ReadableStream<Uint8Array>> {
  const systemPrompt = `You are a sharp e-commerce analyst for the brand below. You have access to real store data — use it fully.

--- BRAND DATA ---
${brandContext}
--- END DATA ---

RULES:
1. Use ONLY the numbers above. Never invent, estimate, or round unless rounding a raw number for readability.
2. Use the currency symbol shown in the data context for all monetary values. The brand context includes "currency: INR/USD/etc." for ad platforms — use that symbol, never assume USD. If Shopify data shows ₹, use ₹ throughout.
3. When product data is present, rank/compare products by name with their exact revenue and order count.
4. Every recommendation must cite a specific metric from the data.
5. Be direct. No preamble ("Great question!"), no sign-off, no generic advice.
6. Bad metrics = say so plainly. Don't sugarcoat.
7. If the user asks for something genuinely not in the data, say: "No data for [X]. I have: [list available]."

FORMAT (adapt based on question):
• For rankings/lists → numbered list with exact figures per item
• For trend/diagnosis → one-line verdict, then ≤5 bullets with numbers
• For recommendations → cite the specific gap/number that motivates each action

Keep responses concise but complete — don't truncate a list if the data is there.`;


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
