'use client';

import { useState, useRef, useEffect } from 'react';
import { useParams } from 'next/navigation';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const PROMPT_CATEGORIES = [
  {
    icon: '📦',
    label: 'Shopify',
    prompts: [
      'What are my best performing products this month?',
      'What is my average order value trend?',
      'Which customers are at risk of churning?',
      'Analyse my discount code performance',
    ],
  },
  {
    icon: '📊',
    label: 'Analytics',
    prompts: [
      'Which traffic source converts best?',
      'What are my top landing pages?',
      'How is my bounce rate trending?',
      'Where are most of my customers coming from?',
    ],
  },
  {
    icon: '💰',
    label: 'Ads',
    prompts: [
      'Is my Meta ROAS healthy for my category?',
      'How should I allocate budget between Meta and Google?',
      'Which campaigns are underperforming?',
      'What is my blended ROAS trend?',
    ],
  },
  {
    icon: '🎯',
    label: 'CRO',
    prompts: [
      'Where am I losing the most customers in my funnel?',
      'How can I reduce cart abandonment?',
      'What is my CRO opportunity worth in revenue?',
      'Give me 3 quick wins to improve conversion rate',
    ],
  },
  {
    icon: '📈',
    label: 'Growth',
    prompts: [
      'What revenue should I expect next month?',
      'How can I increase customer lifetime value?',
      'What should my growth strategy be for next quarter?',
      'Which customer segment should I focus on?',
    ],
  },
];

export default function ChatPage() {
  const params = useParams();
  const slug = params?.slug as string;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: ChatMessage = { role: 'user', content: text.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);
    setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          messages: [...messages, userMsg].map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: 'assistant', content: `Error: ${err.error || 'Failed to get response'}` };
          return updated;
        });
        return;
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        let assistantContent = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const text = decoder.decode(value);
          for (const line of text.split('\n')) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') break;
              try {
                const parsed = JSON.parse(data);
                if (parsed.text) {
                  assistantContent += parsed.text;
                  setMessages((prev) => {
                    const updated = [...prev];
                    updated[updated.length - 1] = { role: 'assistant', content: assistantContent };
                    return updated;
                  });
                }
              } catch { /* skip non-JSON */ }
            }
          }
        }
      }
    } catch {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' };
        return updated;
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  };

  const clearChat = () => setMessages([]);

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 40px)', gap: '20px', padding: '20px' }}>
      {/* Left Sidebar — Prompt Categories */}
      <div style={{
        width: '280px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '12px',
        background: 'var(--bg-elevated)', borderRadius: '16px', padding: '20px',
        border: '1px solid var(--glass-border)', overflowY: 'auto',
      }}>
        <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '4px' }}>
          SUGGESTED PROMPTS
        </div>

        {/* Category tabs */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
          {PROMPT_CATEGORIES.map((cat, i) => (
            <button
              key={i}
              onClick={() => setActiveCategory(i)}
              style={{
                padding: '4px 10px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontSize: '12px',
                background: activeCategory === i ? 'var(--accent-blue)' : 'var(--bg-card)',
                color: activeCategory === i ? '#fff' : 'var(--text-secondary)',
              }}
            >
              {cat.icon} {cat.label}
            </button>
          ))}
        </div>

        {/* Prompts for active category */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {PROMPT_CATEGORIES[activeCategory].prompts.map((prompt, i) => (
            <button
              key={i}
              onClick={() => sendMessage(prompt)}
              disabled={isLoading}
              style={{
                padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--glass-border)',
                background: 'var(--bg-card)', color: 'var(--text-primary)', cursor: 'pointer',
                fontSize: '12px', textAlign: 'left', lineHeight: '1.4', transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--accent-blue)')}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--glass-border)')}
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Chat stats */}
        {messages.length > 0 && (
          <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid var(--glass-border)' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '8px' }}>
              {Math.floor(messages.length / 2)} messages in this session
            </div>
            <button
              onClick={clearChat}
              style={{
                width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid var(--glass-border)',
                background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '12px',
              }}
            >
              🗑️ Clear chat
            </button>
          </div>
        )}
      </div>

      {/* Main Chat Area */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        background: 'var(--bg-elevated)', borderRadius: '16px',
        border: '1px solid var(--glass-border)', overflow: 'hidden',
      }}>
        {/* Chat Header */}
        <div style={{
          padding: '16px 24px', borderBottom: '1px solid var(--glass-border)',
          display: 'flex', alignItems: 'center', gap: '12px',
        }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '10px',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px',
          }}>✨</div>
          <div>
            <div style={{ fontWeight: '600', fontSize: '15px' }}>AI Consultant</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Powered by Gemini · Analysing your brand data in real time
            </div>
          </div>
          <div style={{
            marginLeft: 'auto', width: '8px', height: '8px', borderRadius: '50%',
            background: '#22c55e', boxShadow: '0 0 6px #22c55e',
          }} />
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {messages.length === 0 ? (
            <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '56px', marginBottom: '16px', opacity: 0.3 }}>🤖</div>
              <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px', color: 'var(--text-secondary)' }}>
                Your AI CRO Consultant
              </div>
              <div style={{ fontSize: '13px', maxWidth: '360px', lineHeight: '1.6' }}>
                Ask me anything about your store performance, growth opportunities, ad strategy, or CRO improvements.
                I have access to all your connected platform data.
              </div>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '24px', flexWrap: 'wrap' }}>
                {['📦 Shopify', '📊 GA4', '💰 Ads', '🎯 CRO'].map((tag) => (
                  <span key={tag} style={{
                    padding: '4px 12px', borderRadius: '20px',
                    background: 'var(--bg-card)', border: '1px solid var(--glass-border)',
                    fontSize: '12px', color: 'var(--text-secondary)',
                  }}>{tag}</span>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg, i) => (
              <div key={i} style={{
                display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
              }}>
                {msg.role === 'assistant' && (
                  <div style={{
                    width: '28px', height: '28px', borderRadius: '8px', flexShrink: 0, marginRight: '10px',
                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', marginTop: '2px',
                  }}>✨</div>
                )}
                <div style={{
                  maxWidth: '70%', padding: '12px 16px', borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  background: msg.role === 'user' ? 'var(--accent-blue)' : 'var(--bg-card)',
                  color: msg.role === 'user' ? '#fff' : 'var(--text-primary)',
                  fontSize: '14px', lineHeight: '1.6',
                  border: msg.role === 'assistant' ? '1px solid var(--glass-border)' : 'none',
                }}>
                  {msg.role === 'assistant' && msg.content === '' ? (
                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center', padding: '2px 0' }}>
                      {[0, 1, 2].map((j) => (
                        <div key={j} style={{
                          width: '6px', height: '6px', borderRadius: '50%', background: 'var(--text-muted)',
                          animation: 'pulse 1.2s ease-in-out infinite', animationDelay: `${j * 0.2}s`,
                        }} />
                      ))}
                    </div>
                  ) : (
                    <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>
                  )}
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div style={{
          padding: '16px 24px', borderTop: '1px solid var(--glass-border)',
          display: 'flex', gap: '12px', alignItems: 'center',
        }}>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your store's performance, ads, CRO opportunities..."
            disabled={isLoading}
            style={{
              flex: 1, padding: '12px 16px', borderRadius: '12px',
              border: '1px solid var(--glass-border)', background: 'var(--bg-card)',
              color: 'var(--text-primary)', fontSize: '14px', outline: 'none',
            }}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isLoading}
            style={{
              padding: '12px 20px', borderRadius: '12px', border: 'none',
              background: !input.trim() || isLoading ? 'var(--bg-card)' : 'var(--accent-blue)',
              color: !input.trim() || isLoading ? 'var(--text-dim)' : '#fff',
              cursor: !input.trim() || isLoading ? 'default' : 'pointer',
              fontSize: '16px', transition: 'all 0.15s',
            }}
          >
            →
          </button>
        </div>
      </div>
    </div>
  );
}
