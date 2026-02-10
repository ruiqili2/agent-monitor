// ============================================================================
// OfficeCanvas — Main canvas rendering the full office scene
// ============================================================================

'use client';

import { useRef, useEffect } from 'react';
import type { OfficeState, AgentConfig, OwnerConfig } from '@/lib/types';
import { renderFrame } from '@/engine/canvas';

interface OfficeCanvasProps {
  officeState: OfficeState;
  agents: AgentConfig[];
  owner: OwnerConfig;
  onTick: () => void;
  /** Internal canvas resolution width */
  width?: number;
  /** Internal canvas resolution height */
  height?: number;
  /** CSS display width (if different from canvas resolution) */
  displayWidth?: number;
  /** CSS display height (if different from canvas resolution) */
  displayHeight?: number;
  className?: string;
  scale?: number;
  demoMode?: boolean;
  connected?: boolean;
}

export default function OfficeCanvasInner({
  officeState,
  agents,
  owner,
  onTick,
  width = 1100,
  height = 620,
  displayWidth,
  displayHeight,
  className = '',
  scale = 1,
  demoMode = true,
  connected = false,
}: OfficeCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  // Store latest props in refs so the animation loop always sees current values
  const propsRef = useRef({ officeState, agents, owner, connected, demoMode, onTick, width, height, scale });
  useEffect(() => {
    propsRef.current = { officeState, agents, owner, connected, demoMode, onTick, width, height, scale };
  });

  useEffect(() => {
    const render = (timestamp: number) => {
      const { officeState: os, agents: ag, owner: ow, connected: cn, demoMode: dm, onTick: ot, width: w, height: h, scale: sc } = propsRef.current;
      if (timestamp - lastTimeRef.current >= 1000 / 30) {
        lastTimeRef.current = timestamp;
        ot();

        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.save();
        if (sc !== 1) {
          ctx.scale(sc, sc);
        }

        renderFrame(ctx, w, h, os, {
          agents: ag,
          owner: ow,
          connected: cn,
          demoMode: dm,
        });

        ctx.restore();
      }

      animRef.current = requestAnimationFrame(render);
    };

    animRef.current = requestAnimationFrame(render);
    return () => {
      if (animRef.current) {
        cancelAnimationFrame(animRef.current);
      }
    };
  }, []);

  const cssWidth = displayWidth ?? width;
  const cssHeight = displayHeight ?? height;

  return (
    <canvas
      ref={canvasRef}
      width={Math.round(width * scale)}
      height={Math.round(height * scale)}
      className={`rounded-xl ${className}`}
      style={{
        width: cssWidth,
        height: cssHeight,
        maxWidth: '100%',
        imageRendering: 'pixelated',
        backgroundColor: '#0a0a0f',
      }}
    />
  );
}
