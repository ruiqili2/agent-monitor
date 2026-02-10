// ============================================================================
// /api/gateway/action — Send actions to OpenClaw Gateway (restart session, etc.)
// ============================================================================

import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';
import WebSocket from 'ws';

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

function gatewayRequest(
  url: string,
  token: string,
  method: string,
  params: Record<string, unknown> = {},
  timeoutMs = 10000,
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    const reqId = `am-act-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    let settled = false;
    let connectSent = false;

    const timer = setTimeout(() => {
      if (!settled) { settled = true; ws.close(); reject(new Error('Timeout')); }
    }, timeoutMs);

    ws.on('error', (err) => {
      if (!settled) { settled = true; clearTimeout(timer); reject(err); }
    });

    ws.on('close', () => {
      if (!settled) { settled = true; clearTimeout(timer); reject(new Error('WebSocket closed')); }
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
              client: { id: 'gateway-client', version: '0.1.0', platform: 'windows', mode: 'backend' },
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
        if (msg.type === 'res' && msg.id === 'connect-1') {
          if (!msg.ok) {
            settled = true; clearTimeout(timer); ws.close();
            reject(new Error(`Connect failed: ${JSON.stringify(msg.error)}`));
            return;
          }
          ws.send(JSON.stringify({ type: 'req', id: reqId, method, params }));
          return;
        }
        if (msg.type === 'res' && msg.id === reqId) {
          settled = true; clearTimeout(timer); ws.close();
          if (msg.ok) resolve(msg.payload);
          else reject(new Error(`Gateway: ${JSON.stringify(msg.error)}`));
        }
      } catch { /* ignore parse errors */ }
    });
  });
}

export async function POST(request: Request) {
  const config = readOpenClawConfig();
  if (!config) {
    return NextResponse.json({ error: 'OpenClaw config not found' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { action, sessionKey, message } = body as {
      action: string;
      sessionKey?: string;
      message?: string;
    };

    switch (action) {
      case 'reset': {
        if (!sessionKey) {
          return NextResponse.json({ error: 'sessionKey required' }, { status: 400 });
        }
        const result = await gatewayRequest(config.url, config.token, 'sessions.reset', { key: sessionKey });
        return NextResponse.json({ ok: true, result });
      }

      case 'delete': {
        if (!sessionKey) {
          return NextResponse.json({ error: 'sessionKey required' }, { status: 400 });
        }
        const result = await gatewayRequest(config.url, config.token, 'sessions.delete', { key: sessionKey });
        return NextResponse.json({ ok: true, result });
      }

      case 'send': {
        if (!sessionKey || !message) {
          return NextResponse.json({ error: 'sessionKey and message required' }, { status: 400 });
        }
        const idempotencyKey = `am-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const result = await gatewayRequest(config.url, config.token, 'chat.send', {
          sessionKey,
          idempotencyKey,
          message,
        });
        return NextResponse.json({ ok: true, result });
      }

      case 'compact': {
        if (!sessionKey) {
          return NextResponse.json({ error: 'sessionKey required' }, { status: 400 });
        }
        const result = await gatewayRequest(config.url, config.token, 'sessions.compact', { key: sessionKey });
        return NextResponse.json({ ok: true, result });
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 });
  }
}
