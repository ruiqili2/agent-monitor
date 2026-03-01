"use client";

import React, { useRef } from 'react';
import { useAgentChat } from './useAgentChat';

interface AgentMeetingProps {
  agents?: any[];
}

function getAgentType(sessionKey: string): 'main' | 'subagent' | 'acp' {
  if (sessionKey.includes(':acp:')) return 'acp';
  if (sessionKey.includes(':subagent:')) return 'subagent';
  return 'main';
}

function getAgentTypeBadge(type: 'main' | 'subagent' | 'acp') {
  switch (type) {
    case 'acp': return { label: 'ACP', color: '#8B5CF6', emoji: '⚡' };
    case 'subagent': return { label: 'Sub-Agent', color: '#F59E0B', emoji: '🧩' };
    default: return { label: 'Main', color: '#10B981', emoji: '🤖' };
  }
}

export default function AgentMeeting({ agents = [] }: AgentMeetingProps) {
  const [isMeetingActive, setIsMeetingActive] = React.useState(false);
  const [inputMessage, setInputMessage] = React.useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    connectedAgents,
    sendMessage,
    startMeeting,
    endMeeting,
    isConnected,
  } = useAgentChat({ isActive: isMeetingActive });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  React.useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleStartMeeting = () => {
    setIsMeetingActive(true);
    startMeeting();
  };

  const handleEndMeeting = () => {
    setIsMeetingActive(false);
    endMeeting();
  };

  const handleSendMessage = () => {
    if (!inputMessage.trim() || !isMeetingActive) return;
    sendMessage(inputMessage.trim());
    setInputMessage('');
  };

  const allAgents = React.useMemo(() => {
    const agentMap = new Map();
    agents.forEach(agent => {
      if (!agentMap.has(agent.id)) {
        const agentType = getAgentType(agent.key || '');
        const badge = getAgentTypeBadge(agentType);
        agentMap.set(agent.id, { ...agent, agentType, badge });
      }
    });
    return Array.from(agentMap.values());
  }, [agents]);

  if (!isMeetingActive) {
    return (
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-pixel text-lg" style={{ color: 'var(--text-primary)' }}>
            💬 Agent Meeting Room
          </h2>
          <button
            onClick={handleStartMeeting}
            className="px-4 py-2 bg-[var(--accent-primary)] text-white rounded-lg hover:opacity-90 font-mono text-sm"
          >
            Start Meeting
          </button>
        </div>
        <p className="text-[var(--text-secondary)] text-sm mb-4">
          Bring all your agents together for collaborative discussions via OpenClaw Gateway.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
          <div className="flex items-center gap-1 text-[var(--text-secondary)]">
            <span>🤖</span> Main Agents
          </div>
          <div className="flex items-center gap-1 text-[var(--text-secondary)]">
            <span>🧩</span> Sub-Agents
          </div>
          <div className="flex items-center gap-1 text-[var(--text-secondary)]">
            <span>⚡</span> ACP Agents
          </div>
          <div className="flex items-center gap-1 text-[var(--text-secondary)]">
            <span>🤝</span> Collaboration
          </div>
        </div>
        {allAgents.length > 0 && (
          <div className="mt-4 pt-4 border-t border-[var(--border)]">
            <p className="text-xs text-[var(--text-secondary)] mb-2">
              Available Agents ({allAgents.length}):
            </p>
            <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
              {allAgents.slice(0, 12).map(agent => (
                <span 
                  key={agent.id} 
                  className="text-xs px-2 py-1 bg-[var(--bg-secondary)] rounded border"
                  style={{ borderColor: agent.badge.color }}
                >
                  {agent.emoji || agent.badge.emoji} {agent.name || agent.id}
                  <span className="ml-1 text-[9px]" style={{ color: agent.badge.color }}>
                    [{agent.badge.label}]
                  </span>
                </span>
              ))}
              {allAgents.length > 12 && (
                <span className="text-xs px-2 py-1 bg-[var(--bg-secondary)] rounded">
                  +{allAgents.length - 12} more
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-pixel text-lg" style={{ color: 'var(--text-primary)' }}>
          💬 Agent Meeting {isConnected ? '🟢' : '🔴'}
        </h2>
        <button
          onClick={handleEndMeeting}
          className="px-3 py-1.5 bg-[var(--bg-secondary)] text-[var(--text-secondary)] rounded-lg hover:bg-white/10 text-sm"
        >
          End Meeting
        </button>
      </div>

      {/* Connection Status */}
      <div className="mb-4 p-3 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border)]">
        <div className="flex items-center justify-between text-xs">
          <span className="text-[var(--text-secondary)]">
            Gateway: {isConnected ? 'Connected' : 'Connecting...'}
          </span>
          <span className="text-[var(--text-secondary)]">
            Agents: {connectedAgents.length || allAgents.length}
          </span>
        </div>
      </div>

      {/* Messages */}
      <div className="mb-4 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border)] p-4 h-96 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="text-center text-[var(--text-secondary)] text-sm py-8">
            Meeting started. Waiting for messages...
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map(msg => {
              const badge = msg.agentType !== 'main' ? getAgentTypeBadge(msg.agentType) : null;
              return (
                <div
                  key={msg.id}
                  className={`flex items-start gap-2 ${msg.agentId === 'user' ? 'flex-row-reverse' : ''}`}
                >
                  <span className="text-lg">{msg.agentEmoji}</span>
                  <div className={`flex-1 ${msg.agentId === 'user' ? 'text-right' : ''}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-[var(--text-primary)]">
                        {msg.agentName}
                      </span>
                      {badge && (
                        <span 
                          className="text-[10px] px-1.5 py-0.5 rounded text-white"
                          style={{ backgroundColor: badge.color }}
                        >
                          {badge.emoji} {badge.label}
                        </span>
                      )}
                      <span className="text-[10px] text-[var(--text-secondary)]">
                        {new Date(msg.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-sm text-[var(--text-secondary)] bg-[var(--bg-card)] px-3 py-2 rounded-lg inline-block">
                      {msg.content}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          placeholder="Type a message..."
          disabled={!isConnected}
          className="flex-1 px-4 py-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)] disabled:opacity-50"
        />
        <button
          onClick={handleSendMessage}
          disabled={!isConnected || !inputMessage.trim()}
          className="px-4 py-2 bg-[var(--accent-primary)] text-white rounded-lg hover:opacity-90 font-mono text-sm disabled:opacity-50"
        >
          Send
        </button>
      </div>

      {/* Participants */}
      <div className="mt-4 pt-4 border-t border-[var(--border)]">
        <p className="text-xs text-[var(--text-secondary)] mb-2">
          Participants ({allAgents.length + 1}):
        </p>
        <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
          <span className="text-xs px-2 py-1 bg-[var(--bg-card)] rounded">
            👤 You
          </span>
          {allAgents.slice(0, 8).map(agent => (
            <span key={agent.id} className="text-xs px-2 py-1 bg-[var(--bg-card)] rounded border" style={{ borderColor: agent.badge.color }}>
              {agent.emoji || agent.badge.emoji} {agent.name || agent.id}
            </span>
          ))}
          {allAgents.length > 8 && (
            <span className="text-xs px-2 py-1 bg-[var(--bg-card)] rounded">
              +{allAgents.length - 8} more
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
