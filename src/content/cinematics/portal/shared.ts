import type Phaser from 'phaser';
import type { PerspectiveLid } from '../../../systems/fx/PerspectiveLid';

/** Layout of the laptop close-up shot (screen coordinates of the hinge centre and display scale). */
export const LAPTOP = { x: 960, y: 724, scale: 0.6, openAngle: 104 } as const;
/** Screen area inside laptop_lid_inner.png (see docs/ASSET_SPEC.md). */
export const SCREEN_RECT = { x: 40, y: 32, w: 1200, h: 720 } as const;
/** laptop_base.png has its hinge line 24px below the top edge. */
export const BASE_HINGE_OFFSET = 24;

export interface LaptopRig {
  group: Phaser.GameObjects.Container;
  lid: PerspectiveLid;
  /** Container aligned to the screen rect once the lid is open (1200x720 local units). */
  screen?: Phaser.GameObjects.Container;
}

/** World-space centre of the laptop screen. */
export function screenCentre(rig: LaptopRig): { x: number; y: number } {
  const r = rig.lid.lidRectToLocal(SCREEN_RECT.x, SCREEN_RECT.y, SCREEN_RECT.w, SCREEN_RECT.h);
  return { x: rig.group.x + (r.x + r.w / 2) * rig.group.scaleX, y: rig.group.y + (r.y + r.h / 2) * rig.group.scaleY };
}
