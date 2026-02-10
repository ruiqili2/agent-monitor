// ============================================================================
// Gateway Client — Polls /api/gateway for real OpenClaw session data
// ============================================================================

import type { AgentBehavior, AgentState, GatewayConfig } from './types';

// ---------------------------------------------------------------------------
// Types from /api/gateway
// ---------------------------------------------------------------------------

export interface GatewaySessionInfo {
  id: string;
  key: string;
  name: string;
  emoji?: string;
  model: string;
  totalTokens: number;
  contextTokens: number;
  channel: string;
  behavior: string;
  chatStatus?: string | null;
  agentStatus?: string | null;
  agentEventData?: Record<string, unknown> | null;
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

// ---------------------------------------------------------------------------
// State Mapping
// ---------------------------------------------------------------------------

/** Map behavior string → AgentBehavior */
function toBehavior(s: string): AgentBehavior {
  const valid: AgentBehavior[] = [
    'coding', 'thinking', 'researching', 'meeting', 'deploying', 'debugging',
    'receiving_task', 'reporting', 'idle', 'coffee', 'snacking', 'toilet',
    'sleeping', 'napping', 'panicking', 'dead', 'overloaded', 'reviving',
  ];
  return (valid.includes(s as AgentBehavior) ? s : 'idle') as AgentBehavior;
}

/** Map AgentBehavior → AgentState (for office engine) */
export function behaviorToOfficeState(behavior: AgentBehavior): AgentState {
  switch (behavior) {
    case 'coding':
    case 'debugging':
      return 'coding';
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
// HTTP Polling (to /api/gateway)
// ---------------------------------------------------------------------------

export async function pollGateway(_gw: GatewayConfig): Promise<GatewayStatus> {
  try {
    // Always poll our own Next.js API route
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
// Polling Manager
// ---------------------------------------------------------------------------

export class GatewayPoller {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private gateway: GatewayConfig;
  private callback: (status: GatewayStatus) => void;
  private intervalMs: number;

  constructor(
    gateway: GatewayConfig,
    callback: (status: GatewayStatus) => void,
    intervalMs = 3000,
  ) {
    this.gateway = gateway;
    this.callback = callback;
    this.intervalMs = intervalMs;
  }

  start(): void {
    this.stop();
    void this.poll();
    this.intervalId = setInterval(() => void this.poll(), this.intervalMs);
  }

  stop(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  updateGateway(gw: GatewayConfig): void {
    this.gateway = gw;
  }

  private async poll(): Promise<void> {
    const status = await pollGateway(this.gateway);
    this.callback(status);
  }
}
