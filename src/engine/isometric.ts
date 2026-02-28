// ============================================================================
// Isometric Coordinate System - Optimized with Caching
// ============================================================================

import type { GridPos, ScreenPos } from '@/lib/types';

export const TILE_W = 48;
export const TILE_H = 24;
export const MAP_OFFSET_X = 500;
export const MAP_OFFSET_Y = 80;

// Pre-calculated screen positions cache
const screenPosCache = new Map<string, ScreenPos>();

function cacheKey(col: number, row: number): string {
  return `${col},${row}`;
}

/**
 * Convert grid position to screen coordinates with caching
 */
export function gridToScreen(pos: GridPos): ScreenPos {
  const key = cacheKey(pos.col, pos.row);
  const cached = screenPosCache.get(key);
  if (cached) return cached;

  const screen: ScreenPos = {
    x: MAP_OFFSET_X + (pos.col - pos.row) * (TILE_W / 2),
    y: MAP_OFFSET_Y + (pos.col + pos.row) * (TILE_H / 2),
  };
  
  screenPosCache.set(key, screen);
  return screen;
}

/**
 * Convert screen coordinates to grid position
 */
export function screenToGrid(screen: ScreenPos): GridPos {
  const sx = screen.x - MAP_OFFSET_X;
  const sy = screen.y - MAP_OFFSET_Y;
  return {
    col: Math.round((sx / (TILE_W / 2) + sy / (TILE_H / 2)) / 2),
    row: Math.round((sy / (TILE_H / 2) - sx / (TILE_W / 2)) / 2),
  };
}

/**
 * Get bounding box for an isometric tile at grid position
 */
export function getTileBounds(pos: GridPos): { x: number; y: number; width: number; height: number } {
  const { x, y } = gridToScreen(pos);
  return {
    x: x - TILE_W / 2,
    y: y - TILE_H / 2,
    width: TILE_W,
    height: TILE_H,
  };
}

/**
 * Get bounding box for a character at grid position
 */
export function getCharacterBounds(pos: GridPos): { x: number; y: number; width: number; height: number } {
  const { x, y } = gridToScreen(pos);
  return {
    x: x - 32,
    y: y - 64,
    width: 64,
    height: 80,
  };
}

/**
 * Draw an isometric tile at the given grid position
 */
export function drawIsometricTile(
  ctx: CanvasRenderingContext2D,
  pos: GridPos,
  fillColor: string,
  strokeColor?: string,
): void {
  const { x, y } = gridToScreen(pos);
  
  ctx.beginPath();
  ctx.moveTo(x, y - TILE_H / 2);
  ctx.lineTo(x + TILE_W / 2, y);
  ctx.lineTo(x, y + TILE_H / 2);
  ctx.lineTo(x - TILE_W / 2, y);
  ctx.closePath();
  
  ctx.fillStyle = fillColor;
  ctx.fill();
  
  if (strokeColor) {
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

/**
 * Draw an isometric block (3D cube) at the given grid position
 */
export function drawIsometricBlock(
  ctx: CanvasRenderingContext2D,
  pos: GridPos,
  height: number,
  topColor: string,
  leftColor: string,
  rightColor: string,
): void {
  const { x, y } = gridToScreen(pos);
  const h = height;

  // Top face
  ctx.beginPath();
  ctx.moveTo(x, y - TILE_H / 2 - h);
  ctx.lineTo(x + TILE_W / 2, y - h);
  ctx.lineTo(x, y + TILE_H / 2 - h);
  ctx.lineTo(x - TILE_W / 2, y - h);
  ctx.closePath();
  ctx.fillStyle = topColor;
  ctx.fill();

  // Left face
  ctx.beginPath();
  ctx.moveTo(x - TILE_W / 2, y - h);
  ctx.lineTo(x, y + TILE_H / 2 - h);
  ctx.lineTo(x, y + TILE_H / 2);
  ctx.lineTo(x - TILE_W / 2, y);
  ctx.closePath();
  ctx.fillStyle = leftColor;
  ctx.fill();

  // Right face
  ctx.beginPath();
  ctx.moveTo(x + TILE_W / 2, y - h);
  ctx.lineTo(x, y + TILE_H / 2 - h);
  ctx.lineTo(x, y + TILE_H / 2);
  ctx.lineTo(x + TILE_W / 2, y);
  ctx.closePath();
  ctx.fillStyle = rightColor;
  ctx.fill();
}

/**
 * Clear the screen position cache (call on resize)
 */
export function clearScreenPosCache(): void {
  screenPosCache.clear();
}

/**
 * Pre-populate cache for a rectangular region
 */
export function precomputeScreenPositions(startCol: number, startRow: number, cols: number, rows: number): void {
  for (let c = startCol; c < startCol + cols; c++) {
    for (let r = startRow; r < startRow + rows; r++) {
      gridToScreen({ col: c, row: r });
    }
  }
}
