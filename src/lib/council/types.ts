// ============================================================================
// AI Council Chamber — Type Definitions
// ============================================================================

export type CouncilorRole =
  | 'Speaker'
  | 'Technocrat'
  | 'Ethicist'
  | 'Pragmatist'
  | 'Skeptic'
  | 'Sentinel'
  | 'Economist'
  | 'Legal'
  | 'UserAdvocate'
  | 'Researcher'
  | 'Optimizer'
  | 'Innovator';

export type DeliberationPhase =
  | 'opening'
  | 'debate_round_1'
  | 'debate_round_2'
  | 'debate_round_3'
  | 'refinement'
  | 'voting'
  | 'resolution'
  | 'closed';

export type VoteChoice =
  | 'YES'
  | 'YES_CONDITIONAL'
  | 'ABSTAIN'
  | 'NO_CONDITIONAL'
  | 'NO_HARD';

export type DecisionOutcome =
  | 'APPROVED'
  | 'APPROVED_CONDITIONAL'
  | 'DEFERRED'
  | 'REJECTED'
  | 'VETOED';

export interface Personality {
  openness: number;
  conscientiousness: number;
  agreeableness: number;
  neuroticism: number;
  assertiveness: number;
}

export interface CouncilorConfig {
  id: string;
  role: CouncilorRole;
  name: string;
  emoji: string;
  model: string;
  personality: Personality;
  expertise: string[];
  votingWeight: number;
  isActive: boolean;
  avatarUrl?: string;
}

export interface Councilor {
  id: string;
  role: CouncilorRole;
  name: string;
  emoji: string;
  model: string;
  sessionId?: string;
  isActive: boolean;
  isSpeaking: boolean;
  confidence: number;
  stance: 'support' | 'oppose' | 'neutral';
}

export interface EvidenceItem {
  id: string;
  title: string;
  type: 'document' | 'data' | 'code' | 'image' | 'link';
  url?: string;
  content?: string;
  submittedBy?: string;
  timestamp: number;
}

export interface Argument {
  id: string;
  councilorId: string;
  phase: DeliberationPhase;
  content: string;
  type: 'opening' | 'rebuttal' | 'evidence' | 'question' | 'compromise';
  references?: string[];
  timestamp: number;
}

export interface Vote {
  id: string;
  councilorId: string;
  choice: VoteChoice;
  reasoning: string;
  conditions?: string[];
  timestamp: number;
  weight: number;
}

export interface Deliberation {
  id: string;
  topic: string;
  context?: string;
  phase: DeliberationPhase;
  status: 'active' | 'completed' | 'cancelled';
  councilors: Councilor[];
  arguments: Argument[];
  votes: Vote[];
  evidence: EvidenceItem[];
  consensus: number;
  outcome?: {
    decision: DecisionOutcome;
    summary: string;
    conditions?: string[];
    nextSteps?: string[];
  };
  createdAt: number;
  updatedAt: number;
  closedAt?: number;
}

export interface ConsensusConfig {
  threshold: number;
  vetoPower: string[];
  quorum: number;
  timeout: number;
}
