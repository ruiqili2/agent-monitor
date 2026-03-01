// Analytics Data Processing

export interface ActivityData {
  timestamp: number;
  agentId: string;
  activity: string;
  duration: number;
}

export interface TokenUsage {
  date: string;
  tokens: number;
  cost: number;
}

export interface ProductivityMetrics {
  agentId: string;
  tasksCompleted: number;
  avgResponseTime: number;
  activeHours: number;
  productivityScore: number;
}

// Process activity data for timeline
export function processActivityTimeline(activities: ActivityData[]): ActivityData[] {
  return activities.sort((a, b) => a.timestamp - b.timestamp);
}

// Calculate token usage trends
export function calculateTokenTrends(usage: TokenUsage[]): { daily: number; weekly: number; monthly: number } {
  const daily = usage.slice(-1)[0]?.tokens || 0;
  const weekly = usage.slice(-7).reduce((sum, d) => sum + d.tokens, 0);
  const monthly = usage.reduce((sum, d) => sum + d.tokens, 0);
  return { daily, weekly, monthly };
}

// Calculate productivity score
export function calculateProductivity(metrics: ProductivityMetrics): number {
  const taskScore = Math.min(100, metrics.tasksCompleted * 10);
  const speedScore = Math.max(0, 100 - metrics.avgResponseTime);
  const activityScore = Math.min(100, metrics.activeHours * 10);
  return Math.round((taskScore + speedScore + activityScore) / 3);
}

// Get activity color
export function getActivityColor(activity: string): string {
  const colors: Record<string, string> = {
    working: '#10B981',
    thinking: '#8B5CF6',
    deploying: '#3B82F6',
    debugging: '#EF4444',
    researching: '#F59E0B',
    meeting: '#EC4899',
    idle: '#6B7280',
  };
  return colors[activity] || '#9CA3AF';
}

// Format duration
export function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours > 0) return `${hours}h ${remainingMinutes}m`;
  return `${remainingMinutes}m`;
}

// Export data to CSV
export function exportToCSV(data: any[], filename: string): void {
  if (!data.length) return;
  const headers = Object.keys(data[0]).join(',');
  const rows = data.map(row => Object.values(row).join(',')).join('\n');
  const csv = `${headers}\n${rows}`;
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// Export data to JSON
export function exportToJSON(data: any, filename: string): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
