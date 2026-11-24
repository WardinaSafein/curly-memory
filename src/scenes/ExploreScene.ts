import Phaser from 'phaser';
import { FontFamily, GAME_WIDTH, Palette, SceneKeys } from '../config/game';
import { EventBus } from '../core/EventBus';
import { services } from '../core/Services';
import { createPlayer } from '../content/characters/player';
import { SCENES } from '../content/scenes';
import { createStoryRunner } from '../content/story';
import { DialogueBox } from '../systems/dialogue/DialogueBox';
import type { DialogueRunner } from '../systems/dialogue/DialogueRunner';
import type { CutoutRig } from '../systems/rig/CutoutRig';
import { areaBounds, guardPasses, type Action, type HotspotDef, type SceneDef } from '../systems/scene/SceneDefinition';
import { Button } from '../ui/Button';
import { anchor } from '../ui/layout';
import { gotoTitle, runTransition } from './router';

/**
 * Generic click-to-explore renderer. Builds any SceneDef: parallax art layers,
 * the player rig on a walk line, hover-highlighted hotspots, dialogue and
 * scripted actions. Locations are data in src/content/scenes.
 */
export class ExploreScene extends Phaser.Scene {
  private def!: SceneDef;
  private entry = 'default';
  private player: CutoutRig | null = null;
  private busy = false;
  private dialogue!: DialogueBox;
  private runner!: DialogueRunner;
  private readonly layerImages = new Map<string, Phaser.GameObjects.Image>();
  private tooltip!: Phaser.GameObjects.Text;
  private walkTween: Phaser.Tweens.Tween | null = null;

  constructor() {
    super(SceneKeys.Explore);
  }

  init(data: { sceneId: string; entry?: string }): void {
    const def = SCENES[data.sceneId];
    if (!def) throw new Error(`Unknown scene "${data.sceneId}"`);
    this.def = def;
    this.entry = data.entry ?? 'default';
    this.player = null;
    this.busy = false;
    this.walkTween = null;
    this.layerImages.clear();
  }

  create(): void {
    const { world } = this.def;
    const cam = this.cameras.main;
    cam.setBounds(0, 0, world.width, world.height);
    if (this.def.backgroundColor) cam.setBackgroundColor(this.def.backgroundColor);

    this.buildLayers();
    this.buildPlayer();
    this.buildHotspots();
    this.buildHud();
    this.dialogue = new DialogueBox(this);
    this.runner = createStoryRunner();

    this.input.on(Phaser.Input.Events.POINTER_UP, (pointer: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      if (over.length > 0 || this.busy || !this.player || !this.def.walk) return;
      if (pointer.worldY < this.def.walk.y - 320) return; // clicks on the sky don't walk
      void this.walkTo(pointer.worldX);
    });

    cam.fadeIn(400, 0, 0, 0);
    const entry = this.def.entries[this.entry] ?? this.def.entries.default;
    if (entry.actions?.length) void this.runSequence(entry.actions);
  }

  // ---------------------------------------------------------------- building

  private buildLayers(): void {
    const viewW = this.scale.gameSize.width;
    this.def.layers.forEach((layer, index) => {
      const parallax = layer.parallax ?? 1;
      const depth = layer.depth ?? index;
      const make = (x: number): Phaser.GameObjects.Image => {
        const img = this.add.image(x, layer.y ?? 0, layer.key)
          .setOrigin(...(layer.origin ?? [0, 0]))
          .setScrollFactor(parallax, 1)
          .setDepth(depth)
          .setScale(layer.scale ?? 1)
          .setAlpha(layer.alpha ?? 1)
          .setFlipX(layer.flipX ?? false);
        if (layer.bob) this.tweens.add({ targets: img, y: img.y - layer.bob.y, duration: layer.bob.duration, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        return img;
      };
      if (layer.repeatX) {
        const first = make(layer.x ?? 0);
        const w = first.displayWidth;
        const coverage = (this.def.world.width - viewW) * parallax + viewW;
        const copies = Math.ceil(coverage / w);
        for (let i = 1; i <= copies; i++) make((layer.x ?? 0) + i * w);
        if (layer.id) this.layerImages.set(layer.id, first);
      } else {
        const img = make(layer.x ?? 0);
        if (layer.id) this.layerImages.set(layer.id, img);
      }
    });
  }

  private buildPlayer(): void {
    const { walk, player: cfg } = this.def;
    if (!walk || !cfg) return;
    const entry = this.def.entries[this.entry] ?? this.def.entries.default;
    this.player = createPlayer(this, entry.x, walk.y, cfg.scale, entry.facing);
    this.player.setDepth(cfg.depth ?? 50);
    if (cfg.tint !== undefined) this.player.setRigTint(cfg.tint);
    if (this.def.world.width > this.scale.gameSize.width) {
      this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    }
  }

  private buildHotspots(): void {
    this.tooltip = this.add.text(0, 0, '', {
      fontFamily: FontFamily, fontSize: '28px', fontStyle: 'bold', color: '#2b2130',
      backgroundColor: '#fff8ec', padding: { x: 16, y: 8 },
    }).setScrollFactor(0).setDepth(900).setVisible(false).setOrigin(0.5, 1);

    for (const h of this.def.hotspots) {
      const b = areaBounds(h.area);
      const zone = this.add.zone(b.x, b.y, b.w, b.h).setOrigin(0).setDepth(90);
      if ('points' in h.area) {
        const poly = new Phaser.Geom.Polygon(h.area.points.map(([x, y]) => new Phaser.Math.Vector2(x - b.x, y - b.y)));
        zone.setInteractive({ hitArea: poly, hitAreaCallback: Phaser.Geom.Polygon.Contains, useHandCursor: true });
      } else {
        zone.setInteractive({ useHandCursor: true });
      }
      const glowTarget = h.highlight ? this.layerImages.get(h.highlight) : undefined;
      let glow: { setActive(v: boolean): unknown } | undefined;
      if (glowTarget) {
        glowTarget.enableFilters();
        glow = glowTarget.filters!.internal.addGlow(0xfff1d6, 5, 0, 1, false, 10, 14);
        glow.setActive(false);
      }
      zone.on('pointerover', (p: Phaser.Input.Pointer) => {
        if (this.busy || !this.available(h)) return;
        glow?.setActive(true);
        this.tooltip.setText(h.label).setPosition(p.x, p.y - 24).setVisible(true);
      });
      zone.on('pointermove', (p: Phaser.Input.Pointer) => this.tooltip.visible && this.tooltip.setPosition(p.x, p.y - 24));
      zone.on('pointerout', () => {
        glow?.setActive(false);
        this.tooltip.setVisible(false);
      });
      zone.on('pointerup', () => {
        glow?.setActive(false);
        this.tooltip.setVisible(false);
        void this.activate(h);
      });
    }
  }

  private buildHud(): void {
    const tl = anchor(this, 'topLeft', 28);
    this.add.text(tl.x, tl.y, this.def.title, {
      fontFamily: FontFamily, fontSize: '30px', fontStyle: 'bold', color: '#fff8ec', stroke: '#2b2130', strokeThickness: 6,
    }).setScrollFactor(0).setDepth(800);
    const tr = anchor(this, 'topRight', 28);
    new Button(this, tr.x - 80, tr.y + 30, 'Menu', () => gotoTitle(this), { width: 160, height: 60, fontSize: 24 }).setScrollFactor(0).setDepth(800);
    if (this.def.world.width > GAME_WIDTH) {
      this.add.text(GAME_WIDTH / 2, tl.y + 8, 'click the street to walk · hover to explore', {
        fontFamily: FontFamily, fontSize: '22px', color: '#fff1d6', stroke: '#2b2130', strokeThickness: 4,
      }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(800).setAlpha(0.85);
    }
  }

  // ---------------------------------------------------------------- behaviour

  private available(h: HotspotDef): boolean {
    return guardPasses(h, (n) => services.state.getFlag(n));
  }

  private async activate(h: HotspotDef): Promise<void> {
    if (this.busy || !this.available(h)) return;
    this.busy = true;
    EventBus.emitEvent('hotspot:activated', this.def.id, h.id);
    try {
      if (h.walkTo !== undefined) await this.walkTo(h.walkTo);
      if (h.face) this.player?.setFacing(h.face);
      await this.runActions(h.actions);
    } finally {
      this.busy = false;
    }
  }

  private async runSequence(actions: Action[]): Promise<void> {
    this.busy = true;
    try {
      await this.runActions(actions);
    } finally {
      this.busy = false;
    }
  }

  walkTo(targetX: number): Promise<void> {
    const player = this.player;
    const walk = this.def.walk;
    if (!player || !walk) return Promise.resolve();
    const x = Phaser.Math.Clamp(targetX, walk.minX, walk.maxX);
    const dist = Math.abs(x - player.x);
    this.walkTween?.stop();
    if (dist < 6) {
      player.animator.play('idle');
      return Promise.resolve();
    }
    player.setFacing(x < player.x ? 'left' : 'right');
    player.animator.play('walk');
    return new Promise((resolve) => {
      this.walkTween = this.tweens.add({
        targets: player,
        x,
        duration: (dist / player.walkSpeed) * 1000,
        ease: 'Linear',
        onComplete: () => {
          player.animator.play('idle');
          resolve();
        },
        onStop: () => resolve(),
      });
    });
  }

  private async runActions(actions: Action[]): Promise<void> {
    for (const a of actions) {
      if (!guardPasses(a, (n) => services.state.getFlag(n))) continue;
      switch (a.type) {
        case 'dialogue':
          EventBus.emitEvent('dialogue:start', a.knot);
          await this.dialogue.play(this.runner, a.knot, { args: a.args, onTags: (tags) => this.onDialogueTags(tags) });
          EventBus.emitEvent('dialogue:end', a.knot);
          break;
        case 'goto':
        case 'cinematic':
        case 'mission':
          this.cameras.main.fadeOut(350, 0, 0, 0);
          await new Promise((r) => this.time.delayedCall(360, r));
          runTransition(this, a);
          return;
        case 'setFlag':
          services.state.setFlag(a.flag, a.value);
          break;
        case 'anim': {
          const p = this.player?.animator.playOnce(a.clip);
          if (a.wait) await p;
          break;
        }
        case 'land':
          await this.land(a.height ?? 600);
          break;
        case 'walkTo':
          await this.walkTo(a.x);
          if (a.face) this.player?.setFacing(a.face);
          break;
        case 'camera': {
          const cam = this.cameras.main;
          const d = services.state.settings.reducedMotion ? 0 : (a.duration ?? 600);
          if (a.zoom !== undefined) cam.zoomTo(a.zoom, d, 'Sine.easeInOut');
          if (a.x !== undefined || a.y !== undefined) cam.pan(a.x ?? cam.midPoint.x, a.y ?? cam.midPoint.y, d, 'Sine.easeInOut');
          await new Promise((r) => this.time.delayedCall(d, r));
          break;
        }
        case 'wait':
          await new Promise((r) => this.time.delayedCall(a.ms, r));
          break;
      }
    }
  }

  private onDialogueTags(tags: Record<string, string>): void {
    for (const [k, v] of Object.entries(tags)) EventBus.emitEvent('dialogue:tag', k, v);
    if (tags.anim && this.player) void this.player.animator.playOnce(tags.anim);
  }

  /** Portal arrival: drop from above, squash on landing, recover. */
  private async land(height: number): Promise<void> {
    const player = this.player;
    const walk = this.def.walk;
    if (!player || !walk) return;
    const baseY = walk.y;
    const sx = player.scaleX;
    const sy = player.scaleY;
    player.y = baseY - height;
    player.setAngle(-12);
    const ring = this.add.ellipse(player.x, baseY, 40, 12, Palette.amber, 0.7).setDepth((player.depth ?? 50) - 1);
    this.tweens.add({ targets: ring, scaleX: 9, scaleY: 4, alpha: 0, duration: 700, delay: 520 });
    await new Promise<void>((resolve) => this.tweens.add({ targets: player, y: baseY, angle: 0, duration: 560, ease: 'Quad.easeIn', onComplete: () => resolve() }));
    if (!services.state.settings.reducedMotion) this.cameras.main.shake(160, 0.004);
    await new Promise<void>((resolve) =>
      this.tweens.add({ targets: player, scaleY: sy * 0.82, scaleX: sx * 1.1, duration: 90, yoyo: true, ease: 'Quad.easeOut', onComplete: () => resolve() }),
    );
    player.setScale(sx, sy);
    ring.destroy();
  }
}
