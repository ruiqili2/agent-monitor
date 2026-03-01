// ============================================================================
// AI Council Chamber — Councilor Configurations
// ============================================================================

import type { CouncilorConfig } from './types';

export const CORE_COUNCILORS: CouncilorConfig[] = [
  {
    id: 'speaker-001',
    role: 'Speaker',
    name: 'Athena',
    emoji: '🦉',
    model: 'bailian/qwen3.5-plus',
    personality: {
      openness: 0.8,
      conscientiousness: 0.9,
      agreeableness: 0.7,
      neuroticism: 0.2,
      assertiveness: 0.85,
    },
    expertise: ['facilitation', 'synthesis', 'strategy'],
    votingWeight: 1.5,
    isActive: true,
  },
  {
    id: 'technocrat-001',
    role: 'Technocrat',
    name: 'Tesla',
    emoji: '⚡',
    model: 'bailian/glm-5',
    personality: {
      openness: 0.7,
      conscientiousness: 0.95,
      agreeableness: 0.5,
      neuroticism: 0.3,
      assertiveness: 0.75,
    },
    expertise: ['engineering', 'architecture', 'performance'],
    votingWeight: 1.0,
    isActive: true,
  },
  {
    id: 'ethicist-001',
    role: 'Ethicist',
    name: 'Sage',
    emoji: '🧘',
    model: 'bailian/qwen3.5-plus',
    personality: {
      openness: 0.75,
      conscientiousness: 0.9,
      agreeableness: 0.8,
      neuroticism: 0.5,
      assertiveness: 0.7,
    },
    expertise: ['ethics', 'safety', 'alignment', 'philosophy'],
    votingWeight: 1.0,
    isActive: true,
  },
  {
    id: 'pragmatist-001',
    role: 'Pragmatist',
    name: 'Franklin',
    emoji: '💡',
    model: 'bailian/MiniMax-M2.5',
    personality: {
      openness: 0.6,
      conscientiousness: 0.85,
      agreeableness: 0.65,
      neuroticism: 0.25,
      assertiveness: 0.8,
    },
    expertise: ['efficiency', 'resource-management', 'practicality'],
    votingWeight: 1.0,
    isActive: true,
  },
];

export const SPECIALIST_COUNCILORS: Record<string, CouncilorConfig> = {
  skeptic: {
    id: 'skeptic-001',
    role: 'Skeptic',
    name: 'Descartes',
    emoji: '🤔',
    model: 'bailian/qwen3.5-plus',
    personality: {
      openness: 0.5,
      conscientiousness: 0.9,
      agreeableness: 0.3,
      neuroticism: 0.6,
      assertiveness: 0.8,
    },
    expertise: ['risk-analysis', 'critical-thinking', 'validation'],
    votingWeight: 1.0,
    isActive: false,
  },
  sentinel: {
    id: 'sentinel-001',
    role: 'Sentinel',
    name: 'Argus',
    emoji: '🛡️',
    model: 'lmstudio/vulnllm-r-7b',
    personality: {
      openness: 0.4,
      conscientiousness: 0.95,
      agreeableness: 0.4,
      neuroticism: 0.7,
      assertiveness: 0.9,
    },
    expertise: ['security', 'threat-detection', 'vulnerability-analysis'],
    votingWeight: 1.0,
    isActive: false,
  },
  economist: {
    id: 'economist-001',
    role: 'Economist',
    name: 'Smith',
    emoji: '💰',
    model: 'bailian/MiniMax-M2.5',
    personality: {
      openness: 0.7,
      conscientiousness: 0.85,
      agreeableness: 0.6,
      neuroticism: 0.3,
      assertiveness: 0.75,
    },
    expertise: ['cost-benefit', 'resource-allocation', 'roi'],
    votingWeight: 1.0,
    isActive: false,
  },
  researcher: {
    id: 'researcher-001',
    role: 'Researcher',
    name: 'Curie',
    emoji: '🔬',
    model: 'bailian/MiniMax-M2.5',
    personality: {
      openness: 0.9,
      conscientiousness: 0.9,
      agreeableness: 0.7,
      neuroticism: 0.2,
      assertiveness: 0.6,
    },
    expertise: ['investigation', 'data-analysis', 'evidence-gathering'],
    votingWeight: 1.0,
    isActive: false,
  },
};

export const DEFAULT_CONSENSUS_CONFIG = {
  threshold: 0.75,
  vetoPower: ['Ethicist', 'Sentinel'],
  quorum: 0.5,
  timeout: 600000, // 10 minutes
};
