"use client";

import React, { useEffect } from 'react';

interface LevelUpNotificationProps {
  oldLevel: number;
  newLevel: number;
  title: string;
  badge: string;
  onClose: () => void;
}

export default function LevelUpNotification({ oldLevel, newLevel, title, badge, onClose }: LevelUpNotificationProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, 8000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 animate-fade-in">
      <div className="relative bg-gradient-to-br from-purple-900 via-blue-900 to-purple-900 rounded-3xl p-12 shadow-2xl max-w-lg mx-4 animate-scale-in">
        {/* Glow effect */}
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-yellow-400 via-purple-500 to-blue-500 opacity-50 blur-xl animate-pulse" />
        
        {/* Content */}
        <div className="relative text-center">
          {/* Badge */}
          <div className="text-8xl mb-6 animate-bounce">
            {badge}
          </div>
          
          {/* Title */}
          <div className="text-white font-bold text-4xl mb-2 animate-glow">
            LEVEL UP!
          </div>
          
          {/* Level */}
          <div className="text-yellow-400 font-bold text-6xl mb-4">
            {newLevel}
          </div>
          
          {/* Progress */}
          <div className="text-white/90 text-lg mb-2">
            {oldLevel} → {newLevel}
          </div>
          
          {/* Title */}
          <div className="text-purple-300 font-bold text-2xl mb-6">
            {title}
          </div>
          
          {/* XP Bar */}
          <div className="bg-black/50 rounded-full h-4 mb-6 overflow-hidden">
            <div className="bg-gradient-to-r from-yellow-400 via-purple-500 to-blue-500 h-full animate-fill" />
          </div>
          
          {/* Message */}
          <div className="text-white/80 text-sm">
            Keep going! More achievements await! 🏆
          </div>
          
          {/* Close button */}
          <button
            onClick={onClose}
            className="mt-8 px-8 py-3 bg-white/20 hover:bg-white/30 text-white rounded-full font-bold transition-all hover:scale-105"
          >
            Awesome!
          </button>
        </div>
        
        {/* Particle effects */}
        <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
          {[...Array(30)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 bg-yellow-400 rounded-full animate-confetti"
              style={{
                left: `${Math.random() * 100}%`,
                top: `-10%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${2 + Math.random() * 2}s`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
