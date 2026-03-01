'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChatMessage } from '@/lib/types';

interface GlobalChatPanelProps {
  messages: ChatMessage[];
  connected: boolean;
  demoMode: boolean;
  totalAgents: number;
  onSend: (message: string) => void | Promise<void>;
}

type FilterTab = 'all' | 'broadcast' | 'direct' | 'system';

const FILTERS: Array<{ key: FilterTab; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'broadcast', label: 'Broadcasts' },
  { key: 'direct', label: 'Direct' },
  { key: 'system', label: 'System' },
];

export default function GlobalChatPanel({
  messages,
  connected,
  demoMode,
  totalAgents,
  onSend,
}: GlobalChatPanelProps) {
  const [input, setInput] = useState('');
  const [tab, setTab] = useState<FilterTab>('all');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    if (tab === 'all') return messages;
    if (tab === 'broadcast') return messages.filter((message) => message.scope === 'broadcast');
    if (tab === 'direct') return messages.filter((message) => message.scope === 'direct');
    return messages.filter((message) => message.role === 'system');
  }, [messages, tab]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [filtered.length]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      await onSend(text);
      setInput('');
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-pixel text-sm flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <span>📣</span>
          <span>Team Chat</span>
        </h2>
        <div className="text-[10px] font-mono" style={{ color: 'var(--text-secondary)' }}>
          {connected ? `${totalAgents} targets live` : demoMode ? 'Demo mode' : 'Offline'}
        </div>
      </div>

      <div
        className="rounded-xl p-3"
        style={{
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border)',
        }}
      >
        <div className="flex flex-wrap gap-1 mb-3">
          {FILTERS.map((filter) => (
            <button
              key={filter.key}
              onClick={() => setTab(filter.key)}
              className="text-[10px] font-mono px-2 py-1 rounded-md transition-colors"
              style={{
                backgroundColor: tab === filter.key ? 'var(--accent-primary)20' : 'transparent',
                color: tab === filter.key ? 'var(--accent-primary)' : 'var(--text-secondary)',
                border: `1px solid ${tab === filter.key ? 'var(--accent-primary)40' : 'transparent'}`,
              }}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <div
          ref={scrollRef}
          className="max-h-72 overflow-y-auto space-y-2 pr-1"
        >
          {filtered.length === 0 && (
            <div className="text-center py-8">
              <span className="text-2xl block mb-2">💬</span>
              <p className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
                Broadcast to every primary agent and watch replies land here.
              </p>
            </div>
          )}

          {filtered.map((message) => (
            <div
              key={message.id}
              className="rounded-lg px-3 py-2"
              style={{
                backgroundColor: message.role === 'user'
                  ? 'var(--accent-primary)18'
                  : message.role === 'system'
                    ? 'var(--bg-secondary)'
                    : 'rgba(255,255,255,0.03)',
                border: '1px solid var(--border)',
              }}
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[10px] font-mono" style={{ color: 'var(--text-secondary)' }}>
                  {message.agentEmoji} {message.agentName}
                </span>
                <span className="text-[9px] font-mono" style={{ color: 'var(--text-secondary)' }}>
                  {new Date(message.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <p className="text-xs whitespace-pre-wrap break-words" style={{ color: 'var(--text-primary)' }}>
                {message.content}
              </p>
              <div className="mt-1 text-[9px] font-mono" style={{ color: 'var(--text-secondary)' }}>
                {message.scope.toUpperCase()}
                {message.targetIds?.length ? ` • ${message.targetIds.length} target${message.targetIds.length === 1 ? '' : 's'}` : ''}
              </div>
            </div>
          ))}
          <div ref={endRef} />
        </div>

        <div className="mt-3 flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void handleSend();
              }
            }}
            rows={2}
            placeholder="Broadcast a message to all primary agents..."
            className="flex-1 bg-[var(--bg-secondary)] text-[var(--text-primary)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:border-[var(--accent-primary)] placeholder:text-[var(--text-secondary)]"
          />
          <button
            onClick={() => void handleSend()}
            disabled={sending}
            className="px-3 sm:px-4 py-2.5 sm:py-2 rounded-xl text-sm font-mono transition-opacity disabled:opacity-50 touch-manipulation min-w-[60px]"
            style={{ backgroundColor: 'var(--accent-primary)', color: '#000' }}
          >
            {sending ? '...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
}
