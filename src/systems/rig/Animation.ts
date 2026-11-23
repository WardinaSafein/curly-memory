import { IDENTITY_POSE, type BonePose } from './Skeleton';

/**
 * Keyframe animation for cutout rigs. Pure logic (no Phaser), unit-tested.
 *
 * Bone values are *offsets* from the rest pose: rot (degrees, clockwise +),
 * x / y (canvas px), sx / sy (multipliers, 1 = unchanged). Layers are additive,
 * so an overlay clip (e.g. "surprise") plays on top of whatever the base clip
 * (idle / walk) is doing. Slot keys swap part states (eyes closed, mouth open).
 */

export type EaseName = 'linear' | 'sine' | 'in' | 'out' | 'step';
/** [timeMs, value, easeToNextKey?] */
export type Key = [number, number, EaseName?];
export type Channel = 'rot' | 'x' | 'y' | 'sx' | 'sy';

export interface AnimationClip {
  duration: number;
  loop: boolean;
  /**
   * 'spline' (recommended): smooth Catmull-Rom curves through the keys, so motion carries through
   * each key instead of stopping. 'eased' (legacy default): every segment eases in and out on its
   * own, which makes the motion stop at every key. A key with an explicit ease always uses it.
   */
  interp?: 'spline' | 'eased';
  bones?: Record<string, Partial<Record<Channel, Key[]>>>;
  /** Step keys: [timeMs, state]. The state holds until the next key. */
  slots?: Record<string, [number, string][]>;
}

export type ClipLibrary = Record<string, AnimationClip>;

export interface SampledPose {
  bones: Record<string, BonePose>;
  slots: Record<string, string>;
}

const EASES: Record<EaseName, (t: number) => number> = {
  linear: (t) => t,
  sine: (t) => 0.5 - Math.cos(Math.PI * t) / 2,
  in: (t) => t * t,
  out: (t) => 1 - (1 - t) * (1 - t),
  step: () => 0,
};

export interface SampleOptions {
  spline?: boolean;
  /** Looping clips wrap the curve around (needs `duration`). */
  loop?: boolean;
  duration?: number;
}

/** Tangent (value per ms) at key i for a Catmull-Rom curve; flat at the ends of one-shot clips. */
function tangent(keys: Key[], i: number, opts: SampleOptions): number {
  const n = keys.length;
  let prev: [number, number] | null = i > 0 ? [keys[i - 1][0], keys[i - 1][1]] : null;
  let next: [number, number] | null = i < n - 1 ? [keys[i + 1][0], keys[i + 1][1]] : null;
  if (opts.loop && opts.duration && n > 2) {
    // first and last key are the same instant of a loop: use the neighbours across the seam
    if (i === 0) prev = [keys[n - 2][0] - opts.duration, keys[n - 2][1]];
    if (i === n - 1) next = [keys[1][0] + opts.duration, keys[1][1]];
  }
  if (!prev || !next) return 0;
  const dt = next[0] - prev[0];
  return dt === 0 ? 0 : (next[1] - prev[1]) / dt;
}

export function sampleKeys(keys: Key[], t: number, opts: SampleOptions = {}): number {
  if (keys.length === 0) return 0;
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 0; i < keys.length - 1; i++) {
    const [t0, v0, ease] = keys[i];
    const [t1, v1] = keys[i + 1];
    if (t <= t1) {
      const span = t1 - t0;
      const u = span === 0 ? 1 : (t - t0) / span;
      if (opts.spline && ease === undefined) {
        // cubic Hermite with Catmull-Rom tangents: passes through every key, no stop at keys
        const m0 = tangent(keys, i, opts) * span;
        const m1 = tangent(keys, i + 1, opts) * span;
        const u2 = u * u, u3 = u2 * u;
        return (2 * u3 - 3 * u2 + 1) * v0 + (u3 - 2 * u2 + u) * m0 + (-2 * u3 + 3 * u2) * v1 + (u3 - u2) * m1;
      }
      return v0 + (v1 - v0) * EASES[ease ?? 'sine'](u);
    }
  }
  return keys[keys.length - 1][1];
}

function sampleSlot(keys: [number, string][], t: number): string | undefined {
  let state: string | undefined;
  for (const [kt, s] of keys) {
    if (kt <= t) state = s;
    else break;
  }
  return state;
}

const DEFAULTS: Record<Channel, number> = { rot: 0, x: 0, y: 0, sx: 1, sy: 1 };

/** Sample a clip at a local time (ms). Looping clips wrap. */
export function sampleClip(clip: AnimationClip, timeMs: number): SampledPose {
  const t = clip.loop ? ((timeMs % clip.duration) + clip.duration) % clip.duration : Math.min(Math.max(timeMs, 0), clip.duration);
  const bones: Record<string, BonePose> = {};
  for (const [boneId, channels] of Object.entries(clip.bones ?? {})) {
    const pose: BonePose = { ...IDENTITY_POSE };
    for (const ch of Object.keys(DEFAULTS) as Channel[]) {
      const keys = channels[ch];
      if (keys) pose[ch] = sampleKeys(keys, t, { spline: clip.interp === 'spline', loop: clip.loop, duration: clip.duration });
    }
    bones[boneId] = pose;
  }
  const slots: Record<string, string> = {};
  for (const [slotId, keys] of Object.entries(clip.slots ?? {})) {
    const s = sampleSlot(keys, t);
    if (s !== undefined) slots[slotId] = s;
  }
  return { bones, slots };
}

/** Accumulate `pose` into `into` with a weight (additive offsets, multiplicative scale). */
export function addPose(into: SampledPose, pose: SampledPose, weight: number, slotPriority = true): void {
  if (weight <= 0) return;
  for (const [id, p] of Object.entries(pose.bones)) {
    const acc = (into.bones[id] ??= { ...IDENTITY_POSE });
    acc.rot += p.rot * weight;
    acc.x += p.x * weight;
    acc.y += p.y * weight;
    acc.sx *= 1 + (p.sx - 1) * weight;
    acc.sy *= 1 + (p.sy - 1) * weight;
  }
  if (slotPriority && weight >= 0.5) Object.assign(into.slots, pose.slots);
}

interface LayerState {
  clip: string;
  time: number;
  speed: number;
  weight: number;
  fadeIn: number;
  fadeOut: number;
  resolve?: () => void;
}

export type LayerName = 'base' | 'face' | 'overlay';
const LAYER_ORDER: LayerName[] = ['base', 'face', 'overlay'];

/**
 * Plays clips on three layers, evaluated in order base -> face -> overlay:
 *  - base: one looping clip at a time (idle, walk) with cross-fade
 *  - face: short one-shots that mostly swap slots (blink)
 *  - overlay: additive one-shot reactions (surprise)
 */
export class RigAnimator {
  private base: LayerState | null = null;
  private previousBase: LayerState | null = null;
  private crossfade = { elapsed: 0, duration: 0 };
  private oneShots: Record<Exclude<LayerName, 'base'>, LayerState | null> = { face: null, overlay: null };
  timeScale = 1;

  constructor(readonly clips: ClipLibrary) {}

  get baseClip(): string | null {
    return this.base?.clip ?? null;
  }

  isPlaying(layer: Exclude<LayerName, 'base'>): boolean {
    return this.oneShots[layer] !== null;
  }

  play(name: string, opts: { fade?: number; speed?: number } = {}): void {
    this.requireClip(name);
    if (this.base?.clip === name) {
      this.base.speed = opts.speed ?? this.base.speed;
      return;
    }
    this.previousBase = this.base;
    this.crossfade = { elapsed: 0, duration: this.previousBase ? (opts.fade ?? 180) : 0 };
    this.base = { clip: name, time: 0, speed: opts.speed ?? 1, weight: 1, fadeIn: 0, fadeOut: 0 };
  }

  playOnce(name: string, opts: { layer?: Exclude<LayerName, 'base'>; fadeIn?: number; fadeOut?: number; speed?: number } = {}): Promise<void> {
    this.requireClip(name);
    const layer = opts.layer ?? 'overlay';
    this.oneShots[layer]?.resolve?.();
    return new Promise((resolve) => {
      this.oneShots[layer] = {
        clip: name,
        time: 0,
        speed: opts.speed ?? 1,
        weight: 1,
        fadeIn: opts.fadeIn ?? 0,
        fadeOut: opts.fadeOut ?? 0,
        resolve,
      };
    });
  }

  stop(layer: Exclude<LayerName, 'base'>): void {
    this.oneShots[layer]?.resolve?.();
    this.oneShots[layer] = null;
  }

  /** Advance time and return the blended pose. */
  update(dtMs: number): SampledPose {
    const dt = dtMs * this.timeScale;
    const out: SampledPose = { bones: {}, slots: {} };

    if (this.base) {
      this.base.time += dt * this.base.speed;
      let w = 1;
      if (this.previousBase && this.crossfade.duration > 0) {
        this.crossfade.elapsed += dt;
        w = Math.min(1, this.crossfade.elapsed / this.crossfade.duration);
        this.previousBase.time += dt * this.previousBase.speed;
        addPose(out, sampleClip(this.clips[this.previousBase.clip], this.previousBase.time), 1 - w);
        if (w >= 1) this.previousBase = null;
      }
      addPose(out, sampleClip(this.clips[this.base.clip], this.base.time), w);
    }

    for (const layer of LAYER_ORDER) {
      if (layer === 'base') continue;
      const s = this.oneShots[layer];
      if (!s) continue;
      const clip = this.clips[s.clip];
      s.time += dt * s.speed;
      const remaining = clip.duration - s.time;
      let w = 1;
      if (s.fadeIn > 0) w = Math.min(w, s.time / s.fadeIn);
      if (s.fadeOut > 0) w = Math.min(w, remaining / s.fadeOut);
      addPose(out, sampleClip(clip, s.time), Math.max(0, Math.min(1, w)), true);
      if (s.time >= clip.duration) {
        this.oneShots[layer] = null;
        s.resolve?.();
      }
    }
    return out;
  }

  private requireClip(name: string): void {
    if (!this.clips[name]) throw new Error(`Unknown animation clip "${name}"`);
  }
}

/** Random-interval blinking driven by the animator's face layer. */
export class BlinkController {
  private countdown: number;
  enabled = true;

  constructor(
    private readonly animator: RigAnimator,
    private readonly clip = 'blink',
    private readonly minMs = 2200,
    private readonly maxMs = 5600,
    private readonly random: () => number = Math.random,
  ) {
    this.countdown = this.nextInterval();
  }

  update(dtMs: number): void {
    if (!this.enabled) return;
    this.countdown -= dtMs;
    if (this.countdown > 0) return;
    this.countdown = this.nextInterval();
    // Never blink over a reaction that controls the eyes (e.g. surprise's wide eyes).
    if (!this.animator.isPlaying('overlay') && !this.animator.isPlaying('face')) this.blinkNow();
  }

  blinkNow(): void {
    void this.animator.playOnce(this.clip, { layer: 'face' });
  }

  private nextInterval(): number {
    // 15% chance of a quick double-blink, which reads as more natural.
    if (this.random() < 0.15) return 260;
    return this.minMs + this.random() * (this.maxMs - this.minMs);
  }
}
