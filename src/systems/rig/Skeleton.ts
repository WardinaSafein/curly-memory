import type { RigDef, Vec2 } from './RigDefinition';

/** Animated offsets applied on top of a bone's rest pose. Angles in degrees. */
export interface BonePose {
  rot: number;
  x: number;
  y: number;
  sx: number;
  sy: number;
}

export const IDENTITY_POSE: Readonly<BonePose> = Object.freeze({ rot: 0, x: 0, y: 0, sx: 1, sy: 1 });

/** 2D affine matrix: x' = a*x + c*y + tx, y' = b*x + d*y + ty */
export interface Mat2D {
  a: number;
  b: number;
  c: number;
  d: number;
  tx: number;
  ty: number;
}

export function multiply(m: Mat2D, n: Mat2D): Mat2D {
  return {
    a: m.a * n.a + m.c * n.b,
    b: m.b * n.a + m.d * n.b,
    c: m.a * n.c + m.c * n.d,
    d: m.b * n.c + m.d * n.d,
    tx: m.a * n.tx + m.c * n.ty + m.tx,
    ty: m.b * n.tx + m.d * n.ty + m.ty,
  };
}

export function localMatrix(offset: Vec2, pose: BonePose): Mat2D {
  const r = (pose.rot * Math.PI) / 180;
  const cos = Math.cos(r);
  const sin = Math.sin(r);
  return {
    a: cos * pose.sx,
    b: sin * pose.sx,
    c: -sin * pose.sy,
    d: cos * pose.sy,
    tx: offset[0] + pose.x,
    ty: offset[1] + pose.y,
  };
}

export function transformPoint(m: Mat2D, p: Vec2): Vec2 {
  return [m.a * p[0] + m.c * p[1] + m.tx, m.b * p[0] + m.d * p[1] + m.ty];
}

/** Decompose for a display object (assumes no skew, which holds while non-uniform scale is only used on leaf bones). */
export function decompose(m: Mat2D): { x: number; y: number; rotation: number; scaleX: number; scaleY: number } {
  const scaleX = Math.hypot(m.a, m.b);
  const rotation = Math.atan2(m.b, m.a);
  const det = m.a * m.d - m.b * m.c;
  return { x: m.tx, y: m.ty, rotation, scaleX, scaleY: scaleX === 0 ? 0 : det / scaleX };
}

/**
 * Forward kinematics for a cutout rig. Rig space has the root bone's pivot
 * at (0,0); +y is down; positive rotation is clockwise (Phaser convention).
 */
export class Skeleton {
  readonly order: string[];
  private readonly offsets = new Map<string, Vec2>();
  private readonly parents = new Map<string, string | null>();
  readonly world = new Map<string, Mat2D>();

  private readonly rest: Record<string, BonePose> = {};

  /** `useRestPose: false` evaluates the pose exactly as drawn in the template (used by tools/tests). */
  constructor(readonly rig: RigDef, opts: { useRestPose?: boolean } = {}) {
    if (opts.useRestPose ?? true) {
      for (const [id, r] of Object.entries(rig.restPose ?? {})) {
        this.rest[id] = { rot: r.rot ?? 0, x: r.x ?? 0, y: r.y ?? 0, sx: 1, sy: 1 };
      }
    }
    const pivots = new Map(rig.bones.map((b) => [b.id, b.pivot] as const));
    this.order = rig.bones.map((b) => b.id);
    for (const bone of rig.bones) {
      this.parents.set(bone.id, bone.parent);
      const parentPivot = bone.parent ? pivots.get(bone.parent)! : bone.pivot;
      this.offsets.set(bone.id, [bone.pivot[0] - parentPivot[0], bone.pivot[1] - parentPivot[1]]);
    }
    this.update({});
  }

  /** Recompute world matrices from per-bone poses (missing bones use the rest pose). */
  update(poses: Partial<Record<string, BonePose>>): void {
    for (const id of this.order) {
      const anim = poses[id] ?? IDENTITY_POSE;
      const rest = this.rest[id];
      const pose = rest ? { ...anim, rot: anim.rot + rest.rot, x: anim.x + rest.x, y: anim.y + rest.y } : anim;
      const local = localMatrix(this.offsets.get(id)!, pose);
      const parent = this.parents.get(id);
      this.world.set(id, parent ? multiply(this.world.get(parent)!, local) : local);
    }
  }

  /** Map a canvas-space point (e.g. a joint or toe position in the template) through the current pose into rig space. */
  canvasToRig(boneId: string, canvasPoint: Vec2): Vec2 {
    const bone = this.rig.bones.find((b) => b.id === boneId)!;
    const local: Vec2 = [canvasPoint[0] - bone.pivot[0], canvasPoint[1] - bone.pivot[1]];
    return transformPoint(this.world.get(boneId)!, local);
  }
}
