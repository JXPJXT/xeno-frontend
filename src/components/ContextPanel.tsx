import { useEffect, useState } from 'react';
import { DollarSign, Users, Megaphone, TrendingUp, Clock, Activity, CheckCircle2, XCircle, Loader2 } from 'lucide-react';

/* ─── Types ─── */
export interface ActivityEntry {
  id: string;
  time: Date;
  text: string;
  tool?: string;
  status: 'running' | 'done' | 'error';
}

interface Props {
  activityLog: ActivityEntry[];
  onInjectMessage?: (text: string) => void;
}

function formatCurrency(n: number) {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${n}`;
}

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 5) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

export default function ContextPanel({ activityLog, onInjectMessage }: Props) {
  const [kpis, setKpis] = useState<any>(null);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [, setTick] = useState(0);

  // Re-render every 10s to update relative timestamps
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const h = {
      'Authorization': `Bearer ${localStorage.getItem('xeno_token')}`,
      'x-tenant-id': localStorage.getItem('xeno_tenant_id') || '',
    };
    fetch('/api/v1/analytics/overview', { headers: h })
      .then(r => r.json()).then(r => setKpis(r.data)).catch(() => {});
    fetch('/api/v1/campaigns', { headers: h })
      .then(r => r.json()).then(r => {
        const d = r.data;
        setCampaigns((Array.isArray(d) ? d : []).slice(0, 5));
      }).catch(() => {});
  }, []);

  const STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
    DRAFT: { bg: '#F1F5F9', fg: '#64748B' },
    ACTIVE: { bg: '#ECFDF5', fg: '#059669' },
    COMPLETED: { bg: '#EFF6FF', fg: '#2563EB' },
  };

  const handleCampaignClick = (campaign: any) => {
    if (onInjectMessage) {
      onInjectMessage(`Show me the performance and insights for the "${campaign.name}" campaign`);
    }
  };

  return (
    <div style={{
      width: 300, height: '100vh', background: '#FFFFFF',
      borderLeft: '1px solid #E2E8F0',
      display: 'flex', flexDirection: 'column',
      flexShrink: 0, overflow: 'auto',
    }}>
      {/* KPIs */}
      <div style={{ padding: '16px 18px', borderBottom: '1px solid #E2E8F0' }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
          Platform Overview
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[
            { label: 'Revenue', value: kpis ? formatCurrency(kpis.totalRevenue || 0) : '—', icon: DollarSign, color: '#10B981' },
            { label: 'Customers', value: kpis?.totalCustomers?.toLocaleString() || '—', icon: Users, color: '#2563EB' },
            { label: 'Campaigns', value: kpis?.totalCampaigns || '—', icon: Megaphone, color: '#F59E0B' },
            { label: 'Attributed', value: kpis ? formatCurrency(kpis.totalAttributedRevenue || 0) : '—', icon: TrendingUp, color: '#8B5CF6' },
          ].map(k => (
            <div key={k.label} style={{
              padding: '10px 12px', borderRadius: 10,
              background: '#F8FAFC', border: '1px solid #F1F5F9',
            }}>
              <k.icon size={14} style={{ color: k.color, marginBottom: 4 }} />
              <div style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>{k.value}</div>
              <div style={{ fontSize: 10, color: '#94A3B8', fontWeight: 600 }}>{k.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Campaigns — now clickable */}
      <div style={{ padding: '14px 18px', borderBottom: '1px solid #E2E8F0' }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
          Recent Campaigns
        </div>
        {campaigns.length === 0 ? (
          <div style={{ fontSize: 12, color: '#94A3B8', padding: '8px 0' }}>No campaigns yet</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {campaigns.map(c => {
              const sc = STATUS_COLORS[c.status] || STATUS_COLORS.DRAFT;
              return (
                <div
                  key={c.id}
                  onClick={() => handleCampaignClick(c)}
                  style={{
                    padding: '8px 10px', borderRadius: 8,
                    background: '#F8FAFC', border: '1px solid #F1F5F9',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    cursor: onInjectMessage ? 'pointer' : 'default',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={e => {
                    if (onInjectMessage) {
                      e.currentTarget.style.background = '#EFF6FF';
                      e.currentTarget.style.borderColor = '#BFDBFE';
                    }
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = '#F8FAFC';
                    e.currentTarget.style.borderColor = '#F1F5F9';
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.name}
                    </div>
                    <div style={{ fontSize: 10, color: '#94A3B8' }}>{c.channel}</div>
                  </div>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
                    background: sc.bg, color: sc.fg,
                  }}>
                    {c.status}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Activity Log — now with status icons */}
      <div style={{ padding: '14px 18px', flex: 1 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Activity size={11} /> Agent Activity
        </div>
        {activityLog.length === 0 ? (
          <div style={{ fontSize: 12, color: '#94A3B8', padding: '8px 0' }}>No activity yet — start a conversation</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {activityLog.slice(0, 15).map((a) => (
              <div key={a.id} style={{
                display: 'flex', gap: 8, fontSize: 11, lineHeight: 1.4,
                animation: 'fade-in 0.3s ease-out',
              }}>
                {/* Status icon */}
                <div style={{ marginTop: 2, flexShrink: 0 }}>
                  {a.status === 'running' ? (
                    <Loader2 size={12} style={{ color: '#2563EB', animation: 'spin 1s linear infinite' }} />
                  ) : a.status === 'error' ? (
                    <XCircle size={12} style={{ color: '#EF4444' }} />
                  ) : (
                    <CheckCircle2 size={12} style={{ color: '#10B981' }} />
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ color: a.status === 'running' ? '#0F172A' : '#64748B', fontWeight: a.status === 'running' ? 600 : 500 }}>
                    {a.text}
                  </span>
                  <span style={{ color: '#CBD5E1', marginLeft: 6, fontSize: 10 }}>
                    {timeAgo(a.time)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
