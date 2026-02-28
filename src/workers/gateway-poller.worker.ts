// ============================================================================
// Gateway Poller Web Worker
// Offloads gateway polling and SSE event handling to a background thread
// ============================================================================

import type { AgentBehavior, AgentState } from '../lib/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GatewaySessionInfo {
  id: string;
  key: string;
  name: string;
  emoji?: string;
  modelProvider?: string | null;
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  contextTokens: number;
  channel: string;
  kind?: 'direct' | 'group' | 'global' | 'unknown';
  behavior: string;
  isActive: boolean;
  isSubagent: boolean;
  lastActivity: number;
  updatedAt: number;
  aborted: boolean;
}

export interface GatewayApiResponse {
  ok: boolean;
  timestamp: number;
  count: number;
  sessions: GatewaySessionInfo[];
  error?: string;
}

export interface GatewayStatus {
  online: boolean;
  sessions: GatewaySessionInfo[];
  agentStates: Record<string, AgentState>;
  agentBehaviors: Record<string, AgentBehavior>;
  raw: GatewayApiResponse | null;
}

export interface SSEStateEvent {
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
}

// Worker message types
export type WorkerMessage =
  | { type: 'start'; config: { pollInterval: number; sseEnabled: boolean } }
  | { type: 'stop' }
  | { type: 'updateConfig'; config: { pollInterval: number; sseEnabled: boolean } }
  | { type: 'fetchNow' };

export type WorkerResponse =
  | { type: 'status'; status: GatewayStatus }
  | { type: 'sseEvent'; event: SSEStateEvent }
  | { type: 'error'; error: string; context: string }
  | { type: 'connected'; connected: boolean }
  | { type: 'polling'; active: boolean };

// ---------------------------------------------------------------------------
// State Mapping
// ---------------------------------------------------------------------------

function toBehavior(s: string): AgentBehavior {
  const aliasMap: Record<string, AgentBehavior> = {
    coding: 'working',
    tool: 'working',
    streaming: 'working',
    analyzing: 'thinking',
    resting: 'idle',
    paused: 'idle',
  };
  if (aliasMap[s]) return aliasMap[s];

  const valid: AgentBehavior[] = [
    'working', 'thinking', 'researching', 'meeting', 'deploying', 'debugging',
    'receiving_task', 'reporting', 'idle', 'coffee', 'snacking', 'toilet',
    'sleeping', 'napping', 'panicking', 'dead', 'overloaded', 'reviving',
  ];
  return (valid.includes(s as AgentBehavior) ? s : 'idle') as AgentBehavior;
}

function behaviorToOfficeState(behavior: AgentBehavior): AgentState {
  switch (behavior) {
    case 'working':
    case 'debugging':
      return 'working';
    case 'thinking':
      return 'thinking';
    case 'researching':
      return 'researching';
    case 'meeting':
      return 'meeting';
    case 'deploying':
      return 'deploying';
    case 'receiving_task':
      return 'receiving_task';
    case 'reporting':
      return 'reporting';
    case 'sleeping':
    case 'napping':
      return 'resting';
    case 'idle':
    case 'coffee':
    case 'snacking':
    case 'toilet':
      return 'idle';
    case 'panicking':
    case 'dead':
    case 'overloaded':
    case 'reviving':
      return 'waiting';
    default:
      return 'idle';
  }
}

// ---------------------------------------------------------------------------
// Gateway Polling
// ---------------------------------------------------------------------------

async function pollGateway(): Promise<GatewayStatus> {
  try {
    const resp = await fetch('/api/gateway', {
      signal: AbortSignal.timeout(10000),
    });

    if (!resp.ok) {
      return { online: false, sessions: [], agentStates: {}, agentBehaviors: {}, raw: null };
    }

    const data = (await resp.json()) as GatewayApiResponse;

    if (!data.ok) {
      return { online: false, sessions: [], agentStates: {}, agentBehaviors: {}, raw: data };
    }

    const agentStates: Record<string, AgentState> = {};
    const agentBehaviors: Record<string, AgentBehavior> = {};

    for (const sess of data.sessions) {
      const behavior = toBehavior(sess.behavior);
      agentBehaviors[sess.id] = behavior;
      agentStates[sess.id] = behaviorToOfficeState(behavior);
    }

    return { online: true, sessions: data.sessions, agentStates, agentBehaviors, raw: data };
  } catch {
    return { online: false, sessions: [], agentStates: {}, agentBehaviors: {}, raw: null };
  }
}

// ---------------------------------------------------------------------------
// Worker State
// ---------------------------------------------------------------------------

let pollInterval: number = 3000;
let sseEnabled: boolean = true;
let pollTimerId: ReturnType<typeof setInterval> | null = null;
let eventSource: EventSource | null = null;
let isRunning: boolean = false;

// ---------------------------------------------------------------------------
// Worker Implementation
// ---------------------------------------------------------------------------

function postMessage(msg: WorkerResponse): void {
  self.postMessage(msg);
}

function startPolling(): void {
  stopPolling();

  isRunning = true;
  postMessage({ type: 'polling', active: true });

  // Initial fetch
  void fetchAndEmit();

  // Setup interval
  pollTimerId = setInterval(() => {
    void fetchAndEmit();
  }, pollInterval);
}

function stopPolling(): void {
  isRunning = false;

  if (pollTimerId !== null) {
    clearInterval(pollTimerId);
    pollTimerId = null;
  }

  stopSSE();
  postMessage({ type: 'polling', active: false });
}

function startSSE(): void {
  if (!sseEnabled || eventSource) return;

  try {
    eventSource = new EventSource('/api/gateway/events');

    eventSource.addEventListener('state', (evt: MessageEvent) => {
      try {
        const data = JSON.parse(evt.data) as SSEStateEvent;
        postMessage({ type: 'sseEvent', event: data });
      } catch {
        // Ignore parse errors
      }
    });

    eventSource.onerror = () => {
      if (eventSource?.readyState === EventSource.CLOSED) {
        stopSSE();
        if (isRunning && sseEnabled) {
          setTimeout(() => {
            if (isRunning) startSSE();
          }, 5000);
        }
      }
    };
  } catch (err) {
    postMessage({
      type: 'error',
      error: String(err),
      context: 'SSE connection failed',
    });
  }
}

function stopSSE(): void {
  if (eventSource) {
    eventSource.close();
    eventSource = null;
  }
}

async function fetchAndEmit(): Promise<void> {
  try {
    const status = await pollGateway();
    postMessage({ type: 'status', status });
    postMessage({ type: 'connected', connected: status.online });

    if (status.online && sseEnabled && !eventSource) {
      startSSE();
    }
  } catch (err) {
    postMessage({
      type: 'error',
      error: String(err),
      context: 'Gateway poll failed',
    });
    postMessage({ type: 'connected', connected: false });
  }
}

// ---------------------------------------------------------------------------
// Message Handler
// ---------------------------------------------------------------------------

self.onmessage = (event: MessageEvent<WorkerMessage>) => {
  const msg = event.data;

  switch (msg.type) {
    case 'start':
      pollInterval = msg.config.pollInterval ?? 3000;
      sseEnabled = msg.config.sseEnabled ?? true;
      startPolling();
      break;

    case 'stop':
      stopPolling();
      break;

    case 'updateConfig':
      pollInterval = msg.config.pollInterval ?? pollInterval;
      sseEnabled = msg.config.sseEnabled ?? sseEnabled;
      if (isRunning) {
        startPolling();
      }
      break;

    case 'fetchNow':
      void fetchAndEmit();
      break;
  }
};

export type GatewayPollerWorker = typeof self;
