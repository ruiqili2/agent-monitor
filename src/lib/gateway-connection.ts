// ============================================================================
// Gateway Connection — Singleton persistent WebSocket to OpenClaw gateway
//
// Maintains a single long-lived WebSocket connection that:
// 1. Subscribes to ChatEvent / AgentEvent for real-time agent execution state
// 2. Provides request() for RPC calls (sessions.list, chat.send, etc.)
// 3. Auto-reconnects with exponential backoff on disconnect
//
// Used by API routes instead of opening a new WebSocket per HTTP request.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';
import WebSocket from 'ws';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Agent identity fetched from agents.list RPC. */
export interface AgentInfo {
  id: string;
  name?: string;
  identity?: {
    name?: string;
    theme?: string;
    emoji?: string;
    avatar?: string;
    avatarUrl?: string;
  };
}

/** Return shape of agents.list RPC (not re-exported from plugin-sdk). */
type AgentsListResult = {
  defaultId: string;
  mainKey: string;
  scope: 'per-sender' | 'global';
  agents: AgentInfo[];
};

/** Per-session live state derived from gateway events. */
export interface SessionLiveState {
  sessionKey: string;
  /** The agent that owns this session (resolved from session key). */
  agent: AgentInfo | null;
  /** Latest ChatEvent.state — raw, as received from gateway. */
  chatStatus: 'delta' | 'final' | 'aborted' | 'error' | null;
  /** Latest AgentEvent.stream — raw, as received from gateway. */
  agentStatus: string | null;
  /** Trimmed data from the latest AgentEvent (tool name, phase — no large content). */
  agentEventData: Record<string, unknown> | null;
  /** Timestamp of last ChatEvent. */
  lastChatEventAt: number | null;
  /** Timestamp of last AgentEvent. */
  lastAgentEventAt: number | null;
  /** RunId from the latest event. */
  lastRunId?: string;
}

/** Mirrors openclaw's GatewaySessionRow (not re-exported from plugin-sdk). */
export type GatewaySessionRow = {
  key: string;
  kind: 'direct' | 'group' | 'global' | 'unknown';
  label?: string;
  displayName?: string;
  derivedTitle?: string;
  lastMessagePreview?: string;
  channel?: string;
  subject?: string;
  groupChannel?: string;
  space?: string;
  updatedAt: number | null;
  sessionId?: string;
  systemSent?: boolean;
  abortedLastRun?: boolean;
  thinkingLevel?: string;
  verboseLevel?: string;
  reasoningLevel?: string;
  elevatedLevel?: string;
  sendPolicy?: 'allow' | 'deny';
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  responseUsage?: 'on' | 'off' | 'tokens' | 'full';
  modelProvider?: string;
  model?: string;
  contextTokens?: number;
  lastChannel?: string;
  lastTo?: string;
  lastAccountId?: string;
};

/** Mirrors openclaw's SessionsListResult (not re-exported from plugin-sdk). */
export type SessionsListResult = {
  ts: number;
  path: string;
  count: number;
  defaults: {
    modelProvider: string | null;
    model: string | null;
    contextTokens: number | null;
  };
  sessions: GatewaySessionRow[];
};

/** Gateway connection configuration resolved from env vars or config file. */
interface GatewayConnectionConfig {
  url: string;
  token: string;
}

// ---------------------------------------------------------------------------
// Config resolution (shared with action route)
// ---------------------------------------------------------------------------

/** Resolve gateway URL + token from env vars (plugin mode) or config file. */
export function readOpenClawConfig(): GatewayConnectionConfig | null {
  const envPort = process.env.OPENCLAW_GATEWAY_PORT;
  const envToken = process.env.OPENCLAW_GATEWAY_TOKEN;
  if (envPort) {
    return {
      url: `ws://127.0.0.1:${envPort}`,
      token: envToken ?? '',
    };
  }

  try {
    const home = process.env.USERPROFILE || process.env.HOME || '';
    const configPath = join(home, '.openclaw', 'openclaw.json');
    const raw = readFileSync(configPath, 'utf-8');
    const config = JSON.parse(raw);
    const port = config?.gateway?.port ?? 18789;
    const token = config?.gateway?.auth?.token ?? '';
    return { url: `ws://127.0.0.1:${port}`, token };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Persistent Gateway Connection
// ---------------------------------------------------------------------------

/** Callback signature for state change subscribers. Receives the specific session that changed. */
export type StateChangeCallback = (sessionKey: string, state: SessionLiveState) => void;

class GatewayConnection {
  private ws: WebSocket | null = null;
  private config: GatewayConnectionConfig | null = null;
  private connected = false;
  private authenticated = false;
  private destroyed = false;

  /** In-flight RPC requests awaiting a response. */
  private pendingRequests = new Map<string, {
    resolve: (value: unknown) => void;
    reject: (err: Error) => void;
    timer: ReturnType<typeof setTimeout>;
  }>();

  /** Per-session live state derived from events. */
  private liveStates = new Map<string, SessionLiveState>();

  /** Known agents from agents.list RPC. */
  private agents = new Map<string, AgentInfo>();
  private agentsFetchedOnce = false;
  private agentsFetchInFlight = false;

  /** Whether we've logged the first event (avoids spamming). */
  private loggedFirstEvent = false;

  /** Subscribers notified on state changes (for future SSE). */
  private subscribers = new Set<StateChangeCallback>();

  /** Reconnection state. */
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempt = 0;
  private static readonly MAX_RECONNECT_DELAY_MS = 30_000;
  private static readonly BASE_RECONNECT_DELAY_MS = 1_000;

  /** Request ID counter. */
  private reqCounter = 0;

  // -------------------------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------------------------

  /** Ensure the connection is started. Safe to call multiple times. */
  ensureStarted(): void {
    if (this.ws && (this.connected || this.ws.readyState === WebSocket.CONNECTING)) {
      return; // already running or connecting
    }
    this.config = readOpenClawConfig();
    if (!this.config) return;
    this.connect();
  }

  /** Tear down the connection entirely. */
  destroy(): void {
    this.destroyed = true;
    this.clearReconnectTimer();
    this.closeSocket();
    // Reject all pending requests
    for (const [, pending] of this.pendingRequests) {
      clearTimeout(pending.timer);
      pending.reject(new Error('Gateway connection destroyed'));
    }
    this.pendingRequests.clear();
  }

  /** Whether the connection is authenticated and ready for requests. */
  get isReady(): boolean {
    return this.connected && this.authenticated && this.ws?.readyState === WebSocket.OPEN;
  }

  // -------------------------------------------------------------------------
  // RPC
  // -------------------------------------------------------------------------

  /** Send an RPC request over the persistent connection. */
  request<T = unknown>(method: string, params: Record<string, unknown> = {}, timeoutMs = 10_000): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      // If not connected, try to connect first, then send after auth
      if (!this.isReady) {
        this.ensureStarted();
        // If still not ready after ensureStarted, fall back to ephemeral request
        if (!this.isReady) {
          this.ephemeralRequest<T>(method, params, timeoutMs).then(resolve, reject);
          return;
        }
      }

      const reqId = `am-${++this.reqCounter}-${Date.now().toString(36)}`;
      const timer = setTimeout(() => {
        this.pendingRequests.delete(reqId);
        reject(new Error(`Gateway request '${method}' timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      this.pendingRequests.set(reqId, {
        resolve: resolve as (value: unknown) => void,
        reject,
        timer,
      });

      this.ws!.send(JSON.stringify({ type: 'req', id: reqId, method, params }));
    });
  }

  // -------------------------------------------------------------------------
  // Live state access
  // -------------------------------------------------------------------------

  /** Get the current live execution state for all tracked sessions. */
  getSessionStates(): Map<string, SessionLiveState> {
    return this.liveStates;
  }

  /** Get live state for a specific session key. */
  getSessionState(sessionKey: string): SessionLiveState | undefined {
    return this.liveStates.get(sessionKey);
  }

  /** Get all known agents (populated from agents.list RPC). */
  getAgents(): Map<string, AgentInfo> {
    return this.agents;
  }

  /** Subscribe to state changes (for future SSE endpoint). */
  subscribe(cb: StateChangeCallback): void {
    this.subscribers.add(cb);
  }

  /** Unsubscribe from state changes. */
  unsubscribe(cb: StateChangeCallback): void {
    this.subscribers.delete(cb);
  }

  // -------------------------------------------------------------------------
  // Internal: Connection management
  // -------------------------------------------------------------------------

  private connect(): void {
    if (!this.config || this.destroyed) return;

    this.closeSocket();
    console.log('[gateway-connection] Connecting to', this.config.url);

    const ws = new WebSocket(this.config.url);
    this.ws = ws;
    this.authenticated = false;

    ws.on('open', () => {
      console.log('[gateway-connection] WebSocket open, waiting for challenge...');
      this.connected = true;
      this.reconnectAttempt = 0;
    });

    ws.on('error', (err) => {
      console.error('[gateway-connection] WebSocket error:', err.message);
    });

    ws.on('close', (_code, _reason) => {
      this.connected = false;
      this.authenticated = false;

      // Reject pending requests — the connection is gone
      for (const [id, pending] of this.pendingRequests) {
        clearTimeout(pending.timer);
        pending.reject(new Error('WebSocket closed'));
        this.pendingRequests.delete(id);
      }

      if (!this.destroyed) {
        this.scheduleReconnect();
      }
    });

    ws.on('message', (data) => {
      this.handleMessage(data.toString());
    });
  }

  private handleMessage(raw: string): void {
    let msg: Record<string, unknown>;
    try {
      msg = JSON.parse(raw);
    } catch {
      return; // ignore unparseable frames
    }

    const type = msg.type as string;

    // --- Authentication handshake ---
    if (type === 'event' && msg.event === 'connect.challenge') {
      console.log('[gateway-connection] Challenge received, sending auth...');
      this.sendConnectAuth();
      return;
    }

    if (type === 'res' && msg.id === 'connect-auth') {
      if (msg.ok) {
        this.authenticated = true;
        console.log('[gateway-connection] Authenticated successfully');
        // Fetch agent list now that we're authenticated
        this.fetchAgents();
      } else {
        console.error('[gateway-connection] Auth failed:', msg.error);
        this.ws?.close();
      }
      return;
    }

    // --- RPC responses ---
    if (type === 'res') {
      const id = msg.id as string;
      const pending = this.pendingRequests.get(id);
      if (pending) {
        this.pendingRequests.delete(id);
        clearTimeout(pending.timer);
        if (msg.ok) {
          pending.resolve(msg.payload);
        } else {
          pending.reject(new Error(`Gateway error: ${JSON.stringify(msg.error)}`));
        }
      }
      return;
    }

    // --- Gateway events (real-time state tracking) ---
    if (type === 'event') {
      this.handleEvent(msg);
    }
  }

  private handleEvent(msg: Record<string, unknown>): void {
    const event = msg.event as string;
    const payload = msg.payload as Record<string, unknown> | undefined;
    if (!payload) return;

    if (event === 'chat') {
      if (!this.loggedFirstEvent) {
        this.loggedFirstEvent = true;
        console.log('[gateway-connection] First event received:', event, 'sessionKey:', payload.sessionKey, 'state:', payload.state);
      }
      this.handleChatEvent(payload);
    } else if (event === 'agent') {
      if (!this.loggedFirstEvent) {
        this.loggedFirstEvent = true;
        console.log('[gateway-connection] First event received:', event, 'sessionKey:', payload.sessionKey, 'stream:', payload.stream);
      }
      this.handleAgentEvent(payload);
    }
    // Other events (tick, shutdown, etc.) are ignored for now
  }

  /**
   * Handle ChatEvent — record the raw state as session status.
   *
   * ChatEvent.state values from the gateway:
   * - "delta":   LLM is actively streaming tokens
   * - "final":   LLM finished generating a response
   * - "aborted": Run was aborted (user cancel or timeout)
   * - "error":   Run hit an error
   */
  private handleChatEvent(payload: Record<string, unknown>): void {
    const sessionKey = payload.sessionKey as string | undefined;
    const state = payload.state as string | undefined;
    if (!sessionKey || !state) return;

    const prev = this.liveStates.get(sessionKey);
    this.liveStates.set(sessionKey, {
      sessionKey,
      agent: prev?.agent ?? this.resolveAgent(sessionKey),
      chatStatus: state as SessionLiveState['chatStatus'],
      agentStatus: prev?.agentStatus ?? null,
      agentEventData: prev?.agentEventData ?? null,
      lastChatEventAt: Date.now(),
      lastAgentEventAt: prev?.lastAgentEventAt ?? null,
      lastRunId: (payload.runId as string) ?? prev?.lastRunId,
    });

    this.notifySubscribers(sessionKey);
  }

  /**
   * Handle AgentEvent — record the raw stream as agent status.
   *
   * AgentEvent.stream values from the gateway:
   * - "tool":      Tool is executing (file read, web search, exec, etc.)
   * - "lifecycle": Agent lifecycle (start, end, error, auto-compaction)
   * - "assistant": Assistant-level events (message generation)
   * - "error":     Error during agent execution
   * - (open string — gateway may add new stream types in the future)
   */
  private handleAgentEvent(payload: Record<string, unknown>): void {
    const sessionKey = payload.sessionKey as string | undefined;
    const stream = payload.stream as string | undefined;
    if (!sessionKey || !stream) return;

    const rawData = payload.data as Record<string, unknown> | undefined;
    const trimmedData = this.trimAgentEventData(stream, rawData);

    const prev = this.liveStates.get(sessionKey);
    this.liveStates.set(sessionKey, {
      sessionKey,
      agent: prev?.agent ?? this.resolveAgent(sessionKey),
      chatStatus: prev?.chatStatus ?? null,
      agentStatus: stream,
      agentEventData: trimmedData,
      lastChatEventAt: prev?.lastChatEventAt ?? null,
      lastAgentEventAt: (payload.ts as number) ?? Date.now(),
      lastRunId: (payload.runId as string) ?? prev?.lastRunId,
    });

    this.notifySubscribers(sessionKey);
  }

  // -------------------------------------------------------------------------
  // Internal: Agent resolution
  // -------------------------------------------------------------------------

  /**
   * Resolve agent for a session key by parsing agent:<agentId>:<rest>.
   * Returns null if the key doesn't match or the agent isn't known yet.
   * Triggers a lazy re-fetch if the agentId is unknown.
   */
  private resolveAgent(sessionKey: string): AgentInfo | null {
    const parts = sessionKey.split(':');
    if (parts[0] !== 'agent' || parts.length < 3) return null;
    const agentId = parts[1];
    if (!agentId) return null;

    const agent = this.agents.get(agentId);
    if (agent) return agent;

    // Unknown agentId — schedule a lazy re-fetch
    if (this.agentsFetchedOnce) {
      this.fetchAgents();
    }
    return null;
  }

  /** Fetch agents from agents.list RPC and populate the agents map. */
  private async fetchAgents(): Promise<void> {
    if (this.agentsFetchInFlight || !this.isReady) return;
    this.agentsFetchInFlight = true;
    try {
      const result = await this.request<AgentsListResult>('agents.list', {});
      this.agents.clear();
      for (const agent of result.agents ?? []) {
        this.agents.set(agent.id, agent);
      }
      this.agentsFetchedOnce = true;

      // Backfill agent references in existing live states
      for (const [key, state] of this.liveStates) {
        if (!state.agent) {
          const agent = this.resolveAgent(key);
          if (agent) state.agent = agent;
        }
      }
    } catch (err) {
      console.error('[gateway-connection] Failed to fetch agents:', err);
    } finally {
      this.agentsFetchInFlight = false;
    }
  }

  /**
   * Trim AgentEvent data — keep identifying info, drop large content.
   * Goal: understand what the agent is doing now without storing big payloads.
   */
  private trimAgentEventData(stream: string, data?: Record<string, unknown>): Record<string, unknown> | null {
    if (!data) return null;
    if (stream === 'tool') {
      // Keep: tool name, status/phase. Drop: params, result, partialResult, input content.
      return { name: data.name, status: data.status, phase: data.phase };
    }
    if (stream === 'lifecycle') {
      // Keep: phase (e.g. "start", "end", "error")
      return { phase: data.phase };
    }
    if (stream === 'assistant') {
      // Keep: type/status. Drop: actual text content.
      return { type: data.type, status: data.status };
    }
    if (stream === 'error') {
      // Keep error reason/message
      return { reason: data.reason, message: data.message, error: data.error };
    }
    // Unknown stream — keep only primitive-valued keys, skip large objects
    const trimmed: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(data)) {
      if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
        trimmed[k] = v;
      }
    }
    return trimmed;
  }

  // -------------------------------------------------------------------------
  // Internal: Auth
  // -------------------------------------------------------------------------

  private sendConnectAuth(): void {
    if (!this.ws || !this.config) return;
    this.ws.send(JSON.stringify({
      type: 'req',
      id: 'connect-auth',
      method: 'connect',
      params: {
        minProtocol: 3,
        maxProtocol: 3,
        client: {
          id: 'gateway-client',
          displayName: 'Agent Monitor',
          version: '0.1.0',
          platform: process.platform,
          mode: 'backend',
        },
        role: 'operator',
        scopes: ['operator.read', 'operator.admin'],
        caps: [],
        commands: [],
        permissions: {},
        auth: { token: this.config.token },
        locale: 'en-US',
        userAgent: 'agent-monitor/0.1.0',
      },
    }));
  }

  // -------------------------------------------------------------------------
  // Internal: Reconnect
  // -------------------------------------------------------------------------

  private scheduleReconnect(): void {
    this.clearReconnectTimer();
    const delay = Math.min(
      GatewayConnection.BASE_RECONNECT_DELAY_MS * Math.pow(2, this.reconnectAttempt),
      GatewayConnection.MAX_RECONNECT_DELAY_MS,
    );
    this.reconnectAttempt++;
    this.reconnectTimer = setTimeout(() => {
      this.config = readOpenClawConfig(); // re-read config in case port changed
      if (this.config) this.connect();
    }, delay);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private closeSocket(): void {
    if (this.ws) {
      this.ws.removeAllListeners();
      try { this.ws.close(); } catch { /* ignore */ }
      this.ws = null;
    }
    this.connected = false;
    this.authenticated = false;
  }

  // -------------------------------------------------------------------------
  // Internal: Notifications
  // -------------------------------------------------------------------------

  private notifySubscribers(sessionKey: string): void {
    const state = this.liveStates.get(sessionKey);
    if (!state) return;
    for (const cb of this.subscribers) {
      try { cb(sessionKey, state); } catch { /* ignore subscriber errors */ }
    }
  }

  // -------------------------------------------------------------------------
  // Internal: Ephemeral fallback
  // -------------------------------------------------------------------------

  /**
   * Fallback: opens an ephemeral WebSocket for a single request.
   * Used when the persistent connection isn't ready yet.
   */
  private ephemeralRequest<T>(
    method: string,
    params: Record<string, unknown>,
    timeoutMs: number,
  ): Promise<T> {
    const config = this.config ?? readOpenClawConfig();
    if (!config) {
      return Promise.reject(new Error('OpenClaw config not found'));
    }

    return new Promise<T>((resolve, reject) => {
      const ws = new WebSocket(config.url);
      const reqId = `am-eph-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      let settled = false;
      let connectSent = false;

      const timer = setTimeout(() => {
        if (!settled) {
          settled = true;
          ws.close();
          reject(new Error('Gateway request timed out'));
        }
      }, timeoutMs);

      ws.on('error', (err) => {
        if (!settled) { settled = true; clearTimeout(timer); reject(err); }
      });

      ws.on('close', () => {
        if (!settled) { settled = true; clearTimeout(timer); reject(new Error('WebSocket closed before response')); }
      });

      ws.on('message', (data) => {
        try {
          const msg = JSON.parse(data.toString());
          if (msg.type === 'event' && msg.event === 'connect.challenge' && !connectSent) {
            connectSent = true;
            ws.send(JSON.stringify({
              type: 'req',
              id: 'connect-1',
              method: 'connect',
              params: {
                minProtocol: 3,
                maxProtocol: 3,
                client: { id: 'gateway-client', displayName: 'Agent Monitor', version: '0.1.0', platform: process.platform, mode: 'backend' },
                role: 'operator',
                scopes: ['operator.read', 'operator.admin'],
                caps: [],
                commands: [],
                permissions: {},
                auth: { token: config.token },
                locale: 'en-US',
                userAgent: 'agent-monitor/0.1.0',
              },
            }));
            return;
          }
          if (msg.type === 'res' && msg.id === 'connect-1') {
            if (!msg.ok) {
              settled = true; clearTimeout(timer); ws.close();
              reject(new Error(`Gateway connect failed: ${JSON.stringify(msg.error)}`));
              return;
            }
            ws.send(JSON.stringify({ type: 'req', id: reqId, method, params }));
            return;
          }
          if (msg.type === 'res' && msg.id === reqId) {
            settled = true; clearTimeout(timer); ws.close();
            if (msg.ok) resolve(msg.payload as T);
            else reject(new Error(`Gateway error: ${JSON.stringify(msg.error)}`));
          }
        } catch { /* ignore parse errors */ }
      });
    });
  }
}

// ---------------------------------------------------------------------------
// Module-level singleton (survives Next.js HMR via globalThis)
// ---------------------------------------------------------------------------

const GLOBAL_KEY = Symbol.for('__openclaw_gateway_connection');

/** Get the singleton gateway connection, creating it if needed. */
export function getGatewayConnection(): GatewayConnection {
  let conn = (globalThis as Record<symbol, unknown>)[GLOBAL_KEY] as GatewayConnection | undefined;
  if (!conn) {
    conn = new GatewayConnection();
    (globalThis as Record<symbol, unknown>)[GLOBAL_KEY] = conn;
  }
  conn.ensureStarted();
  return conn;
}

/** Destroy the singleton (for graceful shutdown / tests). */
export function destroyGatewayConnection(): void {
  const conn = (globalThis as Record<symbol, unknown>)[GLOBAL_KEY] as GatewayConnection | undefined;
  if (conn) {
    conn.destroy();
    (globalThis as Record<symbol, unknown>)[GLOBAL_KEY] = undefined;
  }
}
