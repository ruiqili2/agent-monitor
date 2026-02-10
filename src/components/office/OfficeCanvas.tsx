// ============================================================================
// OfficeCanvas — Main canvas rendering the full office scene
// ============================================================================

'use client';

import { useRef, useEffect, useCallback } from 'react';
import type { OfficeState, AgentConfig, OwnerConfig, AgentDashboardState, ThemeName } from '@/lib/types';
import { renderFrame } from '@/engine/canvas';

interface OfficeCanvasProps {
  officeState: OfficeState;
  agents: AgentConfig[];
  owner: OwnerConfig;
  onTick: () => void;
  width?: number;
  height?: number;
  className?: string;
  scale?: number;
  onAgentClick?: (agentId: string) => void;
}

// Wrapper props for pages that don't manage their own officeState
interface OfficeCanvasWrapperProps {
  agents: AgentConfig[];
  agentStates: Record<string, AgentDashboardState>;
  ownerConfig: OwnerConfig;
  theme: ThemeName;
  onAgentClick?: (agentId: string) => void;
}

function OfficeCanvasInner({
  officeState,
  agents,
  owner,
  onTick,
  width = 1000,
  height = 600,
  className = '',
  scale = 1,
}: OfficeCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  const render = useCallback((timestamp: number) => {
    if (timestamp - lastTimeRef.current >= 1000 / 30) {
      lastTimeRef.current = timestamp;
      onTick();

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.save();
      if (scale !== 1) {
        ctx.scale(scale, scale);
      }

      renderFrame(ctx, width, height, officeState, {
        agents,
        owner,
        connected: true,
        demoMode: true,
      });

      ctx.restore();
    }

    animRef.current = requestAnimationFrame(render);
  }, [officeState, agents, owner, onTick, width, height, scale]);

  useEffect(() => {
    animRef.current = requestAnimationFrame(render);
    return () => {
      if (animRef.current) {
        cancelAnimationFrame(animRef.current);
      }
    };
  }, [render]);

  return (
    <canvas
      ref={canvasRef}
      width={Math.round(width * scale)}
      height={Math.round(height * scale)}
      className={`rounded-xl ${className}`}
      style={{
        width,
        height,
        imageRendering: 'pixelated',
        backgroundColor: '#0a0a0f',
      }}
    />
  );
}

export default OfficeCanvasInner;

// Re-export the wrapper for full-screen office page
export function OfficeCanvasFullScreen({ agents, agentStates, ownerConfig, theme, onAgentClick }: OfficeCanvasWrapperProps) {
  const { useOffice } = require('@/hooks/useOffice');
  const { officeState, tick } = useOffice(agents, agentStates);
  return (
    <OfficeCanvasInner
      officeState={officeState}
      agents={agents}
      owner={ownerConfig}
      onTick={tick}
      width={1200}
      height={700}
    />
  );
}
