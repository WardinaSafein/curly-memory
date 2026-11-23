import Phaser from 'phaser';
import { FontFamily, Palette, SceneKeys } from '../config/game';
import { services } from '../core/Services';
import { createPlayer, playerRig } from '../content/characters/player';
import type { CutoutRig } from '../systems/rig/CutoutRig';
import { rigPartsFor } from '../systems/rig/RigDefinition';
import { Button } from '../ui/Button';
import { gotoTitle } from './router';

const LIGHTING: Record<string, number> = { Neutral: 0xffffff, 'Desk lamp': 0xffe0c2, 'Town dusk': 0xe2dcf2 };
const BACKDROPS = [0xece5d8, 0x6b5a6e, 0x2f4858];

/**
 * Rig validation tool. Plays idle / blink / walk / surprise on the test
 * character, overlays the rig template and the artist's reference render
 * (onion skin) for alignment checks, shows bones, and lists which parts are
 * still placeholders. Open with ?scene=riglab or from the title screen.
 */
export class RigLabScene extends Phaser.Scene {
  private big!: CutoutRig;
  private small!: CutoutRig;
  private overlay: Phaser.GameObjects.Image | null = null;
  private reference: Phaser.GameObjects.Image | null = null;
  private design: Phaser.GameObjects.Image | null = null;
  private view = { x: 560, y: 1010, scale: 0.6 };
  private readonly toggles = new Map<string, Button>();
  private backdrop!: Phaser.GameObjects.Rectangle;
  private backdropIndex = 0;
  private smallWalkTween: Phaser.Tweens.Tween | null = null;
  private speed = 1;

  constructor() {
    super(SceneKeys.RigLab);
  }

  create(): void {
    this.backdrop = this.add.rectangle(0, 0, 1160, 1080, BACKDROPS[0]).setOrigin(0);
    this.add.rectangle(1160, 0, 760, 1080, Palette.ink).setOrigin(0);
    this.add.line(0, 0, 0, this.view.y, 1160, this.view.y, 0x3b2a26, 0.35).setOrigin(0);

    if (this.textures.exists('dev.rig_template')) {
      this.overlay = this.add.image(0, 0, 'dev.rig_template').setOrigin(0).setAlpha(0.45).setVisible(false);
    }
    if (this.textures.exists('dev.design_ref')) {
      this.design = this.add.image(0, 0, 'dev.design_ref').setOrigin(0).setAlpha(0.5).setVisible(false).setDepth(4);
    }
    const refKey = `player.ref.${services.state.appearance.outfit}`;
    if (this.textures.exists(refKey)) {
      this.reference = this.add.image(0, 0, refKey).setOrigin(0).setAlpha(0.5).setVisible(false).setDepth(5);
    }

    this.big = createPlayer(this, this.view.x, this.view.y, this.view.scale);
    this.big.setDepth(2);
    this.small = createPlayer(this, 1000, this.view.y, 0.34);
    this.add.text(1000, this.view.y + 18, 'in-game size', { fontFamily: FontFamily, fontSize: '18px', color: '#5a4f45' }).setOrigin(0.5, 0);

    this.buildPanel();
    this.syncOverlays();
  }

  update(): void {
    this.syncOverlays();
  }

  private syncOverlays(): void {
    const s = this.view.scale;
    const flip = this.big.facing === 'left';
    for (const img of [this.overlay, this.design, this.reference]) {
      if (!img) continue;
      const [rx, ry] = playerRig.bones[0].pivot;
      img.setScale(s).setFlipX(flip);
      img.setPosition(flip ? this.big.x - (playerRig.canvas.width - rx) * s : this.big.x - rx * s, this.big.y - ry * s);
    }
  }

  private buildPanel(): void {
    const x0 = 1200;
    let y = 40;
    const heading = (t: string): void => {
      this.add.text(x0, y, t, { fontFamily: FontFamily, fontSize: '22px', fontStyle: 'bold', color: '#f6bd60' });
      y += 36;
    };
    new Button(this, 1840, 62, 'Menu', () => gotoTitle(this), { width: 120, height: 52, fontSize: 20 });
    this.add.text(x0, y, `Rig Lab · player rig v${playerRig.version}`, { fontFamily: FontFamily, fontSize: '36px', fontStyle: 'bold', color: '#fff8ec' });
    y += 64;

    const row = (items: [string, () => void, string?][], width = 160): void => {
      items.forEach(([label, fn, toggleId], i) => {
        const b = new Button(this, x0 + width / 2 + i * (width + 12), y + 28, label, fn, { width, height: 56, fontSize: 21 });
        if (toggleId) this.toggles.set(toggleId, b);
      });
      y += 76;
    };

    heading('Animations');
    row([
      ['Idle', () => this.playBase('idle'), 'anim:idle'],
      ['Walk', () => this.playBase('walk'), 'anim:walk'],
      ['Surprise', () => this.oneShot('surprise')],
      ['Blink', () => { this.big.blink.blinkNow(); this.small.blink.blinkNow(); }],
    ]);

    heading('Checks');
    row([
      ['Template', () => this.toggleVisible(this.overlay, 'template'), 'template'],
      ['Design', () => this.toggleVisible(this.design, 'design'), 'design'],
      ['Reference', () => this.toggleVisible(this.reference, 'reference'), 'reference'],
      ['Bones', () => this.toggleBones(), 'bones'],
    ]);
    row([
      ['Auto-blink', () => this.toggleBlink(), 'blink'],
      ['Face zoom', () => this.toggleZoom(), 'zoom'],
      ['Backdrop', () => this.cycleBackdrop()],
      ['Flip', () => { this.big.setFacing(this.big.facing === 'left' ? 'right' : 'left'); }],
    ]);

    heading('Scene lighting (multiply tint)');
    row(Object.entries(LIGHTING).map(([name, color]) => [name, () => this.setLighting(name, color), `light:${name}`] as [string, () => void, string]), 214);

    heading('Speed');
    row([0.25, 0.5, 1].map((v) => [`${v}×`, () => this.setSpeed(v), `speed:${v}`] as [string, () => void, string]), 214);

    heading('Parts delivered');
    const parts = rigPartsFor(playerRig, services.state.appearance);
    const delivered = parts.filter((p) => !services.assets.isPlaceholder(p.key));
    this.add.text(x0, y, `${delivered.length} of ${parts.length} part images are real art; the rest are placeholders.`, {
      fontFamily: FontFamily, fontSize: '20px', color: '#fff8ec', wordWrap: { width: 680 },
    });
    y += 40;
    const cols = 2;
    const perCol = Math.ceil(parts.length / cols);
    parts.forEach((p, i) => {
      const real = !services.assets.isPlaceholder(p.key);
      const col = Math.floor(i / perCol);
      const r = i % perCol;
      this.add.text(x0 + col * 350, y + r * 22, `${real ? '✓' : '·'} ${p.file.replace('player_', '').replace('.png', '')}`, {
        fontFamily: FontFamily, fontSize: '16px', color: real ? '#9fd8d0' : '#a99fb3',
      });
    });

    this.setActive('anim:idle', true);
    this.setActive('blink', true);
    this.setActive('light:Neutral', true);
    this.setActive('speed:1', true);
    this.input.keyboard?.on('keydown-W', () => this.playBase('walk'));
    this.input.keyboard?.on('keydown-I', () => this.playBase('idle'));
    this.input.keyboard?.on('keydown-S', () => this.oneShot('surprise'));
    this.input.keyboard?.on('keydown-B', () => this.big.blink.blinkNow());
  }

  private setActive(id: string, on: boolean): void {
    this.toggles.get(id)?.setActiveState(on);
  }

  private playBase(name: 'idle' | 'walk'): void {
    for (const r of [this.big, this.small]) r.animator.play(name);
    this.setActive('anim:idle', name === 'idle');
    this.setActive('anim:walk', name === 'walk');
    this.smallWalkTween?.stop();
    this.small.x = 1000;
    this.small.setFacing('right');
    if (name === 'walk') {
      // The small preview actually travels at the rig's stride speed, to check for foot sliding.
      const travel = (to: number): void => {
        this.small.setFacing(to > this.small.x ? 'right' : 'left');
        this.smallWalkTween = this.tweens.add({
          targets: this.small, x: to, duration: (Math.abs(to - this.small.x) / this.small.walkSpeed) * 1000 / this.speed, ease: 'Linear',
          onComplete: () => travel(to > 1000 ? 860 : 1120),
        });
      };
      travel(1120);
    }
  }

  private oneShot(name: string): void {
    void this.big.animator.playOnce(name);
    void this.small.animator.playOnce(name);
  }

  private toggleVisible(img: Phaser.GameObjects.Image | null, id: string): void {
    if (!img) return;
    img.setVisible(!img.visible);
    this.setActive(id, img.visible);
  }

  private bonesOn = false;
  private toggleBones(): void {
    this.bonesOn = !this.bonesOn;
    this.big.showBones(this.bonesOn);
    this.setActive('bones', this.bonesOn);
  }

  private toggleBlink(): void {
    const on = !this.big.blink.enabled;
    this.big.blink.enabled = on;
    this.small.blink.enabled = on;
    this.setActive('blink', on);
  }

  private zoomed = false;
  private toggleZoom(): void {
    this.zoomed = !this.zoomed;
    const head = playerRig.bones.find((b) => b.id === 'head')!.pivot;
    const root = playerRig.bones[0].pivot;
    if (this.zoomed) {
      const s = 1.5;
      this.view = { x: 560 - (head[0] - root[0]) * s, y: 560 + (root[1] - head[1] + 100) * s, scale: s };
    } else {
      this.view = { x: 560, y: 1010, scale: 0.6 };
    }
    this.big.setPosition(this.view.x, this.view.y).setRigScale(this.view.scale);
    this.setActive('zoom', this.zoomed);
  }

  private cycleBackdrop(): void {
    this.backdropIndex = (this.backdropIndex + 1) % BACKDROPS.length;
    this.backdrop.setFillStyle(BACKDROPS[this.backdropIndex]);
  }

  private setLighting(name: string, color: number): void {
    this.big.setRigTint(color);
    this.small.setRigTint(color);
    for (const n of Object.keys(LIGHTING)) this.setActive(`light:${n}`, n === name);
  }

  private setSpeed(v: number): void {
    this.speed = v;
    this.big.animator.timeScale = v;
    this.small.animator.timeScale = v;
    for (const s of [0.25, 0.5, 1]) this.setActive(`speed:${s}`, s === v);
    if (this.big.animator.baseClip === 'walk') this.playBase('walk');
  }
}
