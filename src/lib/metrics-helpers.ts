// ============================================================================
// Metrics Helpers - Accurate calculations from live data
// ============================================================================

import type { ActivityEvent, AgentDashboardState, ChatMessage } from '@/lib/types';

/**
 * Calculate completed tasks from activity feed
 * Counts task_complete events for accuracy
 */
export function calculateCompletedTasks(activityFeed: ActivityEvent[]): number {
  return activityFeed.filter(event => event.type === 'task_complete').length;
}

/**
 * Calculate broadcast count from global chat messages
 * Only counts user-initiated broadcasts (scope='broadcast', role='user')
 * This is the actual source data, not estimated from meeting states
 */
export function calculateMeetings(
  activityFeed: ActivityEvent[],
  agentStates: Record<string, AgentDashboardState>,
  globalChatMessages: ChatMessage[]
): number {
  // Primary: Count actual broadcast messages (user-initiated broadcasts)
  const broadcasts = globalChatMessages.filter(
    msg => msg.scope === 'broadcast' && msg.role === 'user'
  ).length;

  // Return broadcast count as the authoritative metric
  return broadcasts;
}

/**
 * Calculate total messages from chat data
 * Uses actual message counts, not estimates
 */
export function calculateMessages(
  chatMessages: Record<string, ChatMessage[]>,
  globalChatMessages: ChatMessage[],
  activityFeed: ActivityEvent[]
): number {
  // Count messages in direct chat threads
  const threadMessages = Object.values(chatMessages).reduce(
    (sum, msgs) => sum + msgs.filter(m => m.role !== 'system').length,
    0
  );

  // Count global chat messages (exclude system status messages)
  const globalMessages = globalChatMessages.filter(
    msg => msg.role !== 'system' || msg.scope === 'broadcast'
  ).length;

  // Return combined total (not max of both which could double-count)
  return threadMessages + globalMessages;
}

/**
 * Calculate average response time from task timing
 * Uses task start/complete timestamps when available
 */
export function calculateAvgResponseTime(
  activityFeed: ActivityEvent[],
  agentStates: Record<string, AgentDashboardState>
): number {
  const responseTimes: number[] = [];

  // Track task start times by agent
  const taskStartTimes = new Map<string, number>();

  // Process activity feed in chronological order
  const orderedEvents = [...activityFeed].sort((a, b) => a.timestamp - b.timestamp);

  for (const event of orderedEvents) {
    if (!event.agentId) continue;

    // Track task starts
    if (event.type === 'task_start' || event.type === 'tool_call') {
      taskStartTimes.set(event.agentId, event.timestamp);
    }

    // Calculate response time on task complete
    if (event.type === 'task_complete') {
      const startTime = taskStartTimes.get(event.agentId);
      if (startTime) {
        const responseTime = (event.timestamp - startTime) / 1000; // Convert to seconds
        if (responseTime > 0 && responseTime < 3600) { // Sanity check: < 1 hour
          responseTimes.push(responseTime);
        }
        taskStartTimes.delete(event.agentId);
      }
    }

    // Also track message responses
    if (event.type === 'message') {
      const startTime = taskStartTimes.get(event.agentId);
      if (startTime) {
        const responseTime = (event.timestamp - startTime) / 1000;
        if (responseTime > 0 && responseTime < 3600) {
          responseTimes.push(responseTime);
        }
        taskStartTimes.delete(event.agentId);
      }
    }
  }

  // Calculate average
  if (responseTimes.length === 0) {
    return 0;
  }

  const total = responseTimes.reduce((sum, time) => sum + time, 0);
  return total / responseTimes.length;
}

/**
 * Calculate activity score from real agent activity
 * Based on active agents, completed tasks, and message volume
 * Note: This is an activity indicator score (0-100), not actual productivity metrics
 */
export function calculateProductivityScore(
  agentStates: Record<string, AgentDashboardState>,
  completedTasks: number,
  messages: number
): number {
  // Count actively working agents
  const activeBehaviors = ['working', 'researching', 'debugging', 'deploying', 'reporting', 'thinking'];
  const activeAgents = Object.values(agentStates).filter(state =>
    activeBehaviors.includes(state.behavior)
  ).length;

  // Calculate activity score based on:
  // - Active agents (up to 40 points)
  // - Completed tasks (up to 40 points)
  // - Messages sent (up to 20 points)
  const activeScore = Math.min(activeAgents * 10, 40); // 10 pts per active agent, max 40
  const taskScore = Math.min(completedTasks * 2, 40);  // 2 pts per task, max 40
  const messageScore = Math.min(messages, 20);         // 1 pt per message, max 20

  const baseScore = activeScore + taskScore + messageScore;

  // Normalize to 0-100 scale
  return Math.max(0, Math.min(100, Math.round(baseScore)));
}

/**
 * Calculate per-agent statistics for leaderboard
 */
export interface AgentStats {
  agentId: string;
  agentName: string;
  agentEmoji: string;
  tokensUsed: number;
  completedTasks: number;
  messagesSent: number;
  avgResponseTime: number;
  isActive: boolean;
}

export function calculateAgentStats(
  agentId: string,
  agentName: string,
  agentEmoji: string,
  agentState: AgentDashboardState,
  activityFeed: ActivityEvent[]
): AgentStats {
  // Filter events for this agent
  const agentEvents = activityFeed.filter(event => event.agentId === agentId);

  const completedTasks = agentEvents.filter(event => event.type === 'task_complete').length;
  const messagesSent = agentEvents.filter(event => event.type === 'message').length;
  const isActive = ['working', 'researching', 'debugging', 'deploying', 'reporting', 'thinking'].includes(agentState.behavior);

  // Calculate avg response time for this agent
  const responseTimes: number[] = [];
  const taskStartTimes = new Map<string, number>();

  const orderedEvents = [...agentEvents].sort((a, b) => a.timestamp - b.timestamp);
  for (const event of orderedEvents) {
    if (event.type === 'task_start' || event.type === 'tool_call') {
      taskStartTimes.set(event.agentId, event.timestamp);
    }

    if (event.type === 'task_complete' || event.type === 'message') {
      const startTime = taskStartTimes.get(event.agentId);
      if (startTime) {
        const responseTime = (event.timestamp - startTime) / 1000;
        if (responseTime > 0 && responseTime < 3600) {
          responseTimes.push(responseTime);
        }
        taskStartTimes.delete(event.agentId);
      }
    }
  }

  const avgResponseTime = responseTimes.length > 0
    ? responseTimes.reduce((sum, t) => sum + t, 0) / responseTimes.length
    : 0;

  return {
    agentId,
    agentName,
    agentEmoji,
    tokensUsed: agentState.totalTokens,
    completedTasks,
    messagesSent,
    avgResponseTime,
    isActive,
  };
}
