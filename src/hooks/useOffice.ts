// ============================================================================
// useOffice — Office state management hook
// ============================================================================
/* eslint-disable react-hooks/set-state-in-effect */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type {
  OfficeState,
  AgentRuntime,
  AgentBehavior,
  AgentConfig,
  GridPos,
  CharacterAnim,
  ZoneId,
  Particle,
} from '@/lib/types';
import type { AgentDashboardState } from '@/lib/types';
import { findPath, type WalkGrid } from '@/engine/pathfinding';
import { createWalkGrid } from '@/office/layout';
import { BEHAVIOR_MAP, resolveZone } from '@/office/behaviors';
import { getZone, getRandomPointInZone } from '@/office/zones';
import { createParticle, tickParticles } from '@/sprites/effects';
import { gridToScreen } from '@/engine/isometric';

export interface UseOfficeReturn {
  officeState: OfficeState;
  tick: () => void;
}

const DESK_ZONES: ZoneId[] = ['desk_0', 'desk_1', 'desk_2', 'desk_3', 'desk_4', 'desk_5'];

function createInitialAgentRuntime(id: string, index: number): AgentRuntime {
  const deskZone = DESK_ZONES[index] ?? 'desk_0';
  const zone = getZone(deskZone, 6);
  const pos = zone ? zone.center : { col: 4, row: 3 + index * 3 };
  return {
    id,
    currentState: 'idle',
    pos: { ...pos },
    screenPos: gridToScreen(pos),
    direction: 's',
    anim: 'stand',
    path: [],
    transitioning: false,
    deskZone,
  };
}

export function useOffice(
  agents: AgentConfig[],
  agentStates: Record<string, AgentDashboardState>,
  speed: number = 1,
): UseOfficeReturn {
  const [officeState, setOfficeState] = useState<OfficeState>(() => ({
    agents: agents.map((a, i) => createInitialAgentRuntime(a.id, i)),
    owner: { anim: 'sit_typing' },
    bubbles: [],
    particles: [],
    tick: 0,
    autoMode: true,
    autoTimer: 0,
    dayNightPhase: 0,
  }));

  const walkGridRef = useRef<WalkGrid>(createWalkGrid(agents.length));
  const particleTimerRef = useRef<Record<string, number>>({});

  // Rebuild walk grid when agent count changes
  useEffect(() => {
    walkGridRef.current = createWalkGrid(agents.length);
  }, [agents.length]);

  // Sync agent runtimes when agents config changes
  useEffect(() => {
    setOfficeState(prev => {
      const existingIds = new Set(prev.agents.map(a => a.id));
      const newRuntimes = agents.map((a, i) => {
        const existing = prev.agents.find(r => r.id === a.id);
        if (existing) return existing;
        return createInitialAgentRuntime(a.id, i);
      });
      return { ...prev, agents: newRuntimes };
    });
  }, [agents]);

  const tickFn = useCallback(() => {
    setOfficeState(prev => {
      const newTick = prev.tick + 1;
      const newAgents: AgentRuntime[] = [];
      const newBubbles = prev.bubbles.map(b => ({ ...b, ttl: b.ttl - 1 })).filter(b => b.ttl > 0);
      const newParticles = tickParticles(prev.particles);

      for (const runtime of prev.agents) {
        const dashState = agentStates[runtime.id];
        const behavior: AgentBehavior = dashState?.behavior ?? 'idle';
        const mapping = BEHAVIOR_MAP[behavior];
        const targetZone = resolveZone(behavior, runtime.deskZone);
        const updated = { ...runtime };

        // Check if agent needs to move to a new zone
        const zone = getZone(targetZone, agents.length);
        if (zone) {
          const inZone =
            updated.pos.col >= zone.minCol && updated.pos.col <= zone.maxCol &&
            updated.pos.row >= zone.minRow && updated.pos.row <= zone.maxRow;

          if (!inZone && updated.path.length === 0) {
            // Calculate path to target zone
            const target = getRandomPointInZone(zone);
            const path = findPath(walkGridRef.current, updated.pos, target);
            if (path.length > 0) {
              updated.path = path;
              updated.transitioning = true;
            }
          }
        }

        // Move along path
        if (updated.path.length > 0) {
          const next = updated.path[0];
          const moveSpeed = Math.max(1, speed);

          // Simple step towards next grid position
          if (newTick % Math.max(1, Math.floor(4 / moveSpeed)) === 0) {
            // Update direction
            if (next.col > updated.pos.col) updated.direction = 'e';
            else if (next.col < updated.pos.col) updated.direction = 'w';
            else if (next.row > updated.pos.row) updated.direction = 's';
            else if (next.row < updated.pos.row) updated.direction = 'n';

            updated.pos = { ...next };
            updated.screenPos = gridToScreen(updated.pos);
            updated.path = updated.path.slice(1);

            // Walking animation
            updated.anim = newTick % 16 < 8 ? 'walk_frame1' : 'walk_frame2';
          }
        } else {
          // At destination — play behavior animation
          updated.transitioning = false;
          updated.anim = mapping.anim;

          // Spawn particles periodically
          if (mapping.particle) {
            const timerId = `${runtime.id}-particle`;
            const lastSpawn = particleTimerRef.current[timerId] ?? 0;
            if (newTick - lastSpawn > 60) {
              particleTimerRef.current[timerId] = newTick;
              const sp = gridToScreen(updated.pos);
              newParticles.push(
                createParticle(mapping.particle, sp.x, sp.y - 30),
              );
            }
          }

          // Show bubble occasionally
          if (mapping.bubble && newTick % 300 === (agents.indexOf(agents.find(a => a.id === runtime.id)!) * 50) % 300) {
            const sp = gridToScreen(updated.pos);
            newBubbles.push({
              text: mapping.bubble,
              ttl: 120,
              x: sp.x,
              y: sp.y - 40,
            });
          }
        }

        updated.currentState = behavior === 'coding' || behavior === 'debugging' ? 'coding' :
          behavior === 'thinking' ? 'thinking' :
          behavior === 'researching' ? 'researching' :
          behavior === 'meeting' ? 'meeting' :
          behavior === 'deploying' ? 'deploying' :
          'idle';

        newAgents.push(updated);
      }

      // Day-night cycle (very slow)
      const dayNightPhase = (Math.sin(newTick * 0.0005) + 1) / 2;

      // Owner animation changes
      const ownerAnim: CharacterAnim =
        newTick % 600 < 400 ? 'sit_typing' :
        newTick % 600 < 500 ? 'sit_idle' : 'drink_coffee';

      return {
        agents: newAgents,
        owner: { anim: ownerAnim },
        bubbles: newBubbles,
        particles: newParticles,
        tick: newTick,
        autoMode: prev.autoMode,
        autoTimer: prev.autoTimer,
        dayNightPhase,
      };
    });
  }, [agentStates, agents, speed]);

  return { officeState, tick: tickFn };
}
