import Phaser from 'phaser';
import { FontFamily, Palette } from '../config/game';
import { MIN_TOUCH_TARGET } from './layout';

export interface ButtonOptions {
  width?: number;
  height?: number;
  fontSize?: number;
  fill?: number;
  textColor?: string;
  active?: boolean;
}

/** Rounded, hand-drawn-style button. Pointer events only, so mouse and touch both work. */
export class Button extends Phaser.GameObjects.Container {
  private readonly bg: Phaser.GameObjects.Graphics;
  readonly label: Phaser.GameObjects.Text;
  private hovered = false;
  private pressed = false;
  private isActive: boolean;
  private enabled = true;
  readonly w: number;
  readonly h: number;

  constructor(scene: Phaser.Scene, x: number, y: number, text: string, private readonly onClick: () => void, private readonly opts: ButtonOptions = {}) {
    super(scene, x, y);
    this.w = opts.width ?? 280;
    this.h = Math.max(opts.height ?? 64, Math.min(MIN_TOUCH_TARGET, opts.height ?? 64));
    this.isActive = opts.active ?? false;
    this.bg = scene.add.graphics();
    this.label = scene.add.text(0, 0, text, {
      fontFamily: FontFamily,
      fontSize: `${opts.fontSize ?? 26}px`,
      color: opts.textColor ?? '#2b2130',
      fontStyle: 'bold',
      align: 'center',
    }).setOrigin(0.5);
    this.add([this.bg, this.label]);
    this.setSize(this.w, this.h);
    this.setInteractive({ useHandCursor: true });
    this.on('pointerover', () => { this.hovered = true; this.redraw(); });
    this.on('pointerout', () => { this.hovered = false; this.pressed = false; this.redraw(); });
    this.on('pointerdown', (_p: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation();
      this.pressed = true;
      this.redraw();
    });
    this.on('pointerup', (_p: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation();
      if (this.pressed && this.enabled) this.onClick();
      this.pressed = false;
      this.redraw();
    });
    this.redraw();
    scene.add.existing(this);
  }

  setActiveState(active: boolean): this {
    this.isActive = active;
    this.redraw();
    return this;
  }

  setEnabled(enabled: boolean): this {
    this.enabled = enabled;
    this.setAlpha(enabled ? 1 : 0.45);
    return this;
  }

  private redraw(): void {
    const g = this.bg;
    const base = this.opts.fill ?? Palette.paper;
    const fill = this.isActive ? Palette.amber : this.hovered ? 0xfff1d6 : base;
    const dy = this.pressed ? 3 : 0;
    g.clear();
    g.fillStyle(Palette.inkSoft, 0.35).fillRoundedRect(-this.w / 2 + 3, -this.h / 2 + 6, this.w, this.h, 18);
    g.fillStyle(fill, 1).fillRoundedRect(-this.w / 2, -this.h / 2 + dy, this.w, this.h, 18);
    g.lineStyle(4, Palette.inkSoft, 1).strokeRoundedRect(-this.w / 2, -this.h / 2 + dy, this.w, this.h, 18);
    this.label.setY(dy);
  }
}
