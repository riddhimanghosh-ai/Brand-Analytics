import type { ChatMessage } from '@/types';

const GROQ_API = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL    = 'llama-3.3-70b-versatile';

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

  const groqMessages = [
    { role: 'system', content: systemPrompt },
    ...messages.map((m) => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.content,
    })),
  ];

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const res = await fetch(GROQ_API, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: MODEL,
            messages: groqMessages,
            stream: true,
            max_tokens: 1024,
            temperature: 0.3,
          }),
        });

        if (!res.ok) {
          const err = await res.text();
          let friendly = `AI error (${res.status})`;
          if (res.status === 401) friendly = '❌ Invalid Groq API key. Please update it in Settings → AI Consultant.';
          else if (res.status === 429) friendly = '⚠️ Groq rate limit reached. Please wait a moment and try again.';
          else if (err) friendly = `AI error: ${err}`;
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: friendly })}\n\n`));
          controller.close();
          return;
        }

        // Parse OpenAI-compatible SSE stream from Groq
        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith('data: ')) continue;
            const data = trimmed.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              const text = parsed.choices?.[0]?.delta?.content;
              if (text) {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
              }
            } catch {
              // skip malformed chunks
            }
          }
        }

        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      } catch (error) {
        const msg = (error as Error).message || 'Unknown error';
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: `AI error: ${msg}` })}\n\n`));
        controller.close();
      }
    },
  });

  return stream;
}
