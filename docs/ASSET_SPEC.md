# CyberWR: Asset Specification

The contract between visual production (ChatGPT) and the game code. Every file listed here is
also declared in [`src/content/assets/manifest.json`](../src/content/assets/manifest.json); the
build validates deliveries against it automatically (see [ASSET_MANIFEST.md](ASSET_MANIFEST.md)).
Until a file arrives, the game shows a labelled placeholder with the same name and size.

> **Current phase: rig test.** Only the **player character test batch** (section 4) is requested
> right now. Scene art (section 5) is specified so it can be planned, and can be delivered any time,
> but the character library will not be expanded until the rig test is approved.

---

## 1. Art direction (applies to everything)

- **Style:** warm, hand-drawn 2D narrative-adventure illustration; expressive characters; **clean
  outlines** with a consistent line weight; **soft cel shading** (2–3 tones per material, soft edge
  allowed). Adult audience (corporate employees, 18+): engaging and adventurous, not childish.
- **CyberTown:** alive, charming and mysterious. Think twilight town, warm windows, lanterns, small
  signs of digital magic. **Not** predominantly neon cyberpunk; neon is an accent at most.
- **Characters are lit neutrally:** soft key light from the upper left, no coloured rim light. The
  game tints characters to match each scene's lighting.
- **Scenes carry the mood lighting** (warm desk lamp in the bedroom, dusk in CyberTown).

## 2. Global technical rules

| Rule | Requirement |
|---|---|
| Logical resolution | **1920×1080** (16:9). All sizes below are final pixel sizes at 1×. |
| Format | **PNG**, RGBA 8-bit, sRGB. |
| Transparency | Real alpha for every non-background asset. Fallback only if impossible: a flat `#00FF00` background with no green spill (the pipeline keys it out, with a warning). |
| Exact size | Canvas must be **exactly** the listed size. If a generator outputs 1024/1536 px, AI-upscale (don't stretch) or extend the canvas, never crop the subject. |
| Padding | Leave **16 px of empty transparent border** (exceptions listed per asset). |
| Edges | Anti-aliased, **no white or dark halo**, no stray semi-transparent pixels. |
| No text in images | Signs, screens, posters and notes stay **blank**. All words are live text (crisp, translatable). |
| No baked effects | No ground shadows, outer glows or outlines around the whole sprite: the game adds these. |
| FX sprites | **Pure white / greyscale on transparent**; the game tints them. |
| Naming | lowercase `snake_case`, exactly as listed. Folder = path shown. |
| Palette | Include `palette.txt` (hex codes of the main colours) with each package. |

## 3. Delivery

1. Package each batch as a zip named **`cyberwr_<batch>_v<N>.zip`** (e.g. `cyberwr_rigtest_v1.zip`)
   whose folders mirror `assets-src/` (e.g. `characters/player/player_skin_s01_head.png`).
2. Upload it to the repository (or hand it to me). I unpack it into `assets-src/` and run
   `npm run assets:validate`.
3. You get a validation report: every file is **delivered**, **warning** (fixable, still used) or
   **error** (wrong size / no transparency / not PNG; placeholder used until fixed).

---

## 4. Player character: rig test batch v2 (requested now)

> **Update:** the player rig passed validation and Rig Lab testing using the **edit-kit workflow**
> (ChatGPT edits the whole character and `tools/rig_cutter/cut_parts.py` cuts the parts). See
> [rig test v2 review](reviews/rigtest-v2/README.md) and [PROMPT_PACK.md](PROMPT_PACK.md). The
> part-painting brief below remains valid for hand-painted deliveries.

One character (the **approved CyberWR design**), one hairstyle, one outfit, one face style: enough to
test idle, blink, walk and surprise in the Rig Lab. The first package (v1) failed validation and is
kept as a **design reference only** ([review](reviews/rigtest-v1/README.md)).

### 4.1 Use rig template v1.2

Download **[`docs/rig-template/cyberwr_rig_template_v1_2.zip`](rig-template/cyberwr_rig_template_v1_2.zip)**
and follow its [README](rig-template/README.md): it lists every part, what it contains and its
must-paint points. Summary:

- The rig is **fitted to the approved design** (`design_reference.png`): keep its proportions, stance
  and arm angle exactly. The game relaxes the arms in code.
- **Shared canvas 1024×1536 for every part**, each part in its exact design position.
- Front sole on **y = 1440**, back sole y ≈ 1431, top of skull **y = 228**.
- Joints: shoulder F (420, 515) / B (625, 518), elbow F (350, 665) / B (662, 665), wrist F (297, 782) /
  B (707, 790), waist (530, 735), hip F (478, 790) / B (592, 790), knee F (408, 1095) / B (580, 1090),
  ankle F (396, 1372) / B (592, 1362), neck base (525, 440), head pivot (520, 400).
- **Hidden overlap is enforced:** each part has ◆ must-paint points ~20 px past its joints; an unpainted
  point rejects the file.
- **Both boots point screen-right.** The design's front boot faces the viewer and must be redrawn for
  the walk.

### 4.2 Files (all in `assets-src/characters/player/`)

| Group | Files | Notes |
|---|---|---|
| Skin (4) | `player_skin_s01_{head, neck, hand_front, hand_back}.png` | Head = skin only (face, jaw, ear, nose, skull under the hair). **No eyes, brows, mouth or hair.** |
| Eyes (4) | `player_eyes_e01_{open, half, closed, wide}.png` | Inside x 520–606, y 312–354; same position in every state. |
| Brows (2) | `player_brows_b01_{neutral, raised}.png` | Inside x 538–606, y 284–316. |
| Mouth (3) | `player_mouth_m01_{neutral, smile, surprised}.png` | Inside x 545–593, y 362–396. |
| Hair (2) | `player_hair_h01_{back, front}.png` | The back hair continues as a plain underlayer behind the fringe (the layers swing separately), but the fringe drawing itself is not repeated in it. |
| Outfit (13) | `player_outfit_o01_{torso, hem, pelvis, upperarm_front, upperarm_back, forearm_front, forearm_back, thigh_front, thigh_back, shin_front, shin_back, foot_front, foot_back}.png` | The jacket hem band (below y = 703) is its own part, `hem`, so it can lag behind the body. Sleeves on the upper arms (not the torso). Rolled cuffs and the watch on the forearms. Boot shafts on the shins; lower boots on the feet. Belt on the pelvis, painted up under the jacket. |
| Reference (1) | `player_ref_o01.png` | The assembled character (approved design with the front boot pointing right). |

**29 files** + `palette.txt`, delivered as `cyberwr_rigtest_v2.zip`.

### 4.3 Acceptance gates

A part is only integrated into the game after:

1. it passes `npm run assets:validate` with **no errors**:
   - size, transparency and padding;
   - ◆ must-paint points;
   - non-empty, distinct expression states;
   - no double-drawn hair, no features left in the head;
2. the rest-pose composite matches the reference;
3. idle, blink, walk and surprise look clean in the Rig Lab: no gaps, doubled details or edge fringe.

### 4.4 How the character is used in-game

| Where | Display scale | Approx. on-screen height |
|---|---|---|
| Bedroom | 0.42 | 510 px |
| CyberTown | 0.34 | 410 px |
| Portal tunnel | 0.12 → 0.42 | grows |
| Rig Lab / close-ups | 0.6 – 1.5 | up to 1820 px (face zoom) |

---

## 5. Scenes and effects (specified, deliver any time)

Sizes are exact canvas sizes. "Trim" means the build crops transparent borders, so only the
**bottom edge** position matters: stand objects on the bottom padding line.

### 5.1 Title

| File | Size | Alpha | Notes |
|---|---|---|---|
| `scenes/title/title_bg.png` | 1920×1080 | no | Key art of CyberTown at twilight; calm top-centre for the logo (set in code). |

### 5.2 Bedroom (night)

| File | Size | Alpha | Notes |
|---|---|---|---|
| `scenes/bedroom/bedroom_bg.png` | 1920×1080 | no | Room + window with a night city view, **without the desk**. Floor line at **y = 1000**. Leave the window (≈ x 240–700, y 180–600) and a wall poster (≈ x 1180–1480, y 240–440) as clear hotspot targets. |
| `scenes/bedroom/bedroom_desk.png` | 900×600 | yes, trim | Desk + chair + lamp; legs on the bottom edge. Placed bottom-centre at (1430, 1000). Desk top ≈ 400 px above the floor. |
| `scenes/bedroom/bedroom_laptop_closed.png` | 280×100 | yes, 8 px padding | Closed laptop sitting on the desk top. |
| `scenes/bedroom/bedroom_fg.png` | 1920×1080 | yes, no padding | Optional foreground framing (plant, shelf edge); keep the centre empty. |

### 5.3 Laptop close-up (portal cinematic)

The lid is animated in 3D by code. **Camera: 15° above the desk, mild perspective.**

| File | Size | Alpha | Notes |
|---|---|---|---|
| `scenes/laptop/laptop_closeup_bg.png` | 1920×1080 | no | Desk surface close-up, **no laptop**. |
| `scenes/laptop/laptop_base.png` | 1640×340 | yes | Keyboard deck seen from 15° above. **Hinge line at y = 24, 1280 px wide, centred**; deck front edge at y ≈ 281, ≈ 1587 px wide (mild perspective); then the base's front face. The closed lid must exactly cover this deck. |
| `scenes/laptop/laptop_lid_outer.png` | 1280×800 | yes, no padding | Lid **outside**, drawn **flat, front-on, no perspective**, as seen from behind the open laptop (free edge at the top). No logo text. |
| `scenes/laptop/laptop_lid_inner.png` | 1280×800 | yes, no padding | Lid **inside**: bezel with a **pure black screen area of exactly 1200×720 at (40, 32)**. Flat, front-on. Hinge = bottom edge. |
| `scenes/laptop/os_wallpaper.png` | 1200×720 | no | Desktop wallpaper (screen UI is drawn in code on top). |
| `scenes/laptop/os_bootlogo.png` | 256×256 | yes | Boot logo, white on transparent. |

### 5.4 Portal effects (white / greyscale on transparent)

| File | Size | Notes |
|---|---|---|
| `fx/fx_portal_ring.png` | 1024×1024 | Swirling ring, empty centre. |
| `fx/fx_tunnel_streaks.png` | 1024×1024 | Data streaks, **seamlessly tileable** in X and Y. |
| `fx/fx_glyph_{zero, one, lock, key, shield, hex}.png` | 64×64 | Small symbols; 4 px padding. |

**No cinematic still may show the player character** (their look is customised). The code
composites the live rig into the tunnel and the arrival.

### 5.5 CyberTown high street

World is **4200×1080** and scrolls horizontally. Layers back to front:

| File | Size | Alpha | Scroll | Notes |
|---|---|---|---|---|
| `scenes/cybertown/town_sky.png` | 1920×1080 | no | fixed | Twilight sky. |
| `scenes/cybertown/town_far.png` | 1920×600 | yes, no padding | 0.15 | Distant skyline, **seamless in X**, bottom-aligned. Placed at y = 200. |
| `scenes/cybertown/town_mid.png` | 1920×800 | yes, no padding | 0.4 | Rooftops, **seamless in X**. Placed at y = 40. |
| `scenes/cybertown/town_street.png` | 1920×300 | no | 1.0 | Pavement + road, **seamless in X**. Placed at y = 780; the walk line is **165 px from its top**. |
| `scenes/cybertown/town_bldg_{01..05}.png` | 800×900 | yes, trim | 1.0 | The five district buildings (shown at 80 %, base at y = 812). Visible door, **blank sign**. Each hints at its district's theme. |
| `scenes/cybertown/town_prop_{lamppost, noticeboard, bench}.png` | 400×520 | yes, trim | 1.0 | Stand on the bottom edge. |
| `scenes/cybertown/town_portal_pad.png` | 600×200 | yes, trim | 1.0 | Arrival platform the player lands on. |
| `scenes/cybertown/town_fg.png` | 1920×1080 | yes, no padding | 1.25 | Foreground framing (cables, foliage), **seamless in X**, mostly empty. |

District working titles (code placeholders, to be renamed): The Phish Market, The Password Vault,
Patchworks, The Social Club, Data Harbour.

### 5.6 Gus: design pending

Gus is the recurring narrative guide. **His design is not decided** and no specification is
issued until it's approved. The game uses a neutral "?" stand-in
(`characters/gus/gus_placeholder.png`). Once approved, Gus will either use the same cutout rig
approach (if humanoid) or illustrated pose sets; the spec will be added here.

### 5.7 Not requested yet

UI frames and icons (built in code for now), audio, additional outfits, hairstyles, expressions
and animations (after rig approval), and the five district games.
