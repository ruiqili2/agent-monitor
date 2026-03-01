// ============================================================================
// Agent Deliberation — Consensus Threshold Logic
// ============================================================================

import type { DeliberationSession, DeliberationTopic } from './deliberation';

export type ConsensusStrategy = 
  | 'simple-majority'   // >50% support
  | 'supermajority'    // >66% support
  | 'unanimous'        // 100% support
  | 'weighted'         // Weighted by agent authority
  | 'bucklin'          // Ranked choice fallback
  | 'quadratic'        // Quadratic voting;

export interface ConsensusConfig {
  strategy: ConsensusStrategy;
  quorumRequired: number;      // 0-1, minimum participation
  supermajorityThreshold: number; // 0-1, for supermajority
  maxRounds: number;
  deadlockAfterRounds: boolean;
  dissentTolerance: number;    // 0-1, allow X dissent
  weightByAuthority: boolean;
  authorityWeights?: Record<string, number>;
}

export interface ConsensusResult {
  reached: boolean;
  strategy: ConsensusStrategy;
  supportVotes: number;
  opposeVotes: number;
  abstentions: number;
  totalVotes: number;
  supportPercentage: number;
  threshold: number;
  quorumMet: boolean;
  dissenters: string[];
  winner?: 'accepted' | 'rejected' | 'deadlocked';
}

export interface ConsensusMetrics {
  sessionId: string;
  roundsUsed: number;
  argumentsExchanged: number;
  dissentersCount: number;
  timeToConsensus: number;
  finalStrategy: ConsensusStrategy;
}

const DEFAULT_CONFIG: ConsensusConfig = {
  strategy: 'simple-majority',
  quorumRequired: 0.5,
  supermajorityThreshold: 0.66,
  maxRounds: 5,
  deadlockAfterRounds: true,
  dissentTolerance: 0.2,
  weightByAuthority: false,
};

export function getDefaultConsensusConfig(): ConsensusConfig {
  return { ...DEFAULT_CONFIG };
}

export function calculateConsensus(
  session: DeliberationSession,
  config: ConsensusConfig = DEFAULT_CONFIG
): ConsensusResult {
  const participants = session.participants;
  const totalParticipants = participants.length;
  
  const supportVotes = session.topic.voteCount;
  const opposeVotes = session.dissenters.length;
  const abstentions = session.abstentions.length;
  const totalVotes = totalParticipants;
  
  const supportPercentage = totalVotes > 0 ? supportVotes / totalVotes : 0;
  
  let threshold: number;
  switch (config.strategy) {
    case 'unanimous':
      threshold = 1.0;
      break;
    case 'supermajority':
      threshold = config.supermajorityThreshold;
      break;
    case 'simple-majority':
    default:
      threshold = 0.5;
  }
  
  const quorumMet = (supportVotes + opposeVotes + abstentions) / totalParticipants >= config.quorumRequired;
  
  let reached = false;
  let winner: 'accepted' | 'rejected' | 'deadlocked' | undefined;
  
  if (quorumMet) {
    if (config.strategy === 'unanimous') {
      reached = supportPercentage === 1.0 && opposeVotes === 0;
    } else {
      reached = supportPercentage >= threshold;
    }
    
    if (reached) {
      winner = 'accepted';
    } else if (supportPercentage < threshold) {
      winner = 'rejected';
    }
  }
  
  if (config.deadlockAfterRounds && session.roundNumber >= config.maxRounds && !reached) {
    winner = 'deadlocked';
    reached = false;
  }
  
  return {
    reached,
    strategy: config.strategy,
    supportVotes,
    opposeVotes,
    abstentions,
    totalVotes,
    supportPercentage,
    threshold,
    quorumMet,
    dissenters: session.dissenters,
    winner,
  };
}

export function calculateWeightedConsensus(
  session: DeliberationSession,
  weights: Record<string, number>
): { support: number; oppose: number; total: number; percentage: number } {
  let support = 0;
  let oppose = 0;
  
  for (const participant of session.participants) {
    const weight = weights[participant.id] || 1;
    
    if (session.dissenters.includes(participant.id)) {
      oppose += weight;
    } else if (!session.abstentions.includes(participant.id)) {
      support += weight;
    }
  }
  
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  const percentage = total > 0 ? support / total : 0;
  
  return { support, oppose, total, percentage };
}

export function isConsensusReached(
  session: DeliberationSession,
  config: ConsensusConfig = DEFAULT_CONFIG
): boolean {
  const result = calculateConsensus(session, config);
  return result.reached;
}

export function getConsensusMetrics(session: DeliberationSession): ConsensusMetrics {
  return {
    sessionId: session.id,
    roundsUsed: session.roundNumber,
    argumentsExchanged: session.topic.arguments.length,
    dissentersCount: session.dissenters.length,
    timeToConsensus: session.concludedAt 
      ? session.concludedAt - session.startedAt 
      : Date.now() - session.startedAt,
    finalStrategy: 'simple-majority',
  };
}

export function suggestStrategy(
  participantsCount: number,
  urgency: 'low' | 'medium' | 'high'
): ConsensusStrategy {
  if (participantsCount <= 3) {
    return 'unanimous';
  }
  
  if (urgency === 'high') {
    return 'simple-majority';
  }
  
  if (urgency === 'medium') {
    return 'supermajority';
  }
  
  return 'supermajority';
}

export function canOverrideWithDissent(
  session: DeliberationSession,
  config: ConsensusConfig = DEFAULT_CONFIG
): boolean {
  const dissentRatio = session.dissenters.length / session.participants.length;
  return dissentRatio <= config.dissentTolerance;
}
