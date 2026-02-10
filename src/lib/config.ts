// ============================================================================
// Configuration Management
// ============================================================================

import type {
  DashboardConfig,
  AgentConfig,
  OwnerConfig,
  GatewayConfig,
  ThemeName,
  AgentAvatar,
  OwnerAvatar,
} from './types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const MAX_AGENTS = 6;

export const AGENT_COLOR_PALETTE = [
  '#4FC3F7', // blue
  '#FF7043', // orange
  '#66BB6A', // green
  '#AB47BC', // purple
  '#FFCA28', // yellow
  '#EF5350', // red
];

export const AVATAR_OPTIONS: AgentAvatar[] = ['glasses', 'hoodie', 'suit', 'casual', 'robot', 'cat', 'dog'];
export const OWNER_AVATAR_OPTIONS: OwnerAvatar[] = ['boss', 'casual', 'creative'];

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

export const DEFAULT_GATEWAY: GatewayConfig = {
  url: 'http://localhost:18789',
  token: '',
};

export const DEFAULT_OWNER: OwnerConfig = {
  name: 'Boss',
  emoji: '👔',
  avatar: 'boss',
};

export const DEFAULT_AGENTS: AgentConfig[] = [
  { id: 'main', name: 'Claude', emoji: '⚡', color: '#4FC3F7', avatar: 'glasses' },
  { id: 'agent-2', name: 'GPT', emoji: '🔥', color: '#FF7043', avatar: 'hoodie' },
  { id: 'agent-3', name: 'Gemini', emoji: '🌟', color: '#66BB6A', avatar: 'suit' },
];

export const DEFAULT_CONFIG: DashboardConfig = {
  agents: DEFAULT_AGENTS,
  owner: DEFAULT_OWNER,
  gateway: DEFAULT_GATEWAY,
  theme: 'default',
  connected: false,
  demoMode: true,
};

// ---------------------------------------------------------------------------
// localStorage Persistence
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'agent-dashboard-config';

/** Load config from localStorage, falling back to defaults */
export function loadConfig(): DashboardConfig {
  if (typeof window === 'undefined') return { ...DEFAULT_CONFIG };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return applyUrlParams({ ...DEFAULT_CONFIG });
    const parsed = JSON.parse(raw) as Partial<DashboardConfig>;
    const config: DashboardConfig = {
      agents: Array.isArray(parsed.agents) ? parsed.agents.slice(0, MAX_AGENTS) : DEFAULT_CONFIG.agents,
      owner: parsed.owner ?? DEFAULT_CONFIG.owner,
      gateway: parsed.gateway ?? DEFAULT_CONFIG.gateway,
      theme: parsed.theme ?? DEFAULT_CONFIG.theme,
      connected: false,
      demoMode: parsed.demoMode ?? true,
    };
    return applyUrlParams(config);
  } catch {
    return applyUrlParams({ ...DEFAULT_CONFIG });
  }
}

/** Save config to localStorage */
export function saveConfig(config: DashboardConfig): void {
  if (typeof window === 'undefined') return;
  const serializable = {
    agents: config.agents,
    owner: config.owner,
    gateway: config.gateway,
    theme: config.theme,
    demoMode: config.demoMode,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(serializable));
}

/** Clear stored config */
export function clearConfig(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}

/** Export config as JSON string */
export function exportConfig(config: DashboardConfig): string {
  return JSON.stringify({
    agents: config.agents,
    owner: config.owner,
    gateway: config.gateway,
    theme: config.theme,
  }, null, 2);
}

/** Import config from JSON string */
export function importConfig(json: string): DashboardConfig | null {
  try {
    const parsed = JSON.parse(json);
    if (!parsed.agents || !parsed.owner) return null;
    return {
      agents: parsed.agents,
      owner: parsed.owner,
      gateway: parsed.gateway ?? DEFAULT_GATEWAY,
      theme: parsed.theme ?? 'default',
      connected: false,
      demoMode: true,
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// URL parameter overrides
// ---------------------------------------------------------------------------

function applyUrlParams(config: DashboardConfig): DashboardConfig {
  if (typeof window === 'undefined') return config;
  try {
    const params = new URLSearchParams(window.location.search);
    const gateway = params.get('gateway');
    const token = params.get('token');
    if (gateway) {
      config.gateway.url = gateway;
      config.demoMode = false;
    }
    if (token) {
      config.gateway.token = token;
    }
  } catch {
    // ignore
  }
  return config;
}

// ---------------------------------------------------------------------------
// Mutation helpers (return new config objects for React state)
// ---------------------------------------------------------------------------

export function updateGateway(config: DashboardConfig, gw: Partial<GatewayConfig>): DashboardConfig {
  return { ...config, gateway: { ...config.gateway, ...gw } };
}

export function updateOwner(config: DashboardConfig, owner: Partial<OwnerConfig>): DashboardConfig {
  return { ...config, owner: { ...config.owner, ...owner } };
}

export function updateTheme(config: DashboardConfig, theme: ThemeName): DashboardConfig {
  return { ...config, theme };
}

export function addAgent(config: DashboardConfig, agent: AgentConfig): DashboardConfig {
  if (config.agents.length >= MAX_AGENTS) return config;
  return { ...config, agents: [...config.agents, agent] };
}

export function removeAgent(config: DashboardConfig, id: string): DashboardConfig {
  return { ...config, agents: config.agents.filter(a => a.id !== id) };
}

export function updateAgent(config: DashboardConfig, id: string, patch: Partial<AgentConfig>): DashboardConfig {
  return {
    ...config,
    agents: config.agents.map(a => (a.id === id ? { ...a, ...patch } : a)),
  };
}
