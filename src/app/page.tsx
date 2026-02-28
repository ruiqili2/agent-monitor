"use client";

import { useCallback, useEffect, useState } from "react";
import { useAgents } from "@/hooks/useAgents";
import Navbar from "@/components/dashboard/Navbar";
import SystemStats from "@/components/dashboard/SystemStats";
import AgentGrid from "@/components/dashboard/AgentGrid";
import ActivityFeed from "@/components/dashboard/ActivityFeed";
import AutoworkPanel from "@/components/dashboard/AutoworkPanel";
import MiniOffice from "@/components/office/MiniOffice";
import ChatWindow from "@/components/chat/ChatWindow";
import GlobalChatPanel from "@/components/chat/GlobalChatPanel";
import type { AutoworkConfig, AutoworkPolicy, ThemeName } from "@/lib/types";
import { loadConfig, DEFAULT_OWNER } from "@/lib/config";

const DEFAULT_AUTOWORK: AutoworkConfig = {
  maxSendsPerTick: 2,
  defaultDirective:
    "Check your memory and recent context, then continue the highest-impact task for your role. Do real work now and move the task forward.",
  policies: {},
};

export default function DashboardPage() {
  const [showSettings, setShowSettings] = useState(false);
  const [chatAgent, setChatAgent] = useState<string | null>(null);
  const [theme, setTheme] = useState<ThemeName>("default");
  const [autoworkConfig, setAutoworkConfig] = useState<AutoworkConfig>(DEFAULT_AUTOWORK);
  const [autoworkLoading, setAutoworkLoading] = useState(true);
  const [autoworkSaving, setAutoworkSaving] = useState(false);
  const [autoworkRunning, setAutoworkRunning] = useState(false);

  const {
    agents,
    agentStates,
    activityFeed,
    systemStats,
    demoMode,
    connected,
    chatMessages,
    globalChatMessages,
    sendChat,
    sendGlobalChat,
    setBehavior,
    restartSession,
    loadChatHistory,
  } = useAgents();

  const openAgent = chatAgent ? agents.find((a) => a.id === chatAgent) : null;

  const [ownerConfig] = useState(() => {
    if (typeof window !== 'undefined') {
      return loadConfig().owner;
    }
    return DEFAULT_OWNER;
  });

  const loadAutowork = useCallback(async () => {
    try {
      setAutoworkLoading(true);
      const response = await fetch("/api/gateway/autowork");
      const data = await response.json();
      if (data.ok && data.config) {
        setAutoworkConfig(data.config);
      }
    } catch {
      // Keep defaults
    } finally {
      setAutoworkLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAutowork();
  }, [loadAutowork, connected]);

  const saveAutoworkConfig = useCallback(async (patch: Partial<AutoworkConfig>) => {
    try {
      setAutoworkSaving(true);
      const response = await fetch("/api/gateway/autowork", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await response.json();
      if (data.ok && data.config) {
        setAutoworkConfig(data.config);
      }
    } finally {
      setAutoworkSaving(false);
    }
  }, []);

  const saveAutoworkPolicy = useCallback(async (sessionKey: string, patch: Partial<AutoworkPolicy>) => {
    try {
      setAutoworkSaving(true);
      const response = await fetch("/api/gateway/autowork", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionKey, ...patch }),
      });
      const data = await response.json();
      if (data.ok && data.config) {
        setAutoworkConfig(data.config);
      }
    } finally {
      setAutoworkSaving(false);
    }
  }, []);

  const runAutoworkNow = useCallback(async (sessionKey?: string) => {
    try {
      setAutoworkRunning(true);
      await fetch("/api/gateway/autowork", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sessionKey ? { sessionKey } : {}),
      });
      await loadAutowork();
    } finally {
      setAutoworkRunning(false);
    }
  }, [loadAutowork]);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]" data-theme={theme}>
      <Navbar
        connected={connected}
        demoMode={demoMode}
        onSettingsClick={() => setShowSettings(true)}
      />

      <main className="pt-14 px-4 pb-8 max-w-7xl mx-auto">
        {/* Mini Office Preview */}
        <section className="mb-6">
          <MiniOffice
            agents={agents}
            agentStates={agentStates}
            ownerConfig={ownerConfig}
            theme={theme}
          />
        </section>

        {/* System Stats */}
        <section className="mb-6">
          <SystemStats stats={systemStats} />
        </section>

        {/* Main content: Agent Grid + Activity Feed */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <AgentGrid
              agents={agents}
              agentStates={agentStates}
              onChatClick={(id) => setChatAgent(id)}
              onRestart={(id) => restartSession(id)}
            />
          </div>
          <div>
            <div className="space-y-6">
              <GlobalChatPanel
                messages={globalChatMessages}
                connected={connected}
                demoMode={demoMode}
                totalAgents={agents.filter((agent) => !agent.isSubagent).length}
                onSend={(message) => sendGlobalChat(message, ownerConfig)}
              />
              <AutoworkPanel
                agents={agents}
                config={autoworkConfig}
                loading={autoworkLoading}
                saving={autoworkSaving}
                running={autoworkRunning}
                onSaveConfig={saveAutoworkConfig}
                onSavePolicy={saveAutoworkPolicy}
                onRunNow={runAutoworkNow}
              />
              <ActivityFeed events={activityFeed} />
            </div>
          </div>
        </div>
      </main>

      {/* Settings Modal — simplified for now */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowSettings(false)}>
          <div className="bg-[var(--bg-secondary)] rounded-2xl p-6 max-w-md w-full mx-4 border border-[var(--border)]" onClick={e => e.stopPropagation()}>
            <h2 className="font-pixel text-lg mb-4" style={{ color: 'var(--text-primary)' }}>⚙️ Settings</h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-mono block mb-1" style={{ color: 'var(--text-secondary)' }}>Status</label>
                <div className="text-sm" style={{ color: connected ? 'var(--accent-success)' : 'var(--accent-warning)' }}>
                  {connected ? '● Connected to OpenClaw Gateway' : '● Demo Mode (no gateway)'}
                </div>
                <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                  {connected
                    ? `Monitoring ${agents.length} session(s)`
                    : 'Dashboard auto-connects to local OpenClaw gateway'}
                </div>
              </div>
              <div>
                <label className="text-xs font-mono block mb-2" style={{ color: 'var(--text-secondary)' }}>Theme</label>
                <div className="flex gap-2">
                  {(['default', 'dark', 'cozy', 'cyberpunk'] as ThemeName[]).map(t => (
                    <button
                      key={t}
                      onClick={() => setTheme(t)}
                      className={`text-xs font-mono px-3 py-1.5 rounded-lg transition-colors ${theme === t ? 'ring-2' : ''}`}
                      style={{
                        backgroundColor: theme === t ? 'var(--accent-primary)' : 'var(--bg-card)',
                        color: theme === t ? '#000' : 'var(--text-primary)',
                        border: '1px solid var(--border)',
                      }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowSettings(false)}
              className="mt-6 w-full text-sm font-mono py-2 rounded-lg hover:opacity-80 transition-opacity"
              style={{ backgroundColor: 'var(--accent-primary)', color: '#000' }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Chat Window */}
      {openAgent && (
        <ChatWindow
          agentId={openAgent.id}
          agentName={openAgent.name}
          agentEmoji={openAgent.emoji}
          agentColor={openAgent.color}
          messages={chatMessages[openAgent.id] ?? []}
          onSend={sendChat}
          onClose={() => setChatAgent(null)}
          onOpen={() => loadChatHistory(openAgent.id)}
        />
      )}
    </div>
  );
}
