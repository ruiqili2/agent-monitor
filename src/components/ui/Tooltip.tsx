"use client";

import React, { useState } from 'react';

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export default function Tooltip({ content, children, position = 'top' }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  
  const getPositionStyles = () => {
    switch (position) {
      case 'top':
        return 'bottom-full left-1/2 -translate-x-1/2 mb-2';
      case 'bottom':
        return 'top-full left-1/2 -translate-x-1/2 mt-2';
      case 'left':
        return 'right-full top-1/2 -translate-y-1/2 mr-2';
      case 'right':
        return 'left-full top-1/2 -translate-y-1/2 ml-2';
    }
  };
  
  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div
          className={`absolute z-50 px-3 py-2 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg text-xs text-[var(--text-primary)] whitespace-nowrap shadow-lg ${getPositionStyles()}`}
        >
          {content}
          <div
            className={`absolute w-2 h-2 bg-[var(--bg-card)] border-r border-b border-[var(--border)] transform rotate-45 ${
              position === 'top' ? 'bottom-[-5px] left-1/2 -translate-x-1/2 border-l border-t' :
              position === 'bottom' ? 'top-[-5px] left-1/2 -translate-x-1/2 border-r border-b' :
              position === 'left' ? 'right-[-5px] top-1/2 -translate-y-1/2 border-t border-l' :
              'left-[-5px] top-1/2 -translate-y-1/2 border-b border-r'
            }`}
          />
        </div>
      )}
    </div>
  );
}
