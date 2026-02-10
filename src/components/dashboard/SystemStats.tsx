// ============================================================================
// SystemStats — Top statistics bar
// ============================================================================

'use client';

import { useEffect, useState } from 'react';
import type { SystemStats as SystemStatsType } from '@/lib/types';
import { formatTokens, formatUptime } from '@/lib/state-mapper';

interface SystemStatsProps {
  stats: SystemStatsType;
}

function AnimatedNumber({ value, format }: { value: number; format?: (n: number) => string }) {
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    const diff = value - display;
    if (Math.abs(diff) < 1) {
      setDisplay(value);
      return;
    }
    const step = Math.ceil(Math.abs(diff) / 10);
    const timer = setTimeout(() => {
      setDisplay(prev => prev + (diff > 0 ? step : -step));
    }, 30);
    return () => clearTimeout(timer);
  }, [value, display]);

  return <span className="font-pixel">{format ? format(Math.round(display)) : Math.round(display)}</span>;
}

export default function SystemStats({ stats }: SystemStatsProps) {
  const items = [
    { label: 'Agents', value: stats.totalAgents, icon: '🤖', color: 'var(--accent-primary)' },
    { label: 'Active', value: stats.activeAgents, icon: '⚡', color: 'var(--accent-success)' },
    { label: 'Tokens', value: stats.totalTokens, icon: '🪙', color: 'var(--accent-warning)', format: formatTokens },
    { label: 'Tasks', value: stats.totalTasks, icon: '📋', color: 'var(--accent-info)' },
    { label: 'Uptime', value: stats.uptime, icon: '⏱️', color: 'var(--text-secondary)', format: formatUptime },
  ];

  return (
    <div className="grid grid-cols-5 gap-3">
      {items.map(item => (
        <div
          key={item.label}
          className="flex flex-col items-center gap-1 rounded-xl px-3 py-3 transition-all hover:scale-105"
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border)',
          }}
        >
          <span className="text-base">{item.icon}</span>
          <span className="text-lg" style={{ color: item.color }}>
            <AnimatedNumber value={item.value} format={item.format} />
          </span>
          <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
}
