/**
 * Cutout rig data model. Pure data + validation, no Phaser imports, so the
 * same definition drives the runtime, the asset tools and the tests.
 *
 * Coordinates are in "canvas space": pixels on the shared part canvas
 * (1024x1536 for the player), rest pose. Every delivered part PNG is painted
 * on that canvas in its final position, so a part's pivot is simply the
 * canvas position of its bone's joint.
 */

export type Vec2 = [number, number];

export type GuideShape =
  | { type: 'capsule'; a: Vec2; b: Vec2; r1: number; r2: number }
  | { type: 'ellipse'; c: Vec2; rx: number; ry: number }
  | { type: 'rect'; x: number; y: number; w: number; h: number }
  | { type: 'poly'; points: Vec2[] };

export interface BoneDef {
  id: string;
  parent: string | null;
  /** Joint position in canvas space (rest pose). */
  pivot: Vec2;
  label?: string;
}

export interface SlotDef {
  id: string;
  bone: string;
  /** Which appearance field selects the variant: skin | hair | outfit | eyes | brows | mouth | ... */
  family: string;
  /** Texture key template, e.g. `player.eyes.{eyes}.{state}`. `{family}` fields come from Appearance. */
  key: string;
  /** Source file template inside the rig's asset folder. */
  file: string;
  /** Optional swappable states (eyes open/closed, mouth shapes). */
  states?: string[];
  default?: string;
  /** Guide region used by the template, placeholders and alignment validation. */
  shape: GuideShape;
  /** Placeholder / template colour. */
  color?: string;
  /**
   * Extra canvas points that must be painted (opaque) in this part, beyond the automatic
   * capsule-end probes. Used to enforce hidden overlap (e.g. a hand reaching up into the sleeve).
   */
  mustCover?: Vec2[];
}

/** A fixed pose offset applied under every animation (e.g. relax arms drawn slightly wide). */
export type RestPose = Record<string, { rot?: number; x?: number; y?: number }>;

export interface RigDef {
  id: string;
  version: string | number;
  canvas: { width: number; height: number };
  baselineY: number;
  centerX: number;
  skullTopY: number;
  padding: number;
  jointOverlap: number;
  /** Walk speed in canvas px/s at scale 1 (matches the walk clip's stride). */
  walkSpeed: number;
  /** Distance past each capsule end that must be painted (validated with coverage probes). */
  overlapProbe?: number;
  /** Code-side pose correction applied under all animations. */
  restPose?: RestPose;
  /** Sole contact points per foot bone (canvas space) and the ground y they rest on. */
  contacts?: Record<string, { points: Vec2[]; groundY: number }>;
  bones: BoneDef[];
  /** Draw order: first entry is drawn at the back. */
  slots: SlotDef[];
}

/** The player's chosen variants, e.g. { skin: 's01', hair: 'h01', outfit: 'o01', ... } */
export type Appearance = Record<string, string>;

export function resolveTemplate(template: string, appearance: Appearance, state?: string): string {
  return template.replace(/\{(\w+)\}/g, (_, name: string) => {
    if (name === 'state') {
      if (state === undefined) throw new Error(`Template "${template}" needs a state`);
      return state;
    }
    const value = appearance[name];
    if (value === undefined) throw new Error(`Appearance is missing "${name}" for template "${template}"`);
    return value;
  });
}

export function slotTextureKey(slot: SlotDef, appearance: Appearance, state?: string): string {
  return resolveTemplate(slot.key, appearance, slot.states ? (state ?? slot.default) : undefined);
}

/** Every texture key/file a rig needs for one appearance (all states included). */
export function rigPartsFor(rig: RigDef, appearance: Appearance): { slot: SlotDef; state?: string; key: string; file: string }[] {
  const out: { slot: SlotDef; state?: string; key: string; file: string }[] = [];
  for (const slot of rig.slots) {
    const states = slot.states ?? [undefined];
    for (const state of states) {
      out.push({
        slot,
        state,
        key: resolveTemplate(slot.key, appearance, state),
        file: resolveTemplate(slot.file, appearance, state),
      });
    }
  }
  return out;
}

export function shapeBounds(shape: GuideShape): { x: number; y: number; w: number; h: number } {
  switch (shape.type) {
    case 'rect':
      return { x: shape.x, y: shape.y, w: shape.w, h: shape.h };
    case 'ellipse':
      return { x: shape.c[0] - shape.rx, y: shape.c[1] - shape.ry, w: shape.rx * 2, h: shape.ry * 2 };
    case 'capsule': {
      const r = Math.max(shape.r1, shape.r2);
      const x0 = Math.min(shape.a[0], shape.b[0]) - r;
      const y0 = Math.min(shape.a[1], shape.b[1]) - r;
      const x1 = Math.max(shape.a[0], shape.b[0]) + r;
      const y1 = Math.max(shape.a[1], shape.b[1]) + r;
      return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
    }
    case 'poly': {
      const xs = shape.points.map((p) => p[0]);
      const ys = shape.points.map((p) => p[1]);
      const x = Math.min(...xs);
      const y = Math.min(...ys);
      return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
    }
  }
}

/**
 * Canvas points that must be painted in a part so joints never open a gap:
 * for capsule limbs, a point `overlapProbe` px beyond each end along the limb
 * axis, plus any explicit `mustCover` points.
 */
export function coverageProbes(rig: RigDef, slot: SlotDef): Vec2[] {
  const out: Vec2[] = [...(slot.mustCover ?? [])];
  const d = rig.overlapProbe ?? 0;
  if (d > 0 && slot.shape.type === 'capsule') {
    const { a, b } = slot.shape;
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const ux = (b[0] - a[0]) / len;
    const uy = (b[1] - a[1]) / len;
    out.push([Math.round(a[0] - ux * d), Math.round(a[1] - uy * d)], [Math.round(b[0] + ux * d), Math.round(b[1] + uy * d)]);
  }
  return out;
}

/** Structural validation. Returns a list of human-readable problems (empty = valid). */
export function validateRig(rig: RigDef): string[] {
  const problems: string[] = [];
  const boneIds = new Set<string>();
  let roots = 0;
  for (const bone of rig.bones) {
    if (boneIds.has(bone.id)) problems.push(`Duplicate bone "${bone.id}"`);
    if (bone.parent === null) roots++;
    else if (!boneIds.has(bone.parent)) problems.push(`Bone "${bone.id}" must be listed after its parent "${bone.parent}"`);
    boneIds.add(bone.id);
    const [x, y] = bone.pivot;
    if (x < 0 || y < 0 || x > rig.canvas.width || y > rig.canvas.height) problems.push(`Bone "${bone.id}" pivot is outside the canvas`);
  }
  if (roots !== 1) problems.push(`Rig needs exactly one root bone (found ${roots})`);
  for (const id of Object.keys(rig.restPose ?? {})) if (!boneIds.has(id)) problems.push(`restPose references unknown bone "${id}"`);
  for (const id of Object.keys(rig.contacts ?? {})) if (!boneIds.has(id)) problems.push(`contacts reference unknown bone "${id}"`);
  const slotIds = new Set<string>();
  for (const slot of rig.slots) {
    if (slotIds.has(slot.id)) problems.push(`Duplicate slot "${slot.id}"`);
    slotIds.add(slot.id);
    if (!boneIds.has(slot.bone)) problems.push(`Slot "${slot.id}" references unknown bone "${slot.bone}"`);
    if (slot.states && slot.default && !slot.states.includes(slot.default)) problems.push(`Slot "${slot.id}" default state is not in its states`);
    if (slot.states && !slot.key.includes('{state}')) problems.push(`Slot "${slot.id}" has states but its key has no {state}`);
    const b = shapeBounds(slot.shape);
    const pad = rig.padding;
    if (b.x < pad || b.y < pad || b.x + b.w > rig.canvas.width - pad || b.y + b.h > rig.canvas.height - pad) {
      problems.push(`Slot "${slot.id}" guide shape breaks the ${pad}px padding`);
    }
  }
  return problems;
}
