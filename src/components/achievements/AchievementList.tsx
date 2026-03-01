"use client";

import React from 'react';
import type { Achievement } from '@/lib/achievements';

interface AchievementListProps {
  achievements: Achievement[];
  filter?: 'all' | 'unlocked' | 'locked' | 'productivity' | 'collaboration' | 'social' | 'special';
}

export default function AchievementList({ achievements, filter = 'all' }: AchievementListProps) {
  // Filter achievements
  const filtered = achievements.filter(a => {
    if (filter === 'all') return true;
    if (filter === 'unlocked') return a.unlocked;
    if (filter === 'locked') return !a.unlocked;
    return a.category === filter;
  });

  // Get tier color
  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'bronze': return '#CD7F32';
      case 'silver': return '#C0C0C0';
      case 'gold': return '#FFD700';
      case 'platinum': return '#E5E4E2';
      case 'diamond': return '#B9F2FF';
      default: return '#808080';
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
      {filtered.map(achievement => (
        <div
          key={achievement.id}
          className={`p-3 sm:p-4 rounded-xl border-2 transition-all touch-manipulation ${
            achievement.unlocked
              ? 'bg-[var(--bg-card)] animate-pulse'
              : 'bg-[var(--bg-secondary)] opacity-60'
          }`}
          style={{ borderColor: getTierColor(achievement.tier) }}
        >
          <div className="flex items-start gap-3 mb-3">
            <span className="text-4xl">{achievement.icon}</span>
            <div className="flex-1">
              <h3 className="font-bold text-[var(--text-primary)] mb-1">
                {achievement.name}
              </h3>
              <span
                className="text-xs px-2 py-0.5 rounded text-white"
                style={{ backgroundColor: getTierColor(achievement.tier) }}
              >
                {achievement.tier.toUpperCase()}
              </span>
            </div>
          </div>
          
          <p className="text-sm text-[var(--text-secondary)] mb-3">
            {achievement.description}
          </p>
          
          {/* Progress Bar */}
          <div className="mb-2">
            <div className="flex justify-between text-xs text-[var(--text-secondary)] mb-1">
              <span>Progress</span>
              <span>{Math.round(achievement.progress)}%</span>
            </div>
            <div className="h-2 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
              <div
                className="h-full transition-all duration-500"
                style={{
                  width: `${achievement.progress}%`,
                  backgroundColor: getTierColor(achievement.tier),
                }}
              />
            </div>
          </div>
          
          {/* XP Reward */}
          {achievement.unlocked && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-[var(--text-secondary)]">
                Unlocked! {new Date(achievement.unlockedAt!).toLocaleDateString()}
              </span>
              <span className="font-bold text-[var(--accent-primary)]">
                +{achievement.xpReward} XP
              </span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
