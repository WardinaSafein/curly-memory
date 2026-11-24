import type { MissionDef } from '../../systems/defense/DefenseModel';
import { ch1Phishing } from './ch1_phishing';

export const MISSIONS: Record<string, MissionDef> = {
  [ch1Phishing.id]: ch1Phishing,
};

/** Layout of each mission's map: the road the messages walk (spline points) and the town gate. */
export const MISSION_MAPS: Record<string, { background: string; path: [number, number][]; gate: { x: number; y: number }; gateImage: string; gateScale: number }> = {
  ch1_phishing: {
    background: 'defense.map',
    path: [[-60, 760], [300, 690], [560, 820], [860, 800], [1120, 720], [1400, 690], [1640, 740]],
    gate: { x: 1740, y: 800 },
    gateImage: 'defense.post_office',
    gateScale: 0.55,
  },
};
