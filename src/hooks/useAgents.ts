// ============================================================================
// useAgents - Agent state management hook
// Uses SSE for real-time updates, supports subagent metadata, and keeps both
// direct chat threads plus a global team chat timeline in sync.
// ============================================================================

'use client';

import { useState, useEffect, useCallback, useRef, type Dispatch, type SetStateAction } from 'react';
import type {
  AgentConfig,
  AgentBehavior,
  AgentDashboardState,
  ActivityEvent,
  OwnerConfig,
  ChatMessage,
  ChatScope,
  SystemStats,
} from '@/lib/types';
import { behaviorToOfficeState } from '@/lib/gateway-client';
import type { GatewaySessionInfo, GatewayApiResponse } from '@/lib/gateway-client';
import {
  BEHAVIOR_INFO,
  behaviorToOfficeState as stateMapperBtoO,
  generateDemoAgentState,
  generateDemoEvent,
  generateDemoStats,
  getToolSnapshot,
  isActiveBehavior,
  summarizeExecution,
} from '@/lib/state-mapper';

export interface UseAgentsReturn {
  agents: AgentConfig[];
  agentStates: Record<string, AgentDashboardState>;
  activityFeed: ActivityEvent[];
  systemStats: SystemStats;
  demoMode: boolean;
  connected: boolean;
  chatMessages: Record<string, ChatMessage[]>;
  globalChatMessages: ChatMessage[];
  sessionKeys: Record<string, string>;
  sendChat: (agentId: string, message: string) => void;
  sendGlobalChat: (message: string, sender?: Pick<OwnerConfig, 'name' | 'emoji'>) => Promise<void>;
  setBehavior: (agentId: string, behavior: AgentBehavior) => void;
  restartSession: (agentId: string) => Promise<void>;
  loadChatHistory: (agentId: string) => Promise<void>;
}

const MAX_ACTIVITY_EVENTS = 80;
const MAX_THREAD_MESSAGES = 80;
const MAX_GLOBAL_MESSAGES = 160;

const DEMO_BEHAVIORS: AgentBehavior[] = [
  'working', 'thinking', 'researching', 'meeting', 'deploying',
  'debugging', 'idle', 'coffee', 'sleeping', 'receiving_task',
  'reporting', 'snacking',
];

const DEMO_CHAT_RESPONSES = [
  "I'm working on it.",
  'Just finished analyzing the data.',
  'Need more context. Can you clarify?',
  'Done. Check the results.',
  'Running tests now...',
  'Found a bug, fixing it.',
  'Deployed successfully.',
  'Taking a quick break.',
  'On it. Give me a moment.',
  "Here's what I found...",
];

const AGENT_AVATARS: AgentConfig['avatar'][] = ['glasses', 'hoodie', 'suit', 'casual', 'robot', 'cat'];
const AGENT_COLORS = ['#4FC3F7', '#66BB6A', '#FFCA28', '#AB47BC', '#EF5350', '#FF9800'];
const AGENT_EMOJIS = ['⚡', '🔥', '🌟', '🎯', '🚀', '🧠'];

const DEMO_AGENTS: AgentConfig[] = [
  { id: 'demo-1', name: 'Atlas', emoji: '🔥', color: '#4FC3F7', avatar: 'glasses' },
  { id: 'demo-2', name: 'Nova', emoji: '✨', color: '#66BB6A', avatar: 'hoodie' },
  { id: 'demo-3', name: 'Spark', emoji: '⚡', color: '#FFCA28', avatar: 'robot' },
];

function createDisconnectedStats(): SystemStats {
  return {
    totalAgents: 0,
    mainAgents: 0,
    subAgents: 0,
    activeAgents: 0,
    totalTokens: 0,
    totalTasks: 0,
    completedTasks: 0,
    failedTasks: 0,
    totalBroadcasts: 0,
    activeThreads: 0,
    uptime: 0,
    connected: false,
  };
}

function normalizeSendPolicy(policy: GatewaySessionInfo['sendPolicy']): 'allow' | 'deny' | 'unknown' {
  if (policy === 'allow' || policy === 'deny') return policy;
  return 'unknown';
}

function appendBounded<T>(items: T[], next: T, max: number): T[] {
  return [...items, next].slice(-max);
}

function appendUniqueMessage(list: ChatMessage[], message: ChatMessage, max: number): ChatMessage[] {
  if (list.some((entry) => entry.id === message.id)) {
    return list;
  }
  return appendBounded(list, message, max);
}

function pushActivity(
  setActivityFeed: Dispatch<SetStateAction<ActivityEvent[]>>,
  event: ActivityEvent,
): void {
  setActivityFeed((prev) => [event, ...prev].slice(0, MAX_ACTIVITY_EVENTS));
}

function createChatMessage(input: {
  id: string;
  agentId: string;
  agentName: string;
  agentEmoji: string;
  role: ChatMessage['role'];
  content: string;
  scope: ChatScope;
  channel: ChatMessage['channel'];
  targetIds?: string[];
  isThinking?: boolean;
}): ChatMessage {
  return {
    ...input,
    timestamp: Date.now(),
  };
}

function buildSessionLog(sess: GatewaySessionInfo): string[] {
  const log = [
    `Model: ${sess.modelProvider ? `${sess.modelProvider}/` : ''}${sess.model}`,
    `Channel: ${sess.channel || 'default'}${sess.kind ? ` (${sess.kind})` : ''}`,
    `Tokens: ${sess.totalTokens.toLocaleString()} total (${(sess.inputTokens ?? 0).toLocaleString()} in / ${(sess.outputTokens ?? 0).toLocaleString()} out)`,
    sess.statusSummary ? `Status: ${sess.statusSummary}` : '',
    sess.currentToolName
      ? `Tool: ${sess.currentToolName}${sess.currentToolPhase ? ` (${sess.currentToolPhase})` : ''}`
      : '',
    sess.lastMessagePreview ? `Last message: ${sess.lastMessagePreview}` : '',
    sess.isSubagent
      ? `Role: Subagent${sess.parentSessionId ? ` of ${sess.parentSessionId}` : ''}`
      : `Role: Primary agent${sess.childSessionIds?.length ? ` with ${sess.childSessionIds.length} subagent${sess.childSessionIds.length === 1 ? '' : 's'}` : ''}`,
    sess.sendPolicy ? `Send policy: ${sess.sendPolicy}` : '',
    sess.reasoningLevel ? `Reasoning: ${sess.reasoningLevel}` : '',
    sess.thinkingLevel ? `Thinking: ${sess.thinkingLevel}` : '',
    sess.aborted ? 'Warning: Last run aborted' : '',
  ];
  return log.filter(Boolean);
}

function sessionToAgentConfig(sess: GatewaySessionInfo, index: number): AgentConfig {
  const isMain = !sess.isSubagent;
  return {
    id: sess.id,
    name: sess.name,
    emoji: sess.emoji ?? (isMain ? '⚡' : AGENT_EMOJIS[index % AGENT_EMOJIS.length]),
    color: isMain ? '#4FC3F7' : AGENT_COLORS[index % AGENT_COLORS.length],
    avatar: isMain ? 'glasses' : AGENT_AVATARS[index % AGENT_AVATARS.length],
    model: sess.model,
    modelProvider: sess.modelProvider ?? undefined,
    channel: sess.channel,
    sessionKey: sess.key,
    sessionKind: sess.kind ?? 'unknown',
    label: sess.label ?? null,
    displayName: sess.displayName ?? null,
    derivedTitle: sess.derivedTitle ?? null,
    lastMessagePreview: sess.lastMessagePreview ?? null,
    isSubagent: sess.isSubagent,
    parentId: sess.parentSessionId ?? null,
    parentSessionKey: sess.parentSessionKey ?? null,
    rootId: sess.rootSessionId ?? null,
    depth: sess.depth ?? 0,
    subagentIds: sess.childSessionIds ?? [],
    sendPolicy: normalizeSendPolicy(sess.sendPolicy),
    thinkingLevel: sess.thinkingLevel ?? null,
    verboseLevel: sess.verboseLevel ?? null,
    reasoningLevel: sess.reasoningLevel ?? null,
    elevatedLevel: sess.elevatedLevel ?? null,
    avatarUrl: sess.avatarUrl ?? null,
    identityTheme: sess.identityTheme ?? null,
  };
}

function sessionToDashboardState(sess: GatewaySessionInfo): AgentDashboardState {
  const behavior = (sess.behavior ?? 'idle') as AgentBehavior;
  const statusSummary = sess.statusSummary ?? summarizeExecution({
    behavior,
    agentStatus: sess.agentStatus ?? null,
    chatStatus: sess.chatStatus ?? null,
    agentEventData: sess.agentEventData ?? null,
    isSubagent: sess.isSubagent,
  });

  const currentTask = isActiveBehavior(behavior)
    ? {
        id: `live-${sess.id}`,
        title: statusSummary,
        status: 'active' as const,
        startedAt: sess.lastActivity,
      }
    : null;

  return {
    behavior,
    officeState: behaviorToOfficeState(behavior),
    currentTask,
    taskHistory: [],
    tokenUsage: [],
    inputTokens: sess.inputTokens ?? 0,
    outputTokens: sess.outputTokens ?? 0,
    totalTokens: sess.totalTokens,
    contextTokens: sess.contextTokens,
    maxContextTokens: sess.contextTokens,
    totalTasks: currentTask ? 1 : 0,
    lastActivity: sess.lastActivity,
    sessionLog: buildSessionLog(sess),
    streamType: sess.agentStatus ?? null,
    toolName: sess.currentToolName ?? null,
    toolPhase: sess.currentToolPhase ?? null,
    statusSummary,
    lastRunId: sess.lastRunId ?? null,
    lastMessagePreview: sess.lastMessagePreview ?? null,
    sendPolicy: normalizeSendPolicy(sess.sendPolicy),
    reasoningLevel: sess.reasoningLevel ?? null,
    thinkingLevel: sess.thinkingLevel ?? null,
    verboseLevel: sess.verboseLevel ?? null,
    elevatedLevel: sess.elevatedLevel ?? null,
    uptime: Math.max(0, Date.now() - (sess.updatedAt || Date.now())),
  };
}

function sortSessions(a: GatewaySessionInfo, b: GatewaySessionInfo): number {
  if (!!a.isSubagent !== !!b.isSubagent) {
    return Number(a.isSubagent) - Number(b.isSubagent);
  }
  if ((a.depth ?? 0) !== (b.depth ?? 0)) {
    return (a.depth ?? 0) - (b.depth ?? 0);
  }
  return a.name.localeCompare(b.name);
}

export function useAgents(forceDemoMode = false): UseAgentsReturn {
  const [connected, setConnected] = useState(false);
  const [demoMode, setDemoMode] = useState(forceDemoMode);
  const [agents, setAgents] = useState<AgentConfig[]>(forceDemoMode ? DEMO_AGENTS : []);
  const [agentStates, setAgentStates] = useState<Record<string, AgentDashboardState>>({});
  const [activityFeed, setActivityFeed] = useState<ActivityEvent[]>([]);
  const [systemStats, setSystemStats] = useState<SystemStats>(() => (
    forceDemoMode ? generateDemoStats(DEMO_AGENTS) : createDisconnectedStats()
  ));
  const [chatMessages, setChatMessages] = useState<Record<string, ChatMessage[]>>({});
  const [globalChatMessages, setGlobalChatMessages] = useState<ChatMessage[]>([]);
  const [sessionKeys, setSessionKeys] = useState<Record<string, string>>({});

  const eventSourceRef = useRef<EventSource | null>(null);
  const metadataTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const demoTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const feedTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevBehaviorsRef = useRef<Record<string, string>>({});
  const eventIdRef = useRef(0);
  const keyToIdRef = useRef<Record<string, string>>({});
  const agentMetaRef = useRef<Record<string, Pick<AgentConfig, 'name' | 'emoji'>>>({});
  const sessionKeyRef = useRef<Record<string, string>>({});
  const demoRef = useRef(forceDemoMode);

  useEffect(() => {
    sessionKeyRef.current = sessionKeys;
  }, [sessionKeys]);

  useEffect(() => {
    demoRef.current = demoMode;
  }, [demoMode]);

  useEffect(() => {
    const next: Record<string, Pick<AgentConfig, 'name' | 'emoji'>> = {};
    for (const agent of agents) {
      next[agent.id] = { name: agent.name, emoji: agent.emoji };
    }
    agentMetaRef.current = next;
  }, [agents]);

  const addGlobalMessage = useCallback((message: ChatMessage) => {
    setGlobalChatMessages((prev) => appendUniqueMessage(prev, message, MAX_GLOBAL_MESSAGES));
  }, []);

  const addThreadMessage = useCallback((agentId: string, message: ChatMessage) => {
    setChatMessages((prev) => ({
      ...prev,
      [agentId]: appendUniqueMessage(prev[agentId] ?? [], message, MAX_THREAD_MESSAGES),
    }));
  }, []);

  const addThreadMessages = useCallback((agentId: string, messages: ChatMessage[]) => {
    setChatMessages((prev) => {
      const existing = prev[agentId] ?? [];
      let merged = existing;
      for (const message of messages) {
        merged = appendUniqueMessage(merged, message, MAX_THREAD_MESSAGES);
      }
      return {
        ...prev,
        [agentId]: merged,
      };
    });
  }, []);

  const fetchSessions = useCallback(async (): Promise<boolean> => {
    if (forceDemoMode) return false;

    try {
      const resp = await fetch('/api/gateway', { signal: AbortSignal.timeout(10000) });
      if (!resp.ok) throw new Error('API error');
      const data = (await resp.json()) as GatewayApiResponse;

      if (!data.ok || !data.sessions?.length) {
        setConnected(false);
        setDemoMode(false);
        setAgents([]);
        setAgentStates({});
        setSessionKeys({});
        keyToIdRef.current = {};
        setSystemStats((prev) => ({
          ...createDisconnectedStats(),
          totalBroadcasts: prev.totalBroadcasts ?? 0,
        }));
        return false;
      }

      const sortedSessions = [...data.sessions].sort(sortSessions);

      setConnected(true);
      setDemoMode(false);

      const newAgents = sortedSessions.map((sess, i) => sessionToAgentConfig(sess, i));
      setAgents(newAgents);

      const newKeys: Record<string, string> = {};
      const newKeyToId: Record<string, string> = {};
      for (const sess of sortedSessions) {
        newKeys[sess.id] = sess.key;
        newKeyToId[sess.key] = sess.id;
      }
      setSessionKeys(newKeys);
      keyToIdRef.current = newKeyToId;

      const newStates: Record<string, AgentDashboardState> = {};
      for (const sess of sortedSessions) {
        newStates[sess.id] = sessionToDashboardState(sess);
      }
      setAgentStates(newStates);

      for (const sess of sortedSessions) {
        const prevBehavior = prevBehaviorsRef.current[sess.id];
        if (prevBehavior && prevBehavior !== sess.behavior) {
          const info = BEHAVIOR_INFO[(sess.behavior ?? 'idle') as AgentBehavior];
          const agent = newAgents.find((entry) => entry.id === sess.id);
          if (agent && info) {
            pushActivity(setActivityFeed, {
              id: `gw-${Date.now()}-${++eventIdRef.current}-${sess.id}`,
              agentId: sess.id,
              agentName: agent.name,
              agentEmoji: agent.emoji,
              type: 'state_change',
              message: `${info.emoji} ${info.label}`,
              timestamp: Date.now(),
            });
          }
        }
        prevBehaviorsRef.current[sess.id] = sess.behavior;
      }

      setSystemStats({
        totalAgents: sortedSessions.length,
        mainAgents: sortedSessions.filter((s) => !s.isSubagent).length,
        subAgents: sortedSessions.filter((s) => s.isSubagent).length,
        activeAgents: sortedSessions.filter((s) => s.isActive).length,
        totalTokens: sortedSessions.reduce((sum, s) => sum + s.totalTokens, 0),
        totalTasks: sortedSessions.filter((s) => isActiveBehavior((s.behavior ?? 'idle') as AgentBehavior)).length,
        completedTasks: 0,
        failedTasks: sortedSessions.filter((s) => s.aborted).length,
        totalBroadcasts: 0,
        activeThreads: sortedSessions.filter((s) => (s.childSessionIds?.length ?? 0) > 0).length,
        uptime: 0,
        connected: true,
      });

      return true;
    } catch {
      setConnected(false);
      setDemoMode(false);
      setSystemStats((prev) => ({
        ...prev,
        connected: false,
        activeAgents: 0,
      }));
      return false;
    }
  }, [forceDemoMode]);

  useEffect(() => {
    if (forceDemoMode) {
      setDemoMode(true);
      return;
    }

    let cancelled = false;
    let es: EventSource | null = null;

    const connectEventStream = () => {
      if (cancelled || eventSourceRef.current) return;

      es = new EventSource('/api/gateway/events');
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
            toolName?: string | null;
            toolPhase?: string | null;
            statusSummary?: string;
            lastRunId: string | null;
          };

          const sessionId = keyToIdRef.current[data.sessionKey];
          if (!sessionId) return;

          const behavior = (data.behavior ?? 'idle') as AgentBehavior;
          const tool = data.toolName || data.toolPhase
            ? { toolName: data.toolName ?? null, toolPhase: data.toolPhase ?? null }
            : getToolSnapshot(data.agentEventData);
          const statusSummary = data.statusSummary ?? summarizeExecution({
            behavior,
            agentStatus: data.agentStatus,
            chatStatus: data.chatStatus,
            agentEventData: data.agentEventData,
            isSubagent: data.sessionKey.includes('subagent'),
          });

          let toolEvent: ActivityEvent | null = null;
          let errorEvent: ActivityEvent | null = null;
          let messageEvent: ActivityEvent | null = null;

          setAgentStates((prev) => {
            const existing = prev[sessionId];
            if (!existing) return prev;

            if (tool.toolName && tool.toolName !== existing.toolName) {
              const meta = agentMetaRef.current[sessionId];
              toolEvent = {
                id: `tool-${Date.now()}-${++eventIdRef.current}-${sessionId}`,
                agentId: sessionId,
                agentName: meta?.name ?? data.agentName ?? sessionId,
                agentEmoji: meta?.emoji ?? data.emoji ?? '🤖',
                type: 'tool_call',
                message: `${tool.toolName}${tool.toolPhase ? ` (${tool.toolPhase})` : ''}`,
                timestamp: Date.now(),
              };
            }

            if (data.agentStatus === 'error') {
              const meta = agentMetaRef.current[sessionId];
              errorEvent = {
                id: `err-${Date.now()}-${++eventIdRef.current}-${sessionId}`,
                agentId: sessionId,
                agentName: meta?.name ?? data.agentName ?? sessionId,
                agentEmoji: meta?.emoji ?? data.emoji ?? '🤖',
                type: 'error',
                message: statusSummary,
                timestamp: Date.now(),
              };
            } else if (data.agentStatus === 'assistant' && data.chatStatus === 'final') {
              const meta = agentMetaRef.current[sessionId];
              messageEvent = {
                id: `msg-${Date.now()}-${++eventIdRef.current}-${sessionId}`,
                agentId: sessionId,
                agentName: meta?.name ?? data.agentName ?? sessionId,
                agentEmoji: meta?.emoji ?? data.emoji ?? '🤖',
                type: 'message',
                message: statusSummary,
                timestamp: Date.now(),
              };
            }

            return {
              ...prev,
              [sessionId]: {
                ...existing,
                behavior,
                officeState: behaviorToOfficeState(behavior),
                lastActivity: Date.now(),
                streamType: data.agentStatus,
                toolName: tool.toolName,
                toolPhase: tool.toolPhase,
                statusSummary,
                lastRunId: data.lastRunId ?? existing.lastRunId ?? null,
                currentTask: isActiveBehavior(behavior)
                  ? {
                      id: existing.currentTask?.id ?? `live-${sessionId}`,
                      title: statusSummary,
                      status: 'active',
                      startedAt: existing.currentTask?.startedAt ?? Date.now(),
                    }
                  : null,
                totalTasks: isActiveBehavior(behavior) ? Math.max(existing.totalTasks, 1) : existing.totalTasks,
                sessionLog: [
                  ...existing.sessionLog.filter((line) => !line.startsWith('Status: ') && !line.startsWith('Tool: ')),
                  `Status: ${statusSummary}`,
                  ...(tool.toolName
                    ? [`Tool: ${tool.toolName}${tool.toolPhase ? ` (${tool.toolPhase})` : ''}`]
                    : []),
                ].slice(-10),
              },
            };
          });

          const prevBehavior = prevBehaviorsRef.current[sessionId];
          if (prevBehavior && prevBehavior !== behavior) {
            const info = BEHAVIOR_INFO[behavior];
            const meta = agentMetaRef.current[sessionId];
            if (info && meta) {
              pushActivity(setActivityFeed, {
                id: `sse-${Date.now()}-${++eventIdRef.current}-${sessionId}`,
                agentId: sessionId,
                agentName: meta.name,
                agentEmoji: meta.emoji,
                type: 'state_change',
                message: `${info.emoji} ${info.label}`,
                timestamp: Date.now(),
              });
            }
          }
          prevBehaviorsRef.current[sessionId] = behavior;

          if (toolEvent) pushActivity(setActivityFeed, toolEvent);
          if (errorEvent) pushActivity(setActivityFeed, errorEvent);
          if (messageEvent) pushActivity(setActivityFeed, messageEvent);
        } catch {
          // Ignore malformed events
        }
      });

      es.onerror = () => {
        if (es?.readyState === EventSource.CLOSED) {
          es.close();
          if (eventSourceRef.current === es) {
            eventSourceRef.current = null;
          }
          es = null;
        }
      };
    };

    async function syncGateway() {
      const ok = await fetchSessions();
      if (cancelled) return;
      if (ok) {
        connectEventStream();
      }
    }

    void syncGateway();
    metadataTimerRef.current = setInterval(() => {
      void syncGateway();
    }, 5_000);

    // Named handler function for proper cleanup (fixes memory leak)
    const handleStateEvent = (evt: MessageEvent) => {
      if (cancelled) return;
      try {
        const data = JSON.parse(evt.data) as {
          sessionKey: string;
          chatStatus: string | null;
          agentStatus: string | null;
          agentEventData: Record<string, unknown> | null;
          behavior: string;
          agentName: string | null;
          emoji: string | null;
          toolName?: string | null;
          toolPhase?: string | null;
          statusSummary?: string;
          lastRunId: string | null;
        };

        const sessionId = keyToIdRef.current[data.sessionKey];
        if (!sessionId) return;

        const behavior = (data.behavior ?? 'idle') as AgentBehavior;
        const tool = data.toolName || data.toolPhase
          ? { toolName: data.toolName ?? null, toolPhase: data.toolPhase ?? null }
          : getToolSnapshot(data.agentEventData);
        const statusSummary = data.statusSummary ?? summarizeExecution({
          behavior,
          agentStatus: data.agentStatus,
          chatStatus: data.chatStatus,
          agentEventData: data.agentEventData,
          isSubagent: data.sessionKey.includes('subagent'),
        });

        let toolEvent: ActivityEvent | null = null;
        let errorEvent: ActivityEvent | null = null;
        let messageEvent: ActivityEvent | null = null;

        setAgentStates((prev) => {
          const existing = prev[sessionId];
          if (!existing) return prev;

          if (tool.toolName && tool.toolName !== existing.toolName) {
            const meta = agentMetaRef.current[sessionId];
            toolEvent = {
              id: `tool-${Date.now()}-${++eventIdRef.current}-${sessionId}`,
              agentId: sessionId,
              agentName: meta?.name ?? data.agentName ?? sessionId,
              agentEmoji: meta?.emoji ?? data.emoji ?? '🤖',
              type: 'tool_call',
              message: `${tool.toolName}${tool.toolPhase ? ` (${tool.toolPhase})` : ''}`,
              timestamp: Date.now(),
            };
          }

          if (data.agentStatus === 'error') {
            const meta = agentMetaRef.current[sessionId];
            errorEvent = {
              id: `err-${Date.now()}-${++eventIdRef.current}-${sessionId}`,
              agentId: sessionId,
              agentName: meta?.name ?? data.agentName ?? sessionId,
              agentEmoji: meta?.emoji ?? data.emoji ?? '🤖',
              type: 'error',
              message: statusSummary,
              timestamp: Date.now(),
            };
          } else if (data.agentStatus === 'assistant' && data.chatStatus === 'final') {
            const meta = agentMetaRef.current[sessionId];
            messageEvent = {
              id: `msg-${Date.now()}-${++eventIdRef.current}-${sessionId}`,
              agentId: sessionId,
              agentName: meta?.name ?? data.agentName ?? sessionId,
              agentEmoji: meta?.emoji ?? data.emoji ?? '🤖',
              type: 'message',
              message: statusSummary,
              timestamp: Date.now(),
            };
          }

          return {
            ...prev,
            [sessionId]: {
              ...existing,
              behavior,
              officeState: behaviorToOfficeState(behavior),
              lastActivity: Date.now(),
              streamType: data.agentStatus,
              toolName: tool.toolName,
              toolPhase: tool.toolPhase,
              statusSummary,
              lastRunId: data.lastRunId ?? existing.lastRunId ?? null,
              currentTask: isActiveBehavior(behavior)
                ? {
                    id: existing.currentTask?.id ?? `live-${sessionId}`,
                    title: statusSummary,
                    status: 'active',
                    startedAt: existing.currentTask?.startedAt ?? Date.now(),
                  }
                : null,
              totalTasks: isActiveBehavior(behavior) ? Math.max(existing.totalTasks, 1) : existing.totalTasks,
              sessionLog: [
                ...existing.sessionLog.filter((line) => !line.startsWith('Status: ') && !line.startsWith('Tool: ')),
                `Status: ${statusSummary}`,
                ...(tool.toolName
                  ? [`Tool: ${tool.toolName}${tool.toolPhase ? ` (${tool.toolPhase})` : ''}`]
                  : []),
              ].slice(-10),
            },
          };
        });

        const prevBehavior = prevBehaviorsRef.current[sessionId];
        if (prevBehavior && prevBehavior !== behavior) {
          const info = BEHAVIOR_INFO[behavior];
          const meta = agentMetaRef.current[sessionId];
          if (info && meta) {
            pushActivity(setActivityFeed, {
              id: `sse-${Date.now()}-${++eventIdRef.current}-${sessionId}`,
              agentId: sessionId,
              agentName: meta.name,
              agentEmoji: meta.emoji,
              type: 'state_change',
              message: `${info.emoji} ${info.label}`,
              timestamp: Date.now(),
            });
          }
        }
        prevBehaviorsRef.current[sessionId] = behavior;

        if (toolEvent) pushActivity(setActivityFeed, toolEvent);
        if (errorEvent) pushActivity(setActivityFeed, errorEvent);
        if (messageEvent) pushActivity(setActivityFeed, messageEvent);
      } catch {
        // Ignore malformed events
      }
    };

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

  useEffect(() => {
    if (!demoMode) {
      if (demoTimerRef.current) clearInterval(demoTimerRef.current);
      if (feedTimerRef.current) clearInterval(feedTimerRef.current);
      return;
    }

    const states: Record<string, AgentDashboardState> = {};
    for (const agent of DEMO_AGENTS) {
      states[agent.id] = generateDemoAgentState(agent.id);
      states[agent.id].statusSummary = 'Demo agent waiting for work';
    }
    setAgentStates(states);
    setAgents(DEMO_AGENTS);
    setSessionKeys({});
    keyToIdRef.current = {};

    demoTimerRef.current = setInterval(() => {
      setAgentStates((prev) => {
        const next = { ...prev };
        const agentIdx = Math.floor(Math.random() * DEMO_AGENTS.length);
        const agent = DEMO_AGENTS[agentIdx];
        if (agent && next[agent.id]) {
          const newBehavior = DEMO_BEHAVIORS[Math.floor(Math.random() * DEMO_BEHAVIORS.length)];
          next[agent.id] = {
            ...next[agent.id],
            behavior: newBehavior,
            officeState: stateMapperBtoO(newBehavior),
            statusSummary: summarizeExecution({ behavior: newBehavior }),
            lastActivity: Date.now(),
            totalTokens: next[agent.id].totalTokens + Math.floor(Math.random() * 500),
          };
        }
        return next;
      });
    }, 5000);

    feedTimerRef.current = setInterval(() => {
      const event = generateDemoEvent(DEMO_AGENTS);
      pushActivity(setActivityFeed, event);
    }, 3000);

    return () => {
      if (demoTimerRef.current) clearInterval(demoTimerRef.current);
      if (feedTimerRef.current) clearInterval(feedTimerRef.current);
    };
  }, [demoMode]);

  useEffect(() => {
    setSystemStats((prev) => ({
      ...prev,
      mainAgents: agents.filter((agent) => !agent.isSubagent).length || prev.mainAgents,
      subAgents: agents.filter((agent) => !!agent.isSubagent).length,
      totalBroadcasts: globalChatMessages.filter((m) => m.scope === 'broadcast' && m.role === 'user').length,
      activeThreads: agents.filter((agent) => (agent.subagentIds?.length ?? 0) > 0).length,
    }));
  }, [agents, globalChatMessages]);

  const setBehavior = useCallback((agentId: string, behavior: AgentBehavior) => {
    setAgentStates((prev) => {
      if (!prev[agentId]) return prev;
      return {
        ...prev,
        [agentId]: {
          ...prev[agentId],
          behavior,
          officeState: behaviorToOfficeState(behavior),
          statusSummary: summarizeExecution({ behavior }),
          lastActivity: Date.now(),
        },
      };
    });
  }, []);

  const restartSession = useCallback(async (agentId: string) => {
    const key = sessionKeyRef.current[agentId];
    if (!key) return;

    try {
      const resp = await fetch('/api/gateway/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset', sessionKey: key }),
      });
      const data = await resp.json();

      const agent = agentMetaRef.current[agentId];
      if (agent) {
        pushActivity(setActivityFeed, {
          id: `restart-${Date.now()}-${++eventIdRef.current}`,
          agentId,
          agentName: agent.name,
          agentEmoji: agent.emoji,
          type: 'system',
          message: data.ok ? 'Session reset' : `Reset failed: ${data.error}`,
          timestamp: Date.now(),
        });
      }

      setTimeout(() => {
        void fetchSessions();
      }, 1000);
    } catch (err) {
      console.error('Restart failed:', err);
    }
  }, [fetchSessions]);

  const pollForReply = useCallback(async (
    agentId: string,
    key: string,
    scope: ChatScope = 'direct',
  ) => {
    const meta = agentMetaRef.current[agentId];
    if (!meta) return;

    const maxAttempts = 90;
    const thinkingId = `msg-${Date.now()}-thinking-${agentId}`;

    addThreadMessage(agentId, createChatMessage({
      id: thinkingId,
      agentId,
      agentName: meta.name,
      agentEmoji: meta.emoji,
      role: 'agent',
      content: 'Thinking...',
      scope,
      channel: 'agent',
      isThinking: true,
    }));

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      if (attempt % 3 !== 0) continue;

      try {
        const resp = await fetch('/api/gateway/action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'history', sessionKey: key, limit: 10 }),
        });
        const data = await resp.json();

        if (!data.ok || !data.result?.messages) continue;

        const messages = data.result.messages as Array<{
          role: string;
          content?: string | Array<{ type: string; text?: string }>;
        }>;

        const lastMsg = messages[messages.length - 1];
        if (!lastMsg || lastMsg.role !== 'assistant') continue;

        let content = '';
        if (typeof lastMsg.content === 'string') {
          content = lastMsg.content;
        } else if (Array.isArray(lastMsg.content)) {
          content = lastMsg.content
            .filter((block) => block.type === 'text' && block.text)
            .map((block) => block.text)
            .join('\n');
        }

        if (!content) continue;

        const displayContent = content.length > 2000
          ? `${content.slice(0, 2000)}\n\n...(truncated)`
          : content;

        const reply = createChatMessage({
          id: `msg-${Date.now()}-agent-${agentId}`,
          agentId,
          agentName: meta.name,
          agentEmoji: meta.emoji,
          role: 'agent',
          content: displayContent,
          scope,
          channel: 'agent',
        });

        setChatMessages((prev) => ({
          ...prev,
          [agentId]: (prev[agentId] ?? []).map((message) =>
            message.id === thinkingId ? reply : message,
          ),
        }));
        addGlobalMessage({ ...reply, channel: 'global' });
        return;
      } catch {
        // Ignore poll errors, keep trying
      }
    }

    setChatMessages((prev) => ({
      ...prev,
      [agentId]: (prev[agentId] ?? []).map((message) =>
        message.id === thinkingId
          ? { ...message, content: 'No reply yet (agent may still be processing)', isThinking: false, timestamp: Date.now() }
          : message,
      ),
    }));
  }, [addGlobalMessage, addThreadMessage]);

  const loadChatHistory = useCallback(async (agentId: string) => {
    const key = sessionKeyRef.current[agentId];
    const meta = agentMetaRef.current[agentId];
    if (!key || !meta) return;

    try {
      const resp = await fetch('/api/gateway/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'history', sessionKey: key, limit: 50 }),
      });
      const data = await resp.json();

      if (!data.ok || !data.result?.messages) return;

      const rawMessages = data.result.messages as Array<{
        role: string;
        content?: string | Array<{ type: string; text?: string }>;
      }>;

      const converted: ChatMessage[] = [];

      for (const msg of rawMessages) {
        if (msg.role === 'system') continue;

        const role: ChatMessage['role'] = msg.role === 'assistant' ? 'agent' : 'user';
        let content = '';
        if (typeof msg.content === 'string') {
          content = msg.content;
        } else if (Array.isArray(msg.content)) {
          content = msg.content
            .filter((block) => block.type === 'text' && block.text)
            .map((block) => block.text)
            .join('\n');
        }

        if (!content) continue;

        const displayContent = content.length > 2000
          ? `${content.slice(0, 2000)}\n\n...(truncated)`
          : content;

        converted.push({
          id: `history-${agentId}-${converted.length}`,
          agentId,
          agentName: meta.name,
          agentEmoji: meta.emoji,
          role,
          content: displayContent,
          timestamp: Date.now() - (rawMessages.length - converted.length) * 1000,
          scope: 'history',
          channel: 'agent',
        });
      }

      addThreadMessages(agentId, converted);
    } catch {
      // Silently fail
    }
  }, [addThreadMessages]);

  const sendChat = useCallback((agentId: string, message: string) => {
    const meta = agentMetaRef.current[agentId];
    if (!meta) return;

    const outgoing = createChatMessage({
      id: `msg-${Date.now()}-user-${agentId}`,
      agentId,
      agentName: meta.name,
      agentEmoji: meta.emoji,
      role: 'user',
      content: message,
      scope: 'direct',
      channel: 'agent',
    });

    addThreadMessage(agentId, outgoing);
    addGlobalMessage({ ...outgoing, channel: 'global' });

    if (demoRef.current) {
      setTimeout(() => {
        const reply = createChatMessage({
          id: `msg-${Date.now()}-agent-${agentId}`,
          agentId,
          agentName: meta.name,
          agentEmoji: meta.emoji,
          role: 'agent',
          content: DEMO_CHAT_RESPONSES[Math.floor(Math.random() * DEMO_CHAT_RESPONSES.length)],
          scope: 'direct',
          channel: 'agent',
        });
        addThreadMessage(agentId, reply);
        addGlobalMessage({ ...reply, channel: 'global' });
      }, 1000 + Math.random() * 2000);
      return;
    }

    const key = sessionKeyRef.current[agentId];
    if (!key) return;

    fetch('/api/gateway/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'send', sessionKey: key, message }),
    })
      .then((resp) => resp.json())
      .then((data) => {
        if (data.ok) {
          return pollForReply(agentId, key, 'direct');
        }

        const errorReply = createChatMessage({
          id: `msg-${Date.now()}-error-${agentId}`,
          agentId,
          agentName: meta.name,
          agentEmoji: meta.emoji,
          role: 'system',
          content: `Send failed: ${data.error}`,
          scope: 'direct',
          channel: 'agent',
        });
        addThreadMessage(agentId, errorReply);
        addGlobalMessage({ ...errorReply, channel: 'global' });
      })
      .catch(() => {
        const errorReply = createChatMessage({
          id: `msg-${Date.now()}-error-${agentId}`,
          agentId,
          agentName: meta.name,
          agentEmoji: meta.emoji,
          role: 'system',
          content: 'Failed to send message',
          scope: 'direct',
          channel: 'agent',
        });
        addThreadMessage(agentId, errorReply);
        addGlobalMessage({ ...errorReply, channel: 'global' });
      });
  }, [addGlobalMessage, addThreadMessage, pollForReply]);

  const sendGlobalChat = useCallback(async (
    message: string,
    sender?: Pick<OwnerConfig, 'name' | 'emoji'>,
  ) => {
    const targets = agents.filter((agent) => !agent.isSubagent);
    if (targets.length === 0) return;
    const speakerName = sender?.name?.trim() || 'Boss';
    const speakerEmoji = sender?.emoji?.trim() || 'B';

    const broadcastId = `broadcast-${Date.now()}`;
    addGlobalMessage(createChatMessage({
      id: broadcastId,
      agentId: 'global',
      agentName: speakerName,
      agentEmoji: speakerEmoji,
      role: 'user',
      content: message,
      scope: 'broadcast',
      channel: 'global',
      targetIds: targets.map((agent) => agent.id),
    }));

    for (const target of targets) {
      addThreadMessage(target.id, createChatMessage({
        id: `${broadcastId}-${target.id}`,
        agentId: target.id,
        agentName: target.name,
        agentEmoji: target.emoji,
        role: 'user',
        content: `[Broadcast] ${message}`,
        scope: 'broadcast',
        channel: 'agent',
        targetIds: targets.map((agent) => agent.id),
      }));
    }

    if (demoRef.current) {
      for (const target of targets) {
        setTimeout(() => {
          const reply = createChatMessage({
            id: `demo-broadcast-${Date.now()}-${target.id}`,
            agentId: target.id,
            agentName: target.name,
            agentEmoji: target.emoji,
            role: 'agent',
            content: DEMO_CHAT_RESPONSES[Math.floor(Math.random() * DEMO_CHAT_RESPONSES.length)],
            scope: 'broadcast',
            channel: 'agent',
          });
          addThreadMessage(target.id, reply);
          addGlobalMessage({ ...reply, channel: 'global' });
        }, 900 + Math.random() * 1800);
      }
      return;
    }

    const targetEntries = targets
      .map((target) => ({ target, key: sessionKeyRef.current[target.id] }))
      .filter((entry): entry is { target: AgentConfig; key: string } => typeof entry.key === 'string' && entry.key.length > 0);
    const targetKeys = targetEntries.map((entry) => entry.key);

    if (targetKeys.length === 0) return;

    try {
      const resp = await fetch('/api/gateway/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'broadcast', sessionKeys: targetKeys, message }),
      });
      const data = await resp.json();

      addGlobalMessage(createChatMessage({
        id: `broadcast-status-${Date.now()}`,
        agentId: 'system',
        agentName: 'System',
        agentEmoji: '🖥️',
        role: 'system',
        content: data.failed?.length
          ? `Broadcast delivered to ${data.delivered?.length ?? 0}/${targetKeys.length} sessions`
          : `Broadcast delivered to ${targetKeys.length} sessions`,
        scope: 'broadcast',
        channel: 'global',
      }));

      const deliveredKeys = new Set<string>((data.delivered ?? []).map((item: { sessionKey: string }) => item.sessionKey));
      await Promise.all(
        targetEntries
          .filter((entry) => deliveredKeys.has(entry.key))
          .map((entry) => pollForReply(entry.target.id, entry.key, 'broadcast')),
      );
    } catch {
      addGlobalMessage(createChatMessage({
        id: `broadcast-error-${Date.now()}`,
        agentId: 'system',
        agentName: 'System',
        agentEmoji: '🖥️',
        role: 'system',
        content: 'Broadcast failed',
        scope: 'broadcast',
        channel: 'global',
      }));
    }
  }, [addGlobalMessage, addThreadMessage, agents, pollForReply]);

  return {
    agents,
    agentStates,
    activityFeed,
    systemStats,
    demoMode,
    connected,
    chatMessages,
    globalChatMessages,
    sessionKeys,
    sendChat,
    sendGlobalChat,
    setBehavior,
    restartSession,
    loadChatHistory,
  };
}
