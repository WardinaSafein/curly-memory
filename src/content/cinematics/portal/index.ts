import type { CinematicDef } from '../../../systems/cinematics/Cinematic';
import { bootScreen } from './bootScreen';
import { dataTunnel } from './dataTunnel';
import { laptopOpen } from './laptopOpen';
import { mysteryMessage } from './mysteryMessage';
import { portalPull } from './portalPull';
import { screenGlitch } from './screenGlitch';

/**
 * The laptop portal cinematic. Each beat is its own module: reorder, remove or
 * swap beats here (e.g. replace `dataTunnel` with a hand-animated version)
 * without touching the others.
 */
export const portalCinematic: CinematicDef = {
  id: 'portal',
  beats: [laptopOpen, bootScreen, mysteryMessage, screenGlitch, portalPull, dataTunnel],
  then: { type: 'goto', scene: 'cybertown', entry: 'portal' },
};
