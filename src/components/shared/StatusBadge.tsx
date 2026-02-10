// ============================================================================
// StatusBadge — Displays agent behavior with color + icon
// ============================================================================

'use client';

import type { AgentBehavior } from '@/lib/types';
import { BEHAVIOR_INFO } from '@/lib/state-mapper';

interface StatusBadgeProps {
  behavior: AgentBehavior;
  size?: 'sm' | 'md' | 'lg';
  pulse?: boolean;
}

export default function StatusBadge({ behavior, size = 'md', pulse = true }: StatusBadgeProps) {
  const info = BEHAVIOR_INFO[behavior];
  const isActive = info.category === 'work' || info.category === 'interaction';
  const isAnomaly = info.category === 'anomaly';

  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5 gap-1',
    md: 'text-xs px-2 py-1 gap-1.5',
    lg: 'text-sm px-3 py-1.5 gap-2',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full font-mono ${sizeClasses[size]}`}
      style={{
        backgroundColor: `${info.neonColor}18`,
        color: info.neonColor,
        border: `1px solid ${info.neonColor}40`,
      }}
    >
      {pulse && isActive && (
        <span
          className="relative flex h-2 w-2"
        >
          <span
            className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
            style={{ backgroundColor: info.neonColor }}
          />
          <span
            className="relative inline-flex h-2 w-2 rounded-full"
            style={{ backgroundColor: info.neonColor }}
          />
        </span>
      )}
      {pulse && !isActive && !isAnomaly && (
        <span
          className="inline-flex h-2 w-2 rounded-full"
          style={{ backgroundColor: `${info.neonColor}80` }}
        />
      )}
      {pulse && isAnomaly && (
        <span
          className="inline-flex h-2 w-2 rounded-full animate-pulse"
          style={{ backgroundColor: info.neonColor }}
        />
      )}
      <span>{info.emoji}</span>
      <span>{info.label}</span>
    </span>
  );
}
