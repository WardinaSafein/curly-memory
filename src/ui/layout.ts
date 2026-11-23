import type Phaser from 'phaser';

/**
 * Screen-anchored layout helpers. UI is positioned relative to the visible
 * game area (not hard-coded coordinates), so switching the scale mode to
 * EXPAND/RESIZE for responsive or touch layouts only touches this file.
 */
export interface ViewRect { x: number; y: number; width: number; height: number }

export function view(scene: Phaser.Scene): ViewRect {
  const { width, height } = scene.scale.gameSize;
  return { x: 0, y: 0, width, height };
}

export function anchor(scene: Phaser.Scene, where: 'top' | 'bottom' | 'center' | 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight', margin = 32): { x: number; y: number } {
  const v = view(scene);
  const left = v.x + margin, right = v.x + v.width - margin, top = v.y + margin, bottom = v.y + v.height - margin;
  const cx = v.x + v.width / 2, cy = v.y + v.height / 2;
  switch (where) {
    case 'top': return { x: cx, y: top };
    case 'bottom': return { x: cx, y: bottom };
    case 'center': return { x: cx, y: cy };
    case 'topLeft': return { x: left, y: top };
    case 'topRight': return { x: right, y: top };
    case 'bottomLeft': return { x: left, y: bottom };
    case 'bottomRight': return { x: right, y: bottom };
  }
}

/** Minimum comfortable hit target for future touch support (px in logical space). */
export const MIN_TOUCH_TARGET = 64;
