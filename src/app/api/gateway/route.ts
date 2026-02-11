// ============================================================================
// /api/gateway — Proxy to OpenClaw Gateway
//
// Returns real session data as JSON for the dashboard to poll.
// Uses a persistent WebSocket connection (singleton) instead of opening a
// new connection per request. Raw chatStatus and agentStatus are passed
// through from gateway events alongside the derived behavior.
// ============================================================================

import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  getGatewayConnection,
  readOpenClawConfig,
  type SessionsListResult,
} from '@/lib/gateway-connection';
import { executionStateToBehavior, isActiveBehavior } from '@/lib/state-mapper';

/** Read bot name from IDENTITY.md **Name:** field */
function readBotName(): string | null {
  try {
    const workspace = process.env.OPENCLAW_WORKSPACE
      ?? join(process.env.USERPROFILE ?? process.env.HOME ?? '', 'clawd');
    const content = readFileSync(join(workspace, 'IDENTITY.md'), 'utf-8');
    const match = content.match(/\*\*Name:\*\*\s*(.+)/);
    return match?.[1]?.trim() ?? null;
  } catch {
    return null;
  }
}

export async function GET() {
  const config = readOpenClawConfig();
  if (!config) {
    return NextResponse.json(
      { error: 'OpenClaw config not found', sessions: [] },
      { status: 500 },
    );
  }

  try {
    const gw = getGatewayConnection();

    // Fetch session metadata via RPC (uses persistent connection if ready,
    // falls back to ephemeral WebSocket otherwise).
    const result = await gw.request<SessionsListResult>('sessions.list', {});
    const now = Date.now();

    // Get live execution states from event subscriptions
    const liveStates = gw.getSessionStates();

    // Get known agents for display names / emoji
    const knownAgents = gw.getAgents();

    const sessions = (result.sessions ?? []).map((s) => {
      const isSubagent = s.key.includes('subagent');

      // Derive behavior from real-time event state (if available)
      // combined with session metadata (abortedLastRun as fallback).
      const liveState = liveStates.get(s.key);
      const behavior = executionStateToBehavior(liveState, s.abortedLastRun);
      const isActive = isActiveBehavior(behavior);

      // Resolve agent info from agents map, fall back to session key parsing
      const keyParts = s.key.split(':');
      const agentId = (keyParts[0] === 'agent' && keyParts[1]) ? keyParts[1] : 'main';
      const agentInfo = liveState?.agent ?? knownAgents.get(agentId);

      let agentName: string;
      if (agentInfo?.identity?.name ?? agentInfo?.name) {
        agentName = (agentInfo.identity?.name ?? agentInfo.name)!;
      } else if (isSubagent) {
        const subId = keyParts[keyParts.length - 1] ?? '';
        agentName = `Sub-${subId.slice(0, 6)}`;
      } else {
        agentName = readBotName() ?? agentId.charAt(0).toUpperCase() + agentId.slice(1);
      }

      return {
        id: s.sessionId,
        key: s.key,
        name: agentName,
        emoji: agentInfo?.identity?.emoji,
        model: s.model,
        totalTokens: s.totalTokens ?? 0,
        contextTokens: s.contextTokens ?? 0,
        channel: s.lastChannel ?? s.channel,
        // Raw statuses from gateway events (recorded as-is)
        chatStatus: liveState?.chatStatus ?? null,
        agentStatus: liveState?.agentStatus ?? null,
        agentEventData: liveState?.agentEventData ?? null,
        // Derived behavior for backward compat with office view
        behavior,
        isActive,
        isSubagent,
        lastActivity: s.updatedAt,
        updatedAt: s.updatedAt,
        aborted: s.abortedLastRun ?? false,
      };
    });

    // Deduplicate: if multiple sessions share the same agent prefix
    // (e.g. agent:main:main and agent:main), keep the one with more tokens
    const sessionMap = new Map<string, typeof sessions[0]>();
    for (const sess of sessions) {
      // Group key: for "agent:main:main" -> "agent:main", for subagents keep full key
      const groupKey = sess.isSubagent ? sess.key : sess.key.split(':').slice(0, 2).join(':');
      const existing = sessionMap.get(groupKey);
      if (!existing || sess.totalTokens > existing.totalTokens || (sess.totalTokens === existing.totalTokens && (sess.lastActivity ?? 0) > (existing.lastActivity ?? 0))) {
        sessionMap.set(groupKey, sess);
      }
    }
    const dedupedSessions = Array.from(sessionMap.values());

    return NextResponse.json({
      ok: true,
      timestamp: now,
      count: dedupedSessions.length,
      sessions: dedupedSessions,
    });
  } catch (err) {
    return NextResponse.json(
      { error: String(err), sessions: [] },
      { status: 502 },
    );
  }
}
