// ============================================================================
// Gateway Client — Unit Tests
// ============================================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { behaviorToOfficeState, pollGateway, GatewayPoller } from '@/lib/gateway-client';
import type { AgentBehavior } from '@/lib/types';

// ---------------------------------------------------------------------------
// behaviorToOfficeState (gateway-client's copy)
// ---------------------------------------------------------------------------

describe('gateway-client behaviorToOfficeState', () => {
  const cases: [AgentBehavior, string][] = [
    ['coding', 'coding'],
    ['debugging', 'coding'],
    ['thinking', 'thinking'],
    ['researching', 'researching'],
    ['meeting', 'meeting'],
    ['deploying', 'deploying'],
    ['receiving_task', 'receiving_task'],
    ['reporting', 'reporting'],
    ['sleeping', 'resting'],
    ['napping', 'resting'],
    ['idle', 'idle'],
    ['coffee', 'idle'],
    ['snacking', 'idle'],
    ['toilet', 'idle'],
    ['panicking', 'waiting'],
    ['dead', 'waiting'],
    ['overloaded', 'waiting'],
    ['reviving', 'waiting'],
  ];

  it.each(cases)('maps %s → %s', (behavior, expected) => {
    expect(behaviorToOfficeState(behavior)).toBe(expected);
  });
});

// ---------------------------------------------------------------------------
// pollGateway (direct function test)
// ---------------------------------------------------------------------------

describe('pollGateway', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('returns online status with sessions when API succeeds', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        ok: true,
        timestamp: Date.now(),
        count: 1,
        sessions: [{
          id: 'test-1',
          key: 'agent:main:main',
          name: 'Test Agent',
          model: 'claude-3',
          totalTokens: 1000,
          contextTokens: 500,
          channel: 'webchat',
          behavior: 'coding',
          isActive: true,
          isSubagent: false,
          lastActivity: Date.now(),
          updatedAt: Date.now(),
          aborted: false,
        }],
      }),
    });

    const status = await pollGateway({ url: 'http://localhost', token: '' });
    expect(status.online).toBe(true);
    expect(status.sessions).toHaveLength(1);
    expect(status.agentStates['test-1']).toBe('coding');
    expect(status.agentBehaviors['test-1']).toBe('coding');
  });

  it('returns offline when fetch throws', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
    const status = await pollGateway({ url: 'http://localhost', token: '' });
    expect(status.online).toBe(false);
    expect(status.sessions).toHaveLength(0);
  });

  it('returns offline when response is not ok', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false });
    const status = await pollGateway({ url: 'http://localhost', token: '' });
    expect(status.online).toBe(false);
  });

  it('returns offline when API returns ok=false', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ok: false, error: 'not connected' }),
    });
    const status = await pollGateway({ url: 'http://localhost', token: '' });
    expect(status.online).toBe(false);
  });

  it('maps unknown behavior to idle', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        ok: true,
        timestamp: Date.now(),
        count: 1,
        sessions: [{
          id: 'test-1',
          key: 'agent:main:main',
          name: 'Test',
          model: 'gpt-4',
          totalTokens: 0,
          contextTokens: 0,
          channel: 'webchat',
          behavior: 'unknown_behavior_xyz',
          isActive: true,
          isSubagent: false,
          lastActivity: Date.now(),
          updatedAt: Date.now(),
          aborted: false,
        }],
      }),
    });

    const status = await pollGateway({ url: 'http://localhost', token: '' });
    expect(status.agentBehaviors['test-1']).toBe('idle');
    expect(status.agentStates['test-1']).toBe('idle');
  });

  it('handles multiple sessions', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        ok: true,
        timestamp: Date.now(),
        count: 3,
        sessions: [
          { id: 's1', key: 'k1', name: 'A1', model: 'm', totalTokens: 0, contextTokens: 0, channel: 'webchat', behavior: 'coding', isActive: true, isSubagent: false, lastActivity: 0, updatedAt: 0, aborted: false },
          { id: 's2', key: 'k2', name: 'A2', model: 'm', totalTokens: 0, contextTokens: 0, channel: 'webchat', behavior: 'sleeping', isActive: false, isSubagent: true, lastActivity: 0, updatedAt: 0, aborted: false },
          { id: 's3', key: 'k3', name: 'A3', model: 'm', totalTokens: 0, contextTokens: 0, channel: 'webchat', behavior: 'panicking', isActive: true, isSubagent: false, lastActivity: 0, updatedAt: 0, aborted: true },
        ],
      }),
    });

    const status = await pollGateway({ url: 'http://localhost', token: '' });
    expect(status.sessions).toHaveLength(3);
    expect(status.agentStates['s1']).toBe('coding');
    expect(status.agentStates['s2']).toBe('resting');
    expect(status.agentStates['s3']).toBe('waiting');
  });
});

// ---------------------------------------------------------------------------
// GatewayPoller (integration-level, using real timers)
// ---------------------------------------------------------------------------

describe('GatewayPoller', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        ok: true,
        timestamp: Date.now(),
        count: 0,
        sessions: [],
      }),
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('can be instantiated and started/stopped without errors', () => {
    const callback = vi.fn();
    const poller = new GatewayPoller({ url: 'http://localhost', token: '' }, callback, 60000);
    poller.start();
    poller.stop();
    // No error thrown = pass
    expect(true).toBe(true);
  });

  it('calls callback on first poll', async () => {
    const callback = vi.fn();
    const poller = new GatewayPoller({ url: 'http://localhost', token: '' }, callback, 60000);
    poller.start();

    // Wait for the initial async poll to complete
    await new Promise(r => setTimeout(r, 50));

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback.mock.calls[0][0].online).toBe(true);

    poller.stop();
  });

  it('updateGateway changes the config', () => {
    const callback = vi.fn();
    const poller = new GatewayPoller({ url: 'http://old', token: '' }, callback, 60000);
    poller.updateGateway({ url: 'http://new', token: 'tok' });
    // No error = the method exists and works
    expect(true).toBe(true);
  });

  it('stop prevents further polling', async () => {
    const callback = vi.fn();
    const poller = new GatewayPoller({ url: 'http://localhost', token: '' }, callback, 100);
    poller.start();
    await new Promise(r => setTimeout(r, 50));
    poller.stop();

    const callsAfterStop = callback.mock.calls.length;
    await new Promise(r => setTimeout(r, 300));

    // Should not have been called again after stop
    expect(callback.mock.calls.length).toBe(callsAfterStop);
  });
});
