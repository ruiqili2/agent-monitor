"use client";

import React from 'react';

interface MetricsData {
  tokensSent: number;
  tasksCompleted: number;
  meetingsAttended: number;
  messagesSent: number;
  avgResponseTime: number;
  productivityScore: number;
}

interface MetricsDashboardProps {
  data: MetricsData;
  period: 'daily' | 'weekly' | 'monthly';
}

export default function MetricsDashboard({ data, period }: MetricsDashboardProps) {
  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return '#10B981';
    if (score >= 70) return '#F59E0B';
    return '#EF4444';
  };

  const metrics = [
    { label: 'Tokens Sent', value: formatNumber(data.tokensSent), icon: '📊', color: '#3B82F6' },
    { label: 'Tasks Completed', value: formatNumber(data.tasksCompleted), icon: '✅', color: '#10B981' },
    { label: 'Meetings', value: formatNumber(data.meetingsAttended), icon: '💬', color: '#8B5CF6' },
    { label: 'Messages', value: formatNumber(data.messagesSent), icon: '💭', color: '#F59E0B' },
    { label: 'Avg Response', value: `${data.avgResponseTime.toFixed(1)}s`, icon: '⚡', color: '#EF4444' },
    { label: 'Productivity', value: `${data.productivityScore}%`, icon: '📈', color: getScoreColor(data.productivityScore) },
  ];

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-pixel text-lg" style={{ color: 'var(--text-primary)' }}>
          📊 Performance Metrics
        </h2>
        <span className="text-xs px-3 py-1 bg-[var(--accent-primary)] text-white rounded-full">
          {period.toUpperCase()}
        </span>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {metrics.map((metric, index) => (
          <div
            key={index}
            className="bg-[var(--bg-secondary)] rounded-lg p-4 text-center hover:bg-white/5 transition-all"
          >
            <span className="text-3xl mb-2 block">{metric.icon}</span>
            <div className="text-2xl font-bold mb-1" style={{ color: metric.color }}>
              {metric.value}
            </div>
            <div className="text-xs text-[var(--text-secondary)]">
              {metric.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
