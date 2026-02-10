"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { loadConfig } from "@/lib/config";
import type { DashboardConfig } from "@/lib/types";
import { useAgents } from "@/hooks/useAgents";
import { useGateway } from "@/hooks/useGateway";
import AgentDetail from "@/components/agent/AgentDetail";
import TokenUsage from "@/components/agent/TokenUsage";
import SessionLog from "@/components/agent/SessionLog";
import ChatWindow from "@/components/chat/ChatWindow";

export default function AgentPage() {
  const params = useParams();
  const router = useRouter();
  const agentId = params.id as string;
  const [config, setConfig] = useState<DashboardConfig | null>(null);
  const [showChat, setShowChat] = useState(false);

  useEffect(() => {
    setConfig(loadConfig());
  }, []);

  const { connected } = useGateway(config?.gateway ?? { url: "", token: "" }, !config?.demoMode);
  const { agentStates, chatMessages, sendChat } = useAgents(
    config?.agents ?? [],
    config?.demoMode === false ? connected : false,
  );

  if (!config) return null;

  const agent = config.agents.find((a) => a.id === agentId);
  const state = agentStates[agentId];

  if (!agent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]" data-theme={config.theme}>
        <div className="text-center">
          <div className="text-4xl mb-4">🤷</div>
          <div className="text-[var(--text-primary)] text-lg font-bold">Agent not found</div>
          <button
            onClick={() => router.push("/")}
            className="mt-4 px-4 py-2 rounded-xl bg-[var(--accent-primary)] text-white text-sm"
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] p-6" data-theme={config.theme}>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Back button */}
        <button
          onClick={() => router.push("/")}
          className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          ← Back to Dashboard
        </button>

        {/* Agent detail header */}
        <AgentDetail agent={agent} state={state} onChatClick={() => setShowChat(true)} />

        {/* Token usage chart */}
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-5">
          <h3 className="text-sm font-bold text-[var(--text-primary)] mb-3">📊 Token Usage</h3>
          <TokenUsage data={state?.tokenUsage ?? []} />
        </div>

        {/* Session log */}
        <div>
          <h3 className="text-sm font-bold text-[var(--text-primary)] mb-3">🖥️ Session Log</h3>
          <SessionLog entries={state?.sessionLog ?? []} />
        </div>
      </div>

      {/* Chat window */}
      {showChat && (
        <ChatWindow
          agentId={agent.id}
          agentName={agent.name}
          agentEmoji={agent.emoji}
          agentColor={agent.color}
          messages={chatMessages[agent.id] ?? []}
          onSend={sendChat}
          onClose={() => setShowChat(false)}
        />
      )}
    </div>
  );
}
