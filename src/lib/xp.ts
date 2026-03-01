// XP & Leveling System

export interface XPState {
  currentXP: number;
  level: number;
  progressToNextLevel: number;
  totalXP: number;
  xpHistory: XPEntry[];
}

export interface XPEntry {
  id: string;
  amount: number;
  source: 'tokens' | 'tasks' | 'meetings' | 'achievements' | 'daily';
  timestamp: number;
  description: string;
}

// XP required for each level (exponential curve)
export function getXPForLevel(level: number): number {
  return Math.floor(100 * Math.pow(1.5, level - 1));
}

// Calculate level from total XP
export function calculateLevel(totalXP: number): number {
  let level = 1;
  let xpRequired = getXPForLevel(level);
  
  while (totalXP >= xpRequired) {
    totalXP -= xpRequired;
    level++;
    xpRequired = getXPForLevel(level);
  }
  
  return level;
}

// Calculate progress to next level
export function calculateProgress(currentXP: number, level: number): number {
  const xpForNextLevel = getXPForLevel(level);
  return Math.min(100, (currentXP / xpForNextLevel) * 100);
}

// Add XP
export function addXP(state: XPState, amount: number, source: XPEntry['source'], description: string): XPState {
  const entry: XPEntry = {
    id: `xp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    amount,
    source,
    timestamp: Date.now(),
    description,
  };
  
  const newTotalXP = state.totalXP + amount;
  const newLevel = calculateLevel(newTotalXP);
  const newCurrentXP = newTotalXP - getXPForLevel(newLevel);
  const progress = calculateProgress(newCurrentXP, newLevel);
  
  return {
    ...state,
    currentXP: newCurrentXP,
    level: newLevel,
    progressToNextLevel: progress,
    totalXP: newTotalXP,
    xpHistory: [...state.xpHistory, entry].slice(-100), // Keep last 100 entries
  };
}

// XP rewards
export const XP_REWARDS = {
  per_100_tokens: 10,
  per_task_completed: 50,
  per_meeting_attended: 25,
  per_message_sent: 5,
  daily_login: 100,
  weekly_login: 500,
};

// Calculate XP from tokens
export function calculateTokenXP(tokens: number): number {
  return Math.floor(tokens / 100) * XP_REWARDS.per_100_tokens;
}

// Get level title
export function getLevelTitle(level: number): string {
  const titles: Record<number, string> = {
    1: 'Novice',
    5: 'Apprentice',
    10: 'Journeyman',
    15: 'Expert',
    20: 'Master',
    25: 'Grand Master',
    30: 'Legend',
    40: 'Mythic',
    50: 'Ascended',
    75: 'Transcendent',
    100: 'Omniscient',
  };
  
  for (const [levelThreshold, title] of Object.entries(titles).reverse()) {
    if (level >= parseInt(levelThreshold)) {
      return title;
    }
  }
  
  return 'Novice';
}

// Get level badge emoji
export function getLevelBadge(level: number): string {
  if (level >= 100) return '👑';
  if (level >= 75) return '💎';
  if (level >= 50) return '🌟';
  if (level >= 40) return '🏆';
  if (level >= 30) return '🥇';
  if (level >= 20) return '🥈';
  if (level >= 10) return '🥉';
  if (level >= 5) return '⭐';
  return '🔰';
}

// Initial state
export const initialXPState: XPState = {
  currentXP: 0,
  level: 1,
  progressToNextLevel: 0,
  totalXP: 0,
  xpHistory: [],
};

