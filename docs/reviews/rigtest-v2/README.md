# Rig test v2: review (ChatGPT edits → automatic cut)

**Status: PASSED (validator + Rig Lab) and integrated** into `assets-src/characters/player/` after
the E09b re-edit (see "Final result" at the end). Final visual sign-off rests with the creative director.

## What was delivered

10 full-image edits from the edit kit (`edit_01_boot.png` … `edit_10_belt.png`), downloaded from the
shared Drive folder.

| Check | Result |
|---|---|
| Framing | ✅ Character in exactly the same place in all 10 (0–1 px shift, corrected automatically) |
| Size / format | ⚠️ RGB on a black background, not transparent; 4 files 1 px short (1024×1535). Handled by the cutter. |
| Re-rendering | ⚠️ ChatGPT redrew 6–14 % of the character outside the selected areas (line wobble). Harmless: the cutter takes only the selected areas from each edit. |
| E01 boot | ✅ Front boot now points right, matching the other boot |
| E02 blank face | ✅ Clean skin, nose and ears kept |
| E03–E08 expressions | ✅ Half, closed and wide eyes; raised brows; neutral and surprised mouths |
| E09 no arms | ⚠️ Forearms and lower sleeves removed, but the **sleeve tops and the WR badge were kept as part of the jacket** |
| E10 belt | ✅ Full belt and waistband visible |

![Face edits](0_chatgpt_face_edits.jpg)
![What E09 removed (red)](3_e09_removed_area.jpg)

## Cut and validation

`tools/rig_cutter/cut_parts.py` produced all 28 parts. Validator: **28 delivered, 0 errors, 0 warnings**
(every must-paint point covered, all expression states distinct and non-empty, no double-drawn hair,
no features in the head, no edge fringe).

## Rig Lab

![Rest and walk](1_rest_and_walk.jpg)
*Rest on light and dark backgrounds, then the walk cycle (contact, push-off, swing). Clean.*

![Surprise and face states](2_surprise_and_face.jpg)
*Surprise; face zoom: surprise, neutral, blink, half-blink. All face states work.*

| Test | Result |
|---|---|
| Rest pose | ✅ Matches the design; fringe cleaned |
| Idle / blink | ✅ |
| Walk | ✅ Feet planted, both boots point the right way |
| Surprise | ⚠️ When the arms lift, a **second WR badge** and smeared jacket strokes show at the front shoulder (from E09's kept sleeve tops) |

## Remaining action

- **E09b:** upload `edit_09_no_arms.png`, select both shoulder tops (see
  `docs/edit-kit/E09b_shoulders_SELECT.png`) and use the E09b prompt in `docs/edit-kit/PROMPTS.md`.
  Then rerun the cutter with `edit_09b_shoulders.png` in place of E09, validate, and re-test surprise.

## Final result (with E09b)

`edit_09b_shoulders.png` removed the sleeve tops and the WR badge from the jacket. The cutter was also
improved during this round:
- arm detection that ignores ChatGPT's re-rendering of the jacket;
- empty space left empty behind the sleeves (no smeared fill);
- a narrow overlap band, so no stale copies of feet or cuffs;
- detached fragments removed, and a wider fringe clean-up.

| Check | Result |
|---|---|
| Validator | ✅ 28 delivered, 0 errors, 0 warnings |
| Rest / idle | ✅ |
| Walk (4 key poses, light and dark backgrounds) | ✅ No debris, feet planted |
| Surprise | ✅ Single WR badge rotating with the sleeve, no streaks |
| Face states | ✅ |
| In scene (CyberTown arrival, bedroom) | ✅ |

![Rest, idle, walk](4_final_rest_idle_walk.jpg)
![Surprise](5_final_surprise.jpg)
![Face states](6_final_face.jpg)
![In scene](7_final_in_scene.jpg)

**Known minor items** (not blocking):
- A small notch can appear at the back shoulder edge at the peak of surprise.
- ChatGPT's re-render makes the blank-face skin very slightly different in tone from the design's.

Both can be polished later with a hand touch-up in a layer editor.

**Reproduce:** put the 11 edits in a folder and run
`python3 tools/rig_cutter/cut_parts.py --edits <folder> --out <out>`, then copy
`<out>/characters/player/*.png` into `assets-src/characters/player/`.

## Smoothness pass (after creative-director feedback: "not smooth")

At 100 % zoom the character had three real problems, now fixed:

| Problem | Cause | Fix |
|---|---|---|
| Hairline seams through the hair and around the face | Two parts' soft edges met at each cut, letting the background show through | Every part bleeds 2 px under its neighbours along internal joins |
| Dotted, ragged outline (most visible on the redrawn boot) | Light edge pixels were deleted | Light edge pixels are recoloured to the local outline colour, keeping the soft edge |
| Jagged edges at in-game size (0.34×) | WebGL1 can't mipmap non-power-of-two textures, so there was no smooth downscaling | Rig parts are padded to power-of-two in the asset build; mipmaps (`LINEAR_MIPMAP_LINEAR`) are now active |

Also fixed:
- **Crotch:** spikes between the legs at push-off are gone; the hips own the crotch and the thighs have rounded tops.
- **Ghost lines:** faint pixels from ChatGPT's not-quite-black background are removed.
- **Validator:** the head check now ignores the head's own outline, and still rejects baked-in eyes (24 % on the v1 draft).

![Close-ups](10_smoothness_closeups.jpg)

Motion at 30 fps: [walk](8_walk.gif) · [surprise](9_surprise.gif)

**What cut-out animation can't do:** cloth doesn't fold, the torso doesn't twist, and limbs rotate as
rigid pieces. If the motion should feel more fluid, the next step is animation polish (more keys,
overlapping action, secondary motion of hair and jacket hem), not more art.
