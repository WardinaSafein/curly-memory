# CyberWR: Asset Manifest Format

The game never loads an image by path. It asks for an **asset key**, and the manifest maps keys to
files. There are two manifests:

| | File | Written by | Purpose |
|---|---|---|---|
| **Declared** | `src/content/assets/manifest.json` | humans | What the game expects: key, file, exact size, rules, placeholder look |
| **Runtime** | `public/assets/manifest.json` | `npm run assets` (generated, git-ignored) | What was built: URL, real or placeholder, trim offsets |

Types live in [`src/core/AssetManifest.ts`](../src/core/AssetManifest.ts) and are shared by the
build tool, the game and the tests.

---

## 1. Declared manifest

```jsonc
{
  "version": 1,
  "defaults": { "padding": 16 },          // default transparent border for alpha assets
  "assets": [ /* DeclaredAsset, ... */ ],
  "rigs":   [ /* DeclaredRigSet, ... */ ]
}
```

### 1.1 `DeclaredAsset`

| Field | Type | Required | Meaning |
|---|---|---|---|
| `key` | string | ✓ | Runtime key, lowercase `dot.case` (`town.bldg.01`). May contain `{var}`. Must be unique. |
| `file` | string | ✓ | Path inside `assets-src/`, lowercase `snake_case`, `.png`. May contain `{var}`. Must be unique. |
| `size` | `[w, h]` | ✓ | **Exact** source canvas size in px (1–4096). |
| `alpha` | boolean | ✓ | `true` = must contain transparency (sprites, layers); `false` = fully opaque (full backgrounds). |
| `type` | `"image"` \| `"rigPart"` | | Default `image`. `rigPart` is set automatically for rig sets. |
| `padding` | number | | Minimum empty border in px (alpha assets). Default `defaults.padding`; use `0` for full-bleed layers. |
| `tile` | `"x"` \| `"y"` \| `"xy"` | | Seamless tiling. The tiling edges are exempt from the padding rule. |
| `trim` | boolean | | Crop transparent borders on build and record the offset. Use for objects placed by their bottom edge. |
| `required` | boolean | | Missing file = build **error** instead of a placeholder. (Not used during prototyping.) |
| `vars` | `{ name: string[] }` | | Expansion: one asset per combination; `{name}` is substituted in `key`, `file` and `placeholder.label`. |
| `placeholder` | object | | `{ motif?, label?, palette? }`, the look of the generated stand-in. Motifs: `background`, `object`, `figure`, `tile`, `ring`, `glyph`, `streaks`, `screen`. |
| `notes` | string | | Free text for humans. |

Example with variables (expands to five assets, `town.bldg.01` … `town.bldg.05`):

```json
{
  "key": "town.bldg.{n}", "file": "scenes/cybertown/town_bldg_{n}.png",
  "size": [800, 900], "alpha": true, "trim": true,
  "vars": { "n": ["01", "02", "03", "04", "05"] },
  "placeholder": { "motif": "object", "label": "Game building {n}", "palette": ["#c98a5e", "#e8c39e", "#f6bd60"] }
}
```

### 1.2 `DeclaredRigSet`

Rig parts are not listed one by one: they are derived from the rig definition
(`src/content/characters/<rig>.rig.json`), whose slots carry `key` and `file` templates.

| Field | Type | Meaning |
|---|---|---|
| `rig` | string | Rig id (`player`). |
| `dir` | string | Folder in `assets-src/` holding the parts (`characters/player`). |
| `appearances` | `Appearance[]` | Variant combinations to build, e.g. `{ "skin": "s01", "hair": "h01", "outfit": "o01", "eyes": "e01", "brows": "b01", "mouth": "m01" }`. Each expands to every slot × state; parts shared between appearances are built once. |
| `reference` | `{ key, file }` | Optional assembled reference render per appearance (templated, e.g. `player_ref_{outfit}.png`). |

Every rig part gets `size` = the rig canvas (1024×1536), `alpha: true`, `trim: true` and the rig's
padding automatically. Slot templates in the rig:

```json
{ "id": "eyes", "bone": "head", "family": "eyes",
  "key": "player.eyes.{eyes}.{state}", "file": "player_eyes_{eyes}_{state}.png",
  "states": ["open", "half", "closed", "wide"], "default": "open", "shape": { ... } }
```

`{family}` placeholders come from the appearance, `{state}` from the slot's states.

## 2. Build: `npm run assets`

For each expanded asset:

1. **Look for** `assets-src/<file>`.
2. **Validate** if present:

   | Check | Level |
   |---|---|
   | Not a PNG | error |
   | Wrong canvas size | error |
   | `alpha: true` but every pixel is opaque | error |
   | Rig part is completely empty | error |
   | `alpha: true` with no alpha channel but a flat `#00FF00` background | warning (auto-keyed) |
   | `alpha: false` but has transparent pixels | warning |
   | Visible pixels inside the padding border | warning |
   | White halo / green spill on semi-transparent edges | warning |
   | Rig part centre far from its template position | warning |
   | Rig part does not extend past its joint | warning |
   | File in `assets-src/` that no manifest entry expects | warning |

3. **Errors → placeholder.** The file is reported and a placeholder is used until it's fixed, so
   the game never breaks. Warnings still use the delivered file.
4. **Missing → placeholder**, labelled with the file name and size.
5. **Trim** (when `trim`): crop to the visible pixels plus a 2 px margin, and record the offset.
6. **Write** `public/assets/<file>`.

It also writes:

- `public/assets/manifest.json`, the runtime manifest (below);
- `public/assets/_reports/asset-report.json`, every issue with its level;
- `public/assets/_reports/<rig>_<outfit>_composite.png`, all rig parts stacked at rest pose. This
  is a quick visual alignment check, and the Rig Lab overlays the reference render on the same
  canvas.

`npm run assets:validate` runs the checks without writing anything and exits with code 1 on errors
(CI-friendly).

## 3. Runtime manifest

```jsonc
{
  "version": 1,
  "generatedAt": "2026-11-23T10:00:00.000Z",
  "summary": { "total": 62, "real": 0, "placeholders": 62, "warnings": 0, "errors": 0 },
  "assets": {
    "player.outfit.o01.torso": {
      "key": "player.outfit.o01.torso",
      "type": "rigPart",
      "url": "assets/characters/player/player_outfit_o01_torso.png",
      "placeholder": false,
      "width": 229, "height": 403,                  // served (trimmed) size
      "source": { "width": 1024, "height": 1536 },   // original canvas
      "trim": { "x": 400, "y": 444 },                // where the trimmed image sat in the canvas
      "rig": { "id": "player", "slot": "torso" }
    }
  }
}
```

At runtime, `AssetRegistry` loads this file and queues every entry on Phaser's loader under its
key. The rig computes each part's pivot from `trim` and the bone's canvas position, so trimming
never shifts a part.

## 4. Adding an asset

1. Add an entry to `src/content/assets/manifest.json` (key, file, size, alpha, placeholder).
2. Use the key in content (`src/content/scenes/*.ts`, a cinematic beat, …).
3. Run `npm run assets` (or just `npm run dev`). The placeholder appears immediately.
4. Add the row to [ASSET_SPEC.md](ASSET_SPEC.md) so the art team knows about it.
5. `npm test` checks that every scene only references declared keys.
