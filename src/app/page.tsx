"use client";

import { useState } from "react";
import { useAgents } from "@/hooks/useAgents";
import Navbar from "@/components/dashboard/Navbar";
import SystemStats from "@/components/dashboard/SystemStats";
import AgentGrid from "@/components/dashboard/AgentGrid";
import ActivityFeed from "@/components/dashboard/ActivityFeed";
import MiniOffice from "@/components/office/MiniOffice";
import SettingsPanel from "@/components/settings/SettingsPanel";
import ChatWindow from "@/components/chat/ChatWindow";
import type { DashboardConfig, ThemeName } from "@/lib/types";
import { loadConfig, DEFAULT_OWNER } from "@/lib/config";

export default function DashboardPage() {
  const [showSettings, setShowSettings] = useState(false);
  const [chatAgent, setChatAgent] = useState<string | null>(null);
  const [theme, setTheme] = useState<ThemeName>("default");

  const {
    agents,
    agentStates,
    activityFeed,
    systemStats,
    demoMode,
    connected,
    chatMessages,
    sendChat,
    setBehavior,
    restartSession,
  } = useAgents();

  const openAgent = chatAgent ? agents.find((a) => a.id === chatAgent) : null;

  const [ownerConfig] = useState(() => {
    if (typeof window !== 'undefined') {
      return loadConfig().owner;
    }
    return DEFAULT_OWNER;
  });

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
            <ActivityFeed events={activityFeed} />
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
        />
      )}
    </div>
  );
}
