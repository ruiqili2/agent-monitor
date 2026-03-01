'use client';

import React, { useState, useEffect } from 'react';
import {
  GLOBAL_SHORTCUTS,
  CATEGORY_ICONS,
  CATEGORY_LABELS,
  getShortcutDisplay,
  type ShortcutCategory,
  type KeyboardShortcut,
} from '@/lib/keyboard-shortcuts';

interface ShortcutHelpProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called when user wants to customize shortcuts */
  onCustomize?: () => void;
  /** Vim mode enabled state */
  vimModeEnabled?: boolean;
  /** Toggle vim mode */
  onToggleVimMode?: (enabled: boolean) => void;
}

/** Group shortcuts by category */
function groupByCategory(shortcuts: KeyboardShortcut[]): Record<ShortcutCategory, KeyboardShortcut[]> {
  const groups: Record<ShortcutCategory, KeyboardShortcut[]> = {
    global: [],
    navigation: [],
    chat: [],
    agent: [],
    vim: [],
    settings: [],
  };
  
  for (const shortcut of shortcuts) {
    if (groups[shortcut.category]) {
      groups[shortcut.category].push(shortcut);
    }
  }
  
  return groups;
}

export function ShortcutHelp({
  isOpen,
  onClose,
  onCustomize,
  vimModeEnabled = true,
  onToggleVimMode,
}: ShortcutHelpProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'global' | 'vim'>('all');
  const [showVimOnly, setShowVimOnly] = useState(false);
  
  // Group shortcuts
  const groupedShortcuts = groupByCategory(GLOBAL_SHORTCUTS);
  
  // Handle escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);
  
  if (!isOpen) return null;
  
  const categories: ShortcutCategory[] = ['global', 'navigation', 'chat', 'agent', 'vim', 'settings'];
  
  // Filter which categories to show
  const visibleCategories = showVimOnly 
    ? ['vim' as ShortcutCategory]
    : activeTab === 'global' 
      ? ['global' as ShortcutCategory]
      : categories;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-3xl bg-[var(--bg-card)] border border-[var(--border)] rounded-xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⌨️</span>
            <div>
              <h2 className="text-xl font-bold text-[var(--text-primary)]">
                Keyboard Shortcuts
              </h2>
              <p className="text-sm text-[var(--text-secondary)]">
                Press <kbd className="px-1.5 py-0.5 bg-[var(--bg-secondary)] rounded text-xs">?</kbd> or <kbd className="px-1.5 py-0.5 bg-[var(--bg-secondary)] rounded text-xs">F1</kbd> to show this help
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[var(--bg-secondary)] rounded-lg transition-colors text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Tabs */}
        <div className="flex items-center gap-2 p-3 border-b border-[var(--border)] bg-[var(--bg-secondary)]">
          <button
            onClick={() => { setActiveTab('all'); setShowVimOnly(false); }}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'all' && !showVimOnly
                ? 'bg-[var(--accent-primary)] text-white'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-card)]'
            }`}
          >
            All Shortcuts
          </button>
          <button
            onClick={() => { setActiveTab('global'); setShowVimOnly(false); }}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'global' && !showVimOnly
                ? 'bg-[var(--accent-primary)] text-white'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-card)]'
            }`}
          >
            Global
          </button>
          <button
            onClick={() => { setActiveTab('vim'); setShowVimOnly(true); }}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
              showVimOnly
                ? 'bg-[var(--accent-primary)] text-white'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-card)]'
            }`}
          >
            <span>⌨️</span> Vim Mode
          </button>
          
          <div className="flex-1" />
          
          {onToggleVimMode && (
            <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)] cursor-pointer">
              <input
                type="checkbox"
                checked={vimModeEnabled}
                onChange={e => onToggleVimMode(e.target.checked)}
                className="rounded border-[var(--border)] bg-[var(--bg-card)] text-[var(--accent-primary)]"
              />
              Enable Vim Mode
            </label>
          )}
          
          {onCustomize && (
            <button
              onClick={onCustomize}
              className="px-3 py-1.5 text-sm rounded-lg bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              Customize
            </button>
          )}
        </div>
        
        {/* Shortcuts Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {visibleCategories.map(category => {
            const shortcuts = groupedShortcuts[category];
            if (shortcuts.length === 0) return null;
            
            return (
              <div key={category} className="mb-6 last:mb-0">
                <h3 className="flex items-center gap-2 text-sm font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-3">
                  <span>{CATEGORY_ICONS[category]}</span>
                  <span>{CATEGORY_LABELS[category]}</span>
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {shortcuts.map(shortcut => (
                    <div
                      key={shortcut.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--bg-secondary)]/80 transition-colors"
                    >
                      <span className="text-sm text-[var(--text-primary)]">
                        {shortcut.description}
                        {shortcut.sequence && shortcut.sequence.length > 0 && (
                          <span className="ml-2 text-xs text-[var(--accent-primary)]">
                            ({shortcut.sequence.join(' → ')})
                          </span>
                        )}
                      </span>
                      <kbd className="px-2.5 py-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border)] text-xs font-mono text-[var(--accent-primary)] whitespace-nowrap">
                        {getShortcutDisplay(shortcut.key, shortcut.modifiers)}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          
          {showVimOnly && (
            <div className="mt-4 p-4 rounded-lg bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/20">
              <h4 className="font-bold text-[var(--text-primary)] mb-2">💡 Vim Mode Tips</h4>
              <ul className="text-sm text-[var(--text-secondary)] space-y-1">
                <li>• Press <kbd className="px-1.5 py-0.5 bg-[var(--bg-card)] rounded text-xs">g</kbd> then another key to navigate</li>
                <li>• <kbd className="px-1.5 py-0.5 bg-[var(--bg-card)] rounded text-xs">g</kbd> + <kbd className="px-1.5 py-0.5 bg-[var(--bg-card)] rounded text-xs">o</kbd> = Overview</li>
                <li>• <kbd className="px-1.5 py-0.5 bg-[var(--bg-card)] rounded text-xs">g</kbd> + <kbd className="px-1.5 py-0.5 bg-[var(--bg-card)] rounded text-xs">a</kbd> = Achievements</li>
                <li>• <kbd className="px-1.5 py-0.5 bg-[var(--bg-card)] rounded text-xs">g</kbd> + <kbd className="px-1.5 py-0.5 bg-[var(--bg-card)] rounded text-xs">Escape</kbd> = Cancel</li>
              </ul>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="p-4 border-t border-[var(--border)] bg-[var(--bg-secondary)]">
          <p className="text-xs text-[var(--text-secondary)] text-center">
            Tip: Press <kbd className="px-2 py-1 rounded bg-[var(--bg-card)] border border-[var(--border)] text-xs">Ctrl+K</kbd> to open the command palette
          </p>
        </div>
      </div>
    </div>
  );
}

export default ShortcutHelp;
