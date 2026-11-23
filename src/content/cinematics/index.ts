import type { CinematicDef } from '../../systems/cinematics/Cinematic';
import { portalCinematic } from './portal';

export const CINEMATICS: Record<string, CinematicDef> = {
  [portalCinematic.id]: portalCinematic,
};
