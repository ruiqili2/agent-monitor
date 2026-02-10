// ============================================================================
// Types — Compile-time validation tests
// Ensures type definitions remain consistent and complete
// ============================================================================

import { describe, it, expect } from 'vitest';
import type {
  AgentBehavior,
  AgentState,
  AgentConfig,
  AgentDashboardState,
  AgentTask,
  TokenUsage,
  ActivityEvent,
  SystemStats,
  DashboardConfig,
  GatewayConfig,
  OwnerConfig,
  ThemeName,
  AgentAvatar,
  OwnerAvatar,
} from '@/lib/types';

// These tests validate that our types are consistent at compile time.
// If a type definition changes in a breaking way, TypeScript will catch it here.

describe('Type consistency', () => {
  it('AgentBehavior covers all expected behaviors', () => {
    // This ensures we don't accidentally remove behaviors
    const behaviors: AgentBehavior[] = [
      'coding', 'thinking', 'researching', 'meeting', 'deploying', 'debugging',
      'receiving_task', 'reporting',
      'idle', 'coffee', 'snacking', 'toilet', 'sleeping', 'napping',
      'panicking', 'dead', 'overloaded', 'reviving',
    ];
    expect(behaviors).toHaveLength(18);
  });

  it('AgentState covers all expected states', () => {
    const states: AgentState[] = [
      'idle', 'coding', 'thinking', 'researching', 'meeting', 'deploying',
      'receiving_task', 'reporting', 'resting', 'waiting',
    ];
    expect(states).toHaveLength(10);
  });

  it('ThemeName covers all expected themes', () => {
    const themes: ThemeName[] = ['default', 'dark', 'cozy', 'cyberpunk'];
    expect(themes).toHaveLength(4);
  });

  it('AgentAvatar covers all expected avatars', () => {
    const avatars: AgentAvatar[] = ['glasses', 'hoodie', 'suit', 'casual', 'robot', 'cat', 'dog'];
    expect(avatars).toHaveLength(7);
  });

  it('OwnerAvatar covers all expected avatars', () => {
    const avatars: OwnerAvatar[] = ['boss', 'casual', 'creative'];
    expect(avatars).toHaveLength(3);
  });

  it('AgentConfig has required shape', () => {
    const config: AgentConfig = {
      id: 'test',
      name: 'Test',
      emoji: '⚡',
      color: '#000',
      avatar: 'glasses',
    };
    expect(config.id).toBeTruthy();
    expect(config.name).toBeTruthy();
  });

  it('AgentDashboardState has required shape', () => {
    const state: AgentDashboardState = {
      behavior: 'coding',
      officeState: 'coding',
      currentTask: null,
      taskHistory: [],
      tokenUsage: [],
      totalTokens: 0,
      totalTasks: 0,
      lastActivity: Date.now(),
      sessionLog: [],
      uptime: 0,
    };
    expect(state.behavior).toBe('coding');
  });

  it('ActivityEvent type union is complete', () => {
    const types: ActivityEvent['type'][] = [
      'state_change', 'task_start', 'task_complete', 'task_fail',
      'tool_call', 'message', 'error', 'system',
    ];
    expect(types).toHaveLength(8);
  });

  it('AgentTask status union is complete', () => {
    const statuses: AgentTask['status'][] = ['active', 'completed', 'failed'];
    expect(statuses).toHaveLength(3);
  });

  it('GatewayConfig has required shape', () => {
    const gw: GatewayConfig = { url: 'http://localhost', token: '' };
    expect(gw.url).toBeTruthy();
  });

  it('DashboardConfig has required shape', () => {
    const config: DashboardConfig = {
      agents: [],
      owner: { name: 'Test', emoji: '👤', avatar: 'boss' },
      gateway: { url: 'http://localhost', token: '' },
      theme: 'default',
      connected: false,
      demoMode: true,
    };
    expect(config.agents).toEqual([]);
  });
});
