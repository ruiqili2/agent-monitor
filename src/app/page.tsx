"use client";

import { useState, useEffect } from "react";
import { loadConfig, saveConfig, type DashboardConfig } from "@/lib/config";
import { useAgents } from "@/hooks/useAgents";
import { useGateway } from "@/hooks/useGateway";
import Navbar from "@/components/dashboard/Navbar";
import SystemStats from "@/components/dashboard/SystemStats";
import AgentGrid from "@/components/dashboard/AgentGrid";
import ActivityFeed from "@/components/dashboard/ActivityFeed";
import MiniOffice from "@/components/office/MiniOffice";
import SettingsPanel from "@/components/settings/SettingsPanel";
import ChatWindow from "@/components/chat/ChatWindow";

export default function DashboardPage() {
  const [config, setConfig] = useState<DashboardConfig | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [chatAgent, setChatAgent] = useState<string | null>(null);

  useEffect(() => {
    setConfig(loadConfig());
  }, []);

  const { connected } = useGateway(
    config?.gateway ?? { url: "", token: "" },
    !config?.demoMode,
  );

  const {
    agentStates,
    activityFeed,
    systemStats,
    demoMode,
    chatMessages,
    sendChat,
    setBehavior,
  } = useAgents(config?.agents ?? [], config?.demoMode === false ? connected : false);

  useEffect(() => {
    if (config) saveConfig(config);
  }, [config]);

  if (!config) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
        <div className="text-cyan-400 animate-pulse text-lg font-mono">Loading AgentMonitor...</div>
      </div>
    );
  }

  const openAgent = chatAgent ? config.agents.find((a) => a.id === chatAgent) : null;

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]" data-theme={config.theme}>
      <Navbar
        connected={connected}
        demoMode={demoMode}
        onSettingsClick={() => setShowSettings(true)}
      />

      <main className="pt-14 px-4 pb-8 max-w-7xl mx-auto">
        {/* Mini Office Preview */}
        <section className="mb-6">
          <MiniOffice
            agents={config.agents}
            agentStates={agentStates}
            ownerConfig={config.owner}
            theme={config.theme}
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
              agents={config.agents}
              agentStates={agentStates}
              onChatClick={(id) => setChatAgent(id)}
            />
          </div>
          <div>
            <ActivityFeed events={activityFeed} />
          </div>
        </div>
      </main>

      {/* Settings Modal */}
      {showSettings && (
        <SettingsPanel
          config={config}
          onUpdate={(c) => setConfig(c)}
          onClose={() => setShowSettings(false)}
        />
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
