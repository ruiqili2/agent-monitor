// ============================================================================
// AgentCard — Individual agent status card
// ============================================================================

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { AgentAvatar, AgentConfig, AgentDashboardState } from '@/lib/types';
import { AVATAR_OPTIONS, AGENT_COLOR_PALETTE } from '@/lib/config';
import { BEHAVIOR_INFO, formatTokens, formatRelativeTime } from '@/lib/state-mapper';
import StatusBadge from '@/components/shared/StatusBadge';
import { drawAgent } from '@/sprites/characters';

interface AgentCardProps {
  agent: AgentConfig;
  state: AgentDashboardState | undefined;
  onChatClick: (agentId: string) => void;
  onRestart?: (agentId: string) => void;
  onUpdateAgent?: (agentId: string, patch: Partial<AgentConfig>) => void;
}

function PixelAvatar({ agent, size = 48 }: { agent: AgentConfig; size?: number }) {
  const canvasRef = (canvas: HTMLCanvasElement | null) => {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, size, size);
    ctx.imageSmoothingEnabled = false;
    drawAgent(ctx, size / 2, size / 2 + 8, 'stand', 's', 0, agent.avatar, agent.color, '');
  };

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className="rounded-lg"
      style={{
        imageRendering: 'pixelated',
        backgroundColor: `${agent.color}15`,
        border: `1px solid ${agent.color}30`,
      }}
    />
  );
}

function TokenBar({ used, max }: { used: number; max: number }) {
  const pct = Math.min(100, (used / max) * 100);
  const color = pct > 80 ? 'var(--accent-danger)' : pct > 50 ? 'var(--accent-warning)' : 'var(--accent-success)';

  return (
    <div className="flex items-center gap-2 w-full">
      <span className="text-[10px] font-mono" style={{ color: 'var(--text-secondary)' }}>Tokens:</span>
      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--border)' }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-[10px] font-mono" style={{ color }}>{formatTokens(used)}</span>
    </div>
  );
}

function AgentQuickEditor({
  agent,
  onUpdate,
  onClose,
}: {
  agent: AgentConfig;
  onUpdate: (patch: Partial<AgentConfig>) => void;
  onClose: () => void;
}) {
  return (
    <div
      className="absolute inset-x-3 top-3 z-20 rounded-xl border p-3 shadow-2xl"
      style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--accent-primary)' }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
          Edit {agent.name}
        </div>
        <button
          onClick={onClose}
          className="rounded px-2 py-1 text-xs hover:bg-white/10"
          style={{ color: 'var(--text-secondary)' }}
        >
          ✕
        </button>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 mb-3">
        <input
          value={agent.name}
          onChange={(event) => onUpdate({ name: event.target.value })}
          placeholder="Name"
          className="rounded-lg border px-3 py-1.5 text-sm"
          style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
        />
        <input
          value={agent.emoji}
          onChange={(event) => onUpdate({ emoji: event.target.value })}
          placeholder="Emoji"
          className="rounded-lg border px-3 py-1.5 text-sm"
          style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
        />
      </div>

      <div className="mb-3">
        <div className="mb-1 text-xs" style={{ color: 'var(--text-secondary)' }}>Avatar</div>
        <div className="flex flex-wrap gap-1">
          {AVATAR_OPTIONS.map((avatar) => (
            <button
              key={avatar}
              onClick={() => onUpdate({ avatar: avatar as AgentAvatar })}
              className="rounded-md border px-2 py-1 text-xs transition-colors"
              style={agent.avatar === avatar
                ? { borderColor: 'var(--accent-primary)', color: 'var(--accent-primary)', backgroundColor: 'color-mix(in srgb, var(--accent-primary) 10%, transparent)' }
                : { borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
            >
              {avatar}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-1 text-xs" style={{ color: 'var(--text-secondary)' }}>Color</div>
        <div className="flex flex-wrap gap-2">
          {AGENT_COLOR_PALETTE.map((color) => (
            <button
              key={color}
              onClick={() => onUpdate({ color })}
              className={`h-6 w-6 rounded-full border-2 transition-transform ${agent.color === color ? 'scale-110 border-white' : 'border-transparent'}`}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AgentCard({ agent, state, onChatClick, onRestart, onUpdateAgent }: AgentCardProps) {
  const [relativeTime, setRelativeTime] = useState('');
  const [restarting, setRestarting] = useState(false);
  const [editing, setEditing] = useState(false);
  const behavior = state?.behavior ?? 'idle';
  const info = BEHAVIOR_INFO[behavior];
  const isAnomaly = info.category === 'anomaly';
  const subagentCount = agent.subagentIds?.length ?? 0;

  useEffect(() => {
    const update = () => {
      setRelativeTime(state ? formatRelativeTime(state.lastActivity) : 'unknown');
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [state?.lastActivity, state]);

  const handleRestart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (restarting || !onRestart) return;
    setRestarting(true);
    onRestart(agent.id);
    // Reset after a few seconds
    setTimeout(() => setRestarting(false), 3000);
  };

  return (
    <div
      className="group relative rounded-xl p-4 transition-all duration-300 hover:scale-[1.02] cursor-pointer"
      style={{
        backgroundColor: 'var(--bg-card)',
        border: `1px solid ${info.neonColor}30`,
        boxShadow: `0 0 20px ${info.neonColor}08`,
      }}
    >
      {/* Glow effect on hover */}
      <div
        className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{
          boxShadow: `inset 0 0 30px ${info.neonColor}10, 0 0 30px ${info.neonColor}10`,
        }}
      />

      {editing && onUpdateAgent && (
        <AgentQuickEditor
          agent={agent}
          onUpdate={(patch) => onUpdateAgent(agent.id, patch)}
          onClose={() => setEditing(false)}
        />
      )}

      {/* Header: Avatar + Name + Status */}
      <div className="flex items-start gap-3 mb-3">
        <PixelAvatar agent={agent} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-pixel text-sm truncate" style={{ color: 'var(--text-primary)' }}>
              {agent.name}
            </span>
            <span>{agent.emoji}</span>
          </div>
          <div className="mt-1">
            <StatusBadge behavior={behavior} size="sm" />
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {agent.isSubagent ? (
              <span
                className="text-[9px] font-mono px-1.5 py-0.5 rounded"
                style={{ backgroundColor: 'var(--accent-warning)20', color: 'var(--accent-warning)' }}
              >
                SUBAGENT
              </span>
            ) : subagentCount > 0 ? (
              <span
                className="text-[9px] font-mono px-1.5 py-0.5 rounded"
                style={{ backgroundColor: 'var(--accent-success)20', color: 'var(--accent-success)' }}
              >
                +{subagentCount} subagent{subagentCount === 1 ? '' : 's'}
              </span>
            ) : null}
            {agent.sessionKind && agent.sessionKind !== 'unknown' && (
              <span
                className="text-[9px] font-mono px-1.5 py-0.5 rounded"
                style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}
              >
                {agent.sessionKind}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Model info */}
      {state?.sessionLog?.[0] && (
        <div className="mb-1.5">
          <span className="text-[10px] font-mono" style={{ color: 'var(--text-secondary)' }}>
            {state.sessionLog[0]}
          </span>
        </div>
      )}

      {/* Channel info */}
      {state?.sessionLog?.[1] && (
        <div className="mb-2">
          <span className="text-[10px] font-mono" style={{ color: 'var(--text-secondary)' }}>
            {state.sessionLog[1]}
          </span>
        </div>
      )}

      {state?.statusSummary && (
        <div className="mb-2">
          <p className="text-[10px] leading-4 line-clamp-2" style={{ color: 'var(--text-primary)' }}>
            {state.statusSummary}
          </p>
        </div>
      )}

      {state?.toolName && (
        <div className="mb-2">
          <span className="text-[10px] font-mono" style={{ color: 'var(--accent-warning)' }}>
            Tool: {state.toolName}{state.toolPhase ? ` (${state.toolPhase})` : ''}
          </span>
        </div>
      )}

      {/* Token bar */}
      <div className="mb-2">
        {state?.usageKnown === false ? (
          <span className="text-[10px] font-mono" style={{ color: 'var(--text-secondary)' }}>
            Tokens not reported
          </span>
        ) : (
          <TokenBar used={state?.totalTokens ?? 0} max={state?.contextTokens || 128000} />
        )}
      </div>

      {agent.lastMessagePreview && (
        <div className="mb-2">
          <p className="text-[10px] line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
            {agent.lastMessagePreview}
          </p>
        </div>
      )}

      {/* Footer: Last activity + Actions */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-mono" style={{ color: 'var(--text-secondary)' }}>
          Last: {relativeTime}
        </span>
        <div className="flex items-center gap-1">
          {/* Restart button — shown for crashed/dead agents or always available */}
          {onRestart && (
            <button
              onClick={handleRestart}
              disabled={restarting}
              className="p-1 rounded hover:bg-white/10 transition-colors text-sm"
              title={isAnomaly ? 'Restart agent (crashed)' : 'Reset session'}
              style={isAnomaly ? { color: 'var(--accent-danger)' } : undefined}
            >
              {restarting ? '⏳' : '🔄'}
            </button>
          )}
          {onUpdateAgent && (
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setEditing((v) => !v); }}
              className="p-1 rounded hover:bg-white/10 transition-colors text-sm"
              title="Edit agent"
            >
              ✏️
            </button>
          )}
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onChatClick(agent.id); }}
            className="p-1 rounded hover:bg-white/10 transition-colors text-sm"
            title="Chat with agent"
          >
            💬
          </button>
          <Link
            href={`/agent/${agent.id}`}
            onClick={(e) => e.stopPropagation()}
            className="p-1 rounded hover:bg-white/10 transition-colors text-sm"
            title="View details"
          >
            📊
          </Link>
        </div>
      </div>
    </div>
  );
}
