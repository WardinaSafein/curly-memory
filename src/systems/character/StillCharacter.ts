import Phaser from 'phaser';
import type { AssetRegistry } from '../../core/AssetRegistry';

/**
 * A character drawn as whole pictures (no cut parts). Movement is made in
 * code: breathing when idle; bob, sway and lean when walking; a hop for
 * one-shot reactions. If a mid-step picture exists for the outfit, walking
 * alternates between the standing and the mid-step picture.
 */
export interface StillOutfit {
  /** Texture key of the standing picture. */
  key: string;
  /** Optional mid-step picture, same canvas and alignment as `key`. */
  stepKey?: string;
  /** Point on the ground between the feet, in source canvas px. */
  anchor: [number, number];
  /** Ground point of the mid-step picture (its own feet; head stays level with the standing picture). */
  stepAnchor?: [number, number];
}

export interface StillCharacterDef {
  outfits: Record<string, StillOutfit>;
  /** Picture px → display px at scale 1 (so scene scales match the old rig). */
  pictureScale: number;
  /** Character height in picture px (hair top to sole), used for motion amplitudes. */
  heightPx: number;
  /** Walk speed in display px/s at scale 1. */
  walkSpeed: number;
  /** Duration of one step (half a stride), ms. */
  stepMs: number;
}

export interface StillCharacterOptions {
  def: StillCharacterDef;
  assets: AssetRegistry;
  scale: number;
  outfit: string;
  facing?: 'left' | 'right';
}

type Mode = 'idle' | 'walk';

/** Same surface the scenes use from the old cutout rig's animator. */
class StillAnimator {
  mode: Mode = 'idle';
  oneShot: { name: string; t: number; duration: number; resolve: () => void } | null = null;

  play(name: string): void {
    this.mode = name === 'walk' ? 'walk' : 'idle';
  }

  playOnce(name: string): Promise<void> {
    this.oneShot?.resolve();
    const duration = name === 'surprise' ? 700 : 450;
    return new Promise((resolve) => {
      this.oneShot = { name, t: 0, duration, resolve };
    });
  }
}

export class StillCharacter extends Phaser.GameObjects.Container {
  readonly animator = new StillAnimator();
  private readonly picture: Phaser.GameObjects.Image;
  private readonly def: StillCharacterDef;
  private readonly assets: AssetRegistry;
  private outfitName = '';
  private baseScale: number;
  private facingSign = 1;
  private time = 0;
  private walkPhase = 0;
  /** 0 = fully idle, 1 = fully walking (smoothed so starting/stopping never jumps). */
  private walkBlend = 0;
  /** Whether the walk cycle currently asks for the mid-step picture. */
  private stepWanted = false;
  paused = false;

  constructor(scene: Phaser.Scene, x: number, y: number, opts: StillCharacterOptions) {
    super(scene, x, y);
    this.def = opts.def;
    this.assets = opts.assets;
    this.baseScale = opts.scale;
    this.picture = scene.add.image(0, 0, '__DEFAULT');
    this.add(this.picture);
    this.setOutfit(opts.outfit);
    this.setFacing(opts.facing ?? 'right');
    scene.events.on(Phaser.Scenes.Events.UPDATE, this.tick, this);
    this.once(Phaser.GameObjects.Events.DESTROY, () => scene.events.off(Phaser.Scenes.Events.UPDATE, this.tick, this));
    scene.add.existing(this);
  }

  get outfit(): string {
    return this.outfitName;
  }

  get walkSpeed(): number {
    return this.def.walkSpeed * this.baseScale;
  }

  get facing(): 'left' | 'right' {
    return this.facingSign < 0 ? 'left' : 'right';
  }

  setOutfit(name: string): this {
    if (!this.def.outfits[name]) throw new Error(`Unknown outfit "${name}"`);
    this.outfitName = name;
    this.applyTexture(false);
    return this;
  }

  setFacing(facing: 'left' | 'right'): this {
    this.facingSign = facing === 'left' ? -1 : 1;
    return this.setScale(this.pictureScale * this.facingSign, this.pictureScale);
  }

  setRigScale(scale: number): this {
    this.baseScale = scale;
    return this.setFacing(this.facing);
  }

  /** Multiply-tint, used to sit the character into each scene's lighting. */
  setRigTint(color: number): this {
    this.picture.setTint(color);
    return this;
  }

  private get pictureScale(): number {
    return this.baseScale * this.def.pictureScale;
  }

  private hasRealTexture(key: string | undefined): key is string {
    return Boolean(key && this.assets.has(key) && !this.assets.isPlaceholder(key) && this.scene.textures.exists(key));
  }

  /** Show the standing or mid-step picture, keeping the feet anchor fixed. */
  private applyTexture(step: boolean): void {
    const outfit = this.def.outfits[this.outfitName];
    const key = step && this.hasRealTexture(outfit.stepKey) ? outfit.stepKey : outfit.key;
    this.stepWanted = step;
    if (!this.scene.textures.exists(key)) {
      this.picture.setVisible(false);
      return;
    }
    const a = this.assets.get(key);
    const trim = a.trim ?? { x: 0, y: 0 };
    this.picture.setTexture(key).setVisible(true);
    const anchor = key === outfit.key ? outfit.anchor : (outfit.stepAnchor ?? outfit.anchor);
    this.picture.setOrigin((anchor[0] - trim.x) / a.width, (anchor[1] - trim.y) / a.height);
  }

  private tick(_time: number, delta: number): void {
    if (this.paused || !this.active) return;
    const dt = Math.min(delta, 50);
    this.time += dt;
    const target = this.animator.mode === 'walk' ? 1 : 0;
    this.walkBlend += (target - this.walkBlend) * Math.min(1, dt / 90);
    if (this.animator.mode === 'walk') this.walkPhase += dt / this.def.stepMs;

    const h = this.def.heightPx;
    // Idle: slow breathing, the body grows a touch taller and narrower.
    const breath = Math.sin((this.time / 3400) * Math.PI * 2);
    const idleW = 1 - this.walkBlend;
    let sy = 1 + 0.006 * breath * idleW;
    let sx = 1 - 0.003 * breath * idleW;
    // Walk: one bob per step (up at mid-step, down at contact), a small side-to-side sway and a forward lean.
    const stepT = this.walkPhase % 1;
    const bob = Math.sin(stepT * Math.PI);
    const contact = Math.max(0, 1 - stepT / 0.18); // short squash right after the foot lands
    // With a real mid-step picture the stride itself lowers the body, so the code bob stays small.
    const bobAmp = this.hasRealTexture(this.def.outfits[this.outfitName].stepKey) ? 0.005 : 0.014;
    let y = -bob * bobAmp * h * this.walkBlend;
    sy -= 0.018 * contact * this.walkBlend;
    sx += 0.01 * contact * this.walkBlend;
    let rotation = (0.035 + 0.012 * Math.sin(this.walkPhase * Math.PI)) * this.walkBlend;

    // One-shot reaction: anticipation squash, hop, settle.
    const o = this.animator.oneShot;
    if (o) {
      o.t += dt;
      const p = Math.min(1, o.t / o.duration);
      const hop = o.name === 'surprise' ? 0.05 : 0.025;
      if (p < 0.2) {
        const q = p / 0.2;
        sy -= 0.05 * q;
        sx += 0.03 * q;
      } else {
        const q = (p - 0.2) / 0.8;
        y -= Math.sin(q * Math.PI) * hop * h;
        sy += 0.04 * Math.sin(q * Math.PI) - 0.05 * (1 - q) * (q < 0.15 ? 1 : 0);
        rotation -= 0.04 * Math.sin(q * Math.PI);
      }
      if (p >= 1) {
        this.animator.oneShot = null;
        o.resolve();
      }
    }

    // Each step: contact (mid-step picture) for the first half, passing (standing picture) for the second.
    const wantStep = this.animator.mode === 'walk' && stepT < 0.5;
    if (wantStep !== this.stepWanted) this.applyTexture(wantStep);
    this.picture.setPosition(0, y).setScale(sx, sy).setRotation(rotation);
  }
}
