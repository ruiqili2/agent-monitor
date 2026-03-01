"use client";

import React from 'react';

interface LeaderboardEntry {
  rank: number;
  agentId: string;
  agentName: string;
  agentEmoji: string;
  value: number;
  badge?: string;
}

interface LeaderboardProps {
  entries: LeaderboardEntry[];
  title: string;
  icon: string;
}

export default function Leaderboard({ entries, title, icon }: LeaderboardProps) {
  const getRankStyle = (rank: number) => {
    if (rank === 1) return 'bg-gradient-to-r from-yellow-500/20 to-transparent border-l-4 border-yellow-500';
    if (rank === 2) return 'bg-gradient-to-r from-gray-400/20 to-transparent border-l-4 border-gray-400';
    if (rank === 3) return 'bg-gradient-to-r from-orange-500/20 to-transparent border-l-4 border-orange-500';
    return '';
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-4">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl">{icon}</span>
        <h2 className="font-pixel text-lg" style={{ color: 'var(--text-primary)' }}>
          {title}
        </h2>
      </div>
      
      <div className="space-y-2">
        {entries.slice(0, 10).map((entry, index) => (
          <div
            key={entry.agentId}
            className={`flex items-center gap-3 p-3 rounded-lg ${getRankStyle(entry.rank)}`}
          >
            <span className="text-lg font-bold w-8 text-center">
              {entry.badge || `#${entry.rank}`}
            </span>
            <span className="text-2xl">{entry.agentEmoji}</span>
            <div className="flex-1">
              <div className="font-bold text-[var(--text-primary)]">
                {entry.agentName}
              </div>
              <div className="text-xs text-[var(--text-secondary)]">
                {entry.value >= 1000 ? formatNumber(entry.value) : entry.value}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
