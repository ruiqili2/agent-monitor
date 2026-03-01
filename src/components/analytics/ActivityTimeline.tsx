'use client';

import React, { useMemo } from 'react';
import type { ActivityData } from '@/lib/analytics';
import { getActivityColor } from '@/lib/analytics';

interface ActivityTimelineProps {
  data: ActivityData[];
  agents: Array<{ id: string; name: string; color?: string }>;
  period?: 'hour' | 'day' | 'week';
}

export function ActivityTimeline({ data, agents, period = 'day' }: ActivityTimelineProps) {
  // Group data by time buckets
  const timelineData = useMemo(() => {
    const now = Date.now();
    const bucketMs = period === 'hour' ? 60000 : period === 'day' ? 3600000 : 86400000;
    const buckets: Map<number, Map<string, { count: number; tokens: number; activities: Map<string, number> }>> = new Map();
    
    data.forEach((point) => {
      const bucket = Math.floor(point.timestamp / bucketMs) * bucketMs;
      if (!buckets.has(bucket)) {
        buckets.set(bucket, new Map());
      }
      const agentBucket = buckets.get(bucket)!;
      
      if (!agentBucket.has(point.agentId)) {
        agentBucket.set(point.agentId, { count: 0, tokens: 0, activities: new Map() });
      }
      
      const agentData = agentBucket.get(point.agentId)!;
      agentData.count++;
      agentData.tokens = (agentData.tokens || 0) + (point as any).tokens;
      
      const activityCount = agentData.activities.get(point.activity) || 0;
      agentData.activities.set(point.activity, activityCount + 1);
    });
    
    // Convert to sorted array
    return Array.from(buckets.entries())
      .sort((a, b) => b[0] - a[0])
      .slice(0, period === 'hour' ? 60 : period === 'day' ? 24 : 7);
  }, [data, period]);
  
  // Find max count for scaling
  const maxCount = useMemo(() => {
    let max = 0;
    timelineData.forEach(([_, agents]) => {
      agents.forEach((data) => {
        max = Math.max(max, data.count);
      });
    });
    return Math.max(max, 1);
  }, [timelineData]);
  
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    if (period === 'hour') {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } else if (period === 'day') {
      return date.toLocaleTimeString('en-US', { hour: '2-digit' });
    }
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  };
  
  const agentColors: Record<string, string> = useMemo(() => {
    const colors: Record<string, string> = {};
    agents.forEach((agent) => {
      colors[agent.id] = agent.color || '#4FC3F7';
    });
    return colors;
  }, [agents]);
  
  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-4">
      <h3 className="text-sm font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
        📈 Activity Timeline
        <span className="text-xs px-2 py-0.5 bg-[var(--accent-primary)] text-white rounded-full">
          {period.toUpperCase()}
        </span>
      </h3>
      
      {/* Timeline chart */}
      <div className="relative h-48 overflow-x-auto">
        <div className="flex h-full gap-1 min-w-max pb-8">
          {timelineData.map(([timestamp, agentData], idx) => {
            const totalForBucket = Array.from(agentData.values()).reduce((sum, d) => sum + d.count, 0);
            
            return (
              <div
                key={timestamp}
                className="flex flex-col items-center gap-1"
                style={{ minWidth: '40px' }}
              >
                {/* Bar */}
                <div className="relative flex-1 w-full flex flex-col justify-end">
                  {agents.map((agent) => {
                    const agentActivity = agentData.get(agent.id);
                    if (!agentActivity) return null;
                    
                    const height = (agentActivity.count / maxCount) * 100;
                    
                    return (
                      <div
                        key={agent.id}
                        className="w-full rounded-t transition-all duration-300 hover:opacity-80 cursor-pointer group"
                        style={{
                          height: `${height}%`,
                          backgroundColor: agentColors[agent.id],
                          minHeight: '4px',
                        }}
                        title={`${agent.name}: ${agentActivity.count} activities`}
                      />
                    );
                  })}
                </div>
                
                {/* Time label */}
                <span className="text-xs text-[var(--text-secondary)] whitespace-nowrap">
                  {formatTime(timestamp)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Legend */}
      <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-[var(--border)]">
        {agents.map((agent) => (
          <div key={agent.id} className="flex items-center gap-1.5">
            <div
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: agentColors[agent.id] }}
            />
            <span className="text-xs text-[var(--text-secondary)]">{agent.name}</span>
          </div>
        ))}
      </div>
      
      {/* Activity types */}
      <div className="flex flex-wrap gap-2 mt-3">
        {['working', 'thinking', 'deploying', 'debugging', 'researching', 'meeting'].map((activity) => (
          <div key={activity} className="flex items-center gap-1">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: getActivityColor(activity) }}
            />
            <span className="text-xs text-[var(--text-secondary)] capitalize">{activity}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ActivityTimeline;
