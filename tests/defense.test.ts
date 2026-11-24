import { describe, expect, it } from 'vitest';
import { ch1Phishing } from '../src/content/missions/ch1_phishing';
import { DefenseState } from '../src/systems/defense/DefenseModel';

describe('defend the town: chapter 1 content', () => {
  it('has 3 waves of 4 messages, all defined, with a mix of threats and genuine ones', () => {
    const state = new DefenseState(ch1Phishing);
    expect(ch1Phishing.waves).toHaveLength(3);
    const ids = ch1Phishing.waves.flatMap((w) => w.messages);
    expect(new Set(ids).size).toBe(12);
    for (const w of ch1Phishing.waves) {
      const threats = w.messages.filter((id) => state.message(id).threat).length;
      expect(threats, w.id).toBeGreaterThanOrEqual(1);
      expect(threats, w.id).toBeLessThan(w.messages.length);
    }
  });

  it('every threat names its clues and every message explains itself', () => {
    for (const m of ch1Phishing.messages) {
      expect(m.explain.length, m.id).toBeGreaterThan(20);
      expect(m.hint.length, m.id).toBeGreaterThan(10);
      if (m.threat) expect(m.clues.length, m.id).toBeGreaterThan(0);
      else expect(m.clues, m.id).toEqual([]);
    }
  });
});

describe('defend the town: rules', () => {
  it('reporting a threat is best, blocking is ok, letting it in costs health', () => {
    const s = new DefenseState(ch1Phishing);
    expect(s.decide('m2', 'report').quality).toBe('best');
    expect(s.decide('m4', 'block').quality).toBe('ok');
    const o = s.decide('m5', 'letIn');
    expect(o.correct).toBe(false);
    expect(s.health).toBe(ch1Phishing.health - 1);
  });

  it('blocking or reporting a genuine message costs trust, not health', () => {
    const s = new DefenseState(ch1Phishing);
    s.decide('m1', 'block');
    s.decide('m3', 'report');
    expect(s.trust).toBe(ch1Phishing.trust - 2);
    expect(s.health).toBe(ch1Phishing.health);
  });

  it('a message reaching the gate unchecked counts as let in', () => {
    const s = new DefenseState(ch1Phishing);
    expect(s.decide('m7', 'unchecked').healthDelta).toBe(-1);
    expect(s.decide('m8', 'unchecked').correct).toBe(true);
  });

  it('the MFA gate absorbs one stolen password', () => {
    const s = new DefenseState(ch1Phishing);
    s.unlock('mfa');
    const first = s.decide('m4', 'letIn');
    expect(first.mfaUsed).toBe(true);
    expect(s.health).toBe(ch1Phishing.health);
    const second = s.decide('m9', 'letIn');
    expect(second.mfaUsed).toBe(false);
    expect(s.health).toBe(ch1Phishing.health - 1);
  });

  it('cannot decide the same message twice; perfect play earns 3 stars', () => {
    const s = new DefenseState(ch1Phishing);
    for (const m of ch1Phishing.messages) s.decide(m.id, m.threat ? 'report' : 'letIn');
    expect(() => s.decide('m1', 'letIn')).toThrow();
    const r = s.results();
    expect(r).toMatchObject({ correct: 12, total: 12, threatsMissed: 0, genuineBlocked: 0, stars: 3 });
    expect(r.xp).toBeGreaterThan(0);
  });
});
