"use client";

import { useState, useRef, useEffect } from "react";
import DOMPurify from "dompurify";
import type { ChatMessage } from "@/lib/types";

interface ChatWindowProps {
  agentId: string;
  agentName: string;
  agentEmoji: string;
  agentColor: string;
  messages: ChatMessage[];
  onSend: (agentId: string, message: string) => void;
  onClose: () => void;
  onOpen?: () => void;
}

export default function ChatWindow({
  agentId,
  agentName,
  agentEmoji,
  agentColor,
  messages,
  onSend,
  onClose,
  onOpen,
}: ChatWindowProps) {
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const userSentRef = useRef(false);
  const prevMessageCountRef = useRef(0);
  const onOpenRef = useRef(onOpen);
  onOpenRef.current = onOpen;

  // Fire onOpen only once on mount (not on every re-render)
  useEffect(() => {
    onOpenRef.current?.();
  }, []);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const prevCount = prevMessageCountRef.current;
    prevMessageCountRef.current = messages.length;

    // History just loaded (went from 0 to N) — scroll to bottom instantly
    if (prevCount === 0 && messages.length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: "instant" });
      return;
    }

    // Always scroll if user just sent a message
    if (userSentRef.current) {
      userSentRef.current = false;
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      return;
    }

    // Otherwise, only auto-scroll if already near the bottom
    const { scrollTop, scrollHeight, clientHeight } = container;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    if (isNearBottom) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    userSentRef.current = true;
    onSend(agentId, text);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="fixed right-0 top-0 bottom-0 w-96 z-50 flex flex-col bg-[var(--bg-primary)] border-l border-[var(--border)] shadow-2xl animate-slide-in">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]"
        style={{ background: `${agentColor}15` }}
      >
        <div className="flex items-center gap-2">
          <span className="text-xl">{agentEmoji}</span>
          <span className="font-bold text-[var(--text-primary)]">{agentName}</span>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 text-[var(--text-secondary)] transition-colors"
        >
          ✕
        </button>
      </div>

      {/* Messages */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-[var(--text-secondary)] text-sm mt-8">
            <span className="text-3xl block mb-2">{agentEmoji}</span>
            Start a conversation with {agentName}
          </div>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                msg.role === "user"
                  ? "bg-[var(--accent-primary)] text-white rounded-br-md"
                  : msg.role === "system"
                    ? "bg-[var(--bg-secondary)] text-[var(--text-secondary)] rounded-bl-md border border-[var(--border)]"
                    : "bg-[var(--bg-card)] text-[var(--text-primary)] rounded-bl-md border border-[var(--border)]"
              }`}
            >
              {msg.role === "user" || msg.role === "system" ? msg.content : DOMPurify.sanitize(msg.content)}
              {msg.scope !== "history" && (
                <div
                  className={`text-[10px] mt-1 ${
                    msg.role === "user" ? "text-white/60" : "text-[var(--text-secondary)]"
                  }`}
                >
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-[var(--border)]">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Message ${agentName}...`}
            rows={1}
            className="flex-1 bg-[var(--bg-card)] text-[var(--text-primary)] border border-[var(--border)] rounded-xl px-4 py-2 text-sm resize-none focus:outline-none focus:border-[var(--accent-primary)] placeholder:text-[var(--text-secondary)]"
          />
          <button
            onClick={handleSend}
            className="px-4 py-2 rounded-xl text-sm font-medium transition-colors"
            style={{ background: agentColor, color: "#fff" }}
          >
            ↑
          </button>
        </div>
      </div>
    </div>
  );
}
