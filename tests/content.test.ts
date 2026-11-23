import { describe, expect, it } from 'vitest';
import declared from '../src/content/assets/manifest.json';
import rigJson from '../src/content/characters/player.rig.json';
import { SCENES } from '../src/content/scenes';
import storyJson from '../src/content/story/prototype.ink';
import { expandManifest, type DeclaredManifest } from '../src/core/AssetManifest';
import { DialogueRunner } from '../src/systems/dialogue/DialogueRunner';
import type { RigDef } from '../src/systems/rig/RigDefinition';
import { validateScene } from '../src/systems/scene/SceneDefinition';

function runner(flags: Record<string, unknown> = {}): DialogueRunner {
  return new DialogueRunner(storyJson, {
    getFlag: (n) => flags[n] as boolean | undefined,
    setFlag: (n, v) => { flags[n] = v; },
    playerName: () => 'Sam',
  });
}

describe('scenes', () => {
  const { assets } = expandManifest(declared as unknown as DeclaredManifest, { player: rigJson as unknown as RigDef });
  const assetKeys = new Set(assets.map((a) => a.key));
  const r = runner();
  const knots = new Set<string>();
  for (const def of Object.values(SCENES)) {
    for (const h of def.hotspots) for (const a of h.actions) if (a.type === 'dialogue') knots.add(a.knot);
    for (const e of Object.values(def.entries)) for (const a of e.actions ?? []) if (a.type === 'dialogue') knots.add(a.knot);
  }

  it.each(Object.values(SCENES).map((d) => [d.id, d] as const))('%s references only known assets, scenes and cinematics', (_id, def) => {
    expect(validateScene(def, { assetKeys, scenes: new Set(Object.keys(SCENES)), cinematics: new Set(['portal']) })).toEqual([]);
  });

  it('every dialogue knot used by a scene exists in the story', () => {
    for (const k of knots) expect(r.hasKnot(k), k).toBe(true);
  });
});

describe('dialogue runner', () => {
  it('parses speakers, substitutes the player name and forwards tags', () => {
    const d = runner({});
    d.start('cybertown_arrival');
    const first = d.next();
    expect(first).toMatchObject({ kind: 'line', speaker: 'Sam', tags: { anim: 'surprise' } });
    expect(d.next()).toMatchObject({ kind: 'line', speaker: 'Gus' });
  });

  it('presents choices and writes flags back to game state', () => {
    const flags: Record<string, unknown> = {};
    const d = runner(flags);
    d.start('bedroom_laptop');
    expect(d.next()).toMatchObject({ kind: 'line' });
    const choices = d.next();
    expect(choices.kind).toBe('choices');
    d.choose(0);
    while (d.next().kind !== 'end') { /* drain */ }
    expect(flags.laptop_open).toBe(true);
    expect(flags.laptop_seen).toBe(true);
  });

  it('passes knot arguments (locked district names)', () => {
    const d = runner();
    d.start('building_locked', ['Data Harbour']);
    const line = d.next();
    expect(line.kind === 'line' && line.text).toContain('Data Harbour');
  });
});
