import Phaser from 'phaser';
import type { DialogueBox } from '../dialogue/DialogueBox';
import type { DialogueRunner } from '../dialogue/DialogueRunner';
import type { Action } from '../scene/SceneDefinition';

/**
 * Modular cinematics. A cinematic is an ordered list of *beats*; each beat is
 * a small async function that builds its own visuals on a shared stage and
 * resolves when it's done. Beats can be reordered, replaced or reused across
 * cinematics without touching each other (see src/content/cinematics/portal).
 *
 * Skipping: every wait/tween/dialogue goes through the context, so when the
 * player skips, pending waits resolve, tweens jump to their end and dialogue
 * auto-advances: beats don't need any skip logic of their own.
 */
export interface CinematicContext {
  scene: Phaser.Scene;
  /** Root container for beat visuals (world space, camera-affected). */
  stage: Phaser.GameObjects.Container;
  /** Values shared between beats (e.g. the laptop group built by one beat, zoomed by the next). */
  store: Map<string, unknown>;
  readonly skipping: boolean;
  readonly reducedMotion: boolean;
  wait(ms: number): Promise<void>;
  tween(config: Phaser.Types.Tweens.TweenBuilderConfig): Promise<void>;
  dialogue(knot: string): Promise<void>;
  /** Camera helpers that respect reduced motion. */
  shake(duration: number, intensity: number): void;
  flash(duration: number, color?: number): Promise<void>;
}

export interface Beat {
  id: string;
  run(ctx: CinematicContext): Promise<void>;
}

export interface CinematicDef {
  id: string;
  beats: Beat[];
  /** What happens after the last beat (usually a scene change). */
  then: Action;
}

export class CinematicDirector implements CinematicContext {
  readonly store = new Map<string, unknown>();
  private skip = false;
  private readonly pendingWaits = new Set<() => void>();
  private readonly activeTweens = new Set<Phaser.Tweens.Tween>();

  constructor(
    readonly scene: Phaser.Scene,
    readonly stage: Phaser.GameObjects.Container,
    private readonly dialogueBox: DialogueBox,
    private readonly runner: DialogueRunner,
    readonly reducedMotion: boolean,
  ) {}

  get skipping(): boolean {
    return this.skip;
  }

  requestSkip(): void {
    if (this.skip) return;
    this.skip = true;
    for (const resolve of this.pendingWaits) resolve();
    this.pendingWaits.clear();
    for (const t of this.activeTweens) t.complete();
    this.activeTweens.clear();
    this.scene.cameras.main.resetFX();
  }

  wait(ms: number): Promise<void> {
    if (this.skip || ms <= 0) return Promise.resolve();
    return new Promise((resolve) => {
      const done = (): void => {
        this.pendingWaits.delete(done);
        resolve();
      };
      this.pendingWaits.add(done);
      this.scene.time.delayedCall(ms, done);
    });
  }

  tween(config: Phaser.Types.Tweens.TweenBuilderConfig): Promise<void> {
    return new Promise((resolve) => {
      const tween = this.scene.tweens.add({
        ...config,
        onComplete: (...args: unknown[]) => {
          this.activeTweens.delete(tween);
          (config.onComplete as ((...a: unknown[]) => void) | undefined)?.(...args);
          resolve();
        },
      });
      this.activeTweens.add(tween);
      if (this.skip) tween.complete();
    });
  }

  async dialogue(knot: string): Promise<void> {
    await this.dialogueBox.play(this.runner, knot, { auto: this.skip });
  }

  shake(duration: number, intensity: number): void {
    if (this.reducedMotion || this.skip) return;
    this.scene.cameras.main.shake(duration, intensity);
  }

  flash(duration: number, color = 0xffffff): Promise<void> {
    if (this.skip) return Promise.resolve();
    const cam = this.scene.cameras.main;
    const r = (color >> 16) & 255, g = (color >> 8) & 255, b = color & 255;
    // Reduced motion: a slow fade instead of a hard flash.
    if (this.reducedMotion) cam.fadeOut(duration, r, g, b);
    else cam.flash(duration, r, g, b, true);
    return this.wait(duration);
  }

  async run(def: CinematicDef): Promise<void> {
    for (const beat of def.beats) {
      await beat.run(this);
    }
  }
}
