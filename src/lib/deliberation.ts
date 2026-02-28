// ============================================================================
// Agent Deliberation — State Machine
// ============================================================================

import type { AgentConfig } from './types';

/**
 * Deliberation phase states
 */
export type DeliberationPhase =
  | 'idle'
  | 'proposing'
  | 'arguing'
  | 'countering'
  | 'voting'
  | 'consensus'
  | 'deadlocked'
  | 'concluded';

/**
 * A single argument for or against a proposal
 */
export interface Argument {
  id: string;
  agentId: string;
  agentName: string;
  agentEmoji: string;
  content: string;
  type: 'support' | 'oppose' | 'counter' | 'clarification';
  timestamp: number;
  votesReceived: number;
  parentArgumentId?: string;
}

/**
 * A deliberation topic/proposal under discussion
 */
export interface DeliberationTopic {
  id: string;
  title: string;
  description: string;
  proposerId: string;
  proposerName: string;
  status: 'pending' | 'active' | 'accepted' | 'rejected' | 'withdrawn';
  phase: DeliberationPhase;
  arguments: Argument[];
  startTime: number;
  endTime?: number;
  voteCount: number;
  requiredVotes: number;
  tags?: string[];
}

/**
 * Deliberation session involving multiple agents
 */
export interface DeliberationSession {
  id: string;
  topic: DeliberationTopic;
  participants: AgentConfig[];
  phase: DeliberationPhase;
  currentSpeakerId?: string;
  roundNumber: number;
  maxRounds: number;
  startedAt: number;
  concludedAt?: number;
  dissenters: string[];
  abstentions: string[];
}

/**
 * State machine events
 */
export type DeliberationEvent =
  | { type: 'START'; topic: DeliberationTopic }
  | { type: 'ADD_ARGUMENT', argument: Argument }
  | { type: 'START_VOTING' }
  | { type: 'VOTE_CAST', agentId: string; support: boolean }
  | { type: 'CONSENSUS_REACHED' }
  | { type: 'DEADLOCK_DETECTED' }
  | { type: 'WITHDRAW' }
  | { type: 'NEXT_ROUND' }
  | { type: 'TIMEOUT' }
  | { type: 'RESET' };

/**
 * State machine transition result
 */
export interface StateTransitionResult {
  nextPhase: DeliberationPhase;
  actions: DeliberationAction[];
  metadata?: Record<string, unknown>;
}

/**
 * Actions triggered by state transitions
 */
export type DeliberationAction =
  | { type: 'NOTIFY_AGENTS', message: string }
  | { type: 'REQUEST_ARGUMENT', agentId: string }
  | { type: 'OPEN_VOTING' }
  | { type: 'TALLY_VOTES' }
  | { type: 'CONCLUDE'; outcome: 'accepted' | 'rejected' | 'withdrawn' | 'deadlocked' }
  | { type: 'ESCALATE', reason: string }
  | { type: 'RECORD_DISSENT', agentId: string };

const PHASE_TRANSITIONS: Record<DeliberationPhase, DeliberationEvent['type'][]> = {
  idle: ['START'],
  proposing: ['ADD_ARGUMENT', 'START_VOTING', 'WITHDRAW'],
  arguing: ['ADD_ARGUMENT', 'START_VOTING', 'NEXT_ROUND', 'WITHDRAW'],
  countering: ['ADD_ARGUMENT', 'START_VOTING', 'NEXT_ROUND', 'TIMEOUT'],
  voting: ['VOTE_CAST', 'CONSENSUS_REACHED', 'DEADLOCK_DETECTED'],
  consensus: ['RESET'],
  deadlocked: ['START_VOTING', 'WITHDRAW', 'RESET'],
  concluded: ['START'],
};

export function createDeliberationSession(
  id: string,
  topic: DeliberationTopic,
  participants: AgentConfig[]
): DeliberationSession {
  return {
    id,
    topic,
    participants,
    phase: 'proposing',
    roundNumber: 1,
    maxRounds: 5,
    startedAt: Date.now(),
    dissenters: [],
    abstentions: [],
  };
}

export function createDeliberationTopic(
  id: string,
  title: string,
  description: string,
  proposer: AgentConfig,
  participants: AgentConfig[]
): DeliberationTopic {
  return {
    id,
    title,
    description,
    proposerId: proposer.id,
    proposerName: proposer.name,
    status: 'pending',
    phase: 'proposing',
    arguments: [],
    startTime: Date.now(),
    voteCount: 0,
    requiredVotes: Math.ceil(participants.length * 0.6),
  };
}

export function processDeliberationEvent(
  session: DeliberationSession,
  event: DeliberationEvent
): StateTransitionResult {
  const { phase } = session;
  const validEvents = PHASE_TRANSITIONS[phase] || [];

  if (!validEvents.includes(event.type)) {
    return {
      nextPhase: phase,
      actions: [{
        type: 'NOTIFY_AGENTS',
        message: `Invalid event ${event.type} for phase ${phase}`,
      }],
    };
  }

  switch (event.type) {
    case 'START':
      return {
        nextPhase: 'proposing',
        actions: [{
          type: 'NOTIFY_AGENTS',
          message: `Deliberation started: ${event.topic.title}`,
        }],
      };

    case 'ADD_ARGUMENT': {
      const arg = event.argument;
      const isOppose = arg.type === 'oppose' || arg.type === 'counter';
      let nextPhase: DeliberationPhase = phase;
      if (isOppose && phase === 'proposing') nextPhase = 'arguing';
      else if (isOppose && phase === 'arguing') nextPhase = 'countering';

      return {
        nextPhase,
        actions: [{
          type: 'NOTIFY_AGENTS',
          message: `${arg.agentName}: ${arg.content.substring(0, 50)}...`,
        }],
        metadata: { argumentAdded: arg.id },
      };
    }

    case 'START_VOTING':
      return { nextPhase: 'voting', actions: [{ type: 'OPEN_VOTING' }] };

    case 'VOTE_CAST':
      return {
        nextPhase: phase,
        actions: [{ type: 'TALLY_VOTES' }],
        metadata: { voteCount: session.topic.voteCount + 1, agentId: event.agentId },
      };

    case 'CONSENSUS_REACHED':
      return {
        nextPhase: 'consensus',
        actions: [{ type: 'CONCLUDE', outcome: 'accepted' }],
        metadata: { finalVoteCount: session.topic.voteCount },
      };

    case 'DEADLOCK_DETECTED':
      return {
        nextPhase: 'deadlocked',
        actions: [
          { type: 'CONCLUDE', outcome: 'deadlocked' },
          { type: 'ESCALATE', reason: 'No consensus after maximum rounds' },
        ],
      };

    case 'WITHDRAW':
      return { nextPhase: 'concluded', actions: [{ type: 'CONCLUDE', outcome: 'withdrawn' }] };

    case 'NEXT_ROUND':
      return {
        nextPhase: session.roundNumber >= session.maxRounds ? 'voting' : 'arguing',
        actions: [{ type: 'NOTIFY_AGENTS', message: `Round ${session.roundNumber + 1}/${session.maxRounds}` }],
        metadata: { roundNumber: session.roundNumber + 1 },
      };

    case 'TIMEOUT':
      return { nextPhase: 'voting', actions: [{ type: 'OPEN_VOTING' }] };

    case 'RESET':
      return { nextPhase: 'idle', actions: [] };

    default:
      return { nextPhase: phase, actions: [] };
  }
}

export function isDeliberationComplete(session: DeliberationSession): boolean {
  return ['consensus', 'concluded', 'deadlocked'].includes(session.phase);
}

export function getDeliberationStatus(session: DeliberationSession) {
  const progressMap: Record<DeliberationPhase, number> = {
    idle: 0, proposing: 20, arguing: 40, countering: 60,
    voting: 80, consensus: 100, deadlocked: 50, concluded: 100,
  };
  return {
    phase: session.phase,
    progress: progressMap[session.phase],
    summary: `${session.topic.title} — ${session.phase} (Round ${session.roundNumber}/${session.maxRounds})`,
  };
}

export function recordDissent(session: DeliberationSession, agentId: string): DeliberationSession {
  if (!session.dissenters.includes(agentId)) {
    return { ...session, dissenters: [...session.dissenters, agentId] };
  }
  return session;
}

export function recordAbstention(session: DeliberationSession, agentId: string): DeliberationSession {
  if (!session.abstentions.includes(agentId)) {
    return { ...session, abstentions: [...session.abstentions, agentId] };
  }
  return session;
}
