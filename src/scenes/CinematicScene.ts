import Phaser from 'phaser';
import { SceneKeys } from '../config/game';
import { EventBus } from '../core/EventBus';
import { services } from '../core/Services';
import { CINEMATICS } from '../content/cinematics';
import { createStoryRunner } from '../content/story';
import { CinematicDirector } from '../systems/cinematics/Cinematic';
import { DialogueBox } from '../systems/dialogue/DialogueBox';
import { Button } from '../ui/Button';
import { anchor } from '../ui/layout';
import { runTransition } from './router';

/** Plays a CinematicDef (a list of beats) with a Skip button / Esc, then performs its follow-up action. */
export class CinematicScene extends Phaser.Scene {
  private cinematicId = 'portal';

  constructor() {
    super(SceneKeys.Cinematic);
  }

  init(data: { id: string }): void {
    this.cinematicId = data.id;
  }

  create(): void {
    const def = CINEMATICS[this.cinematicId];
    if (!def) throw new Error(`Unknown cinematic "${this.cinematicId}"`);
    this.cameras.main.setBackgroundColor('#000000');
    const stage = this.add.container(0, 0);
    const dialogue = new DialogueBox(this);
    const director = new CinematicDirector(this, stage, dialogue, createStoryRunner(), services.state.settings.reducedMotion);

    const tr = anchor(this, 'topRight', 28);
    const skip = new Button(this, tr.x - 80, tr.y + 30, 'Skip ▸▸', () => director.requestSkip(), { width: 160, height: 60, fontSize: 24 })
      .setScrollFactor(0).setDepth(1100);
    this.input.keyboard?.on('keydown-ESC', () => director.requestSkip());

    // UI lives on its own camera so beat zooms/shakes never move the Skip button or dialogue.
    const uiCam = this.cameras.add(0, 0, this.scale.gameSize.width, this.scale.gameSize.height);
    uiCam.ignore(stage);
    this.cameras.main.ignore([dialogue, skip]);

    EventBus.emitEvent('cinematic:start', def.id);
    // Dev helper: ?beat=<id> starts the cinematic at that beat.
    const from = services.params.get('beat');
    const start = from ? def.beats.findIndex((b) => b.id === from) : -1;
    const run = start > 0 ? { ...def, beats: def.beats.slice(start) } : def;
    void director.run(run).then(() => {
      skip.destroy();
      EventBus.emitEvent('cinematic:end', def.id);
      runTransition(this, def.then);
    });
  }
}
