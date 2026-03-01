// ============================================================================
// Metrics Calculation and Tracking System
// ============================================================================

import type { AgentDashboardState, ActivityEvent, TokenUsage, AgentTask } from './types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MetricDataPoint {
  timestamp: number;
  value: number;
  label?: string;
}

export interface TokenTrend {
  timestamps: number[];
  inputTokens: number[];
  outputTokens: number[];
  totalTokens: number[];
}

export interface AgentProductivity {
  agentId: string;
  agentName: string;
  tasksCompleted: number;
  tasksFailed: number;
  tokensUsed: number;
  avgResponseTime: number;
  productivityScore: number;
  successRate: number;
  xpEarned: number;
}

export interface TaskCompletionMetrics {
  total: number;
  completed: number;
  failed: number;
  active: number;
  completionRate: number;
  failureRate: number;
  avgDuration: number;
}

export interface ResponseTimeMetrics {
  min: number;
  max: number;
  avg: number;
  p50: number;
  p95: number;
  p99: number;
  samples: MetricDataPoint[];
}

export interface CostEstimate {
  inputCost: number;
  outputCost: number;
  totalCost: number;
  currency: string;
  model: string;
}

export interface ReportPeriod {
  start: number;
  end: number;
  label: string;
}

export interface DailyReport {
  date: string;
  totalTokens: number;
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  avgResponseTime: number;
  totalCost: number;
  topAgents: AgentProductivity[];
}

export interface WeeklyReport extends DailyReport {
  weekStart: string;
  weekEnd: string;
  dailyBreakdown: DailyReport[];
}

export interface MonthlyReport extends WeeklyReport {
  month: string;
  weeklyBreakdown: WeeklyReport[];
}

export interface LeaderboardEntry {
  rank: number;
  agentId: string;
  agentName: string;
  agentEmoji: string;
  metric: string;
  value: number;
  trend: 'up' | 'down' | 'stable';
  change: number;
}

export interface PerformanceAlert {
  id: string;
  type: 'warning' | 'critical' | 'info';
  metric: string;
  agentId?: string;
  agentName?: string;
  message: string;
  threshold: number;
  currentValue: number;
  timestamp: number;
  acknowledged: boolean;
}

export interface MetricsConfig {
  responseTimeThresholds: {
    warning: number;
    critical: number;
  };
  tokenThresholds: {
    dailyWarning: number;
    dailyCritical: number;
  };
  taskFailureThresholds: {
    warning: number; // percentage
    critical: number;
  };
  costThresholds: {
    dailyWarning: number;
    dailyCritical: number;
  };
}

// ---------------------------------------------------------------------------
// Default Configuration
// ---------------------------------------------------------------------------

export const DEFAULT_METRICS_CONFIG: MetricsConfig = {
  responseTimeThresholds: {
    warning: 5000, // 5 seconds
    critical: 15000, // 15 seconds
  },
  tokenThresholds: {
    dailyWarning: 100000,
    dailyCritical: 500000,
  },
  taskFailureThresholds: {
    warning: 10, // 10% failure rate
    critical: 25, // 25% failure rate
  },
  costThresholds: {
    dailyWarning: 5.00, // $5
    dailyCritical: 20.00, // $20
  },
};

// ---------------------------------------------------------------------------
// Pricing Table (approximate costs per 1M tokens)
// ---------------------------------------------------------------------------

export const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  // OpenAI
  'gpt-4o': { input: 2.50, output: 10.00 },
  'gpt-4o-mini': { input: 0.15, output: 0.60 },
  'gpt-4-turbo': { input: 10.00, output: 30.00 },
  'gpt-3.5-turbo': { input: 0.50, output: 1.50 },
  
  // Claude
  'claude-3-opus': { input: 15.00, output: 75.00 },
  'claude-3-sonnet': { input: 3.00, output: 15.00 },
  'claude-3-haiku': { input: 0.25, output: 1.25 },
  
  // Bailian / Alibaba
  'qwen3.5-plus': { input: 0.00, output: 0.00 }, // Subscription
  'qwen3-max': { input: 0.00, output: 0.00 },
  'MiniMax-M2.5': { input: 0.00, output: 0.00 },
  'kimi-k2.5': { input: 0.00, output: 0.00 },
  'glm-5': { input: 0.00, output: 0.00 },
  
  // Default
  'default': { input: 1.00, output: 3.00 },
};

// ---------------------------------------------------------------------------
// Core Metrics Functions
// ---------------------------------------------------------------------------

/**
 * Calculate token usage trends from history
 */
export function calculateTokenTrends(
  tokenHistory: TokenUsage[],
  granularity: 'hour' | 'day' | 'week' = 'hour'
): TokenTrend {
  if (tokenHistory.length === 0) {
    return { timestamps: [], inputTokens: [], outputTokens: [], totalTokens: [] };
  }

  // Group by granularity
  const grouped = groupByTimeSlot(tokenHistory, granularity);
  
  const timestamps = Object.keys(grouped).map(Number).sort();
  const inputTokens = timestamps.map(t => grouped[t].reduce((sum, d) => sum + d.input, 0));
  const outputTokens = timestamps.map(t => grouped[t].reduce((sum, d) => sum + d.output, 0));
  const totalTokens = timestamps.map(t => grouped[t].reduce((sum, d) => sum + d.total, 0));

  return { timestamps, inputTokens, outputTokens, totalTokens };
}

function groupByTimeSlot(
  data: TokenUsage[],
  granularity: 'hour' | 'day' | 'week'
): Record<number, TokenUsage[]> {
  const grouped: Record<number, TokenUsage[]> = {};
  
  const slotSize = granularity === 'hour' ? 3600000 : granularity === 'day' ? 86400000 : 604800000;
  
  for (const item of data) {
    const slot = Math.floor(item.timestamp / slotSize) * slotSize;
    if (!grouped[slot]) grouped[slot] = [];
    grouped[slot].push(item);
  }
  
  return grouped;
}

/**
 * Calculate agent productivity scores
 */
export function calculateAgentProductivity(
  agentId: string,
  agentName: string,
  state: AgentDashboardState,
  tasks: AgentTask[]
): AgentProductivity {
  const completed = tasks.filter(t => t.status === 'completed').length;
  const failed = tasks.filter(t => t.status === 'failed').length;
  const total = Math.max(tasks.length, 1);
  
  const successRate = (completed / total) * 100;
  
  // Calculate average response time from task durations
  const completedTasks = tasks.filter(t => t.status === 'completed' && t.completedAt);
  const avgResponseTime = completedTasks.length > 0
    ? completedTasks.reduce((sum, t) => sum + ((t.completedAt! - t.startedAt) / 1000), 0) / completedTasks.length
    : 0;
  
  // Calculate productivity score (weighted)
  // - Success rate: 40%
  // - Tasks completed: 30%
  // - Token efficiency: 20%
  // - Response time: 10%
  const taskScore = Math.min(completed / 10, 100); // Normalize to 100
  const tokenScore = Math.min(state.totalTokens / 100000, 100);
  const responseScore = Math.max(0, 100 - (avgResponseTime / 10)); // Lower is better
  
  const productivityScore = (
    successRate * 0.4 +
    taskScore * 0.3 +
    tokenScore * 0.2 +
    responseScore * 0.1
  );
  
  // XP: 10 XP per task, 1 XP per 100 tokens
  const xpEarned = completed * 10 + Math.floor(state.totalTokens / 100);
  
  return {
    agentId,
    agentName,
    tasksCompleted: completed,
    tasksFailed: failed,
    tokensUsed: state.totalTokens,
    avgResponseTime,
    productivityScore: Math.round(productivityScore * 10) / 10,
    successRate: Math.round(successRate * 10) / 10,
    xpEarned,
  };
}

/**
 * Calculate task completion metrics
 */
export function calculateTaskCompletionMetrics(tasks: AgentTask[]): TaskCompletionMetrics {
  const total = tasks.length;
  const completed = tasks.filter(t => t.status === 'completed').length;
  const failed = tasks.filter(t => t.status === 'failed').length;
  const active = tasks.filter(t => t.status === 'active').length;
  
  const completionRate = total > 0 ? (completed / total) * 100 : 0;
  const failureRate = total > 0 ? (failed / total) * 100 : 0;
  
  // Calculate average duration
  const completedTasks = tasks.filter(t => t.status === 'completed' && t.completedAt);
  const avgDuration = completedTasks.length > 0
    ? completedTasks.reduce((sum, t) => sum + (t.completedAt! - t.startedAt), 0) / completedTasks.length / 1000
    : 0;
  
  return {
    total,
    completed,
    failed,
    active,
    completionRate: Math.round(completionRate * 10) / 10,
    failureRate: Math.round(failureRate * 10) / 10,
    avgDuration: Math.round(avgDuration * 100) / 100,
  };
}

/**
 * Calculate response time metrics
 */
export function calculateResponseTimeMetrics(
  tasks: AgentTask[],
  activityEvents: ActivityEvent[]
): ResponseTimeMetrics {
  const samples: MetricDataPoint[] = [];
  
  // Extract response times from completed tasks
  for (const task of tasks) {
    if (task.status === 'completed' && task.completedAt) {
      samples.push({
        timestamp: task.startedAt,
        value: (task.completedAt - task.startedAt) / 1000,
        label: task.title,
      });
    }
  }
  
  if (samples.length === 0) {
    return {
      min: 0,
      max: 0,
      avg: 0,
      p50: 0,
      p95: 0,
      p99: 0,
      samples: [],
    };
  }
  
  const values = samples.map(s => s.value).sort((a, b) => a - b);
  
  return {
    min: values[0],
    max: values[values.length - 1],
    avg: values.reduce((sum, v) => sum + v, 0) / values.length,
    p50: percentile(values, 50),
    p95: percentile(values, 95),
    p99: percentile(values, 99),
    samples,
  };
}

function percentile(sortedValues: number[], p: number): number {
  const index = Math.ceil((p / 100) * sortedValues.length) - 1;
  return sortedValues[Math.max(0, Math.min(index, sortedValues.length - 1))];
}

/**
 * Estimate costs based on token usage and model
 */
export function estimateCost(
  inputTokens: number,
  outputTokens: number,
  model: string = 'default'
): CostEstimate {
  const pricing = MODEL_PRICING[model] || MODEL_PRICING['default'];
  
  const inputCost = (inputTokens / 1000000) * pricing.input;
  const outputCost = (outputTokens / 1000000) * pricing.output;
  
  return {
    inputCost: Math.round(inputCost * 10000) / 10000,
    outputCost: Math.round(outputCost * 10000) / 10000,
    totalCost: Math.round((inputCost + outputCost) * 10000) / 10000,
    currency: 'USD',
    model,
  };
}

/**
 * Generate daily report
 */
export function generateDailyReport(
  date: Date,
  agentStates: Record<string, AgentDashboardState>,
  allTasks: AgentTask[],
  activityEvents: ActivityEvent[]
): DailyReport {
  const dateStr = date.toISOString().split('T')[0];
  
  // Aggregate metrics
  let totalTokens = 0;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  
  for (const agentId in agentStates) {
    totalTokens += agentStates[agentId].totalTokens || 0;
    totalInputTokens += agentStates[agentId].inputTokens || 0;
    totalOutputTokens += agentStates[agentId].outputTokens || 0;
  }
  
  const taskMetrics = calculateTaskCompletionMetrics(allTasks);
  const responseMetrics = calculateResponseTimeMetrics(allTasks, activityEvents);
  const cost = estimateCost(totalInputTokens, totalOutputTokens);
  
  // Top agents by productivity
  const agentProductivities = Object.entries(agentStates).map(([id, state]) => {
    return calculateAgentProductivity(id, state.sessionLog[0] || 'Unknown', state, allTasks);
  });
  
  const topAgents = agentProductivities
    .sort((a, b) => b.productivityScore - a.productivityScore)
    .slice(0, 5);
  
  return {
    date: dateStr,
    totalTokens,
    totalTasks: taskMetrics.total,
    completedTasks: taskMetrics.completed,
    failedTasks: taskMetrics.failed,
    avgResponseTime: responseMetrics.avg,
    totalCost: cost.totalCost,
    topAgents,
  };
}

/**
 * Generate leaderboard
 */
export function generateLeaderboard(
  agentStates: Record<string, AgentDashboardState>,
  agentConfigs: Array<{ id: string; name: string; emoji: string }>,
  metric: 'tokens' | 'tasks' | 'productivity' | 'successRate' | 'responseTime' = 'productivity'
): LeaderboardEntry[] {
  const entries: LeaderboardEntry[] = agentConfigs.map((config, index) => {
    const state = agentStates[config.id];
    if (!state) {
      return {
        rank: index + 1,
        agentId: config.id,
        agentName: config.name,
        agentEmoji: config.emoji,
        metric,
        value: 0,
        trend: 'stable',
        change: 0,
      };
    }
    
    let value = 0;
    switch (metric) {
      case 'tokens':
        value = state.totalTokens;
        break;
      case 'tasks':
        value = state.totalTasks;
        break;
      case 'productivity':
        value = state.totalTokens / 100 + state.totalTasks * 10;
        break;
      case 'successRate':
        value = state.taskHistory.length > 0
          ? (state.taskHistory.filter(t => t.status === 'completed').length / state.taskHistory.length) * 100
          : 100;
        break;
      case 'responseTime':
        // Lower is better, invert for ranking
        value = 100 - Math.min(100, (state.taskHistory
          .filter(t => t.status === 'completed' && t.completedAt)
          .reduce((sum, t) => sum + ((t.completedAt! - t.startedAt) / 1000), 0) || 0));
        break;
    }
    
    return {
      rank: index + 1,
      agentId: config.id,
      agentName: config.name,
      agentEmoji: config.emoji,
      metric,
      value: Math.round(value * 10) / 10,
      trend: 'stable',
      change: 0,
    };
  });
  
  // Sort by value (descending)
  const sorted = entries.sort((a, b) => b.value - a.value);
  
  // Assign ranks
  return sorted.map((entry, index) => ({
    ...entry,
    rank: index + 1,
  }));
}

/**
 * Check for performance alerts
 */
export function checkPerformanceAlerts(
  agentStates: Record<string, AgentDashboardState>,
  activityEvents: ActivityEvent[],
  config: MetricsConfig = DEFAULT_METRICS_CONFIG
): PerformanceAlert[] {
  const alerts: PerformanceAlert[] = [];
  const now = Date.now();
  
  // Check response times
  for (const agentId in agentStates) {
    const state = agentStates[agentId];
    
    // Get recent response times
    const recentTasks = state.taskHistory
      .filter(t => t.status === 'completed' && t.completedAt && t.completedAt > now - 3600000);
    
    if (recentTasks.length > 0) {
      const avgResponse = recentTasks.reduce((sum, t) => 
        sum + ((t.completedAt! - t.startedAt) / 1000), 0) / recentTasks.length * 1000;
      
      if (avgResponse > config.responseTimeThresholds.critical) {
        alerts.push({
          id: `response-critical-${agentId}`,
          type: 'critical',
          metric: 'responseTime',
          agentId,
          agentName: agentId,
          message: `Critical: Response time ${(avgResponse / 1000).toFixed(1)}s exceeds threshold`,
          threshold: config.responseTimeThresholds.critical,
          currentValue: avgResponse,
          timestamp: now,
          acknowledged: false,
        });
      } else if (avgResponse > config.responseTimeThresholds.warning) {
        alerts.push({
          id: `response-warning-${agentId}`,
          type: 'warning',
          metric: 'responseTime',
          agentId,
          agentName: agentId,
          message: `Warning: Response time ${(avgResponse / 1000).toFixed(1)}s approaching threshold`,
          threshold: config.responseTimeThresholds.warning,
          currentValue: avgResponse,
          timestamp: now,
          acknowledged: false,
        });
      }
    }
    
    // Check task failure rates
    const recentAllTasks = state.taskHistory.filter(t => t.startedAt > now - 3600000);
    if (recentAllTasks.length >= 5) {
      const failedCount = recentAllTasks.filter(t => t.status === 'failed').length;
      const failureRate = (failedCount / recentAllTasks.length) * 100;
      
      if (failureRate > config.taskFailureThresholds.critical) {
        alerts.push({
          id: `failure-critical-${agentId}`,
          type: 'critical',
          metric: 'taskFailureRate',
          agentId,
          agentName: agentId,
          message: `Critical: Task failure rate ${failureRate.toFixed(0)}% exceeds threshold`,
          threshold: config.taskFailureThresholds.critical,
          currentValue: failureRate,
          timestamp: now,
          acknowledged: false,
        });
      } else if (failureRate > config.taskFailureThresholds.warning) {
        alerts.push({
          id: `failure-warning-${agentId}`,
          type: 'warning',
          metric: 'taskFailureRate',
          agentId,
          agentName: agentId,
          message: `Warning: Task failure rate ${failureRate.toFixed(0)}% approaching threshold`,
          threshold: config.taskFailureThresholds.warning,
          currentValue: failureRate,
          timestamp: now,
          acknowledged: false,
        });
      }
    }
  }
  
  // Check global token usage
  let dailyTokens = 0;
  for (const agentId in agentStates) {
    dailyTokens += agentStates[agentId].totalTokens || 0;
  }
  
  if (dailyTokens > config.tokenThresholds.dailyCritical) {
    alerts.push({
      id: 'tokens-critical-global',
      type: 'critical',
      metric: 'dailyTokens',
      message: `Critical: Daily token usage ${dailyTokens.toLocaleString()} exceeds threshold`,
      threshold: config.tokenThresholds.dailyCritical,
      currentValue: dailyTokens,
      timestamp: now,
      acknowledged: false,
    });
  } else if (dailyTokens > config.tokenThresholds.dailyWarning) {
    alerts.push({
      id: 'tokens-warning-global',
      type: 'warning',
      metric: 'dailyTokens',
      message: `Warning: Daily token usage ${dailyTokens.toLocaleString()} approaching threshold`,
      threshold: config.tokenThresholds.dailyWarning,
      currentValue: dailyTokens,
      timestamp: now,
      acknowledged: false,
    });
  }
  
  return alerts;
}

/**
 * Format number with commas
 */
export function formatNumber(num: number): string {
  return num.toLocaleString();
}

/**
 * Format currency
 */
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(amount);
}

/**
 * Format percentage
 */
export function formatPercent(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format duration in seconds to human readable
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.floor(seconds % 60)}s`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}
