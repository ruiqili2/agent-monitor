// ============================================================================
// OfficeControls — Bottom control bar for the office view
// ============================================================================

'use client';

import { useState } from 'react';
import type { AgentConfig, AgentBehavior, AgentDashboardState } from '@/lib/types';
import { BEHAVIOR_INFO } from '@/lib/state-mapper';

interface OfficeControlsProps {
  agents: AgentConfig[];
  agentStates: Record<string, AgentDashboardState>;
  demoMode: boolean;
  onSetBehavior: (agentId: string, behavior: AgentBehavior) => void;
}

const QUICK_BEHAVIORS: AgentBehavior[] = [
  'coding', 'thinking', 'researching', 'meeting', 'deploying',
  'debugging', 'idle', 'coffee', 'sleeping', 'toilet',
  'panicking', 'dead', 'overloaded', 'reviving',
];

export default function OfficeControls({
  agents,
  agentStates,
  demoMode,
  onSetBehavior,
}: OfficeControlsProps) {
  const [selectedAgent, setSelectedAgent] = useState<string>(agents[0]?.id ?? '');
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="p-3"
      style={{
        backgroundColor: 'var(--bg-card)',
        borderTop: '1px solid var(--border)',
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>🎮 Controls</span>
          {demoMode && (
            <span className="text-[10px] px-1.5 py-0.5 rounded font-mono" style={{ backgroundColor: 'rgba(255,202,40,0.12)', color: 'var(--accent-warning)' }}>
              DEMO
            </span>
          )}
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs font-mono px-2 py-1 rounded hover:bg-white/10 transition-colors"
          style={{ color: 'var(--text-secondary)' }}
        >
          {expanded ? '▼ Collapse' : '▶ Expand'}
        </button>
      </div>

      {expanded && demoMode && (
        <div className="pt-3" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-mono" style={{ color: 'var(--text-secondary)' }}>Agent:</span>
            <select
              value={selectedAgent}
              onChange={(e) => setSelectedAgent(e.target.value)}
              className="text-xs font-mono px-2 py-1 rounded border bg-transparent"
              style={{
                borderColor: 'var(--border)',
                color: 'var(--text-primary)',
                backgroundColor: 'var(--bg-primary)',
              }}
            >
              {agents.map(a => (
                <option key={a.id} value={a.id}>{a.emoji} {a.name}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap gap-1">
            {QUICK_BEHAVIORS.map(behavior => {
              const info = BEHAVIOR_INFO[behavior];
              return (
                <button
                  key={behavior}
                  onClick={() => onSetBehavior(selectedAgent, behavior)}
                  className="text-[10px] font-mono px-2 py-1 rounded-md hover:opacity-80 transition-opacity"
                  style={{
                    backgroundColor: `${info.neonColor}18`,
                    color: info.neonColor,
                    border: `1px solid ${info.neonColor}30`,
                  }}
                >
                  {info.emoji} {info.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
