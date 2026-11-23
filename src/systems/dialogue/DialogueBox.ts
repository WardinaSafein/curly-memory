import Phaser from 'phaser';
import { FontFamily, Palette } from '../../config/game';
import { services } from '../../core/Services';
import { view } from '../../ui/layout';
import type { DialogueRunner, DialogueStep } from './DialogueRunner';

export type TagHandler = (tags: Record<string, string>) => void | Promise<void>;

/**
 * Bottom-of-screen dialogue panel: speaker plate, typewriter text, choices.
 * Click / tap / Space / Enter advances; 1-9 pick choices. While open it
 * swallows pointer input so the scene's hotspots don't react underneath.
 */
export class DialogueBox extends Phaser.GameObjects.Container {
  private readonly blocker: Phaser.GameObjects.Zone;
  private readonly panel: Phaser.GameObjects.Graphics;
  private readonly plate: Phaser.GameObjects.Graphics;
  private readonly speaker: Phaser.GameObjects.Text;
  private readonly bodyText: Phaser.GameObjects.Text;
  private readonly more: Phaser.GameObjects.Text;
  private choiceTexts: Phaser.GameObjects.Text[] = [];
  private fullText = '';
  private typing: Phaser.Time.TimerEvent | null = null;
  private advance: (() => void) | null = null;
  private pick: ((index: number) => void) | null = null;
  private readonly panelRect: Phaser.Geom.Rectangle;

  constructor(scene: Phaser.Scene) {
    super(scene, 0, 0);
    const v = view(scene);
    const w = Math.min(1600, v.width - 64);
    const h = 250;
    this.panelRect = new Phaser.Geom.Rectangle((v.width - w) / 2, v.height - h - 32, w, h);
    const r = this.panelRect;

    this.blocker = scene.add.zone(0, 0, v.width, v.height).setOrigin(0).setInteractive();
    this.blocker.on('pointerup', () => this.onAdvance());
    this.panel = scene.add.graphics();
    this.panel.fillStyle(Palette.inkSoft, 0.35).fillRoundedRect(r.x + 6, r.y + 10, r.width, r.height, 28);
    this.panel.fillStyle(Palette.paper, 0.97).fillRoundedRect(r.x, r.y, r.width, r.height, 28);
    this.panel.lineStyle(5, Palette.inkSoft, 1).strokeRoundedRect(r.x, r.y, r.width, r.height, 28);
    this.plate = scene.add.graphics();
    this.speaker = scene.add.text(r.x + 64, r.y - 4, '', { fontFamily: FontFamily, fontSize: '30px', fontStyle: 'bold', color: '#2b2130' }).setOrigin(0, 0.5);
    this.bodyText = scene.add.text(r.x + 48, r.y + 44, '', {
      fontFamily: FontFamily,
      fontSize: '34px',
      color: '#2b2130',
      lineSpacing: 10,
      wordWrap: { width: r.width - 96, useAdvancedWrap: true },
    });
    this.more = scene.add.text(r.right - 56, r.bottom - 34, '▼', { fontFamily: FontFamily, fontSize: '28px', color: '#86608e' }).setOrigin(0.5);
    scene.tweens.add({ targets: this.more, y: this.more.y + 6, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    this.add([this.blocker, this.panel, this.plate, this.speaker, this.bodyText, this.more]);
    this.setScrollFactor(0).setDepth(1000).setVisible(false);
    scene.add.existing(this);

    const kb = scene.input.keyboard;
    kb?.on('keydown-SPACE', this.onAdvance, this);
    kb?.on('keydown-ENTER', this.onAdvance, this);
    kb?.on('keydown', this.onKey, this);
    this.once(Phaser.GameObjects.Events.DESTROY, () => {
      kb?.off('keydown-SPACE', this.onAdvance, this);
      kb?.off('keydown-ENTER', this.onAdvance, this);
      kb?.off('keydown', this.onKey, this);
    });
  }

  get isOpen(): boolean {
    return this.visible;
  }

  /** Play a knot to its end. Tags on each line are passed to `onTags` before the line shows. */
  async play(runner: DialogueRunner, knot: string, opts: { args?: (string | number | boolean)[]; onTags?: TagHandler; auto?: boolean } = {}): Promise<void> {
    runner.start(knot, opts.args);
    this.setVisible(true);
    try {
      for (;;) {
        const step: DialogueStep = runner.next();
        if (step.kind === 'end') break;
        if (step.kind === 'line') {
          if (Object.keys(step.tags).length && opts.onTags) await opts.onTags(step.tags);
          await this.showLine(step.text, step.speaker, opts.auto);
        } else {
          const index = opts.auto ? step.choices[0].index : await this.showChoices(step.choices);
          runner.choose(index);
        }
      }
    } finally {
      this.clearChoices();
      this.setVisible(false);
    }
  }

  private showLine(text: string, speaker: string | undefined, auto = false): Promise<void> {
    this.clearChoices();
    this.setSpeaker(speaker);
    this.fullText = text;
    this.more.setVisible(false);
    const cps = services.state.settings.textSpeed;
    if (auto || cps <= 0) {
      this.finishTyping();
    } else {
      this.bodyText.setText('');
      let shown = 0;
      this.typing = this.scene.time.addEvent({
        delay: 1000 / cps,
        loop: true,
        callback: () => {
          shown++;
          this.bodyText.setText(text.slice(0, shown));
          if (shown >= text.length) this.finishTyping();
        },
      });
    }
    if (auto) return Promise.resolve();
    return new Promise((resolve) => {
      this.advance = () => {
        if (this.typing) return this.finishTyping();
        this.advance = null;
        resolve();
      };
    });
  }

  private finishTyping(): void {
    this.typing?.remove();
    this.typing = null;
    this.bodyText.setText(this.fullText);
    this.more.setVisible(true);
  }

  private showChoices(choices: { index: number; text: string }[]): Promise<number> {
    this.clearChoices();
    this.more.setVisible(false);
    const r = this.panelRect;
    return new Promise((resolve) => {
      this.pick = (i) => {
        const c = choices[i];
        if (!c) return;
        this.pick = null;
        resolve(c.index);
      };
      choices.forEach((c, i) => {
        const spacing = Math.min(62, 190 / choices.length);
        const t = this.scene.add.text(r.x + 64, r.y + 36 + i * spacing, `${i + 1}.  ${c.text}`, {
          fontFamily: FontFamily, fontSize: '32px', color: '#5b3f6e', fontStyle: 'bold',
        }).setInteractive({ useHandCursor: true });
        t.on('pointerover', () => t.setColor('#c0392b'));
        t.on('pointerout', () => t.setColor('#5b3f6e'));
        t.on('pointerup', (_p: Phaser.Input.Pointer, _x: number, _y: number, e: Phaser.Types.Input.EventData) => {
          e.stopPropagation();
          this.pick?.(i);
        });
        this.choiceTexts.push(t);
        this.add(t);
      });
      this.bodyText.setText('');
    });
  }

  private clearChoices(): void {
    for (const t of this.choiceTexts) t.destroy();
    this.choiceTexts = [];
  }

  private setSpeaker(name?: string): void {
    this.plate.clear();
    this.speaker.setText(name ?? '');
    if (!name) return;
    const r = this.panelRect;
    const w = this.speaker.width + 56;
    this.plate.fillStyle(Palette.amber, 1).fillRoundedRect(r.x + 36, r.y - 30, w, 54, 18);
    this.plate.lineStyle(4, Palette.inkSoft, 1).strokeRoundedRect(r.x + 36, r.y - 30, w, 54, 18);
  }

  private onAdvance(): void {
    if (this.visible) this.advance?.();
  }

  private onKey(e: KeyboardEvent): void {
    if (!this.visible || !this.pick) return;
    const n = Number.parseInt(e.key, 10);
    if (n >= 1 && n <= 9) this.pick(n - 1);
  }
}
