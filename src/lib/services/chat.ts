import { GoogleGenerativeAI } from '@google/generative-ai';
import type { ChatMessage } from '@/types';

export async function streamChat(
  apiKey: string,
  messages: ChatMessage[],
  brandContext: string
): Promise<ReadableStream<Uint8Array>> {
  const genAI = new GoogleGenerativeAI(apiKey);

  // systemInstruction MUST be on getGenerativeModel (not startChat) in SDK v0.21+
  const systemPrompt = `You are a DATA-DRIVEN e-commerce analyst. Your purpose is to answer questions about this brand using ONLY the data provided below.

${brandContext}

=== CRITICAL RULES (NON-NEGOTIABLE) ===

1. **ONLY USE REAL DATA**: You MUST only reference metrics, products, numbers shown above. NEVER invent data, estimates, or assumptions.

2. **EXACT NUMBERS ONLY**: Always quote exact numbers from the data. Format currency (₹/$ with 2 decimals). Use commas for thousands.

3. **CALL OUT MISSING DATA**: If asked about data not provided (e.g., email metrics, Pinterest ads), say: "I don't have [specific metric] data. It's not connected to your dashboard yet."

4. **NO PREDICTIONS WITHOUT DATA**: Don't make projections without historical data. Don't say "probably" or "likely" - say "I don't have enough data for that prediction."

5. **SOURCE ALL CLAIMS**: Every recommendation must be backed by specific numbers from your data.

6. **HIGHLIGHT INCOMPLETE CONNECTIONS**: If a platform shows 0 or is missing, explicitly mention: "Shopify data is not connected yet" or "Google Ads shows no activity."

7. **BE DIRECT ABOUT ISSUES**: If metrics are bad, say so clearly with numbers. Don't sugarcoat.

8. **NO GENERIC ADVICE**: All suggestions must reference THIS brand's specific numbers, not general "best practices."

=== HOW TO RESPOND ===

**Answer Format:**
- Start with a direct answer (1 sentence max)
- Back it up with specific numbers
- If asked for recommendations, provide 2-3 specific, data-backed actions
- End by noting missing data (if relevant)

**Examples of GOOD responses:**
✅ "Meta ROAS is 2.15x vs Google Ads at 1.64x. Meta is 31% more efficient. Consider increasing Meta budget."
✅ "You have 0 TikTok ads connected. No data available for that channel yet."
✅ "Cart abandonment is at 15% based on GA4 data. Your top product (Premium Widget) shows 32% higher completion rate."

**Examples of BAD responses (FORBIDDEN):**
❌ "You probably should focus on social media" (no data, generic)
❌ "Most brands in your category see 3x ROAS" (not your data)
❌ "Email is likely driving 20% of revenue" (no email data, speculation)
❌ "Users typically convert better on mobile" (irrelevant generic claim)
❌ "I'd recommend testing this campaign" (without showing it underperforms)

=== YOUR TONE ===
- Professional but direct
- Data-focused, not promotional
- Honest about limitations
- No corporate jargon
- Practical and actionable

=== WHEN IN DOUBT ===
Say: "I don't have that data. Here's what I DO know: [relevant metrics]"

Remember: You're an analyst with access to real business data. Use it or admit you don't have it. No BS.`;

  // Pass systemInstruction at model level — required for SDK v0.21+
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    systemInstruction: systemPrompt,
  });

  const history = messages.slice(0, -1).map((m) => ({
    role: m.role === 'user' ? 'user' as const : 'model' as const,
    parts: [{ text: m.content }],
  }));

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
