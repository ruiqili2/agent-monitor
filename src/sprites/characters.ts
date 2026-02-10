// ============================================================================
// Generic Character Sprite System
// ============================================================================

import type { CharacterAnim, Direction, AgentAvatar, OwnerAvatar } from '@/lib/types';

interface CharPalette {
  skin: string;
  skinShadow: string;
  hair: string;
  hairLight: string;
  top: string;
  topLight: string;
  accent: string;
  accentFrame: string;
  pants: string;
  shoes: string;
  eyes: string;
}

const BASE_SKIN = '#FFDAB9';
const BASE_SKIN_SHADOW = '#E8C4A0';

function agentPalette(avatar: AgentAvatar, color: string): CharPalette {
  switch (avatar) {
    case 'glasses':
      return {
        skin: BASE_SKIN, skinShadow: BASE_SKIN_SHADOW,
        hair: '#2D1B00', hairLight: '#4A2F10',
        top: '#2D2D3D', topLight: '#3D3D4D',
        accent: color, accentFrame: '#333333',
        pants: '#37474F', shoes: '#5D4037', eyes: '#333333',
      };
    case 'hoodie':
      return {
        skin: BASE_SKIN, skinShadow: BASE_SKIN_SHADOW,
        hair: '#1A1A1A', hairLight: '#333333',
        top: color, topLight: lighten(color, 20),
        accent: '#FFFFFF', accentFrame: '#CCCCCC',
        pants: '#37474F', shoes: '#424242', eyes: '#333333',
      };
    case 'suit':
      return {
        skin: BASE_SKIN, skinShadow: BASE_SKIN_SHADOW,
        hair: '#3E2723', hairLight: '#5D4037',
        top: '#263238', topLight: '#37474F',
        accent: color, accentFrame: color,
        pants: '#1A237E', shoes: '#3E2723', eyes: '#333333',
      };
    case 'casual':
      return {
        skin: BASE_SKIN, skinShadow: BASE_SKIN_SHADOW,
        hair: '#6D4C41', hairLight: '#8D6E63',
        top: color, topLight: lighten(color, 25),
        accent: '#FFFFFF', accentFrame: '#E0E0E0',
        pants: '#455A64', shoes: '#795548', eyes: '#333333',
      };
    case 'robot':
      return {
        skin: '#B0BEC5', skinShadow: '#90A4AE',
        hair: '#546E7A', hairLight: '#78909C',
        top: '#455A64', topLight: '#607D8B',
        accent: color, accentFrame: color,
        pants: '#37474F', shoes: '#263238', eyes: color,
      };
    case 'cat':
      return {
        skin: '#FFE0B2', skinShadow: '#FFD180',
        hair: '#FF8A65', hairLight: '#FFAB91',
        top: color, topLight: lighten(color, 20),
        accent: '#FF7043', accentFrame: '#E64A19',
        pants: '#5D4037', shoes: '#4E342E', eyes: '#333333',
      };
    case 'dog':
      return {
        skin: '#D7CCC8', skinShadow: '#BCAAA4',
        hair: '#795548', hairLight: '#8D6E63',
        top: color, topLight: lighten(color, 20),
        accent: '#3E2723', accentFrame: '#4E342E',
        pants: '#455A64', shoes: '#37474F', eyes: '#333333',
      };
  }
}

function ownerPalette(avatar: OwnerAvatar): CharPalette {
  switch (avatar) {
    case 'boss':
      return {
        skin: BASE_SKIN, skinShadow: BASE_SKIN_SHADOW,
        hair: '#4A2800', hairLight: '#6B3A00',
        top: '#5C6BC0', topLight: '#7986CB',
        accent: '#FFFFFF', accentFrame: '#E0E0E0',
        pants: '#37474F', shoes: '#795548', eyes: '#333333',
      };
    case 'casual':
      return {
        skin: BASE_SKIN, skinShadow: BASE_SKIN_SHADOW,
        hair: '#5D4037', hairLight: '#795548',
        top: '#43A047', topLight: '#66BB6A',
        accent: '#FFFFFF', accentFrame: '#E0E0E0',
        pants: '#455A64', shoes: '#6D4C41', eyes: '#333333',
      };
    case 'creative':
      return {
        skin: BASE_SKIN, skinShadow: BASE_SKIN_SHADOW,
        hair: '#880E4F', hairLight: '#AD1457',
        top: '#FF6F00', topLight: '#FFA000',
        accent: '#FFFFFF', accentFrame: '#FFE0B2',
        pants: '#37474F', shoes: '#4E342E', eyes: '#333333',
      };
  }
}

function px(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  color: string,
  scale: number, ox: number, oy: number,
): void {
  ctx.fillStyle = color;
  ctx.fillRect(ox + x * scale, oy + y * scale, scale, scale);
}

function lighten(hex: string, pct: number): string {
  const n = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, ((n >> 16) & 0xff) + pct);
  const g = Math.min(255, ((n >> 8) & 0xff) + pct);
  const b = Math.min(255, (n & 0xff) + pct);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

function drawCharacter(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  anim: CharacterAnim,
  direction: Direction,
  tick: number,
  palette: CharPalette,
  emoji: string,
  hasGlasses: boolean,
  hasPonytail: boolean,
): void {
  const scale = 2;
  const ox = x - 12;
  const oy = y - 36;

  ctx.save();

  if (direction === 'w') {
    ctx.translate(x, 0);
    ctx.scale(-1, 1);
    ctx.translate(-x, 0);
  }

  const frame = Math.floor(tick / 8) % 2;

  ctx.font = '12px monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#FFFFFF';
  ctx.save();
  if (direction === 'w') {
    ctx.translate(x, 0);
    ctx.scale(-1, 1);
    ctx.translate(-x, 0);
  }
  ctx.fillText(emoji, x, oy + 2);
  ctx.restore();

  // Hair
  for (let i = 3; i <= 8; i++) px(ctx, i, 2, palette.hair, scale, ox, oy);
  for (let i = 2; i <= 9; i++) px(ctx, i, 3, palette.hair, scale, ox, oy);

  if (hasPonytail) {
    px(ctx, 9, 4, palette.hairLight, scale, ox, oy);
    px(ctx, 10, 4, palette.hairLight, scale, ox, oy);
    px(ctx, 10, 5, palette.hairLight, scale, ox, oy);
  }

  // Head/face
  for (let i = 3; i <= 8; i++) px(ctx, i, 4, palette.skin, scale, ox, oy);
  for (let i = 3; i <= 8; i++) px(ctx, i, 5, palette.skin, scale, ox, oy);
  for (let i = 3; i <= 8; i++) px(ctx, i, 6, palette.skin, scale, ox, oy);
  for (let i = 4; i <= 7; i++) px(ctx, i, 7, palette.skin, scale, ox, oy);

  if (hasGlasses) {
    px(ctx, 4, 5, palette.accentFrame, scale, ox, oy);
    px(ctx, 5, 5, palette.accent, scale, ox, oy);
    px(ctx, 6, 5, palette.accentFrame, scale, ox, oy);
    px(ctx, 7, 5, palette.accent, scale, ox, oy);
    px(ctx, 8, 5, palette.accentFrame, scale, ox, oy);
  }

  // Eyes
  if (tick % 120 < 115) {
    px(ctx, 5, 5, palette.eyes, scale, ox, oy);
    px(ctx, 7, 5, palette.eyes, scale, ox, oy);
  } else {
    px(ctx, 5, 5, palette.skinShadow, scale, ox, oy);
    px(ctx, 7, 5, palette.skinShadow, scale, ox, oy);
  }

  // Mouth
  px(ctx, 5, 7, palette.skinShadow, scale, ox, oy);
  px(ctx, 6, 7, palette.skinShadow, scale, ox, oy);

  drawBody(ctx, anim, frame, palette, scale, ox, oy);

  ctx.restore();
}

function drawBody(
  ctx: CanvasRenderingContext2D,
  anim: CharacterAnim,
  frame: number,
  p: CharPalette,
  scale: number, ox: number, oy: number,
): void {
  if (anim === 'sit_typing' || anim === 'sit_idle') {
    for (let row = 8; row <= 11; row++) {
      for (let i = 3; i <= 8; i++) {
        px(ctx, i, row, row === 8 ? p.topLight : p.top, scale, ox, oy);
      }
    }
    px(ctx, 5, 10, p.topLight, scale, ox, oy);
    px(ctx, 6, 10, p.topLight, scale, ox, oy);

    if (anim === 'sit_typing') {
      const armOff = frame;
      px(ctx, 2, 9 + armOff, p.top, scale, ox, oy);
      px(ctx, 1, 10, p.skin, scale, ox, oy);
      px(ctx, 9, 9 + armOff, p.top, scale, ox, oy);
      px(ctx, 10, 10, p.skin, scale, ox, oy);
    } else {
      px(ctx, 2, 9, p.top, scale, ox, oy);
      px(ctx, 2, 10, p.skin, scale, ox, oy);
      px(ctx, 9, 9, p.top, scale, ox, oy);
      px(ctx, 9, 10, p.skin, scale, ox, oy);
    }
    for (let i = 3; i <= 8; i++) px(ctx, i, 12, p.pants, scale, ox, oy);
    px(ctx, 3, 13, p.shoes, scale, ox, oy);
    px(ctx, 4, 13, p.shoes, scale, ox, oy);
    px(ctx, 7, 13, p.shoes, scale, ox, oy);
    px(ctx, 8, 13, p.shoes, scale, ox, oy);

  } else if (anim === 'sleep') {
    for (let row = 8; row <= 10; row++) {
      for (let i = 2; i <= 9; i++) {
        px(ctx, i, row, p.top, scale, ox, oy);
      }
    }

  } else if (anim === 'walk_frame1' || anim === 'walk_frame2') {
    for (let row = 8; row <= 12; row++) {
      for (let i = 3; i <= 8; i++) {
        px(ctx, i, row, row === 8 ? p.topLight : p.top, scale, ox, oy);
      }
    }
    if (anim === 'walk_frame1') {
      px(ctx, 2, 9, p.top, scale, ox, oy);
      px(ctx, 2, 10, p.skin, scale, ox, oy);
      px(ctx, 9, 10, p.top, scale, ox, oy);
      px(ctx, 9, 11, p.skin, scale, ox, oy);
      px(ctx, 4, 13, p.pants, scale, ox, oy);
      px(ctx, 4, 14, p.shoes, scale, ox, oy);
      px(ctx, 7, 13, p.pants, scale, ox, oy);
      px(ctx, 8, 14, p.shoes, scale, ox, oy);
    } else {
      px(ctx, 2, 10, p.top, scale, ox, oy);
      px(ctx, 2, 11, p.skin, scale, ox, oy);
      px(ctx, 9, 9, p.top, scale, ox, oy);
      px(ctx, 9, 10, p.skin, scale, ox, oy);
      px(ctx, 3, 13, p.pants, scale, ox, oy);
      px(ctx, 3, 14, p.shoes, scale, ox, oy);
      px(ctx, 7, 13, p.pants, scale, ox, oy);
      px(ctx, 7, 14, p.shoes, scale, ox, oy);
    }

  } else if (anim === 'drink_coffee') {
    for (let row = 8; row <= 12; row++) {
      for (let i = 3; i <= 8; i++) {
        px(ctx, i, row, row === 8 ? p.topLight : p.top, scale, ox, oy);
      }
    }
    px(ctx, 2, 9, p.top, scale, ox, oy);
    px(ctx, 2, 10, p.skin, scale, ox, oy);
    px(ctx, 9, 8, p.top, scale, ox, oy);
    px(ctx, 9, 7, p.skin, scale, ox, oy);
    px(ctx, 10, 7, '#8B6914', scale, ox, oy);
    px(ctx, 10, 6, '#8B6914', scale, ox, oy);
    if (frame === 0) {
      px(ctx, 10, 5, '#FFFFFF80', scale, ox, oy);
      px(ctx, 11, 4, '#FFFFFF60', scale, ox, oy);
    } else {
      px(ctx, 11, 5, '#FFFFFF80', scale, ox, oy);
      px(ctx, 10, 4, '#FFFFFF60', scale, ox, oy);
    }
    drawStandingLegs(ctx, p, scale, ox, oy);

  } else if (anim === 'raise_hand') {
    for (let row = 8; row <= 12; row++) {
      for (let i = 3; i <= 8; i++) {
        px(ctx, i, row, row === 8 ? p.topLight : p.top, scale, ox, oy);
      }
    }
    px(ctx, 2, 9, p.top, scale, ox, oy);
    px(ctx, 2, 10, p.skin, scale, ox, oy);
    px(ctx, 9, 8, p.top, scale, ox, oy);
    px(ctx, 9, 7, p.top, scale, ox, oy);
    px(ctx, 9, 6, p.skin, scale, ox, oy);
    drawStandingLegs(ctx, p, scale, ox, oy);

  } else if (anim === 'headphones') {
    px(ctx, 2, 3, '#FF5722', scale, ox, oy);
    px(ctx, 3, 2, '#FF5722', scale, ox, oy);
    px(ctx, 8, 2, '#FF5722', scale, ox, oy);
    px(ctx, 9, 3, '#FF5722', scale, ox, oy);
    px(ctx, 2, 4, '#FF5722', scale, ox, oy);
    px(ctx, 2, 5, '#FF5722', scale, ox, oy);
    px(ctx, 9, 4, '#FF5722', scale, ox, oy);
    px(ctx, 9, 5, '#FF5722', scale, ox, oy);
    for (let row = 8; row <= 12; row++) {
      for (let i = 3; i <= 8; i++) {
        px(ctx, i, row, row === 8 ? p.topLight : p.top, scale, ox, oy);
      }
    }
    px(ctx, 2, 9, p.top, scale, ox, oy);
    px(ctx, 2, 10, p.skin, scale, ox, oy);
    px(ctx, 9, 9, p.top, scale, ox, oy);
    px(ctx, 9, 10, p.skin, scale, ox, oy);
    drawStandingLegs(ctx, p, scale, ox, oy);

  } else if (anim === 'thumbs_up') {
    for (let row = 8; row <= 12; row++) {
      for (let i = 3; i <= 8; i++) {
        if (i >= 5 && i <= 6 && row >= 9) {
          px(ctx, i, row, p.accent, scale, ox, oy);
        } else {
          px(ctx, i, row, row === 8 ? p.topLight : p.top, scale, ox, oy);
        }
      }
    }
    px(ctx, 2, 9, p.top, scale, ox, oy);
    px(ctx, 2, 10, p.skin, scale, ox, oy);
    px(ctx, 9, 8, p.top, scale, ox, oy);
    px(ctx, 9, 7, p.skin, scale, ox, oy);
    px(ctx, 9, 6, '#FFD700', scale, ox, oy);
    drawStandingLegs(ctx, p, scale, ox, oy);

  } else if (anim === 'hand_task') {
    for (let row = 8; row <= 12; row++) {
      for (let i = 3; i <= 8; i++) {
        if (i >= 5 && i <= 6 && row >= 9) {
          px(ctx, i, row, p.accent, scale, ox, oy);
        } else {
          px(ctx, i, row, row === 8 ? p.topLight : p.top, scale, ox, oy);
        }
      }
    }
    px(ctx, 2, 9, p.top, scale, ox, oy);
    px(ctx, 2, 10, p.skin, scale, ox, oy);
    px(ctx, 9, 9, p.top, scale, ox, oy);
    px(ctx, 10, 9, p.skin, scale, ox, oy);
    px(ctx, 11, 8, '#FFFFFF', scale, ox, oy);
    px(ctx, 11, 9, '#FFFFFF', scale, ox, oy);
    px(ctx, 12, 8, '#FFFFFF', scale, ox, oy);
    px(ctx, 12, 9, '#FFFFFF', scale, ox, oy);
    drawStandingLegs(ctx, p, scale, ox, oy);

  } else if (anim === 'run') {
    for (let row = 8; row <= 12; row++) {
      for (let i = 3; i <= 8; i++) {
        px(ctx, i, row, row === 8 ? p.topLight : p.top, scale, ox, oy);
      }
    }
    // Running arms
    px(ctx, 1, 9, p.top, scale, ox, oy);
    px(ctx, 1, 10, p.skin, scale, ox, oy);
    px(ctx, 10, 8, p.top, scale, ox, oy);
    px(ctx, 10, 9, p.skin, scale, ox, oy);
    // Running legs (wider stance)
    px(ctx, 3, 13, p.pants, scale, ox, oy);
    px(ctx, 2, 14, p.shoes, scale, ox, oy);
    px(ctx, 8, 13, p.pants, scale, ox, oy);
    px(ctx, 9, 14, p.shoes, scale, ox, oy);

  } else {
    // Default standing pose
    for (let row = 8; row <= 12; row++) {
      for (let i = 3; i <= 8; i++) {
        px(ctx, i, row, row === 8 ? p.topLight : p.top, scale, ox, oy);
      }
    }
    px(ctx, 5, 10, p.topLight, scale, ox, oy);
    px(ctx, 6, 10, p.topLight, scale, ox, oy);
    px(ctx, 2, 9, p.top, scale, ox, oy);
    px(ctx, 2, 10, p.skin, scale, ox, oy);
    px(ctx, 9, 9, p.top, scale, ox, oy);
    px(ctx, 9, 10, p.skin, scale, ox, oy);
    drawStandingLegs(ctx, p, scale, ox, oy);
  }
}

function drawStandingLegs(
  ctx: CanvasRenderingContext2D,
  p: CharPalette,
  scale: number, ox: number, oy: number,
): void {
  for (let i = 4; i <= 7; i++) px(ctx, i, 13, p.pants, scale, ox, oy);
  px(ctx, 4, 14, p.shoes, scale, ox, oy);
  px(ctx, 5, 14, p.shoes, scale, ox, oy);
  px(ctx, 6, 14, p.shoes, scale, ox, oy);
  px(ctx, 7, 14, p.shoes, scale, ox, oy);
}

export function drawAgent(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  anim: CharacterAnim,
  direction: Direction,
  tick: number,
  avatar: AgentAvatar,
  color: string,
  emoji: string,
): void {
  const pal = agentPalette(avatar, color);
  drawCharacter(ctx, x, y, anim, direction, tick, pal, emoji, avatar === 'glasses', false);
}

export function drawOwner(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  anim: CharacterAnim,
  tick: number,
  avatar: OwnerAvatar,
  emoji: string,
): void {
  const pal = ownerPalette(avatar);
  drawCharacter(ctx, x, y, anim, 's', tick, pal, emoji, false, avatar === 'boss');
}

export function drawNameTag(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  name: string,
  color: string,
): void {
  ctx.save();
  ctx.font = 'bold 9px monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = color;
  ctx.fillText(name, x, y + 4);
  ctx.restore();
}
