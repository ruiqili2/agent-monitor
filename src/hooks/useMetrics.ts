// ============================================================================
// useMetrics Hook - React Hook for Performance Metrics
// ============================================================================

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { AgentDashboardState, AgentTask, ActivityEvent, TokenUsage } from '@/lib/types';
import {
  calculateTokenTrends,
  calculateAgentProductivity,
  calculateTaskCompletionMetrics,
  calculateResponseTimeMetrics,
  estimateCost,
  generateDailyReport,
  generateLeaderboard,
  checkPerformanceAlerts,
  type TokenTrend,
  type AgentProductivity,
  type TaskCompletionMetrics,
  type ResponseTimeMetrics,
  type CostEstimate,
  type DailyReport,
  type LeaderboardEntry,
  type PerformanceAlert,
  DEFAULT_METRICS_CONFIG,
} from '@/lib/metrics';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MetricsState {
  tokenTrends: TokenTrend;
  taskMetrics: TaskCompletionMetrics;
  responseMetrics: ResponseTimeMetrics;
  costEstimate: CostEstimate;
  leaderboard: LeaderboardEntry[];
  alerts: PerformanceAlert[];
  dailyReport: DailyReport | null;
  agentProductivities: AgentProductivity[];
  isLoading: boolean;
  error: string | null;
}

export interface MetricsActions {
  refreshMetrics: () => void;
  acknowledgeAlert: (alertId: string) => void;
  setLeaderboardMetric: (metric: 'tokens' | 'tasks' | 'productivity' | 'successRate' | 'responseTime') => void;
  setTimeRange: (range: '1h' | '24h' | '7d' | '30d') => void;
}

export type MetricsReturn = MetricsState & MetricsActions;

// ---------------------------------------------------------------------------
// Hook Implementation
// ---------------------------------------------------------------------------

interface UseMetricsParams {
  agentStates: Record<string, AgentDashboardState>;
  agentConfigs: Array<{ id: string; name: string; emoji: string; model?: string }>;
  activityFeed: ActivityEvent[];
  enabled?: boolean;
  refreshInterval?: number;
}

export function useMetrics({
  agentStates,
  agentConfigs,
  activityFeed,
  enabled = true,
  refreshInterval = 30000,
}: UseMetricsParams): MetricsReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [leaderboardMetric, setLeaderboardMetric] = useState<'tokens' | 'tasks' | 'productivity' | 'successRate' | 'responseTime'>('productivity');
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>('24h');
  const [acknowledgedAlerts, setAcknowledgedAlerts] = useState<Set<string>>(new Set());

  // Get all tasks from agent states
  const allTasks = useMemo(() => {
    const tasks: AgentTask[] = [];
    for (const agentId in agentStates) {
      tasks.push(...agentStates[agentId].taskHistory);
    }
    return tasks;
  }, [agentStates]);

  // Get all token history
  const allTokenHistory = useMemo(() => {
    const history: TokenUsage[] = [];
    for (const agentId in agentStates) {
      history.push(...agentStates[agentId].tokenUsage);
    }
    return history.sort((a, b) => a.timestamp - b.timestamp);
  }, [agentStates]);

  // Aggregate token counts
  const tokenCounts = useMemo(() => {
    let inputTokens = 0;
    let outputTokens = 0;
    
    for (const agentId in agentStates) {
      inputTokens += agentStates[agentId].inputTokens || 0;
      outputTokens += agentStates[agentId].outputTokens || 0;
    }
    
    return { inputTokens, outputTokens };
  }, [agentStates]);

  // Get primary model
  const primaryModel = useMemo(() => {
    return agentConfigs[0]?.model || 'default';
  }, [agentConfigs]);

  // Calculate token trends
  const tokenTrends = useMemo(() => {
    const granularity = timeRange === '1h' ? 'hour' : timeRange === '7d' || timeRange === '30d' ? 'day' : 'hour';
    return calculateTokenTrends(allTokenHistory, granularity);
  }, [allTokenHistory, timeRange]);

  // Calculate task metrics
  const taskMetrics = useMemo(() => {
    return calculateTaskCompletionMetrics(allTasks);
  }, [allTasks]);

  // Calculate response time metrics
  const responseMetrics = useMemo(() => {
    return calculateResponseTimeMetrics(allTasks, activityFeed);
  }, [allTasks, activityFeed]);

  // Calculate cost estimate
  const costEstimate = useMemo(() => {
    return estimateCost(tokenCounts.inputTokens, tokenCounts.outputTokens, primaryModel);
  }, [tokenCounts, primaryModel]);

  // Calculate agent productivities
  const agentProductivities = useMemo(() => {
    return Object.entries(agentStates).map(([id, state]) => {
      const config = agentConfigs.find(c => c.id === id);
      return calculateAgentProductivity(id, config?.name || id, state, allTasks);
    });
  }, [agentStates, agentConfigs, allTasks]);

  // Generate leaderboard
  const leaderboard = useMemo(() => {
    return generateLeaderboard(agentStates, agentConfigs, leaderboardMetric);
  }, [agentStates, agentConfigs, leaderboardMetric]);

  // Check for alerts
  const alerts = useMemo(() => {
    const allAlerts = checkPerformanceAlerts(agentStates, activityFeed, DEFAULT_METRICS_CONFIG);
    return allAlerts.map(alert => ({
      ...alert,
      acknowledged: acknowledgedAlerts.has(alert.id),
    }));
  }, [agentStates, activityFeed, acknowledgedAlerts]);

  // Generate daily report
  const dailyReport = useMemo(() => {
    return generateDailyReport(new Date(), agentStates, allTasks, activityFeed);
  }, [agentStates, allTasks, activityFeed]);

  // Actions
  const refreshMetrics = useCallback(() => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 100);
  }, []);

  const acknowledgeAlert = useCallback((alertId: string) => {
    setAcknowledgedAlerts(prev => new Set([...prev, alertId]));
  }, []);

  // Auto-refresh
  useEffect(() => {
    if (!enabled) return;
    
    const interval = setInterval(refreshMetrics, refreshInterval);
    return () => clearInterval(interval);
  }, [enabled, refreshInterval, refreshMetrics]);

  return {
    tokenTrends,
    taskMetrics,
    responseMetrics,
    costEstimate,
    leaderboard,
    alerts,
    dailyReport,
    agentProductivities,
    isLoading,
    error,
    refreshMetrics,
    acknowledgeAlert,
    setLeaderboardMetric,
    setTimeRange,
  };
}

// ---------------------------------------------------------------------------
// Mini Hook for Token Tracking Only
// ---------------------------------------------------------------------------

export function useTokenTracking(
  agentStates: Record<string, AgentDashboardState>
) {
  return useMemo(() => {
    let inputTokens = 0;
    let outputTokens = 0;
    let totalTokens = 0;

    for (const agentId in agentStates) {
      const state = agentStates[agentId];
      inputTokens += state.inputTokens ?? 0;
      outputTokens += state.outputTokens ?? 0;
      totalTokens += state.totalTokens ?? 0;
    }

    return { inputTokens, outputTokens, totalTokens };
  }, [agentStates]);
}

export default useMetrics;
