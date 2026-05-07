import { GoogleGenerativeAI } from '@google/generative-ai';
import type { ChatMessage } from '@/types';

export async function streamChat(
  apiKey: string,
  messages: ChatMessage[],
  brandContext: string
): Promise<ReadableStream<Uint8Array>> {
  const genAI = new GoogleGenerativeAI(apiKey);

  // Try gemini-2.0-flash first; fall back to gemini-2.0-flash-lite (higher free quota)
  // if the primary model hits rate limits.
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' });

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
        text: `Understood. I'll answer with exact numbers from the data, keep responses under 5 bullets, and say "No data" if something isn't available. Ready.`,
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
        const raw = (error as Error).message || '';
        let friendly = raw;
        if (raw.includes('429') || raw.toLowerCase().includes('quota') || raw.toLowerCase().includes('too many requests')) {
          friendly = '⚠️ Gemini API rate limit reached. Your free tier quota is exhausted for now. Please wait a minute and try again, or upgrade your Gemini API key at aistudio.google.com for higher limits.';
        } else if (raw.includes('API_KEY_INVALID') || raw.includes('invalid api key')) {
          friendly = '❌ Invalid Gemini API key. Please update it in Settings → AI Consultant.';
        }
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: friendly })}\n\n`)
        );
        controller.close();
      }
    },
  });

  return stream;
}
