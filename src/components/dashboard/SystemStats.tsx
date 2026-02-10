// ============================================================================
// SystemStats — Top statistics bar
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
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!mounted) return;
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
  }, [value, display, mounted]);

  // SSR: render placeholder dash to avoid hydration mismatch
  if (!mounted) return <span className="font-pixel">-</span>;

  return <span className="font-pixel">{format ? format(Math.round(display)) : Math.round(display)}</span>;
}

export default function SystemStats({ stats }: SystemStatsProps) {
  const items = [
    { label: 'Sessions', value: stats.totalAgents, icon: '🤖', color: 'var(--accent-primary)' },
    { label: 'Active', value: stats.activeAgents, icon: '⚡', color: 'var(--accent-success)' },
    { label: 'Tokens', value: stats.totalTokens, icon: '🪙', color: 'var(--accent-warning)', format: formatTokens },
    { label: 'Failed', value: stats.failedTasks, icon: '❌', color: 'var(--accent-danger)' },
  ];

  return (
    <div className="grid grid-cols-4 gap-3">
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
