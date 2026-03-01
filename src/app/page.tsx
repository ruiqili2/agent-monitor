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
import AgentMeeting from "@/components/meeting/AgentMeeting";
import AchievementList from "@/components/achievements/AchievementList";
import Leaderboard from "@/components/achievements/Leaderboard";
import MetricsDashboard from "@/components/metrics/MetricsDashboard";
import KeyboardShortcuts from "@/components/KeyboardShortcuts";
import { useAgents } from "@/hooks/useAgents";
import { initialAchievementState, checkAchievements } from "@/lib/achievements";
import { initialXPState, addXP, calculateTokenXP } from "@/lib/xp";
import type { AutoworkConfig, AutoworkPolicy, DashboardConfig } from "@/lib/types";
import { clearConfig, loadConfig, saveConfig } from "@/lib/config";

const DEFAULT_AUTOWORK: AutoworkConfig = {
  maxSendsPerTick: 0, // Disabled by default
  defaultDirective:
    "Check your memory and recent context, then continue the highest-impact task for your role. Do real work now and move the task forward.",
  policies: {},
};

type DashboardTab = 'overview' | 'achievements' | 'leaderboard' | 'metrics';

export default function DashboardPage() {
  const [showSettings, setShowSettings] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [chatAgent, setChatAgent] = useState<string | null>(null);
  const [config, setConfig] = useState<DashboardConfig>(() => loadConfig());
  const [autoworkConfig, setAutoworkConfig] = useState<AutoworkConfig>(DEFAULT_AUTOWORK);
  const [autoworkLoading, setAutoworkLoading] = useState(true);
  const [autoworkSaving, setAutoworkSaving] = useState(false);
  const [autoworkRunning, setAutoworkRunning] = useState(false);
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
  const [newUnlock, setNewUnlock] = useState<any>(null);
  const [levelUp, setLevelUp] = useState<{old: number, new: number, title: string, badge: string} | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [swipeStart, setSwipeStart] = useState<number | null>(null);
  
  // Achievement & XP State
  const [achievementState, setAchievementState] = useState(initialAchievementState);
  const [xpState, setXpState] = useState(initialXPState);

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

  useEffect(() => {
    saveConfig(config);
  }, [config]);

  // Check achievements when stats change
  useEffect(() => {
    const stats = {
      tokens_sent: systemStats.totalTokens || 0,
      tasks_completed: systemStats.completedTasks || 0,
      meetings_attended: 0,
      messages_sent: globalChatMessages.length,
      days_active: 1,
    };
    
    const newState = checkAchievements(achievementState, stats);
    if (newState.totalXP !== achievementState.totalXP) {
      const xpGained = newState.totalXP - achievementState.totalXP;
      setXpState(prev => addXP(prev, xpGained, 'achievements', 'Achievement unlocked!'));
    }
    setAchievementState(newState);
  }, [systemStats.totalTokens, systemStats.completedTasks, globalChatMessages.length]);

  // Add XP for tokens sent
  useEffect(() => {
    if (systemStats.totalTokens > 0) {
      const tokenXP = calculateTokenXP(systemStats.totalTokens);
      setXpState(prev => ({
        ...prev,
        totalXP: prev.totalXP + tokenXP,
        level: prev.level,
        currentXP: prev.currentXP,
        progressToNextLevel: prev.progressToNextLevel,
        xpHistory: prev.xpHistory,
      }));
    }
  }, [systemStats.totalTokens]);

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

  // Render active tab
  const renderTab = () => {
    switch (activeTab) {
      case 'achievements':
        return (
          <div className="space-y-6">
            <AchievementList 
              achievements={achievementState.achievements}
              filter="all"
            />
          </div>
        );
      case 'leaderboard':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-6">
            <Leaderboard
              entries={agents.map((a, i) => ({
                rank: i + 1,
                agentId: a.id,
                agentName: a.name || a.id,
                agentEmoji: a.emoji || '🤖',
                value: agentStates[a.id]?.totalTokens || 0,
              })).sort((a, b) => b.value - a.value)}
              title="Top Agents by Tokens"
              icon="📊"
            />
            <Leaderboard
              entries={agents.map((a, i) => ({
                rank: i + 1,
                agentId: a.id,
                agentName: a.name || a.id,
                agentEmoji: a.emoji || '🤖',
                value: 0,
              })).sort((a, b) => b.value - a.value)}
              title="Top Agents by Tasks"
              icon="✅"
            />
          </div>
        );
      case 'metrics':
        return (
          <MetricsDashboard
            data={{
              tokensSent: systemStats.totalTokens || 0,
              tasksCompleted: systemStats.completedTasks || 0,
              meetingsAttended: 0,
              messagesSent: globalChatMessages.length,
              avgResponseTime: 2.5,
              productivityScore: 85,
            }}
            period="weekly"
          />
        );
      default:
        return (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-6 mb-4 sm:mb-6">
              <div className="xl:col-span-2">
                <AgentGrid
                  agents={agents}
                  agentStates={agentStates}
                  onChatClick={(id) => setChatAgent(id)}
                />
              </div>
              <div className="space-y-6">
                <TokenTracker
                  totalTokens={systemStats.totalTokens || 0}
                  inputTokens={systemStats.totalTokens || 0}
                  outputTokens={0}
                />
                <PerformanceMetrics
                  tasksCompleted={systemStats.completedTasks || 0}
                  avgResponseTime={2.5}
                  successRate={95}
                  xp={xpState.totalXP}
                  level={xpState.level}
                  achievements={[]}
                />
                <AgentMeeting agents={agents} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-6">
              <div className="xl:col-span-2 space-y-6">
                <MiniOffice 
                  agents={agents} 
                  agentStates={agentStates}
                  ownerConfig={ownerConfig}
                  theme={theme}
                />
                <ActivityFeed events={activityFeed} />
              </div>
              <div className="space-y-6">
                <AutoworkPanel
                  agents={agents}
                  config={autoworkConfig}
                  loading={autoworkLoading}
                  saving={autoworkSaving}
                  running={autoworkRunning}
                  onSaveConfig={saveAutoworkConfig}
                  onSavePolicy={async () => {}}
                  onRunNow={runAutoworkNow}
                />
                <SystemStats stats={systemStats} />
              </div>
            </div>
          </>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]" data-theme={theme}>
      <Navbar
        connected={connected}
        demoMode={demoMode}
        onSettingsClick={() => setShowSettings(true)}
      />

      <main className="mx-auto max-w-7xl px-2 sm:px-4 pb-8 pt-20 sm:pt-24">
        {/* Mobile Tab Navigation - Horizontal Scroll with Touch */}
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-[var(--bg-primary)] border-t border-[var(--border)] md:relative md:bg-transparent md:border-none md:mb-6 -mx-2 px-2 md:mx-0 md:px-0">
          <div 
            className="flex md:gap-2 gap-1 overflow-x-auto scrollbar-hide py-2 md:py-0"
            style={{ WebkitOverflowScrolling: 'touch' }}
            onTouchStart={(e) => setSwipeStart(e.touches[0].clientX)}
            onTouchEnd={(e) => {
              if (swipeStart === null) return;
              const diff = swipeStart - e.changedTouches[0].clientX;
              const tabs: DashboardTab[] = ['overview', 'achievements', 'leaderboard', 'metrics'];
              const currentIdx = tabs.indexOf(activeTab);
              if (Math.abs(diff) > 50) {
                if (diff > 0 && currentIdx < tabs.length - 1) {
                  setActiveTab(tabs[currentIdx + 1]);
                } else if (diff < 0 && currentIdx > 0) {
                  setActiveTab(tabs[currentIdx - 1]);
                }
              }
              setSwipeStart(null);
            }}
          >
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex-shrink-0 px-3 sm:px-4 py-2.5 sm:py-2 rounded-lg font-mono text-xs sm:text-sm transition-all min-w-[60px] sm:min-w-auto ${
                activeTab === 'overview'
                  ? 'bg-[var(--accent-primary)] text-white'
                  : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-white/10'
              }`}
            >
              <span className="md:hidden text-lg">📊</span>
              <span className="hidden md:inline">📊 Overview</span>
            </button>
            <button
              onClick={() => setActiveTab('achievements')}
              className={`flex-shrink-0 px-3 sm:px-4 py-2.5 sm:py-2 rounded-lg font-mono text-xs sm:text-sm transition-all min-w-[60px] sm:min-w-auto ${
                activeTab === 'achievements'
                  ? 'bg-[var(--accent-primary)] text-white'
                  : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-white/10'
              }`}
            >
              <span className="md:hidden text-lg">🏆</span>
              <span className="hidden md:inline">🏆 Achievements ({achievementState.unlockedCount}/{achievementState.achievements.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('leaderboard')}
              className={`flex-shrink-0 px-3 sm:px-4 py-2.5 sm:py-2 rounded-lg font-mono text-xs sm:text-sm transition-all min-w-[60px] sm:min-w-auto ${
                activeTab === 'leaderboard'
                  ? 'bg-[var(--accent-primary)] text-white'
                  : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-white/10'
              }`}
            >
              <span className="md:hidden text-lg">🏅</span>
              <span className="hidden md:inline">🏅 Leaderboard</span>
            </button>
            <button
              onClick={() => setActiveTab('metrics')}
              className={`flex-shrink-0 px-3 sm:px-4 py-2.5 sm:py-2 rounded-lg font-mono text-xs sm:text-sm transition-all min-w-[60px] sm:min-w-auto ${
                activeTab === 'metrics'
                  ? 'bg-[var(--accent-primary)] text-white'
                  : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-white/10'
              }`}
            >
              <span className="md:hidden text-lg">📈</span>
              <span className="hidden md:inline">📈 Metrics</span>
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {renderTab()}
      </main>

      {openAgent && (
        <ChatWindow
          agentId={openAgent.id}
          agentName={openAgent.name}
          agentEmoji={openAgent.emoji}
          agentColor={openAgent.color}
          messages={chatMessages[openAgent.id] || []}
          onSend={sendChat}
          onClose={() => setChatAgent(null)}
        />
      )}

      <GlobalChatPanel
        messages={globalChatMessages}
        connected={connected}
        demoMode={demoMode}
        totalAgents={agents.length}
        onSend={sendGlobalChat}
      />

      {showSettings && (
        <SettingsPanel
          config={config}
          connected={connected}
          sessionCount={1}
          onUpdate={setConfig}
          onReset={() => {}}
          onClose={() => setShowSettings(false)}
        />
      )}

      {showShortcuts && (
        <KeyboardShortcuts
          isOpen={showShortcuts}
          onClose={() => setShowShortcuts(false)}
        />
      )}
    </div>
  );
}
