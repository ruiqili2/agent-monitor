// ============================================================================
// TaskList — Agent task list with status tabs
// ============================================================================

'use client';

import { useState } from 'react';
import type { AgentTask } from '@/lib/types';
import { formatTokens, formatRelativeTime } from '@/lib/state-mapper';

interface TaskListProps {
  currentTask: AgentTask | null;
  taskHistory: AgentTask[];
}

type TabFilter = 'all' | 'active' | 'completed' | 'failed';

const TAB_CONFIG: { key: TabFilter; label: string; color: string }[] = [
  { key: 'all', label: 'All', color: 'var(--text-primary)' },
  { key: 'active', label: 'Active', color: 'var(--accent-primary)' },
  { key: 'completed', label: 'Completed', color: 'var(--accent-success)' },
  { key: 'failed', label: 'Failed', color: 'var(--accent-danger)' },
];

const STATUS_ICON: Record<string, string> = {
  active: '▶️',
  completed: '✅',
  failed: '❌',
};

export default function TaskList({ currentTask, taskHistory }: TaskListProps) {
  const [tab, setTab] = useState<TabFilter>('all');

  const allTasks = currentTask ? [currentTask, ...taskHistory] : [...taskHistory];
  const filteredTasks = tab === 'all' ? allTasks : allTasks.filter(t => t.status === tab);

  return (
    <div
      className="rounded-xl p-4"
      style={{
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border)',
      }}
    >
      <h3 className="font-pixel text-sm mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
        <span>📋</span> Tasks
      </h3>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-3">
        {TAB_CONFIG.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="text-[10px] font-mono px-2 py-1 rounded-md transition-colors"
            style={{
              backgroundColor: tab === t.key ? `${t.color}20` : 'transparent',
              color: tab === t.key ? t.color : 'var(--text-secondary)',
              border: `1px solid ${tab === t.key ? `${t.color}40` : 'transparent'}`,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Task list */}
      <div className="space-y-2 max-h-80 overflow-y-auto">
        {filteredTasks.length === 0 && (
          <p className="text-xs font-mono text-center py-4" style={{ color: 'var(--text-secondary)' }}>
            No tasks
          </p>
        )}
        {filteredTasks.map(task => (
          <div
            key={task.id}
            className="flex items-start gap-2 rounded-lg px-3 py-2 hover:bg-white/5 transition-colors"
          >
            <span className="text-xs mt-0.5 flex-shrink-0">{STATUS_ICON[task.status] ?? '❓'}</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs truncate" style={{ color: 'var(--text-primary)' }}>
                {task.title}
              </p>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-[9px] font-mono" style={{ color: 'var(--text-secondary)' }}>
                  {formatRelativeTime(task.startedAt)}
                </span>
                {task.tokenUsage != null && (
                  <span className="text-[9px] font-mono" style={{ color: 'var(--accent-warning)' }}>
                    🪙 {formatTokens(task.tokenUsage)}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
