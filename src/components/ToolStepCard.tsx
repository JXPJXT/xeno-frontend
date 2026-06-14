import { CheckCircle2, XCircle, Loader2, BarChart3, Users, Brain, Megaphone, Target, Search, Rocket, Zap } from 'lucide-react';
import type { AgentStep } from '../lib/agent';

const TOOL_META: Record<string, { label: string; icon: any; color: string }> = {
  get_platform_overview: { label: 'Fetching platform overview', icon: BarChart3, color: '#2563EB' },
  get_customer_segments: { label: 'Checking customer segments', icon: Users, color: '#0EA5E9' },
  get_customers: { label: 'Searching customers', icon: Search, color: '#6366F1' },
  get_customer_intelligence: { label: 'Analyzing customer intelligence', icon: Brain, color: '#8B5CF6' },
  get_campaigns: { label: 'Listing campaigns', icon: Megaphone, color: '#F59E0B' },
  get_campaign_results: { label: 'Pulling campaign results', icon: BarChart3, color: '#10B981' },
  create_campaign: { label: 'Creating campaign', icon: Target, color: '#2563EB' },
  launch_campaign: { label: 'Launching campaign', icon: Rocket, color: '#EF4444' },
  get_ai_strategy: { label: 'Generating AI strategy', icon: Zap, color: '#F59E0B' },
};

export default function ToolStepCard({ step, isActive }: { step: AgentStep; isActive?: boolean }) {
  if (step.type === 'tool_call') {
    const meta = TOOL_META[step.tool || ''] || { label: step.tool, icon: Zap, color: '#64748B' };
    const Icon = meta.icon;
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '8px 14px', borderRadius: 10,
        background: isActive ? '#EFF6FF' : '#F8FAFC',
        border: `1px solid ${isActive ? '#BFDBFE' : '#E2E8F0'}`,
        fontSize: 13, color: isActive ? '#1D4ED8' : '#334155',
        fontWeight: 500, transition: 'all 0.2s ease',
      }}>
        {isActive ? (
          <Loader2 size={14} style={{ color: meta.color, animation: 'spin 1s linear infinite' }} />
        ) : (
          <Icon size={14} style={{ color: meta.color }} />
        )}
        <span>{meta.label}</span>
        {step.args && Object.keys(step.args).length > 0 && (
          <span style={{ fontSize: 11, color: '#94A3B8', marginLeft: 'auto' }}>
            {Object.values(step.args).filter(Boolean).slice(0, 1).map(v => 
              typeof v === 'string' ? v.substring(0, 30) : ''
            ).join(', ')}
          </span>
        )}
      </div>
    );
  }

  if (step.type === 'tool_result') {
    const meta = TOOL_META[step.tool || ''] || { label: step.tool, icon: Zap, color: '#64748B' };
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '6px 14px', borderRadius: 10,
        background: step.success ? '#F0FDF4' : '#FEF2F2',
        border: `1px solid ${step.success ? '#BBF7D0' : '#FECACA'}`,
        fontSize: 12, color: step.success ? '#166534' : '#991B1B',
        fontWeight: 500,
      }}>
        {step.success ? (
          <CheckCircle2 size={13} style={{ color: '#16A34A' }} />
        ) : (
          <XCircle size={13} style={{ color: '#DC2626' }} />
        )}
        <span>{meta.label} — {step.success ? 'done' : 'failed'}</span>
      </div>
    );
  }

  if (step.type === 'thinking') {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '8px 14px', borderRadius: 10,
        background: '#FFFBEB',
        border: '1px solid #FDE68A',
        fontSize: 13, color: '#D97706',
        fontWeight: 500, transition: 'all 0.2s ease',
        animation: 'pulse 2s infinite ease-in-out',
      }}>
        <Loader2 size={14} style={{ color: '#D97706', animation: 'spin 1s linear infinite' }} />
        <span>{step.text || 'Thinking...'}</span>
      </div>
    );
  }

  return null;
}
