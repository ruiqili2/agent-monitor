// ============================================================================
// Agent Protocol — Inter-Agent Messaging & Discovery Protocol
// ============================================================================

import type { AgentBehavior, AgentState, AgentConfig } from './types';

// ---------------------------------------------------------------------------
// Message Types
// ---------------------------------------------------------------------------

/** Unique identifier for messages */
export type MessageId = string;

/** Unique identifier for agents */
export type AgentId = string;

/** Message priority levels */
export type MessagePriority = 'low' | 'normal' | 'high' | 'critical';

/** Message delivery guarantees */
export type DeliveryGuarantee = 'at-most-once' | 'at-least-once' | 'exactly-once';

/** Base message envelope */
export interface MessageEnvelope {
  id: MessageId;
  type: MessageType;
  from: AgentId;
  to: AgentId | 'broadcast' | 'multicast';
  timestamp: number;
  priority: MessagePriority;
  guarantee: DeliveryGuarantee;
  ttl?: number; // Time-to-live in ms
  correlationId?: MessageId; // For request/response correlation
  requiresAck?: boolean;
  ackedBy?: AgentId[];
  expiresAt?: number;
}

/** All message types in the protocol */
export type MessageType =
  | 'discovery:announce'
  | 'discovery:heartbeat'
  | 'discovery:leave'
  | 'state:sync'
  | 'state:request'
  | 'task:assign'
  | 'task:accept'
  | 'task:reject'
  | 'task:update'
  | 'task:complete'
  | 'task:fail'
  | 'collab:invite'
  | 'collab:join'
  | 'collab:leave'
  | 'collab:share'
  | 'chat:direct'
  | 'chat:broadcast'
  | 'system:ping'
  | 'system:pong'
  | 'system:error';

// ---------------------------------------------------------------------------
// Discovery Messages
// ---------------------------------------------------------------------------

/** Agent capabilities advertised during discovery */
export interface AgentCapabilities {
  canReceiveTasks: boolean;
  canDelegate: boolean;
  canCollaborate: boolean;
  supportedProtocols: string[];
  maxConcurrentTasks: number;
  specializations: string[];
  modelProvider?: string;
  model?: string;
}

/** Agent announces its presence */
export interface DiscoveryAnnounceMessage extends MessageEnvelope {
  type: 'discovery:announce';
  to: 'broadcast';
  payload: {
    agent: AgentConfig;
    capabilities: AgentCapabilities;
    status: AgentStatus;
  };
}

/** Periodic heartbeat to maintain presence */
export interface DiscoveryHeartbeatMessage extends MessageEnvelope {
  type: 'discovery:heartbeat';
  to: 'broadcast';
  payload: {
    status: AgentStatus;
    load: number; // 0-1 indicating current workload
    activeTasks: number;
  };
}

/** Agent leaving the mesh */
export interface DiscoveryLeaveMessage extends MessageEnvelope {
  type: 'discovery:leave';
  to: 'broadcast';
  payload: {
    reason: 'shutdown' | 'error' | 'timeout' | 'manual';
  };
}

// ---------------------------------------------------------------------------
// State Sync Messages
// ---------------------------------------------------------------------------

/** Agent's current status */
export interface AgentStatus {
  behavior: AgentBehavior;
  officeState: AgentState;
  currentTaskId?: string;
  tokenUsage: {
    input: number;
    output: number;
    total: number;
    context?: number;
    maxContext?: number;
  };
  lastActivity: number;
  isAvailable: boolean;
}

/** Full or partial state sync */
export interface StateSyncMessage extends MessageEnvelope {
  type: 'state:sync';
  payload: {
    full: boolean;
    status: AgentStatus;
    delta?: Partial<AgentStatus>;
  };
}

/** Request state from specific agent(s) */
export interface StateRequestMessage extends MessageEnvelope {
  type: 'state:request';
  payload: {
    fullState: boolean;
    includeHistory?: boolean;
  };
}

// ---------------------------------------------------------------------------
// Task Delegation Messages
// ---------------------------------------------------------------------------

/** Task priority */
export type TaskPriority = 'low' | 'normal' | 'high' | 'urgent' | 'critical';

/** Task definition */
export interface TaskDefinition {
  id: string;
  title: string;
  description: string;
  priority: TaskPriority;
  deadline?: number;
  dependencies?: string[]; // Task IDs that must complete first
  requiredCapabilities?: string[];
  estimatedTokens?: number;
  parentTaskId?: string;
  subtaskIds?: string[];
  metadata?: Record<string, unknown>;
}

/** Assign a task to an agent */
export interface TaskAssignMessage extends MessageEnvelope {
  type: 'task:assign';
  payload: {
    task: TaskDefinition;
    assignedBy: AgentId;
    context?: string;
    attachments?: { name: string; url: string; type: string }[];
  };
}

/** Accept a task assignment */
export interface TaskAcceptMessage extends MessageEnvelope {
  type: 'task:accept';
  payload: {
    taskId: string;
    estimatedCompletion?: number;
    notes?: string;
  };
}

/** Reject a task assignment */
export interface TaskRejectMessage extends MessageEnvelope {
  type: 'task:reject';
  payload: {
    taskId: string;
    reason: 'overloaded' | 'incapable' | 'conflict' | 'timeout' | 'other';
    details?: string;
    suggestedAlternative?: AgentId;
  };
}

/** Update task progress */
export interface TaskUpdateMessage extends MessageEnvelope {
  type: 'task:update';
  payload: {
    taskId: string;
    progress: number; // 0-100
    status: 'in_progress' | 'blocked' | 'reviewing';
    notes?: string;
    tokenUsage?: { input: number; output: number };
  };
}

/** Task completed successfully */
export interface TaskCompleteMessage extends MessageEnvelope {
  type: 'task:complete';
  payload: {
    taskId: string;
    result: 'success' | 'partial';
    output?: string;
    artifacts?: { name: string; url: string; type: string }[];
    tokenUsage: { input: number; output: number };
    durationMs: number;
  };
}

/** Task failed */
export interface TaskFailMessage extends MessageEnvelope {
  type: 'task:fail';
  payload: {
    taskId: string;
    error: string;
    errorType: 'timeout' | 'error' | 'cancelled' | 'dependency_failed';
    partialOutput?: string;
    retryable: boolean;
    tokenUsage?: { input: number; output: number };
  };
}

// ---------------------------------------------------------------------------
// Collaboration Messages
// ---------------------------------------------------------------------------

/** Collaboration session */
export interface CollaborationSession {
  id: string;
  name: string;
  initiator: AgentId;
  participants: AgentId[];
  createdAt: number;
  status: 'forming' | 'active' | 'completed' | 'abandoned';
  sharedState: Record<string, unknown>;
}

/** Invite agent to collaborate */
export interface CollabInviteMessage extends MessageEnvelope {
  type: 'collab:invite';
  payload: {
    session: Omit<CollaborationSession, 'participants' | 'status'>;
    role: 'leader' | 'contributor' | 'reviewer';
    context?: string;
  };
}

/** Join a collaboration session */
export interface CollabJoinMessage extends MessageEnvelope {
  type: 'collab:join';
  payload: {
    sessionId: string;
    role: 'leader' | 'contributor' | 'reviewer';
  };
}

/** Leave a collaboration session */
export interface CollabLeaveMessage extends MessageEnvelope {
  type: 'collab:leave';
  payload: {
    sessionId: string;
    reason?: string;
  };
}

/** Share state within collaboration */
export interface CollabShareMessage extends MessageEnvelope {
  type: 'collab:share';
  to: 'multicast';
  payload: {
    sessionId: string;
    key: string;
    value: unknown;
    merge: boolean; // If true, merge with existing; if false, replace
  };
}

// ---------------------------------------------------------------------------
// Chat Messages
// ---------------------------------------------------------------------------

/** Direct message between agents */
export interface ChatDirectMessage extends MessageEnvelope {
  type: 'chat:direct';
  payload: {
    content: string;
    contentType: 'text' | 'markdown' | 'code' | 'json';
    replyTo?: MessageId;
  };
}

/** Broadcast message to all agents */
export interface ChatBroadcastMessage extends MessageEnvelope {
  type: 'chat:broadcast';
  to: 'broadcast';
  payload: {
    content: string;
    contentType: 'text' | 'markdown' | 'announcement';
    category?: 'system' | 'alert' | 'info' | 'social';
  };
}

// ---------------------------------------------------------------------------
// System Messages
// ---------------------------------------------------------------------------

/** Ping for connectivity check */
export interface SystemPingMessage extends MessageEnvelope {
  type: 'system:ping';
  payload: {
    latency?: number;
  };
}

/** Pong response */
export interface SystemPongMessage extends MessageEnvelope {
  type: 'system:pong';
  payload: {
    latency: number;
    timestamp: number;
  };
}

/** System error notification */
export interface SystemErrorMessage extends MessageEnvelope {
  type: 'system:error';
  payload: {
    code: string;
    message: string;
    details?: unknown;
    recoverable: boolean;
  };
}

// ---------------------------------------------------------------------------
// Union Types
// ---------------------------------------------------------------------------

/** All discovery messages */
export type DiscoveryMessage =
  | DiscoveryAnnounceMessage
  | DiscoveryHeartbeatMessage
  | DiscoveryLeaveMessage;

/** All state messages */
export type StateMessage =
  | StateSyncMessage
  | StateRequestMessage;

/** All task messages */
export type TaskMessage =
  | TaskAssignMessage
  | TaskAcceptMessage
  | TaskRejectMessage
  | TaskUpdateMessage
  | TaskCompleteMessage
  | TaskFailMessage;

/** All collaboration messages */
export type CollabMessage =
  | CollabInviteMessage
  | CollabJoinMessage
  | CollabLeaveMessage
  | CollabShareMessage;

/** All chat messages */
export type ChatMessageProtocol =
  | ChatDirectMessage
  | ChatBroadcastMessage;

/** All system messages */
export type SystemMessage =
  | SystemPingMessage
  | SystemPongMessage
  | SystemErrorMessage;

/** Any message in the protocol */
export type AnyMessage =
  | DiscoveryMessage
  | StateMessage
  | TaskMessage
  | CollabMessage
  | ChatMessageProtocol
  | SystemMessage;

// ---------------------------------------------------------------------------
// Message Factory
// ---------------------------------------------------------------------------

let messageIdCounter = 0;

/** Generate a unique message ID */
export function generateMessageId(): MessageId {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  const counter = (messageIdCounter++).toString(36);
  return `msg_\${timestamp}_\${random}_\${counter}`;
}

/** Create a base message envelope */
export function createEnvelope(
  from: AgentId,
  to: AgentId | 'broadcast' | 'multicast',
  options: Partial<MessageEnvelope> = {}
): Omit<MessageEnvelope, 'type'> {
  const now = Date.now();
  return {
    id: generateMessageId(),
    from,
    to,
    timestamp: now,
    priority: options.priority ?? 'normal',
    guarantee: options.guarantee ?? 'at-most-once',
    ttl: options.ttl,
    correlationId: options.correlationId,
    requiresAck: options.requiresAck,
    ackedBy: options.ackedBy ?? [],
    expiresAt: options.ttl ? now + options.ttl : undefined,
  };
}

// ---------------------------------------------------------------------------
// Routing
// ---------------------------------------------------------------------------

/** Message routing rule */
export interface RoutingRule {
  id: string;
  source: AgentId | '*' | 'broadcast';
  sourcePattern?: RegExp;
  type: MessageType | '*' | MessageType[];
  priority: number;
  action: 'forward' | 'transform' | 'filter' | 'broadcast';
  target?: AgentId | AgentId[];
  transform?: (msg: AnyMessage) => AnyMessage;
  condition?: (msg: AnyMessage) => boolean;
}

/** Message queue entry */
export interface QueuedMessage {
  message: AnyMessage;
  attempts: number;
  lastAttempt: number;
  nextAttempt: number;
  acknowledged: boolean;
}

// ---------------------------------------------------------------------------
// Shared State
// ---------------------------------------------------------------------------

/** Shared state entry */
export interface SharedStateEntry {
  key: string;
  value: unknown;
  owner: AgentId;
  updatedAt: number;
  version: number;
  ttl?: number;
  permissions: {
    read: AgentId[] | '*';
    write: AgentId[] | '*';
  };
}

/** Shared state snapshot */
export interface SharedStateSnapshot {
  entries: Record<string, SharedStateEntry>;
  version: number;
  timestamp: number;
}

// ---------------------------------------------------------------------------
// Event Types for Listeners
// ---------------------------------------------------------------------------

/** Events emitted by the Agent Mesh */
export type MeshEvent =
  | { type: 'agent:joined'; agentId: AgentId; config: AgentConfig; capabilities: AgentCapabilities }
  | { type: 'agent:left'; agentId: AgentId; reason: string }
  | { type: 'agent:status'; agentId: AgentId; status: AgentStatus }
  | { type: 'message:sent'; message: AnyMessage }
  | { type: 'message:received'; message: AnyMessage }
  | { type: 'message:delivered'; messageId: MessageId; to: AgentId }
  | { type: 'message:failed'; messageId: MessageId; error: string }
  | { type: 'task:created'; taskId: string; task: TaskDefinition }
  | { type: 'task:assigned'; taskId: string; agentId: AgentId }
  | { type: 'task:updated'; taskId: string; progress: number }
  | { type: 'task:completed'; taskId: string; result: string }
  | { type: 'task:failed'; taskId: string; error: string }
  | { type: 'collab:started'; sessionId: string; participants: AgentId[] }
  | { type: 'collab:ended'; sessionId: string }
  | { type: 'state:updated'; key: string; value: unknown }
  | { type: 'error'; code: string; message: string };

export type MeshEventListener = (event: MeshEvent) => void;
