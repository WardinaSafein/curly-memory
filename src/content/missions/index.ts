import type { MissionDef } from '../../systems/defense/DefenseModel';
import { ch1Phishing } from './ch1_phishing';

export const MISSIONS: Record<string, MissionDef> = {
  [ch1Phishing.id]: ch1Phishing,
};

/**
 * Layout of each mission's map: the road the messages walk (spline points, traced on the painted
 * road) and the town gate. `gateImage` is only for maps whose building is not painted in.
 */
export const MISSION_MAPS: Record<string, { background: string; path: [number, number][]; gate: { x: number; y: number }; gateImage?: string; gateScale?: number }> = {
  ch1_phishing: {
    background: 'defense.map',
    path: [[-60, 765], [0, 760], [172, 718], [344, 612], [517, 552], [689, 535], [861, 568], [976, 648], [1091, 722], [1263, 768], [1435, 762], [1527, 705], [1590, 655], [1619, 628]],
    // the painted Post Office door (top step)
    gate: { x: 1625, y: 612 },
  },
};
