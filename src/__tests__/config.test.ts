// ============================================================================
// Config — Unit Tests
// ============================================================================

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  DEFAULT_CONFIG,
  DEFAULT_GATEWAY,
  MAX_AGENTS,
  loadConfig,
  saveConfig,
  clearConfig,
  exportConfig,
  importConfig,
  updateGateway,
  updateOwner,
  updateTheme,
  addAgent,
  removeAgent,
  updateAgent,
} from '@/lib/config';
import type { DashboardConfig, AgentConfig } from '@/lib/types';

// ---------------------------------------------------------------------------
// Mutation helpers (pure functions, no DOM needed)
// ---------------------------------------------------------------------------

describe('Config mutation helpers', () => {
  const baseConfig: DashboardConfig = {
    ...DEFAULT_CONFIG,
    agents: [
      { id: 'a1', name: 'Agent1', emoji: '⚡', color: '#4FC3F7', avatar: 'glasses' },
      { id: 'a2', name: 'Agent2', emoji: '🔥', color: '#FF7043', avatar: 'hoodie' },
    ],
  };

  describe('updateGateway', () => {
    it('updates gateway URL', () => {
      const updated = updateGateway(baseConfig, { url: 'http://new:9999' });
      expect(updated.gateway.url).toBe('http://new:9999');
      expect(updated.gateway.token).toBe(baseConfig.gateway.token);
    });

    it('does not mutate original', () => {
      const original = { ...baseConfig };
      updateGateway(baseConfig, { url: 'http://changed' });
      expect(baseConfig.gateway.url).toBe(original.gateway.url);
    });
  });

  describe('updateOwner', () => {
    it('updates owner name', () => {
      const updated = updateOwner(baseConfig, { name: 'Zoe' });
      expect(updated.owner.name).toBe('Zoe');
      expect(updated.owner.emoji).toBe(baseConfig.owner.emoji);
    });
  });

  describe('updateTheme', () => {
    it('updates theme', () => {
      const updated = updateTheme(baseConfig, 'cyberpunk');
      expect(updated.theme).toBe('cyberpunk');
    });
  });

  describe('addAgent', () => {
    it('adds an agent', () => {
      const newAgent: AgentConfig = { id: 'a3', name: 'Agent3', emoji: '🌟', color: '#66BB6A', avatar: 'suit' };
      const updated = addAgent(baseConfig, newAgent);
      expect(updated.agents).toHaveLength(3);
      expect(updated.agents[2]).toEqual(newAgent);
    });

    it('enforces MAX_AGENTS limit', () => {
      let config = baseConfig;
      for (let i = 0; i < MAX_AGENTS + 5; i++) {
        config = addAgent(config, { id: `extra-${i}`, name: `Extra${i}`, emoji: '🎯', color: '#000', avatar: 'robot' });
      }
      expect(config.agents.length).toBeLessThanOrEqual(MAX_AGENTS);
    });

    it('does not mutate original', () => {
      const originalLen = baseConfig.agents.length;
      addAgent(baseConfig, { id: 'x', name: 'X', emoji: '❌', color: '#000', avatar: 'cat' });
      expect(baseConfig.agents.length).toBe(originalLen);
    });
  });

  describe('removeAgent', () => {
    it('removes an agent by id', () => {
      const updated = removeAgent(baseConfig, 'a1');
      expect(updated.agents).toHaveLength(1);
      expect(updated.agents[0].id).toBe('a2');
    });

    it('returns same agents if id not found', () => {
      const updated = removeAgent(baseConfig, 'nonexistent');
      expect(updated.agents).toHaveLength(2);
    });
  });

  describe('updateAgent', () => {
    it('updates agent properties', () => {
      const updated = updateAgent(baseConfig, 'a1', { name: 'Renamed', emoji: '🎭' });
      expect(updated.agents[0].name).toBe('Renamed');
      expect(updated.agents[0].emoji).toBe('🎭');
      expect(updated.agents[0].color).toBe('#4FC3F7'); // unchanged
    });

    it('does nothing for unknown id', () => {
      const updated = updateAgent(baseConfig, 'unknown', { name: 'Ghost' });
      expect(updated.agents).toEqual(baseConfig.agents);
    });
  });
});

// ---------------------------------------------------------------------------
// Import / Export
// ---------------------------------------------------------------------------

describe('exportConfig / importConfig', () => {
  it('round-trips config through JSON', () => {
    const json = exportConfig(DEFAULT_CONFIG);
    const parsed = importConfig(json);
    expect(parsed).not.toBeNull();
    expect(parsed!.agents).toEqual(DEFAULT_CONFIG.agents);
    expect(parsed!.owner).toEqual(DEFAULT_CONFIG.owner);
    expect(parsed!.theme).toBe(DEFAULT_CONFIG.theme);
  });

  it('returns null for invalid JSON', () => {
    expect(importConfig('not json')).toBeNull();
  });

  it('returns null for JSON missing required fields', () => {
    expect(importConfig('{}')).toBeNull();
    expect(importConfig('{"agents": []}')).toBeNull();
  });

  it('uses defaults for missing optional fields', () => {
    const minimal = JSON.stringify({ agents: [{ id: 'a', name: 'A', emoji: '⚡', color: '#fff', avatar: 'glasses' }], owner: { name: 'Test', emoji: '👤', avatar: 'boss' } });
    const parsed = importConfig(minimal);
    expect(parsed).not.toBeNull();
    expect(parsed!.gateway).toEqual(DEFAULT_GATEWAY);
    expect(parsed!.theme).toBe('default');
  });
});

// ---------------------------------------------------------------------------
// localStorage (loadConfig / saveConfig / clearConfig)
// ---------------------------------------------------------------------------

describe('localStorage persistence', () => {
  const mockStorage = new Map<string, string>();

  beforeEach(() => {
    mockStorage.clear();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => mockStorage.get(key) ?? null,
      setItem: (key: string, val: string) => mockStorage.set(key, val),
      removeItem: (key: string) => mockStorage.delete(key),
    });
    // Mock window.location.search for URL params
    vi.stubGlobal('location', { search: '' });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns defaults when nothing stored', () => {
    const config = loadConfig();
    expect(config.theme).toBe('default');
    expect(config.demoMode).toBe(false);
  });

  it('saves and loads config', () => {
    const config = { ...DEFAULT_CONFIG, theme: 'cyberpunk' as const };
    saveConfig(config);
    const loaded = loadConfig();
    expect(loaded.theme).toBe('cyberpunk');
  });

  it('clears stored config', () => {
    saveConfig(DEFAULT_CONFIG);
    clearConfig();
    // After clearing, should fall back to defaults
    const loaded = loadConfig();
    expect(loaded).toBeDefined();
  });

  it('applies URL params over stored config', () => {
    vi.stubGlobal('location', { search: '?gateway=http://custom:8080&token=secret' });
    const config = loadConfig();
    expect(config.gateway.url).toBe('http://custom:8080');
    expect(config.gateway.token).toBe('secret');
    expect(config.demoMode).toBe(false);
  });

  it('handles corrupted localStorage gracefully', () => {
    mockStorage.set('agent-dashboard-config', 'not valid json{{{');
    const config = loadConfig();
    expect(config).toBeDefined();
    expect(config.agents).toBeDefined();
  });
});
