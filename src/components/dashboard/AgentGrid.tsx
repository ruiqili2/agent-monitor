// ============================================================================
// AgentGrid — Grid container for agent cards
// ============================================================================

'use client';

import type { AgentConfig, AgentDashboardState } from '@/lib/types';
import AgentCard from './AgentCard';

interface AgentGridProps {
  agents: AgentConfig[];
  agentStates: Record<string, AgentDashboardState>;
  onChatClick: (agentId: string) => void;
  onRestart?: (agentId: string) => void;
}

export default function AgentGrid({ agents, agentStates, onChatClick, onRestart }: AgentGridProps) {
  if (agents.length === 0) {
    return (
      <div
        className="rounded-xl p-8 text-center"
        style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
      >
        <span className="text-3xl mb-3 block">🤖</span>
        <p className="font-mono text-sm" style={{ color: 'var(--text-secondary)' }}>
          No agents configured
        </p>
        <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
          Connect to an OpenClaw Gateway to see agents
        </p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="font-pixel text-sm mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
        <span>🤖</span>
        <span>Sessions</span>
        <span className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
          ({agents.length})
        </span>
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {agents.map(agent => (
          <AgentCard
            key={agent.id}
            agent={agent}
            state={agentStates[agent.id]}
            onChatClick={onChatClick}
            onRestart={onRestart}
          />
        ))}
      </div>
    </div>
  );
}
