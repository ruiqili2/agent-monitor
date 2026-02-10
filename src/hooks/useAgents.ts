// ============================================================================
// useAgents — Agent state management hook
// Uses SSE (EventSource) for real-time state updates from the gateway,
// with an initial fetch + slow periodic refetch for metadata (tokens, etc.)
// Falls back to demo mode if gateway is unreachable
// ============================================================================

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type {
  AgentConfig,
  AgentBehavior,
  AgentDashboardState,
  ActivityEvent,
  SystemStats,
} from '@/lib/types';
import { behaviorToOfficeState } from '@/lib/gateway-client';
import type { GatewaySessionInfo, GatewayApiResponse } from '@/lib/gateway-client';
import {
  generateDemoAgentState,
  generateDemoEvent,
  generateDemoStats,
  BEHAVIOR_INFO,
  behaviorToOfficeState as stateMapperBtoO,
} from '@/lib/state-mapper';

export interface ChatMessage {
  id: string;
  agentId: string;
  role: 'user' | 'agent';
  content: string;
  timestamp: number;
}

export interface UseAgentsReturn {
  agents: AgentConfig[];
  agentStates: Record<string, AgentDashboardState>;
  activityFeed: ActivityEvent[];
  systemStats: SystemStats;
  demoMode: boolean;
  connected: boolean;
  chatMessages: Record<string, ChatMessage[]>;
  /** Map from session ID → session key (for API calls) */
  sessionKeys: Record<string, string>;
  sendChat: (agentId: string, message: string) => void;
  setBehavior: (agentId: string, behavior: AgentBehavior) => void;
  restartSession: (agentId: string) => Promise<void>;
}

const DEMO_BEHAVIORS: AgentBehavior[] = [
  'coding', 'thinking', 'researching', 'meeting', 'deploying',
  'debugging', 'idle', 'coffee', 'sleeping', 'receiving_task',
  'reporting', 'snacking',
];

const DEMO_CHAT_RESPONSES = [
  "I'm working on it! 🔥",
  "Just finished analyzing the data.",
  "Need more context. Can you clarify?",
  "Done! Check the results.",
  "Running tests now...",
  "Found a bug, fixing it.",
  "Deployed successfully! 🚀",
  "Taking a quick break ☕",
  "On it! Give me a moment.",
  "Here's what I found...",
];

/** Auto-assign avatar + color for discovered agents */
const AGENT_AVATARS: AgentConfig['avatar'][] = ['glasses', 'hoodie', 'suit', 'casual', 'robot', 'cat'];
const AGENT_COLORS = ['#4FC3F7', '#66BB6A', '#FFCA28', '#AB47BC', '#EF5350', '#FF9800'];
const AGENT_EMOJIS = ['⚡', '🔥', '🌟', '🎯', '🚀', '🧠'];

function sessionToAgentConfig(sess: GatewaySessionInfo, index: number): AgentConfig {
  const isMain = !sess.isSubagent;
  return {
    id: sess.id,
    name: sess.name,
    emoji: sess.emoji ?? (isMain ? '⚡' : AGENT_EMOJIS[(index) % AGENT_EMOJIS.length]),
    color: isMain ? '#4FC3F7' : AGENT_COLORS[(index) % AGENT_COLORS.length],
    avatar: isMain ? 'glasses' : AGENT_AVATARS[(index) % AGENT_AVATARS.length],
  };
}

function sessionToDashboardState(sess: GatewaySessionInfo): AgentDashboardState {
  const behavior = (sess.behavior ?? 'idle') as AgentBehavior;
  return {
    behavior,
    officeState: behaviorToOfficeState(behavior),
    currentTask: null,
    taskHistory: [],
    tokenUsage: [],
    totalTokens: sess.totalTokens,
    contextTokens: sess.contextTokens,
    totalTasks: 0,
    lastActivity: sess.lastActivity,
    sessionLog: [
      `Model: ${sess.model}`,
      `Channel: ${sess.channel}`,
      `Tokens: ${sess.totalTokens.toLocaleString()}`,
      sess.aborted ? '⚠️ Last run aborted' : '',
    ].filter(Boolean),
    uptime: 0,
  };
}

/** The default demo agent configs */
const DEMO_AGENTS: AgentConfig[] = [
  { id: 'demo-1', name: 'Atlas', emoji: '🔥', color: '#4FC3F7', avatar: 'glasses' },
  { id: 'demo-2', name: 'Nova', emoji: '✨', color: '#66BB6A', avatar: 'hoodie' },
  { id: 'demo-3', name: 'Spark', emoji: '⚡', color: '#FFCA28', avatar: 'robot' },
];

export function useAgents(forceDemoMode = false): UseAgentsReturn {
  const [connected, setConnected] = useState(false);
  const [demoMode, setDemoMode] = useState(true);
  const [agents, setAgents] = useState<AgentConfig[]>(DEMO_AGENTS);
  const [agentStates, setAgentStates] = useState<Record<string, AgentDashboardState>>({});
  const [activityFeed, setActivityFeed] = useState<ActivityEvent[]>([]);
  const [systemStats, setSystemStats] = useState<SystemStats>(() => generateDemoStats(DEMO_AGENTS));
  const [chatMessages, setChatMessages] = useState<Record<string, ChatMessage[]>>({});
  const [sessionKeys, setSessionKeys] = useState<Record<string, string>>({});

  // Refs for cleanup and tracking
  const eventSourceRef = useRef<EventSource | null>(null);
  const metadataTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const demoTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const feedTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevBehaviorsRef = useRef<Record<string, string>>({});
  /** Maps session key → session id (for patching state by key) */
  const keyToIdRef = useRef<Record<string, string>>({});

  // ------------------------------------------------------------------
  // Fetch full session data from /api/gateway (metadata + current state)
  // ------------------------------------------------------------------
  const fetchSessions = useCallback(async (): Promise<boolean> => {
    if (forceDemoMode) return false;

    try {
      const resp = await fetch('/api/gateway', { signal: AbortSignal.timeout(10000) });
      if (!resp.ok) throw new Error('API error');
      const data = (await resp.json()) as GatewayApiResponse;

      if (!data.ok || !data.sessions?.length) {
        return false;
      }

      setConnected(true);
      setDemoMode(false);

      // Build agent configs from sessions
      const newAgents = data.sessions.map((sess, i) => sessionToAgentConfig(sess, i));
      setAgents(newAgents);

      // Build session key map (sessionId → sessionKey) + reverse map
      const newKeys: Record<string, string> = {};
      const newKeyToId: Record<string, string> = {};
      for (const sess of data.sessions) {
        newKeys[sess.id] = sess.key;
        newKeyToId[sess.key] = sess.id;
      }
      setSessionKeys(newKeys);
      keyToIdRef.current = newKeyToId;

      // Build dashboard states
      const newStates: Record<string, AgentDashboardState> = {};
      for (const sess of data.sessions) {
        newStates[sess.id] = sessionToDashboardState(sess);
      }
      setAgentStates(newStates);

      // Detect behavior changes → add to activity feed
      for (const sess of data.sessions) {
        const prevBehavior = prevBehaviorsRef.current[sess.id];
        if (prevBehavior && prevBehavior !== sess.behavior) {
          const info = BEHAVIOR_INFO[(sess.behavior ?? 'idle') as AgentBehavior];
          const agent = newAgents.find(a => a.id === sess.id);
          if (agent && info) {
            const event: ActivityEvent = {
              id: `gw-${Date.now()}-${sess.id}`,
              agentId: sess.id,
              agentName: agent.name,
              agentEmoji: agent.emoji,
              type: 'state_change',
              message: `${info.emoji} ${info.label}`,
              timestamp: Date.now(),
            };
            setActivityFeed(prev => [event, ...prev].slice(0, 50));
          }
        }
        prevBehaviorsRef.current[sess.id] = sess.behavior;
      }

      // System stats
      setSystemStats({
        totalAgents: data.sessions.length,
        activeAgents: data.sessions.filter(s => s.isActive).length,
        totalTokens: data.sessions.reduce((sum, s) => sum + s.totalTokens, 0),
        totalTasks: 0,
        completedTasks: 0,
        failedTasks: data.sessions.filter(s => s.aborted).length,
        uptime: 0,
        connected: true,
      });

      return true;
    } catch {
      return false;
    }
  }, [forceDemoMode]);

  // ------------------------------------------------------------------
  // SSE: connect to /api/gateway/events for real-time state patches
  // ------------------------------------------------------------------
  useEffect(() => {
    if (forceDemoMode) return;

    let cancelled = false;

    async function init() {
      // Initial fetch to populate sessions
      const ok = await fetchSessions();
      if (cancelled) return;

      if (!ok) {
        setConnected(false);
        setDemoMode(true);
        return;
      }

      // Open SSE connection for real-time state updates
      const es = new EventSource('/api/gateway/events');
      eventSourceRef.current = es;

      es.addEventListener('state', (evt) => {
        try {
          const data = JSON.parse(evt.data) as {
            sessionKey: string;
            chatStatus: string | null;
            agentStatus: string | null;
            agentEventData: Record<string, unknown> | null;
            behavior: string;
            agentName: string | null;
            emoji: string | null;
            lastRunId: string | null;
          };

          const sessionId = keyToIdRef.current[data.sessionKey];
          if (!sessionId) return; // unknown session — will appear on next metadata refresh

          const behavior = (data.behavior ?? 'idle') as AgentBehavior;

          // Patch the dashboard state for this specific session
          setAgentStates(prev => {
            const existing = prev[sessionId];
            if (!existing) return prev;
            return {
              ...prev,
              [sessionId]: {
                ...existing,
                behavior,
                officeState: behaviorToOfficeState(behavior),
                lastActivity: Date.now(),
              },
            };
          });

          // Detect behavior change → activity feed
          const prevBehavior = prevBehaviorsRef.current[sessionId];
          if (prevBehavior && prevBehavior !== behavior) {
            const info = BEHAVIOR_INFO[behavior];
            if (info) {
              setAgents(currentAgents => {
                const agent = currentAgents.find(a => a.id === sessionId);
                if (agent) {
                  const event: ActivityEvent = {
                    id: `sse-${Date.now()}-${sessionId}`,
                    agentId: sessionId,
                    agentName: agent.name,
                    agentEmoji: agent.emoji,
                    type: 'state_change',
                    message: `${info.emoji} ${info.label}`,
                    timestamp: Date.now(),
                  };
                  setActivityFeed(prev => [event, ...prev].slice(0, 50));
                }
                return currentAgents; // no change to agents array
              });
            }
          }
          prevBehaviorsRef.current[sessionId] = behavior;

        } catch {
          // Ignore malformed events
        }
      });

      es.addEventListener('open', () => {
        // SSE connection established
      });

      es.onerror = () => {
        // EventSource will auto-reconnect. If the server is gone for a while,
        // fall back to demo mode. We'll recover on the next successful reconnect.
        // Don't immediately set demo mode — give it a chance to reconnect.
      };

      // Slow metadata refresh every 30s (token counts, new sessions, etc.)
      metadataTimerRef.current = setInterval(() => {
        fetchSessions();
      }, 30_000);
    }

    init();

    return () => {
      cancelled = true;
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (metadataTimerRef.current) {
        clearInterval(metadataTimerRef.current);
        metadataTimerRef.current = null;
      }
    };
  }, [forceDemoMode, fetchSessions]);

  // Demo mode: random behavior changes
  useEffect(() => {
    if (!demoMode) {
      if (demoTimerRef.current) clearInterval(demoTimerRef.current);
      if (feedTimerRef.current) clearInterval(feedTimerRef.current);
      return;
    }

    // Init demo states
    const states: Record<string, AgentDashboardState> = {};
    for (const agent of DEMO_AGENTS) {
      states[agent.id] = generateDemoAgentState(agent.id);
    }
    setAgentStates(states);
    setAgents(DEMO_AGENTS);

    demoTimerRef.current = setInterval(() => {
      setAgentStates(prev => {
        const next = { ...prev };
        const agentIdx = Math.floor(Math.random() * DEMO_AGENTS.length);
        const agent = DEMO_AGENTS[agentIdx];
        if (agent && next[agent.id]) {
          const newBehavior = DEMO_BEHAVIORS[Math.floor(Math.random() * DEMO_BEHAVIORS.length)];
          next[agent.id] = {
            ...next[agent.id],
            behavior: newBehavior,
            officeState: stateMapperBtoO(newBehavior),
            lastActivity: Date.now(),
            totalTokens: next[agent.id].totalTokens + Math.floor(Math.random() * 500),
          };
        }
        return next;
      });
    }, 5000);

    feedTimerRef.current = setInterval(() => {
      const event = generateDemoEvent(DEMO_AGENTS);
      setActivityFeed(prev => [event, ...prev].slice(0, 50));
    }, 3000);

    return () => {
      if (demoTimerRef.current) clearInterval(demoTimerRef.current);
      if (feedTimerRef.current) clearInterval(feedTimerRef.current);
    };
  }, [demoMode]);

  const setBehavior = useCallback((agentId: string, behavior: AgentBehavior) => {
    setAgentStates(prev => {
      if (!prev[agentId]) return prev;
      return {
        ...prev,
        [agentId]: {
          ...prev[agentId],
          behavior,
          officeState: behaviorToOfficeState(behavior),
          lastActivity: Date.now(),
        },
      };
    });
  }, []);

  const restartSession = useCallback(async (agentId: string) => {
    const key = sessionKeys[agentId];
    if (!key) return;

    try {
      const resp = await fetch('/api/gateway/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset', sessionKey: key }),
      });
      const data = await resp.json();

      // Add activity event
      const agent = agents.find(a => a.id === agentId);
      if (agent) {
        setActivityFeed(prev => [{
          id: `restart-${Date.now()}`,
          agentId,
          agentName: agent.name,
          agentEmoji: agent.emoji,
          type: 'system' as const,
          message: data.ok ? '🔄 Session reset' : `❌ Reset failed: ${data.error}`,
          timestamp: Date.now(),
        }, ...prev].slice(0, 50));
      }

      // Force immediate re-fetch
      setTimeout(() => fetchSessions(), 1000);
    } catch (err) {
      console.error('Restart failed:', err);
    }
  }, [sessionKeys, agents, fetchSessions]);

  // Track message counts per agent to detect new replies
  const msgCountRef = useRef<Record<string, number>>({});

  // Poll chat history for the agent's reply after sending a message
  const pollForReply = useCallback(async (agentId: string, key: string) => {
    const maxAttempts = 90; // Up to 90s (90 × 1s)
    const pollInterval = 1000;

    // Add a "thinking" indicator
    const thinkingId = `msg-${Date.now()}-thinking`;
    setChatMessages(prev => ({
      ...prev,
      [agentId]: [...(prev[agentId] || []), {
        id: thinkingId,
        agentId,
        role: 'agent' as const,
        content: '💭 Thinking...',
        timestamp: Date.now(),
      }],
    }));

    // Use the gateway poll data (already polling every 5s) to detect when agent finishes
    // Then fetch history only once
    const baselineCount = msgCountRef.current[agentId] ?? 0;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise(r => setTimeout(r, pollInterval));

      // Check if the agent's behavior changed from active to idle-ish (via existing poll)
      // But mainly just try to fetch history and check for new assistant messages
      // Only check every 3 attempts (every 3s) to reduce WS connection overhead
      if (attempt % 3 !== 0) continue;

      try {
        const resp = await fetch('/api/gateway/action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'history', sessionKey: key, limit: 5 }),
        });
        const data = await resp.json();

        if (data.ok && data.result?.messages) {
          const messages = data.result.messages as Array<{
            role: string;
            content?: string | Array<{ type: string; text?: string }>;
          }>;

          const assistantCount = messages.filter(m => m.role === 'assistant').length;

          // If we have more assistant messages than baseline, we got a reply
          if (assistantCount > baselineCount) {
            // Get the last assistant message
            const assistantMsgs = messages.filter(m => m.role === 'assistant');
            const lastAssistant = assistantMsgs[assistantMsgs.length - 1];

            let content = '';
            if (typeof lastAssistant.content === 'string') {
              content = lastAssistant.content;
            } else if (Array.isArray(lastAssistant.content)) {
              content = lastAssistant.content
                .filter((b) => b.type === 'text' && b.text)
                .map((b) => b.text)
                .join('\n');
            }

            if (content) {
              const displayContent = content.length > 2000
                ? content.slice(0, 2000) + '\n\n…(truncated)'
                : content;

              // Update baseline
              msgCountRef.current[agentId] = assistantCount;

              setChatMessages(prev => ({
                ...prev,
                [agentId]: (prev[agentId] || []).map(m =>
                  m.id === thinkingId
                    ? { ...m, id: `msg-${Date.now()}-agent`, content: displayContent, timestamp: Date.now() }
                    : m
                ),
              }));
              return;
            }
          }
        }
      } catch {
        // Ignore poll errors, keep trying
      }
    }

    // Timeout
    setChatMessages(prev => ({
      ...prev,
      [agentId]: (prev[agentId] || []).map(m =>
        m.id === thinkingId
          ? { ...m, content: '⏱️ No reply yet (agent may still be processing)', timestamp: Date.now() }
          : m
      ),
    }));
  }, []);

  const sendChat = useCallback((agentId: string, message: string) => {
    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}-user`,
      agentId,
      role: 'user',
      content: message,
      timestamp: Date.now(),
    };
    setChatMessages(prev => ({
      ...prev,
      [agentId]: [...(prev[agentId] || []), userMsg],
    }));

    if (demoMode) {
      setTimeout(() => {
        const response: ChatMessage = {
          id: `msg-${Date.now()}-agent`,
          agentId,
          role: 'agent',
          content: DEMO_CHAT_RESPONSES[Math.floor(Math.random() * DEMO_CHAT_RESPONSES.length)],
          timestamp: Date.now(),
        };
        setChatMessages(prev => ({
          ...prev,
          [agentId]: [...(prev[agentId] || []), response],
        }));
      }, 1000 + Math.random() * 2000);
    } else {
      // Real mode: send via gateway, then poll for reply
      const key = sessionKeys[agentId];
      if (key) {
        // First, snapshot the current assistant message count before sending
        fetch('/api/gateway/action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'history', sessionKey: key, limit: 200 }),
        }).then(r => r.json()).then(baseData => {
          // Set baseline from current history
          if (baseData.ok && baseData.result?.messages) {
            const count = (baseData.result.messages as Array<{ role: string }>)
              .filter(m => m.role === 'assistant').length;
            msgCountRef.current[agentId] = count;
          }
          // Now send the message
          return fetch('/api/gateway/action', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'send', sessionKey: key, message }),
          });
        }).then(resp => resp.json()).then(data => {
          if (data.ok) {
            // Start polling for the agent's actual reply
            pollForReply(agentId, key);
          } else {
            setChatMessages(prev => ({
              ...prev,
              [agentId]: [...(prev[agentId] || []), {
                id: `msg-${Date.now()}-agent`,
                agentId,
                role: 'agent' as const,
                content: `❌ ${data.error}`,
                timestamp: Date.now(),
              }],
            }));
          }
        }).catch(() => {
          setChatMessages(prev => ({
            ...prev,
            [agentId]: [...(prev[agentId] || []), {
              id: `msg-${Date.now()}-agent`,
              agentId,
              role: 'agent' as const,
              content: '❌ Failed to send message',
              timestamp: Date.now(),
            }],
          }));
        });
      }
    }
  }, [demoMode, sessionKeys, pollForReply]);

  return {
    agents,
    agentStates,
    activityFeed,
    systemStats,
    demoMode,
    connected,
    chatMessages,
    sessionKeys,
    sendChat,
    setBehavior,
    restartSession,
  };
}
