/**
 * Remote Agent SDK
 * 
 * Use this to register and connect remote agents to the dashboard
 * 
 * Usage:
 * const sdk = new RemoteAgentSDK('http://your-dashboard:3000');
 * await sdk.register({ agentName: 'MyAgent', computerName: 'MyPC' });
 * await sdk.sendHeartbeat();
 */

export interface AgentConfig {
  agentName: string;
  agentEmoji?: string;
  agentColor?: string;
  computerName: string;
}

export interface RegistrationResult {
  ok: boolean;
  agentId: string;
  authToken: string;
  message: string;
}

export interface AgentStatus {
  id: string;
  agentName: string;
  status: 'active' | 'inactive' | 'offline';
  lastSeen: number;
}

export class RemoteAgentSDK {
  private baseUrl: string;
  private agentId: string | null = null;
  private authToken: string | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
  }

  /**
   * Register agent with dashboard
   */
  async register(config: AgentConfig): Promise<RegistrationResult> {
    try {
      const response = await fetch(`${this.baseUrl}/api/agents/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      const data = await response.json();
      
      if (data.ok) {
        this.agentId = data.agentId;
        this.authToken = data.authToken;
        
        // Auto-start heartbeat
        this.startHeartbeat();
        
        console.log(`[RemoteAgent] Registered as ${config.agentName} (${data.agentId})`);
      }
      
      return data;
    } catch (error) {
      console.error('[RemoteAgent] Registration failed:', error);
      throw error;
    }
  }

  /**
   * Send heartbeat to keep agent active
   */
  async sendHeartbeat(): Promise<void> {
    if (!this.agentId || !this.authToken) {
      throw new Error('Agent not registered');
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/agents/register`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: this.agentId,
          authToken: this.authToken,
        }),
      });

      const data = await response.json();
      
      if (!data.ok) {
        console.warn('[RemoteAgent] Heartbeat failed:', data.error);
      }
    } catch (error) {
      console.error('[RemoteAgent] Heartbeat error:', error);
    }
  }

  /**
   * Start automatic heartbeat (every 30 seconds)
   */
  startHeartbeat(intervalMs: number = 30000): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
    }, intervalMs);

    console.log(`[RemoteAgent] Heartbeat started (${intervalMs}ms interval)`);
  }

  /**
   * Stop heartbeat
   */
  stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
      console.log('[RemoteAgent] Heartbeat stopped');
    }
  }

  /**
   * Get list of registered agents
   */
  async getAgents(): Promise<AgentStatus[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/agents/register`);
      const data = await response.json();
      
      if (data.ok) {
        return data.agents;
      }
      
      return [];
    } catch (error) {
      console.error('[RemoteAgent] Failed to fetch agents:', error);
      return [];
    }
  }

  /**
   * Get current agent ID
   */
  getAgentId(): string | null {
    return this.agentId;
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.stopHeartbeat();
    this.agentId = null;
    this.authToken = null;
  }
}

// Export singleton instance
export const remoteAgent = new RemoteAgentSDK(window.location.origin);
