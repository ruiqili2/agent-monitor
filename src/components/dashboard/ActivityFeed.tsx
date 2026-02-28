// ============================================================================
// ActivityFeed — Real-time activity event list
// ============================================================================

'use client';

import { useEffect, useRef } from 'react';
import DOMPurify from 'dompurify';
import type { ActivityEvent } from '@/lib/types';
import { formatRelativeTime } from '@/lib/state-mapper';

interface ActivityFeedProps {
  events: ActivityEvent[];
  maxHeight?: number;
}

const EVENT_STYLES: Record<ActivityEvent['type'], { icon: string; color: string }> = {
  state_change: { icon: '🔄', color: '#4FC3F7' },
  task_start:   { icon: '▶️', color: '#66BB6A' },
  task_complete: { icon: '✅', color: '#66BB6A' },
  task_fail:    { icon: '❌', color: '#EF5350' },
  tool_call:    { icon: '🔧', color: '#FFCA28' },
  message:      { icon: '💬', color: '#AB47BC' },
  error:        { icon: '🚨', color: '#EF5350' },
  system:       { icon: '🖥️', color: '#78909C' },
};

export default function ActivityFeed({ events, maxHeight = 400 }: ActivityFeedProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);

  useEffect(() => {
    if (scrollRef.current && isAtBottomRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [events.length]);

  return (
    <div>
      <h2 className="font-pixel text-sm mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
        <span>📡</span>
        <span>Activity Feed</span>
      </h2>
      <div
        ref={scrollRef}
        className="rounded-xl overflow-y-auto space-y-1 p-3"
        style={{
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border)',
          maxHeight,
        }}
        onScroll={() => {
          if (scrollRef.current) {
            isAtBottomRef.current = scrollRef.current.scrollTop < 10;
          }
        }}
      >
        {events.length === 0 && (
          <div className="text-center py-8">
            <span className="text-2xl block mb-2">📡</span>
            <p className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
              Waiting for events...
            </p>
          </div>
        )}
        {events.map(event => {
          const style = EVENT_STYLES[event.type] ?? EVENT_STYLES.system;
          return (
            <div
              key={event.id}
              className="flex items-start gap-2 rounded-lg px-2 py-1.5 hover:bg-white/5 transition-colors"
            >
              <span className="text-xs flex-shrink-0 mt-0.5">{style.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-mono font-bold" style={{ color: style.color }}>
                    {event.agentEmoji} {event.agentName}
                  </span>
                  <span className="text-[9px] font-mono" style={{ color: 'var(--text-secondary)' }}>
                    {formatRelativeTime(event.timestamp)}
                  </span>
                </div>
                <p className="text-xs truncate" style={{ color: 'var(--text-primary)' }}>
                  {DOMPurify.sanitize(event.message)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
