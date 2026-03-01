'use client';

import { useEffect, useCallback, useRef, useState } from 'react';
import {
  GLOBAL_SHORTCUTS,
  parseKeyboardEvent,
  findMatchingShortcut,
  searchShortcuts,
  type KeyboardShortcut,
  type ShortcutSettings,
  type KeySequenceState,
  DEFAULT_SHORTCUT_SETTINGS,
} from '@/lib/keyboard-shortcuts';

/** Callback for shortcut actions */
export type ShortcutCallback = (action: string, data?: unknown) => void;

/** Hook options */
export interface UseKeyboardShortcutsOptions {
  /** Callback when a shortcut is triggered */
  onShortcut?: ShortcutCallback;
  /** Enable vim-style key sequences */
  vimMode?: boolean;
  /** Enable shortcut hints */
  showHints?: boolean;
  /** Disable all shortcuts */
  disabled?: boolean;
  /** Custom shortcuts to add */
  customShortcuts?: KeyboardShortcut[];
  /** Input selector - when focused, shortcuts are handled differently */
  inputSelector?: string;
}

/** Hook return type */
export interface UseKeyboardShortcutsReturn {
  /** Current vim sequence state */
  vimSequence: string[];
  /** Whether vim mode is active */
  isVimActive: boolean;
  /** Search shortcuts */
  search: (query: string) => KeyboardShortcut[];
  /** Get all shortcuts */
  getShortcuts: () => KeyboardShortcut[];
  /** Trigger a shortcut action manually */
  trigger: (action: string, data?: unknown) => void;
  /** Update settings */
  updateSettings: (settings: Partial<ShortcutSettings>) => void;
  /** Current settings */
  settings: ShortcutSettings;
}

/** Hook for keyboard shortcut handling */
export function useKeyboardShortcuts({
  onShortcut,
  vimMode = true,
  showHints = true,
  disabled = false,
  customShortcuts = [],
  inputSelector = 'input, textarea, [contenteditable]',
}: UseKeyboardShortcutsOptions = {}): UseKeyboardShortcutsReturn {
  const [settings, setSettings] = useState<ShortcutSettings>(() => ({
    ...DEFAULT_SHORTCUT_SETTINGS,
    vimModeEnabled: vimMode,
    showHints: showHints,
  }));
  
  const [vimSequence, setVimSequence] = useState<string[]>([]);
  const vimTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<Element | null>(null);
  
  // Combine built-in and custom shortcuts
  const allShortcuts = useCallback(() => {
    return [...GLOBAL_SHORTCUTS, ...customShortcuts];
  }, [customShortcuts]);
  
  // Handle vim sequence matching
  const checkVimSequence = useCallback((key: string): KeyboardShortcut | null => {
    if (!settings.vimModeEnabled || vimSequence.length === 0) return null;
    
    const newSequence = [...vimSequence, key];
    
    // Check if any shortcut matches this sequence
    for (const shortcut of allShortcuts()) {
      if (shortcut.sequence && shortcut.sequence.join('') === newSequence.join('')) {
        return shortcut;
      }
    }
    
    // Check for partial match
    const hasPartialMatch = allShortcuts().some(
      s => s.sequence && s.sequence.slice(0, newSequence.length).join('') === newSequence.join('')
    );
    
    if (hasPartialMatch) {
      setVimSequence(newSequence);
      // Clear timeout and set new one
      if (vimTimeoutRef.current) clearTimeout(vimTimeoutRef.current);
      vimTimeoutRef.current = setTimeout(() => {
        setVimSequence([]);
      }, 1000);
      return null;
    }
    
    // No match - clear sequence
    setVimSequence([]);
    return null;
  }, [vimSequence, settings.vimModeEnabled, allShortcuts]);
  
  // Handle keyboard events
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (disabled) return;
    
    // Check if user is in an input field
    const target = e.target as Element;
    const isInputFocused = target.closest(inputSelector);
    
    const { key, modifiers } = parseKeyboardEvent(e);
    
    // Handle vim sequence start
    if (settings.vimModeEnabled && !isInputFocused) {
      if (vimSequence.length === 0 && key === 'g') {
        e.preventDefault();
        setVimSequence(['g']);
        if (vimTimeoutRef.current) clearTimeout(vimTimeoutRef.current);
        vimTimeoutRef.current = setTimeout(() => {
          setVimSequence([]);
        }, 1000);
        return;
      }
      
      if (vimSequence.length > 0) {
        const vimShortcut = checkVimSequence(key);
        if (vimShortcut) {
          e.preventDefault();
          setVimSequence([]);
          if (vimTimeoutRef.current) {
            clearTimeout(vimTimeoutRef.current);
            vimTimeoutRef.current = null;
          }
          onShortcut?.(vimShortcut.action);
          return;
        }
        // No match - clear sequence
        if (key !== 'g') {
          setVimSequence([]);
        }
      }
    }
    
    // Skip most shortcuts when in input (except explicit shortcuts)
    if (isInputFocused) {
      // Allow Ctrl+Enter to send in chat inputs
      if (key === 'Enter' && modifiers.includes('ctrl')) {
        e.preventDefault();
        onShortcut?.('chat-send');
        return;
      }
      // Allow Escape to blur
      if (key === 'Escape') {
        (target as HTMLElement).blur?.();
        onShortcut?.('chat-close');
        return;
      }
      return;
    }
    
    // Find matching shortcut
    const shortcut = findMatchingShortcut({ key, modifiers }, allShortcuts());
    
    if (shortcut) {
      e.preventDefault();
      onShortcut?.(shortcut.action);
    }
  }, [disabled, settings.vimModeEnabled, vimSequence, inputSelector, checkVimSequence, onShortcut, allShortcuts]);
  
  // Set up event listener
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (vimTimeoutRef.current) clearTimeout(vimTimeoutRef.current);
    };
  }, [handleKeyDown]);
  
  // Update settings
  const updateSettings = useCallback((newSettings: Partial<ShortcutSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  }, []);
  
  // Search shortcuts
  const search = useCallback((query: string) => {
    return searchShortcuts(query, allShortcuts());
  }, [allShortcuts]);
  
  // Get all shortcuts
  const getShortcuts = useCallback(() => {
    return allShortcuts();
  }, [allShortcuts]);
  
  // Trigger action manually
  const trigger = useCallback((action: string, data?: unknown) => {
    onShortcut?.(action, data);
  }, [onShortcut]);
  
  return {
    vimSequence,
    isVimActive: vimSequence.length > 0,
    search,
    getShortcuts,
    trigger,
    updateSettings,
    settings,
  };
}

export default useKeyboardShortcuts;
