import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

interface RegisterRequest {
  agentName: string;
  agentEmoji: string;
  agentColor: string;
  computerName: string;
  ipAddress: string;
  authToken?: string;
}

interface AgentRegistration {
  id: string;
  agentName: string;
  agentEmoji: string;
  agentColor: string;
  computerName: string;
  ipAddress: string;
  authToken: string;
  registeredAt: number;
  lastSeen: number;
  status: 'active' | 'inactive' | 'offline';
  capabilities: string[];
}

// In-memory store (should use database in production)
const registeredAgents = new Map<string, AgentRegistration>();

export async function POST(request: Request) {
  try {
    const body: RegisterRequest = await request.json();
    
    // Validate required fields
    if (!body.agentName || !body.computerName) {
      return NextResponse.json(
        { error: 'Missing required fields: agentName, computerName' },
        { status: 400 }
      );
    }
    
    // Generate unique ID and auth token
    const agentId = `agent-${uuidv4()}`;
    const authToken = uuidv4();
    
    // Create registration
    const registration: AgentRegistration = {
      id: agentId,
      agentName: body.agentName,
      agentEmoji: body.agentEmoji || '🤖',
      agentColor: body.agentColor || '#3B82F6',
      computerName: body.computerName,
      ipAddress: body.ipAddress || request.headers.get('x-forwarded-for') || 'unknown',
      authToken,
      registeredAt: Date.now(),
      lastSeen: Date.now(),
      status: 'active',
      capabilities: ['chat', 'tasks'],
    };
    
    // Store registration
    registeredAgents.set(agentId, registration);
    
    console.log(`[Agent Registration] New agent registered: ${agentName} from ${computerName}`);
    
    return NextResponse.json({
      ok: true,
      agentId,
      authToken,
      message: 'Agent registered successfully',
      registration: {
        id: agentId,
        agentName: registration.agentName,
        computerName: registration.computerName,
        status: registration.status,
      },
    });
  } catch (error) {
    console.error('[Agent Registration] Error:', error);
    return NextResponse.json(
      { error: 'Registration failed' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const agents = Array.from(registeredAgents.values()).map(agent => ({
      id: agent.id,
      agentName: agent.agentName,
      agentEmoji: agent.agentEmoji,
      agentColor: agent.agentColor,
      computerName: agent.computerName,
      status: agent.status,
      lastSeen: agent.lastSeen,
      registeredAt: agent.registeredAt,
    }));
    
    return NextResponse.json({
      ok: true,
      count: agents.length,
      agents,
    });
  } catch (error) {
    console.error('[Agent List] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch agents' },
      { status: 500 }
    );
  }
}

// Heartbeat endpoint
export async function PUT(request: Request) {
  try {
    const { agentId, authToken } = await request.json();
    
    const agent = registeredAgents.get(agentId);
    if (!agent || agent.authToken !== authToken) {
      return NextResponse.json(
        { error: 'Invalid agent credentials' },
        { status: 401 }
      );
    }
    
    // Update last seen
    agent.lastSeen = Date.now();
    agent.status = 'active';
    registeredAgents.set(agentId, agent);
    
    return NextResponse.json({
      ok: true,
      message: 'Heartbeat received',
    });
  } catch (error) {
    console.error('[Heartbeat] Error:', error);
    return NextResponse.json(
      { error: 'Heartbeat failed' },
      { status: 500 }
    );
  }
}
