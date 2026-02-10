// ============================================================================
// Office Layout — Map dimensions, furniture placement, floor colors, walk grid
// ============================================================================

import type { FurnitureItem, Zone, ZoneId, TileType } from '@/lib/types';
import { ZONES_TEMPLATE, buildZoneMap } from './zones';

// ---------------------------------------------------------------------------
// Map Dimensions
// ---------------------------------------------------------------------------

export const MAP_COLS = 24;
export const MAP_ROWS = 20;

// ---------------------------------------------------------------------------
// Floor color helper
// ---------------------------------------------------------------------------

export function getFloorColor(col: number, row: number): string {
  // Checkerboard pattern with zone-based tinting
  const base = (col + row) % 2 === 0 ? '#D7CCC8' : '#CFBFB5';

  // Boss office area — darker wood
  if (col >= 12 && col <= 16 && row >= 1 && row <= 4) {
    return (col + row) % 2 === 0 ? '#A1887F' : '#8D6E63';
  }
  // Meeting room — blue tint
  if (col >= 12 && col <= 16 && row >= 6 && row <= 9) {
    return (col + row) % 2 === 0 ? '#B3C5D7' : '#A4B8CC';
  }
  // Break room — warm tint
  if (col >= 18 && col <= 22 && row >= 1 && row <= 5) {
    return (col + row) % 2 === 0 ? '#E8D5B7' : '#DDC9AB';
  }
  // Lounge — purple tint
  if (col >= 18 && col <= 22 && row >= 12 && row <= 16) {
    return (col + row) % 2 === 0 ? '#D1C4E9' : '#C5B6DF';
  }
  // Server room — dark
  if (col >= 18 && col <= 22 && row >= 7 && row <= 10) {
    return (col + row) % 2 === 0 ? '#455A64' : '#37474F';
  }

  return base;
}

// ---------------------------------------------------------------------------
// Furniture layout builder
// ---------------------------------------------------------------------------

export function buildFurnitureLayout(agentCount: number): FurnitureItem[] {
  const items: FurnitureItem[] = [];

  // --- Agent desks (up to 6) ---
  const deskPositions = [
    { col: 3, row: 3 },
    { col: 3, row: 6 },
    { col: 3, row: 9 },
    { col: 7, row: 3 },
    { col: 7, row: 6 },
    { col: 7, row: 9 },
  ];
  const chairPositions = [
    { col: 4, row: 3 },
    { col: 4, row: 6 },
    { col: 4, row: 9 },
    { col: 8, row: 3 },
    { col: 8, row: 6 },
    { col: 8, row: 9 },
  ];

  for (let i = 0; i < Math.min(agentCount, 6); i++) {
    items.push({ type: 'desk', ...deskPositions[i] });
    items.push({ type: 'chair', ...chairPositions[i] });
  }

  // --- Boss office ---
  items.push({ type: 'big_desk', col: 14, row: 2 });
  items.push({ type: 'chair', col: 14, row: 3 });
  items.push({ type: 'floor_window', col: 13, row: 1 });
  items.push({ type: 'potted_plant', col: 16, row: 1 });

  // --- Meeting room ---
  items.push({ type: 'long_table', col: 14, row: 7 });
  items.push({ type: 'meeting_chair', col: 13, row: 7 });
  items.push({ type: 'meeting_chair', col: 15, row: 7 });
  items.push({ type: 'meeting_chair', col: 14, row: 6 });
  items.push({ type: 'meeting_chair', col: 14, row: 8 });
  items.push({ type: 'whiteboard_obj', col: 16, row: 6 });

  // --- Break room ---
  items.push({ type: 'coffee_machine', col: 20, row: 2 });
  items.push({ type: 'snack_shelf', col: 22, row: 2 });
  items.push({ type: 'water_cooler', col: 20, row: 4 });
  items.push({ type: 'small_table', col: 21, row: 3 });
  items.push({ type: 'round_table', col: 19, row: 4 });

  // --- Whiteboard zone ---
  items.push({ type: 'whiteboard_obj', col: 10, row: 12 });

  // --- Library ---
  items.push({ type: 'bookshelf', col: 10, row: 14 });
  items.push({ type: 'bookshelf', col: 10, row: 16 });
  items.push({ type: 'reading_chair', col: 11, row: 15 });

  // --- Lounge ---
  items.push({ type: 'sofa', col: 20, row: 13 });
  items.push({ type: 'coffee_table', col: 20, row: 14 });
  items.push({ type: 'potted_plant', col: 22, row: 12 });
  items.push({ type: 'carpet', col: 20, row: 14 });
  items.push({ type: 'carpet', col: 21, row: 14 });
  items.push({ type: 'carpet', col: 20, row: 15 });
  items.push({ type: 'carpet', col: 21, row: 15 });

  // --- Server room ---
  items.push({ type: 'server_rack', col: 19, row: 8 });
  items.push({ type: 'server_rack', col: 21, row: 8 });
  items.push({ type: 'server_rack', col: 19, row: 10 });

  // --- Entrance ---
  items.push({ type: 'door_mat', col: 1, row: 18 });
  items.push({ type: 'potted_plant', col: 2, row: 17 });

  // --- Decorations scattered ---
  items.push({ type: 'wall_clock', col: 6, row: 1 });
  items.push({ type: 'poster', col: 10, row: 1 });
  items.push({ type: 'potted_plant', col: 10, row: 3 });
  items.push({ type: 'potted_plant', col: 10, row: 9 });

  // Floor windows along top
  items.push({ type: 'floor_window', col: 3, row: 1 });
  items.push({ type: 'floor_window', col: 7, row: 1 });

  return items;
}

// ---------------------------------------------------------------------------
// Walk grid (pathfinding)
// ---------------------------------------------------------------------------

export function createWalkGrid(agentCount: number): TileType[][] {
  const grid: TileType[][] = [];
  for (let r = 0; r < MAP_ROWS; r++) {
    grid[r] = [];
    for (let c = 0; c < MAP_COLS; c++) {
      // Outer walls
      if (r === 0 || c === 0 || r === MAP_ROWS - 1 || c === MAP_COLS - 1) {
        grid[r][c] = 'wall';
      } else {
        grid[r][c] = 'floor';
      }
    }
  }

  // Internal walls — boss office partition
  for (let r = 1; r <= 5; r++) {
    grid[r][11] = 'wall';
  }
  grid[5][12] = 'door'; // door into boss office
  grid[5][13] = 'door';

  // Meeting room partition
  for (let c = 12; c <= 16; c++) {
    grid[5][c] = c === 13 ? 'door' : 'wall';
    grid[10][c] = c === 14 ? 'door' : 'wall';
  }
  for (let r = 5; r <= 10; r++) {
    if (r === 7 || r === 8) continue; // door on side
    grid[r][17] = 'wall';
  }

  // Break room partition
  for (let r = 1; r <= 5; r++) {
    grid[r][17] = r === 3 ? 'door' : 'wall';
  }

  // Server room partition
  for (let c = 18; c <= 22; c++) {
    grid[6][c] = c === 20 ? 'door' : 'wall';
    grid[11][c] = c === 20 ? 'door' : 'wall';
  }

  // Lounge partition
  for (let c = 18; c <= 22; c++) {
    grid[11][c] = c === 20 ? 'door' : 'wall';
  }

  // Mark furniture tiles
  const furniture = buildFurnitureLayout(agentCount);
  for (const item of furniture) {
    if (item.type !== 'carpet' && item.type !== 'door_mat') {
      if (grid[item.row]?.[item.col] === 'floor') {
        grid[item.row][item.col] = 'furniture';
      }
    }
  }

  return grid;
}

// ---------------------------------------------------------------------------
// Zone builder (re-export from zones.ts for convenience)
// ---------------------------------------------------------------------------

export function buildZones(agentCount: number): Record<ZoneId, Zone> {
  return buildZoneMap(agentCount);
}
