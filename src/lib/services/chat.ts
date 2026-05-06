import { GoogleGenerativeAI } from '@google/generative-ai';
import type { ChatMessage } from '@/types';

export async function streamChat(
  apiKey: string,
  messages: ChatMessage[],
  brandContext: string
): Promise<ReadableStream<Uint8Array>> {
  const genAI = new GoogleGenerativeAI(apiKey);

  // Use gemini-1.5-flash — gemini-2.0-flash on v1beta rejects system_instruction
  // in certain SDK versions causing [400 Bad Request] errors.
  // Inject context as the first history exchange instead — works on ALL models.
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const systemPrompt = `You are a DATA-DRIVEN e-commerce analyst. Answer questions about this brand using ONLY the data below.

${brandContext}

CRITICAL RULES:
1. Only use real numbers from the data above — never invent estimates or assumptions.
2. Always quote exact figures. Format currency with the correct symbol (₹ or $).
3. If asked about data not listed above (e.g. email, TikTok, Pinterest), say: "That platform is not connected yet."
4. No generic advice — every suggestion must reference a specific number from the data.
5. If metrics are bad, say so directly with numbers. No sugarcoating.
6. No predictions unless you have historical trend data to base it on.
7. Keep responses concise. Bullet points preferred over long paragraphs.

RESPONSE FORMAT:
- Lead with a direct one-line answer
- Follow with specific numbers backing it up
- Give 2-3 concrete actions if asked for recommendations
- Note any missing platform data at the end if relevant

When in doubt: "I don't have that data. Here's what I do know: [relevant metrics]"`;

  // Inject system context as the first user/model exchange in history.
  // This approach avoids system_instruction API compatibility issues entirely
  // and works reliably across all Gemini model versions.
  const systemHistory = [
    {
      role: 'user' as const,
      parts: [{ text: `Context for this session:\n\n${systemPrompt}` }],
    },
    {
      role: 'model' as const,
      parts: [{
        text: `Got it. I have the brand data and will only give answers backed by the exact metrics provided. I won't invent numbers or give generic advice. Ask me anything about this brand.`,
      }],
    },
  ];

  const history = [
    ...systemHistory,
    ...messages.slice(0, -1).map((m) => ({
      role: m.role === 'user' ? ('user' as const) : ('model' as const),
      parts: [{ text: m.content }],
    })),
  ];

  const chat = model.startChat({ history });

  const lastMessage = messages[messages.length - 1];
  const result = await chat.sendMessageStream(lastMessage.content);

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of result.stream) {
          const text = chunk.text();
          if (text) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
          }
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      } catch (error) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: (error as Error).message })}\n\n`)
        );
        controller.close();
      }
    },
  });

  return stream;
}
