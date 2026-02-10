// ============================================================================
// /api/gateway — Proxy to OpenClaw Gateway via WebSocket
// Returns real session data as JSON for the dashboard to poll
// ============================================================================

import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';
import WebSocket from 'ws';

interface GatewaySession {
  key: string;
  kind: string;
  channel: string;
  displayName: string;
  updatedAt: number;
  sessionId: string;
  model: string;
  contextTokens: number;
  totalTokens: number;
  abortedLastRun: boolean;
  lastChannel: string;
  systemSent?: boolean;
}

interface SessionListResult {
  count: number;
  sessions: GatewaySession[];
}

// Read config to get gateway URL + token
function readOpenClawConfig(): { url: string; token: string } | null {
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

// Connect to gateway via WebSocket and send a request
function gatewayRequest(
  url: string,
  token: string,
  method: string,
  params: Record<string, unknown> = {},
  timeoutMs = 8000,
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    const reqId = `am-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
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
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        reject(err);
      }
    });

    ws.on('close', () => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        reject(new Error('WebSocket closed before response'));
      }
    });

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());

        // Handle connect challenge
        if (msg.type === 'event' && msg.event === 'connect.challenge' && !connectSent) {
          connectSent = true;
          ws.send(JSON.stringify({
            type: 'req',
            id: 'connect-1',
            method: 'connect',
            params: {
              minProtocol: 3,
              maxProtocol: 3,
              client: {
                id: 'gateway-client',
                version: '0.1.0',
                platform: 'windows',
                mode: 'backend',
              },
              role: 'operator',
              scopes: ['operator.read', 'operator.admin'],
              caps: [],
              commands: [],
              permissions: {},
              auth: { token },
              locale: 'en-US',
              userAgent: 'agent-monitor/0.1.0',
            },
          }));
          return;
        }

        // Handle connect response — now send our actual request
        if (msg.type === 'res' && msg.id === 'connect-1') {
          if (!msg.ok) {
            settled = true;
            clearTimeout(timer);
            ws.close();
            reject(new Error(`Gateway connect failed: ${JSON.stringify(msg.error)}`));
            return;
          }
          ws.send(JSON.stringify({
            type: 'req',
            id: reqId,
            method,
            params,
          }));
          return;
        }

        // Handle our actual request response
        if (msg.type === 'res' && msg.id === reqId) {
          settled = true;
          clearTimeout(timer);
          ws.close();
          if (msg.ok) {
            resolve(msg.payload);
          } else {
            reject(new Error(`Gateway error: ${JSON.stringify(msg.error)}`));
          }
          return;
        }
      } catch {
        // Ignore parse errors
      }
    });
  });
}

export async function GET() {
  const config = readOpenClawConfig();
  if (!config) {
    return NextResponse.json(
      { error: 'OpenClaw config not found', sessions: [] },
      { status: 500 },
    );
  }

  try {
    const result = await gatewayRequest(config.url, config.token, 'sessions.list', {}) as SessionListResult;
    const now = Date.now();

    const sessions = (result.sessions ?? []).map((s) => {
      const age = now - s.updatedAt;
      const isSubagent = s.key.includes('subagent');

      // Infer behavior from available fields
      let behavior = 'idle';
      let currentTask = '';
      let isActive = false;

      if (s.abortedLastRun) {
        behavior = 'dead';
        currentTask = 'Aborted';
      } else if (s.systemSent && age < 60000) {
        // System prompt sent recently = agent is active / thinking
        behavior = 'coding';
        isActive = true;
        currentTask = 'Working...';
      } else if (age < 30000) {
        // Updated very recently — likely active
        behavior = 'coding';
        isActive = true;
        currentTask = 'Processing...';
      } else if (age < 120000) {
        // Within 2 minutes — thinking
        behavior = 'thinking';
        isActive = true;
      } else if (age < 600000) {
        // Within 10 minutes — idle
        behavior = 'idle';
      } else if (age < 3600000) {
        // Within 1 hour — coffee break
        behavior = 'coffee';
      } else {
        // Older — sleeping
        behavior = 'sleeping';
      }

      // Parse session key for display name
      const keyParts = s.key.split(':');
      let agentName: string;
      if (isSubagent) {
        const subId = keyParts[keyParts.length - 1] ?? '';
        agentName = `Sub-${subId.slice(0, 6)}`;
      } else {
        // Main session: use agent id (e.g. "main")
        const agentId = keyParts[1] ?? 'main';
        agentName = agentId.charAt(0).toUpperCase() + agentId.slice(1);
      }

      return {
        id: s.sessionId,
        key: s.key,
        name: agentName,
        model: s.model,
        totalTokens: s.totalTokens ?? 0,
        contextTokens: s.contextTokens ?? 0,
        channel: s.lastChannel ?? s.channel,
        behavior,
        currentTask,
        isActive,
        isSubagent,
        lastActivity: s.updatedAt,
        updatedAt: s.updatedAt,
        aborted: s.abortedLastRun ?? false,
      };
    });

    return NextResponse.json({
      ok: true,
      timestamp: now,
      count: sessions.length,
      sessions,
    });
  } catch (err) {
    return NextResponse.json(
      { error: String(err), sessions: [] },
      { status: 502 },
    );
  }
}
