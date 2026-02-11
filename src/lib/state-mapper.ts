// ============================================================================
// State Mapper — Maps gateway states to dashboard agent behaviors
// Also provides demo mode data generation
// ============================================================================

import type {
  AgentBehavior,
  AgentDashboardState,
  AgentTask,
  TokenUsage,
  ActivityEvent,
  SystemStats,
  AgentConfig,
  AgentState,
} from './types';
import type { SessionLiveState } from './gateway-connection';

// ---------------------------------------------------------------------------
// Behavior metadata
// ---------------------------------------------------------------------------

export interface BehaviorInfo {
  label: string;
  emoji: string;
  category: 'work' | 'interaction' | 'life' | 'anomaly';
  color: string;
  neonColor: string;
}

export const BEHAVIOR_INFO: Record<AgentBehavior, BehaviorInfo> = {
  working:        { label: 'Working',        emoji: '💻', category: 'work',        color: '#4CAF50', neonColor: '#4FC3F7' },
  thinking:       { label: 'Thinking',       emoji: '🤔', category: 'work',        color: '#FF9800', neonColor: '#FFCA28' },
  researching:    { label: 'Researching',    emoji: '📚', category: 'work',        color: '#2196F3', neonColor: '#42A5F5' },
  meeting:        { label: 'Meeting',        emoji: '🤝', category: 'work',        color: '#9C27B0', neonColor: '#AB47BC' },
  deploying:      { label: 'Deploying',      emoji: '🚀', category: 'work',        color: '#00BCD4', neonColor: '#00E5FF' },
  debugging:      { label: 'Debugging',      emoji: '🐛', category: 'work',        color: '#F44336', neonColor: '#FF5252' },
  receiving_task: { label: 'Receiving Task', emoji: '📋', category: 'interaction', color: '#3F51B5', neonColor: '#536DFE' },
  reporting:      { label: 'Reporting',      emoji: '✅', category: 'interaction', color: '#8BC34A', neonColor: '#76FF03' },
  idle:           { label: 'Idle',           emoji: '☕', category: 'life',        color: '#795548', neonColor: '#FFCA28' },
  coffee:         { label: 'Coffee Break',   emoji: '☕', category: 'life',        color: '#795548', neonColor: '#A1887F' },
  snacking:       { label: 'Snacking',       emoji: '🍪', category: 'life',        color: '#FF9800', neonColor: '#FFD740' },
  toilet:         { label: 'Restroom',       emoji: '🚽', category: 'life',        color: '#607D8B', neonColor: '#90A4AE' },
  sleeping:       { label: 'Sleeping',       emoji: '😴', category: 'life',        color: '#673AB7', neonColor: '#AB47BC' },
  napping:        { label: 'Napping',        emoji: '💤', category: 'life',        color: '#9575CD', neonColor: '#B388FF' },
  panicking:      { label: 'Error!',         emoji: '😱', category: 'anomaly',     color: '#F44336', neonColor: '#FF1744' },
  dead:           { label: 'Crashed',        emoji: '💀', category: 'anomaly',     color: '#B71C1C', neonColor: '#D50000' },
  overloaded:     { label: 'Overloaded',     emoji: '🔥', category: 'anomaly',     color: '#FF5722', neonColor: '#FF3D00' },
  reviving:       { label: 'Restarting',     emoji: '🔄', category: 'anomaly',     color: '#FF9800', neonColor: '#FFAB00' },
};

/** Check if a behavior is a "working" state */
export function isWorkingBehavior(behavior: AgentBehavior): boolean {
  return BEHAVIOR_INFO[behavior].category === 'work';
}

/** Check if a behavior is an "active" state (working or interacting) */
export function isActiveBehavior(behavior: AgentBehavior): boolean {
  const cat = BEHAVIOR_INFO[behavior].category;
  return cat === 'work' || cat === 'interaction';
}

/** Map behavior → simplified office state */
export function behaviorToOfficeState(behavior: AgentBehavior): AgentState {
  switch (behavior) {
    case 'working':
    case 'debugging':
      return 'working';
    case 'thinking':
      return 'thinking';
    case 'researching':
      return 'researching';
    case 'meeting':
      return 'meeting';
    case 'deploying':
      return 'deploying';
    case 'receiving_task':
      return 'receiving_task';
    case 'reporting':
      return 'reporting';
    case 'sleeping':
    case 'napping':
      return 'resting';
    case 'idle':
    case 'coffee':
    case 'snacking':
    case 'toilet':
      return 'idle';
    case 'panicking':
    case 'dead':
    case 'overloaded':
    case 'reviving':
      return 'waiting';
    default:
      return 'idle';
  }
}

// ---------------------------------------------------------------------------
// Live state → AgentBehavior mapping (uses real gateway events)
// ---------------------------------------------------------------------------

/**
 * Derive an AgentBehavior from real-time gateway event state.
 *
 * Pure 1:1 mapping from chatStatus (ChatEvent.state) to behavior — no
 * time-based logic, no agentStatus checks.
 *
 * Mapping:
 * - chatStatus "delta"   → working
 * - chatStatus "final"   → idle
 * - chatStatus "aborted" → dead
 * - chatStatus "error"   → panicking
 * - chatStatus null      → idle (no chat events seen)
 *
 * This function exists for backward compat with the pixel-art office view.
 * It should be refactored later to let the UI interpret raw statuses directly.
 */
export function executionStateToBehavior(
  live: SessionLiveState | undefined,
  abortedLastRun: boolean | undefined,
): AgentBehavior {
  // If abortedLastRun is set in session metadata and we have no live state
  // contradicting it, treat as dead
  if (abortedLastRun && (!live || !live.chatStatus || live.chatStatus === 'aborted')) {
    return 'dead';
  }

  if (!live || !live.chatStatus) {
    return 'idle';
  }

  switch (live.chatStatus) {
    case 'delta':
      return 'working';
    case 'final':
      return 'idle';
    case 'aborted':
      return 'dead';
    case 'error':
      return 'panicking';
    default:
      return 'idle';
  }
}

// ---------------------------------------------------------------------------
// Demo mode data generation
// ---------------------------------------------------------------------------

const DEMO_BEHAVIORS: AgentBehavior[] = [
  'working', 'thinking', 'researching', 'meeting', 'deploying',
  'debugging', 'idle', 'coffee', 'sleeping', 'receiving_task', 'reporting',
];

const DEMO_TASKS: string[] = [
  'Implement user authentication',
  'Fix database connection pooling',
  'Write API documentation',
  'Review pull request #42',
  'Optimize search algorithm',
  'Debug memory leak in worker',
  'Deploy v2.1.0 to staging',
  'Refactor payment module',
  'Set up CI/CD pipeline',
  'Analyze user feedback data',
  'Build dashboard UI',
  'Migrate to TypeScript strict mode',
  'Add rate limiting middleware',
  'Design REST API endpoints',
];

let demoEventId = 0;

function randomBehavior(): AgentBehavior {
  return DEMO_BEHAVIORS[Math.floor(Math.random() * DEMO_BEHAVIORS.length)];
}

/** Generate demo dashboard state for a single agent */
export function generateDemoAgentState(agentId: string): AgentDashboardState {
  const behavior = randomBehavior();
  const now = Date.now();

  const tokenUsage: TokenUsage[] = [];
  for (let i = 23; i >= 0; i--) {
    const input = Math.floor(Math.random() * 5000) + 500;
    const output = Math.floor(Math.random() * 3000) + 200;
    tokenUsage.push({
      timestamp: now - i * 3600000,
      input,
      output,
      total: input + output,
    });
  }

  const totalTokens = tokenUsage.reduce((sum, t) => sum + t.total, 0);
  const totalTasks = Math.floor(Math.random() * 20) + 5;

  const currentTask: AgentTask | null = isWorkingBehavior(behavior)
    ? {
        id: `task-${agentId}-${Date.now()}`,
        title: DEMO_TASKS[Math.floor(Math.random() * DEMO_TASKS.length)],
        status: 'active',
        startedAt: now - Math.floor(Math.random() * 300000),
      }
    : null;

  const taskHistory: AgentTask[] = Array.from({ length: Math.min(totalTasks, 10) }, (_, i) => ({
    id: `task-${agentId}-hist-${i}`,
    title: DEMO_TASKS[i % DEMO_TASKS.length],
    status: (Math.random() > 0.1 ? 'completed' : 'failed') as AgentTask['status'],
    startedAt: now - (i + 1) * 1800000,
    completedAt: now - (i + 1) * 1800000 + Math.floor(Math.random() * 600000),
    tokenUsage: Math.floor(Math.random() * 10000) + 1000,
  }));

  return {
    behavior,
    officeState: behaviorToOfficeState(behavior),
    currentTask,
    taskHistory,
    tokenUsage,
    totalTokens,
    totalTasks,
    lastActivity: now - Math.floor(Math.random() * 60000),
    sessionLog: generateDemoLogs(agentId),
    uptime: Math.floor(Math.random() * 86400000),
  };
}

function generateDemoLogs(_agentId: string): string[] {
  const now = new Date();
  return Array.from({ length: 20 }, (_, i) => {
    const time = new Date(now.getTime() - i * 30000);
    const ts = time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    const messages = [
      `[${ts}] Processing user request...`,
      `[${ts}] Tool call: web_search("latest AI news")`,
      `[${ts}] Generating response (1,234 tokens)`,
      `[${ts}] Task completed successfully`,
      `[${ts}] Idle — waiting for new messages`,
      `[${ts}] Connected to gateway`,
      `[${ts}] Session heartbeat OK`,
      `[${ts}] Executing: npm run build`,
      `[${ts}] Reading file: src/app/page.tsx`,
      `[${ts}] Writing 2,456 bytes to output`,
    ];
    return messages[i % messages.length];
  }).reverse();
}

/** Generate a demo activity event */
export function generateDemoEvent(agents: AgentConfig[]): ActivityEvent {
  if (agents.length === 0) {
    return {
      id: `event-${++demoEventId}`,
      agentId: 'system',
      agentName: 'System',
      agentEmoji: '🖥️',
      type: 'system',
      message: 'System health check OK',
      timestamp: Date.now(),
    };
  }

  const agent = agents[Math.floor(Math.random() * agents.length)];
  const types: ActivityEvent['type'][] = ['state_change', 'task_start', 'task_complete', 'tool_call', 'message'];
  const type = types[Math.floor(Math.random() * types.length)];

  const messages: Record<ActivityEvent['type'], string[]> = {
    state_change: ['Started working', 'Now thinking...', 'Taking a coffee break', 'Deploying to production', 'Back to idle', 'Entering meeting room'],
    task_start: ['New task: ' + DEMO_TASKS[Math.floor(Math.random() * DEMO_TASKS.length)]],
    task_complete: ['Completed: ' + DEMO_TASKS[Math.floor(Math.random() * DEMO_TASKS.length)]],
    task_fail: ['Failed: Connection timeout', 'Failed: Rate limit exceeded'],
    tool_call: ['web_search("react hooks")', 'read_file("config.ts")', 'exec("npm run build")', 'browser.navigate("docs.api.com")'],
    message: ['Processing user request...', 'Generating response...', 'Sending reply...'],
    error: ['Error: Connection lost', 'Error: Token limit exceeded'],
    system: ['System health check OK', 'Gateway reconnected'],
  };

  const msgList = messages[type] ?? ['Unknown event'];

  return {
    id: `event-${++demoEventId}`,
    agentId: agent.id,
    agentName: agent.name,
    agentEmoji: agent.emoji,
    type,
    message: msgList[Math.floor(Math.random() * msgList.length)],
    timestamp: Date.now(),
  };
}

/** Generate demo system stats */
export function generateDemoStats(agents: AgentConfig[]): SystemStats {
  const activeCount = Math.max(1, Math.floor(Math.random() * agents.length) + 1);
  return {
    totalAgents: agents.length,
    activeAgents: Math.min(activeCount, agents.length),
    totalTokens: Math.floor(Math.random() * 500000) + 100000,
    totalTasks: Math.floor(Math.random() * 100) + 20,
    completedTasks: Math.floor(Math.random() * 80) + 15,
    failedTasks: Math.floor(Math.random() * 10),
    uptime: Math.floor(Math.random() * 86400),
    connected: false,
  };
}

/** Format token count for display */
export function formatTokens(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
  return n.toString();
}

/** Format uptime seconds to human-readable */
export function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

/** Format relative time */
export function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  if (diff < 1000) return 'just now';
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}
