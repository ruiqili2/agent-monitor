// Leaderboard System

export interface LeaderboardEntry {
  rank: number;
  agentId: string;
  agentName: string;
  agentEmoji: string;
  agentType: 'main' | 'subagent' | 'acp';
  value: number;
  badge?: string;
}

export interface LeaderboardData {
  category: string;
  period: 'weekly' | 'monthly' | 'alltime';
  lastUpdated: number;
  entries: LeaderboardEntry[];
}

// Leaderboard categories
export const LEADERBOARD_CATEGORIES = [
  { id: 'xp', name: 'Total XP', icon: '⭐' },
  { id: 'tokens', name: 'Tokens Sent', icon: '📊' },
  { id: 'tasks', name: 'Tasks Completed', icon: '✅' },
  { id: 'meetings', name: 'Meetings Attended', icon: '💬' },
  { id: 'messages', name: 'Messages Sent', icon: '💬' },
  { id: 'level', name: 'Highest Level', icon: '🏆' },
];

// Get badge for rank
export function getRankBadge(rank: number): string {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  if (rank <= 10) return '🔟';
  return '';
}

// Get title for rank
export function getRankTitle(rank: number): string {
  if (rank === 1) return 'Champion';
  if (rank === 2) return 'Runner-up';
  if (rank === 3) return 'Third Place';
  if (rank <= 10) return 'Top 10';
  if (rank <= 50) return 'Top 50';
  return 'Participant';
}

// Create leaderboard from agent data
export function createLeaderboard(
  agents: any[],
  category: string,
  period: 'weekly' | 'monthly' | 'alltime' = 'alltime'
): LeaderboardData {
  const entries: LeaderboardEntry[] = agents
    .map((agent, index) => ({
      rank: index + 1,
      agentId: agent.id,
      agentName: agent.name || agent.id,
      agentEmoji: agent.emoji || '🤖',
      agentType: getAgentType(agent.key || ''),
      value: agent[category] || 0,
      badge: getRankBadge(index + 1),
    }))
    .sort((a, b) => b.value - a.value)
    .map((entry, index) => ({ ...entry, rank: index + 1, badge: getRankBadge(index + 1) }));
  
  return {
    category,
    period,
    lastUpdated: Date.now(),
    entries,
  };
}

// Get agent type from session key
function getAgentType(sessionKey: string): 'main' | 'subagent' | 'acp' {
  if (sessionKey.includes(':acp:')) return 'acp';
  if (sessionKey.includes(':subagent:')) return 'subagent';
  return 'main';
}

// Get top performers
export function getTopPerformers(leaderboard: LeaderboardData, limit: number = 3): LeaderboardEntry[] {
  return leaderboard.entries.slice(0, limit);
}

// Get agent rank
export function getAgentRank(leaderboard: LeaderboardData, agentId: string): number | null {
  const entry = leaderboard.entries.find(e => e.agentId === agentId);
  return entry ? entry.rank : null;
}

// Format large numbers
export function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

