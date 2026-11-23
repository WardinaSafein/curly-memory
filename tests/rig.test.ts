import { describe, expect, it } from 'vitest';
import anims from '../src/content/characters/player.anims.json';
import rigJson from '../src/content/characters/player.rig.json';
import { RigAnimator, sampleClip, type AnimationClip, type ClipLibrary } from '../src/systems/rig/Animation';
import { coverageProbes, rigPartsFor, validateRig, type RigDef } from '../src/systems/rig/RigDefinition';
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

  it('places every joint at its template position in the drawn pose', () => {
    const sk = new Skeleton(rig, { useRestPose: false });
    const [rx, ry] = rig.bones[0].pivot;
    for (const bone of rig.bones) {
      const m = sk.world.get(bone.id)!;
      expect(m.tx).toBeCloseTo(bone.pivot[0] - rx, 6);
      expect(m.ty).toBeCloseTo(bone.pivot[1] - ry, 6);
    }
  });

  it('relaxes the arms toward the body with the code-side rest pose', () => {
    const drawn = new Skeleton(rig, { useRestPose: false });
    const relaxed = new Skeleton(rig);
    // Front wrist moves right (toward the body), back wrist moves left.
    expect(relaxed.world.get('hand_front')!.tx).toBeGreaterThan(drawn.world.get('hand_front')!.tx + 10);
    expect(relaxed.world.get('hand_back')!.tx).toBeLessThan(drawn.world.get('hand_back')!.tx - 10);
    // Legs and head are untouched.
    expect(relaxed.world.get('foot_front')!.tx).toBeCloseTo(drawn.world.get('foot_front')!.tx, 6);
  });

  it('keeps every must-paint probe on the canvas and inside the padding', () => {
    for (const slot of rig.slots) {
      for (const [x, y] of coverageProbes(rig, slot)) {
        expect(x, slot.id).toBeGreaterThan(rig.padding);
        expect(y, slot.id).toBeGreaterThan(rig.padding);
        expect(x, slot.id).toBeLessThan(rig.canvas.width - rig.padding);
        expect(y, slot.id).toBeLessThan(rig.canvas.height - rig.padding);
      }
    }
  });

  it('defines the four test animations', () => {
    expect(Object.keys(clips).sort()).toEqual(['blink', 'idle', 'surprise', 'walk']);
  });
});

describe('animation clips', () => {
  /** Height of each foot's lowest contact point above its own ground (negative = above, positive = sunk). */
  const footGaps = (sk: Skeleton): number[] => {
    const ry = rig.bones[0].pivot[1];
    return Object.entries(rig.contacts!).map(([bone, c]) => Math.max(...c.points.map((p) => sk.canvasToRig(bone, p)[1] + ry)) - c.groundY);
  };

  it('walk: the planted foot stays on the ground (no floating or sinking)', () => {
    const sk = new Skeleton(rig);
    for (let t = 0; t < 1000; t += 25) {
      sk.update(sampleClip(clips.walk, t).bones);
      // The lower of the two feet is the planted one; allow a few px of interpolation slack.
      expect(Math.abs(Math.max(...footGaps(sk))), `t=${t}`).toBeLessThan(10);
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
