"use client";

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/dashboard/Navbar';

interface RegisteredAgent {
  id: string;
  agentName: string;
  agentEmoji: string;
  agentColor: string;
  computerName: string;
  status: 'active' | 'inactive' | 'offline';
  lastSeen: number;
  registeredAt: number;
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<RegisteredAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [registrationCode, setRegistrationCode] = useState('');

  useEffect(() => {
    loadAgents();
    const interval = setInterval(loadAgents, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const loadAgents = async () => {
    try {
      const response = await fetch('/api/agents/register');
      const data = await response.json();
      if (data.ok) {
        setAgents(data.agents);
      }
    } catch (error) {
      console.error('Failed to load agents:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#10B981';
      case 'inactive': return '#F59E0B';
      case 'offline': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const formatLastSeen = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  const copyRegistrationCode = () => {
    const code = `const sdk = new RemoteAgentSDK('${window.location.origin}');
await sdk.register({
  agentName: 'MyAgent',
  computerName: 'MyComputer',
  agentEmoji: '🤖',
  agentColor: '#3B82F6',
});`;
    navigator.clipboard.writeText(code);
    alert('Registration code copied to clipboard!');
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <Navbar connected={true} demoMode={false} onSettingsClick={() => {}} />
      
      <main className="mx-auto max-w-7xl px-4 pb-8 pt-24">
        <div className="mb-8">
          <h1 className="font-pixel text-3xl mb-4" style={{ color: 'var(--text-primary)' }}>
            🤖 Remote Agents
          </h1>
          <p className="text-[var(--text-secondary)] mb-6">
            Connect agents from other computers to this dashboard instance
          </p>
          
          {/* Registration Instructions */}
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-pixel text-xl" style={{ color: 'var(--text-primary)' }}>
                📝 Register New Agent
              </h2>
              <button
                onClick={copyRegistrationCode}
                className="px-4 py-2 bg-[var(--accent-primary)] text-white rounded-lg hover:opacity-90 font-mono text-sm"
              >
                📋 Copy Code
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="text-[var(--text-secondary)] text-sm">
                Use this code on remote computers to register agents:
              </div>
              
              <pre className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg p-4 overflow-x-auto text-xs font-mono text-[var(--text-primary)]">
{`import { RemoteAgentSDK } from '@/lib/remote-agent-sdk';

const sdk = new RemoteAgentSDK('${window.location.origin}');

await sdk.register({
  agentName: 'MyAgent',
  computerName: 'MyComputer',
  agentEmoji: '🤖',
  agentColor: '#3B82F6',
});

// Auto-heartbeat every 30 seconds
sdk.startHeartbeat();`}
              </pre>
              
              <div className="text-[var(--text-secondary)] text-xs">
                <p>Required package: npm install uuid</p>
                <p>SDK Location: /lib/remote-agent-sdk.ts</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Registered Agents */}
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-pixel text-xl" style={{ color: 'var(--text-primary)' }}>
              Connected Agents ({agents.length})
            </h2>
            <button
              onClick={loadAgents}
              className="px-3 py-1.5 bg-[var(--bg-secondary)] text-[var(--text-secondary)] rounded-lg hover:bg-white/10 text-sm"
            >
              🔄 Refresh
            </button>
          </div>
          
          {loading ? (
            <div className="text-center py-12 text-[var(--text-secondary)]">
              Loading agents...
            </div>
          ) : agents.length === 0 ? (
            <div className="text-center py-12 text-[var(--text-secondary)]">
              No agents registered yet. Use the registration code above to connect agents.
            </div>
          ) : (
            <div className="space-y-3">
              {agents.map(agent => (
                <div
                  key={agent.id}
                  className="flex items-center gap-4 p-4 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border)]"
                >
                  <span className="text-3xl">{agent.agentEmoji}</span>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-[var(--text-primary)]">
                        {agent.agentName}
                      </span>
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: getStatusColor(agent.status) }}
                      />
                      <span className="text-xs text-[var(--text-secondary)] capitalize">
                        {agent.status}
                      </span>
                    </div>
                    <div className="text-xs text-[var(--text-secondary)]">
                      {agent.computerName} • Last seen {formatLastSeen(agent.lastSeen)}
                    </div>
                  </div>
                  
                  <div className="text-xs text-[var(--text-secondary)] font-mono">
                    {agent.id.slice(0, 8)}...
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
