import { describe, expect, it } from 'vitest';
import declared from '../src/content/assets/manifest.json';
import rigJson from '../src/content/characters/player.rig.json';
import { expandManifest, type DeclaredManifest } from '../src/core/AssetManifest';
import type { RigDef } from '../src/systems/rig/RigDefinition';

const rigs = { player: rigJson as unknown as RigDef };

describe('asset manifest', () => {
  const { assets, problems } = expandManifest(declared as unknown as DeclaredManifest, rigs);

  it('expands without problems', () => {
    expect(problems).toEqual([]);
  });

  it('expands vars and rig sets into concrete assets', () => {
    const keys = assets.map((a) => a.key);
    expect(keys).toContain('town.bldg.05');
    expect(keys).toContain('fx.glyph.shield');
    expect(keys).toContain('player.eyes.e01.closed');
    expect(keys).toContain('player.ref.o01');
    expect(assets.filter((a) => a.type === 'rigPart')).toHaveLength(28);
  });

  it('gives rig parts the shared canvas size and trimming', () => {
    const torso = assets.find((a) => a.key === 'player.outfit.o01.torso')!;
    expect(torso).toMatchObject({ file: 'characters/player/player_outfit_o01_torso.png', size: [1024, 1536], alpha: true, trim: true });
  });

  it('rejects bad keys, file names and duplicates', () => {
    const bad: DeclaredManifest = {
      version: 1,
      assets: [
        { key: 'Bad Key', file: 'scenes/x.png', size: [10, 10], alpha: true },
        { key: 'ok.one', file: 'scenes/Has Space.png', size: [10, 10], alpha: true },
        { key: 'ok.two', file: 'scenes/a.png', size: [10, 10], alpha: true },
        { key: 'ok.two', file: 'scenes/b.png', size: [10, 10], alpha: true },
      ],
    };
    const { problems: p } = expandManifest(bad, rigs);
    expect(p.some((m) => m.includes('Bad Key'))).toBe(true);
    expect(p.some((m) => m.includes('Has Space'))).toBe(true);
    expect(p.some((m) => m.includes('Duplicate key "ok.two"'))).toBe(true);
  });
});
