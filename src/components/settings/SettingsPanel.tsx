"use client";

import { useState } from "react";
import type { AgentConfig, AgentAvatar, OwnerAvatar, ThemeName } from "@/lib/types";
import {
  AGENT_COLOR_PALETTE,
  AVATAR_OPTIONS,
  MAX_AGENTS,
  OWNER_AVATAR_OPTIONS,
  type DashboardConfig,
} from "@/lib/config";

const THEMES: Array<{ id: ThemeName; label: string; description: string }> = [
  { id: "default", label: "Midnight", description: "Deep dark with cyan accents" },
  { id: "dark", label: "Void", description: "Coldest and darkest" },
  { id: "cozy", label: "Warm", description: "Warm tones and amber glow" },
  { id: "cyberpunk", label: "Neon", description: "High-contrast accent mode" },
];

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button
      onClick={onChange}
      className={`relative h-6 w-11 rounded-full transition-colors ${
        checked ? "bg-[var(--accent-primary)]" : "bg-[var(--border)]"
      }`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

function ThemeSelector({
  current,
  onChange,
}: {
  current: ThemeName;
  onChange: (theme: ThemeName) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {THEMES.map((theme) => (
        <button
          key={theme.id}
          onClick={() => onChange(theme.id)}
          className={`rounded-xl border p-3 text-left transition-colors ${
            current === theme.id
              ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/10"
              : "border-[var(--border)] hover:border-[var(--text-secondary)]"
          }`}
        >
          <div className="text-sm font-semibold text-[var(--text-primary)]">{theme.label}</div>
          <div className="mt-1 text-xs text-[var(--text-secondary)]">{theme.description}</div>
        </button>
      ))}
    </div>
  );
}

function OwnerCustomizer({
  config,
  onUpdate,
}: {
  config: DashboardConfig;
  onUpdate: (config: DashboardConfig) => void;
}) {
  const updateOwner = (patch: Partial<DashboardConfig["owner"]>) => {
    onUpdate({
      ...config,
      owner: { ...config.owner, ...patch },
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs text-[var(--text-secondary)]">Boss name</label>
          <input
            value={config.owner.name}
            onChange={(event) => updateOwner({ name: event.target.value })}
            placeholder="Boss"
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-4 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-[var(--text-secondary)]">Boss emoji</label>
          <input
            value={config.owner.emoji}
            onChange={(event) => updateOwner({ emoji: event.target.value })}
            placeholder="B"
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-4 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:outline-none"
          />
        </div>
      </div>

      <div>
        <div className="mb-2 text-xs text-[var(--text-secondary)]">Boss avatar</div>
        <div className="flex flex-wrap gap-2">
          {OWNER_AVATAR_OPTIONS.map((avatar) => (
            <button
              key={avatar}
              onClick={() => updateOwner({ avatar: avatar as OwnerAvatar })}
              className={`rounded-lg border px-3 py-1.5 text-xs transition-colors ${
                config.owner.avatar === avatar
                  ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]"
                  : "border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              {avatar}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
        <div className="text-sm font-semibold text-[var(--text-primary)]">Global chat sender</div>
        <div className="mt-1 text-xs text-[var(--text-secondary)]">
          Broadcasts go out as {config.owner.emoji || "B"} {config.owner.name || "Boss"}.
        </div>
      </div>
    </div>
  );
}

function AgentCustomizer({
  agent,
  onUpdate,
  onRemove,
}: {
  agent: AgentConfig;
  onUpdate: (patch: Partial<AgentConfig>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="space-y-3 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-[var(--text-primary)]">
            {agent.emoji} {agent.name}
          </div>
          <div className="truncate text-xs text-[var(--text-secondary)]">{agent.id}</div>
        </div>
        <button
          onClick={onRemove}
          className="text-xs text-[var(--accent-danger)] hover:underline"
        >
          Remove
        </button>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <input
          value={agent.name}
          onChange={(event) => onUpdate({ name: event.target.value })}
          placeholder="Name"
          className="rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-1.5 text-sm text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:outline-none"
        />
        <input
          value={agent.emoji}
          onChange={(event) => onUpdate({ emoji: event.target.value })}
          placeholder="Emoji"
          className="rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-1.5 text-sm text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:outline-none"
        />
      </div>

      <div>
        <div className="mb-1 text-xs text-[var(--text-secondary)]">Avatar</div>
        <div className="flex flex-wrap gap-1">
          {AVATAR_OPTIONS.map((avatar) => (
            <button
              key={avatar}
              onClick={() => onUpdate({ avatar: avatar as AgentAvatar })}
              className={`rounded-md border px-2 py-1 text-xs transition-colors ${
                agent.avatar === avatar
                  ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]"
                  : "border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              {avatar}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-1 text-xs text-[var(--text-secondary)]">Color</div>
        <div className="flex flex-wrap gap-2">
          {AGENT_COLOR_PALETTE.map((color) => (
            <button
              key={color}
              onClick={() => onUpdate({ color })}
              className={`h-6 w-6 rounded-full border-2 transition-transform ${
                agent.color === color ? "scale-110 border-white" : "border-transparent"
              }`}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

interface SettingsPanelProps {
  config: DashboardConfig;
  connected: boolean;
  sessionCount: number;
  onUpdate: (config: DashboardConfig) => void;
  onReset: () => void;
  onClose: () => void;
}

export default function SettingsPanel({
  config,
  connected,
  sessionCount,
  onUpdate,
  onReset,
  onClose,
}: SettingsPanelProps) {
  const [tab, setTab] = useState<"gateway" | "owner" | "agents" | "theme">("gateway");

  const updateGateway = (field: keyof DashboardConfig["gateway"], value: string) => {
    onUpdate({
      ...config,
      gateway: { ...config.gateway, [field]: value },
    });
  };

  const updateTheme = (theme: ThemeName) => {
    onUpdate({ ...config, theme });
  };

  const updateAgent = (id: string, patch: Partial<AgentConfig>) => {
    onUpdate({
      ...config,
      agents: config.agents.map((agent) => (agent.id === id ? { ...agent, ...patch } : agent)),
    });
  };

  const removeAgent = (id: string) => {
    onUpdate({
      ...config,
      agents: config.agents.filter((agent) => agent.id !== id),
    });
  };

  const addAgent = () => {
    if (config.agents.length >= MAX_AGENTS) return;

    const index = config.agents.length;
    onUpdate({
      ...config,
      agents: [
        ...config.agents,
        {
          id: `agent-${Date.now()}`,
          name: `Agent ${index + 1}`,
          emoji: "AI",
          color: AGENT_COLOR_PALETTE[index % AGENT_COLOR_PALETTE.length],
          avatar: AVATAR_OPTIONS[index % AVATAR_OPTIONS.length] as AgentAvatar,
        },
      ],
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-primary)] shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Settings</h2>
            <div className="text-xs text-[var(--text-secondary)]">
              Local OpenClaw auto-connect with saved dashboard preferences.
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg px-3 py-1.5 text-sm text-[var(--text-secondary)] transition-colors hover:bg-white/10 hover:text-[var(--text-primary)]"
          >
            Close
          </button>
        </div>

        <div className="flex flex-wrap border-b border-[var(--border)]">
          {([
            ["gateway", "Gateway"],
            ["owner", "Boss"],
            ["agents", "Agents"],
            ["theme", "Theme"],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-4 py-3 text-sm font-medium transition-colors ${
                tab === key
                  ? "border-b-2 border-[var(--accent-primary)] text-[var(--accent-primary)]"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="max-h-[70vh] space-y-4 overflow-y-auto p-6">
          {tab === "gateway" && (
            <>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
                  <div className="text-sm font-semibold text-[var(--text-primary)]">Connection</div>
                  <div
                    className="mt-2 text-sm"
                    style={{
                      color: connected ? "var(--accent-success)" : "var(--accent-warning)",
                    }}
                  >
                    {connected ? "Connected to local OpenClaw" : "Scanning for local OpenClaw"}
                  </div>
                  <div className="mt-1 text-xs text-[var(--text-secondary)]">
                    {connected
                      ? `Monitoring ${sessionCount} live session(s).`
                      : "The dashboard keeps retrying local gateway discovery until a gateway answers."}
                  </div>
                </div>

                <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
                  <div className="text-sm font-semibold text-[var(--text-primary)]">Auto-connect</div>
                  <div className="mt-2 text-xs text-[var(--text-secondary)]">
                    Local discovery reads your OpenClaw config and now uses device-aware auth, so
                    current OpenClaw gateways grant real operator scopes instead of dropping the
                    dashboard into an empty state.
                  </div>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs text-[var(--text-secondary)]">Saved gateway URL</label>
                <input
                  value={config.gateway.url}
                  onChange={(event) => updateGateway("url", event.target.value)}
                  placeholder="http://localhost:18789"
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-4 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:outline-none"
                />
                <div className="mt-1 text-xs text-[var(--text-secondary)]">
                  Stored for overrides and diagnostics. The live local connection still auto-discovers your
                  OpenClaw instance first.
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs text-[var(--text-secondary)]">Saved gateway token</label>
                <input
                  type="password"
                  value={config.gateway.token}
                  onChange={(event) => updateGateway("token", event.target.value)}
                  placeholder="Optional"
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-4 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
                <div>
                  <div className="text-sm font-semibold text-[var(--text-primary)]">Demo mode</div>
                  <div className="mt-1 text-xs text-[var(--text-secondary)]">
                    Keep this off for real OpenClaw sessions. Enable only if you want simulated agents.
                  </div>
                </div>
                <Toggle
                  checked={config.demoMode}
                  onChange={() => onUpdate({ ...config, demoMode: !config.demoMode })}
                />
              </div>
            </>
          )}

          {tab === "owner" && (
            <OwnerCustomizer config={config} onUpdate={onUpdate} />
          )}

          {tab === "agents" && (
            <>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 text-xs text-[var(--text-secondary)]">
                These saved presets are kept for demo layouts and future override mapping. Live
                OpenClaw session metadata currently takes priority when the gateway reports names
                and identity details.
              </div>
              <div className="space-y-3">
                {config.agents.map((agent) => (
                  <AgentCustomizer
                    key={agent.id}
                    agent={agent}
                    onUpdate={(patch) => updateAgent(agent.id, patch)}
                    onRemove={() => removeAgent(agent.id)}
                  />
                ))}
              </div>
              {config.agents.length < MAX_AGENTS && (
                <button
                  onClick={addAgent}
                  className="w-full rounded-xl border border-dashed border-[var(--border)] py-2.5 text-sm text-[var(--text-secondary)] transition-colors hover:border-[var(--accent-primary)] hover:text-[var(--text-primary)]"
                >
                  Add agent ({config.agents.length}/{MAX_AGENTS})
                </button>
              )}
            </>
          )}

          {tab === "theme" && <ThemeSelector current={config.theme} onChange={updateTheme} />}
        </div>

        <div className="flex flex-col gap-3 border-t border-[var(--border)] px-6 py-4 sm:flex-row sm:justify-between">
          <button
            onClick={onReset}
            className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
          >
            Reset saved settings
          </button>
          <button
            onClick={onClose}
            className="rounded-xl bg-[var(--accent-primary)] px-4 py-2 text-sm font-medium text-black"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
