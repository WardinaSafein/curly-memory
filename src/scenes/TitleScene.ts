import Phaser from 'phaser';
import { FontFamily, GAME_WIDTH, SceneKeys } from '../config/game';
import { services } from '../core/Services';
import { Button } from '../ui/Button';
import { gotoLocation, playCinematic } from './router';

/** Title screen. The secondary row is a review menu for the prototype (jump straight to any part). */
export class TitleScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.Title);
  }

  create(): void {
    this.add.image(0, 0, 'title.bg').setOrigin(0);
    this.add.text(GAME_WIDTH / 2, 230, 'CyberWR', { fontFamily: FontFamily, fontSize: '128px', fontStyle: 'bold', color: '#fff8ec', stroke: '#2b2130', strokeThickness: 12 }).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, 330, 'prototype build: placeholder art', { fontFamily: FontFamily, fontSize: '30px', color: '#fff1d6', stroke: '#2b2130', strokeThickness: 6 }).setOrigin(0.5);

    new Button(this, GAME_WIDTH / 2, 520, 'Start', () => gotoLocation(this, 'bedroom'), { width: 360, height: 84, fontSize: 36 });

    const review: [string, () => void][] = [
      ['Rig Lab', () => this.scene.start(SceneKeys.RigLab)],
      ['Bedroom', () => gotoLocation(this, 'bedroom')],
      ['Portal cinematic', () => playCinematic(this, 'portal')],
      ['CyberTown', () => gotoLocation(this, 'cybertown', 'portal')],
      ['Reset save', () => { services.state.reset(); this.scene.restart(); }],
    ];
    this.add.text(GAME_WIDTH / 2, 660, 'Jump to', { fontFamily: FontFamily, fontSize: '26px', color: '#fff1d6', stroke: '#2b2130', strokeThickness: 5 }).setOrigin(0.5);
    review.forEach(([label, fn], i) => new Button(this, GAME_WIDTH / 2 + (i - 2) * 300, 740, label, fn, { width: 270, height: 64, fontSize: 24 }));

    const s = services.assets.summary;
    if (s) {
      this.add.text(GAME_WIDTH / 2, 1030, `Assets: ${s.real} delivered · ${s.placeholders} placeholders${s.errors ? ` · ${s.errors} errors (see npm run assets)` : ''}`, {
        fontFamily: FontFamily, fontSize: '22px', color: '#fff1d6', stroke: '#2b2130', strokeThickness: 4,
      }).setOrigin(0.5);
    }
  }
}
