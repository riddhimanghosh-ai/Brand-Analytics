'use client';

import { useState, useRef, useEffect } from 'react';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const SUGGESTIONS = [
  'What are my CRO opportunities?',
  'How can I increase AOV?',
  'Analyze my repeat customer rate',
  'What products should I promote?',
  'How is my store performing?',
  'Suggest bundling strategies',
];

export function ChatPanel({ slug, brandName, hasAI = true }: { slug: string; brandName: string; hasAI?: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'instant' });
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: ChatMessage = { role: 'user', content: text.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    // Add empty assistant message for streaming
    setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

    const snapshotMessages = messages;
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          messages: [...snapshotMessages, userMsg].map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: 'assistant',
            content: `❌ ${(err as { error?: string }).error || 'Failed to get response. Check your Gemini API key in Settings.'}`,
          };
          return updated;
        });
        setIsLoading(false);
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
                if (!rafPending) {
                  rafPending = true;
                  requestAnimationFrame(flush);
                }
              }
            } catch { /* skip */ }
          }
        }
        if (accumulated) flush();
      }
    } catch {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: 'assistant',
          content: '❌ Network error. Please try again.',
        };
        return updated;
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <>
      {/* Floating Trigger Button — links to full chat page */}
      {!isOpen && (
        <a
          href={`/dashboard/${slug}/chat`}
          className="chat-trigger"
          title={hasAI ? 'Open AI Consultant' : 'Add GEMINI_API_KEY to enable AI'}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none',
            ...(!hasAI ? { background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)', opacity: 0.7 } : {}),
          }}
        >
          {hasAI ? '✨' : '🔑'}
        </a>
      )}

      {/* Chat Panel */}
      {isOpen && (
        <>
          <div className="chat-panel-overlay" onClick={() => setIsOpen(false)} />
          <div className="chat-panel">
            {/* Header */}
            <div className="chat-panel-header">
              <h3>
                <span>✨</span> AI Consultant — {brandName}
              </h3>
              <button className="chat-panel-close" onClick={() => setIsOpen(false)}>
                ✕
              </button>
            </div>

            {/* Messages */}
            <div className="chat-messages">
              {messages.length === 0 && (
                <div style={{
                  textAlign: 'center',
                  padding: '40px 0',
                  color: 'var(--text-muted)',
                }}>
                  {!hasAI ? (
                    <>
                      <div style={{ fontSize: '40px', marginBottom: '12px' }}>🔑</div>
                      <div style={{ fontSize: '14px', fontWeight: '500', marginBottom: '8px', color: 'var(--text-secondary)' }}>
                        AI Assistant Not Configured
                      </div>
                      <div style={{ fontSize: '12px', lineHeight: '1.6', maxWidth: '280px', margin: '0 auto' }}>
                        Add your{' '}
                        <code style={{ background: 'var(--bg-elevated)', padding: '2px 6px', borderRadius: '4px', fontSize: '11px' }}>
                          GEMINI_API_KEY
                        </code>{' '}
                        to <strong>.env</strong> or in{' '}
                        <strong>Settings → Connections → AI Consultant</strong>
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{ fontSize: '40px', marginBottom: '12px', opacity: 0.4 }}>🤖</div>
                      <div style={{ fontSize: '14px', fontWeight: '500', marginBottom: '4px', color: 'var(--text-secondary)' }}>
                        CRO Consultant Ready
                      </div>
                      <div style={{ fontSize: '12px' }}>
                        Ask me anything about {brandName}&apos;s performance
                      </div>
                    </>
                  )}
                </div>
              )}

              {messages.map((msg, i) => (
                <div key={i} className={`chat-message ${msg.role}`}>
                  {msg.role === 'assistant' && msg.content === '' ? (
                    <div className="typing-indicator">
                      <div className="typing-dot" />
                      <div className="typing-dot" />
                      <div className="typing-dot" />
                    </div>
                  ) : (
                    <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Suggestions */}
            {messages.length === 0 && hasAI && (
              <div className="chat-suggestions">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    className="chat-suggestion-btn"
                    onClick={() => sendMessage(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <div className="chat-input-area">
              <input
                ref={inputRef}
                className="chat-input"
                placeholder={hasAI ? "Ask about your store's performance..." : "Set GEMINI_API_KEY in Settings to enable AI..."}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isLoading || !hasAI}
              />
              <button
                className="chat-send-btn"
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || isLoading || !hasAI}
              >
                →
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
