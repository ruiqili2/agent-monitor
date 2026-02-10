// ============================================================================
// Isometric Coordinate System
// ============================================================================

import type { GridPos, ScreenPos } from '@/lib/types';

export const TILE_W = 48;
export const TILE_H = 24;
export const MAP_OFFSET_X = 500;
export const MAP_OFFSET_Y = 80;

export function gridToScreen(pos: GridPos): ScreenPos {
  return {
    x: MAP_OFFSET_X + (pos.col - pos.row) * (TILE_W / 2),
    y: MAP_OFFSET_Y + (pos.col + pos.row) * (TILE_H / 2),
  };
}

export function screenToGrid(screen: ScreenPos): GridPos {
  const sx = screen.x - MAP_OFFSET_X;
  const sy = screen.y - MAP_OFFSET_Y;
  return {
    col: Math.round((sx / (TILE_W / 2) + sy / (TILE_H / 2)) / 2),
    row: Math.round((sy / (TILE_H / 2) - sx / (TILE_W / 2)) / 2),
  };
}

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

  ctx.beginPath();
  ctx.moveTo(x, y - TILE_H / 2 - h);
  ctx.lineTo(x + TILE_W / 2, y - h);
  ctx.lineTo(x, y + TILE_H / 2 - h);
  ctx.lineTo(x - TILE_W / 2, y - h);
  ctx.closePath();
  ctx.fillStyle = topColor;
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(x - TILE_W / 2, y - h);
  ctx.lineTo(x, y + TILE_H / 2 - h);
  ctx.lineTo(x, y + TILE_H / 2);
  ctx.lineTo(x - TILE_W / 2, y);
  ctx.closePath();
  ctx.fillStyle = leftColor;
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(x + TILE_W / 2, y - h);
  ctx.lineTo(x, y + TILE_H / 2 - h);
  ctx.lineTo(x, y + TILE_H / 2);
  ctx.lineTo(x + TILE_W / 2, y);
  ctx.closePath();
  ctx.fillStyle = rightColor;
  ctx.fill();
}
