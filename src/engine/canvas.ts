// ============================================================================
// Canvas Rendering Engine - Multi-agent office scene
// ============================================================================

import type { OfficeState, AgentConfig, OwnerConfig, AgentAvatar, OwnerAvatar } from '@/lib/types';
import { drawIsometricTile, gridToScreen } from './isometric';
import { MAP_COLS, MAP_ROWS, getFloorColor, createWalkGrid, buildFurnitureLayout, buildZones } from '@/office/layout';
import { drawWalls, drawDividerWall, drawZoneLabel, drawBackground, drawNightOverlay } from '@/sprites/decorations';
import { drawFurniture } from '@/sprites/furniture';
import { drawAgent, drawOwner, drawNameTag } from '@/sprites/characters';
import { drawBubble, drawParticle } from '@/sprites/effects';

interface RenderConfig {
  agents: AgentConfig[];
  owner: OwnerConfig;
  connected: boolean;
  demoMode: boolean;
}

export function renderFrame(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  state: OfficeState,
  config: RenderConfig,
): void {
  ctx.clearRect(0, 0, width, height);

  const agentCount = config.agents.length;

  drawBackground(ctx, width, height, state.dayNightPhase);
  drawWalls(ctx);

  const walkGrid = createWalkGrid(agentCount);

  for (let row = 0; row < MAP_ROWS; row++) {
    for (let col = 0; col < MAP_COLS; col++) {
      const tile = walkGrid[row]?.[col];
      if (tile === 'wall') {
        if (row > 0 && row < MAP_ROWS - 1 && col > 0 && col < MAP_COLS - 1) {
          drawDividerWall(ctx, col, row);
        }
        continue;
      }
      const color = getFloorColor(col, row);
      drawIsometricTile(ctx, { col, row }, color, '#B0956E40');
    }
  }

  interface Drawable {
    depth: number;
    draw: () => void;
  }
  const drawables: Drawable[] = [];

  const furniture = buildFurnitureLayout(agentCount);
  for (const item of furniture) {
    drawables.push({
      depth: item.row + item.col,
      draw: () => drawFurniture(ctx, item.type, item.col, item.row, state.tick),
    });
  }

  for (const runtime of state.agents) {
    const agentCfg = config.agents.find(a => a.id === runtime.id);
    if (!agentCfg) continue;
    drawables.push({
      depth: runtime.pos.row + runtime.pos.col,
      draw: () => {
        const sp = gridToScreen(runtime.pos);
        drawAgent(
          ctx, sp.x, sp.y,
          runtime.anim,
          runtime.direction,
          state.tick,
          agentCfg.avatar as AgentAvatar,
          agentCfg.color,
          agentCfg.emoji,
        );
        drawNameTag(ctx, sp.x, sp.y + 2, agentCfg.name, agentCfg.color);
      },
    });
  }

  const ownerPos = { col: 14, row: 3 };
  drawables.push({
    depth: ownerPos.row + ownerPos.col,
    draw: () => {
      const sp = gridToScreen(ownerPos);
      drawOwner(
        ctx, sp.x, sp.y,
        state.owner.anim,
        state.tick,
        config.owner.avatar as OwnerAvatar,
        config.owner.emoji,
      );
      drawNameTag(ctx, sp.x, sp.y + 2, config.owner.name, '#FFD700');
    },
  });

  drawables.sort((a, b) => a.depth - b.depth);
  for (const d of drawables) d.draw();

  const zones = buildZones(agentCount);
  for (const zone of Object.values(zones)) {
    if (zone.id.startsWith('desk_')) {
      const idx = parseInt(zone.id.replace('desk_', ''), 10);
      const agentCfg = config.agents[idx];
      if (agentCfg) {
        drawZoneLabel(ctx, `${agentCfg.name}'s Desk`, agentCfg.emoji, zone.center.col, zone.center.row, 0.5);
        continue;
      }
    }
    drawZoneLabel(ctx, zone.label, zone.emoji, zone.center.col, zone.center.row, 0.5);
  }

  for (const particle of state.particles) drawParticle(ctx, particle);
  for (const bubble of state.bubbles) drawBubble(ctx, bubble);

  drawNightOverlay(ctx, width, height, state.dayNightPhase);

  // Title
  ctx.save();
  ctx.font = 'bold 14px monospace';
  ctx.fillStyle = state.dayNightPhase > 0.5 ? '#FFE0B2' : '#5D4037';
  ctx.textAlign = 'left';
  ctx.fillText('🏢 AI Office', 16, 24);
  ctx.restore();

  // Connection status
  ctx.save();
  ctx.font = '10px monospace';
  ctx.textAlign = 'right';
  if (config.connected) {
    ctx.fillStyle = '#4CAF50';
    ctx.fillText('● Connected', width - 16, 24);
  } else if (config.demoMode) {
    ctx.fillStyle = '#FF9800';
    ctx.fillText('● Demo Mode', width - 16, 24);
  } else {
    ctx.fillStyle = '#F44336';
    ctx.fillText('● Disconnected', width - 16, 24);
  }
  ctx.restore();
}
