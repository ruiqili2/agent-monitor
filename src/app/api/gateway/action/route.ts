// ============================================================================
// /api/gateway/action — Send actions to OpenClaw Gateway (restart session, etc.)
//
// Uses the shared persistent gateway connection singleton.
// ============================================================================

import { NextResponse } from 'next/server';
import { getGatewayConnection, readOpenClawConfig } from '@/lib/gateway-connection';

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

    const gw = getGatewayConnection();

    switch (action) {
      case 'reset': {
        if (!sessionKey) {
          return NextResponse.json({ error: 'sessionKey required' }, { status: 400 });
        }
        const result = await gw.request('sessions.reset', { key: sessionKey });
        return NextResponse.json({ ok: true, result });
      }

      case 'delete': {
        if (!sessionKey) {
          return NextResponse.json({ error: 'sessionKey required' }, { status: 400 });
        }
        const result = await gw.request('sessions.delete', { key: sessionKey });
        return NextResponse.json({ ok: true, result });
      }

      case 'send': {
        if (!sessionKey || !message) {
          return NextResponse.json({ error: 'sessionKey and message required' }, { status: 400 });
        }
        const idempotencyKey = `am-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const result = await gw.request('chat.send', {
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
        const result = await gw.request('sessions.compact', { key: sessionKey });
        return NextResponse.json({ ok: true, result });
      }

      case 'history': {
        if (!sessionKey) {
          return NextResponse.json({ error: 'sessionKey required' }, { status: 400 });
        }
        const limit = (body as { limit?: number }).limit ?? 20;
        const result = await gw.request('chat.history', {
          sessionKey,
          limit,
        });
        return NextResponse.json({ ok: true, result });
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 });
  }
}
