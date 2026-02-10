// ============================================================================
// State Mapper — Unit Tests
// ============================================================================

import { describe, it, expect } from 'vitest';
import {
  BEHAVIOR_INFO,
  isWorkingBehavior,
  isActiveBehavior,
  behaviorToOfficeState,
  generateDemoAgentState,
  generateDemoEvent,
  generateDemoStats,
  formatTokens,
  formatUptime,
  formatRelativeTime,
} from '@/lib/state-mapper';
import type { AgentBehavior, AgentConfig } from '@/lib/types';

// ---------------------------------------------------------------------------
// BEHAVIOR_INFO completeness
// ---------------------------------------------------------------------------

describe('BEHAVIOR_INFO', () => {
  const ALL_BEHAVIORS: AgentBehavior[] = [
    'coding', 'thinking', 'researching', 'meeting', 'deploying', 'debugging',
    'receiving_task', 'reporting',
    'idle', 'coffee', 'snacking', 'toilet', 'sleeping', 'napping',
    'panicking', 'dead', 'overloaded', 'reviving',
  ];

  it('has metadata for every AgentBehavior', () => {
    for (const b of ALL_BEHAVIORS) {
      expect(BEHAVIOR_INFO[b]).toBeDefined();
      expect(BEHAVIOR_INFO[b].label).toBeTruthy();
      expect(BEHAVIOR_INFO[b].emoji).toBeTruthy();
      expect(BEHAVIOR_INFO[b].category).toMatch(/^(work|interaction|life|anomaly)$/);
      expect(BEHAVIOR_INFO[b].color).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(BEHAVIOR_INFO[b].neonColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it('has no extra keys beyond known behaviors', () => {
    const keys = Object.keys(BEHAVIOR_INFO);
    expect(keys.sort()).toEqual([...ALL_BEHAVIORS].sort());
  });
});

// ---------------------------------------------------------------------------
// Behavior classification helpers
// ---------------------------------------------------------------------------

describe('isWorkingBehavior', () => {
  it('returns true for work behaviors', () => {
    expect(isWorkingBehavior('coding')).toBe(true);
    expect(isWorkingBehavior('thinking')).toBe(true);
    expect(isWorkingBehavior('debugging')).toBe(true);
    expect(isWorkingBehavior('deploying')).toBe(true);
    expect(isWorkingBehavior('researching')).toBe(true);
    expect(isWorkingBehavior('meeting')).toBe(true);
  });

  it('returns false for non-work behaviors', () => {
    expect(isWorkingBehavior('idle')).toBe(false);
    expect(isWorkingBehavior('sleeping')).toBe(false);
    expect(isWorkingBehavior('panicking')).toBe(false);
    expect(isWorkingBehavior('receiving_task')).toBe(false);
  });
});

describe('isActiveBehavior', () => {
  it('returns true for work + interaction behaviors', () => {
    expect(isActiveBehavior('coding')).toBe(true);
    expect(isActiveBehavior('receiving_task')).toBe(true);
    expect(isActiveBehavior('reporting')).toBe(true);
  });

  it('returns false for life + anomaly behaviors', () => {
    expect(isActiveBehavior('idle')).toBe(false);
    expect(isActiveBehavior('coffee')).toBe(false);
    expect(isActiveBehavior('dead')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// behaviorToOfficeState mapping
// ---------------------------------------------------------------------------

describe('behaviorToOfficeState', () => {
  it('maps coding/debugging → coding', () => {
    expect(behaviorToOfficeState('coding')).toBe('coding');
    expect(behaviorToOfficeState('debugging')).toBe('coding');
  });

  it('maps thinking → thinking', () => {
    expect(behaviorToOfficeState('thinking')).toBe('thinking');
  });

  it('maps researching → researching', () => {
    expect(behaviorToOfficeState('researching')).toBe('researching');
  });

  it('maps meeting → meeting', () => {
    expect(behaviorToOfficeState('meeting')).toBe('meeting');
  });

  it('maps deploying → deploying', () => {
    expect(behaviorToOfficeState('deploying')).toBe('deploying');
  });

  it('maps interaction behaviors correctly', () => {
    expect(behaviorToOfficeState('receiving_task')).toBe('receiving_task');
    expect(behaviorToOfficeState('reporting')).toBe('reporting');
  });

  it('maps sleep/nap → resting', () => {
    expect(behaviorToOfficeState('sleeping')).toBe('resting');
    expect(behaviorToOfficeState('napping')).toBe('resting');
  });

  it('maps life behaviors → idle', () => {
    expect(behaviorToOfficeState('idle')).toBe('idle');
    expect(behaviorToOfficeState('coffee')).toBe('idle');
    expect(behaviorToOfficeState('snacking')).toBe('idle');
    expect(behaviorToOfficeState('toilet')).toBe('idle');
  });

  it('maps anomaly behaviors → waiting', () => {
    expect(behaviorToOfficeState('panicking')).toBe('waiting');
    expect(behaviorToOfficeState('dead')).toBe('waiting');
    expect(behaviorToOfficeState('overloaded')).toBe('waiting');
    expect(behaviorToOfficeState('reviving')).toBe('waiting');
  });
});

// ---------------------------------------------------------------------------
// Demo data generation
// ---------------------------------------------------------------------------

describe('generateDemoAgentState', () => {
  it('returns a valid AgentDashboardState', () => {
    const state = generateDemoAgentState('test-agent');
    expect(state.behavior).toBeTruthy();
    expect(state.officeState).toBeTruthy();
    expect(state.tokenUsage).toHaveLength(24); // 24h of data
    expect(state.totalTokens).toBeGreaterThan(0);
    expect(state.totalTasks).toBeGreaterThanOrEqual(5);
    expect(state.sessionLog.length).toBeGreaterThan(0);
    expect(typeof state.lastActivity).toBe('number');
  });

  it('has matching behavior → officeState', () => {
    // Run multiple times since it's random
    for (let i = 0; i < 20; i++) {
      const state = generateDemoAgentState(`agent-${i}`);
      expect(state.officeState).toBe(behaviorToOfficeState(state.behavior));
    }
  });
});

const MOCK_AGENTS: AgentConfig[] = [
  { id: 'a1', name: 'Test1', emoji: '⚡', color: '#4FC3F7', avatar: 'glasses' },
  { id: 'a2', name: 'Test2', emoji: '🔥', color: '#FF7043', avatar: 'hoodie' },
];

describe('generateDemoEvent', () => {
  it('returns a valid ActivityEvent', () => {
    const event = generateDemoEvent(MOCK_AGENTS);
    expect(event.id).toBeTruthy();
    expect(event.agentId).toBeTruthy();
    expect(event.agentName).toBeTruthy();
    expect(event.type).toBeTruthy();
    expect(event.message).toBeTruthy();
    expect(event.timestamp).toBeGreaterThan(0);
  });

  it('handles empty agent list', () => {
    const event = generateDemoEvent([]);
    expect(event.agentId).toBe('system');
    expect(event.agentName).toBe('System');
  });
});

describe('generateDemoStats', () => {
  it('returns valid SystemStats', () => {
    const stats = generateDemoStats(MOCK_AGENTS);
    expect(stats.totalAgents).toBe(2);
    expect(stats.activeAgents).toBeLessThanOrEqual(2);
    expect(stats.activeAgents).toBeGreaterThanOrEqual(1);
    expect(stats.totalTokens).toBeGreaterThan(0);
    expect(stats.connected).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------

describe('formatTokens', () => {
  it('formats millions', () => {
    expect(formatTokens(1500000)).toBe('1.5M');
    expect(formatTokens(1000000)).toBe('1.0M');
  });

  it('formats thousands', () => {
    expect(formatTokens(1500)).toBe('1.5k');
    expect(formatTokens(999999)).toBe('1000.0k');
  });

  it('formats small numbers as-is', () => {
    expect(formatTokens(0)).toBe('0');
    expect(formatTokens(999)).toBe('999');
  });
});

describe('formatUptime', () => {
  it('formats hours + minutes', () => {
    expect(formatUptime(3661)).toBe('1h 1m');
    expect(formatUptime(7200)).toBe('2h 0m');
  });

  it('formats minutes only for < 1h', () => {
    expect(formatUptime(120)).toBe('2m');
    expect(formatUptime(0)).toBe('0m');
  });
});

describe('formatRelativeTime', () => {
  it('formats "just now" for < 1s', () => {
    expect(formatRelativeTime(Date.now())).toBe('just now');
  });

  it('formats seconds', () => {
    expect(formatRelativeTime(Date.now() - 30000)).toBe('30s ago');
  });

  it('formats minutes', () => {
    expect(formatRelativeTime(Date.now() - 300000)).toBe('5m ago');
  });

  it('formats hours', () => {
    expect(formatRelativeTime(Date.now() - 7200000)).toBe('2h ago');
  });

  it('formats days', () => {
    expect(formatRelativeTime(Date.now() - 172800000)).toBe('2d ago');
  });
});
