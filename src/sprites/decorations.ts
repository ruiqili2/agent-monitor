// ============================================================================
// Decoration Sprites — Walls, backgrounds, zone labels, night overlay
// ============================================================================

import { gridToScreen, TILE_W, TILE_H } from '@/engine/isometric';
import { MAP_COLS, MAP_ROWS } from '@/office/layout';

// ---------------------------------------------------------------------------
// Background / Sky
// ---------------------------------------------------------------------------

export function drawBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  dayNightPhase: number,
): void {
  // Gradient sky
  const grad = ctx.createLinearGradient(0, 0, 0, height);
  if (dayNightPhase < 0.3) {
    // Day
    grad.addColorStop(0, '#87CEEB');
    grad.addColorStop(1, '#E0F7FA');
  } else if (dayNightPhase < 0.6) {
    // Sunset
    grad.addColorStop(0, '#FF8A65');
    grad.addColorStop(0.4, '#FFB74D');
    grad.addColorStop(1, '#FFCC80');
  } else {
    // Night
    grad.addColorStop(0, '#0D1B2A');
    grad.addColorStop(0.5, '#1B2838');
    grad.addColorStop(1, '#1A1A2E');
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // Stars at night
  if (dayNightPhase > 0.5) {
    const alpha = Math.min(1, (dayNightPhase - 0.5) * 2);
    ctx.fillStyle = `rgba(255,255,255,${alpha * 0.6})`;
    const stars = [
      [50, 20], [150, 35], [280, 15], [400, 40], [550, 25],
      [700, 30], [100, 55], [350, 50], [500, 45], [650, 55],
      [200, 60], [450, 20], [600, 50],
    ];
    for (const [sx, sy] of stars) {
      ctx.fillRect(sx, sy, 2, 2);
    }
  }
}

// ---------------------------------------------------------------------------
// Walls
// ---------------------------------------------------------------------------

export function drawWalls(ctx: CanvasRenderingContext2D): void {
  // Draw outer wall base along the top & left edges of the map
  ctx.strokeStyle = '#5D4037';
  ctx.lineWidth = 2;

  // Top-left wall edge
  const topLeft = gridToScreen({ col: 0, row: 0 });
  const topRight = gridToScreen({ col: MAP_COLS - 1, row: 0 });
  const bottomLeft = gridToScreen({ col: 0, row: MAP_ROWS - 1 });

  ctx.beginPath();
  ctx.moveTo(bottomLeft.x - TILE_W / 2, bottomLeft.y);
  ctx.lineTo(topLeft.x, topLeft.y - TILE_H / 2);
  ctx.lineTo(topRight.x + TILE_W / 2, topRight.y);
  ctx.stroke();
}

export function drawDividerWall(
  ctx: CanvasRenderingContext2D,
  col: number,
  row: number,
): void {
  const { x, y } = gridToScreen({ col, row });
  const wallH = 18;

  // Top surface
  ctx.fillStyle = '#8D6E63';
  ctx.beginPath();
  ctx.moveTo(x, y - TILE_H / 2 - wallH);
  ctx.lineTo(x + TILE_W / 2, y - wallH);
  ctx.lineTo(x, y + TILE_H / 2 - wallH);
  ctx.lineTo(x - TILE_W / 2, y - wallH);
  ctx.closePath();
  ctx.fill();

  // Left face
  ctx.fillStyle = '#6D4C41';
  ctx.beginPath();
  ctx.moveTo(x - TILE_W / 2, y - wallH);
  ctx.lineTo(x, y + TILE_H / 2 - wallH);
  ctx.lineTo(x, y + TILE_H / 2);
  ctx.lineTo(x - TILE_W / 2, y);
  ctx.closePath();
  ctx.fill();

  // Right face
  ctx.fillStyle = '#5D4037';
  ctx.beginPath();
  ctx.moveTo(x + TILE_W / 2, y - wallH);
  ctx.lineTo(x, y + TILE_H / 2 - wallH);
  ctx.lineTo(x, y + TILE_H / 2);
  ctx.lineTo(x + TILE_W / 2, y);
  ctx.closePath();
  ctx.fill();
}

// ---------------------------------------------------------------------------
// Zone Labels
// ---------------------------------------------------------------------------

export function drawZoneLabel(
  ctx: CanvasRenderingContext2D,
  label: string,
  emoji: string,
  col: number,
  row: number,
  alpha: number,
): void {
  const { x, y } = gridToScreen({ col, row });
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = '8px monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#FFFFFF80';
  ctx.fillText(`${emoji} ${label}`, x, y + TILE_H + 4);
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Night Overlay
// ---------------------------------------------------------------------------

export function drawNightOverlay(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  dayNightPhase: number,
): void {
  if (dayNightPhase <= 0.3) return;
  const alpha = Math.min(0.35, (dayNightPhase - 0.3) * 0.5);
  ctx.fillStyle = `rgba(10, 10, 30, ${alpha})`;
  ctx.fillRect(0, 0, width, height);
}
