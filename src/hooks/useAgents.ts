// ============================================================================
// useAgents — Agent state management hook (demo + real data)
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
import type { GatewayStatus } from '@/lib/gateway-client';
import { behaviorToOfficeState } from '@/lib/gateway-client';
import {
  generateDemoAgentState,
  generateDemoEvent,
  generateDemoStats,
  BEHAVIOR_INFO,
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
  chatMessages: Record<string, ChatMessage[]>;
  sendChat: (agentId: string, message: string) => void;
  setBehavior: (agentId: string, behavior: AgentBehavior) => void;
  updateFromGateway: (status: GatewayStatus) => void;
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

export function useAgents(
  agentConfigs: AgentConfig[],
  connected: boolean,
): UseAgentsReturn {
  const demoMode = !connected;
  const [agentStates, setAgentStates] = useState<Record<string, AgentDashboardState>>({});
  const [activityFeed, setActivityFeed] = useState<ActivityEvent[]>([]);
  const [systemStats, setSystemStats] = useState<SystemStats>(() => generateDemoStats(agentConfigs));
  const [chatMessages, setChatMessages] = useState<Record<string, ChatMessage[]>>({});
  const demoTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const feedTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Initialize agent states
  useEffect(() => {
    const states: Record<string, AgentDashboardState> = {};
    for (const agent of agentConfigs) {
      states[agent.id] = generateDemoAgentState(agent.id);
    }
    setAgentStates(states);
  }, [agentConfigs]);

  // Demo mode: random behavior changes
  useEffect(() => {
    if (!demoMode) {
      if (demoTimerRef.current) clearInterval(demoTimerRef.current);
      if (feedTimerRef.current) clearInterval(feedTimerRef.current);
      return;
    }

    demoTimerRef.current = setInterval(() => {
      setAgentStates(prev => {
        const next = { ...prev };
        // Randomly change one agent's behavior
        const agentIdx = Math.floor(Math.random() * agentConfigs.length);
        const agent = agentConfigs[agentIdx];
        if (agent && next[agent.id]) {
          const newBehavior = DEMO_BEHAVIORS[Math.floor(Math.random() * DEMO_BEHAVIORS.length)];
          next[agent.id] = {
            ...next[agent.id],
            behavior: newBehavior,
            officeState: behaviorToOfficeState(newBehavior),
            lastActivity: Date.now(),
            totalTokens: next[agent.id].totalTokens + Math.floor(Math.random() * 500),
          };
        }
        return next;
      });

      // Update stats
      setSystemStats(prev => ({
        ...prev,
        activeAgents: Math.floor(Math.random() * agentConfigs.length) + 1,
        totalTokens: prev.totalTokens + Math.floor(Math.random() * 1000),
        uptime: prev.uptime + 5,
      }));
    }, 5000);

    feedTimerRef.current = setInterval(() => {
      const event = generateDemoEvent(agentConfigs);
      setActivityFeed(prev => [event, ...prev].slice(0, 50));
    }, 3000);

    return () => {
      if (demoTimerRef.current) clearInterval(demoTimerRef.current);
      if (feedTimerRef.current) clearInterval(feedTimerRef.current);
    };
  }, [demoMode, agentConfigs]);

  const updateFromGateway = useCallback((status: GatewayStatus) => {
    if (!status.online) return;
    setAgentStates(prev => {
      const next = { ...prev };
      for (const [agentId, behavior] of Object.entries(status.agentBehaviors)) {
        if (next[agentId]) {
          next[agentId] = {
            ...next[agentId],
            behavior,
            officeState: behaviorToOfficeState(behavior),
            lastActivity: Date.now(),
          };
        }
      }
      return next;
    });
  }, []);

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

    const agent = agentConfigs.find(a => a.id === agentId);
    if (agent) {
      const info = BEHAVIOR_INFO[behavior];
      const event: ActivityEvent = {
        id: `manual-${Date.now()}`,
        agentId,
        agentName: agent.name,
        agentEmoji: agent.emoji,
        type: 'state_change',
        message: `${info.emoji} ${info.label}`,
        timestamp: Date.now(),
      };
      setActivityFeed(prev => [event, ...prev].slice(0, 50));
    }
  }, [agentConfigs]);

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

    // Simulate agent response in demo mode
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
    }
  }, [demoMode]);

  return {
    agents: agentConfigs,
    agentStates,
    activityFeed,
    systemStats,
    demoMode,
    chatMessages,
    sendChat,
    setBehavior,
    updateFromGateway,
  };
}
