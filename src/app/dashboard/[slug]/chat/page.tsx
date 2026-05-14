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
    messagesEndRef.current?.scrollIntoView({ behavior: 'instant' });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: ChatMessage = { role: 'user', content: text.trim() };
    // Snapshot messages before state update to avoid stale closure in fetch body
    const snapshotMessages = messages;

    setMessages((prev) => [...prev, userMsg, { role: 'assistant', content: '' }]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          messages: [...snapshotMessages, userMsg].map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const errMsg = (err as { error?: string }).error || 'Failed to get response. Check that your Gemini API key is saved in Settings.';
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: 'assistant', content: `❌ ${errMsg}` };
          return updated;
        });
        return;
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        let accumulated = '';
        let rafPending = false;

        const flush = () => {
          const snapshot = accumulated;
          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = { role: 'assistant', content: snapshot };
            return updated;
          });
          rafPending = false;
        };

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          for (const line of chunk.split('\n')) {
            if (!line.startsWith('data: ')) continue;
            const payload = line.slice(6).trim();
            if (payload === '[DONE]') break;
            try {
              const parsed = JSON.parse(payload);
              if (parsed.error) {
                accumulated = `❌ ${parsed.error}`;
                flush();
                break;
              }
              if (parsed.text) {
                accumulated += parsed.text;
                // Batch DOM updates via rAF — prevents per-chunk re-renders that freeze UI
                if (!rafPending) {
                  rafPending = true;
                  requestAnimationFrame(flush);
                }
              }
            } catch { /* skip partial/non-JSON lines */ }
          }
        }

        // Final flush for any remaining content
        if (accumulated) flush();
      }
    } catch {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: 'assistant', content: '❌ Network error. Please check your connection and try again.' };
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
        background: 'linear-gradient(160deg, var(--bg-tertiary) 0%, var(--bg-elevated) 100%)',
        borderRadius: '20px', padding: '20px',
        border: '1px solid var(--glass-border)', overflowY: 'auto',
      }}>
        {/* Sidebar header */}
        <div style={{ marginBottom: '4px' }}>
          <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '2px' }}>
            Suggested Prompts
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Click to ask</div>
        </div>

        {/* Category tabs */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
          {PROMPT_CATEGORIES.map((cat, i) => (
            <button
              key={i}
              onClick={() => setActiveCategory(i)}
              style={{
                padding: '5px 11px', borderRadius: '20px',
                border: activeCategory === i ? 'none' : '1px solid var(--glass-border)',
                cursor: 'pointer', fontSize: '12px', fontWeight: 500,
                background: activeCategory === i ? 'var(--accent-blue)' : 'transparent',
                color: activeCategory === i ? '#fff' : 'var(--text-secondary)',
                transition: 'all 0.15s',
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
                padding: '10px 12px', borderRadius: '12px', border: '1px solid var(--glass-border)',
                background: 'rgba(255,255,255,0.02)', color: 'var(--text-primary)', cursor: 'pointer',
                fontSize: '12px', textAlign: 'left', lineHeight: '1.5', transition: 'all 0.15s',
                fontFamily: 'var(--font-sans)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--accent-blue)';
                e.currentTarget.style.background = 'rgba(59,130,246,0.04)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--glass-border)';
                e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
              }}
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Chat stats + clear */}
        {messages.length > 0 && (
          <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid var(--glass-border)' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
              {Math.floor(messages.length / 2)} messages in this session
            </div>
          </div>
        )}
      </div>

      {/* Main Chat Area */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        background: 'var(--bg-elevated)', borderRadius: '20px',
        border: '1px solid var(--glass-border)', overflow: 'hidden',
      }}>
        {/* Chat Header */}
        <div style={{
          padding: '16px 24px', borderBottom: '1px solid var(--glass-border)',
          display: 'flex', alignItems: 'center', gap: '12px',
          background: 'rgba(255,255,255,0.01)',
        }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '10px',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px',
            flexShrink: 0, boxShadow: '0 0 16px rgba(99,102,241,0.3)',
          }}>✨</div>
          <div>
            <div style={{ fontWeight: '700', fontSize: '15px' }}>AI Consultant</div>
            <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
              Powered by Groq · Llama 3.3 70B
            </div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '8px', height: '8px', borderRadius: '50%',
              background: '#22c55e', boxShadow: '0 0 6px #22c55e',
            }} />
            {/* Clear chat button */}
            {messages.length > 0 && (
              <button
                onClick={clearChat}
                title="Clear chat"
                style={{
                  padding: '5px 10px', borderRadius: '8px',
                  border: '1px solid var(--glass-border)', background: 'transparent',
                  color: 'var(--text-muted)', cursor: 'pointer', fontSize: '11px',
                  fontFamily: 'var(--font-sans)', transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(239,68,68,0.4)';
                  e.currentTarget.style.color = '#ef4444';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--glass-border)';
                  e.currentTarget.style.color = 'var(--text-muted)';
                }}
              >
                🗑️ Clear
              </button>
            )}
            <a
              href={`/dashboard/${slug}`}
              title="Close AI Consultant"
              style={{
                width: '32px', height: '32px', borderRadius: '8px',
                background: 'transparent', border: '1px solid var(--glass-border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--text-muted)', fontSize: '16px', textDecoration: 'none',
                cursor: 'pointer', transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(239,68,68,0.1)';
                e.currentTarget.style.borderColor = 'rgba(239,68,68,0.4)';
                e.currentTarget.style.color = '#ef4444';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.borderColor = 'var(--glass-border)';
                e.currentTarget.style.color = 'var(--text-muted)';
              }}
            >
              ✕
            </a>
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {messages.length === 0 ? (
            <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--text-muted)', padding: '40px 20px' }}>
              <div style={{ fontSize: '64px', marginBottom: '20px' }}>✨</div>
              <div style={{ fontSize: '20px', fontWeight: '700', marginBottom: '8px', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                Ask anything about your store
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', maxWidth: '380px', lineHeight: '1.7', margin: '0 auto' }}>
                I have access to your Shopify, Ads, and Analytics data — ask about revenue, trends, CRO, or growth strategy.
              </div>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '24px', flexWrap: 'wrap' }}>
                {['📦 Shopify', '📊 GA4', '💰 Ads', '🎯 CRO'].map((tag) => (
                  <span key={tag} style={{
                    padding: '5px 14px', borderRadius: '20px',
                    background: 'var(--bg-tertiary)', border: '1px solid var(--glass-border)',
                    fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500,
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
                  maxWidth: '72%',
                  ...(msg.role === 'user'
                    ? {
                        padding: '12px 16px',
                        borderRadius: '16px 16px 4px 16px',
                        background: 'var(--accent-blue)',
                        color: '#fff',
                        fontSize: '14px',
                        lineHeight: '1.6',
                      }
                    : {
                        padding: '14px 16px 14px 20px',
                        borderRadius: '0 16px 16px 0',
                        borderLeft: '3px solid var(--accent-blue)',
                        background: 'rgba(59,130,246,0.05)',
                        color: 'var(--text-primary)',
                        fontSize: '14px',
                        lineHeight: '1.7',
                        border: '1px solid var(--glass-border)',
                        borderLeftWidth: '3px',
                        borderLeftColor: 'var(--accent-blue)',
                      }),
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
          display: 'flex', gap: '10px', alignItems: 'center',
          background: 'rgba(255,255,255,0.01)',
        }}>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your store's performance, ads, CRO opportunities..."
            disabled={isLoading}
            style={{
              flex: 1, padding: '13px 18px', borderRadius: '14px',
              border: '1px solid var(--glass-border)',
              background: 'var(--bg-tertiary)',
              color: 'var(--text-primary)', fontSize: '14px', outline: 'none',
              fontFamily: 'var(--font-sans)',
              boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.2)',
              transition: 'border-color 0.15s',
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent-blue)')}
            onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--glass-border)')}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isLoading}
            style={{
              padding: '13px 22px', borderRadius: '14px',
              border: `1px solid ${!input.trim() || isLoading ? 'var(--glass-border)' : 'transparent'}`,
              background: !input.trim() || isLoading
                ? 'var(--bg-tertiary)'
                : 'linear-gradient(135deg, var(--accent-blue), #6366f1)',
              color: !input.trim() || isLoading ? 'var(--text-dim)' : '#fff',
              cursor: !input.trim() || isLoading ? 'default' : 'pointer',
              fontSize: '18px', transition: 'all 0.15s',
              boxShadow: !input.trim() || isLoading ? 'none' : '0 0 16px rgba(59,130,246,0.3)',
            }}
          >
            →
          </button>
        </div>
      </div>
    </div>
  );
}
