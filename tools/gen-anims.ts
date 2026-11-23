/**
 * Generates the player's animation clips (src/content/characters/player.anims.json) from
 * smooth parametric curves, so the motion can be tuned with a handful of numbers instead of
 * hand-typed keyframes.
 *
 *   npm run rig:anims
 *
 * - All clips use spline interpolation (motion flows through keys instead of stopping at them).
 * - Walk: real gait timing (~58 % stance / 42 % swing), knee flex on landing, heel-to-toe roll,
 *   arms that trail the shoulders (follow-through), torso sway and head counter-motion, hair and
 *   jacket hem lagging behind the bob. The pelvis bob is fitted so the planted foot stays on the
 *   ground, then smoothed for a softer step. The walk speed is matched to the stride.
 * - Idle: breathing, slow weight shift and head drift, hair and hem drifting behind.
 * - Surprise: anticipation dip, hop with overshoot, landing compression and settle; hair and hem
 *   whip and settle (follow-through).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { sampleClip, type AnimationClip, type Channel, type Key } from '../src/systems/rig/Animation';
import type { RigDef } from '../src/systems/rig/RigDefinition';
import { Skeleton } from '../src/systems/rig/Skeleton';

const DIR = join(import.meta.dirname, '..', 'src', 'content', 'characters');
const rigPath = join(DIR, 'player.rig.json');
const animPath = join(DIR, 'player.anims.json');
const rig = JSON.parse(readFileSync(rigPath, 'utf8')) as RigDef;

const TAU = Math.PI * 2;
const r2 = (v: number): number => Math.round(v * 100) / 100;
/** Wrap a phase to [0, 1). */
const wrap = (p: number): number => ((p % 1) + 1) % 1;
/** Periodic bump centred at c with width w (wraps around the cycle). */
const bump = (p: number, c: number, w: number): number => {
  const d = Math.min(Math.abs(p - c), 1 - Math.abs(p - c));
  return Math.exp(-(d * d) / (2 * w * w));
};

type Tracks = Record<string, Partial<Record<Channel, Key[]>>>;

function track(tracks: Tracks, bone: string, ch: Channel, times: number[], fn: (t: number) => number): void {
  (tracks[bone] ??= {})[ch] = times.map((t) => [Math.round(t), r2(fn(t))] as Key);
}

// ------------------------------------------------------------------ walk

const WALK_MS = 1080;            // a little slower than before = softer, less hurried step
const WALK_KEYS = 24;
const STANCE = 0.58;

/** Thigh swing for one leg: slow backwards in stance, quicker forwards in swing. */
function thigh(p: number, centre: number, amp: number): number {
  if (p < STANCE) {
    // stance: mostly constant speed (the planted foot must move backwards at the body's speed,
    // or it slides), with only softly eased ends
    const u = p / STANCE;
    const s = (1 - STANCE_EASE) * u + STANCE_EASE * (0.5 - 0.5 * Math.cos(Math.PI * u));
    return centre - amp + 2 * amp * s;
  }
  return centre + amp * Math.cos(Math.PI * ((p - STANCE) / (1 - STANCE)));
}
const STANCE_EASE = 0.3;
/** Knee bend (shin relative to thigh): small flex on landing, big flex mid-swing. */
const knee = (p: number): number => 3 + 6 * bump(p, 0.1, 0.06) + 44 * bump(p, 0.73, 0.12);
/** Foot angle in the world: toe up at heel strike, flat in stance, heel-off roll, toe down in swing. */
const footWorld = (p: number): number => -9 * bump(p, 0.0, 0.05) + 20 * bump(p, 0.58, 0.07) + 9 * bump(p, 0.7, 0.07) - 6 * bump(p, 0.95, 0.04);

function buildWalk(): AnimationClip {
  const times = Array.from({ length: WALK_KEYS + 1 }, (_, i) => (i / WALK_KEYS) * WALK_MS);
  const ph = (t: number, offset = 0): number => wrap(t / WALK_MS + offset);
  const tracks: Tracks = {};
  const legs: [string, string, string, number, number][] = [
    ['thigh_front', 'shin_front', 'foot_front', 0, -10],
    ['thigh_back', 'shin_back', 'foot_back', 0.5, 0],
  ];
  for (const [th, sh, ft, off, centre] of legs) {
    track(tracks, th, 'rot', times, (t) => thigh(ph(t, off), centre, 17));
    track(tracks, sh, 'rot', times, (t) => knee(ph(t, off)));
    // foot relative angle = desired world angle minus the leg's accumulated rotation
    track(tracks, ft, 'rot', times, (t) => footWorld(ph(t, off)) - thigh(ph(t, off), centre, 17) - knee(ph(t, off)));
  }
  // arms swing against the legs; each segment trails the one above it (follow-through)
  track(tracks, 'upperarm_front', 'rot', times, (t) => 12 * Math.cos(TAU * (t / WALK_MS - 0.06)));
  track(tracks, 'forearm_front', 'rot', times, (t) => -9 + 8 * Math.cos(TAU * (t / WALK_MS - 0.13)));
  track(tracks, 'hand_front', 'rot', times, (t) => 5 * Math.cos(TAU * (t / WALK_MS - 0.19)));
  track(tracks, 'upperarm_back', 'rot', times, (t) => -12 * Math.cos(TAU * (t / WALK_MS - 0.06)));
  track(tracks, 'forearm_back', 'rot', times, (t) => -9 - 8 * Math.cos(TAU * (t / WALK_MS - 0.13)));
  track(tracks, 'hand_back', 'rot', times, (t) => -5 * Math.cos(TAU * (t / WALK_MS - 0.19)));
  // torso: forward lean, a small dip-linked rock, and a side-to-side weight shift over the hips
  track(tracks, 'torso', 'rot', times, (t) => 3 + 1.1 * Math.sin(2 * TAU * (t / WALK_MS - 0.08)));
  track(tracks, 'torso', 'x', times, (t) => 2.5 * Math.sin(TAU * (t / WALK_MS - 0.1)));
  // head counters the torso so the gaze stays steady
  track(tracks, 'head', 'rot', times, (t) => -2 - 0.8 * Math.sin(2 * TAU * (t / WALK_MS - 0.14)));
  // follow-through: hair and hem lag the bob and sway
  track(tracks, 'hair_back', 'rot', times, (t) => 2.4 * Math.sin(2 * TAU * (t / WALK_MS - 0.2)));
  track(tracks, 'hair_front', 'rot', times, (t) => 1.6 * Math.sin(2 * TAU * (t / WALK_MS - 0.17)));
  track(tracks, 'hem', 'rot', times, (t) => 1.3 * Math.sin(TAU * (t / WALK_MS - 0.18)));
  track(tracks, 'hem', 'y', times, (t) => 1.5 * Math.sin(2 * TAU * (t / WALK_MS - 0.22)));

  const clip: AnimationClip = { duration: WALK_MS, loop: true, interp: 'spline', bones: tracks };
  fitPelvis(clip, times);
  return clip;
}

/** Pelvis bob that keeps the lower foot on its ground line, lightly smoothed for a softer step. */
function fitPelvis(clip: AnimationClip, times: number[]): void {
  const sk = new Skeleton(rig);
  const ry = rig.bones[0].pivot[1];
  const raw = times.map((t) => {
    sk.update(sampleClip({ ...clip, bones: { ...clip.bones, pelvis: {} } }, t >= clip.duration ? clip.duration - 0.001 : t).bones);
    const gaps = Object.entries(rig.contacts ?? {}).map(([bone, c]) => Math.max(...c.points.map((p) => sk.canvasToRig(bone, p)[1] + ry)) - c.groundY);
    return -Math.max(...gaps);
  });
  // 3-tap smoothing on the loop (soft weight transfer), first/last key identical
  const n = raw.length - 1;
  const smooth = raw.slice(0, n).map((_, i) => 0.25 * raw[(i - 1 + n) % n] + 0.5 * raw[i] + 0.25 * raw[(i + 1) % n]);
  smooth.push(smooth[0]);
  (clip.bones!.pelvis ??= {}).y = times.map((t, i) => [Math.round(t), r2(smooth[i])] as Key);
}

/**
 * Travel speed that matches the stride: how fast the sole moves backwards relative to the body
 * while the foot is flat on the ground (the roll phases at either end are excluded), averaged
 * over both feet.
 */
function strideSpeed(clip: AnimationClip): number {
  const sk = new Skeleton(rig);
  const speeds: number[] = [];
  for (const [bone, c] of Object.entries(rig.contacts ?? {})) {
    const off = bone === 'foot_front' ? 0 : 0.5;
    const mid: [number, number] = [(c.points[0][0] + c.points[1][0]) / 2, c.points[0][1]];
    const at = (p: number): number => {
      sk.update(sampleClip(clip, wrap(p + off) * clip.duration).bones);
      return sk.canvasToRig(bone, mid)[0];
    };
    const p0 = 0.16, p1 = 0.4;
    speeds.push((at(p0) - at(p1)) / ((p1 - p0) * clip.duration) * 1000);
  }
  return Math.round(speeds.reduce((a, b) => a + b, 0) / speeds.length / 10) * 10;
}

// ------------------------------------------------------------------ idle

function buildIdle(): AnimationClip {
  const D = 4200;
  const times = Array.from({ length: 13 }, (_, i) => (i / 12) * D);
  const u = (t: number): number => t / D;
  const tracks: Tracks = {};
  // breathing twice per cycle, weight shift once
  track(tracks, 'torso', 'sy', times, (t) => 1 + 0.006 * (1 - Math.cos(2 * TAU * u(t))));
  track(tracks, 'torso', 'rot', times, (t) => -0.7 * Math.sin(TAU * u(t)) - 0.3 * (1 - Math.cos(2 * TAU * u(t))));
  track(tracks, 'torso', 'x', times, (t) => 1.8 * Math.sin(TAU * u(t)));
  track(tracks, 'head', 'rot', times, (t) => 1.2 * Math.sin(TAU * (u(t) - 0.12)) + 0.4 * Math.sin(2 * TAU * u(t)));
  track(tracks, 'upperarm_front', 'rot', times, (t) => -4 + 1.4 * Math.sin(TAU * (u(t) - 0.08)));
  track(tracks, 'forearm_front', 'rot', times, (t) => -5 - 1.2 * Math.sin(TAU * (u(t) - 0.15)));
  track(tracks, 'hand_front', 'rot', times, (t) => -1.5 * Math.sin(TAU * (u(t) - 0.2)));
  track(tracks, 'upperarm_back', 'rot', times, (t) => 4 - 1.4 * Math.sin(TAU * (u(t) - 0.08)));
  track(tracks, 'forearm_back', 'rot', times, (t) => -4 + 1.2 * Math.sin(TAU * (u(t) - 0.15)));
  // hair and hem drift behind the head / torso
  track(tracks, 'hair_back', 'rot', times, (t) => 1.1 * Math.sin(TAU * (u(t) - 0.22)));
  track(tracks, 'hair_front', 'rot', times, (t) => 0.8 * Math.sin(TAU * (u(t) - 0.2)));
  track(tracks, 'hem', 'rot', times, (t) => 0.6 * Math.sin(TAU * (u(t) - 0.2)));
  return { duration: D, loop: true, interp: 'spline', bones: tracks };
}

// ------------------------------------------------------------------ surprise

function buildSurprise(): AnimationClip {
  // [time, value] keys; spline through them, flat at both ends
  const k = (...pairs: [number, number][]): Key[] => pairs.map(([t, v]) => [t, v] as Key);
  const bones: Tracks = {
    pelvis: { y: k([0, 0], [70, 6], [150, -24], [230, -20], [330, 5], [460, -1], [600, 0], [1300, 0]) },
    thigh_front: { rot: k([0, 0], [70, 2], [150, -7], [330, 1], [460, 0], [1300, 0]) },
    thigh_back: { rot: k([0, 0], [70, -1], [150, 5], [330, -1], [460, 0], [1300, 0]) },
    torso: { rot: k([0, 0], [70, 2], [150, -9], [240, -11], [400, -6.5], [560, -7.5], [900, -6], [1300, 0]) },
    neck: { rot: k([0, 0], [150, -3], [400, -2], [900, -2], [1300, 0]) },
    head: { rot: k([0, 0], [70, 1.5], [150, -8], [250, -9.5], [420, -5.5], [600, -6.5], [900, -6], [1300, 0]) },
    upperarm_front: { rot: k([0, 0], [70, 3], [160, -40], [260, -44], [420, -33], [600, -35], [900, -33], [1300, 0]) },
    forearm_front: { rot: k([0, 0], [90, 2], [190, -55], [300, -60], [460, -48], [640, -51], [900, -49], [1300, 0]) },
    hand_front: { rot: k([0, 0], [110, 2], [220, -18], [340, -24], [500, -15], [900, -16], [1300, 0]) },
    upperarm_back: { rot: k([0, 0], [70, 2], [170, -29], [280, -33], [440, -24], [900, -25], [1300, 0]) },
    forearm_back: { rot: k([0, 0], [100, 2], [200, -48], [320, -53], [480, -43], [900, -45], [1300, 0]) },
    // follow-through: hair and hem react late and overshoot, then settle
    hair_back: { rot: k([0, 0], [110, 0], [190, 3.2], [320, -2.6], [460, 1.3], [620, -0.5], [800, 0], [1300, 0]) },
    hair_front: { rot: k([0, 0], [110, 0], [180, 2.2], [300, -1.8], [440, 0.9], [600, -0.3], [780, 0], [1300, 0]) },
    hem: {
      y: k([0, 0], [120, 0], [190, 3.5], [300, -3], [430, 1.6], [580, -0.5], [760, 0], [1300, 0]),
      rot: k([0, 0], [150, 0], [240, 1.2], [380, -0.8], [540, 0.3], [700, 0], [1300, 0]),
    },
  };
  return {
    duration: 1300,
    loop: false,
    interp: 'spline',
    bones,
    slots: {
      eyes: [[0, 'open'], [80, 'wide'], [950, 'open']],
      brows: [[0, 'neutral'], [70, 'raised'], [1050, 'neutral']],
      mouth: [[0, 'neutral'], [90, 'surprised'], [1000, 'neutral']],
    },
  };
}

// ------------------------------------------------------------------ write

/** JSON with keyframe / point arrays kept on one line. */
function formatJson(value: unknown, indent = ''): string {
  const flat = (v: unknown): boolean => Array.isArray(v) && v.every((x) => typeof x !== 'object' || x === null || flat(x));
  if (flat(value)) return JSON.stringify(value).replace(/,/g, ', ');
  if (Array.isArray(value)) {
    const inner = indent + '  ';
    return `[\n${value.map((v) => inner + formatJson(v, inner)).join(',\n')}\n${indent}]`;
  }
  if (value && typeof value === 'object') {
    const inner = indent + '  ';
    return `{\n${Object.entries(value).map(([k, v]) => `${inner}${JSON.stringify(k)}: ${formatJson(v, inner)}`).join(',\n')}\n${indent}}`;
  }
  return JSON.stringify(value);
}

const walk = buildWalk();
const anims = {
  $comment: 'GENERATED by tools/gen-anims.ts (npm run rig:anims); edit the generator, not this file. Times in ms; bone values are offsets from the rest pose (rot degrees clockwise +, x/y canvas px, sx/sy multipliers). Clips use spline interpolation.',
  idle: buildIdle(),
  blink: { duration: 160, loop: false, slots: { eyes: [[0, 'half'], [45, 'closed'], [115, 'half'], [160, 'open']] } },
  walk,
  surprise: buildSurprise(),
};
writeFileSync(animPath, formatJson(anims) + '\n');
const speed = strideSpeed(walk);
{
  const sk = new Skeleton(rig);
  const [rx] = rig.bones[0].pivot;
  for (const [bone, c] of Object.entries(rig.contacts ?? {})) {
    const mid: [number, number] = [(c.points[0][0] + c.points[1][0]) / 2, c.points[0][1]];
    const off = bone === 'foot_front' ? 0 : 0.5;
    const xs: number[] = [];
    for (let p = 0.06; p <= STANCE - 0.06; p += 0.02) {
      sk.update(sampleClip(walk, ((p + off) % 1) * walk.duration).bones);
      xs.push(sk.canvasToRig(bone, mid)[0] + rx + (speed * (p - 0.06) * walk.duration) / 1000);
    }
    console.log(`${bone}: stance slip ${(Math.max(...xs) - Math.min(...xs)).toFixed(1)} canvas px`);
  }
}
rig.walkSpeed = speed;
writeFileSync(rigPath, formatJson(rig) + '\n');
console.log(`wrote ${animPath}; walk speed ${speed} canvas px/s`);
