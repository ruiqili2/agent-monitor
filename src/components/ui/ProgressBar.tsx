"use client";

import React from 'react';

interface ProgressBarProps {
  value: number;
  max?: number;
  label?: string;
  color?: string;
  animated?: boolean;
  showPercentage?: boolean;
}

export default function ProgressBar({
  value,
  max = 100,
  label,
  color = 'var(--accent-primary)',
  animated = true,
  showPercentage = true,
}: ProgressBarProps) {
  const percentage = Math.min(100, (value / max) * 100);
  
  return (
    <div className="w-full">
      {label && (
        <div className="flex justify-between text-xs text-[var(--text-secondary)] mb-1">
          <span>{label}</span>
          {showPercentage && <span>{percentage.toFixed(0)}%</span>}
        </div>
      )}
      <div className="h-3 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
        <div
          className="h-full transition-all duration-500"
          style={{
            width: `${percentage}%`,
            backgroundColor: color,
            animation: animated ? 'pulse 2s infinite' : 'none',
          }}
        />
      </div>
    </div>
  );
}
