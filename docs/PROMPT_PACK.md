# CyberWR: Image prompt pack for ChatGPT

How to get consistent, usable art out of ChatGPT image generation, one image at a time, and exactly
which images the game needs. Copy the prompts in the grey boxes.

---

## 1. Ground rules (read once)

1. **One image per message.** Never ask for a set ("make all 5 buildings") in one prompt. Quality
   and consistency drop sharply.
2. **Use one ChatGPT Project for all CyberWR art.** Upload the reference files to the Project
   (`design_reference.png`, `palette.txt`, this file) so every chat can see them.
3. **Attach the reference image to every prompt** that involves the hero, even inside the Project.
4. **Paste the same STYLE block** (below) at the start of every prompt. Don't paraphrase it.
5. **Edit, don't regenerate.** For changes to an approved image, use ChatGPT's image editor: open the
   image, **select only the area to change**, describe the change. Everything outside the selection
   stays as it is, which keeps alignment.
6. **Sizes.** ChatGPT makes 1024×1024 (square), 1536×1024 (landscape) or 1024×1536 (portrait). Ask
   for the nearest one; **I resize, crop and key the background myself**. You don't need exact sizes.
7. **Backgrounds behind objects:** ask for a *transparent background*. If it comes back white or
   chequered, ask again with *flat pure green background (#00FF00)*; I remove green automatically.
   Avoid white backgrounds: they cause the white edge fringe we saw in v1.
8. **No text.** Signs, screens and posters must be blank. All words are added by the game.
9. **Name files when you download them**, using the names in this pack, and send them to me in a zip
   (or one by one). I validate everything before it goes in the game.

### The STYLE block (paste at the top of every prompt)

```
STYLE (CyberWR): warm hand-drawn 2D narrative adventure illustration, anime-inspired,
clean dark-brown outlines with consistent line weight, soft cel shading (2–3 tones per
material), warm cohesive palette: ochre #D79535, dark brown #392F2D, warm skin #F5B27B,
teal accent #35BFC1. Soft neutral key light from the upper left. Charming and slightly
mysterious, not neon cyberpunk. No text, no letters, no numbers, no watermark.
```

---

## 2. Should ChatGPT connect to Figma?

**Not needed now.** Figma doesn't make image generation more consistent, and the rig alignment is
handled by my tools.

Figma becomes useful later for **UI mock-ups**: the email inbox, phone screen and call interface for
the chapters. It also helps for laying out a storyboard. If you want that, I can work with Figma
directly from my side.

For hand fixes to images, a free layer editor like **Photopea** (photopea.com) is more useful than
Figma.

---

## 3. Angles and camera rules (the "motion angle" question)

The game animates everything in code, so **ChatGPT never draws animation frames**. It only draws
still poses and views that follow these rules:

| Asset type | Camera / angle | Why |
|---|---|---|
| Player, residents, villains, Gus | **3/4 view facing screen-right, full body, standing, feet on the ground**, same height and framing as the reference | The game mirrors characters for facing left; one view covers everything |
| Character design sheets (for approval only) | Front, 3/4 right, side right, back, in one row | Locks the design so later images stay consistent |
| Rooms and street backgrounds | **Eye level, straight-on side view** (like a theatre stage), flat horizon | Characters walk left/right along a floor line |
| Buildings and props | **Front view, eye level, base flat at the bottom** | They stand on the street line |
| Laptop close-up | **Camera 15° above the desk, straight-on**; lid drawn **flat, no perspective** | The game rotates the lid in 3D itself |
| Effects (portal, glyphs, streaks) | Flat, centred, **white on pure black** | I convert brightness to transparency and tint them in code |

---

## 4. Priority 1: the player character (rig test v2)

> **Ready-made kit:** [`docs/edit-kit/cyberwr_edit_kit_v1.zip`](edit-kit/cyberwr_edit_kit_v1.zip) contains the base image,
> one "select this area" picture per edit, and all prompts fully written out (`PROMPTS.md`).

### Workflow

ChatGPT makes **edited versions of the whole approved character**, and I cut them into the 28 rig
parts with code (alignment guaranteed, hidden overlaps extended automatically).

- **For every edit:** attach `design_reference.png` (1024×1536). Use the editor's selection tool on
  only the area that changes. Ask for the same size, the same framing and nothing moved.
- **Download names:** `edit_01_boot.png`, `edit_02_blankface.png`, and so on.

### E1: front boot pointing right (needed for walking)

Select the screen-left boot (lower part, below the trousers).

```
[STYLE block]
Edit only the selected boot. Redraw the character's front (screen-left) boot so it points
to the right, in the same 3/4 view as the other boot: toe pointing right, sole flat on the
same ground line, same boot design, colours, laces and orange details. Do not change
anything outside the selection. Keep the image 1024x1536, same framing.
```

### E2: blank face (skin only)

Select the eyes, eyebrows and mouth.

```
[STYLE block]
Edit only the selected area. Remove the eyes, eyebrows and mouth completely and paint smooth
face skin in their place, with the same skin tone and soft cel shading as the rest of the
face. Keep the nose, ears, jaw line, hair and everything else exactly as it is.
```

### E3–E5: eye states

Select the eyes only, and do each as a separate edit of the original reference.

```
[STYLE block]
Edit only the selected eyes. Make them HALF CLOSED: upper eyelids lowered halfway, relaxed.
Same eye shape, colour, lashes and line style. Nothing else changes.
```

Save that as `edit_03_eyes_half.png`. Then repeat with:

- `CLOSED, peacefully shut, showing only the curved lash lines` → `edit_04_eyes_closed.png`
- `WIDE OPEN in surprise: larger whites, slightly smaller irises` → `edit_05_eyes_wide.png`

### E6: raised brows

Select the eyebrows only.

```
[STYLE block]
Edit only the selected eyebrows. Raise both eyebrows about 10 pixels and arch them more,
a surprised expression. Same colour and thickness. Nothing else changes.
```

### E7–E8: mouth states

Select the mouth only. The current mouth is the `smile`.

```
[STYLE block]
Edit only the selected mouth. Make it a NEUTRAL relaxed closed mouth: a short, almost straight
line, calm expression. Same line style. Nothing else changes.
```

Save as `edit_07_mouth_neutral.png`. Then repeat with
`a small open "o" mouth, surprised` → `edit_08_mouth_surprised.png`.

### E9: arms removed (gives me the torso and jacket under the sleeves)

Select both arms, from the shoulders down to the hands.

```
[STYLE block]
Edit only the selected area. Remove both arms completely (sleeves, cuffs, forearms, watch and
hands). Repaint what would be behind them: the sides and shoulders of the same jacket, with
rounded shoulders where the sleeves attached, and the trousers and pockets behind the hands.
Keep the same design and colours. Nothing else changes.
```

### E10: jacket hem lifted (gives me the belt and trouser tops)

Select the jacket's lower edge and the belt area.

```
[STYLE block]
Edit only the selected area. Show the belt and the top of the trousers fully, as if the jacket
hem were slightly shorter: the full belt with buckle and the trouser waistband all the way
across. Same colours and style. Nothing else changes.
```

**Done check:** compare each edit with the reference at 100 % zoom; nothing outside the edited area
should have moved. Small shifts are fine, because I re-align automatically.

---

## 5. Priority 2: backgrounds and props

For all of these, generate **1536×1024 landscape** unless stated. Keep important content in the
**middle band**: I crop top and bottom slightly to reach 16:9.

### Bedroom (night)

`bedroom_bg.png`:

```
[STYLE block]
2D side-view illustration of a cosy young professional's bedroom at night, eye-level
straight-on view like a theatre stage, flat floor line across the lower fifth of the image.
Large window on the left showing a calm night city with warm lights; a blank poster on the
right wall; bookshelf, plant, string lights. Warm lamp-light mood, deep purple-blue shadows.
EMPTY floor area in the centre (a character will stand there). NO desk, NO furniture in the
right third of the floor (the desk is a separate image). No text.
```

`bedroom_desk.png` (ask for 1024×1024 with a transparent background):

```
[STYLE block]
A wooden desk with a desk chair and a warm desk lamp, front view, eye level, isolated object
on a transparent background, legs resting on a flat ground line at the bottom. Empty desk top
(a laptop is a separate image). No shadow on the ground. No text.
```

`bedroom_laptop_closed.png` (1024×1024, transparent): *"A closed modern laptop seen from the front
at eye level, slightly from above, matte grey-blue, isolated on a transparent background, no logo,
no text."*

### Laptop close-up (portal cinematic)

1. `laptop_closeup_bg.png`:

   ```
   [STYLE block]
   Close-up of a wooden desk surface at night, camera 15 degrees above the desk, straight-on,
   warm lamp glow at the top. EMPTY desk (no laptop, nothing in the centre).
   ```

2. `laptop_base.png` (1536×1024, transparent):

   ```
   [STYLE block]
   The bottom half of an open laptop only (keyboard deck and touchpad, NO screen, NO lid),
   seen from 15 degrees above, straight-on, centred, the hinge edge straight and horizontal
   at the top. Matte grey-blue. Isolated on a transparent background. No logo, no text.
   ```

3. `laptop_lid_inner.png` (1536×1024, transparent):

   ```
   [STYLE block]
   A laptop screen bezel seen perfectly flat and front-on (no perspective at all), rectangular,
   matte dark grey bezel with a small webcam dot at the top centre, the screen area PURE BLACK.
   Isolated on a transparent background. No text.
   ```

4. `laptop_lid_outer.png`: same as `laptop_lid_inner.png` but showing the **back** of the lid:
   *"matte grey-blue lid back, flat front-on, a simple round emblem, no letters."*

5. `os_wallpaper.png`: *"Abstract calm desktop wallpaper, twilight hills and a soft glowing moon,
   teal and ochre, no text."*

### CyberTown high street (dusk)

- **Horizon rule:** the street level sits at the **same height in every layer**, about 72 % down
  the image.
- **Seamless tiles:** for `town_far`, `town_mid` and `town_street`, the left and right edges must
  continue into each other. I make them seamless in code if needed, so don't worry if they don't.

`town_sky.png`:

```
[STYLE block]
Twilight sky over a charming small digital town: soft gradient from deep teal-blue at the top
to warm peach at the horizon, a large pale moon, a few stars, wispy clouds. Sky only, no
buildings.
```

`town_far.png` (transparent above the skyline):

```
[STYLE block]
Distant silhouette skyline of a charming storybook town at dusk: rooftops, a clock tower, a
radio mast, small antennas, a few warm lit windows. Cool blue-violet tones, low contrast.
Wide horizontal strip, flat bottom edge, transparent sky above. No text.
```

`town_mid.png`: same idea, *"closer rooftops and chimneys, more detail, warmer windows, slightly
bluish purple."*

`town_street.png`:

```
[STYLE block]
Side view of a cobbled pavement and a quiet street at dusk, eye level, a wide horizontal strip:
pavement in the upper half, a kerb, road in the lower half with faint lane markings. Warm
lamplight reflections. Nothing standing on it. No text.
```

### The five district buildings

Generate each one alone, 1024×1024, transparent background, **front view, eye level, base flat at
the bottom, big readable door, BLANK sign board**:

| File | Building | Prompt subject |
|---|---|---|
| `town_bldg_01.png` | Post Office (Ch. 1, phishing) | *"a charming old post office with a red-brown roof, mail slot, envelope-shaped weather vane, sorting-room windows"* |
| `town_bldg_02.png` | Mobile Market (Ch. 2, smishing) | *"a cheerful covered market stall building with awnings, crates of parcels, a small delivery bike"* |
| `town_bldg_03.png` | Communication Centre (Ch. 3, vishing) | *"a round brick communication tower building with a small radio antenna, old telephone booth by the door"* |
| `town_bldg_04.png` | Town Hall (Ch. 4, fake worker) | *"a stately but friendly town hall with a clock, columns, a guarded gate and an ID-card reader by the door"* |
| `town_bldg_05.png` | Media Studio (Ch. 5, deepfake) | *"a quirky media studio with a big screen above the door, spotlights and a film-reel motif"* |

Prompt pattern:

```
[STYLE block]
[subject], front view at eye level, isolated on a transparent background, the base resting
flat on the bottom edge, a large blank sign board above the door, warm lit windows, dusk
lighting from the upper left. No text, no ground shadow.
```

### Props

Each one alone, 1024×1024, transparent, front view, standing on the bottom edge:

- `town_prop_lamppost.png`
- `town_prop_noticeboard.png` (blank paper notes)
- `town_prop_bench.png`
- `town_portal_pad.png` (*"a round stone arrival platform with softly glowing teal runes, seen from the
  front at eye level"*)

---

## 6. Priority 3: effects (white on black)

Generate 1024×1024 **white on pure black**. I convert brightness to transparency.

- `fx_portal_ring.png`: *"a swirling magical portal ring, white light strokes on pure black, empty
  dark centre, no colour."*
- `fx_tunnel_streaks.png`: *"horizontal streaks of white light and data dashes on pure black, evenly
  spread, edge to edge."*
- `fx_glyph_{zero, one, lock, key, shield, hex}.png`: *"a single simple white [padlock] icon, thick
  rounded strokes, centred on pure black, nothing else."* For zero and one, the "text" is the glyph
  itself, which is fine here.

---

## 7. Later (after the rig test passes)

- **Gus design exploration:**

  ```
  [STYLE block]
  Character design sheet for "Gus", the town's witty, observant investigation guide,
  [your direction: human / creature / robot], full body, shown front, 3/4 right, side and
  back in one row, neutral pose, plain light background. Original design.
  ```

  Iterate until you approve one, then do an expression sheet. Gus then goes through the same edit
  workflow as the player.
- **Villains** (Mail Thief, Message Trickster, Voice Impostor, Gatecrasher, Mimic) use the same
  design-sheet prompt, one villain per chat. Give each a signature colour and silhouette.
- **Interiors** for each chapter (Post Office interior first) use the same side-view stage rules as
  the bedroom.

## 8. Before sending me anything: checklist

- [ ] Named as in this pack
- [ ] The hero matches the reference: face, hair, jacket, colours
- [ ] No text, letters or watermarks
- [ ] Objects on a transparent (or pure green) background, not white
- [ ] Edits: nothing moved outside the edited area
