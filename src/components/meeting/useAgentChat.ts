import { useState, useEffect, useCallback, useRef } from 'react';

interface ChatMessage {
  id: string;
  agentId: string;
  agentName: string;
  agentEmoji: string;
  agentType: 'main' | 'subagent' | 'acp';
  content: string;
  timestamp: number;
  sessionId?: string;
}

interface UseAgentChatOptions {
  isActive: boolean;
  gatewayUrl?: string;
}

export function useAgentChat({ isActive, gatewayUrl = 'ws://127.0.0.1:18789' }: UseAgentChatOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [connectedAgents, setConnectedAgents] = useState<any[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  // Connect to Gateway WebSocket
  useEffect(() => {
    if (!isActive) return;

    const ws = new WebSocket(gatewayUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[AgentChat] Connected to Gateway');
      // Subscribe to chat events
      ws.send(JSON.stringify({
        type: 'subscribe',
        channel: 'chat'
      }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'chat_message' || data.type === 'chat.event') {
          const newMessage: ChatMessage = {
            id: data.id || `msg-${Date.now()}`,
            agentId: data.agentId || data.sessionKey,
            agentName: data.agentName || 'Agent',
            agentEmoji: data.emoji || '🤖',
            agentType: getAgentType(data.sessionKey || ''),
            content: data.content || data.message || '',
            timestamp: data.timestamp || Date.now(),
            sessionId: data.sessionId,
          };
          setMessages(prev => [...prev, newMessage]);
        }
      } catch (e) {
        console.error('[AgentChat] Parse error:', e);
      }
    };

    ws.onerror = (error) => {
      console.error('[AgentChat] WebSocket error:', error);
    };

    ws.onclose = () => {
      console.log('[AgentChat] Disconnected');
      // Auto-reconnect after 3 seconds
      setTimeout(() => {
        if (isActive && wsRef.current === ws) {
          // Trigger reconnection via useEffect dependency
        }
      }, 3000);
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
      wsRef.current = null;
    };
  }, [isActive, gatewayUrl]);

  // Send message to Gateway
  const sendMessage = useCallback(async (content: string, agentId?: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.error('[AgentChat] Not connected');
      return;
    }

    const message = {
      type: 'chat_message',
      content,
      agentId: agentId || 'user',
      timestamp: Date.now(),
      sessionId: sessionIdRef.current,
    };

    wsRef.current.send(JSON.stringify(message));
  }, []);

  // Start meeting session
  const startMeeting = useCallback(() => {
    sessionIdRef.current = `meeting-${Date.now()}`;
    setMessages([{
      id: 'system-1',
      agentId: 'system',
      agentName: 'System',
      agentEmoji: '🤖',
      agentType: 'main',
      content: 'Meeting started! Connected to OpenClaw Gateway.',
      timestamp: Date.now(),
    }]);
  }, []);

  // End meeting session
  const endMeeting = useCallback(() => {
    sessionIdRef.current = null;
    setMessages([]);
    setConnectedAgents([]);
  }, []);

  return {
    messages,
    connectedAgents,
    sendMessage,
    startMeeting,
    endMeeting,
    isConnected: wsRef.current?.readyState === WebSocket.OPEN,
  };
}

// Helper: Detect agent type from session key
function getAgentType(sessionKey: string): 'main' | 'subagent' | 'acp' {
  if (sessionKey.includes(':acp:')) return 'acp';
  if (sessionKey.includes(':subagent:')) return 'subagent';
  return 'main';
}
