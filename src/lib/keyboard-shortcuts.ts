// ============================================================================
// Keyboard Shortcuts — Core Definitions
// ============================================================================

import type { AgentConfig } from './types';

/** Shortcut categories */
export type ShortcutCategory = 
  | 'global'
  | 'navigation'
  | 'chat'
  | 'agent'
  | 'vim'
  | 'settings';

/** A keyboard shortcut definition */
export interface KeyboardShortcut {
  id: string;
  key: string;
  modifiers: ('ctrl' | 'alt' | 'shift' | 'meta')[];
  category: ShortcutCategory;
  description: string;
  action: string;
  // For key sequences (like 'g' then 'o')
  sequence?: string[];
  // For dynamic shortcuts (like selecting specific agents)
  dynamic?: boolean;
}

/** Shortcut key sequence state */
export interface KeySequenceState {
  sequence: string[];
  timeout: NodeJS.Timeout | null;
  maxDelay: number;
}

// ---------------------------------------------------------------------------
// Built-in Shortcuts
// ---------------------------------------------------------------------------

export const GLOBAL_SHORTCUTS: KeyboardShortcut[] = [
  // Global
  {
    id: 'command-palette',
    key: 'k',
    modifiers: ['ctrl'],
    category: 'global',
    description: 'Open command palette',
    action: 'open-command-palette',
  },
  {
    id: 'show-help',
    key: '?',
    modifiers: [],
    category: 'global',
    description: 'Show keyboard shortcuts help',
    action: 'show-shortcuts-help',
  },
  {
    id: 'show-help-f1',
    key: 'F1',
    modifiers: [],
    category: 'global',
    description: 'Show keyboard shortcuts help',
    action: 'show-shortcuts-help',
  },
  {
    id: 'toggle-theme',
    key: 't',
    modifiers: ['ctrl'],
    category: 'global',
    description: 'Toggle theme (light/dark)',
    action: 'toggle-theme',
  },
  {
    id: 'refresh-data',
    key: 'r',
    modifiers: ['ctrl'],
    category: 'global',
    description: 'Refresh dashboard data',
    action: 'refresh-data',
  },
  {
    id: 'toggle-fullscreen',
    key: 'f',
    modifiers: ['ctrl', 'shift'],
    category: 'global',
    description: 'Toggle fullscreen',
    action: 'toggle-fullscreen',
  },

  // Tab Navigation (Ctrl+1-4)
  {
    id: 'tab-1',
    key: '1',
    modifiers: ['ctrl'],
    category: 'navigation',
    description: 'Go to Dashboard tab',
    action: 'navigate-tab-1',
  },
  {
    id: 'tab-2',
    key: '2',
    modifiers: ['ctrl'],
    category: 'navigation',
    description: 'Go to Agents tab',
    action: 'navigate-tab-2',
  },
  {
    id: 'tab-3',
    key: '3',
    modifiers: ['ctrl'],
    category: 'navigation',
    description: 'Go to Chat tab',
    action: 'navigate-tab-3',
  },
  {
    id: 'tab-4',
    key: '4',
    modifiers: ['ctrl'],
    category: 'navigation',
    description: 'Go to Metrics tab',
    action: 'navigate-tab-4',
  },

  // Vim-style Navigation (g then key)
  {
    id: 'nav-overview',
    key: 'o',
    modifiers: [],
    category: 'vim',
    description: 'Go to Overview (press g first)',
    action: 'navigate-overview',
    sequence: ['g'],
  },
  {
    id: 'nav-achievements',
    key: 'a',
    modifiers: [],
    category: 'vim',
    description: 'Go to Achievements (press g first)',
    action: 'navigate-achievements',
    sequence: ['g'],
  },
  {
    id: 'nav-agents',
    key: 'ag',
    modifiers: [],
    category: 'vim',
    description: 'Go to Agents list (press g first)',
    action: 'navigate-agents',
    sequence: ['g'],
  },
  {
    id: 'nav-metrics',
    key: 'm',
    modifiers: [],
    category: 'vim',
    description: 'Go to Metrics (press g first)',
    action: 'navigate-metrics',
    sequence: ['g'],
  },
  {
    id: 'nav-settings',
    key: 's',
    modifiers: [],
    category: 'vim',
    description: 'Go to Settings (press g first)',
    action: 'navigate-settings',
    sequence: ['g'],
  },
  {
    id: 'vim-cancel',
    key: 'Escape',
    modifiers: [],
    category: 'vim',
    description: 'Cancel vim sequence',
    action: 'vim-cancel',
    sequence: ['g'],
  },

  // Chat Shortcuts
  {
    id: 'chat-send',
    key: 'Enter',
    modifiers: ['ctrl'],
    category: 'chat',
    description: 'Send message',
    action: 'chat-send',
  },
  {
    id: 'chat-close',
    key: 'Escape',
    modifiers: [],
    category: 'chat',
    description: 'Close chat / panel',
    action: 'chat-close',
  },
  {
    id: 'chat-newline',
    key: 'Enter',
    modifiers: [],
    category: 'chat',
    description: 'New line in message',
    action: 'chat-newline',
  },
  {
    id: 'chat-history',
    key: 'h',
    modifiers: ['ctrl'],
    category: 'chat',
    description: 'Toggle chat history',
    action: 'chat-history',
  },
  {
    id: 'chat-mention',
    key: '@',
    modifiers: [],
    category: 'chat',
    description: 'Mention an agent',
    action: 'chat-mention',
  },

  // Agent Actions
  {
    id: 'agent-select-next',
    key: 'j',
    modifiers: [],
    category: 'agent',
    description: 'Select next agent',
    action: 'agent-select-next',
  },
  {
    id: 'agent-select-prev',
    key: 'k',
    modifiers: [],
    category: 'agent',
    description: 'Select previous agent',
    action: 'agent-select-prev',
  },
  {
    id: 'agent-open-chat',
    key: 'c',
    modifiers: [],
    category: 'agent',
    description: 'Open chat with selected agent',
    action: 'agent-open-chat',
  },
  {
    id: 'agent-view-profile',
    key: 'p',
    modifiers: [],
    category: 'agent',
    description: 'View agent profile',
    action: 'agent-view-profile',
  },
  {
    id: 'agent-send-task',
    key: 't',
    modifiers: [],
    category: 'agent',
    description: 'Send task to agent',
    action: 'agent-send-task',
  },
  {
    id: 'agent-kill',
    key: 'd',
    modifiers: ['ctrl', 'shift'],
    category: 'agent',
    description: 'Kill selected agent session',
    action: 'agent-kill',
  },
  {
    id: 'agent-filter',
    key: 'f',
    modifiers: ['ctrl'],
    category: 'agent',
    description: 'Filter agents',
    action: 'agent-filter',
  },

  // Settings
  {
    id: 'settings-save',
    key: 's',
    modifiers: ['ctrl', 'shift'],
    category: 'settings',
    description: 'Save settings',
    action: 'settings-save',
  },
  {
    id: 'settings-reset',
    key: 'r',
    modifiers: ['ctrl', 'shift'],
    category: 'settings',
    description: 'Reset settings to default',
    action: 'settings-reset',
  },
  {
    id: 'settings-customize',
    key: ',',
    modifiers: ['ctrl'],
    category: 'settings',
    description: 'Open shortcut customization',
    action: 'settings-customize',
  },
];

// ---------------------------------------------------------------------------
// Shortcut Configuration & Customization
// ---------------------------------------------------------------------------

/** User-customized shortcut binding */
export interface ShortcutBinding {
  shortcutId: string;
  key: string;
  modifiers: ('ctrl' | 'alt' | 'shift' | 'meta')[];
  enabled: boolean;
}

/** Shortcut settings */
export interface ShortcutSettings {
  bindings: ShortcutBinding[];
  vimModeEnabled: boolean;
  showHints: boolean;
  customShortcuts: KeyboardShortcut[];
}

/** Default shortcut settings */
export const DEFAULT_SHORTCUT_SETTINGS: ShortcutSettings = {
  bindings: GLOBAL_SHORTCUTS.map(s => ({
    shortcutId: s.id,
    key: s.key,
    modifiers: s.modifiers,
    enabled: true,
  })),
  vimModeEnabled: true,
  showHints: true,
  customShortcuts: [],
};

// ---------------------------------------------------------------------------
// Helper Functions
// ---------------------------------------------------------------------------

/** Generate a unique key for a shortcut binding */
export function getShortcutKey(
  key: string,
  modifiers: ('ctrl' | 'alt' | 'shift' | 'meta')[]
): string {
  const modStr = modifiers.sort().join('+');
  return modStr ? `${modStr}+${key.toUpperCase()}` : key.toUpperCase();
}

/** Parse a keyboard event to get key and modifiers */
export function parseKeyboardEvent(e: KeyboardEvent): {
  key: string;
  modifiers: ('ctrl' | 'alt' | 'shift' | 'meta')[];
} {
  const modifiers: ('ctrl' | 'alt' | 'shift' | 'meta')[] = [];
  
  if (e.ctrlKey) modifiers.push('ctrl');
  if (e.altKey) modifiers.push('alt');
  if (e.shiftKey) modifiers.push('shift');
  if (e.metaKey) modifiers.push('meta');
  
  // Normalize key
  let key = e.key;
  if (key === 'ArrowUp') key = 'up';
  if (key === 'ArrowDown') key = 'down';
  if (key === 'ArrowLeft') key = 'left';
  if (key === 'ArrowRight') key = 'right';
  if (key === ' ') key = 'space';
  
  return { key: key.toLowerCase(), modifiers };
}

/** Find matching shortcut for a keyboard event */
export function findMatchingShortcut(
  event: { key: string; modifiers: ('ctrl' | 'alt' | 'shift' | 'meta')[] },
  shortcuts: KeyboardShortcut[]
): KeyboardShortcut | null {
  const key = event.key.toLowerCase();
  const mods = [...event.modifiers].sort();
  
  for (const shortcut of shortcuts) {
    if (!true) continue;
    
    const shortcutKey = shortcut.key.toLowerCase();
    const shortcutMods = [...shortcut.modifiers].sort();
    
    if (shortcutKey === key && 
        mods.length === shortcutMods.length &&
        mods.every((m, i) => m === shortcutMods[i])) {
      return shortcut;
    }
  }
  
  return null;
}

/** Search shortcuts by query */
export function searchShortcuts(
  query: string,
  shortcuts: KeyboardShortcut[]
): KeyboardShortcut[] {
  const lower = query.toLowerCase();
  
  return shortcuts.filter(s => 
    s.description.toLowerCase().includes(lower) ||
    s.id.toLowerCase().includes(lower) ||
    s.category.toLowerCase().includes(lower)
  );
}

/** Get keyboard shortcut display string */
export function getShortcutDisplay(
  key: string,
  modifiers: ('ctrl' | 'alt' | 'shift' | 'meta')[]
): string {
  const labels: Record<string, string> = {
    ctrl: 'Ctrl',
    alt: 'Alt',
    shift: 'Shift',
    meta: '⌘',
  };
  
  const parts = [...modifiers].map(m => labels[m] || m);
  parts.push(key.toUpperCase());
  
  return parts.join('+');
}

/** Category icons */
export const CATEGORY_ICONS: Record<ShortcutCategory, string> = {
  global: '🌐',
  navigation: '🧭',
  chat: '💬',
  agent: '🤖',
  vim: '⌨️',
  settings: '⚙️',
};

/** Category labels */
export const CATEGORY_LABELS: Record<ShortcutCategory, string> = {
  global: 'Global',
  navigation: 'Navigation',
  chat: 'Chat',
  agent: 'Agent Actions',
  vim: 'Vim Mode',
  settings: 'Settings',
};
