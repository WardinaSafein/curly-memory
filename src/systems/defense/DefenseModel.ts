/**
 * "Defend the town": rules as pure logic (no Phaser), unit-tested.
 *
 * Messages walk toward the town as creatures. Some are genuine, some are threats in
 * disguise. The player inspects each one and decides: let it in, block it, or report it.
 *  - threat let in      -> town health -1 (unless an MFA gate absorbs a stolen password)
 *  - threat blocked     -> safe, but nobody else is warned
 *  - threat reported    -> best: safe AND the whole town is warned (bonus)
 *  - genuine let in     -> correct
 *  - genuine blocked    -> trust -1 (real work stopped)
 *  - genuine reported   -> trust -1, gentler feedback (reporting when unsure is OK)
 * A message that reaches the gate without a decision counts as "let in, unchecked".
 */

export type Decision = 'letIn' | 'block' | 'report';
export type Clue = 'sender' | 'replyTo' | 'link' | 'attachment' | 'request' | 'urgency';
export type CreatureKind = 'letter' | 'parcel' | 'courier';

export interface MessageDef {
  id: string;
  creature: CreatureKind;
  fromName: string;
  fromAddress: string;
  /** Where replies actually go, if different from the sender. */
  replyTo?: string;
  subject: string;
  body: string;
  link?: { text: string; url: string };
  attachment?: string;
  threat: boolean;
  /** For threats: the warning signs present. For genuine messages: empty. */
  clues: Clue[];
  /** Asks for a password / login: an MFA gate can stop the damage if it gets in. */
  stealsPassword?: boolean;
  /** Shown after the decision: what to notice and why. */
  explain: string;
  /** Gus's hint when the player asks for help (never gives the answer away). */
  hint: string;
}

export interface WaveDef {
  id: string;
  intro: string;
  messages: string[];
  /** Seconds between creatures in this wave. */
  spacing: number;
  /** Habit unlocked before this wave starts (shown by Gus). */
  unlock?: 'mfa';
}

export interface MissionDef {
  id: string;
  title: string;
  villain: string;
  health: number;
  trust: number;
  messages: MessageDef[];
  waves: WaveDef[];
}

export interface Outcome {
  messageId: string;
  decision: Decision | 'unchecked';
  correct: boolean;
  /** best = reported a threat; ok = correct but not the best response */
  quality: 'best' | 'ok' | 'wrong';
  healthDelta: number;
  trustDelta: number;
  points: number;
  mfaUsed: boolean;
  feedback: string;
}

export const CLUE_LABEL: Record<Clue, string> = {
  sender: 'Sender address',
  replyTo: 'Reply goes elsewhere',
  link: 'Link destination',
  attachment: 'Attachment',
  request: 'Unusual request',
  urgency: 'Pressure / urgency',
};

export class DefenseState {
  health: number;
  trust: number;
  score = 0;
  mfaCharges = 0;
  readonly outcomes: Outcome[] = [];
  private readonly byId: Map<string, MessageDef>;

  constructor(readonly mission: MissionDef) {
    this.health = mission.health;
    this.trust = mission.trust;
    this.byId = new Map(mission.messages.map((m) => [m.id, m]));
    for (const w of mission.waves) for (const id of w.messages) if (!this.byId.has(id)) throw new Error(`Wave ${w.id} references unknown message ${id}`);
  }

  message(id: string): MessageDef {
    const m = this.byId.get(id);
    if (!m) throw new Error(`Unknown message ${id}`);
    return m;
  }

  get lost(): boolean {
    return this.health <= 0;
  }

  decided(id: string): boolean {
    return this.outcomes.some((o) => o.messageId === id);
  }

  unlock(what: 'mfa'): void {
    if (what === 'mfa') this.mfaCharges += 1;
  }

  /** Apply a decision (or 'unchecked' when a message reaches the gate untouched). */
  decide(id: string, decision: Decision | 'unchecked'): Outcome {
    if (this.decided(id)) throw new Error(`Message ${id} already decided`);
    const m = this.message(id);
    const letIn = decision === 'letIn' || decision === 'unchecked';
    let o: Outcome;
    if (m.threat) {
      if (letIn) {
        const mfa = Boolean(m.stealsPassword && this.mfaCharges > 0);
        if (mfa) this.mfaCharges -= 1;
        o = {
          messageId: id, decision, correct: false, quality: 'wrong', mfaUsed: mfa,
          healthDelta: mfa ? 0 : -1, trustDelta: 0, points: 0,
          feedback: mfa
            ? 'That was a trap, but the MFA gate held: a stolen password alone wasn\'t enough. ' + m.explain
            : (decision === 'unchecked' ? 'It slipped in before anyone checked it. ' : 'That was the Mail Thief in disguise. ') + m.explain,
        };
      } else if (decision === 'report') {
        o = { messageId: id, decision, correct: true, quality: 'best', mfaUsed: false, healthDelta: 0, trustDelta: 0, points: 150,
          feedback: 'Reported! The whole town is warned. ' + m.explain };
      } else {
        o = { messageId: id, decision, correct: true, quality: 'ok', mfaUsed: false, healthDelta: 0, trustDelta: 0, points: 80,
          feedback: 'Blocked, so you\'re safe. Reporting it as well would have warned everyone else. ' + m.explain };
      }
    } else if (letIn) {
      o = { messageId: id, decision, correct: true, quality: decision === 'unchecked' ? 'ok' : 'best', mfaUsed: false, healthDelta: 0, trustDelta: 0,
        points: decision === 'unchecked' ? 40 : 100, feedback: 'Genuine message, delivered. ' + m.explain };
    } else if (decision === 'report') {
      o = { messageId: id, decision, correct: false, quality: 'wrong', mfaUsed: false, healthDelta: 0, trustDelta: -1, points: 20,
        feedback: 'Reporting when you\'re unsure is never a bad habit, but this one was genuine. ' + m.explain };
    } else {
      o = { messageId: id, decision, correct: false, quality: 'wrong', mfaUsed: false, healthDelta: 0, trustDelta: -1, points: 0,
        feedback: 'That one was genuine. Blocking it stopped real work in town. ' + m.explain };
    }
    this.health = Math.max(0, this.health + o.healthDelta);
    this.trust = Math.max(0, this.trust + o.trustDelta);
    this.score += o.points;
    this.outcomes.push(o);
    return o;
  }

  /** Summary for the results screen. */
  results(): { correct: number; total: number; threatsReported: number; threatsMissed: number; genuineBlocked: number; stars: number; xp: number } {
    const total = this.outcomes.length;
    const correct = this.outcomes.filter((o) => o.correct).length;
    const threatsReported = this.outcomes.filter((o) => o.quality === 'best' && this.message(o.messageId).threat).length;
    const threatsMissed = this.outcomes.filter((o) => !o.correct && this.message(o.messageId).threat).length;
    const genuineBlocked = this.outcomes.filter((o) => !o.correct && !this.message(o.messageId).threat).length;
    const ratio = total ? correct / total : 0;
    const stars = this.lost ? 0 : ratio >= 0.9 ? 3 : ratio >= 0.7 ? 2 : 1;
    return { correct, total, threatsReported, threatsMissed, genuineBlocked, stars, xp: Math.round(this.score / 10) };
  }
}
