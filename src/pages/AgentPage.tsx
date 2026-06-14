import { useState, useRef, useEffect } from 'react';
import { Send, Bot, Sparkles, Loader2, CheckCircle2, Square } from 'lucide-react';
import { useAgent } from '../hooks/useAgent';
import ChatMessage from '../components/ChatMessage';
import ToolStepCard from '../components/ToolStepCard';
import ConversationSidebar from '../components/ConversationSidebar';
import ContextPanel from '../components/ContextPanel';

/* ─── Tool Label Map (for streaming steps) ─── */
const TOOL_LABELS: Record<string, string> = {
  'get_platform_overview': 'Checking platform overview',
  'get_customer_segments': 'Analyzing customer segments',
  'get_customers': 'Searching customer database',
  'get_customer_intelligence': 'Pulling customer intelligence',
  'get_campaigns': 'Reviewing campaign history',
  'get_campaign_results': 'Fetching campaign analytics',
  'get_ai_strategy': 'Generating AI strategy',
  'create_campaign': 'Creating campaign',
  'launch_campaign': 'Launching campaign',
};

export default function AgentPage() {
  const {
    messages,
    isThinking,
    currentSteps,
    activityLog,
    conversations,
    activeConversationId,
    isLoadingChat,
    loadConversation,
    deleteConversation,
    sendMessage,
    clearChat,
    stopThinking,
  } = useAgent();
  const [input, setInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const geminiKey = import.meta.env.VITE_GEMINI_API_KEY;
  const nvidiaKey = import.meta.env.VITE_NVIDIA_API_KEY;
  const groqKey = import.meta.env.VITE_GROQ_API_KEY;

  // Auto-scroll
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, currentSteps, isThinking]);

  const handleSend = () => {
    if (!input.trim() || isThinking) return;
    const text = input.trim();
    sendMessage(text);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Inject a message as if the user typed it (used by confirmation buttons + campaign cards)
  const handleInjectMessage = (text: string) => {
    if (isThinking) return;
    setInput('');
    sendMessage(text);
  };

  const isEmpty = messages.length === 0;

  // Find the last assistant message id (for showing confirmation buttons only on the latest)
  const lastAssistantId = [...messages].reverse().find(m => m.role === 'assistant')?.id;

  // Build streaming live steps for Enhancement 4
  const liveSteps = currentSteps.map((step, i) => {
    const isLast = i === currentSteps.length - 1;
    const label = step.tool ? (TOOL_LABELS[step.tool] || step.tool) : (step.text || 'Thinking...');
    let status: 'active' | 'done' = 'done';
    if (step.type === 'tool_call' && isLast) status = 'active';
    if (step.type === 'tool_call' && !isLast) status = 'done';
    if (step.type === 'thinking') status = isLast ? 'active' : 'done';
    return { label, status, type: step.type };
  });

  // Deduplicate: keep only tool_call entries (result entries are just confirmations)
  const displaySteps = liveSteps.filter(s => s.type === 'tool_call' || s.type === 'thinking');

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#FAFBFC' }}>
      {/* Sidebar */}
      <ConversationSidebar
        onPrompt={(text) => {
          setInput('');
          sendMessage(text);
        }}
        onNewChat={clearChat}
        conversations={conversations}
        activeConversationId={activeConversationId}
        loadConversation={loadConversation}
        deleteConversation={deleteConversation}
        isThinking={isThinking}
      />

      {/* Main Chat */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Chat Header */}
        <div style={{
          padding: '12px 24px', borderBottom: '1px solid #E2E8F0',
          background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <Bot size={18} style={{ color: '#2563EB' }} />
          <span style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>Marketing Agent</span>
          {isThinking && (
            <span style={{
              marginLeft: 'auto', fontSize: 12, color: '#2563EB', fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
              Thinking...
            </span>
          )}
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflow: 'auto', padding: '24px 32px' }}>
          {isLoadingChat ? (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              height: '100%', color: '#64748B', gap: 12,
            }}>
              <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', color: '#2563EB' }} />
              <span style={{ fontSize: 14, fontWeight: 500 }}>Loading conversation...</span>
            </div>
          ) : (
            <>
              {isEmpty && !isThinking && (
                <div style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  height: '100%', textAlign: 'center', animation: 'fade-in 0.5s ease-out',
                }}>
                  <div style={{
                    width: 64, height: 64, borderRadius: 20,
                    background: 'linear-gradient(135deg, #EFF6FF, #F0F9FF)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginBottom: 20, border: '1px solid #DBEAFE',
                  }}>
                    <Sparkles size={28} style={{ color: '#2563EB' }} />
                  </div>
                  <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.03em', marginBottom: 8 }}>
                    What can I help you with?
                  </h2>
                  <p style={{ fontSize: 14, color: '#64748B', maxWidth: 400, lineHeight: 1.6, marginBottom: 32 }}>
                    I'm your AI marketing agent. Tell me your business goal and I'll analyze data, build strategy, and execute campaigns — all through this conversation.
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', maxWidth: 500 }}>
                    {[
                      'Reactivate dormant customers',
                      'Prevent high-value churn',
                      'Show campaign performance',
                      'Who are our best customers?',
                    ].map(s => (
                      <button key={s} onClick={() => sendMessage(s)} style={{
                        padding: '8px 16px', borderRadius: 99,
                        background: '#FFFFFF', border: '1px solid #E2E8F0',
                        color: '#475569', fontSize: 13, fontWeight: 500,
                        cursor: 'pointer', fontFamily: 'inherit',
                        transition: 'all 0.15s ease',
                      }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = '#2563EB'; e.currentTarget.style.color = '#2563EB'; e.currentTarget.style.background = '#EFF6FF'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.color = '#475569'; e.currentTarget.style.background = '#FFFFFF'; }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map(msg => (
                <ChatMessage
                  key={msg.id}
                  message={msg}
                  onInjectMessage={handleInjectMessage}
                  isLastAssistant={msg.id === lastAssistantId}
                />
              ))}

              {/* Enhancement 4: Live Agent Working Card */}
              {isThinking && displaySteps.length > 0 && (
                <div style={{ display: 'flex', gap: 12, marginBottom: 20, animation: 'fade-in 0.3s ease-out' }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 10, flexShrink: 0,
                    background: '#F1F5F9',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Sparkles size={16} style={{ color: '#2563EB' }} />
                  </div>
                  <div style={{
                    background: '#FFFFFF', border: '1px solid #E2E8F0',
                    borderRadius: 14, padding: '14px 18px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    maxWidth: '60%',
                  }}>
                    <div style={{
                      fontSize: 10, fontWeight: 700, color: '#94A3B8',
                      textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10,
                    }}>
                      Agent Working
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {displaySteps.map((step, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                          {step.status === 'active' ? (
                            <div style={{
                              width: 10, height: 10, borderRadius: 99, flexShrink: 0,
                              background: '#2563EB',
                              animation: 'pulse 1.5s infinite ease-in-out',
                            }} />
                          ) : (
                            <CheckCircle2 size={12} style={{ color: '#10B981', flexShrink: 0 }} />
                          )}
                          <span style={{
                            color: step.status === 'active' ? '#0F172A' : '#94A3B8',
                            fontWeight: step.status === 'active' ? 600 : 400,
                          }}>
                            {step.label}
                          </span>
                        </div>
                      ))}
                      {/* Typing dots */}
                      <div style={{ display: 'flex', gap: 4, paddingLeft: 18, marginTop: 4 }}>
                        <div style={{
                          width: 5, height: 5, borderRadius: 99, background: '#CBD5E1',
                          animation: 'bounce 1.4s infinite ease-in-out',
                        }} />
                        <div style={{
                          width: 5, height: 5, borderRadius: 99, background: '#CBD5E1',
                          animation: 'bounce 1.4s infinite ease-in-out',
                          animationDelay: '0.16s',
                        }} />
                        <div style={{
                          width: 5, height: 5, borderRadius: 99, background: '#CBD5E1',
                          animation: 'bounce 1.4s infinite ease-in-out',
                          animationDelay: '0.32s',
                        }} />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Typing indicator (when no steps yet) */}
              {isThinking && displaySteps.length === 0 && (
                <div style={{ display: 'flex', gap: 12, marginBottom: 20, animation: 'fade-in 0.3s ease-out' }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 10, flexShrink: 0,
                    background: '#F1F5F9',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Bot size={16} style={{ color: '#2563EB' }} />
                  </div>
                  <div style={{
                    padding: '14px 18px', borderRadius: '16px 16px 16px 4px',
                    background: '#FFFFFF', border: '1px solid #E2E8F0',
                  }}>
                    <div className="thinking-dots" style={{ display: 'flex', gap: 5 }}>
                      <span /><span /><span />
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Input */}
        <div style={{
          padding: '12px 20px 16px',
          borderTop: '1px solid #E2E8F0',
          background: '#FFFFFF',
        }}>
          <div style={{
            display: 'flex', alignItems: 'flex-end', gap: 10,
            padding: '10px 14px',
            borderRadius: 14,
            border: '1px solid #E2E8F0',
            background: '#FAFBFC',
            transition: 'all 0.2s ease',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
            onFocus={(e) => { e.currentTarget.style.borderColor = '#2563EB'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.1)'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)'; }}
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isThinking ? 'Agent is working...' : 'Tell me your marketing goal...'}
              disabled={isThinking}
              rows={1}
              style={{
                flex: 1, resize: 'none', border: 'none', outline: 'none',
                background: 'transparent', fontFamily: 'inherit',
                fontSize: 14, color: '#0F172A', lineHeight: 1.5,
                maxHeight: 120,
              }}
              onInput={e => {
                const t = e.currentTarget;
                t.style.height = 'auto';
                t.style.height = Math.min(t.scrollHeight, 120) + 'px';
              }}
            />
            {isThinking ? (
              <button
                onClick={stopThinking}
                title="Stop thinking process"
                style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: '#EF4444',
                  border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.15s ease', flexShrink: 0,
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#DC2626'}
                onMouseLeave={e => e.currentTarget.style.background = '#EF4444'}
              >
                <Square size={13} style={{ fill: 'white', color: 'white' }} />
              </button>
            ) : (
              <button
                onClick={handleSend}
                disabled={!input.trim()}
                style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: input.trim() ? '#2563EB' : '#E2E8F0',
                  border: 'none', cursor: input.trim() ? 'pointer' : 'not-allowed',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.15s ease', flexShrink: 0,
                }}
              >
                <Send size={16} style={{ color: input.trim() ? 'white' : '#94A3B8' }} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Context Panel */}
      <ContextPanel activityLog={activityLog} onInjectMessage={handleInjectMessage} />
    </div>
  );
}
