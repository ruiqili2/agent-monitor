// ============================================================================
// SystemStats - Top statistics bar
// ============================================================================
/* eslint-disable react-hooks/set-state-in-effect */

'use client';

import { useEffect, useState } from 'react';
import type { SystemStats as SystemStatsType } from '@/lib/types';
import { formatTokens } from '@/lib/state-mapper';

interface SystemStatsProps {
  stats: SystemStatsType;
}

function AnimatedNumber({ value, format }: { value: number; format?: (n: number) => string }) {
  const [mounted, setMounted] = useState(false);
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    setMounted(true);
    setDisplay(value);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!mounted) return;
    const diff = value - display;
    if (Math.abs(diff) < 1) {
      setDisplay(value);
      return;
    }
    const step = Math.ceil(Math.abs(diff) / 10);
    const timer = setTimeout(() => {
      setDisplay((prev) => prev + (diff > 0 ? step : -step));
    }, 30);
    return () => clearTimeout(timer);
  }, [value, display, mounted]);

  if (!mounted) return <span className="font-pixel">-</span>;

  return <span className="font-pixel">{format ? format(Math.round(display)) : Math.round(display)}</span>;
}

export default function SystemStats({ stats }: SystemStatsProps) {
  const items = [
    { label: 'Sessions', value: stats.totalAgents, icon: '[]', color: 'var(--accent-primary)' },
    { label: 'Primary', value: stats.mainAgents ?? Math.max(0, stats.totalAgents - (stats.subAgents ?? 0)), icon: 'P', color: 'var(--accent-primary)' },
    { label: 'Subagents', value: stats.subAgents ?? 0, icon: 'S', color: 'var(--accent-warning)' },
    { label: 'Active', value: stats.activeAgents, icon: 'A', color: 'var(--accent-success)' },
    { label: 'Tokens', value: stats.totalTokens, icon: 'T', color: 'var(--accent-warning)', format: formatTokens },
    { label: 'Broadcasts', value: stats.totalBroadcasts ?? 0, icon: 'B', color: 'var(--accent-success)' },
    { label: 'Failed', value: stats.failedTasks, icon: 'X', color: 'var(--accent-danger)' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex flex-col items-center gap-1 rounded-xl px-3 py-3 transition-all hover:scale-105"
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border)',
          }}
        >
          <span className="text-base font-mono">{item.icon}</span>
          <span className="text-lg" style={{ color: item.color }}>
            <AnimatedNumber value={item.value} format={item.format} />
          </span>
          <span className="text-[10px] font-mono uppercase tracking-wider text-center" style={{ color: 'var(--text-secondary)' }}>
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
}
