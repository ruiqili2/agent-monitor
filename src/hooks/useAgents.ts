// ============================================================================
// useAgents — Agent state management hook
// Polls /api/gateway for real OpenClaw session data
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
  // Main session gets special treatment
  const isMain = !sess.isSubagent;
  return {
    id: sess.id,
    name: isMain ? 'Lipo' : sess.name,
    emoji: isMain ? '⚡' : AGENT_EMOJIS[(index) % AGENT_EMOJIS.length],
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
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const demoTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const feedTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevBehaviorsRef = useRef<Record<string, string>>({});

  // Poll /api/gateway for real data
  const pollGateway = useCallback(async () => {
    if (forceDemoMode) return;

    try {
      const resp = await fetch('/api/gateway', { signal: AbortSignal.timeout(10000) });
      if (!resp.ok) throw new Error('API error');
      const data = (await resp.json()) as GatewayApiResponse;

      if (!data.ok || !data.sessions?.length) {
        setConnected(false);
        setDemoMode(true);
        return;
      }

      setConnected(true);
      setDemoMode(false);

      // Build agent configs from sessions
      const newAgents = data.sessions.map((sess, i) => sessionToAgentConfig(sess, i));
      setAgents(newAgents);

      // Build session key map (sessionId → sessionKey)
      const newKeys: Record<string, string> = {};
      for (const sess of data.sessions) {
        newKeys[sess.id] = sess.key;
      }
      setSessionKeys(newKeys);

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

      // System stats — only real data from gateway
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

    } catch {
      setConnected(false);
      setDemoMode(true);
    }
  }, [forceDemoMode]);

  // Start polling
  useEffect(() => {
    pollGateway();
    pollTimerRef.current = setInterval(pollGateway, 5000);
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [pollGateway]);

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

      // Force immediate re-poll
      setTimeout(() => pollGateway(), 1000);
    } catch (err) {
      console.error('Restart failed:', err);
    }
  }, [sessionKeys, agents, pollGateway]);

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
      // Real mode: send via gateway
      const key = sessionKeys[agentId];
      if (key) {
        fetch('/api/gateway/action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'send', sessionKey: key, message }),
        }).then(resp => resp.json()).then(data => {
          const response: ChatMessage = {
            id: `msg-${Date.now()}-agent`,
            agentId,
            role: 'agent',
            content: data.ok ? '✅ Message sent to session' : `❌ ${data.error}`,
            timestamp: Date.now(),
          };
          setChatMessages(prev => ({
            ...prev,
            [agentId]: [...(prev[agentId] || []), response],
          }));
        }).catch(() => {
          const response: ChatMessage = {
            id: `msg-${Date.now()}-agent`,
            agentId,
            role: 'agent',
            content: '❌ Failed to send message',
            timestamp: Date.now(),
          };
          setChatMessages(prev => ({
            ...prev,
            [agentId]: [...(prev[agentId] || []), response],
          }));
        });
      }
    }
  }, [demoMode, sessionKeys]);

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
