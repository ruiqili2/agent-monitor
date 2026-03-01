'use client';

import React, { useEffect, useState } from 'react';

interface Shortcut {
  key: string;
  description: string;
  category: string;
}

const SHORTCUTS: Shortcut[] = [
  { key: 'Ctrl+K', description: 'Command Palette', category: 'Navigation' },
  { key: 'Ctrl+T', description: 'Toggle Theme', category: 'Navigation' },
  { key: 'Ctrl+F', description: 'Filter Agents', category: 'Navigation' },
  { key: 'Ctrl+G', description: 'Toggle Office View', category: 'Navigation' },
  { key: 'Ctrl+H', description: 'Chat History', category: 'Navigation' },
  { key: 'Ctrl+R', description: 'Refresh Data', category: 'Navigation' },
  { key: 'Esc', description: 'Close Panel', category: 'Navigation' },
  { key: 'Ctrl+S', description: 'Save Settings', category: 'Settings' },
  { key: 'Ctrl+D', description: 'Toggle Demo Mode', category: 'Settings' },
  { key: 'F1', description: 'Show Shortcuts', category: 'Help' },
];

interface KeyboardShortcutsProps {
  isOpen: boolean;
  onClose: () => void;
  onShortcut?: (shortcut: string) => void;
}

export function KeyboardShortcuts({ isOpen, onClose, onShortcut }: KeyboardShortcutsProps) {
  const [showShortcuts, setShowShortcuts] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // F1 to show shortcuts
      if (e.key === 'F1') {
        e.preventDefault();
        setShowShortcuts(true);
        return;
      }

      // Ctrl+K for command palette
      if (e.ctrlKey && e.key === 'k') {
        e.preventDefault();
        onShortcut?.('command-palette');
        return;
      }

      // Ctrl+T for theme toggle
      if (e.ctrlKey && e.key === 't') {
        e.preventDefault();
        onShortcut?.('toggle-theme');
        return;
      }

      // Ctrl+G for office view
      if (e.ctrlKey && e.key === 'g') {
        e.preventDefault();
        onShortcut?.('toggle-office');
        return;
      }

      // Esc to close
      if (e.key === 'Escape') {
        onClose();
        setShowShortcuts(false);
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onShortcut, onClose]);

  if (!isOpen && !showShortcuts) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-[var(--border)] flex justify-between items-center">
          <h2 className="text-xl font-bold text-[var(--text-primary)]">
            ⌨️ Keyboard Shortcuts
          </h2>
          <button
            onClick={() => {
              setShowShortcuts(false);
              onClose();
            }}
            className="p-2 hover:bg-[var(--bg-secondary)] rounded-lg transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Shortcuts Grid */}
        <div className="p-4 overflow-y-auto max-h-[60vh]">
          {['Navigation', 'Settings', 'Help'].map((category) => (
            <div key={category} className="mb-6">
              <h3 className="text-sm font-bold text-[var(--text-secondary)] mb-3 uppercase">
                {category}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {SHORTCUTS.filter(s => s.category === category).map((shortcut) => (
                  <div
                    key={shortcut.key}
                    className="flex justify-between items-center p-3 rounded-lg bg-[var(--bg-secondary)]"
                  >
                    <span className="text-sm text-[var(--text-primary)]">
                      {shortcut.description}
                    </span>
                    <kbd className="px-3 py-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border)] text-xs font-mono text-[var(--accent-primary)]">
                      {shortcut.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--border)] bg-[var(--bg-secondary)]">
          <p className="text-xs text-[var(--text-secondary)] text-center">
            Press <kbd className="px-2 py-1 rounded bg-[var(--bg-card)] border border-[var(--border)]">F1</kbd> anytime to view shortcuts
          </p>
        </div>
      </div>
    </div>
  );
}

export default KeyboardShortcuts;
