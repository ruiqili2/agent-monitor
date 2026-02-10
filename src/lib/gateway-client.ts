// ============================================================================
// OpenClaw Gateway WebSocket Client
// Connects to the OpenClaw Gateway to receive real-time agent state updates
// ============================================================================

import type { AgentBehavior, AgentState, GatewayConfig } from './types';

// ---------------------------------------------------------------------------
// Gateway Response Types
// ---------------------------------------------------------------------------

interface GatewayHealth {
  status?: string;
  uptime?: number;
  sessions?: GatewaySession[];
  [key: string]: unknown;
}

interface GatewaySession {
  id?: string;
  agent?: string;
  state?: string;
  busy?: boolean;
  [key: string]: unknown;
}

export interface GatewayStatus {
  online: boolean;
  agentStates: Record<string, AgentState>;
  agentBehaviors: Record<string, AgentBehavior>;
  raw: unknown;
}

// ---------------------------------------------------------------------------
// State Mapping
// ---------------------------------------------------------------------------

/** Map gateway session state → AgentBehavior */
function mapToBehavior(session: GatewaySession): AgentBehavior {
  const state = (session.state ?? '').toLowerCase();
  const busy = session.busy ?? false;

  if (state.includes('error') || state.includes('fail')) return 'panicking';
  if (state.includes('crash')) return 'dead';
  if (state.includes('restart') || state.includes('reviv')) return 'reviving';
  if (state.includes('process') || state.includes('run') || state.includes('coding')) return 'coding';
  if (state.includes('think') || state.includes('reason')) return 'thinking';
  if (state.includes('search') || state.includes('research') || state.includes('fetch') || state.includes('brows')) return 'researching';
  if (state.includes('deploy') || state.includes('exec')) return 'deploying';
  if (state.includes('debug')) return 'debugging';
  if (state.includes('meet') || state.includes('subagent')) return 'meeting';
  if (state.includes('sleep') || state.includes('rest')) return 'sleeping';
  if (state.includes('wait') || state.includes('idle')) return 'idle';

  return busy ? 'coding' : 'idle';
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
// HTTP Polling
// ---------------------------------------------------------------------------

export async function pollGateway(gw: GatewayConfig): Promise<GatewayStatus> {
  const baseUrl = gw.url.replace(/\/+$/, '');
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (gw.token) headers['Authorization'] = `Bearer ${gw.token}`;

  const endpoints = [
    `${baseUrl}/health`,
    `${baseUrl}/api/health`,
    `${baseUrl}/status`,
  ];

  for (const url of endpoints) {
    try {
      const resp = await fetch(url, { headers, signal: AbortSignal.timeout(5000) });
      if (!resp.ok) continue;
      const data = (await resp.json()) as GatewayHealth;
      const agentStates: Record<string, AgentState> = {};
      const agentBehaviors: Record<string, AgentBehavior> = {};

      if (Array.isArray(data.sessions)) {
        for (const sess of data.sessions) {
          const agentId = sess.agent ?? sess.id ?? 'main';
          const behavior = mapToBehavior(sess);
          agentBehaviors[agentId] = behavior;
          agentStates[agentId] = behaviorToOfficeState(behavior);
        }
      }

      return { online: true, agentStates, agentBehaviors, raw: data };
    } catch {
      continue;
    }
  }

  return { online: false, agentStates: {}, agentBehaviors: {}, raw: null };
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
