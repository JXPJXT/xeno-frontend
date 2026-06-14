import { useState } from 'react';
import { Bot, User, Rocket, XCircle } from 'lucide-react';
import type { ChatMessage as ChatMessageType } from '../lib/agent';
import ToolStepCard from './ToolStepCard';

/* ═══════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════ */

interface CampaignMetrics {
  campaignName: string; status: string;
  sent: number; delivered: number; opened: number; clicked: number;
  converted: number; openRate: number; clickRate: number;
  conversionRate: number; revenue: number;
}

interface Channel {
  id: string; name: string; icon: string; recommended: boolean;
  reason: string; bestFor: string; constraint: string; estimatedOpenRate: string;
}

interface ChannelSelectionData {
  audience: string; audienceSize: number; channels: Channel[];
  aiRecommendation: string; recommendationReason: string;
}

interface ContentDraftData {
  channel: string; subject?: string; body: string; preview: string;
  personalizationVars: string[]; characterCount: number;
  channelConstraint: string; withinLimit: boolean;
  offerCode?: string; offerType?: string; offerValue?: string;
}

/* ═══════════════════════════════════════════════════════════
   PARSERS — extract structured JSON blocks from agent text
   ═══════════════════════════════════════════════════════════ */

function extractBlock<T>(content: string, label: string): T | null {
  const re = new RegExp('```' + label + '\\n([\\s\\S]*?)\\n```');
  const m = content.match(re);
  if (!m) return null;
  try { return JSON.parse(m[1]) as T; } catch { return null; }
}

function stripBlocks(content: string): string {
  return content
    .replace(/```channel_selection\n[\s\S]*?\n```\n?/g, '')
    .replace(/```content_draft\n[\s\S]*?\n```\n?/g, '')
    .replace(/```campaign_metrics\n[\s\S]*?\n```\n?/g, '')
    .trim();
}

/* ═══════════════════════════════════════════════════════════
   CHANNEL SELECTION CARD
   ═══════════════════════════════════════════════════════════ */

function ChannelSelectionCard({
  data, onSelect, disabled,
}: { data: ChannelSelectionData; onSelect: (id: string) => void; disabled: boolean }) {
  const [selected, setSelected] = useState<string | null>(null);

  const pick = (id: string) => {
    if (disabled || selected) return;
    setSelected(id);
    onSelect(id);
  };

  return (
    <div style={{
      marginTop: 12, borderRadius: 14, overflow: 'hidden',
      border: '1px solid #E2E8F0', background: '#FFFFFF',
      animation: 'fade-in 0.3s ease-out',
    }}>
      {/* Header */}
      <div style={{
        background: '#F8FAFC', borderBottom: '1px solid #E2E8F0',
        padding: '12px 16px',
      }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>Choose a Channel</div>
        <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>
          Targeting <span style={{ fontWeight: 600, color: '#2563EB' }}>{data.audienceSize} customers</span> in {data.audience}
        </div>
      </div>

      {/* Channel options */}
      <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {data.channels.map(ch => {
          const isSelected = selected === ch.id;
          const isRecommended = ch.recommended;
          return (
            <button
              key={ch.id}
              onClick={() => pick(ch.id)}
              disabled={disabled || !!selected}
              style={{
                width: '100%', textAlign: 'left' as const,
                borderRadius: 10, padding: '10px 12px',
                border: `2px solid ${isSelected ? '#2563EB' : isRecommended ? '#BFDBFE' : '#F1F5F9'}`,
                background: isSelected ? '#EFF6FF' : isRecommended ? 'rgba(239,246,255,0.5)' : '#FFFFFF',
                cursor: disabled || selected ? (isSelected ? 'default' : 'not-allowed') : 'pointer',
                opacity: selected && !isSelected ? 0.45 : 1,
                transition: 'all 0.15s ease', fontFamily: 'inherit',
              }}
              onMouseEnter={e => {
                if (!disabled && !selected) {
                  e.currentTarget.style.borderColor = '#93C5FD';
                  e.currentTarget.style.background = '#F0F7FF';
                }
              }}
              onMouseLeave={e => {
                if (!isSelected) {
                  e.currentTarget.style.borderColor = isRecommended ? '#BFDBFE' : '#F1F5F9';
                  e.currentTarget.style.background = isRecommended ? 'rgba(239,246,255,0.5)' : '#FFFFFF';
                }
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 18 }}>{ch.icon}</span>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>{ch.name}</span>
                      {isRecommended && (
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
                          background: '#DBEAFE', color: '#1D4ED8',
                        }}>AI Pick</span>
                      )}
                      {isSelected && (
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
                          background: '#DCFCE7', color: '#16A34A',
                        }}>✓ Selected</span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: '#64748B', marginTop: 1 }}>{ch.bestFor}</div>
                  </div>
                </div>
                <div style={{ fontSize: 11, color: '#94A3B8', flexShrink: 0, marginLeft: 8, textAlign: 'right' as const }}>
                  {ch.estimatedOpenRate}
                </div>
              </div>
              {(isRecommended || isSelected) && (
                <div style={{
                  marginTop: 6, fontSize: 11, color: '#475569',
                  background: 'rgba(255,255,255,0.7)', borderRadius: 6,
                  padding: '5px 8px', border: '1px solid #F1F5F9',
                }}>
                  {ch.reason}
                </div>
              )}
              <div style={{ marginTop: 4, fontSize: 10, color: '#94A3B8' }}>
                📏 {ch.constraint}
              </div>
            </button>
          );
        })}
      </div>

      {/* AI recommendation footer */}
      {!selected && (
        <div style={{
          padding: '8px 16px', background: '#EFF6FF',
          borderTop: '1px solid #DBEAFE',
        }}>
          <div style={{ fontSize: 11, color: '#1D4ED8' }}>
            💡 <span style={{ fontWeight: 600 }}>AI recommends {data.aiRecommendation}:</span>{' '}
            {data.recommendationReason}
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   CONTENT DRAFT CARD
   ═══════════════════════════════════════════════════════════ */

const CHANNEL_ICONS: Record<string, string> = {
  EMAIL: '📧', WHATSAPP: '💬', SMS: '📱', PUSH: '🔔',
};

function ContentDraftCard({
  data, onApprove, onEdit, disabled,
}: {
  data: ContentDraftData;
  onApprove: () => void;
  onEdit: () => void;
  disabled: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={{
      marginTop: 12, borderRadius: 14, overflow: 'hidden',
      border: '1px solid #E2E8F0', background: '#FFFFFF',
      animation: 'fade-in 0.3s ease-out',
    }}>
      {/* Header */}
      <div style={{
        background: '#F8FAFC', borderBottom: '1px solid #E2E8F0',
        padding: '12px 16px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>{CHANNEL_ICONS[data.channel] || '📨'}</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>Message Draft</div>
            <div style={{ fontSize: 11, color: '#64748B' }}>{data.channel} · {data.characterCount} chars</div>
          </div>
        </div>
        <span style={{
          fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 99,
          background: data.withinLimit ? '#DCFCE7' : '#FEE2E2',
          color: data.withinLimit ? '#16A34A' : '#DC2626',
        }}>
          {data.withinLimit ? '✓ Within limit' : '⚠ Too long'}
        </span>
      </div>

      {/* Subject (email) */}
      {data.subject && (
        <div style={{ padding: '12px 16px 0' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Subject</div>
          <div style={{
            fontSize: 13, fontWeight: 600, color: '#0F172A',
            background: '#F8FAFC', borderRadius: 8, padding: '8px 12px',
            border: '1px solid #F1F5F9',
          }}>
            {data.subject}
          </div>
        </div>
      )}

      {/* Body */}
      <div style={{ padding: '12px 16px 0' }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Message</div>
        <div style={{
          fontSize: 13, color: '#334155', lineHeight: 1.6,
          background: '#F8FAFC', borderRadius: 8, padding: '10px 12px',
          border: '1px solid #F1F5F9', whiteSpace: 'pre-line' as const,
        }}>
          {expanded ? data.body : data.preview}
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 11, color: '#2563EB', marginTop: 4, fontFamily: 'inherit',
          }}
        >
          {expanded ? 'Show less' : 'Show full message'}
        </button>
      </div>

      {/* Personalization tags */}
      <div style={{ padding: '10px 16px 0' }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
          Personalized for each customer using
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 4 }}>
          {data.personalizationVars.map(v => (
            <span key={v} style={{
              fontSize: 11, fontFamily: 'monospace',
              padding: '2px 8px', borderRadius: 99,
              background: '#EFF6FF', color: '#1D4ED8',
              border: '1px solid #DBEAFE',
            }}>{v}</span>
          ))}
        </div>
      </div>

      {/* Offer */}
      {data.offerCode && (
        <div style={{ padding: '10px 16px 0' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: '#FFFBEB', border: '1px solid #FDE68A',
            borderRadius: 8, padding: '8px 12px',
          }}>
            <span>🎁</span>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#92400E' }}>{data.offerValue}</div>
              <div style={{ fontSize: 11, color: '#B45309', fontFamily: 'monospace' }}>Code: {data.offerCode}</div>
            </div>
          </div>
        </div>
      )}

      {/* Action buttons */}
      {!disabled && (
        <div style={{
          padding: '12px 16px', marginTop: 10,
          borderTop: '1px solid #F1F5F9',
          display: 'flex', gap: 8,
        }}>
          <button
            onClick={onApprove}
            style={{
              flex: 1, padding: '9px 16px', borderRadius: 10,
              background: 'linear-gradient(135deg, #2563EB, #1D4ED8)',
              color: 'white', border: 'none',
              fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              boxShadow: '0 2px 8px rgba(37,99,235,0.25)',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            Looks good — proceed
          </button>
          <button
            onClick={onEdit}
            style={{
              padding: '9px 14px', borderRadius: 10,
              background: '#FFFFFF', color: '#64748B',
              border: '1px solid #E2E8F0',
              fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#CBD5E1'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#E2E8F0'; }}
          >
            ✏️ Edit
          </button>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   CAMPAIGN METRICS CARD
   ═══════════════════════════════════════════════════════════ */

function CampaignMetricCard({ metrics }: { metrics: CampaignMetrics }) {
  const STATUS_STYLE: Record<string, { bg: string; fg: string }> = {
    ACTIVE: { bg: '#ECFDF5', fg: '#059669' },
    COMPLETED: { bg: '#EFF6FF', fg: '#2563EB' },
    DRAFT: { bg: '#F1F5F9', fg: '#64748B' },
  };
  const sc = STATUS_STYLE[metrics.status] || STATUS_STYLE.ACTIVE;

  return (
    <div style={{
      marginTop: 12, borderRadius: 14, padding: 16,
      background: 'linear-gradient(135deg, #EFF6FF 0%, #F0F4FF 100%)',
      border: '1px solid #DBEAFE',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>{metrics.campaignName}</div>
          <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>Campaign Performance</div>
        </div>
        <span style={{
          fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 99,
          background: sc.bg, color: sc.fg,
        }}>{metrics.status}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
        {[
          { label: 'Sent', value: metrics.sent },
          { label: 'Delivered', value: metrics.delivered },
          { label: 'Opened', value: metrics.opened },
          { label: 'Clicked', value: metrics.clicked },
        ].map(item => (
          <div key={item.label} style={{
            textAlign: 'center' as const, padding: '8px 4px',
            background: 'rgba(255,255,255,0.7)', borderRadius: 8,
            border: '1px solid rgba(219,234,254,0.5)',
          }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#0F172A' }}>{item.value}</div>
            <div style={{ fontSize: 10, color: '#64748B', fontWeight: 600 }}>{item.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const }}>
        <span style={{ fontSize: 11, padding: '4px 10px', borderRadius: 99, background: 'white', border: '1px solid #DBEAFE', color: '#2563EB', fontWeight: 600 }}>
          📬 {metrics.openRate.toFixed(1)}% open
        </span>
        <span style={{ fontSize: 11, padding: '4px 10px', borderRadius: 99, background: 'white', border: '1px solid #DBEAFE', color: '#2563EB', fontWeight: 600 }}>
          👆 {metrics.clickRate.toFixed(1)}% click
        </span>
        {metrics.revenue > 0 && (
          <span style={{ fontSize: 11, padding: '4px 10px', borderRadius: 99, background: 'white', border: '1px solid #D1FAE5', color: '#059669', fontWeight: 600 }}>
            ₹{metrics.revenue >= 1000 ? `${(metrics.revenue / 1000).toFixed(1)}K` : metrics.revenue} revenue
          </span>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MARKDOWN RENDERER
   ═══════════════════════════════════════════════════════════ */

function renderMarkdown(text: string) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/`(.*?)`/g, '<code style="background:#F1F5F9;padding:2px 6px;border-radius:4px;font-size:12px">$1</code>')
    .replace(/\n- /g, '\n• ')
    .replace(/\n/g, '<br />');
}

/* ═══════════════════════════════════════════════════════════
   CONFIRMATION DETECTOR
   ═══════════════════════════════════════════════════════════ */

function isConfirmationMessage(content: string): boolean {
  return content.includes('Shall I launch this campaign?') || content.includes('Shall I launch this?');
}

function isLaunchSuccessMessage(content: string): boolean {
  return (
    content.includes('successfully launched') ||
    content.includes('has been launched') ||
    content.includes('campaign is live') ||
    content.includes('Campaign launched') ||
    content.includes('dispatched')
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════ */

interface ChatMessageProps {
  message: ChatMessageType;
  onInjectMessage?: (text: string) => void;
  isLastAssistant?: boolean;
}

export default function ChatMessage({ message, onInjectMessage, isLastAssistant }: ChatMessageProps) {
  const isUser = message.role === 'user';

  // Parse structured blocks from assistant messages
  const channelData = !isUser ? extractBlock<ChannelSelectionData>(message.content, 'channel_selection') : null;
  const draftData = !isUser ? extractBlock<ContentDraftData>(message.content, 'content_draft') : null;
  const metricsData = !isUser ? extractBlock<CampaignMetrics>(message.content, 'campaign_metrics') : null;
  const cleanContent = !isUser ? stripBlocks(message.content) : message.content;

  const showConfirmation = !isUser && isLastAssistant && isConfirmationMessage(message.content) && onInjectMessage;
  const isInteractive = !!(isLastAssistant && onInjectMessage);

  return (
    <div style={{
      display: 'flex', gap: 12,
      flexDirection: isUser ? 'row-reverse' : 'row',
      marginBottom: 20,
      animation: 'fade-in 0.3s ease-out',
    }}>
      {/* Avatar */}
      <div style={{
        width: 32, height: 32, borderRadius: 10, flexShrink: 0,
        background: isUser ? '#2563EB' : '#F1F5F9',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginTop: 2,
      }}>
        {isUser ? (
          <User size={16} style={{ color: 'white' }} />
        ) : (
          <Bot size={16} style={{ color: '#2563EB' }} />
        )}
      </div>

      <div style={{ maxWidth: '75%', minWidth: 0 }}>
        {/* Tool steps (before assistant message) */}
        {!isUser && message.steps && message.steps.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 8 }}>
            {message.steps.map((step, i) => (
              <ToolStepCard key={i} step={step} />
            ))}
          </div>
        )}

        {/* Message bubble */}
        {cleanContent && (
          <div style={{
            padding: '12px 16px',
            borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
            background: isUser ? '#2563EB' : '#FFFFFF',
            color: isUser ? 'white' : '#0F172A',
            border: isUser ? 'none' : '1px solid #E2E8F0',
            fontSize: 14, lineHeight: 1.6,
            boxShadow: isUser ? 'none' : '0 1px 3px rgba(0,0,0,0.04)',
          }}
            dangerouslySetInnerHTML={{ __html: renderMarkdown(cleanContent) }}
          />
        )}

        {/* ── CHANNEL SELECTION CARD ── */}
        {channelData && (
          <ChannelSelectionCard
            data={channelData}
            onSelect={(ch) => onInjectMessage?.(`Use ${ch} channel`)}
            disabled={!isInteractive}
          />
        )}

        {/* ── CONTENT DRAFT CARD ── */}
        {draftData && (
          <ContentDraftCard
            data={draftData}
            onApprove={() => onInjectMessage?.('Looks good, proceed with creating and launching')}
            onEdit={() => onInjectMessage?.('Rewrite the message with a different tone')}
            disabled={!isInteractive}
          />
        )}

        {/* ── CAMPAIGN METRICS CARD ── */}
        {metricsData && <CampaignMetricCard metrics={metricsData} />}

        {/* ── LAUNCH CONFIRMATION BUTTONS ── */}
        {showConfirmation && (
          <div style={{
            display: 'flex', gap: 8, marginTop: 12,
            animation: 'fade-in 0.3s ease-out',
          }}>
            <button
              onClick={() => onInjectMessage!('Yes, launch it')}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 18px', borderRadius: 10,
                background: 'linear-gradient(135deg, #2563EB, #1D4ED8)',
                color: 'white', border: 'none',
                fontSize: 13, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit',
                boxShadow: '0 2px 8px rgba(37,99,235,0.3)',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(37,99,235,0.4)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(37,99,235,0.3)'; }}
            >
              <Rocket size={14} /> Launch Campaign
            </button>
            <button
              onClick={() => onInjectMessage!("Cancel, don't launch")}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 18px', borderRadius: 10,
                background: '#FFFFFF', color: '#64748B',
                border: '1px solid #E2E8F0',
                fontSize: 13, fontWeight: 500,
                cursor: 'pointer', fontFamily: 'inherit',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#CBD5E1'; e.currentTarget.style.color = '#334155'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.color = '#64748B'; }}
            >
              <XCircle size={14} /> Cancel
            </button>
          </div>
        )}

        {/* ── POST-LAUNCH SUGGESTION CHIPS ── */}
        {!isUser && isInteractive && isLaunchSuccessMessage(message.content) && (
          <div style={{
            display: 'flex', gap: 6, marginTop: 10,
            animation: 'fade-in 0.3s ease-out',
          }}>
            <button
              onClick={() => onInjectMessage?.('Show me the results')}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '6px 14px', borderRadius: 99,
                background: '#FFFFFF', border: '1px solid #E2E8F0',
                color: '#475569', fontSize: 12, fontWeight: 500,
                cursor: 'pointer', fontFamily: 'inherit',
                boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#2563EB'; e.currentTarget.style.color = '#2563EB'; e.currentTarget.style.background = '#EFF6FF'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.color = '#475569'; e.currentTarget.style.background = '#FFFFFF'; }}
            >
              📊 Show me results
            </button>
            <button
              onClick={() => onInjectMessage?.('What should I do next to maximize conversions?')}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '6px 14px', borderRadius: 99,
                background: '#FFFFFF', border: '1px solid #E2E8F0',
                color: '#475569', fontSize: 12, fontWeight: 500,
                cursor: 'pointer', fontFamily: 'inherit',
                boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#2563EB'; e.currentTarget.style.color = '#2563EB'; e.currentTarget.style.background = '#EFF6FF'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.color = '#475569'; e.currentTarget.style.background = '#FFFFFF'; }}
            >
              💡 What's next?
            </button>
          </div>
        )}

        {/* Timestamp */}
        <div style={{
          fontSize: 11, color: '#94A3B8', marginTop: 4,
          textAlign: isUser ? 'right' : 'left',
          paddingLeft: isUser ? 0 : 4,
          paddingRight: isUser ? 4 : 0,
        }}>
          {message.timestamp.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
}
