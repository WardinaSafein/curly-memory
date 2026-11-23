# CyberWR: Player rig template v1 (character test)

This package defines **where every body part goes** so the game can animate a character drawn as
separate layers. Please read it fully before drawing. The first goal is **one test character**:
one hairstyle, one outfit, one face style. We'll review it animated in the game (idle, blink,
walk, surprise) before anything else is produced.

## What's in this package

| File | Use it for |
|---|---|
| `rig_template_guide.png` | The master guide: joints (red crosshairs + coordinates), baseline, skull line, centre line, part outlines, **dashed overlap zones**, face zones, padding. |
| `rig_template_mannequin.png` | Clean mannequin on white, no text. Use it as the **pose/position reference image** when generating or editing the character. |
| `rig_template_parts_map.png` | Every part in its own colour, the **draw order** (back to front) and the exact file name of each part. |
| `guides/guide_<part>.png` | One transparent 1024×1536 canvas per part showing exactly where that part goes, its pivot joint and its overlap zone. Useful as an edit base for a single part. |
| `rig_joints.json` | All joint coordinates and expected file paths (machine-readable). |

## The rules

1. **Every part is its own PNG on a full 1024×1536 transparent canvas**, painted **in exactly the
   position shown in the template**. Do **not** crop or move parts. Think of it as exporting each
   layer of one stacked drawing.
2. **Pose:** 3/4 view facing **screen-right**, relaxed A-pose (arms about 15° away from the body),
   legs straight and slightly apart, neutral expression.
3. **Scale:** front sole on **y = 1440**, top of skull on **y = 190** (1250 px tall), body centred on
   **x = 512**. Hair may rise above the skull line.
4. **Paint past the joints (the most important rule).** Each limb part must continue about **30 px
   beyond its joint**, ending in a rounded shape, even where another part covers it (e.g. the top of
   the thigh under the hips, the shoulder end of the upper arm). When a limb rotates, this hidden
   area becomes visible; if it isn't painted, a gap opens. The dashed outlines in the guide show the
   area to cover.
5. **"front" / "back"**: *front* = limbs nearer the viewer; *back* = far-side limbs, slightly smaller
   and darker, and partly hidden behind the body.
6. **Head part = skin only:** face, ears, nose, but **no eyes, brows, mouth or hair** (those are
   separate so they can animate). Paint the face skin smoothly where the eyes and mouth will sit.
7. **Eyes / brows / mouth states** must sit at **exactly the same position** in every state file
   (only the expression changes).
8. **Lighting:** soft neutral light from the upper left, no coloured rim light. Skin in one medium
   tone and hair in one mid-tone colour, each shaded within a single hue (the game will recolour
   them for character creation later).
9. **Style:** warm hand-drawn narrative illustration, **clean outlines** (≈ 3–5 px), **soft cel
   shading**. Adult character (the audience is 18+ corporate employees).
10. **Technical:** PNG, RGBA, real transparency, sRGB, no halo or fringe on edges, nothing inside
    the 16 px border, no text, no ground shadow.

## Files to deliver (28)

Folder: `characters/player/`

| Part | File(s) |
|---|---|
| Head (skin) | `player_skin_s01_head.png` |
| Neck | `player_skin_s01_neck.png` |
| Hands | `player_skin_s01_hand_front.png`, `player_skin_s01_hand_back.png` |
| Eyes | `player_eyes_e01_open.png`, `player_eyes_e01_half.png`, `player_eyes_e01_closed.png`, `player_eyes_e01_wide.png` |
| Brows | `player_brows_b01_neutral.png`, `player_brows_b01_raised.png` |
| Mouth | `player_mouth_m01_neutral.png`, `player_mouth_m01_smile.png`, `player_mouth_m01_surprised.png` |
| Hair | `player_hair_h01_back.png`, `player_hair_h01_front.png` |
| Torso / hips | `player_outfit_o01_torso.png`, `player_outfit_o01_pelvis.png` |
| Arms | `player_outfit_o01_upperarm_front.png`, `player_outfit_o01_forearm_front.png`, `player_outfit_o01_upperarm_back.png`, `player_outfit_o01_forearm_back.png` |
| Legs | `player_outfit_o01_thigh_front.png`, `player_outfit_o01_shin_front.png`, `player_outfit_o01_thigh_back.png`, `player_outfit_o01_shin_back.png` |
| Shoes | `player_outfit_o01_foot_front.png`, `player_outfit_o01_foot_back.png` |
| Reference | `player_ref_o01.png`: the whole character assembled in this pose, same canvas |

Package as **`cyberwr_rigtest_v1.zip`** containing the `characters/player/` folder and a
`palette.txt` with the main hex colours.

## Suggested workflow

1. **Design pass.** Generate the full character standing in the mannequin's pose (use
   `rig_template_mannequin.png` as the reference). Iterate until the look is approved. Keep it on a
   1024×1536 canvas aligned to the template lines.
2. **Reference.** Save the approved, aligned full character as `player_ref_o01.png`.
3. **Separate the parts.** For each part, start from the reference (or from
   `guides/guide_<part>.png` as an edit base), keep only that part, **repaint the hidden overlap**
   (rule 4) and erase everything else to transparent. Inpainting or a layer editor (e.g. Photopea)
   works well; the canvas must stay 1024×1536 with the part in place.
4. **Face states.** Paint the eye, brow and mouth variants on top of the same reference so they
   line up.
5. **Self-check.** Stack all parts in the draw order from the parts map. The result should match the
   reference with no gaps or doubled lines.

## How we'll check it

The build validates every file automatically. It checks canvas size, transparency, edge padding,
halos and **alignment against this template** (part centre vs. template region, and that each limb
reaches past its joint). It also renders a composite of all parts. Then we review the character in
the **Rig Lab** with idle, blink, walk and surprise at full size and at in-game size, under scene
lighting, with this template and your reference overlaid. You'll get a short report with any
fixes.
