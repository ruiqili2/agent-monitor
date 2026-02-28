'use client';

import React from 'react';

interface TokenTrackerProps {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  tokensPerSecond?: number;
  estimatedCost?: number;
  model?: string;
}

export function TokenTracker({ 
  inputTokens, 
  outputTokens, 
  totalTokens,
  tokensPerSecond = 0,
  estimatedCost = 0,
  model = 'unknown'
}: TokenTrackerProps) {
  // Cost estimation based on model (approximate)
  const costPer1K = model.includes('qwen') ? 0.002 : 
                    model.includes('claude') ? 0.015 : 
                    model.includes('gpt') ? 0.03 : 0.005;
  
  const calculatedCost = (totalTokens / 1000) * costPer1K;

  return (
    <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-card)]">
      <h3 className="text-sm font-bold text-[var(--text-primary)] mb-3">
        🪙 Token Usage
      </h3>
      
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <p className="text-xs text-[var(--text-secondary)]">Input</p>
          <p className="text-lg font-bold text-[var(--info)]">
            {inputTokens.toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-xs text-[var(--text-secondary)]">Output</p>
          <p className="text-lg font-bold text-[var(--success)]">
            {outputTokens.toLocaleString()}
          </p>
        </div>
      </div>
      
      <div className="border-t border-[var(--border)] pt-3">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs text-[var(--text-secondary)]">Total</span>
          <span className="text-sm font-bold text-[var(--text-primary)]">
            {totalTokens.toLocaleString()} tokens
          </span>
        </div>
        
        {tokensPerSecond > 0 && (
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-[var(--text-secondary)]">Speed</span>
            <span className="text-sm font-bold text-[var(--accent-primary)]">
              {tokensPerSecond.toFixed(1)} tok/s
            </span>
          </div>
        )}
        
        <div className="flex justify-between items-center">
          <span className="text-xs text-[var(--text-secondary)]">Est. Cost</span>
          <span className="text-sm font-bold text-[var(--warning)]">
            ${calculatedCost.toFixed(4)}
          </span>
        </div>
      </div>
      
      {/* Progress bar */}
      <div className="mt-3 h-2 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-[var(--info)] to-[var(--accent-primary)] transition-all duration-500"
          style={{ width: `${Math.min((totalTokens / 100000) * 100, 100)}%` }}
        />
      </div>
      <p className="text-xs text-[var(--text-secondary)] mt-1 text-center">
        {(totalTokens / 100000 * 100).toFixed(1)}% of 100K quota
      </p>
    </div>
  );
}

export default TokenTracker;
