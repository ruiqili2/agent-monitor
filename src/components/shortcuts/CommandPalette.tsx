'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  GLOBAL_SHORTCUTS,
  searchShortcuts,
  type KeyboardShortcut,
  CATEGORY_ICONS,
  CATEGORY_LABELS,
  getShortcutDisplay,
} from '@/lib/keyboard-shortcuts';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onAction: (action: string) => void;
  /** Optional: custom commands beyond shortcuts */
  customCommands?: {
    id: string;
    label: string;
    icon?: string;
    category?: string;
    action: string;
    keywords?: string[];
  }[];
}

/** Extended command including both shortcuts and custom commands */
interface CommandItem extends KeyboardShortcut {
  label: string;
  icon?: string;
  keywords?: string[];
}

export function CommandPalette({
  isOpen,
  onClose,
  onAction,
  customCommands = [],
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  
  // Convert shortcuts and custom commands to unified command items
  const allCommands = useMemo<CommandItem[]>(() => {
    const shortcutCommands: CommandItem[] = GLOBAL_SHORTCUTS.map(s => ({
      ...s,
      label: s.description,
      icon: CATEGORY_ICONS[s.category],
      keywords: [s.id, s.description.toLowerCase(), s.category],
    }));
    
    const customCommandItems: CommandItem[] = customCommands.map(c => ({
      id: c.id,
      key: '',
      modifiers: [],
      category: 'global',
      description: c.label,
      action: c.action,
      label: c.label,
      icon: c.icon,
      keywords: c.keywords,
      dynamic: true,
    }));
    
    return [...customCommandItems, ...shortcutCommands];
  }, [customCommands]);
  
  // Filter commands based on query
  const filteredCommands = useMemo(() => {
    if (!query.trim()) return allCommands.slice(0, 10);
    
    const lowerQuery = query.toLowerCase();
    return allCommands.filter(cmd => {
      const searchText = [
        cmd.label,
        cmd.id,
        cmd.description,
        cmd.keywords?.join(' '),
        CATEGORY_LABELS[cmd.category],
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      
      return searchText.includes(lowerQuery);
    }).slice(0, 15);
  }, [query, allCommands]);
  
  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);
  
  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);
  
  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, filteredCommands.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          onAction(filteredCommands[selectedIndex].action);
          onClose();
        }
        break;
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
    }
  }, [filteredCommands, selectedIndex, onAction, onClose]);
  
  // Scroll selected item into view
  useEffect(() => {
    const selectedEl = listRef.current?.children[selectedIndex] as HTMLElement;
    selectedEl?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Palette */}
      <div className="relative w-full max-w-xl bg-[var(--bg-card)] border border-[var(--border)] rounded-xl shadow-2xl overflow-hidden">
        {/* Search Input */}
        <div className="flex items-center gap-3 p-4 border-b border-[var(--border)]">
          <span className="text-xl">🔍</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or search shortcuts..."
            className="flex-1 bg-transparent text-[var(--text-primary)] text-lg placeholder-[var(--text-secondary)] outline-none"
            autoComplete="off"
            spellCheck={false}
          />
          <kbd className="px-2 py-1 text-xs font-mono bg-[var(--bg-secondary)] text-[var(--text-secondary)] rounded border border-[var(--border)]">
            ESC
          </kbd>
        </div>
        
        {/* Results */}
        <div ref={listRef} className="max-h-[50vh] overflow-y-auto p-2">
          {filteredCommands.length === 0 ? (
            <div className="p-8 text-center text-[var(--text-secondary)]">
              <p className="text-lg mb-2">No commands found</p>
              <p className="text-sm">Try a different search term</p>
            </div>
          ) : (
            filteredCommands.map((cmd, index) => (
              <button
                key={cmd.id}
                onClick={() => {
                  onAction(cmd.action);
                  onClose();
                }}
                onMouseEnter={() => setSelectedIndex(index)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                  index === selectedIndex
                    ? 'bg-[var(--accent-primary)]/20 text-[var(--text-primary)]'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'
                }`}
              >
                <span className="text-lg">{cmd.icon || '⚡'}</span>
                <span className="flex-1">{cmd.label}</span>
                {cmd.key && (
                  <kbd className="px-2 py-1 text-xs font-mono bg-[var(--bg-card)] text-[var(--text-secondary)] rounded border border-[var(--border)]">
                    {getShortcutDisplay(cmd.key, cmd.modifiers)}
                  </kbd>
                )}
              </button>
            ))
          )}
        </div>
        
        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--border)] bg-[var(--bg-secondary)] text-xs text-[var(--text-secondary)]">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-[var(--bg-card)] rounded border border-[var(--border)]">↑↓</kbd>
              Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-[var(--bg-card)] rounded border border-[var(--border)]">↵</kbd>
              Select
            </span>
          </div>
          <span>{filteredCommands.length} commands</span>
        </div>
      </div>
    </div>
  );
}

export default CommandPalette;
