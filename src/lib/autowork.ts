// ============================================================================
// Autowork - persisted policies plus a server-side ticker
// Inspired by OpenClawfice's autowork loop, adapted to the gateway-backed
// agent monitor so it can dispatch work prompts directly through chat.send.
// ============================================================================

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import {
  getGatewayConnection,
  readOpenClawConfig,
  type SessionsListResult,
} from '@/lib/gateway-connection';
import type { AutoworkConfig, AutoworkPolicy } from '@/lib/types';

const OPENCLAW_DIR = join(homedir(), '.openclaw');
const STATUS_DIR = join(OPENCLAW_DIR, '.status');
const AUTOWORK_FILE = join(STATUS_DIR, 'agent-monitor-autowork.json');

const DEFAULT_INTERVAL_MS = 10 * 60 * 1000;
const TICK_INTERVAL_MS = 15 * 1000;
const MIN_GAP_MS = 30 * 1000;
const DEFAULT_MAX_SENDS = 2;
const DEFAULT_DIRECTIVE =
  'Check your memory and recent context, then continue the highest-impact task for your role. ' +
  'Do real work now: open files, write code, run commands, verify results, and move the task forward. ' +
  'Do not stop at a status update.';

const AUTOWORK_SYMBOL = Symbol.for('__agent_monitor_autowork_ticker');

interface GlobalAutoworkState {
  timer: ReturnType<typeof setInterval> | null;
}

interface AutoworkTarget {
  sessionId: string;
  sessionKey: string;
  agentId: string;
  name: string;
  sendPolicy: 'allow' | 'deny' | 'unknown';
  updatedAt: number;
}

export interface AutoworkTickResult {
  ok: boolean;
  tick: number;
  sent: string[];
  skipped: string[];
  failed: Array<{ sessionKey: string; error: string }>;
}

function getGlobalState(): GlobalAutoworkState {
  const store = globalThis as Record<symbol, unknown>;
  const existing = store[AUTOWORK_SYMBOL] as GlobalAutoworkState | undefined;
  if (existing) return existing;
  const created: GlobalAutoworkState = { timer: null };
  store[AUTOWORK_SYMBOL] = created;
  return created;
}

function ensureStatusDir(): void {
  if (!existsSync(STATUS_DIR)) {
    mkdirSync(STATUS_DIR, { recursive: true });
  }
}

function toPolicy(input: Partial<AutoworkPolicy> | undefined, defaultDirective: string): AutoworkPolicy {
  return {
    enabled: input?.enabled ?? false,
    intervalMs: typeof input?.intervalMs === 'number' && input.intervalMs >= 60_000
      ? input.intervalMs
      : DEFAULT_INTERVAL_MS,
    directive: typeof input?.directive === 'string' && input.directive.trim()
      ? input.directive
      : defaultDirective,
    lastSentAt: typeof input?.lastSentAt === 'number' ? input.lastSentAt : 0,
  };
}

function parseAgentKey(key: string): { agentId: string; isSubagent: boolean } | null {
  const parts = key.split(':');
  if (parts[0] !== 'agent' || !parts[1]) return null;
  return {
    agentId: parts[1],
    isSubagent: key.includes('subagent'),
  };
}

function resolveAgentName(agentId: string): string {
  try {
    const gw = getGatewayConnection();
    const known = gw.getAgents().get(agentId);
    const name = known?.identity?.name ?? known?.name;
    if (name) return name;
  } catch {
    // ignore
  }
  return agentId.charAt(0).toUpperCase() + agentId.slice(1);
}

function buildPrompt(target: AutoworkTarget, policy: AutoworkPolicy, config: AutoworkConfig): string {
  const directive = policy.directive.trim() || config.defaultDirective || DEFAULT_DIRECTIVE;
  return [
    `AUTOWORK LOOP for ${target.name}`,
    '',
    directive,
    '',
    'Constraints:',
    '- Continue existing work if there is a live thread; otherwise choose the next highest-impact task.',
    '- Use tools and produce artifacts, not just commentary.',
    '- Verify your work before handing off.',
    '- If blocked, document the blocker with a concrete next step.',
  ].join('\n');
}

export function readAutoworkConfig(): AutoworkConfig {
  try {
    if (existsSync(AUTOWORK_FILE)) {
      const raw = JSON.parse(readFileSync(AUTOWORK_FILE, 'utf-8')) as Partial<AutoworkConfig> & {
        policies?: Record<string, Partial<AutoworkPolicy>>;
      };
      const defaultDirective = typeof raw.defaultDirective === 'string' && raw.defaultDirective.trim()
        ? raw.defaultDirective
        : DEFAULT_DIRECTIVE;
      const policies: Record<string, AutoworkPolicy> = {};
      for (const [sessionKey, policy] of Object.entries(raw.policies ?? {})) {
        policies[sessionKey] = toPolicy(policy, defaultDirective);
      }
      return {
        maxSendsPerTick: typeof raw.maxSendsPerTick === 'number' && raw.maxSendsPerTick >= 1
          ? Math.min(10, raw.maxSendsPerTick)
          : DEFAULT_MAX_SENDS,
        defaultDirective,
        policies,
      };
    }
  } catch {
    // ignore malformed config and fall back to defaults
  }

  return {
    maxSendsPerTick: DEFAULT_MAX_SENDS,
    defaultDirective: DEFAULT_DIRECTIVE,
    policies: {},
  };
}

export function writeAutoworkConfig(config: AutoworkConfig): void {
  ensureStatusDir();
  writeFileSync(AUTOWORK_FILE, JSON.stringify(config, null, 2));
}

export function upsertAutoworkPolicy(
  sessionKey: string,
  patch: Partial<AutoworkPolicy>,
  configOverride?: AutoworkConfig,
): AutoworkConfig {
  const config = configOverride ?? readAutoworkConfig();
  const nextPolicy = toPolicy({
    ...config.policies[sessionKey],
    ...patch,
  }, config.defaultDirective);
  config.policies[sessionKey] = nextPolicy;
  writeAutoworkConfig(config);
  return config;
}

export async function listAutoworkTargets(): Promise<AutoworkTarget[]> {
  if (!readOpenClawConfig()) {
    return [];
  }

  const gw = getGatewayConnection();
  const result = await gw.request<SessionsListResult>('sessions.list', {});
  const deduped = new Map<string, AutoworkTarget>();

  for (const session of result.sessions ?? []) {
    const parsed = parseAgentKey(session.key);
    if (!parsed || parsed.isSubagent) continue;

    const target: AutoworkTarget = {
      sessionId: session.sessionId ?? session.key,
      sessionKey: session.key,
      agentId: parsed.agentId,
      name: resolveAgentName(parsed.agentId),
      sendPolicy: session.sendPolicy === 'allow' || session.sendPolicy === 'deny'
        ? session.sendPolicy
        : 'unknown',
      updatedAt: session.updatedAt ?? 0,
    };

    const groupKey = `agent:${parsed.agentId}`;
    const existing = deduped.get(groupKey);
    if (!existing || target.updatedAt >= existing.updatedAt) {
      deduped.set(groupKey, target);
    }
  }

  return Array.from(deduped.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export function ensureAutoworkTicker(): void {
  const state = getGlobalState();
  if (state.timer) return;

  state.timer = setInterval(() => {
    void runAutoworkTick().catch((err) => {
      console.error('[autowork] Tick failed:', err);
    });
  }, TICK_INTERVAL_MS);
}

export async function runAutoworkTick(forceSessionKey?: string): Promise<AutoworkTickResult> {
  const now = Date.now();
  const result: AutoworkTickResult = {
    ok: true,
    tick: now,
    sent: [],
    skipped: [],
    failed: [],
  };

  if (!readOpenClawConfig()) {
    return result;
  }

  const config = readAutoworkConfig();
  const targets = await listAutoworkTargets();
  const targetByKey = new Map(targets.map((target) => [target.sessionKey, target]));
  const gw = getGatewayConnection();

  if (forceSessionKey) {
    const forcedTarget = targetByKey.get(forceSessionKey);
    if (!forcedTarget) {
      return {
        ...result,
        ok: false,
        failed: [{ sessionKey: forceSessionKey, error: 'Session not found for autowork' }],
      };
    }

    const policy = toPolicy(config.policies[forceSessionKey], config.defaultDirective);
    try {
      await gw.request('chat.send', {
        sessionKey: forceSessionKey,
        idempotencyKey: `am-autowork-${now}-force`,
        message: buildPrompt(forcedTarget, policy, config),
      }, 10_000);
      config.policies[forceSessionKey] = { ...policy, lastSentAt: now };
      writeAutoworkConfig(config);
      result.sent.push(forceSessionKey);
      return result;
    } catch (err) {
      return {
        ...result,
        ok: false,
        failed: [{
          sessionKey: forceSessionKey,
          error: err instanceof Error ? err.message : String(err),
        }],
      };
    }
  }

  const dueTargets = targets
    .map((target) => {
      const policy = config.policies[target.sessionKey];
      return {
        target,
        policy: toPolicy(policy, config.defaultDirective),
      };
    })
    .filter(({ target, policy }) => {
      if (!policy.enabled) return false;
      if (target.sendPolicy === 'deny') return false;
      const elapsed = now - (policy.lastSentAt || 0);
      return elapsed >= policy.intervalMs && elapsed >= MIN_GAP_MS;
    })
    .sort((a, b) => a.policy.lastSentAt - b.policy.lastSentAt);

  const toSend = dueTargets.slice(0, config.maxSendsPerTick);
  const queued = dueTargets.slice(config.maxSendsPerTick);

  result.skipped.push(...queued.map(({ target }) => target.sessionKey));

  for (const { target, policy } of toSend) {
    try {
      await gw.request('chat.send', {
        sessionKey: target.sessionKey,
        idempotencyKey: `am-autowork-${now}-${result.sent.length}`,
        message: buildPrompt(target, policy, config),
      }, 10_000);
      config.policies[target.sessionKey] = {
        ...policy,
        lastSentAt: now,
      };
      result.sent.push(target.sessionKey);
    } catch (err) {
      result.ok = false;
      result.failed.push({
        sessionKey: target.sessionKey,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  if (toSend.length > 0) {
    writeAutoworkConfig(config);
  }

  return result;
}
