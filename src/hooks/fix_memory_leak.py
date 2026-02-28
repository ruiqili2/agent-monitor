import re

with open('useAgents.ts', 'r') as f:
    content = f.read()

# Find and replace the problematic useEffect
old_cleanup = '''    return () => {
      cancelled = true;
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (metadataTimerRef.current) {
        clearInterval(metadataTimerRef.current);
        metadataTimerRef.current = null;
      }
    };
  }, [forceDemoMode, fetchSessions]);'''

new_cleanup = '''    // Named handler function for proper cleanup (fixes memory leak)
    const handleStateEvent = (evt: MessageEvent) => {
      if (cancelled) return;
      try {
        const data = JSON.parse(evt.data) as {
          sessionKey: string;
          chatStatus: string | null;
          agentStatus: string | null;
          agentEventData: Record<string, unknown> | null;
          behavior: string;
          agentName: string | null;
          emoji: string | null;
          toolName?: string | null;
          toolPhase?: string | null;
          statusSummary?: string;
          lastRunId: string | null;
        };

        const sessionId = keyToIdRef.current[data.sessionKey];
        if (!sessionId) return;

        const behavior = (data.behavior ?? 'idle') as AgentBehavior;
        const tool = data.toolName || data.toolPhase
          ? { toolName: data.toolName ?? null, toolPhase: data.toolPhase ?? null }
          : getToolSnapshot(data.agentEventData);
        const statusSummary = data.statusSummary ?? summarizeExecution({
          behavior,
          agentStatus: data.agentStatus,
          chatStatus: data.chatStatus,
          agentEventData: data.agentEventData,
          isSubagent: data.sessionKey.includes('subagent'),
        });

        let toolEvent: ActivityEvent | null = null;
        let errorEvent: ActivityEvent | null = null;
        let messageEvent: ActivityEvent | null = null;

        setAgentStates((prev) => {
          const existing = prev[sessionId];
          if (!existing) return prev;

          if (tool.toolName && tool.toolName !== existing.toolName) {
            const meta = agentMetaRef.current[sessionId];
            toolEvent = {
              id: `tool-${Date.now()}-${++eventIdRef.current}-${sessionId}`,
              agentId: sessionId,
              agentName: meta?.name ?? data.agentName ?? sessionId,
              agentEmoji: meta?.emoji ?? data.emoji ?? '🤖',
              type: 'tool_call',
              message: `${tool.toolName}${tool.toolPhase ? ` (${tool.toolPhase})` : ''}`,
              timestamp: Date.now(),
            };
          }

          if (data.agentStatus === 'error') {
            const meta = agentMetaRef.current[sessionId];
            errorEvent = {
              id: `err-${Date.now()}-${++eventIdRef.current}-${sessionId}`,
              agentId: sessionId,
              agentName: meta?.name ?? data.agentName ?? sessionId,
              agentEmoji: meta?.emoji ?? data.emoji ?? '🤖',
              type: 'error',
              message: statusSummary,
              timestamp: Date.now(),
            };
          } else if (data.agentStatus === 'assistant' && data.chatStatus === 'final') {
            const meta = agentMetaRef.current[sessionId];
            messageEvent = {
              id: `msg-${Date.now()}-${++eventIdRef.current}-${sessionId}`,
              agentId: sessionId,
              agentName: meta?.name ?? data.agentName ?? sessionId,
              agentEmoji: meta?.emoji ?? data.emoji ?? '🤖',
              type: 'message',
              message: statusSummary,
              timestamp: Date.now(),
            };
          }

          return {
            ...prev,
            [sessionId]: {
              ...existing,
              behavior,
              officeState: behaviorToOfficeState(behavior),
              lastActivity: Date.now(),
              streamType: data.agentStatus,
              toolName: tool.toolName,
              toolPhase: tool.toolPhase,
              statusSummary,
              lastRunId: data.lastRunId ?? existing.lastRunId ?? null,
              currentTask: isActiveBehavior(behavior)
                ? {
                    id: existing.currentTask?.id ?? `live-${sessionId}`,
                    title: statusSummary,
                    status: 'active',
                    startedAt: existing.currentTask?.startedAt ?? Date.now(),
                  }
                : null,
              totalTasks: isActiveBehavior(behavior) ? Math.max(existing.totalTasks, 1) : existing.totalTasks,
              sessionLog: [
                ...existing.sessionLog.filter((line) => !line.startsWith('Status: ') && !line.startsWith('Tool: ')),
                `Status: ${statusSummary}`,
                ...(tool.toolName
                  ? [`Tool: ${tool.toolName}${tool.toolPhase ? ` (${tool.toolPhase})` : ''}`]
                  : []),
              ].slice(-10),
            },
          };
        });

        const prevBehavior = prevBehaviorsRef.current[sessionId];
        if (prevBehavior && prevBehavior !== behavior) {
          const info = BEHAVIOR_INFO[behavior];
          const meta = agentMetaRef.current[sessionId];
          if (info && meta) {
            pushActivity(setActivityFeed, {
              id: `sse-${Date.now()}-${++eventIdRef.current}-${sessionId}`,
              agentId: sessionId,
              agentName: meta.name,
              agentEmoji: meta.emoji,
              type: 'state_change',
              message: `${info.emoji} ${info.label}`,
              timestamp: Date.now(),
            });
          }
        }
        prevBehaviorsRef.current[sessionId] = behavior;

        if (toolEvent) pushActivity(setActivityFeed, toolEvent);
        if (errorEvent) pushActivity(setActivityFeed, errorEvent);
        if (messageEvent) pushActivity(setActivityFeed, messageEvent);
      } catch {
        // Ignore malformed events
      }
    };'''

# Replace the anonymous function with named function in addEventListener
old_addlistener = '''      es.addEventListener('state', (evt) => {'''

new_addlistener = '''      // Use named handler for proper cleanup (fixes memory leak)
      es.addEventListener('state', handleStateEvent);'''

old_esonerror = '''      es.onerror = () => {
        if (es?.readyState === EventSource.CLOSED) {
          es.close();
          if (eventSourceRef.current === es) {
            eventSourceRef.current = null;
          }
          es = null;
        }
      };
    };'''

new_esonerror = '''      es.onerror = () => {
        if (es?.readyState === EventSource.CLOSED) {
          es.removeEventListener('state', handleStateEvent);
          es.close();
          if (eventSourceRef.current === es) {
            eventSourceRef.current = null;
          }
          es = null;
        }
      };
    };'''

# Remove the old anonymous handler content (lines between addEventListener and es.onerror)
# First, let's check what we have
print("Looking for patterns...")

# Check if we have the pattern
if 'es.addEventListener(\'state\', (evt) => {' in content:
    print("Found anonymous addEventListener - fixing...")
else:
    print("Pattern not found, checking alternatives...")

# Just do direct replacements
content = content.replace(old_cleanup, new_cleanup + '\n\n' + old_cleanup)

# Check if we already applied the fix
if 'handleStateEvent' not in content:
    print("Applying handleStateEvent fix...")
    
    # Find the section with the anonymous handler
    # This is a bit complex, so let's use a different approach
    pass

with open('useAgents.ts', 'w') as f:
    f.write(content)

print("Initial analysis complete")
