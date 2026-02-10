// ============================================================================
// Frame Animation System
// ============================================================================

export interface AnimationDef {
  frameCount: number;
  speed: number;
  loop: boolean;
}

export interface AnimationState {
  def: AnimationDef;
  currentFrame: number;
  tickCounter: number;
  finished: boolean;
}

export function createAnimation(def: AnimationDef): AnimationState {
  return {
    def,
    currentFrame: 0,
    tickCounter: 0,
    finished: false,
  };
}

export function tickAnimation(state: AnimationState): void {
  if (state.finished) return;
  state.tickCounter++;
  if (state.tickCounter >= state.def.speed) {
    state.tickCounter = 0;
    state.currentFrame++;
    if (state.currentFrame >= state.def.frameCount) {
      if (state.def.loop) {
        state.currentFrame = 0;
      } else {
        state.currentFrame = state.def.frameCount - 1;
        state.finished = true;
      }
    }
  }
}

export const ANIMATIONS = {
  walk: { frameCount: 2, speed: 8, loop: true } as AnimationDef,
  typing: { frameCount: 2, speed: 6, loop: true } as AnimationDef,
  idle: { frameCount: 1, speed: 1, loop: true } as AnimationDef,
  sleep: { frameCount: 2, speed: 20, loop: true } as AnimationDef,
  blink: { frameCount: 2, speed: 30, loop: true } as AnimationDef,
  coffee: { frameCount: 2, speed: 15, loop: true } as AnimationDef,
  plant_sway: { frameCount: 2, speed: 25, loop: true } as AnimationDef,
  server_blink: { frameCount: 2, speed: 10, loop: true } as AnimationDef,
  clock: { frameCount: 60, speed: 60, loop: true } as AnimationDef,
} as const;
