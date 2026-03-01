'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAgents } from '@/hooks/useAgents';
import AgentDetail from '@/components/agent/AgentDetail';
import TokenUsage from '@/components/agent/TokenUsage';
import TaskList from '@/components/agent/TaskList';
import SessionLog from '@/components/agent/SessionLog';
import ChatWindow from '@/components/chat/ChatWindow';

export default function AgentPage() {
  const params = useParams();
  const router = useRouter();
  const agentId = params.id as string;
  const [showChat, setShowChat] = useState(false);

  const { agents, agentStates, chatMessages, sendChat, loadChatHistory } = useAgents();

  const agent = agents.find((entry) => entry.id === agentId);
  const state = agentStates[agentId];

  if (!agent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
        <div className="text-center">
          <div className="text-4xl mb-4">?</div>
          <div className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Agent not found</div>
          <button
            onClick={() => router.push('/')}
            className="mt-4 px-4 py-2 rounded-xl text-sm"
            style={{ backgroundColor: 'var(--accent-primary)', color: '#000' }}
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <button
          onClick={() => router.push('/')}
          className="text-sm transition-colors hover:opacity-80"
          style={{ color: 'var(--text-secondary)' }}
        >
          Back to Dashboard
        </button>

        <AgentDetail agent={agent} state={state} onChatClick={() => setShowChat(true)} />

        <div className="rounded-2xl p-5" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--text-primary)' }}>Token Usage</h3>
          <TokenUsage data={state?.tokenUsage ?? []} />
        </div>

        <TaskList
          currentTask={state?.currentTask ?? null}
          taskHistory={state?.taskHistory ?? []}
        />

        <div>
          <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--text-primary)' }}>Session Log</h3>
          <SessionLog entries={state?.sessionLog ?? []} />
        </div>
      </div>

      {showChat && (
        <ChatWindow
          agentId={agent.id}
          agentName={agent.name}
          agentEmoji={agent.emoji}
          agentColor={agent.color}
          messages={chatMessages[agent.id] ?? []}
          onSend={sendChat}
          onClose={() => setShowChat(false)}
          onOpen={() => loadChatHistory(agent.id)}
        />
      )}
    </div>
  );
}
