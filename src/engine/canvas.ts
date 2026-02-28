// ============================================================================
// Canvas Rendering Engine - Optimized with Dirty Rectangles & Layer Caching
// ============================================================================

import type { OfficeState, AgentConfig, OwnerConfig, AgentAvatar, OwnerAvatar } from '@/lib/types';
import { drawIsometricTile, gridToScreen, TILE_W, TILE_H } from './isometric';
import { MAP_COLS, MAP_ROWS, getFloorColor, createWalkGrid, buildFurnitureLayout, buildZones } from '@/office/layout';
import { drawWalls, drawDividerWall, drawZoneLabel, drawBackground, drawNightOverlay } from '@/sprites/decorations';
import { drawFurniture } from '@/sprites/furniture';
import { drawAgent, drawOwner, drawNameTag } from '@/sprites/characters';
import { drawBubble, drawParticle } from '@/sprites/effects';

// ============================================================================
// Dirty Rectangle Tracking
// ============================================================================

interface DirtyRect {
  x: number;
  y: number;
  width: number;
  height: number;
  priority: 'high' | 'medium' | 'low';
}

interface RenderLayer {
  canvas: HTMLCanvasElement | null;
  ctx: CanvasRenderingContext2D | null;
  dirty: boolean;
  lastRender: number;
  frameSkip: number;
}

interface RenderConfig {
  agents: AgentConfig[];
  owner: OwnerConfig;
  connected: boolean;
  demoMode: boolean;
}

// ============================================================================
// Render Cache Manager - Off-screen Canvas Caching
// ============================================================================

class RenderCache {
  private layers: Map<string, RenderLayer> = new Map();
  private dirtyRects: DirtyRect[] = [];
  private frameCount = 0;
  private width = 0;
  private height = 0;

  constructor() {
    this.initLayer('background', 0);      // Static - never needs redraw
    this.initLayer('floor', 1);           // Semi-static - only on resize
    this.initLayer('furniture', 2);       // Low priority - frame skip every 3rd frame
    this.initLayer('characters', 0);      // High priority - every frame
    this.initLayer('effects', 0);         // High priority - every frame
    this.initLayer('ui', 0);              // High priority - every frame
  }

  private initLayer(name: string, frameSkip: number): void {
    this.layers.set(name, {
      canvas: null,
      ctx: null,
      dirty: true,
      lastRender: 0,
      frameSkip,
    });
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    
    for (const [name, layer] of this.layers) {
      if (typeof document !== 'undefined') {
        layer.canvas = document.createElement('canvas');
        layer.canvas.width = width;
        layer.canvas.height = height;
        layer.ctx = layer.canvas.getContext('2d');
      }
      layer.dirty = true;
    }
  }

  markDirty(rect: DirtyRect): void {
    this.dirtyRects.push(rect);
  }

  markAllDirty(): void {
    for (const layer of this.layers.values()) {
      layer.dirty = true;
    }
    this.dirtyRects = [{ x: 0, y: 0, width: this.width, height: this.height, priority: 'high' }];
  }

  shouldRenderLayer(name: string): boolean {
    const layer = this.layers.get(name);
    if (!layer) return true;

    // Always render if dirty
    if (layer.dirty) return true;

    // Frame skipping for low-priority layers
    if (layer.frameSkip > 0) {
      return this.frameCount % (layer.frameSkip + 1) === 0;
    }

    return true;
  }

  getLayer(name: string): RenderLayer | undefined {
    return this.layers.get(name);
  }

  getDirtyRects(): DirtyRect[] {
    return this.dirtyRects;
  }

  clearDirtyRects(): void {
    this.dirtyRects = [];
  }

  incrementFrame(): void {
    this.frameCount++;
  }

  getFrameCount(): number {
    return this.frameCount;
  }

  getWidth(): number {
    return this.width;
  }
}

// Global render cache instance
const renderCache = new RenderCache();

// ============================================================================
// Optimized Layer Rendering Functions
// ============================================================================

function renderBackgroundLayer(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  dayNightPhase: number,
): void {
  drawBackground(ctx, width, height, dayNightPhase);
}

function renderFloorLayer(
  ctx: CanvasRenderingContext2D,
  agentCount: number,
): void {
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

  drawWalls(ctx);
}

function renderFurnitureLayer(
  ctx: CanvasRenderingContext2D,
  agentCount: number,
  tick: number,
): void {
  const furniture = buildFurnitureLayout(agentCount);
  
  // Sort by depth for correct occlusion
  const sorted = [...furniture].sort((a, b) => (a.row + a.col) - (b.row + b.col));
  
  for (const item of sorted) {
    drawFurniture(ctx, item.type, item.col, item.row, tick);
  }
}

interface Drawable {
  depth: number;
  priority: 'high' | 'medium' | 'low';
  bounds: { x: number; y: number; width: number; height: number };
  draw: () => void;
}

function renderCharacterLayer(
  ctx: CanvasRenderingContext2D,
  state: OfficeState,
  config: RenderConfig,
): DirtyRect[] {
  const dirtyRects: DirtyRect[] = [];
  const drawables: Drawable[] = [];

  // Add agents
  for (const runtime of state.agents) {
    const agentCfg = config.agents.find(a => a.id === runtime.id);
    if (!agentCfg) continue;

    const sp = gridToScreen(runtime.pos);
    const bounds = { x: sp.x - 32, y: sp.y - 64, width: 64, height: 80 };

    drawables.push({
      depth: runtime.pos.row + runtime.pos.col,
      priority: 'high',
      bounds,
      draw: () => {
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

  // Add owner
  const ownerPos = { col: 14, row: 3 };
  const ownerSp = gridToScreen(ownerPos);
  const ownerBounds = { x: ownerSp.x - 32, y: ownerSp.y - 64, width: 64, height: 80 };

  drawables.push({
    depth: ownerPos.row + ownerPos.col,
    priority: 'high',
    bounds: ownerBounds,
    draw: () => {
      drawOwner(
        ctx, ownerSp.x, ownerSp.y,
        state.owner.anim,
        state.tick,
        config.owner.avatar as OwnerAvatar,
        config.owner.emoji,
      );
      drawNameTag(ctx, ownerSp.x, ownerSp.y + 2, config.owner.name, '#FFD700');
    },
  });

  // Sort by depth
  drawables.sort((a, b) => a.depth - b.depth);

  // Draw and track dirty rects
  for (const d of drawables) {
    d.draw();
    dirtyRects.push({
      ...d.bounds,
      priority: d.priority,
    });
  }

  return dirtyRects;
}

function renderZoneLabels(
  ctx: CanvasRenderingContext2D,
  agentCount: number,
  config: RenderConfig,
): void {
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
}

function renderEffectsLayer(
  ctx: CanvasRenderingContext2D,
  particles: OfficeState['particles'],
  bubbles: OfficeState['bubbles'],
): DirtyRect[] {
  const dirtyRects: DirtyRect[] = [];

  for (const particle of particles) {
    drawParticle(ctx, particle);
    // Particle bounds (approximate)
    dirtyRects.push({
      x: particle.x - 10,
      y: particle.y - 10,
      width: 20,
      height: 20,
      priority: 'medium',
    });
  }

  for (const bubble of bubbles) {
    drawBubble(ctx, bubble);
    // Bubble bounds (approximate)
    dirtyRects.push({
      x: bubble.x - 60,
      y: bubble.y - 40,
      width: 120,
      height: 80,
      priority: 'high',
    });
  }

  return dirtyRects;
}

function renderUILayer(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  state: OfficeState,
  config: RenderConfig,
): void {
  // Night overlay
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

// ============================================================================
// Main Render Function with Dirty Rectangle Optimization
// ============================================================================

export function renderFrame(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  state: OfficeState,
  config: RenderConfig,
): void {
  renderCache.incrementFrame();

  // Resize check - initialize off-screen canvases if needed
  if (renderCache.getWidth() !== width) {
    renderCache.resize(width, height);
  }

  const agentCount = config.agents.length;

  // Layer 1: Background (cached, only redraws on resize/phase change)
  const bgLayer = renderCache.getLayer('background');
  if (bgLayer?.dirty && bgLayer.ctx) {
    renderBackgroundLayer(bgLayer.ctx, width, height, state.dayNightPhase);
    bgLayer.dirty = false;
  }

  // Layer 2: Floor (cached)
  const floorLayer = renderCache.getLayer('floor');
  if (floorLayer?.dirty && floorLayer.ctx) {
    renderFloorLayer(floorLayer.ctx, agentCount);
    floorLayer.dirty = false;
  }

  // Composite cached layers to main canvas
  if (bgLayer?.canvas) {
    ctx.drawImage(bgLayer.canvas, 0, 0);
  }
  if (floorLayer?.canvas) {
    ctx.drawImage(floorLayer.canvas, 0, 0);
  }

  // Layer 3: Furniture (low priority, frame skip)
  const furnLayer = renderCache.getLayer('furniture');
  if (renderCache.shouldRenderLayer('furniture')) {
    if (furnLayer?.ctx) {
      furnLayer.ctx.clearRect(0, 0, width, height);
      renderFurnitureLayer(furnLayer.ctx, agentCount, state.tick);
    }
  }
  if (furnLayer?.canvas) {
    ctx.drawImage(furnLayer.canvas, 0, 0);
  }

  // Layer 4: Characters (high priority, every frame)
  const charDirtyRects = renderCharacterLayer(ctx, state, config);

  // Zone labels (render on top of characters)
  renderZoneLabels(ctx, agentCount, config);

  // Layer 5: Effects (high priority)
  const effectDirtyRects = renderEffectsLayer(ctx, state.particles, state.bubbles);

  // Layer 6: UI (high priority, every frame)
  renderUILayer(ctx, width, height, state, config);

  // Store dirty rects for next frame optimization
  renderCache.clearDirtyRects();
  for (const rect of [...charDirtyRects, ...effectDirtyRects]) {
    renderCache.markDirty(rect);
  }
}

// ============================================================================
// Export utilities for worker-based preparation
// ============================================================================

export function prepareRenderData(state: OfficeState, config: RenderConfig): {
  sortedDrawables: Array<{
    id: string;
    type: 'agent' | 'owner';
    depth: number;
    bounds: { x: number; y: number; width: number; height: number };
    pos: { col: number; row: number };
  }>;
  dirtyRects: DirtyRect[];
} {
  const drawables: Array<{
    id: string;
    type: 'agent' | 'owner';
    depth: number;
    bounds: { x: number; y: number; width: number; height: number };
    pos: { col: number; row: number };
  }> = [];
  const dirtyRects: DirtyRect[] = [];

  // Prepare agent drawables
  for (const runtime of state.agents) {
    const sp = gridToScreen(runtime.pos);
    const bounds = { x: sp.x - 32, y: sp.y - 64, width: 64, height: 80 };

    drawables.push({
      id: runtime.id,
      type: 'agent',
      depth: runtime.pos.row + runtime.pos.col,
      bounds,
      pos: runtime.pos,
    });

    dirtyRects.push({ ...bounds, priority: 'high' });
  }

  // Add owner
  const ownerPos = { col: 14, row: 3 };
  const ownerSp = gridToScreen(ownerPos);
  drawables.push({
    id: 'owner',
    type: 'owner',
    depth: ownerPos.row + ownerPos.col,
    bounds: { x: ownerSp.x - 32, y: ownerSp.y - 64, width: 64, height: 80 },
    pos: ownerPos,
  });

  // Sort by depth (can be done in worker)
  drawables.sort((a, b) => a.depth - b.depth);

  return { sortedDrawables: drawables, dirtyRects };
}

export function getRenderCache(): RenderCache {
  return renderCache;
}

// Force redraw of all layers (e.g., after theme change)
export function invalidateCache(): void {
  renderCache.markAllDirty();
}

export type { DirtyRect, RenderLayer, RenderConfig };
