// ============================================================================
// A* Pathfinding on the isometric grid
// ============================================================================

import type { GridPos, TileType } from '@/lib/types';

export type WalkGrid = TileType[][];

interface AStarNode {
  col: number;
  row: number;
  g: number;
  h: number;
  f: number;
  parent: AStarNode | null;
}

function heuristic(a: GridPos, b: GridPos): number {
  return Math.abs(a.col - b.col) + Math.abs(a.row - b.row);
}

function nodeKey(col: number, row: number): string {
  return `${col},${row}`;
}

const DIRECTIONS = [
  { col: 0, row: -1 },
  { col: 0, row: 1 },
  { col: -1, row: 0 },
  { col: 1, row: 0 },
];

export function findPath(
  grid: WalkGrid,
  start: GridPos,
  end: GridPos,
): GridPos[] {
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;

  if (
    end.row < 0 || end.row >= rows ||
    end.col < 0 || end.col >= cols
  ) {
    return [];
  }

  const endBlocked = grid[end.row]?.[end.col] === 'wall';
  if (endBlocked) return [];

  const open: AStarNode[] = [];
  const closed = new Set<string>();

  const startNode: AStarNode = {
    col: start.col,
    row: start.row,
    g: 0,
    h: heuristic(start, end),
    f: 0,
    parent: null,
  };
  startNode.f = startNode.g + startNode.h;
  open.push(startNode);

  while (open.length > 0) {
    let lowestIdx = 0;
    for (let i = 1; i < open.length; i++) {
      if (open[i].f < open[lowestIdx].f) {
        lowestIdx = i;
      }
    }
    const current = open.splice(lowestIdx, 1)[0];

    if (current.col === end.col && current.row === end.row) {
      const path: GridPos[] = [];
      let node: AStarNode | null = current;
      while (node && !(node.col === start.col && node.row === start.row)) {
        path.unshift({ col: node.col, row: node.row });
        node = node.parent;
      }
      return path;
    }

    closed.add(nodeKey(current.col, current.row));

    for (const dir of DIRECTIONS) {
      const nc = current.col + dir.col;
      const nr = current.row + dir.row;

      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
      if (closed.has(nodeKey(nc, nr))) continue;

      const tile = grid[nr]?.[nc];
      const isTarget = nc === end.col && nr === end.row;
      if (tile === 'wall') continue;
      if (tile === 'furniture' && !isTarget) continue;

      const g = current.g + 1;
      const h = heuristic({ col: nc, row: nr }, end);
      const f = g + h;

      const existingIdx = open.findIndex(n => n.col === nc && n.row === nr);
      if (existingIdx !== -1) {
        if (open[existingIdx].f <= f) continue;
        open.splice(existingIdx, 1);
      }

      open.push({ col: nc, row: nr, g, h, f, parent: current });
    }
  }

  return [];
}
