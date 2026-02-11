"use client";

import { useState } from "react";
import { useAgents } from "@/hooks/useAgents";
import { useOffice } from "@/hooks/useOffice";
import OfficeCanvasInner from "@/components/office/OfficeCanvas";
import OfficeControls from "@/components/office/OfficeControls";
import ChatWindow from "@/components/chat/ChatWindow";
import type { AgentBehavior } from "@/lib/types";
import { loadConfig, DEFAULT_OWNER } from "@/lib/config";

export default function OfficePage() {
  const [chatAgent, setChatAgent] = useState<string | null>(null);

  const {
    agents,
    agentStates,
    demoMode,
    connected,
    chatMessages,
    sendChat,
    setBehavior,
    loadChatHistory,
  } = useAgents();

  const { officeState, tick } = useOffice(agents, agentStates);

  const [ownerConfig] = useState(() => {
    if (typeof window !== 'undefined') {
      return loadConfig().owner;
    }
    return DEFAULT_OWNER;
  });
  const openAgent = chatAgent ? agents.find((a) => a.id === chatAgent) : null;

  return (
    <div className="h-screen flex flex-col bg-[var(--bg-primary)] overflow-hidden" data-theme="default">
      <div className="flex-1 relative flex items-center justify-center overflow-auto">
        <OfficeCanvasInner
          officeState={officeState}
          agents={agents}
          owner={ownerConfig}
          onTick={tick}
          width={1100}
          height={620}
          connected={connected}
          demoMode={demoMode}
        />
      </div>

      <OfficeControls
        agents={agents}
        agentStates={agentStates}
        demoMode={demoMode}
        onSetBehavior={(id: string, b: AgentBehavior) => setBehavior(id, b)}
      />

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
