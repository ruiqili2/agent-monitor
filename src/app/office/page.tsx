"use client";

import { useState, useEffect } from "react";
import { loadConfig, saveConfig, type DashboardConfig } from "@/lib/config";
import { useAgents } from "@/hooks/useAgents";
import { useGateway } from "@/hooks/useGateway";
import { useOffice } from "@/hooks/useOffice";
import OfficeCanvasInner from "@/components/office/OfficeCanvas";
import OfficeControls from "@/components/office/OfficeControls";
import ChatWindow from "@/components/chat/ChatWindow";
import type { AgentBehavior } from "@/lib/types";

export default function OfficePage() {
  const [config, setConfig] = useState<DashboardConfig | null>(null);
  const [chatAgent, setChatAgent] = useState<string | null>(null);

  useEffect(() => {
    setConfig(loadConfig());
  }, []);

  const { connected } = useGateway(config?.gateway ?? { url: "", token: "" }, !config?.demoMode);

  const {
    agentStates,
    demoMode,
    chatMessages,
    sendChat,
    setBehavior,
  } = useAgents(config?.agents ?? [], config?.demoMode === false ? connected : false);

  const { officeState, tick } = useOffice(config?.agents ?? [], agentStates);

  useEffect(() => {
    if (config) saveConfig(config);
  }, [config]);

  if (!config) return null;

  const openAgent = chatAgent ? config.agents.find((a) => a.id === chatAgent) : null;

  return (
    <div className="h-screen flex flex-col bg-[var(--bg-primary)] overflow-hidden" data-theme={config.theme}>
      {/* Full screen office */}
      <div className="flex-1 relative flex items-center justify-center">
        <OfficeCanvasInner
          officeState={officeState}
          agents={config.agents}
          owner={config.owner}
          onTick={tick}
          width={1200}
          height={700}
        />
      </div>

      {/* Controls */}
      <OfficeControls
        agents={config.agents}
        agentStates={agentStates}
        demoMode={demoMode}
        onSetBehavior={(id: string, b: AgentBehavior) => setBehavior(id, b)}
      />

      {/* Chat window */}
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
