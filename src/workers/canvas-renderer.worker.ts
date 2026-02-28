// ============================================================================
// Canvas Renderer Web Worker
// Offloads heavy canvas rendering calculations to a background thread
// ============================================================================

import type { GridPos, ScreenPos, Direction, CharacterAnim, Particle, Bubble } from '../lib/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface IsometricConfig {
  tileWidth: number;
  tileHeight: number;
  offsetX: number;
  offsetY: number;
}

export interface AgentPosition {
  id: string;
  gridPos: GridPos;
  screenPos: ScreenPos;
  direction: Direction;
  anim: CharacterAnim;
  depth: number;
}

export interface FurniturePosition {
  type: string;
  gridPos: GridPos;
  screenPos: ScreenPos;
  depth: number;
  variant?: number;
}

export interface RenderCalculation {
  agents: AgentPosition[];
  furniture: FurniturePosition[];
  particles: Particle[];
  bubbles: Bubble[];
  sortedDrawables: Drawable[];
  dayNightPhase: number;
}

export interface Drawable {
  type: 'agent' | 'furniture' | 'owner' | 'particle' | 'bubble';
  id: string;
  depth: number;
  data: Record<string, unknown>;
}

export interface CalcRenderPayload {
  agents: Array<{
    id: string;
    pos: GridPos;
    direction: Direction;
    anim: CharacterAnim;
  }>;
  furniture: Array<{
    type: string;
    col: number;
    row: number;
    variant?: number;
  }>;
  particles: Particle[];
  bubbles: Bubble[];
  tick: number;
  ownerPos: GridPos;
  ownerAnim: CharacterAnim;
}

// Worker message types
export type WorkerMessage =
  | { type: 'calcRender'; payload: CalcRenderPayload }
  | { type: 'updateConfig'; config: IsometricConfig };

export type WorkerResponse =
  | { type: 'renderResult'; result: RenderCalculation }
  | { type: 'error'; error: string; context: string };

// ---------------------------------------------------------------------------
// Isometric Calculations
// ---------------------------------------------------------------------------

let config: IsometricConfig = {
  tileWidth: 32,
  tileHeight: 16,
  offsetX: 400,
  offsetY: 100,
};

function gridToScreen(pos: GridPos): ScreenPos {
  return {
    x: config.offsetX + (pos.col - pos.row) * (config.tileWidth / 2),
    y: config.offsetY + (pos.col + pos.row) * (config.tileHeight / 2),
  };
}

// ---------------------------------------------------------------------------
// Render Calculation
// ---------------------------------------------------------------------------

function calculateRender(payload: CalcRenderPayload): RenderCalculation {
  const drawables: Drawable[] = [];
  const agentPositions: AgentPosition[] = [];
  const furniturePositions: FurniturePosition[] = [];

  // Calculate furniture positions
  for (const item of payload.furniture) {
    const gridPos = { col: item.col, row: item.row };
    const screenPos = gridToScreen(gridPos);
    const depth = gridPos.row + gridPos.col;

    furniturePositions.push({
      type: item.type,
      gridPos,
      screenPos,
      depth,
      variant: item.variant,
    });

    drawables.push({
      type: 'furniture',
      id: `furniture-${item.col}-${item.row}`,
      depth,
      data: {
        type: item.type,
        col: item.col,
        row: item.row,
        screenX: screenPos.x,
        screenY: screenPos.y,
        variant: item.variant,
        tick: payload.tick,
      },
    });
  }

  // Calculate agent positions
  for (const agent of payload.agents) {
    const screenPos = gridToScreen(agent.pos);
    const depth = agent.pos.row + agent.pos.col;

    agentPositions.push({
      id: agent.id,
      gridPos: agent.pos,
      screenPos,
      direction: agent.direction,
      anim: agent.anim,
      depth,
    });

    drawables.push({
      type: 'agent',
      id: agent.id,
      depth,
      data: {
        screenX: screenPos.x,
        screenY: screenPos.y,
        anim: agent.anim,
        direction: agent.direction,
        tick: payload.tick,
      },
    });
  }

  // Calculate owner position
  const ownerScreenPos = gridToScreen(payload.ownerPos);
  const ownerDepth = payload.ownerPos.row + payload.ownerPos.col;

  drawables.push({
    type: 'owner',
    id: 'owner',
    depth: ownerDepth,
    data: {
      screenX: ownerScreenPos.x,
      screenY: ownerScreenPos.y,
      anim: payload.ownerAnim,
      tick: payload.tick,
    },
  });

  // Add particles
  for (const particle of payload.particles) {
    drawables.push({
      type: 'particle',
      id: `particle-${particle.x}-${particle.y}-${particle.age}`,
      depth: 1000,
      data: { ...particle },
    });
  }

  // Add bubbles
  for (const bubble of payload.bubbles) {
    drawables.push({
      type: 'bubble',
      id: `bubble-${bubble.x}-${bubble.y}-${bubble.ttl}`,
      depth: 1001,
      data: { ...bubble },
    });
  }

  // Sort by depth for correct render order
  drawables.sort((a, b) => a.depth - b.depth);

  // Calculate day-night phase
  const dayNightPhase = (Math.sin(payload.tick * 0.0005) + 1) / 2;

  return {
    agents: agentPositions,
    furniture: furniturePositions,
    particles: payload.particles,
    bubbles: payload.bubbles,
    sortedDrawables: drawables,
    dayNightPhase,
  };
}

// ---------------------------------------------------------------------------
// Path Calculation (for agent movement)
// ---------------------------------------------------------------------------

export interface PathNode {
  col: number;
  row: number;
  g: number;
  h: number;
  f: number;
  parent: PathNode | null;
}

function heuristic(a: GridPos, b: GridPos): number {
  return Math.abs(a.col - b.col) + Math.abs(a.row - b.row);
}

export function calculatePath(
  start: GridPos,
  end: GridPos,
  walkable: boolean[][],
): GridPos[] {
  const rows = walkable.length;
  const cols = walkable[0]?.length ?? 0;

  const openSet: PathNode[] = [];
  const closedSet = new Set<string>();

  const startNode: PathNode = {
    col: start.col,
    row: start.row,
    g: 0,
    h: heuristic(start, end),
    f: heuristic(start, end),
    parent: null,
  };

  openSet.push(startNode);

  const directions = [
    { col: 0, row: -1 },
    { col: 0, row: 1 },
    { col: -1, row: 0 },
    { col: 1, row: 0 },
  ];

  while (openSet.length > 0) {
    openSet.sort((a, b) => a.f - b.f);
    const current = openSet.shift()!;

    if (current.col === end.col && current.row === end.row) {
      const path: GridPos[] = [];
      let node: PathNode | null = current;
      while (node) {
        path.unshift({ col: node.col, row: node.row });
        node = node.parent;
      }
      return path.slice(1);
    }

    closedSet.add(`${current.col},${current.row}`);

    for (const dir of directions) {
      const neighborCol = current.col + dir.col;
      const neighborRow = current.row + dir.row;

      if (neighborCol < 0 || neighborCol >= cols || neighborRow < 0 || neighborRow >= rows) {
        continue;
      }

      if (!walkable[neighborRow]?.[neighborCol]) {
        continue;
      }

      if (closedSet.has(`${neighborCol},${neighborRow}`)) {
        continue;
      }

      const g = current.g + 1;
      const h = heuristic({ col: neighborCol, row: neighborRow }, end);
      const f = g + h;

      const existing = openSet.find(
        (n) => n.col === neighborCol && n.row === neighborRow,
      );

      if (existing) {
        if (g < existing.g) {
          existing.g = g;
          existing.f = f;
          existing.parent = current;
        }
      } else {
        openSet.push({
          col: neighborCol,
          row: neighborRow,
          g,
          h,
          f,
          parent: current,
        });
      }
    }

    if (closedSet.size > 1000) {
      break;
    }
  }

  return [];
}

// ---------------------------------------------------------------------------
// Message Handler
// ---------------------------------------------------------------------------

self.onmessage = (event: MessageEvent<WorkerMessage>) => {
  const msg = event.data;

  try {
    switch (msg.type) {
      case 'calcRender': {
        const result = calculateRender(msg.payload);
        postMessage({ type: 'renderResult', result });
        break;
      }

      case 'updateConfig': {
        config = { ...config, ...msg.config };
        break;
      }
    }
  } catch (err) {
    postMessage({
      type: 'error',
      error: String(err),
      context: 'Render calculation failed',
    });
  }
};

export type CanvasRendererWorker = typeof self;
