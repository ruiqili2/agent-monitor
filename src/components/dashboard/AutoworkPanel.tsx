'use client';

import { useEffect, useState } from 'react';
import type { AgentConfig, AutoworkConfig, AutoworkPolicy } from '@/lib/types';

interface AutoworkPanelProps {
  agents: AgentConfig[];
  config: AutoworkConfig;
  loading: boolean;
  saving: boolean;
  running: boolean;
  onSaveConfig: (patch: Partial<AutoworkConfig>) => Promise<void>;
  onSavePolicy: (sessionKey: string, patch: Partial<AutoworkPolicy>) => Promise<void>;
  onRunNow: (sessionKey?: string) => Promise<void>;
}

function formatMinutes(intervalMs: number): string {
  const mins = Math.max(1, Math.round(intervalMs / 60000));
  return `${mins}m`;
}

function PolicyRow({
  agent,
  policy,
  saving,
  onSave,
  onRunNow,
}: {
  agent: AgentConfig;
  policy: AutoworkPolicy;
  saving: boolean;
  onSave: (patch: Partial<AutoworkPolicy>) => Promise<void>;
  onRunNow: () => Promise<void>;
}) {
  const [enabled, setEnabled] = useState(policy.enabled);
  const [intervalMs, setIntervalMs] = useState(policy.intervalMs);
  const [directive, setDirective] = useState(policy.directive);

  useEffect(() => {
    setEnabled(policy.enabled);
    setIntervalMs(policy.intervalMs);
    setDirective(policy.directive);
  }, [policy.directive, policy.enabled, policy.intervalMs]);

  return (
    <div
      className="rounded-xl p-3 space-y-3"
      style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
            {agent.emoji} {agent.name}
          </div>
          <div className="text-[10px] font-mono" style={{ color: 'var(--text-secondary)' }}>
            {agent.modelProvider ? `${agent.modelProvider}/` : ''}{agent.model ?? 'unknown'} • {formatMinutes(intervalMs)}
          </div>
        </div>
        <button
          onClick={() => setEnabled((prev) => !prev)}
          className={`w-11 h-6 rounded-full transition-colors ${enabled ? 'bg-[var(--accent-success)]' : 'bg-[var(--border)]'}`}
        >
          <div
            className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-5' : 'translate-x-0.5'}`}
          />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {[5, 10, 15, 30].map((mins) => {
          const value = mins * 60000;
          const active = Math.round(intervalMs / 60000) === mins;
          return (
            <button
              key={mins}
              onClick={() => setIntervalMs(value)}
              className="text-[10px] font-mono px-2 py-1.5 rounded-md transition-colors"
              style={{
                backgroundColor: active ? 'var(--accent-primary)20' : 'transparent',
                color: active ? 'var(--accent-primary)' : 'var(--text-secondary)',
                border: `1px solid ${active ? 'var(--accent-primary)40' : 'var(--border)'}`,
              }}
            >
              Every {mins}m
            </button>
          );
        })}
      </div>

      <textarea
        value={directive}
        onChange={(e) => setDirective(e.target.value)}
        rows={3}
        className="w-full bg-[var(--bg-secondary)] text-[var(--text-primary)] border border-[var(--border)] rounded-xl px-3 py-2 text-xs resize-none focus:outline-none focus:border-[var(--accent-primary)]"
      />

      <div className="flex gap-2">
        <button
          onClick={() => void onSave({ enabled, intervalMs, directive })}
          disabled={saving}
          className="flex-1 px-3 py-2 rounded-lg text-xs font-mono disabled:opacity-50"
          style={{ backgroundColor: 'var(--accent-primary)', color: '#000' }}
        >
          Save
        </button>
        <button
          onClick={() => void onRunNow()}
          disabled={saving}
          className="px-3 py-2 rounded-lg text-xs font-mono disabled:opacity-50"
          style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
        >
          Run now
        </button>
      </div>
    </div>
  );
}

export default function AutoworkPanel({
  agents,
  config,
  loading,
  saving,
  running,
  onSaveConfig,
  onSavePolicy,
  onRunNow,
}: AutoworkPanelProps) {
  const [maxSendsPerTick, setMaxSendsPerTick] = useState(config.maxSendsPerTick);
  const [defaultDirective, setDefaultDirective] = useState(config.defaultDirective);

  useEffect(() => {
    setMaxSendsPerTick(config.maxSendsPerTick);
    setDefaultDirective(config.defaultDirective);
  }, [config.defaultDirective, config.maxSendsPerTick]);

  const primaryAgents = agents.filter((agent) => !agent.isSubagent && agent.sessionKey);
  const enabledCount = primaryAgents.filter((agent) => config.policies[agent.sessionKey!]?.enabled).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-pixel text-sm flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <span>Auto</span>
          <span>Auto Work</span>
        </h2>
        <div className="text-[10px] font-mono" style={{ color: 'var(--text-secondary)' }}>
          {enabledCount}/{primaryAgents.length} enabled
        </div>
      </div>

      <div
        className="rounded-xl p-3 space-y-3"
        style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
      >
        <div className="grid grid-cols-1 gap-3">
          <div className="rounded-xl p-3" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
            <label className="text-[10px] font-mono block mb-2" style={{ color: 'var(--text-secondary)' }}>
              Max sends per tick
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4].map((value) => (
                <button
                  key={value}
                  onClick={() => setMaxSendsPerTick(value)}
                  className="flex-1 px-2 py-1.5 rounded-md text-xs font-mono"
                  style={{
                    backgroundColor: maxSendsPerTick === value ? 'var(--accent-primary)20' : 'transparent',
                    color: maxSendsPerTick === value ? 'var(--accent-primary)' : 'var(--text-secondary)',
                    border: `1px solid ${maxSendsPerTick === value ? 'var(--accent-primary)40' : 'var(--border)'}`,
                  }}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl p-3" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
            <label className="text-[10px] font-mono block mb-2" style={{ color: 'var(--text-secondary)' }}>
              Default directive
            </label>
            <textarea
              value={defaultDirective}
              onChange={(e) => setDefaultDirective(e.target.value)}
              rows={4}
              className="w-full bg-[var(--bg-card)] text-[var(--text-primary)] border border-[var(--border)] rounded-xl px-3 py-2 text-xs resize-none focus:outline-none focus:border-[var(--accent-primary)]"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => void onSaveConfig({ maxSendsPerTick, defaultDirective })}
              disabled={saving}
              className="flex-1 px-3 py-2 rounded-lg text-xs font-mono disabled:opacity-50"
              style={{ backgroundColor: 'var(--accent-primary)', color: '#000' }}
            >
              Save defaults
            </button>
            <button
              onClick={() => void onRunNow()}
              disabled={running}
              className="px-3 py-2 rounded-lg text-xs font-mono disabled:opacity-50"
              style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
            >
              {running ? 'Running...' : 'Tick now'}
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {loading && (
            <div className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
              Loading auto work policies...
            </div>
          )}

          {!loading && primaryAgents.length === 0 && (
            <div className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
              No primary agent sessions available for auto work.
            </div>
          )}

          {!loading && primaryAgents.map((agent) => {
            const sessionKey = agent.sessionKey!;
            const policy = config.policies[sessionKey] ?? {
              enabled: false,
              intervalMs: 10 * 60 * 1000,
              directive: config.defaultDirective,
              lastSentAt: 0,
            };

            return (
              <PolicyRow
                key={sessionKey}
                agent={agent}
                policy={policy}
                saving={saving}
                onSave={(patch) => onSavePolicy(sessionKey, patch)}
                onRunNow={() => onRunNow(sessionKey)}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
