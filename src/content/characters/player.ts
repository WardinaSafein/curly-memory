import type Phaser from 'phaser';
import { services } from '../../core/Services';
import type { ClipLibrary } from '../../systems/rig/Animation';
import { StillCharacter, type StillCharacterDef } from '../../systems/character/StillCharacter';
import { CutoutRig } from '../../systems/rig/CutoutRig';
import type { RigDef } from '../../systems/rig/RigDefinition';
import anims from './player.anims.json';
import rig from './player.rig.json';

export const playerRig = rig as unknown as RigDef;
// The JSON carries a "$comment" key; strip it so only clips remain.
export const playerClips: ClipLibrary = Object.fromEntries(Object.entries(anims).filter(([k]) => !k.startsWith('$'))) as unknown as ClipLibrary;

/**
 * The player as whole pictures (approved direction). Both outfits share one canvas:
 * the upper bodies line up within 1px; the boots stand ~18px taller than the socks.
 */
export const playerStill: StillCharacterDef = {
  outfits: {
    boots: { key: 'player.still.boots', anchor: [512, 1512] },
    socks: { key: 'player.still.socks', anchor: [512, 1495] },
  },
  // At scale 1 the old rig stood ~1250 px (hair to sole); the picture is ~1492 px. Keeps every scene's scale valid.
  pictureScale: 1250 / 1492,
  heightPx: 1492,
  walkSpeed: playerRig.walkSpeed,
  stepMs: 540,
};

/** Create the player character. */
export function createPlayer(scene: Phaser.Scene, x: number, y: number, scale: number, facing: 'left' | 'right' = 'right', outfit: string = 'boots'): StillCharacter {
  return new StillCharacter(scene, x, y, { def: playerStill, assets: services.assets, scale, outfit, facing });
}

/** The old cutout rig, kept for the Rig Lab. */
export function createPlayerRig(scene: Phaser.Scene, x: number, y: number, scale: number, facing: 'left' | 'right' = 'right'): CutoutRig {
  return new CutoutRig(scene, x, y, {
    rig: playerRig,
    clips: playerClips,
    appearance: services.state.appearance,
    assets: services.assets,
    scale,
    facing,
  });
}
