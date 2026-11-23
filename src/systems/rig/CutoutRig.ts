import Phaser from 'phaser';
import type { AssetRegistry } from '../../core/AssetRegistry';
import { BlinkController, RigAnimator, type ClipLibrary } from './Animation';
import { slotTextureKey, type Appearance, type RigDef, type SlotDef } from './RigDefinition';
import { decompose, Skeleton } from './Skeleton';

export interface CutoutRigOptions {
  rig: RigDef;
  clips: ClipLibrary;
  appearance: Appearance;
  assets: AssetRegistry;
  /** Display scale (1 = parts at their source pixel size). */
  scale?: number;
  facing?: 'left' | 'right';
}

/**
 * Phaser display object for a cutout rig. One flat Image per slot (so draw
 * order is independent of the bone hierarchy); each frame the animator's
 * pose is run through forward kinematics and applied to the images.
 *
 * The container's origin is the root bone: the point on the ground between
 * the feet. Place it on the scene's walk line.
 */
export class CutoutRig extends Phaser.GameObjects.Container {
  readonly skeleton: Skeleton;
  readonly animator: RigAnimator;
  readonly blink: BlinkController;
  private readonly images = new Map<string, Phaser.GameObjects.Image>();
  private readonly currentKeys = new Map<string, string>();
  private appearance: Appearance;
  private debugGraphics: Phaser.GameObjects.Graphics | null = null;
  private baseScale: number;
  private facingSign = 1;
  paused = false;

  constructor(scene: Phaser.Scene, x: number, y: number, private readonly opts: CutoutRigOptions) {
    super(scene, x, y);
    this.skeleton = new Skeleton(opts.rig);
    this.animator = new RigAnimator(opts.clips);
    this.blink = new BlinkController(this.animator);
    this.appearance = { ...opts.appearance };
    this.baseScale = opts.scale ?? 1;

    for (const slot of opts.rig.slots) {
      const img = scene.add.image(0, 0, '__DEFAULT');
      this.images.set(slot.id, img);
      this.add(img);
    }
    this.setFacing(opts.facing ?? 'right');
    if (opts.clips.idle) this.animator.play('idle');
    this.applyPose(0);

    scene.events.on(Phaser.Scenes.Events.UPDATE, this.tick, this);
    this.once(Phaser.GameObjects.Events.DESTROY, () => scene.events.off(Phaser.Scenes.Events.UPDATE, this.tick, this));
    scene.add.existing(this);
  }

  get rig(): RigDef {
    return this.opts.rig;
  }

  /** Height of the character in display pixels (sole to skull top). */
  get displayHeightPx(): number {
    return (this.rig.baselineY - this.rig.skullTopY) * this.baseScale;
  }

  /** Walk speed in display px/s that matches the walk clip's stride. */
  get walkSpeed(): number {
    return this.rig.walkSpeed * this.baseScale;
  }

  setAppearance(appearance: Appearance): this {
    this.appearance = { ...appearance };
    this.currentKeys.clear();
    this.applyPose(0);
    return this;
  }

  setFacing(facing: 'left' | 'right'): this {
    this.facingSign = facing === 'left' ? -1 : 1;
    this.setScale(this.baseScale * this.facingSign, this.baseScale);
    return this;
  }

  get facing(): 'left' | 'right' {
    return this.facingSign < 0 ? 'left' : 'right';
  }

  setRigScale(scale: number): this {
    this.baseScale = scale;
    return this.setScale(scale * this.facingSign, scale);
  }

  /** Multiply-tint every part, used to sit the character into each scene's lighting. */
  setRigTint(color: number): this {
    for (const img of this.images.values()) img.setTint(color);
    return this;
  }

  showBones(show: boolean): this {
    if (show && !this.debugGraphics) {
      this.debugGraphics = this.scene.add.graphics();
      this.add(this.debugGraphics);
    } else if (!show && this.debugGraphics) {
      this.debugGraphics.destroy();
      this.debugGraphics = null;
    }
    return this;
  }

  /** Slots whose texture is still a placeholder (for the Rig Lab checklist). */
  placeholderSlots(): string[] {
    return [...this.currentKeys.entries()].filter(([, key]) => this.opts.assets.isPlaceholder(key)).map(([slot]) => slot);
  }

  private tick(_time: number, delta: number): void {
    if (this.paused || !this.active) return;
    this.applyPose(delta);
  }

  private applyPose(delta: number): void {
    this.blink.update(delta);
    const pose = this.animator.update(delta);
    this.skeleton.update(pose.bones);
    for (const slot of this.rig.slots) {
      const img = this.images.get(slot.id)!;
      const state = slot.states ? (pose.slots[slot.id] ?? slot.default) : undefined;
      this.setSlotTexture(slot, img, slotTextureKey(slot, this.appearance, state));
      const m = decompose(this.skeleton.world.get(slot.bone)!);
      img.setPosition(m.x, m.y).setRotation(m.rotation).setScale(m.scaleX, m.scaleY);
    }
    if (this.debugGraphics) this.drawBones(this.debugGraphics);
  }

  private setSlotTexture(slot: SlotDef, img: Phaser.GameObjects.Image, key: string): void {
    if (this.currentKeys.get(slot.id) === key) return;
    this.currentKeys.set(slot.id, key);
    if (!this.scene.textures.exists(key)) {
      img.setVisible(false);
      return;
    }
    const info = this.opts.assets.get(key);
    const bone = this.rig.bones.find((b) => b.id === slot.bone)!;
    const tx = info.trim?.x ?? 0;
    const ty = info.trim?.y ?? 0;
    img.setTexture(key).setVisible(true);
    img.setOrigin((bone.pivot[0] - tx) / info.width, (bone.pivot[1] - ty) / info.height);
  }

  private drawBones(g: Phaser.GameObjects.Graphics): void {
    g.clear();
    const lw = 3 / this.baseScale;
    for (const bone of this.rig.bones) {
      const m = this.skeleton.world.get(bone.id)!;
      if (bone.parent) {
        const p = this.skeleton.world.get(bone.parent)!;
        g.lineStyle(lw, 0xc0392b, 0.9).lineBetween(p.tx, p.ty, m.tx, m.ty);
      }
      g.fillStyle(0xffffff, 1).fillCircle(m.tx, m.ty, 9 / this.baseScale);
      g.lineStyle(lw, 0xc0392b, 1).strokeCircle(m.tx, m.ty, 9 / this.baseScale);
    }
  }
}
