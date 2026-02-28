// ============================================================================
// AgentDetail - Rich agent detail panel
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

function DetailStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div>
      <span className="text-[10px] font-mono block" style={{ color: 'var(--text-secondary)' }}>
        {label}
      </span>
      <span className="font-pixel text-sm" style={{ color }}>
        {value}
      </span>
    </div>
  );
}

export default function AgentDetail({ agent, state, onChatClick }: AgentDetailProps) {
  const behavior = state?.behavior ?? 'idle';
  const info = BEHAVIOR_INFO[behavior];
  const branchLabel = agent.isSubagent
    ? `Subagent${agent.parentId ? ` of ${agent.parentId}` : ''}`
    : `${agent.subagentIds?.length ?? 0} subagents`;

  return (
    <div
      className="rounded-xl p-6"
      style={{
        backgroundColor: 'var(--bg-card)',
        border: `1px solid ${info.neonColor}30`,
      }}
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
        <LargePixelAvatar agent={agent} />

        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <h1 className="font-pixel text-xl" style={{ color: 'var(--text-primary)' }}>
              {agent.name}
            </h1>
            <span className="text-xl">{agent.emoji}</span>
            {agent.isSubagent && (
              <span
                className="text-[10px] font-mono px-2 py-1 rounded"
                style={{ backgroundColor: 'var(--accent-warning)20', color: 'var(--accent-warning)' }}
              >
                SUBAGENT
              </span>
            )}
          </div>

          <StatusBadge behavior={behavior} size="lg" />

          {state?.statusSummary && (
            <p className="mt-3 text-sm leading-6" style={{ color: 'var(--text-primary)' }}>
              {state.statusSummary}
            </p>
          )}

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
            <DetailStat
              label="UPTIME"
              value={formatUptime(Math.floor((state?.uptime ?? 0) / 1000))}
              color="var(--accent-primary)"
            />
            <DetailStat
              label="TOTAL TOKENS"
              value={formatTokens(state?.totalTokens ?? 0)}
              color="var(--accent-warning)"
            />
            <DetailStat
              label="INPUT / OUTPUT"
              value={`${formatTokens(state?.inputTokens ?? 0)} / ${formatTokens(state?.outputTokens ?? 0)}`}
              color="var(--accent-success)"
            />
            <DetailStat
              label="BRANCH"
              value={branchLabel}
              color="var(--accent-success)"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
            <div
              className="rounded-xl p-4"
              style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
            >
              <div className="text-[10px] font-mono mb-2" style={{ color: 'var(--text-secondary)' }}>
                SESSION
              </div>
              <div className="space-y-1 text-xs" style={{ color: 'var(--text-primary)' }}>
                <div>{agent.sessionKind ?? 'unknown'} session</div>
                <div>{agent.modelProvider ? `${agent.modelProvider}/` : ''}{agent.model ?? 'unknown'}</div>
                <div>{agent.channel ?? 'default channel'}</div>
                <div>{agent.sendPolicy ?? 'unknown'} send policy</div>
              </div>
            </div>

            <div
              className="rounded-xl p-4"
              style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
            >
              <div className="text-[10px] font-mono mb-2" style={{ color: 'var(--text-secondary)' }}>
                LIVE EXECUTION
              </div>
              <div className="space-y-1 text-xs" style={{ color: 'var(--text-primary)' }}>
                <div>{state?.toolName ? `Tool: ${state.toolName}${state.toolPhase ? ` (${state.toolPhase})` : ''}` : 'No active tool'}</div>
                <div>{state?.streamType ? `Stream: ${state.streamType}` : 'No live stream event'}</div>
                <div>{state?.lastRunId ? `Run: ${state.lastRunId}` : 'Run ID unavailable'}</div>
                <div>{agent.reasoningLevel ? `Reasoning: ${agent.reasoningLevel}` : 'Reasoning level unavailable'}</div>
              </div>
            </div>
          </div>

          {agent.lastMessagePreview && (
            <div
              className="mt-4 rounded-xl p-4 text-xs leading-5"
              style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            >
              {agent.lastMessagePreview}
            </div>
          )}
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
          Open Chat
        </button>
      </div>
    </div>
  );
}
