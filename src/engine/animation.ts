// ============================================================================
// Frame Animation System - Optimized with Frame Skipping
// ============================================================================

export interface AnimationDef {
  frameCount: number;
  speed: number;
  loop: boolean;
  priority?: 'high' | 'medium' | 'low';
}

export interface AnimationState {
  def: AnimationDef;
  currentFrame: number;
  tickCounter: number;
  finished: boolean;
  lastRenderTime: number;
  skipFrames: number;
}

/**
 * Create a new animation state
 */
export function createAnimation(def: AnimationDef): AnimationState {
  return {
    def,
    currentFrame: 0,
    tickCounter: 0,
    finished: false,
    lastRenderTime: 0,
    skipFrames: def.priority === 'low' ? 2 : def.priority === 'medium' ? 1 : 0,
  };
}

/**
 * Tick the animation state forward
 */
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

/**
 * Check if animation should render this frame (with frame skipping)
 */
export function shouldRenderAnimation(state: AnimationState, frameCount: number): boolean {
  if (state.skipFrames === 0) return true;
  return frameCount % (state.skipFrames + 1) === 0;
}

/**
 * Get animation frame with delta time for smoother rendering
 */
export function getAnimationFrame(
  state: AnimationState, 
  deltaTime: number
): { frame: number; needsRender: boolean } {
  const elapsed = deltaTime - state.lastRenderTime;
  const frameDuration = state.def.speed * 16.67; // Assuming 60fps base
  
  if (elapsed >= frameDuration || state.lastRenderTime === 0) {
    return { frame: state.currentFrame, needsRender: true };
  }
  
  return { frame: state.currentFrame, needsRender: false };
}

/**
 * Batch tick multiple animations efficiently
 */
export function tickAnimations(states: AnimationState[]): void {
  for (const state of states) {
    tickAnimation(state);
  }
}

/**
 * Reset animation to initial state
 */
export function resetAnimation(state: AnimationState): void {
  state.currentFrame = 0;
  state.tickCounter = 0;
  state.finished = false;
  state.lastRenderTime = 0;
}

// ============================================================================
// Pre-defined Animation Definitions with Priority
// ============================================================================

export const ANIMATIONS = {
  // Character animations (high priority - render every frame)
  walk: { frameCount: 2, speed: 8, loop: true, priority: 'high' } as AnimationDef,
  typing: { frameCount: 2, speed: 6, loop: true, priority: 'high' } as AnimationDef,
  idle: { frameCount: 1, speed: 1, loop: true, priority: 'high' } as AnimationDef,
  sleep: { frameCount: 2, speed: 20, loop: true, priority: 'medium' } as AnimationDef,
  blink: { frameCount: 2, speed: 30, loop: true, priority: 'medium' } as AnimationDef,
  coffee: { frameCount: 2, speed: 15, loop: true, priority: 'medium' } as AnimationDef,
  
  // Environmental animations (low priority - can skip frames)
  plant_sway: { frameCount: 2, speed: 25, loop: true, priority: 'low' } as AnimationDef,
  server_blink: { frameCount: 2, speed: 10, loop: true, priority: 'low' } as AnimationDef,
  clock: { frameCount: 60, speed: 60, loop: true, priority: 'low' } as AnimationDef,
} as const;

// ============================================================================
// Animation Manager for Parallel Execution
// ============================================================================

export class AnimationManager {
  private animations: Map<string, AnimationState> = new Map();
  private frameCount = 0;
  private lastTime = 0;

  /**
   * Register an animation with a unique ID
   */
  register(id: string, def: AnimationDef): AnimationState {
    const state = createAnimation(def);
    this.animations.set(id, state);
    return state;
  }

  /**
   * Unregister an animation
   */
  unregister(id: string): void {
    this.animations.delete(id);
  }

  /**
   * Get animation state by ID
   */
  get(id: string): AnimationState | undefined {
    return this.animations.get(id);
  }

  /**
   * Tick all registered animations
   */
  tickAll(): void {
    this.frameCount++;
    for (const state of this.animations.values()) {
      tickAnimation(state);
    }
  }

  /**
   * Tick only high-priority animations (for performance)
   */
  tickHighPriority(): void {
    this.frameCount++;
    for (const state of this.animations.values()) {
      if (state.def.priority === 'high' || state.def.priority === undefined) {
        tickAnimation(state);
      }
    }
  }

  /**
   * Tick with delta time for smoother animation
   */
  tickWithDelta(currentTime: number): void {
    const deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;
    
    // Adjust tick based on frame timing
    const expectedFrameTime = 16.67; // 60fps
    const frames = Math.floor(deltaTime / expectedFrameTime);
    
    for (let i = 0; i < Math.max(1, frames); i++) {
      this.tickAll();
    }
  }

  /**
   * Get all animations that need rendering this frame
   */
  getVisibleAnimations(): Map<string, AnimationState> {
    const visible = new Map<string, AnimationState>();
    
    for (const [id, state] of this.animations) {
      if (shouldRenderAnimation(state, this.frameCount)) {
        visible.set(id, state);
      }
    }
    
    return visible;
  }

  /**
   * Clear all animations
   */
  clear(): void {
    this.animations.clear();
    this.frameCount = 0;
  }

  /**
   * Get current frame count
   */
  getFrameCount(): number {
    return this.frameCount;
  }
}

// Global animation manager instance
export const globalAnimationManager = new AnimationManager();
