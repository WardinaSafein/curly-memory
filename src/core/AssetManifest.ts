/**
 * Asset manifest types and expansion logic, shared by the build tool
 * (`tools/build-assets.ts`), the runtime loader and the tests.
 *
 * Two files:
 *  - Declared manifest (`src/content/assets/manifest.json`, hand-edited):
 *    what the game expects from the art team, with exact sizes and rules.
 *  - Runtime manifest (`public/assets/manifest.json`, generated): what was
 *    actually built: URL, real-or-placeholder, trim offsets.
 *
 * See docs/ASSET_MANIFEST.md for the full format reference.
 */
import { rigPartsFor, type Appearance, type RigDef } from '../systems/rig/RigDefinition';

export type AssetType = 'image' | 'rigPart';

export type PlaceholderMotif =
  | 'background'
  | 'object'
  | 'figure'
  | 'tile'
  | 'ring'
  | 'glyph'
  | 'streaks'
  | 'screen'
  | 'creature'
  | 'rig';

export interface PlaceholderSpec {
  motif?: PlaceholderMotif;
  label?: string;
  /** 1-3 hex colours; first is the main fill. */
  palette?: string[];
}

export interface DeclaredAsset {
  /** Unique runtime key, dot.case, e.g. `town.bldg.01`. May contain `{var}` placeholders. */
  key: string;
  /** Path inside `assets-src/`, snake_case file name. May contain `{var}` placeholders. */
  file: string;
  type?: AssetType;
  /** Exact expected source size in px [width, height]. */
  size: [number, number];
  /** true = must have transparency (sprites, layers); false = opaque (full backgrounds). */
  alpha: boolean;
  /** Minimum fully transparent border in px for alpha assets (default from manifest defaults). */
  padding?: number;
  /** Seamless tiling direction; tiling edges are exempt from the padding rule. */
  tile?: 'x' | 'y' | 'xy';
  /** Trim transparent borders on build and record offsets (default true for rigPart). */
  trim?: boolean;
  /** Missing file is an error instead of a placeholder. */
  required?: boolean;
  /** Expansion variables: every combination produces one asset. */
  vars?: Record<string, string[]>;
  placeholder?: PlaceholderSpec;
  notes?: string;
  /** Set on expanded rig parts. */
  rig?: { id: string; slot: string; state?: string };
}

export interface DeclaredRigSet {
  rig: string;
  /** Folder inside assets-src holding this rig's parts. */
  dir: string;
  /** Appearance combinations to build (each expands into every slot/state part). */
  appearances: Appearance[];
  /** Optional assembled reference render per appearance (for alignment comparison). */
  reference?: { key: string; file: string };
}

export interface DeclaredManifest {
  version: 1;
  defaults?: { padding?: number };
  assets: DeclaredAsset[];
  rigs?: DeclaredRigSet[];
}

export interface RuntimeAsset {
  key: string;
  type: AssetType;
  url: string;
  placeholder: boolean;
  /** Size of the file served (after trimming). */
  width: number;
  height: number;
  /** Original canvas size and where the trimmed image sits inside it. */
  source: { width: number; height: number };
  trim?: { x: number; y: number };
  rig?: { id: string; slot: string; state?: string };
}

export interface RuntimeManifest {
  version: 1;
  generatedAt: string;
  assets: Record<string, RuntimeAsset>;
  summary: { total: number; real: number; placeholders: number; warnings: number; errors: number };
}

const KEY_RE = /^[a-z0-9]+(\.[a-z0-9_]+)*$/;
const FILE_RE = /^([a-z0-9_]+\/)*[a-z0-9_]+\.png$/;

function substitute(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (m, name: string) => values[name] ?? m);
}

function combinations(vars: Record<string, string[]>): Record<string, string>[] {
  let out: Record<string, string>[] = [{}];
  for (const [name, values] of Object.entries(vars)) {
    out = out.flatMap((combo) => values.map((v) => ({ ...combo, [name]: v })));
  }
  return out;
}

/** Expand `vars` templates and rig sets into a flat, validated list of concrete assets. */
export function expandManifest(manifest: DeclaredManifest, rigs: Record<string, RigDef>): { assets: DeclaredAsset[]; problems: string[] } {
  const problems: string[] = [];
  const assets: DeclaredAsset[] = [];
  const defaultPadding = manifest.defaults?.padding ?? 16;

  for (const decl of manifest.assets) {
    const combos = decl.vars ? combinations(decl.vars) : [{}];
    for (const combo of combos) {
      const { vars: _vars, ...rest } = decl;
      assets.push({
        ...rest,
        type: decl.type ?? 'image',
        key: substitute(decl.key, combo),
        file: substitute(decl.file, combo),
        padding: decl.padding ?? (decl.alpha ? defaultPadding : 0),
        placeholder: decl.placeholder && {
          ...decl.placeholder,
          label: decl.placeholder.label && substitute(decl.placeholder.label, combo),
        },
      });
    }
  }

  for (const set of manifest.rigs ?? []) {
    const rig = rigs[set.rig];
    if (!rig) {
      problems.push(`Rig set references unknown rig "${set.rig}"`);
      continue;
    }
    const seen = new Set<string>();
    for (const appearance of set.appearances) {
      for (const part of rigPartsFor(rig, appearance)) {
        if (seen.has(part.key)) continue; // shared parts (e.g. same skin across outfits)
        seen.add(part.key);
        assets.push({
          key: part.key,
          file: `${set.dir}/${part.file}`,
          type: 'rigPart',
          size: [rig.canvas.width, rig.canvas.height],
          alpha: true,
          padding: rig.padding,
          trim: true,
          rig: { id: rig.id, slot: part.slot.id, state: part.state },
          placeholder: { motif: 'rig' },
        });
      }
      if (set.reference) {
        const key = substitute(set.reference.key, appearance);
        if (!seen.has(key)) {
          seen.add(key);
          assets.push({
            key,
            file: `${set.dir}/${substitute(set.reference.file, appearance)}`,
            type: 'image',
            size: [rig.canvas.width, rig.canvas.height],
            alpha: true,
            padding: rig.padding,
            placeholder: { motif: 'figure', label: 'reference render' },
            notes: 'Assembled full-character reference, used to check part alignment.',
          });
        }
      }
    }
  }

  const keys = new Set<string>();
  const files = new Set<string>();
  for (const a of assets) {
    if (/\{\w+\}/.test(a.key) || /\{\w+\}/.test(a.file)) problems.push(`Unresolved template in "${a.key}" / "${a.file}"`);
    if (!KEY_RE.test(a.key)) problems.push(`Key "${a.key}" must be lowercase dot.case`);
    if (!FILE_RE.test(a.file)) problems.push(`File "${a.file}" must be a lowercase snake_case .png path`);
    if (keys.has(a.key)) problems.push(`Duplicate key "${a.key}"`);
    if (files.has(a.file)) problems.push(`Duplicate file "${a.file}"`);
    keys.add(a.key);
    files.add(a.file);
    if (a.size[0] <= 0 || a.size[1] <= 0 || a.size[0] > 4096 || a.size[1] > 4096) problems.push(`"${a.key}" size must be 1..4096 px`);
  }
  return { assets, problems };
}
