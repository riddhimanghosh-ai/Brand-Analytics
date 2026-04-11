import { GoogleGenerativeAI } from '@google/generative-ai';
import type { ChatMessage } from '@/types';

export async function streamChat(
  apiKey: string,
  messages: ChatMessage[],
  brandContext: string
): Promise<ReadableStream<Uint8Array>> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const systemPrompt = `You are an expert e-commerce consultant and CRO (Conversion Rate Optimization) specialist. You are analyzing data for an online brand.

${brandContext}

Your role:
- Provide actionable insights based on the brand's data
- Focus on CRO opportunities
- Suggest specific strategies to increase revenue, AOV, and repeat purchases
- Be concise but detailed
- Use numbers and specifics when available
- Format responses with bullet points and headers when appropriate
- When asked about trends, reference the actual metrics provided

Always be professional, data-driven, and consulting-grade in your advice.`;

  const history = messages.slice(0, -1).map((m) => ({
    role: m.role === 'user' ? 'user' as const : 'model' as const,
    parts: [{ text: m.content }],
  }));

  const chat = model.startChat({
    history,
    systemInstruction: systemPrompt,
  });

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
