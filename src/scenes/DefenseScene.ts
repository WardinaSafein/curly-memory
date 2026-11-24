import Phaser from 'phaser';
import { FontFamily, GAME_HEIGHT, GAME_WIDTH, Palette, SceneKeys } from '../config/game';
import { services } from '../core/Services';
import { MISSIONS, MISSION_MAPS } from '../content/missions';
import { CLUE_LABEL, DefenseState, type Decision, type MessageDef, type MissionDef, type Outcome } from '../systems/defense/DefenseModel';
import { Button } from '../ui/Button';
import { gotoLocation } from './router';

interface Walker {
  id: string;
  sprite: Phaser.GameObjects.Container;
  t: number;
  done: boolean;
}

const WALK_SECONDS = 30;          // time for a message to walk the whole road (calm pace)
const DEPTH = { world: 10, walker: 20, hud: 500, panel: 900, toast: 950 };

/**
 * "Defend the town": messages walk toward the town as creatures; the player inspects each one
 * and lets it in, blocks it or reports it. Time freezes while a panel is open, so this is about
 * careful thinking, not fast clicking. Rules live in DefenseModel (unit-tested).
 */
export class DefenseScene extends Phaser.Scene {
  private mission!: MissionDef;
  private state!: DefenseState;
  private path!: Phaser.Curves.Spline;
  private walkers: Walker[] = [];
  private waveIndex = 0;
  private queue: string[] = [];
  private spawnTimer = 0;
  private paused = true;
  private panel: Phaser.GameObjects.Container | null = null;
  private hud!: Phaser.GameObjects.Text;
  private hearts!: Phaser.GameObjects.Graphics;
  private tooltip!: Phaser.GameObjects.Text;
  private gate!: { x: number; y: number };

  constructor() {
    super(SceneKeys.Defense);
  }

  init(data: { missionId?: string }): void {
    this.mission = MISSIONS[data.missionId ?? 'ch1_phishing'];
    this.state = new DefenseState(this.mission);
    this.walkers = [];
    this.waveIndex = 0;
    this.queue = [];
    this.paused = true;
    this.panel = null;
  }

  create(): void {
    const map = MISSION_MAPS[this.mission.id];
    this.add.image(0, 0, map.background).setOrigin(0).setDepth(0);
    this.path = new Phaser.Curves.Spline(map.path.map(([x, y]) => new Phaser.Math.Vector2(x, y)));
    this.gate = map.gate;
    this.add.image(map.gate.x, map.gate.y, map.gateImage).setOrigin(0.5, 1).setScale(map.gateScale).setDepth(DEPTH.world);

    this.hearts = this.add.graphics().setDepth(DEPTH.hud);
    this.hud = this.add.text(40, 30, '', { fontFamily: FontFamily, fontSize: '26px', color: '#fff8ec', stroke: '#2b2130', strokeThickness: 6, lineSpacing: 8 }).setDepth(DEPTH.hud);
    new Button(this, GAME_WIDTH - 110, 60, 'Menu', () => this.scene.start(SceneKeys.Title), { width: 160, height: 60, fontSize: 24 }).setDepth(DEPTH.hud);
    this.tooltip = this.add.text(0, 0, '', { fontFamily: FontFamily, fontSize: '24px', color: '#2b2130', backgroundColor: '#fff8ec', padding: { x: 12, y: 6 } })
      .setOrigin(0.5, 1).setDepth(DEPTH.toast).setVisible(false);
    this.refreshHud();
    this.cameras.main.fadeIn(400, 0, 0, 0);
    this.showWaveIntro();
  }

  update(_time: number, delta: number): void {
    if (this.paused) return;
    const dt = delta / 1000;
    // spawn
    if (this.queue.length) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        this.spawn(this.queue.shift()!);
        this.spawnTimer = this.mission.waves[this.waveIndex].spacing;
      }
    }
    // walk
    for (const w of this.walkers) {
      if (w.done) continue;
      w.t += dt / WALK_SECONDS;
      if (w.t >= 1) {
        this.arriveUnchecked(w);
        continue;
      }
      const p = this.path.getPoint(w.t);
      w.sprite.setPosition(p.x, p.y);
      w.sprite.setDepth(DEPTH.walker + p.y / 10);
    }
    // wave finished?
    if (!this.queue.length && this.walkers.length && this.walkers.every((w) => w.done)) this.endWave();
  }

  // ------------------------------------------------------------------ walkers

  private spawn(id: string): void {
    const m = this.state.message(id);
    const start = this.path.getPoint(0);
    const img = this.add.image(0, 0, `defense.creature.${m.creature}`).setOrigin(0.5, 1).setScale(0.3);
    const body = this.add.container(0, 0, [img]);
    const sprite = this.add.container(start.x, start.y, [body]).setDepth(DEPTH.walker);
    sprite.setSize(img.displayWidth, img.displayHeight);
    sprite.setInteractive({ hitArea: new Phaser.Geom.Rectangle(-img.displayWidth / 2, -img.displayHeight, img.displayWidth, img.displayHeight), hitAreaCallback: Phaser.Geom.Rectangle.Contains, useHandCursor: true });
    // a little walking life: bob, wobble, squash
    this.tweens.add({ targets: body, y: -10, duration: 260, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.tweens.add({ targets: body, angle: { from: -4, to: 4 }, duration: 520, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.tweens.add({ targets: img, scaleY: 0.28, duration: 260, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    const w: Walker = { id, sprite, t: 0, done: false };
    sprite.on('pointerover', () => !this.panel && this.showTooltip(sprite.x, sprite.y - img.displayHeight - 10, `From: ${m.fromName}`));
    sprite.on('pointerout', () => this.tooltip.setVisible(false));
    sprite.on('pointerup', () => {
      if (this.panel || w.done) return;
      this.tooltip.setVisible(false);
      this.openInspect(w);
    });
    this.walkers.push(w);
  }

  private arriveUnchecked(w: Walker): void {
    w.done = true;
    const o = this.state.decide(w.id, 'unchecked');
    this.playEffect(w, o);
    this.toast(o.correct ? 'A genuine message was delivered.' : 'A disguised message slipped in unchecked!', o.correct ? '#9fd8b0' : '#ffb3a7');
    this.refreshHud();
    this.checkLoss();
  }

  // ------------------------------------------------------------------ inspect panel

  private openInspect(w: Walker): void {
    const m = this.state.message(w.id);
    this.paused = true;
    const pw = 1180, ph = 760, px = (GAME_WIDTH - pw) / 2, py = (GAME_HEIGHT - ph) / 2;
    const c = this.add.container(0, 0).setDepth(DEPTH.panel);
    this.panel = c;
    const shade = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x1b1424, 0.55).setOrigin(0).setInteractive();
    const g = this.add.graphics();
    g.fillStyle(Palette.inkSoft, 0.35).fillRoundedRect(px + 8, py + 12, pw, ph, 28);
    g.fillStyle(Palette.paper, 1).fillRoundedRect(px, py, pw, ph, 28);
    g.lineStyle(5, Palette.inkSoft, 1).strokeRoundedRect(px, py, pw, ph, 28);
    c.add([shade, g]);

    const text = (x: number, y: number, s: string, size = 28, opts: Phaser.Types.GameObjects.Text.TextStyle = {}): Phaser.GameObjects.Text => {
      const t = this.add.text(x, y, s, { fontFamily: FontFamily, fontSize: `${size}px`, color: '#2b2130', wordWrap: { width: pw - 120 }, lineSpacing: 6, ...opts });
      c.add(t);
      return t;
    };
    let y = py + 40;
    text(px + 50, y, '⏸  Time is frozen while you inspect', 20, { color: '#86608e' });
    y += 44;
    text(px + 50, y, `From: ${m.fromName}`, 32, { fontStyle: 'bold' });
    const senderLine = text(px + 50, y + 44, 'Address hidden: tap "Check sender"', 24, { color: '#7a6f66' });
    const checkBtn = new Button(this, px + pw - 190, y + 30, 'Check sender', () => {
      senderLine.setText(`<${m.fromAddress}>${m.replyTo ? `\nReplies go to: <${m.replyTo}>` : ''}`).setColor('#2b2130');
      checkBtn.setVisible(false);
    }, { width: 240, height: 56, fontSize: 22 });
    c.add(checkBtn);
    y += 130 + (m.replyTo ? 34 : 0);
    text(px + 50, y, m.subject, 30, { fontStyle: 'bold' });
    y += 54;
    const bodyText = text(px + 50, y, m.body, 26);
    y += bodyText.height + 24;
    if (m.link) {
      const link = text(px + 50, y, `🔗 ${m.link.text}`, 26, { color: '#1f6f8b', fontStyle: 'bold' });
      const real = text(px + 50, y + 40, 'Hover over the link to see where it really goes', 22, { color: '#7a6f66' });
      link.setInteractive({ useHandCursor: true });
      link.on('pointerover', () => real.setText(`Really goes to: ${m.link!.url}`).setColor('#2b2130'));
      y += 84;
    }
    if (m.attachment) {
      text(px + 50, y, `📎 Attachment: ${m.attachment}`, 26, { fontStyle: 'bold' });
      y += 50;
    }
    const hintText = text(px + 50, py + ph - 190, '', 22, { color: '#86608e', fontStyle: 'italic' });
    const hintBtn = new Button(this, px + pw - 150, py + ph - 175, 'Ask Gus', () => hintText.setText(`Gus: "${m.hint}"`), { width: 180, height: 52, fontSize: 21 });
    c.add(hintBtn);

    const decide = (d: Decision): void => this.resolve(w, d);
    const by = py + ph - 80;
    c.add(new Button(this, px + pw / 2 - 360, by, 'Let it in', () => decide('letIn'), { width: 320, height: 76, fontSize: 28, fill: 0xcfe8d2 }));
    c.add(new Button(this, px + pw / 2, by, 'Block', () => decide('block'), { width: 320, height: 76, fontSize: 28, fill: 0xe8dccb }));
    c.add(new Button(this, px + pw / 2 + 360, by, 'Report to Gus', () => decide('report'), { width: 320, height: 76, fontSize: 28, fill: 0xf6c1b4 }));
  }

  private resolve(w: Walker, d: Decision): void {
    w.done = true;
    const o = this.state.decide(w.id, d);
    this.closePanel();
    this.refreshHud();
    this.showFeedback(this.state.message(w.id), o, () => {
      this.playEffect(w, o);
      if (!this.checkLoss()) this.paused = false;
    });
  }

  private showFeedback(m: MessageDef, o: Outcome, onClose: () => void): void {
    const pw = 1100, ph = 520, px = (GAME_WIDTH - pw) / 2, py = (GAME_HEIGHT - ph) / 2;
    const c = this.add.container(0, 0).setDepth(DEPTH.panel);
    this.panel = c;
    const g = this.add.graphics();
    const tone = o.quality === 'best' ? 0xcfe8d2 : o.quality === 'ok' ? 0xfff1d6 : 0xf6d3cb;
    c.add(this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x1b1424, 0.55).setOrigin(0).setInteractive());
    g.fillStyle(tone, 1).fillRoundedRect(px, py, pw, ph, 28);
    g.lineStyle(5, Palette.inkSoft, 1).strokeRoundedRect(px, py, pw, ph, 28);
    c.add(g);
    const title = o.quality === 'best' ? '✔ Great call!' : o.quality === 'ok' ? '✔ Safe, but…' : '✘ Not quite';
    c.add(this.add.text(px + 50, py + 40, title, { fontFamily: FontFamily, fontSize: '44px', fontStyle: 'bold', color: '#2b2130' }));
    c.add(this.add.text(px + 50, py + 110, `It was ${m.threat ? 'a threat in disguise' : 'a genuine message'}.`, { fontFamily: FontFamily, fontSize: '26px', color: '#5a4f45' }));
    c.add(this.add.text(px + 50, py + 160, o.feedback, { fontFamily: FontFamily, fontSize: '27px', color: '#2b2130', wordWrap: { width: pw - 100 }, lineSpacing: 6 }));
    if (m.clues.length) {
      c.add(this.add.text(px + 50, py + ph - 150, `Clues: ${m.clues.map((k) => CLUE_LABEL[k]).join(' · ')}`, { fontFamily: FontFamily, fontSize: '23px', color: '#86608e', fontStyle: 'bold', wordWrap: { width: pw - 100 } }));
    }
    c.add(new Button(this, px + pw / 2, py + ph - 60, 'Continue', () => {
      this.closePanel();
      onClose();
    }, { width: 280, height: 70, fontSize: 28 }));
  }

  private closePanel(): void {
    this.panel?.destroy();
    this.panel = null;
  }

  /** Visual reaction of the creature after a decision. */
  private playEffect(w: Walker, o: Outcome): void {
    const s = w.sprite;
    s.disableInteractive();
    const threat = this.state.message(w.id).threat;
    if (o.decision === 'block') {
      this.tweens.add({ targets: s, scale: 0, alpha: 0, angle: 180, duration: 500, ease: 'Back.easeIn', onComplete: () => s.destroy() });
      return;
    }
    if (o.decision === 'report') {
      const label = this.add.text(s.x, s.y - 170, threat ? 'Reported!' : 'Reported (false alarm)', { fontFamily: FontFamily, fontSize: '28px', fontStyle: 'bold', color: threat ? '#ffe08a' : '#fff8ec', stroke: '#2b2130', strokeThickness: 6 }).setOrigin(0.5).setDepth(DEPTH.toast);
      this.tweens.add({ targets: label, y: label.y - 60, alpha: 0, duration: 1400, onComplete: () => label.destroy() });
      if (threat) this.cameras.main.flash(200, 255, 240, 200);
      this.tweens.add({ targets: s, y: s.y - 120, alpha: 0, duration: 700, ease: 'Sine.easeIn', onComplete: () => s.destroy() });
      return;
    }
    // let in / unchecked: hurry to the gate and go inside
    this.tweens.add({
      targets: s, x: this.gate.x, y: this.gate.y - 20, duration: 600, ease: 'Sine.easeIn',
      onComplete: () => {
        if (o.healthDelta < 0) this.cameras.main.shake(260, 0.006);
        if (o.mfaUsed) this.toast('MFA Gate held!', '#9fd8b0');
        this.tweens.add({ targets: s, scale: 0.2, alpha: 0, duration: 260, onComplete: () => s.destroy() });
      },
    });
  }

  // ------------------------------------------------------------------ waves and results

  private showWaveIntro(): void {
    const wave = this.mission.waves[this.waveIndex];
    if (wave.unlock) this.state.unlock(wave.unlock);
    this.refreshHud();
    this.modal(`Wave ${this.waveIndex + 1} of ${this.mission.waves.length}`, `Gus: "${wave.intro}"`, 'Start', () => {
      this.queue = [...wave.messages];
      this.spawnTimer = 0.5;
      this.paused = false;
    });
  }

  private endWave(): void {
    this.paused = true;
    for (const w of this.walkers) w.sprite.destroy();
    this.walkers = [];
    this.waveIndex++;
    if (this.waveIndex < this.mission.waves.length) {
      this.time.delayedCall(700, () => this.showWaveIntro());
    } else {
      this.time.delayedCall(700, () => this.showResults());
    }
  }

  private checkLoss(): boolean {
    if (!this.state.lost) return false;
    this.paused = true;
    this.time.delayedCall(600, () => this.modal('The Mail Thief got through', 'Too many disguised messages reached the town. Gus: "Let\'s try again: check the sender and where links really go."', 'Try again', () => this.scene.restart({ missionId: this.mission.id })));
    return true;
  }

  private showResults(): void {
    const r = this.state.results();
    const stars = '★'.repeat(r.stars) + '☆'.repeat(3 - r.stars);
    const lines = [
      `${stars}`,
      `Correct decisions: ${r.correct} / ${r.total}`,
      `Threats reported: ${r.threatsReported}`,
      `Threats that got in: ${r.threatsMissed}`,
      `Genuine messages blocked: ${r.genuineBlocked}`,
      `XP earned: ${r.xp}`,
    ].join('\n');
    const prevBest = Number(services.state.getFlag('ch1_stars') ?? 0);
    services.state.setFlag('ch1_complete', true);
    services.state.setFlag('ch1_stars', Math.max(prevBest, r.stars));
    services.state.setFlag('xp', Number(services.state.getFlag('xp') ?? 0) + r.xp);
    this.modal(`${this.mission.title}: complete!`, lines, 'Back to CyberTown', () => gotoLocation(this, 'cybertown', 'post_office'), {
      label: 'Play again', onClick: () => this.scene.restart({ missionId: this.mission.id }),
    });
  }

  private modal(title: string, body: string, okLabel: string, onOk: () => void, second?: { label: string; onClick: () => void }): void {
    const pw = 1000, ph = 560, px = (GAME_WIDTH - pw) / 2, py = (GAME_HEIGHT - ph) / 2;
    const c = this.add.container(0, 0).setDepth(DEPTH.panel);
    this.panel = c;
    const g = this.add.graphics();
    c.add(this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x1b1424, 0.55).setOrigin(0).setInteractive());
    g.fillStyle(Palette.paper, 1).fillRoundedRect(px, py, pw, ph, 28);
    g.lineStyle(5, Palette.inkSoft, 1).strokeRoundedRect(px, py, pw, ph, 28);
    c.add(g);
    c.add(this.add.text(GAME_WIDTH / 2, py + 60, title, { fontFamily: FontFamily, fontSize: '42px', fontStyle: 'bold', color: '#2b2130' }).setOrigin(0.5));
    c.add(this.add.text(GAME_WIDTH / 2, py + 130, body, { fontFamily: FontFamily, fontSize: '30px', color: '#2b2130', align: 'center', wordWrap: { width: pw - 120 }, lineSpacing: 10 }).setOrigin(0.5, 0));
    const close = (fn: () => void) => () => {
      this.closePanel();
      fn();
    };
    if (second) {
      c.add(new Button(this, GAME_WIDTH / 2 - 190, py + ph - 70, okLabel, close(onOk), { width: 340, height: 72, fontSize: 26 }));
      c.add(new Button(this, GAME_WIDTH / 2 + 190, py + ph - 70, second.label, close(second.onClick), { width: 340, height: 72, fontSize: 26 }));
    } else {
      c.add(new Button(this, GAME_WIDTH / 2, py + ph - 70, okLabel, close(onOk), { width: 340, height: 72, fontSize: 28 }));
    }
  }

  // ------------------------------------------------------------------ HUD

  private refreshHud(): void {
    const wave = Math.min(this.waveIndex + 1, this.mission.waves.length);
    const mfa = this.state.mfaCharges > 0 ? `   MFA Gate ×${this.state.mfaCharges}` : '';
    this.hud.setText(`Chapter 1 · ${this.mission.title}\nWave ${wave}/${this.mission.waves.length}    Score ${this.state.score}${mfa}`);
    const g = this.hearts.clear();
    const y = 125;
    for (let i = 0; i < this.mission.health; i++) {
      g.fillStyle(i < this.state.health ? 0xe05a5a : 0x5a4a52, 1).fillCircle(60 + i * 40, y, 14);
    }
    for (let i = 0; i < this.mission.trust; i++) {
      g.fillStyle(i < this.state.trust ? 0x6fb7d6 : 0x5a4a52, 1).fillRoundedRect(300 + i * 40 - 13, y - 13, 26, 26, 6);
    }
    if (!this.healthLabels) {
      this.healthLabels = true;
      this.add.text(40, y + 22, 'Town health', { fontFamily: FontFamily, fontSize: '18px', color: '#fff8ec', stroke: '#2b2130', strokeThickness: 4 }).setDepth(DEPTH.hud);
      this.add.text(286, y + 22, 'Trust', { fontFamily: FontFamily, fontSize: '18px', color: '#fff8ec', stroke: '#2b2130', strokeThickness: 4 }).setDepth(DEPTH.hud);
    }
  }
  private healthLabels = false;

  private showTooltip(x: number, y: number, s: string): void {
    this.tooltip.setText(s).setPosition(x, y).setVisible(true);
  }

  private toast(s: string, color: string): void {
    const t = this.add.text(GAME_WIDTH / 2, 200, s, { fontFamily: FontFamily, fontSize: '30px', fontStyle: 'bold', color, stroke: '#2b2130', strokeThickness: 6 }).setOrigin(0.5).setDepth(DEPTH.toast);
    this.tweens.add({ targets: t, alpha: 0, y: 160, delay: 2200, duration: 600, onComplete: () => t.destroy() });
  }
}
