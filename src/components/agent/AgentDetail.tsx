// ============================================================================
// AgentDetail — Agent detail panel (header with avatar, status, stats)
// ============================================================================

'use client';

import type { AgentConfig, AgentDashboardState } from '@/lib/types';
import { BEHAVIOR_INFO, formatTokens, formatUptime } from '@/lib/state-mapper';
import StatusBadge from '@/components/shared/StatusBadge';
import { drawAgent } from '@/sprites/characters';

interface AgentDetailProps {
  agent: AgentConfig;
  state: AgentDashboardState | undefined;
  onChatClick: () => void;
}

function LargePixelAvatar({ agent }: { agent: AgentConfig }) {
  const size = 80;
  const canvasRef = (canvas: HTMLCanvasElement | null) => {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, size, size);
    ctx.imageSmoothingEnabled = false;
    drawAgent(ctx, size / 2, size / 2 + 12, 'stand', 's', 0, agent.avatar, agent.color, '');
  };

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className="rounded-xl"
      style={{
        imageRendering: 'pixelated',
        backgroundColor: `${agent.color}15`,
        border: `2px solid ${agent.color}40`,
      }}
    />
  );
}

export default function AgentDetail({ agent, state, onChatClick }: AgentDetailProps) {
  const behavior = state?.behavior ?? 'idle';
  const info = BEHAVIOR_INFO[behavior];

  return (
    <div
      className="rounded-xl p-6"
      style={{
        backgroundColor: 'var(--bg-card)',
        border: `1px solid ${info.neonColor}30`,
      }}
    >
      <div className="flex items-start gap-5">
        <LargePixelAvatar agent={agent} />
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h1 className="font-pixel text-xl" style={{ color: 'var(--text-primary)' }}>
              {agent.name}
            </h1>
            <span className="text-xl">{agent.emoji}</span>
          </div>
          <StatusBadge behavior={behavior} size="lg" />

          <div className="grid grid-cols-3 gap-4 mt-4">
            <div>
              <span className="text-[10px] font-mono block" style={{ color: 'var(--text-secondary)' }}>UPTIME</span>
              <span className="font-pixel text-sm" style={{ color: 'var(--accent-primary)' }}>
                {formatUptime(Math.floor((state?.uptime ?? 0) / 1000))}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-mono block" style={{ color: 'var(--text-secondary)' }}>TOTAL TOKENS</span>
              <span className="font-pixel text-sm" style={{ color: 'var(--accent-warning)' }}>
                {formatTokens(state?.totalTokens ?? 0)}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-mono block" style={{ color: 'var(--text-secondary)' }}>TASKS</span>
              <span className="font-pixel text-sm" style={{ color: 'var(--accent-success)' }}>
                {state?.totalTasks ?? 0}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={onChatClick}
          className="px-4 py-2 rounded-lg text-sm font-mono transition-colors hover:opacity-80"
          style={{
            backgroundColor: 'var(--accent-primary)20',
            color: 'var(--accent-primary)',
            border: '1px solid var(--accent-primary)40',
          }}
        >
          💬 Chat
        </button>
      </div>
    </div>
  );
}
