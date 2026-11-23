import Phaser from 'phaser';
import { FontFamily, GAME_HEIGHT, GAME_WIDTH, Palette, SceneKeys } from '../config/game';
import { services } from '../core/Services';
import { startFromUrl } from './router';

/** Loads every asset in the manifest with a progress bar. (Per-scene loading comes with the full game.) */
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.Preload);
  }

  preload(): void {
    const w = 720, h = 26, x = (GAME_WIDTH - w) / 2, y = GAME_HEIGHT / 2;
    this.add.text(GAME_WIDTH / 2, y - 60, 'CyberWR', { fontFamily: FontFamily, fontSize: '56px', color: '#fff8ec', fontStyle: 'bold' }).setOrigin(0.5);
    const frame = this.add.graphics().lineStyle(4, Palette.paper, 1).strokeRoundedRect(x, y, w, h, 13);
    const bar = this.add.graphics();
    this.load.on(Phaser.Loader.Events.PROGRESS, (p: number) => {
      bar.clear().fillStyle(Palette.amber, 1).fillRoundedRect(x + 4, y + 4, Math.max(18, (w - 8) * p), h - 8, 9);
    });
    void frame;
    services.assets.queueAll(this.load);
  }

  create(): void {
    startFromUrl(this);
  }
}
