import { NextResponse } from 'next/server';
import {
  ensureAutoworkTicker,
  listAutoworkTargets,
  readAutoworkConfig,
  runAutoworkTick,
  upsertAutoworkPolicy,
  writeAutoworkConfig,
} from '@/lib/autowork';

export async function GET() {
  try {
    ensureAutoworkTicker();
    const config = readAutoworkConfig();
    const targets = await listAutoworkTargets();
    return NextResponse.json({
      ok: true,
      config,
      targets,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    ensureAutoworkTicker();
    const body = await request.json();
    const sessionKey = typeof body.sessionKey === 'string' ? body.sessionKey : '';
    const config = readAutoworkConfig();

    if (typeof body.maxSendsPerTick === 'number' && body.maxSendsPerTick >= 1) {
      config.maxSendsPerTick = Math.min(10, body.maxSendsPerTick);
    }
    if (typeof body.defaultDirective === 'string' && body.defaultDirective.trim()) {
      config.defaultDirective = body.defaultDirective.trim();
    }

    if (sessionKey) {
      const updated = upsertAutoworkPolicy(sessionKey, {
        enabled: typeof body.enabled === 'boolean' ? body.enabled : undefined,
        intervalMs: typeof body.intervalMs === 'number' ? body.intervalMs : undefined,
        directive: typeof body.directive === 'string' ? body.directive : undefined,
      }, config);
      return NextResponse.json({ ok: true, config: updated, policy: updated.policies[sessionKey] });
    }

    writeAutoworkConfig(config);
    return NextResponse.json({ ok: true, config });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    ensureAutoworkTicker();
    let sessionKey: string | undefined;
    try {
      const body = await request.json();
      if (typeof body.sessionKey === 'string' && body.sessionKey) {
        sessionKey = body.sessionKey;
      }
    } catch {
      // ignore missing body
    }

    const result = await runAutoworkTick(sessionKey);
    return NextResponse.json(result, { status: result.ok ? 200 : 500 });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
