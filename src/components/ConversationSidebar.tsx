import { MessageSquare, Plus, LogOut, CircleUserRound, Trash2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { type Conversation } from '../hooks/useAgent';

const STARTERS = [
  'Reactivate customers who haven\'t ordered in 90+ days',
  'Prevent churn in our highest-value segment',
  'Show campaign performance',
  'Which customers are at risk?',
];

interface Props {
  onPrompt: (text: string) => void;
  onNewChat: () => void;
  conversations: Conversation[];
  activeConversationId: string | null;
  loadConversation: (id: string) => void;
  deleteConversation: (id: string) => void;
}

export default function ConversationSidebar({
  onPrompt,
  onNewChat,
  conversations,
  activeConversationId,
  loadConversation,
  deleteConversation,
}: Props) {
  const { user, logout } = useAuth();

  return (
    <div style={{
      width: 260, height: '100vh', background: '#FFFFFF',
      borderRight: '1px solid #E2E8F0',
      display: 'flex', flexDirection: 'column',
      flexShrink: 0,
    }}>
      {/* Logo */}
      <div style={{
        padding: '16px 20px', borderBottom: '1px solid #E2E8F0',
        display: 'flex', alignItems: 'center',
      }}>
        <img src="/xeno.png" alt="Xeno Logo" style={{ height: 26, objectFit: 'contain' }} />
      </div>

      {/* New Chat */}
      <div style={{ padding: '12px 16px' }}>
        <button onClick={onNewChat} style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 14px', borderRadius: 10,
          background: '#F8FAFC', border: '1px solid #E2E8F0',
          color: '#334155', fontSize: 13, fontWeight: 600,
          cursor: 'pointer', fontFamily: 'inherit',
          transition: 'all 0.15s ease',
        }}
          onMouseEnter={e => { e.currentTarget.style.background = '#EFF6FF'; e.currentTarget.style.borderColor = '#BFDBFE'; }}
          onMouseLeave={e => { e.currentTarget.style.background = '#F8FAFC'; e.currentTarget.style.borderColor = '#E2E8F0'; }}
        >
          <Plus size={15} /> New Chat
        </button>
      </div>

      {/* Conversations History */}
      <div style={{
        padding: '0 16px 10px',
        display: 'flex',
        flexDirection: 'column',
        maxHeight: '40%',
        borderBottom: conversations.length > 0 ? '1px solid #F1F5F9' : 'none',
      }}>
        <div style={{
          fontSize: 10, fontWeight: 700, color: '#94A3B8',
          textTransform: 'uppercase', letterSpacing: '0.08em',
          marginBottom: 8, paddingLeft: 2,
        }}>
          Recent Conversations
        </div>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          overflowY: 'auto',
          paddingRight: 4,
        }}>
          {conversations.length === 0 ? (
            <div style={{ fontSize: 12, color: '#94A3B8', padding: '8px 12px', fontStyle: 'italic' }}>
              No past chats
            </div>
          ) : (
            conversations.map((c) => {
              const isActive = c.id === activeConversationId;
              return (
                <div
                  key={c.id}
                  className="sidebar-conv-item"
                  onClick={() => loadConversation(c.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 10px',
                    borderRadius: 8,
                    background: isActive ? '#EFF6FF' : 'transparent',
                    border: isActive ? '1px solid #DBEAFE' : '1px solid transparent',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={e => {
                    if (!isActive) {
                      e.currentTarget.style.background = '#F8FAFC';
                    }
                    // Show trash icon
                    const trashBtn = e.currentTarget.querySelector('.trash-btn') as HTMLElement;
                    if (trashBtn) trashBtn.style.opacity = '1';
                  }}
                  onMouseLeave={e => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'transparent';
                    }
                    // Hide trash icon
                    const trashBtn = e.currentTarget.querySelector('.trash-btn') as HTMLElement;
                    if (trashBtn) trashBtn.style.opacity = '0';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
                    <MessageSquare size={13} style={{ flexShrink: 0, color: isActive ? '#2563EB' : '#94A3B8' }} />
                    <span style={{
                      fontSize: 12,
                      fontWeight: isActive ? 600 : 500,
                      color: isActive ? '#1D4ED8' : '#475569',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {c.title}
                    </span>
                  </div>
                  <button
                    className="trash-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm('Are you sure you want to delete this conversation?')) {
                        deleteConversation(c.id);
                      }
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#94A3B8',
                      padding: 2,
                      opacity: 0,
                      transition: 'opacity 0.15s ease',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                    onMouseEnter={e => e.currentTarget.style.color = '#EF4444'}
                    onMouseLeave={e => e.currentTarget.style.color = '#94A3B8'}
                    title="Delete conversation"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Starters */}
      <div style={{ flex: 1, overflow: 'auto', padding: '16px 16px 16px' }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10, paddingLeft: 2 }}>
          Suggested Goals
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {STARTERS.map((s, i) => (
            <button key={i} onClick={() => onPrompt(s)} style={{
              textAlign: 'left', padding: '8px 10px', borderRadius: 8,
              background: 'transparent', border: 'none',
              color: '#475569', fontSize: 12, lineHeight: 1.4,
              cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500,
              transition: 'all 0.15s ease',
              display: 'flex', alignItems: 'flex-start', gap: 8,
            }}
              onMouseEnter={e => { e.currentTarget.style.background = '#F8FAFC'; e.currentTarget.style.color = '#0F172A'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#475569'; }}
            >
              <MessageSquare size={13} style={{ marginTop: 2, flexShrink: 0, color: '#94A3B8' }} />
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* User */}
      <div style={{
        padding: '12px 16px', borderTop: '1px solid #E2E8F0',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: 99,
          background: 'linear-gradient(135deg, #E0E7FF, #DBEAFE)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '1px solid #C7D2FE',
        }}>
          <CircleUserRound size={18} style={{ color: '#4F46E5' }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user?.firstName} {user?.lastName}
          </div>
        </div>
        <button onClick={logout} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', padding: 4 }} title="Sign out">
          <LogOut size={14} />
        </button>
      </div>
    </div>
  );
}
