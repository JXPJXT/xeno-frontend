import { useState, useCallback, useRef, useEffect } from 'react';
import { runAgentLoop, type ChatMessage, type AgentStep } from '../lib/agent';
import { useAuth } from './useAuth';
import type { ActivityEntry } from '../components/ContextPanel';
import api from '../api/client';

/* ─── Types ─── */
export interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

/* ─── Tool Name → Human Label ─── */
const TOOL_LABELS: Record<string, string> = {
  'get_platform_overview': 'Checked platform overview',
  'get_customer_segments': 'Analyzed customer segments',
  'get_customers': 'Searched customer database',
  'get_customer_intelligence': 'Pulled customer intelligence',
  'get_campaigns': 'Reviewed campaign history',
  'get_campaign_results': 'Fetched campaign analytics',
  'get_ai_strategy': 'Generated AI strategy',
  'create_campaign': 'Created campaign',
  'launch_campaign': 'Launched campaign',
};

let msgCounter = 0;
function nextId() { return `msg-${++msgCounter}-${Date.now()}`; }

let activityCounter = 0;
function nextActivityId() { return `act-${++activityCounter}-${Date.now()}`; }

export function useAgent() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [currentSteps, setCurrentSteps] = useState<AgentStep[]>([]);
  const [activityLog, setActivityLog] = useState<ActivityEntry[]>([]);
  
  // Persistence state
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [isLoadingChat, setIsLoadingChat] = useState(false);

  const historyRef = useRef<any[]>([]);
  const { token, tenantId } = useAuth();

  // Track running activity IDs so we can mark them done
  const runningActivitiesRef = useRef<Map<string, string>>(new Map()); // tool -> activityId

  const addActivity = useCallback((text: string, status: 'running' | 'done' | 'error' = 'done', tool?: string): string => {
    const id = nextActivityId();
    setActivityLog(prev => [{ id, time: new Date(), text, tool, status }, ...prev].slice(0, 50));
    return id;
  }, []);

  const updateActivity = useCallback((id: string, updates: Partial<ActivityEntry>) => {
    setActivityLog(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
  }, []);

  // Fetch all conversations
  const fetchConversations = useCallback(async () => {
    if (!token) return;
    try {
      const res = await api.get('/chats');
      setConversations(res.data);
    } catch (err) {
      console.error('Failed to fetch conversations', err);
    }
  }, [token]);

  // Load a single conversation's history
  const loadConversation = useCallback(async (id: string) => {
    try {
      setIsLoadingChat(true);
      const res = await api.get(`/chats/${id}`);
      const chat = res.data;
      
      setActiveConversationId(chat.id);
      
      const formattedMessages = chat.messages.map((m: any) => ({
        id: m.id,
        role: m.role as 'user' | 'assistant',
        content: m.content,
        timestamp: new Date(m.timestamp),
        steps: m.steps as AgentStep[] | undefined,
      }));
      
      setMessages(formattedMessages);
      
      historyRef.current = formattedMessages.map((m: any) => ({
        role: m.role,
        content: m.content,
      }));
    } catch (err) {
      console.error('Failed to load conversation', err);
    } finally {
      setIsLoadingChat(false);
    }
  }, []);

  // Delete a conversation
  const deleteConversation = useCallback(async (id: string) => {
    try {
      await api.delete(`/chats/${id}`);
      if (activeConversationId === id) {
        setActiveConversationId(null);
        setMessages([]);
        historyRef.current = [];
      }
      await fetchConversations();
    } catch (err) {
      console.error('Failed to delete conversation', err);
    }
  }, [activeConversationId, fetchConversations]);

  // Load chats list on mount / token change
  useEffect(() => {
    if (token) {
      fetchConversations();
    } else {
      setConversations([]);
      setActiveConversationId(null);
      setMessages([]);
      historyRef.current = [];
    }
  }, [token, fetchConversations]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isThinking) return;

    let convId = activeConversationId;

    // 1. If no active conversation, create one first!
    if (!convId) {
      try {
        const title = text.slice(0, 35) + (text.length > 35 ? '...' : '');
        const res = await api.post('/chats', { title });
        const newConv = res.data;
        convId = newConv.id;
        setActiveConversationId(convId);
        // Refresh sidebar list
        await fetchConversations();
      } catch (err) {
        console.error('Failed to create conversation', err);
        addActivity('Error: Failed to start new chat session', 'error');
        return;
      }
    }

    // 2. Save User Message to DB
    let userMsg: ChatMessage;
    try {
      const res = await api.post(`/chats/${convId}/messages`, {
        role: 'user',
        content: text.trim(),
      });
      userMsg = {
        id: res.data.id,
        role: res.data.role,
        content: res.data.content,
        timestamp: new Date(res.data.timestamp),
      };
    } catch (err) {
      console.error('Failed to save user message', err);
      userMsg = {
        id: nextId(),
        role: 'user',
        content: text.trim(),
        timestamp: new Date(),
      };
    }

    setMessages(prev => [...prev, userMsg]);
    setIsThinking(true);
    setCurrentSteps([]);

    const steps: AgentStep[] = [];

    const onStep = (step: AgentStep) => {
      steps.push(step);
      setCurrentSteps([...steps]);

      if (step.type === 'tool_call' && step.tool) {
        const label = TOOL_LABELS[step.tool] || `Called ${step.tool}`;
        const actId = addActivity(label, 'running', step.tool);
        runningActivitiesRef.current.set(step.tool, actId);
      }
      if (step.type === 'tool_result' && step.tool) {
        const actId = runningActivitiesRef.current.get(step.tool);
        if (actId) {
          const label = TOOL_LABELS[step.tool] || `Called ${step.tool}`;
          updateActivity(actId, {
            text: label,
            status: step.success ? 'done' : 'error',
          });
          runningActivitiesRef.current.delete(step.tool);
        }
      }
    };

    try {
      const reply = await runAgentLoop(
        text.trim(),
        historyRef.current,
        onStep,
        token || '',
        tenantId || '',
      );

      // 3. Save Assistant Message to DB (including steps!)
      let assistantMsg: ChatMessage;
      try {
        const res = await api.post(`/chats/${convId}/messages`, {
          role: 'assistant',
          content: reply,
          steps: steps.length > 0 ? steps : undefined,
        });
        assistantMsg = {
          id: res.data.id,
          role: res.data.role,
          content: res.data.content,
          timestamp: new Date(res.data.timestamp),
          steps: res.data.steps as AgentStep[] | undefined,
        };
      } catch (err) {
        console.error('Failed to save assistant message', err);
        assistantMsg = {
          id: nextId(),
          role: 'assistant',
          content: reply,
          steps: steps.length > 0 ? [...steps] : undefined,
          timestamp: new Date(),
        };
      }

      setMessages(prev => [...prev, assistantMsg]);

      historyRef.current.push(
        { role: 'user', content: text.trim() },
        { role: 'assistant', content: reply },
      );

      // Keep history manageable
      if (historyRef.current.length > 20) {
        historyRef.current = historyRef.current.slice(-16);
      }

      addActivity('Agent responded');
      // Refresh sidebar list to update timestamp
      fetchConversations();
    } catch (err: any) {
      const errMsg = `Something went wrong: ${err.message || 'Unknown error'}. Please try again.`;
      
      let errorMsg: ChatMessage;
      try {
        const res = await api.post(`/chats/${convId}/messages`, {
          role: 'assistant',
          content: errMsg,
        });
        errorMsg = {
          id: res.data.id,
          role: res.data.role,
          content: res.data.content,
          timestamp: new Date(res.data.timestamp),
        };
      } catch {
        errorMsg = {
          id: nextId(),
          role: 'assistant',
          content: errMsg,
          timestamp: new Date(),
        };
      }

      setMessages(prev => [...prev, errorMsg]);
      addActivity(`Error: ${err.message}`, 'error');
    } finally {
      // Mark any remaining running activities as done
      runningActivitiesRef.current.forEach((actId) => {
        updateActivity(actId, { status: 'done' });
      });
      runningActivitiesRef.current.clear();
      setIsThinking(false);
      setCurrentSteps([]);
    }
  }, [isThinking, token, tenantId, activeConversationId, fetchConversations, addActivity, updateActivity]);

  const clearChat = useCallback(() => {
    setActiveConversationId(null);
    setMessages([]);
    historyRef.current = [];
    setCurrentSteps([]);
  }, []);

  return {
    messages,
    isThinking,
    currentSteps,
    activityLog,
    conversations,
    activeConversationId,
    isLoadingChat,
    fetchConversations,
    loadConversation,
    deleteConversation,
    sendMessage,
    clearChat,
  };
}

