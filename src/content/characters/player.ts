import type Phaser from 'phaser';
import { services } from '../../core/Services';
import type { ClipLibrary } from '../../systems/rig/Animation';
import { CutoutRig } from '../../systems/rig/CutoutRig';
import type { RigDef } from '../../systems/rig/RigDefinition';
import anims from './player.anims.json';
import rig from './player.rig.json';

export const playerRig = rig as unknown as RigDef;
// The JSON carries a "$comment" key; strip it so only clips remain.
export const playerClips: ClipLibrary = Object.fromEntries(Object.entries(anims).filter(([k]) => !k.startsWith('$'))) as unknown as ClipLibrary;

/** Create the player character with the appearance saved in GameState. */
export function createPlayer(scene: Phaser.Scene, x: number, y: number, scale: number, facing: 'left' | 'right' = 'right'): CutoutRig {
  return new CutoutRig(scene, x, y, {
    rig: playerRig,
    clips: playerClips,
    appearance: services.state.appearance,
    assets: services.assets,
    scale,
    facing,
  });
}
