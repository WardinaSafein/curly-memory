import { describe, expect, it } from 'vitest';
import anims from '../src/content/characters/player.anims.json';
import rigJson from '../src/content/characters/player.rig.json';
import { RigAnimator, sampleClip, type AnimationClip, type ClipLibrary } from '../src/systems/rig/Animation';
import { rigPartsFor, validateRig, type RigDef } from '../src/systems/rig/RigDefinition';
import { Skeleton } from '../src/systems/rig/Skeleton';

const rig = rigJson as unknown as RigDef;
const clips = Object.fromEntries(Object.entries(anims).filter(([k]) => !k.startsWith('$'))) as unknown as ClipLibrary;
const APPEARANCE = { skin: 's01', hair: 'h01', outfit: 'o01', eyes: 'e01', brows: 'b01', mouth: 'm01' };

describe('player rig definition', () => {
  it('is structurally valid', () => {
    expect(validateRig(rig)).toEqual([]);
  });

  it('needs 27 part images for one appearance (21 slots, face states expanded)', () => {
    expect(rigPartsFor(rig, APPEARANCE)).toHaveLength(27);
  });

  it('places every joint at its template position in the rest pose', () => {
    const sk = new Skeleton(rig);
    const [rx, ry] = rig.bones[0].pivot;
    for (const bone of rig.bones) {
      const m = sk.world.get(bone.id)!;
      expect(m.tx).toBeCloseTo(bone.pivot[0] - rx, 6);
      expect(m.ty).toBeCloseTo(bone.pivot[1] - ry, 6);
    }
  });

  it('defines the four test animations', () => {
    expect(Object.keys(clips).sort()).toEqual(['blink', 'idle', 'surprise', 'walk']);
  });
});

describe('animation clips', () => {
  const lowestFootY = (sk: Skeleton): { front: number; back: number } => ({
    front: Math.max(sk.canvasToRig('foot_front', [436, 1440])[1], sk.canvasToRig('foot_front', [548, 1440])[1]),
    back: Math.max(sk.canvasToRig('foot_back', [538, 1432])[1], sk.canvasToRig('foot_back', [646, 1432])[1]) + 8,
  });

  it('walk: the planted foot stays on the ground (no floating or sinking)', () => {
    const sk = new Skeleton(rig);
    for (let t = 0; t < 1000; t += 25) {
      sk.update(sampleClip(clips.walk, t).bones);
      const { front, back } = lowestFootY(sk);
      // The lower of the two feet is the planted one; allow a few px of interpolation slack.
      expect(Math.abs(Math.max(front, back))).toBeLessThan(10);
    }
  });

  it('looping clips start and end on the same pose', () => {
    for (const name of ['idle', 'walk']) {
      const clip = clips[name] as AnimationClip;
      const a = sampleClip(clip, 0).bones;
      const b = sampleClip(clip, clip.duration - 0.001).bones;
      for (const id of Object.keys(a)) {
        expect(b[id].rot).toBeCloseTo(a[id].rot, 1);
        expect(b[id].y).toBeCloseTo(a[id].y, 1);
      }
    }
  });

  it('surprise returns to the rest pose and restores the face', () => {
    const end = sampleClip(clips.surprise, clips.surprise.duration);
    for (const p of Object.values(end.bones)) {
      expect(p.rot).toBeCloseTo(0, 6);
      expect(p.y).toBeCloseTo(0, 6);
    }
    expect(end.slots).toMatchObject({ eyes: 'open', brows: 'neutral', mouth: 'neutral' });
    expect(sampleClip(clips.surprise, 100).slots).toMatchObject({ eyes: 'wide', brows: 'raised', mouth: 'surprised' });
  });

  it('blink closes then reopens the eyes', () => {
    const states = [0, 60, 130, 160].map((t) => sampleClip(clips.blink, t).slots.eyes);
    expect(states).toEqual(['half', 'closed', 'half', 'open']);
  });
});

describe('RigAnimator', () => {
  it('cross-fades between base clips', () => {
    const anim = new RigAnimator(clips);
    anim.play('idle');
    anim.update(100);
    anim.play('walk', { fade: 200 });
    const mid = anim.update(100).bones.thigh_front?.rot ?? 0;
    const walkOnly = sampleClip(clips.walk, 100).bones.thigh_front.rot;
    expect(Math.abs(mid)).toBeLessThan(Math.abs(walkOnly));
    anim.update(200);
    expect(anim.baseClip).toBe('walk');
  });

  it('one-shots layer on top of the base clip and resolve when done', async () => {
    const anim = new RigAnimator(clips);
    anim.play('idle');
    const done = anim.playOnce('surprise');
    const pose = anim.update(120);
    expect(pose.slots.eyes).toBe('wide');
    expect(anim.isPlaying('overlay')).toBe(true);
    anim.update(clips.surprise.duration);
    await done;
    expect(anim.isPlaying('overlay')).toBe(false);
  });
});
