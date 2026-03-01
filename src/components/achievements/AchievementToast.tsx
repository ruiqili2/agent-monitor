"use client";

import React, { useEffect } from 'react';
import type { Achievement } from '@/lib/achievements';

interface AchievementToastProps {
  achievement: Achievement;
  onClose: () => void;
}

export default function AchievementToast({ achievement, onClose }: AchievementToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const getTierGradient = (tier: string) => {
    switch (tier) {
      case 'bronze': return 'from-orange-700 to-orange-500';
      case 'silver': return 'from-gray-500 to-gray-300';
      case 'gold': return 'from-yellow-600 to-yellow-400';
      case 'platinum': return 'from-purple-600 to-purple-400';
      case 'diamond': return 'from-cyan-600 to-cyan-400';
      default: return 'from-gray-600 to-gray-400';
    }
  };

  return (
    <div className="fixed top-20 right-4 z-50 animate-slide-in-right">
      <div className={`bg-gradient-to-r ${getTierGradient(achievement.tier)} rounded-xl p-6 shadow-2xl max-w-md`}>
        <div className="flex items-start gap-4">
          <span className="text-5xl animate-bounce">{achievement.icon}</span>
          <div className="flex-1">
            <div className="text-white font-bold text-lg mb-1">
              🏆 Achievement Unlocked!
            </div>
            <div className="text-white font-bold text-xl mb-1">
              {achievement.name}
            </div>
            <div className="text-white/90 text-sm mb-2">
              {achievement.description}
            </div>
            <div className="flex items-center gap-2 text-white/80 text-xs">
              <span>✨ +{achievement.xpReward} XP</span>
              <span>•</span>
              <span className="uppercase">{achievement.tier}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white text-xl transition-colors"
          >
            ✕
          </button>
        </div>
        
        {/* Particle effects */}
        <div className="absolute inset-0 overflow-hidden rounded-xl pointer-events-none">
          {[...Array(10)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-white rounded-full animate-particle"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 0.5}s`,
                animationDuration: `${0.5 + Math.random() * 0.5}s`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
