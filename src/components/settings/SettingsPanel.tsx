"use client";

import { useState } from "react";
import type { AgentConfig, AgentAvatar, ThemeName } from "@/lib/types";
import {
  AVATAR_OPTIONS,
  AGENT_COLOR_PALETTE,
  MAX_AGENTS,
  type DashboardConfig,
} from "@/lib/config";

/* ------------------------------------------------------------------ */
/* Theme Selector                                                     */
/* ------------------------------------------------------------------ */

const THEMES: { id: ThemeName; label: string; emoji: string; desc: string }[] = [
  { id: "default", label: "Midnight", emoji: "🌙", desc: "Deep dark with cyan accents" },
  { id: "dark", label: "Void", emoji: "🕳️", desc: "Coldest & darkest" },
  { id: "cozy", label: "Warm", emoji: "🔥", desc: "Warm tones, amber glow" },
  { id: "cyberpunk", label: "Neon", emoji: "⚡", desc: "Pink-purple neon" },
];

function ThemeSelector({
  current,
  onChange,
}: {
  current: ThemeName;
  onChange: (t: ThemeName) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {THEMES.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`p-3 rounded-xl border text-left transition-all ${
            current === t.id
              ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/10"
              : "border-[var(--border)] hover:border-[var(--text-secondary)]"
          }`}
        >
          <span className="text-xl">{t.emoji}</span>
          <div className="font-bold text-sm text-[var(--text-primary)] mt-1">{t.label}</div>
          <div className="text-xs text-[var(--text-secondary)]">{t.desc}</div>
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Agent Customizer                                                   */
/* ------------------------------------------------------------------ */

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
    <div className="p-3 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">{agent.emoji}</span>
          <span className="font-bold text-[var(--text-primary)]">{agent.name}</span>
        </div>
        <button
          onClick={onRemove}
          className="text-xs text-[var(--accent-danger)] hover:underline"
        >
          Remove
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <input
          value={agent.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          placeholder="Name"
          className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
        />
        <input
          value={agent.emoji}
          onChange={(e) => onUpdate({ emoji: e.target.value })}
          placeholder="Emoji"
          className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
        />
      </div>
      <div>
        <div className="text-xs text-[var(--text-secondary)] mb-1">Avatar</div>
        <div className="flex gap-1 flex-wrap">
          {AVATAR_OPTIONS.map((av) => (
            <button
              key={av}
              onClick={() => onUpdate({ avatar: av })}
              className={`px-2 py-1 rounded-md text-xs border transition-colors ${
                agent.avatar === av
                  ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]"
                  : "border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              {av}
            </button>
          ))}
        </div>
      </div>
      <div>
        <div className="text-xs text-[var(--text-secondary)] mb-1">Color</div>
        <div className="flex gap-1">
          {AGENT_COLOR_PALETTE.map((c) => (
            <button
              key={c}
              onClick={() => onUpdate({ color: c })}
              className={`w-6 h-6 rounded-full border-2 transition-transform ${
                agent.color === c ? "border-white scale-125" : "border-transparent"
              }`}
              style={{ background: c }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Settings Panel                                                     */
/* ------------------------------------------------------------------ */

interface SettingsPanelProps {
  config: DashboardConfig;
  onUpdate: (config: DashboardConfig) => void;
  onClose: () => void;
}

export default function SettingsPanel({ config, onUpdate, onClose }: SettingsPanelProps) {
  const [tab, setTab] = useState<"gateway" | "agents" | "theme">("gateway");

  const updateGateway = (field: string, value: string) => {
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
      agents: config.agents.map((a) => (a.id === id ? { ...a, ...patch } : a)),
    });
  };

  const removeAgent = (id: string) => {
    onUpdate({ ...config, agents: config.agents.filter((a) => a.id !== id) });
  };

  const addAgent = () => {
    if (config.agents.length >= MAX_AGENTS) return;
    const idx = config.agents.length;
    const newAgent: AgentConfig = {
      id: `agent-${Date.now()}`,
      name: `Agent ${idx + 1}`,
      emoji: "🤖",
      color: AGENT_COLOR_PALETTE[idx % AGENT_COLOR_PALETTE.length],
      avatar: AVATAR_OPTIONS[idx % AVATAR_OPTIONS.length] as AgentAvatar,
    };
    onUpdate({ ...config, agents: [...config.agents, newAgent] });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-[var(--bg-primary)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
          <h2 className="text-lg font-bold text-[var(--text-primary)]">⚙️ Settings</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 text-[var(--text-secondary)]"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[var(--border)]">
          {(["gateway", "agents", "theme"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
                tab === t
                  ? "text-[var(--accent-primary)] border-b-2 border-[var(--accent-primary)]"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              {t === "gateway" ? "🔌 Gateway" : t === "agents" ? "🤖 Agents" : "🎨 Theme"}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6 max-h-96 overflow-y-auto space-y-4">
          {tab === "gateway" && (
            <>
              <div>
                <label className="text-xs text-[var(--text-secondary)] block mb-1">
                  Gateway URL
                </label>
                <input
                  value={config.gateway.url}
                  onChange={(e) => updateGateway("url", e.target.value)}
                  placeholder="http://localhost:18789"
                  className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
                />
              </div>
              <div>
                <label className="text-xs text-[var(--text-secondary)] block mb-1">
                  Auth Token
                </label>
                <input
                  type="password"
                  value={config.gateway.token}
                  onChange={(e) => updateGateway("token", e.target.value)}
                  placeholder="Optional"
                  className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
                />
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border)]">
                <div>
                  <div className="text-sm font-medium text-[var(--text-primary)]">Demo Mode</div>
                  <div className="text-xs text-[var(--text-secondary)]">
                    Simulate agents without gateway
                  </div>
                </div>
                <button
                  onClick={() => onUpdate({ ...config, demoMode: !config.demoMode })}
                  className={`w-11 h-6 rounded-full transition-colors ${
                    config.demoMode ? "bg-[var(--accent-primary)]" : "bg-[var(--border)]"
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
                      config.demoMode ? "translate-x-5" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>
            </>
          )}

          {tab === "agents" && (
            <>
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
                  className="w-full py-2.5 rounded-xl border border-dashed border-[var(--border)] text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent-primary)] transition-colors"
                >
                  + Add Agent ({config.agents.length}/{MAX_AGENTS})
                </button>
              )}
            </>
          )}

          {tab === "theme" && <ThemeSelector current={config.theme} onChange={updateTheme} />}
        </div>
      </div>
    </div>
  );
}
