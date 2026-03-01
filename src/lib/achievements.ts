// Achievement System - Core Logic

export interface Achievement {
  id: string;
  name: string;
  description: string;
  category: 'productivity' | 'collaboration' | 'innovation' | 'social' | 'special';
  tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
  xpReward: number;
  requirements: {
    type: 'tokens_sent' | 'tasks_completed' | 'meetings_attended' | 'messages_sent' | 'days_active';
    value: number;
  };
  unlocked: boolean;
  unlockedAt?: number;
  progress: number;
  icon: string;
}

export interface AchievementState {
  achievements: Achievement[];
  totalXP: number;
  unlockedCount: number;
}

// Achievement Definitions
export const ACHIEVEMENTS: Achievement[] = [
  // Productivity
  {
    id: 'first-steps',
    name: 'First Steps',
    description: 'Send your first 100 tokens',
    category: 'productivity',
    tier: 'bronze',
    xpReward: 50,
    requirements: { type: 'tokens_sent', value: 100 },
    unlocked: false,
    progress: 0,
    icon: '👶',
  },
  {
    id: 'token-master',
    name: 'Token Master',
    description: 'Send 10,000 tokens',
    category: 'productivity',
    tier: 'silver',
    xpReward: 200,
    requirements: { type: 'tokens_sent', value: 10000 },
    unlocked: false,
    progress: 0,
    icon: '🎯',
  },
  {
    id: 'productivity-guru',
    name: 'Productivity Guru',
    description: 'Send 100,000 tokens',
    category: 'productivity',
    tier: 'gold',
    xpReward: 500,
    requirements: { type: 'tokens_sent', value: 100000 },
    unlocked: false,
    progress: 0,
    icon: '🧘',
  },
  {
    id: 'task-completer',
    name: 'Task Completer',
    description: 'Complete 10 tasks',
    category: 'productivity',
    tier: 'bronze',
    xpReward: 100,
    requirements: { type: 'tasks_completed', value: 10 },
    unlocked: false,
    progress: 0,
    icon: '✅',
  },
  {
    id: 'task-master',
    name: 'Task Master',
    description: 'Complete 100 tasks',
    category: 'productivity',
    tier: 'gold',
    xpReward: 500,
    requirements: { type: 'tasks_completed', value: 100 },
    unlocked: false,
    progress: 0,
    icon: '🏆',
  },
  
  // Collaboration
  {
    id: 'team-player',
    name: 'Team Player',
    description: 'Attend your first meeting',
    category: 'collaboration',
    tier: 'bronze',
    xpReward: 50,
    requirements: { type: 'meetings_attended', value: 1 },
    unlocked: false,
    progress: 0,
    icon: '🤝',
  },
  {
    id: 'meeting-regular',
    name: 'Meeting Regular',
    description: 'Attend 10 meetings',
    category: 'collaboration',
    tier: 'silver',
    xpReward: 200,
    requirements: { type: 'meetings_attended', value: 10 },
    unlocked: false,
    progress: 0,
    icon: '📅',
  },
  {
    id: 'collaborator',
    name: 'Collaborator',
    description: 'Send 100 messages in meetings',
    category: 'collaboration',
    tier: 'gold',
    xpReward: 400,
    requirements: { type: 'messages_sent', value: 100 },
    unlocked: false,
    progress: 0,
    icon: '💬',
  },
  
  // Social
  {
    id: 'social-butterfly',
    name: 'Social Butterfly',
    description: 'Interact with 5 different agents',
    category: 'social',
    tier: 'silver',
    xpReward: 150,
    requirements: { type: 'messages_sent', value: 50 },
    unlocked: false,
    progress: 0,
    icon: '🦋',
  },
  
  // Special
  {
    id: 'early-adopter',
    name: 'Early Adopter',
    description: 'Use AgentMonitor on day 1',
    category: 'special',
    tier: 'diamond',
    xpReward: 1000,
    requirements: { type: 'days_active', value: 1 },
    unlocked: false,
    progress: 0,
    icon: '⭐',
  },
];

// Check and unlock achievements
export function checkAchievements(state: AchievementState, stats: {
  tokens_sent: number;
  tasks_completed: number;
  meetings_attended: number;
  messages_sent: number;
  days_active: number;
}): AchievementState {
  const newState = { ...state };
  let newlyUnlocked: Achievement[] = [];
  
  newState.achievements = newState.achievements.map(achievement => {
    if (achievement.unlocked) return achievement;
    
    const statValue = stats[achievement.requirements.type] || 0;
    const progress = Math.min(100, (statValue / achievement.requirements.value) * 100);
    
    if (statValue >= achievement.requirements.value) {
      newlyUnlocked.push(achievement);
      newState.totalXP += achievement.xpReward;
      newState.unlockedCount++;
      return {
        ...achievement,
        unlocked: true,
        unlockedAt: Date.now(),
        progress: 100,
      };
    }
    
    return { ...achievement, progress };
  });
  
  if (newlyUnlocked.length > 0) {
    console.log('[Achievements] Unlocked:', newlyUnlocked.map(a => a.name).join(', '));
  }
  
  return newState;
}

// Get achievements by category
export function getAchievementsByCategory(achievements: Achievement[], category: string): Achievement[] {
  return achievements.filter(a => a.category === category);
}

// Get achievements by tier
export function getAchievementsByTier(achievements: Achievement[], tier: string): Achievement[] {
  return achievements.filter(a => a.tier === tier);
}

// Get unlocked achievements
export function getUnlockedAchievements(achievements: Achievement[]): Achievement[] {
  return achievements.filter(a => a.unlocked);
}

// Get locked achievements
export function getLockedAchievements(achievements: Achievement[]): Achievement[] {
  return achievements.filter(a => !a.unlocked);
}

// Calculate completion percentage
export function getCompletionPercentage(achievements: Achievement[]): number {
  const unlocked = achievements.filter(a => a.unlocked).length;
  return Math.round((unlocked / achievements.length) * 100);
}

// Initial state
export const initialAchievementState: AchievementState = {
  achievements: ACHIEVEMENTS,
  totalXP: 0,
  unlockedCount: 0,
};

