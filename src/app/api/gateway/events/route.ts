// ============================================================================
// /api/gateway/events — SSE endpoint for real-time session state updates
//
// Opens a long-lived HTTP response with Content-Type: text/event-stream.
// Subscribes to the GatewayConnection singleton and pushes state changes
// for individual sessions as they happen. The browser connects via
// EventSource and patches React state without polling.
//
// Event format (one per state change):
//   event: state
//   data: {"sessionKey":"agent:main:main","chatStatus":"delta",...,"behavior":"working"}
//
// A heartbeat comment is sent every 30s to keep the connection alive through
// proxies/load balancers.
// ============================================================================

import {
  getGatewayConnection,
  readOpenClawConfig,
  type SessionLiveState,
} from '@/lib/gateway-connection';
import {
  executionStateToBehavior,
  getToolSnapshot,
  summarizeExecution,
} from '@/lib/state-mapper';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!readOpenClawConfig()) {
    return new Response('OpenClaw config not found', { status: 500 });
  }

  const gw = getGatewayConnection();

  // Cleanup function — set in start(), called in cancel()
  let cleanup: (() => void) | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      /** Send an SSE event to the client. */
      function send(event: string, data: string) {
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${data}\n\n`));
        } catch {
          // Stream already closed
        }
      }

      /** Subscriber callback — fired for each individual session state change. */
      function onStateChange(sessionKey: string, state: SessionLiveState) {
        try {
          const behavior = executionStateToBehavior(state, undefined);
          const agentName = state.agent?.identity?.name ?? state.agent?.name ?? null;
          const emoji = state.agent?.identity?.emoji ?? null;
          const { toolName, toolPhase } = getToolSnapshot(state.agentEventData);

          send('state', JSON.stringify({
            sessionKey,
            chatStatus: state.chatStatus,
            agentStatus: state.agentStatus,
            agentEventData: state.agentEventData,
            behavior,
            agentName,
            emoji,
            toolName,
            toolPhase,
            statusSummary: summarizeExecution({
              behavior,
              agentStatus: state.agentStatus,
              chatStatus: state.chatStatus,
              agentEventData: state.agentEventData,
              isSubagent: sessionKey.includes('subagent'),
            }),
            lastRunId: state.lastRunId ?? null,
          }));
        } catch {
          // Don't let serialization errors kill the stream
        }
      }

      // Subscribe to gateway state changes
      gw.subscribe(onStateChange);

      // Heartbeat every 30s — SSE comment (lines starting with ':')
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': heartbeat\n\n'));
        } catch {
          // Stream closed — clean up
          clearInterval(heartbeat);
          gw.unsubscribe(onStateChange);
        }
      }, 30_000);

      // Send initial "open" event so the client knows the connection is live
      send('open', JSON.stringify({ ts: Date.now(), ready: gw.isReady }));

      // Register cleanup for cancel()
      cleanup = () => {
        gw.unsubscribe(onStateChange);
        clearInterval(heartbeat);
      };
    },

    cancel() {
      // Called when the client disconnects
      if (cleanup) cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // disable nginx buffering
    },
  });
}
