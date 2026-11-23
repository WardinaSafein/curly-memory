# CyberWR: Player rig template v1.1 (fitted to the approved character)

Template v1.1 replaces v1. The rig has been **refitted to the approved CyberWR character design**
(`design_reference.png`), so **keep the design, proportions and pose exactly as drawn**: same height,
same stance, same arm angle. Nothing needs to be redesigned. What's needed is a clean **separation
into layered parts** that animate without gaps.

> The previous package (`CyberWR_Rig_Test.zip`) is a design reference only. Its part files were
> cut out of a flat image and can't be reused; please paint the parts fresh, following this brief.

## What's in this package

| File | Use it for |
|---|---|
| `design_reference.png` | The approved character on the 1024×1536 canvas: **the target**. The assembled parts must reproduce it. |
| `rig_template_on_design.png` | Joints, part outlines, face zones and ◆ must-paint points drawn **over the design**. Start here. |
| `rig_template_guide.png` | Joint coordinates, baseline / skull lines, part outlines, dashed overlap zones, ◆ must-paint points. |
| `rig_template_parts_map.png` | Each part in its own colour, the **draw order** and the exact file name of every part. |
| `rig_template_mannequin.png` | Plain mannequin in the pose (no text), if a neutral pose reference is useful. |
| `guides/guide_<part>.png` | One transparent canvas per part: its region, pivot joint, overlap zone and ◆ points. |
| `rig_joints.json` | All joints, part bounds and must-paint points (machine-readable). |

## Key measurements (canvas px, 1024×1536)

| | |
|---|---|
| Front sole (baseline) | **y = 1440**; back sole y ≈ 1431 |
| Top of skull | **y = 228** (hair rises to ≈ 190) |
| Height, sole to skull | 1212 px |
| Padding | keep a 16 px border empty |

| Joint | Position | Joint | Position |
|---|---|---|---|
| Head pivot (jaw/neck) | (520, 400) | Neck base | (525, 440) |
| Shoulder F | (420, 515) | Shoulder B | (625, 518) |
| Elbow F | (350, 665) | Elbow B | (662, 665) |
| Wrist F | (297, 782) | Wrist B | (707, 790) |
| Waist | (530, 735) | Pelvis | (535, 765) |
| Hip F | (478, 790) | Hip B | (592, 790) |
| Knee F | (408, 1095) | Knee B | (580, 1090) |
| Ankle F | (396, 1372) | Ankle B | (592, 1362) |

"F" (front) = the limbs on screen-left (nearer the viewer); "B" (back) = screen-right.

## The rules

1. **One PNG per part, full 1024×1536 transparent canvas, part in its exact design position.** Do not
   crop or move anything. Stacked in draw order, the parts must reproduce `design_reference.png`.
2. **Paint the hidden overlap.** At every joint, each part continues **~30 px past the joint** with a
   rounded end, *including the areas covered by other parts*. The ◆ points in the template are
   **checked automatically**: each must be painted (opaque) in its part, or the file is rejected.
3. **No part may contain another part's drawing.** Sleeves are not on the torso, eyes are not on the
   head, front hair is not on the back hair.
4. **Every expression state is its own drawing**, at the same position as the others. Empty files or
   copies of another state are rejected.
5. **Clean alpha:** straight (unmatted) transparency. **No white or light fringe** on edges; check
   the parts on a dark background. No ground shadow, nothing inside the 16 px border.
6. Keep the approved style: warm hand-drawn illustration, clean outlines, soft cel shading, neutral
   lighting from the upper left. Logos on clothing (the WR badge) are part of the design and fine.

## Part-by-part instructions

Folder `characters/player/`. ◆ = must-paint points (also shown in each `guides/guide_<part>.png`).

| # | File | What it contains | Must paint ◆ |
|---|---|---|---|
| 1 | `player_hair_h01_back.png` | Only the hair **behind** the head: back of skull, nape, strands behind the ear. Paint hair over the whole skull area the front hair covers. | |
| 2 | `player_skin_s01_hand_back.png` | Bare back hand, with the wrist continuing up into the sleeve/watch. | (700, 771) |
| 3 | `player_outfit_o01_forearm_back.png` | Rolled brown cuff + bare forearm + **watch**. The cuff covers the elbow; the skin continues 20 px past the wrist under the hand. | (655, 646), (714, 809) |
| 4 | `player_outfit_o01_upperarm_back.png` | The **whole back sleeve** from the shoulder cap to past the elbow (under the cuff). | (620, 499), (667, 684) |
| 5 | `player_outfit_o01_foot_back.png` | Lower back boot (below the ankle), toe pointing **screen-right**, sole on y ≈ 1431. Boot continues ~20 px above the ankle. | (590, 1342) |
| 6 | `player_outfit_o01_shin_back.png` | Lower trouser leg + boot shaft (laces, orange collar) from above the knee to past the ankle. | (579, 1070), (593, 1382) |
| 7 | `player_outfit_o01_thigh_back.png` | Upper trouser leg + cargo pocket, from under the belt to past the knee. | (593, 770), (579, 1110) |
| 8 | `player_outfit_o01_foot_front.png` | Lower front boot, **redrawn to point screen-right** (the design's front boot faces the viewer; in a walk it must point the way the character walks). Sole on y = 1440; continues ~20 px above the ankle. | (394, 1352) |
| 9 | `player_outfit_o01_shin_front.png` | Lower trouser leg + boot shaft, above the knee to past the ankle. | (409, 1075), (395, 1392) |
| 10 | `player_outfit_o01_thigh_front.png` | Upper trouser leg + cargo pocket + orange strap and clip, from under the belt to past the knee. | (482, 771), (404, 1114) |
| 11 | `player_skin_s01_neck.png` | Neck skin from under the jaw down under the collar. | (518, 375), (527, 470) |
| 12 | `player_outfit_o01_pelvis.png` | Belt, buckle and trouser top; **painted up under the jacket hem to y ≈ 700**. | (530, 712), (470, 712), (600, 712) |
| 13 | `player_outfit_o01_torso.png` | Jacket body, hood and collar, T-shirt, pendant, chest pockets, hem to y ≈ 738. **No sleeves.** Under each sleeve, paint a rounded jacket shoulder so lifting an arm shows jacket, not background. | (420, 515), (625, 518), (530, 738) |
| 14 | `player_skin_s01_head.png` | **Skin only:** face, jaw, ear, nose, and the skull under the hair. **No eyes, brows, mouth or hair.** Paint smooth skin where the features go. | |
| 15–18 | `player_eyes_e01_{open, half, closed, wide}.png` | Both eyes, inside **x 520–606, y 312–354**. `half` = upper lids halfway down; `closed` = lash lines; `wide` = bigger whites, smaller irises (surprise). | |
| 19–20 | `player_brows_b01_{neutral, raised}.png` | Both brows, inside **x 538–606, y 284–316**. `raised` = lifted ~8–10 px and more arched. | |
| 21–23 | `player_mouth_m01_{neutral, smile, surprised}.png` | Inside **x 545–593, y 362–396**. `neutral` = relaxed closed mouth; `smile` = the design's smile; `surprised` = small open "o". | |
| 24 | `player_hair_h01_front.png` | Fringe and front locks that overlap the forehead/face only. | |
| 25 | `player_skin_s01_hand_front.png` | Bare front hand, with the wrist continuing up into the forearm. | (304, 764) |
| 26 | `player_outfit_o01_forearm_front.png` | Rolled cuff + bare forearm, cuff covering the elbow, skin 20 px past the wrist. | (358, 647), (289, 800) |
| 27 | `player_outfit_o01_upperarm_front.png` | The **whole front sleeve** with the WR badge, shoulder cap to past the elbow. | (428, 497), (342, 683) |
| 28 | `player_ref_o01.png` | The full assembled character: the approved design, **with the front boot pointing right** as in item 8. | |

## How it will be checked (all must pass before integration)

1. **Automatic validation** (`npm run assets:validate`). Each file is checked for:
   - PNG RGBA at exactly 1024×1536, empty 16 px border, real transparency;
   - **every ◆ point painted**;
   - no empty or duplicate expression states, no hair drawn in both layers, no eyes or mouth left in the head;
   - edge fringe, and alignment with the template region.
2. **Composite check.** All parts are stacked at rest and compared with `player_ref_o01.png`.
3. **Rig Lab.** Idle, blink, walk and surprise at full size and in-game size, under scene lighting,
   with the design overlay. Joints must show no gaps, doubled details or popping edges.

Nothing is integrated into the game until steps 1–3 pass.

## Delivery

`cyberwr_rigtest_v2.zip` containing `characters/player/` (28 PNGs) and `palette.txt`.
Optional: a QA note listing anything that is knowingly unfinished.

## Suggested workflow

1. Start from `design_reference.png` with `rig_template_on_design.png` alongside it.
2. For each part, use `guides/guide_<part>.png` as the canvas: keep the design's pixels for that part,
   then **repaint the hidden areas** out to the dashed outline and ◆ points, and erase the rest.
3. Repaint the head as skin only, then draw the 9 expression files on top of it at the same position.
4. Redraw the lower front boot pointing right.
5. Before exporting, view every part on a dark background (fringe), stack them in draw order and
   compare with the design.
