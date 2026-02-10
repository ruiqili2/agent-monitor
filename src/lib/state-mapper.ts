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
} from './types';

// ---------------------------------------------------------------------------
// Behavior metadata
// ---------------------------------------------------------------------------

export interface BehaviorInfo {
  label: string;
  emoji: string;
  category: 'work' | 'interaction' | 'life' | 'anomaly';
  color: string;
}

export const BEHAVIOR_INFO: Record<AgentBehavior, BehaviorInfo> = {
  coding: { label: 'Coding', emoji: '💻', category: 'work', color: '#4CAF50' },
  thinking: { label: 'Thinking', emoji: '🤔', category: 'work', color: '#FF9800' },
  researching: { label: 'Researching', emoji: '📚', category: 'work', color: '#2196F3' },
  meeting: { label: 'Meeting', emoji: '🤝', category: 'work', color: '#9C27B0' },
  deploying: { label: 'Deploying', emoji: '🚀', category: 'work', color: '#00BCD4' },
  debugging: { label: 'Debugging', emoji: '🐛', category: 'work', color: '#F44336' },
  receiving_task: { label: 'Receiving Task', emoji: '📋', category: 'interaction', color: '#3F51B5' },
  reporting: { label: 'Reporting', emoji: '✅', category: 'interaction', color: '#8BC34A' },
  idle: { label: 'Idle', emoji: '☕', category: 'life', color: '#795548' },
  coffee: { label: 'Coffee Break', emoji: '☕', category: 'life', color: '#795548' },
  snacking: { label: 'Snacking', emoji: '🍪', category: 'life', color: '#FF9800' },
  toilet: { label: 'Restroom', emoji: '🚽', category: 'life', color: '#607D8B' },
  sleeping: { label: 'Sleeping', emoji: '😴', category: 'life', color: '#673AB7' },
  napping: { label: 'Napping', emoji: '💤', category: 'life', color: '#9575CD' },
  panicking: { label: 'Error!', emoji: '😱', category: 'anomaly', color: '#F44336' },
  dead: { label: 'Crashed', emoji: '💀', category: 'anomaly', color: '#B71C1C' },
  overloaded: { label: 'Overloaded', emoji: '🔥', category: 'anomaly', color: '#FF5722' },
  reviving: { label: 'Restarting', emoji: '🔄', category: 'anomaly', color: '#FF9800' },
};

// ---------------------------------------------------------------------------
// Demo mode data generation
// ---------------------------------------------------------------------------

const DEMO_BEHAVIORS: AgentBehavior[] = [
  'coding', 'thinking', 'researching', 'meeting', 'deploying',
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
    tokenUsage.push({
      timestamp: now - i * 3600000,
      input: Math.floor(Math.random() * 5000) + 500,
      output: Math.floor(Math.random() * 3000) + 200,
      total: 0,
    });
    tokenUsage[tokenUsage.length - 1].total =
      tokenUsage[tokenUsage.length - 1].input + tokenUsage[tokenUsage.length - 1].output;
  }

  const totalTokens = tokenUsage.reduce((sum, t) => sum + t.total, 0);
  const totalTasks = Math.floor(Math.random() * 20) + 5;

  const currentTask: AgentTask | null = ['coding', 'debugging', 'deploying', 'researching', 'thinking'].includes(behavior)
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
    officeState: behaviorToSimpleState(behavior),
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

function behaviorToSimpleState(behavior: AgentBehavior): AgentBehavior {
  return behavior;
}

function generateDemoLogs(agentId: string): string[] {
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
    ];
    return messages[i % messages.length];
  }).reverse();
}

/** Generate a demo activity event */
export function generateDemoEvent(agents: AgentConfig[]): ActivityEvent {
  const agent = agents[Math.floor(Math.random() * agents.length)];
  const types: ActivityEvent['type'][] = ['state_change', 'task_start', 'task_complete', 'tool_call', 'message'];
  const type = types[Math.floor(Math.random() * types.length)];

  const messages: Record<ActivityEvent['type'], string[]> = {
    state_change: ['Started coding', 'Now thinking...', 'Taking a coffee break', 'Deploying to production', 'Back to idle'],
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
  const activeCount = Math.floor(Math.random() * agents.length) + 1;
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
