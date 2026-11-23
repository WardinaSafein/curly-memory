import type { Appearance } from '../systems/rig/RigDefinition';
import type { SaveService } from './SaveService';

export interface Settings {
  /** Characters per second for the dialogue typewriter (0 = instant). */
  textSpeed: number;
  /** Softer camera moves, no shake, no flashes. Defaults to the OS preference. */
  reducedMotion: boolean;
  volume: number;
}

export interface SaveData {
  version: 1;
  playerName: string;
  appearance: Appearance;
  flags: Record<string, boolean | number | string>;
  sceneId: string | null;
  settings: Settings;
}

export const DEFAULT_APPEARANCE: Appearance = { skin: 's01', hair: 'h01', outfit: 'o01', eyes: 'e01', brows: 'b01', mouth: 'm01' };

function prefersReducedMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function freshSave(): SaveData {
  return {
    version: 1,
    playerName: 'Alex',
    appearance: { ...DEFAULT_APPEARANCE },
    flags: {},
    sceneId: null,
    settings: { textSpeed: 45, reducedMotion: prefersReducedMotion(), volume: 0.8 },
  };
}

/** Single source of truth for progress. Systems read/write through this and it persists itself. */
export class GameState {
  private data: SaveData;
  private listeners = new Set<() => void>();

  constructor(private readonly saves: SaveService, private readonly slot = 'save1') {
    const loaded = saves.load<SaveData>(slot);
    this.data = loaded?.version === 1 ? { ...freshSave(), ...loaded, settings: { ...freshSave().settings, ...loaded.settings } } : freshSave();
  }

  get snapshot(): Readonly<SaveData> {
    return this.data;
  }

  get appearance(): Appearance {
    return this.data.appearance;
  }

  get settings(): Settings {
    return this.data.settings;
  }

  getFlag(name: string): boolean | number | string | undefined {
    return this.data.flags[name];
  }

  setFlag(name: string, value: boolean | number | string): void {
    this.data.flags[name] = value;
    this.commit();
  }

  update(patch: Partial<Omit<SaveData, 'version'>>): void {
    this.data = { ...this.data, ...patch };
    this.commit();
  }

  reset(): void {
    this.data = freshSave();
    this.saves.clear(this.slot);
    this.commit();
  }

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private commit(): void {
    this.saves.save(this.slot, this.data);
    for (const fn of this.listeners) fn();
  }
}
