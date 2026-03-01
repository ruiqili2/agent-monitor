"use client";

import React, { useState, useEffect, useRef } from 'react';
import type { ChatMessage } from '@/lib/types';

interface EnhancedChatPanelProps {
  messages: ChatMessage[];
  connected: boolean;
  demoMode: boolean;
  totalAgents: number;
  onSend: (message: string) => void | Promise<void>;
}

type ChatFilter = 'all' | 'broadcast' | 'direct' | 'system' | 'mentions';

export default function EnhancedChatPanel({
  messages,
  connected,
  demoMode,
  totalAgents,
  onSend,
}: EnhancedChatPanelProps) {
  const [filter, setFilter] = useState<ChatFilter>('all');
  const [inputMessage, setInputMessage] = useState('');
  const [selectedChannel, setSelectedChannel] = useState<string>('general');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [typingAgents, setTypingAgents] = useState<Set<string>>(new Set());

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const filteredMessages = messages.filter(msg => {
    if (filter === 'all') return true;
    if (filter === 'mentions') return msg.content.includes('@');
    return msg.scope === filter;
  });

  const handleSend = () => {
    if (!inputMessage.trim() || !connected) return;
    onSend(inputMessage.trim());
    setInputMessage('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const channels = [
    { id: 'general', name: 'General', icon: '💬', count: messages.filter(m => m.scope === 'broadcast').length },
    { id: 'direct', name: 'Direct', icon: '💭', count: messages.filter(m => m.scope === 'direct').length },
    { id: 'system', name: 'System', icon: '🖥️', count: messages.filter(m => m.scope === 'system').length },
  ];

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl flex flex-col h-[600px]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
        <div className="flex items-center gap-3">
          <span className="text-2xl">💬</span>
          <div>
            <h2 className="font-pixel text-lg" style={{ color: 'var(--text-primary)' }}>
              Team Chat
            </h2>
            <div className="text-xs text-[var(--text-secondary)] flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
              {connected ? `${totalAgents} agents online` : 'Disconnected'}
            </div>
          </div>
        </div>
        
        {/* Filter Tabs */}
        <div className="flex gap-1">
          {(['all', 'broadcast', 'direct', 'system', 'mentions'] as ChatFilter[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
                filter === f
                  ? 'bg-[var(--accent-primary)] text-white'
                  : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-white/10'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Channel Selector */}
      <div className="flex gap-2 p-3 border-b border-[var(--border)]">
        {channels.map(channel => (
          <button
            key={channel.id}
            onClick={() => setSelectedChannel(channel.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all ${
              selectedChannel === channel.id
                ? 'bg-[var(--accent-primary)] text-white'
                : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-white/10'
            }`}
          >
            <span>{channel.icon}</span>
            <span>{channel.name}</span>
            {channel.count > 0 && (
              <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs">
                {channel.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {filteredMessages.length === 0 ? (
          <div className="text-center text-[var(--text-secondary)] text-sm py-12">
            No messages yet. Start the conversation!
          </div>
        ) : (
          filteredMessages.map((msg, index) => (
            <div
              key={msg.id}
              className={`flex items-start gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <div className="text-2xl">
                {msg.role === 'user' ? '👤' : msg.agentId === 'system' ? '🖥️' : '🤖'}
              </div>
              <div className={`flex-1 ${msg.role === 'user' ? 'text-right' : ''}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold text-[var(--text-primary)]">
                    {msg.role === 'user' ? 'You' : msg.agentName}
                  </span>
                  <span className="text-[10px] text-[var(--text-secondary)]">
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div
                  className={`inline-block px-4 py-2 rounded-xl text-sm ${
                    msg.role === 'user'
                      ? 'bg-[var(--accent-primary)] text-white'
                      : msg.agentId === 'system'
                      ? 'bg-[var(--bg-secondary)] text-[var(--text-secondary)]'
                      : 'bg-[var(--bg-card)] text-[var(--text-primary)] border border-[var(--border)]'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Typing Indicator */}
      {typingAgents.size > 0 && (
        <div className="px-4 py-2 text-xs text-[var(--text-secondary)]">
          {Array.from(typingAgents).join(', ')} typing...
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-[var(--border)]">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={connected ? "Type a message..." : "Disconnected..."}
            disabled={!connected}
            className="flex-1 px-4 py-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)] disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={!connected || !inputMessage.trim()}
            className="px-6 py-2 bg-[var(--accent-primary)] text-white rounded-lg hover:opacity-90 font-mono text-sm disabled:opacity-50"
          >
            Send
          </button>
        </div>
        <div className="mt-2 text-xs text-[var(--text-secondary)]">
          Press Enter to send, Shift+Enter for new line
        </div>
      </div>
    </div>
  );
}
