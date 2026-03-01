'use client';

import React from 'react';

interface PerformanceMetricsProps {
  tasksCompleted?: number;
  avgResponseTime?: number;
  successRate?: number;
  xp?: number;
  level?: number;
  achievements?: string[];
}

export function PerformanceMetrics({
  tasksCompleted = 0,
  avgResponseTime = 0,
  successRate = 100,
  xp = 0,
  level = 1,
  achievements = []
}: PerformanceMetricsProps) {
  const nextLevelXP = level * 1000;
  const currentLevelXP = (level - 1) * 1000;
  const xpProgress = ((xp - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100;

  // Determine success rate color
  const successColorClass = successRate >= 95 ? 'text-[var(--success)]' : successRate >= 80 ? 'text-[var(--warning)]' : 'text-[var(--danger)]';

  return (
    <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-card)]">
      <h3 className="text-sm font-bold text-[var(--text-primary)] mb-3">
        📊 Performance
      </h3>
      
      {/* Level & XP */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-lg font-bold text-[var(--accent-primary)]">
            Level {level}
          </span>
          <span className="text-xs text-[var(--text-secondary)]">
            {xp.toLocaleString()} / {nextLevelXP.toLocaleString()} XP
          </span>
        </div>
        <div className="h-3 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-[var(--warning)] to-[var(--accent-primary)] transition-all duration-500"
            style={{ width: `${xpProgress}%` }}
          />
        </div>
      </div>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="text-center p-2 rounded-lg bg-[var(--bg-secondary)]">
          <p className="text-lg font-bold text-[var(--success)]">
            {tasksCompleted}
          </p>
          <p className="text-xs text-[var(--text-secondary)]">Tasks</p>
        </div>
        <div className="text-center p-2 rounded-lg bg-[var(--bg-secondary)]">
          <p className="text-lg font-bold text-[var(--info)]">
            {avgResponseTime.toFixed(1)}s
          </p>
          <p className="text-xs text-[var(--text-secondary)]">Avg Time</p>
        </div>
        <div className="text-center p-2 rounded-lg bg-[var(--bg-secondary)]">
          <p className={`text-lg font-bold ${successColorClass}`}>
            {successRate.toFixed(0)}%
          </p>
          <p className="text-xs text-[var(--text-secondary)]">Success</p>
        </div>
      </div>
      
      {/* Achievements */}
      {achievements.length > 0 && (
        <div>
          <p className="text-xs text-[var(--text-secondary)] mb-2">
            🏆 Achievements ({achievements.length})
          </p>
          <div className="flex flex-wrap gap-1">
            {achievements.slice(0, 6).map((achievement, idx) => (
              <span
                key={idx}
                className="text-xs px-2 py-1 rounded-full bg-[var(--accent-primary)] text-white"
                title={achievement}
              >
                {achievement}
              </span>
            ))}
            {achievements.length > 6 && (
              <span className="text-xs px-2 py-1 rounded-full bg-[var(--bg-secondary)] text-[var(--text-secondary)]">
                +{achievements.length - 6} more
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default PerformanceMetrics;
