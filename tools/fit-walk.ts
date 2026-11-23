/**
 * Fits the walk clip to the rig: computes the pelvis bob that keeps the planted
 * foot on the ground and the travel speed that matches the stride (no foot sliding).
 * Run after changing leg joints in the rig:
 *
 *   npm run rig:fit-walk            print the values
 *   npm run rig:fit-walk -- --write update player.anims.json and player.rig.json
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { sampleClip, type AnimationClip } from '../src/systems/rig/Animation';
import type { RigDef } from '../src/systems/rig/RigDefinition';
import { Skeleton } from '../src/systems/rig/Skeleton';

const DIR = join(import.meta.dirname, '..', 'src', 'content', 'characters');
const rigPath = join(DIR, 'player.rig.json');
const animPath = join(DIR, 'player.anims.json');
const rig = JSON.parse(readFileSync(rigPath, 'utf8')) as RigDef;
const anims = JSON.parse(readFileSync(animPath, 'utf8')) as Record<string, AnimationClip>;
const walk = structuredClone(anims.walk);
walk.bones = { ...walk.bones, pelvis: {} };
const sk = new Skeleton(rig);
const contacts = rig.contacts ?? {};
const [rx, ry] = rig.bones[0].pivot;

/** How far above its own ground the lowest point of each foot is (negative = above). */
function footGaps(): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [bone, c] of Object.entries(contacts)) {
    const lowest = Math.max(...c.points.map((p) => sk.canvasToRig(bone, p)[1] + ry));
    out[bone] = lowest - c.groundY;
  }
  return out;
}

const keys: [number, number][] = [];
const stanceX: { t: number; x: number }[] = [];
for (let t = 0; t <= walk.duration; t += walk.duration / 8) {
  sk.update(sampleClip(walk, t >= walk.duration ? walk.duration - 0.001 : t).bones);
  const gaps = footGaps();
  const planted = Object.entries(gaps).sort((a, b) => b[1] - a[1])[0];
  keys.push([Math.round(t), Math.round(-planted[1])]);
  const c = contacts[planted[0]];
  const mid: [number, number] = [(c.points[0][0] + c.points[1][0]) / 2, c.points[0][1]];
  stanceX.push({ t, x: sk.canvasToRig(planted[0], mid)[0] + rx });
}
// Stride speed: how fast the planted foot moves backwards relative to the body, averaged.
let travel = 0;
let time = 0;
for (let i = 1; i < stanceX.length; i++) {
  const dx = stanceX[i - 1].x - stanceX[i].x;
  if (dx > 0) { travel += dx; time += stanceX[i].t - stanceX[i - 1].t; }
}
const speed = Math.round((travel / time) * 1000 / 10) * 10;
console.log('pelvis y keys:', JSON.stringify(keys));
console.log('walk speed (canvas px/s):', speed);

/** JSON with keyframe / point arrays kept on one line (arrays that contain no objects). */
function formatJson(value: unknown, indent = ''): string {
  const flat = (v: unknown): boolean => Array.isArray(v) && v.every((x) => typeof x !== 'object' || x === null || flat(x));
  if (flat(value)) return JSON.stringify(value).replace(/,/g, ', ');
  if (Array.isArray(value)) {
    const inner = indent + '  ';
    return `[\n${value.map((v) => inner + formatJson(v, inner)).join(',\n')}\n${indent}]`;
  }
  if (value && typeof value === 'object') {
    const inner = indent + '  ';
    const entries = Object.entries(value).map(([k, v]) => `${inner}${JSON.stringify(k)}: ${formatJson(v, inner)}`);
    return `{\n${entries.join(',\n')}\n${indent}}`;
  }
  return JSON.stringify(value);
}

if (process.argv.includes('--write')) {
  anims.walk.bones!.pelvis = { y: keys };
  writeFileSync(animPath, formatJson(anims) + '\n');
  rig.walkSpeed = speed;
  writeFileSync(rigPath, formatJson(rig) + '\n');
  console.log('updated player.anims.json and player.rig.json');
}
