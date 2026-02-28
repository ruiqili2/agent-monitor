"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import Navbar from "@/components/dashboard/Navbar";
import SystemStats from "@/components/dashboard/SystemStats";
import AgentGrid from "@/components/dashboard/AgentGrid";
import ActivityFeed from "@/components/dashboard/ActivityFeed";
import AutoworkPanel from "@/components/dashboard/AutoworkPanel";
import ChatWindow from "@/components/chat/ChatWindow";
import GlobalChatPanel from "@/components/chat/GlobalChatPanel";
import SettingsPanel from "@/components/settings/SettingsPanel";
import MiniOffice from "@/components/office/MiniOffice";
import TokenTracker from "@/components/TokenTracker";
import PerformanceMetrics from "@/components/PerformanceMetrics";
import KeyboardShortcuts from "@/components/KeyboardShortcuts";
import { useAgents } from "@/hooks/useAgents";
import type { AutoworkConfig, AutoworkPolicy, DashboardConfig } from "@/lib/types";
import { clearConfig, loadConfig, saveConfig } from "@/lib/config";

const DEFAULT_AUTOWORK: AutoworkConfig = {
  maxSendsPerTick: 2,
  defaultDirective:
    "Check your memory and recent context, then continue the highest-impact task for your role. Do real work now and move the task forward.",
  policies: {},
};

export default function DashboardPage() {
  const [showSettings, setShowSettings] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [chatAgent, setChatAgent] = useState<string | null>(null);
  const [config, setConfig] = useState<DashboardConfig>(() => loadConfig());
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
    restartSession,
    loadChatHistory,
  } = useAgents(config.demoMode);

  const openAgent = chatAgent ? agents.find((agent) => agent.id === chatAgent) : null;
  const ownerConfig = config.owner;
  const theme = config.theme;

  // Calculate aggregated token usage from all agents
  const tokenData = useMemo(() => {
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let totalTokens = 0;

    for (const agentId in agentStates) {
      const state = agentStates[agentId];
      totalInputTokens += state.inputTokens ?? 0;
      totalOutputTokens += state.outputTokens ?? 0;
      totalTokens += state.totalTokens ?? 0;
    }

    // Also use systemStats total as a fallback
    const finalTotal = totalTokens || systemStats.totalTokens;

    return {
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens,
      totalTokens: finalTotal,
    };
  }, [agentStates, systemStats.totalTokens]);

  // Calculate performance metrics from activity feed and agent states
  const performanceData = useMemo(() => {
    const tasksCompleted = activityFeed.filter(e => e.type === 'task_complete').length;
    const tasksFailed = activityFeed.filter(e => e.type === 'task_fail' || e.type === 'error').length;
    const totalTasks = Math.max(tasksCompleted + tasksFailed, 1);
    const successRate = ((tasksCompleted / totalTasks) * 100);

    // Calculate XP based on tokens used and tasks completed
    const xp = Math.floor((tokenData.totalTokens / 100) + (tasksCompleted * 50));

    // Calculate level (every 1000 XP = 1 level)
    const level = Math.floor(xp / 1000) + 1;

    // Calculate average response time (placeholder - would need real timing data)
    const avgResponseTime = 2.5; // seconds (placeholder)

    // Generate achievements from activity patterns
    const achievements: string[] = [];
    if (tasksCompleted >= 10) achievements.push('Task Master');
    if (tokenData.totalTokens >= 50000) achievements.push('Token Hoarder');
    if (systemStats.totalAgents >= 5) achievements.push('Team Builder');
    if (successRate >= 95) achievements.push('Perfectionist');
    if (systemStats.activeAgents >= 3) achievements.push('Multitasker');

    return {
      tasksCompleted,
      avgResponseTime,
      successRate,
      xp,
      level,
      achievements,
    };
  }, [activityFeed, tokenData.totalTokens, systemStats.totalAgents, systemStats.activeAgents]);

  useEffect(() => {
    saveConfig(config);
  }, [config]);

  const loadAutowork = useCallback(async () => {
    try {
      setAutoworkLoading(true);
      const response = await fetch("/api/gateway/autowork");
      const data = await response.json();
      if (data.ok && data.config) {
        setAutoworkConfig(data.config);
      }
    } catch {
      // Keep defaults.
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

  // Handle keyboard shortcuts
  const handleShortcut = useCallback((shortcut: string) => {
    switch (shortcut) {
      case 'toggle-theme':
        setConfig(prev => ({
          ...prev,
          theme: prev.theme === 'dark' ? 'default' : 'dark',
        }));
        break;
      case 'toggle-office':
        // Toggle office visibility - could be implemented with a state
        break;
      case 'command-palette':
        setShowSettings(prev => !prev);
        break;
    }
  }, []);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]" data-theme={theme}>
      <Navbar
        connected={connected}
        demoMode={demoMode}
        onSettingsClick={() => setShowSettings(true)}
      />

      <main className="mx-auto max-w-7xl px-4 pb-8 pt-14">
        <section className="mb-6">
          <MiniOffice
            agents={agents}
            agentStates={agentStates}
            ownerConfig={ownerConfig}
            theme={theme}
          />
        </section>

        <section className="mb-6">
          <SystemStats stats={systemStats} />
        </section>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
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
              <TokenTracker
                inputTokens={tokenData.inputTokens}
                outputTokens={tokenData.outputTokens}
                totalTokens={tokenData.totalTokens}
              />
              <PerformanceMetrics
                tasksCompleted={performanceData.tasksCompleted}
                avgResponseTime={performanceData.avgResponseTime}
                successRate={performanceData.successRate}
                xp={performanceData.xp}
                level={performanceData.level}
                achievements={performanceData.achievements}
              />
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

      <KeyboardShortcuts
        isOpen={showShortcuts}
        onClose={() => setShowShortcuts(false)}
        onShortcut={handleShortcut}
      />

      {showSettings && (
        <SettingsPanel
          config={config}
          connected={connected}
          sessionCount={agents.length}
          onUpdate={setConfig}
          onReset={() => {
            clearConfig();
            setConfig(loadConfig());
          }}
          onClose={() => setShowSettings(false)}
        />
      )}

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
