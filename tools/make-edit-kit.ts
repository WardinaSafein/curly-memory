/**
 * Builds the character edit kit for ChatGPT (docs/edit-kit/):
 *   design_reference.png         the approved character: the image ChatGPT edits every time
 *   E01_boot_SELECT.png ...      the reference with the exact area to select highlighted in red
 *   PROMPTS.md                   every prompt, complete and ready to paste
 *   cyberwr_edit_kit_v1.zip      all of the above in one download
 *
 * Selection areas come from the rig definition, so they always match the rig.
 *
 *   npx tsx tools/make-edit-kit.ts
 */
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import rigJson from '../src/content/characters/player.rig.json' with { type: 'json' };
import { shapeBounds, type GuideShape, type RigDef } from '../src/systems/rig/RigDefinition';
import { esc, FONT, grownShape, shapeElement, svgDoc } from './lib/svg';

const rig = rigJson as unknown as RigDef;
const ROOT = join(import.meta.dirname, '..');
const OUT = join(ROOT, 'docs', 'edit-kit');
const REF = join(ROOT, 'docs', 'rig-template', 'design_reference.png');
const W = rig.canvas.width;
const H = rig.canvas.height;

const STYLE = `STYLE (CyberWR): warm hand-drawn 2D narrative adventure illustration, anime-inspired, clean dark-brown outlines with consistent line weight, soft cel shading (2–3 tones per material), warm cohesive palette: ochre #D79535, dark brown #392F2D, warm skin #F5B27B, teal accent #35BFC1. Soft neutral key light from the upper left. Charming and slightly mysterious, not neon cyberpunk. No text, no letters, no numbers, no watermark.`;
const KEEP = 'Do not change anything outside the selected area. Keep the image exactly 1024x1536 with the same framing: nothing moved, zoomed or cropped.';

const slot = (id: string): GuideShape => rig.slots.find((s) => s.id === id)!.shape;
const rect = (x: number, y: number, w: number, h: number): GuideShape => ({ type: 'rect', x, y, w, h });
const pad = (s: GuideShape, p: number): GuideShape => {
  const b = shapeBounds(s);
  return rect(b.x - p, b.y - p, b.w + p * 2, b.h + p * 2);
};

interface Edit { id: string; file: string; title: string; select: GuideShape[]; selectText: string; prompt: string; base?: string }

const EDITS: Edit[] = [
  {
    id: 'E01', file: 'edit_01_boot.png', title: 'Front boot points right',
    select: [rect(320, 1318, 230, 124)],
    selectText: 'the lower part of the LEFT boot on screen (below the trousers), plus the empty space to its right where the toe will go',
    prompt: `Redraw only the selected boot so it points to the RIGHT, in the same 3/4 view as the other boot: toe pointing right, sole flat on the same ground line, same boot design, colours, laces and orange details.`,
  },
  {
    id: 'E02', file: 'edit_02_blankface.png', title: 'Blank face (skin only)',
    select: [pad(slot('brows'), 6), pad(slot('eyes'), 6), pad(slot('mouth'), 6)],
    selectText: 'the eyebrows, both eyes and the mouth',
    prompt: `Remove the eyes, eyebrows and mouth completely and paint smooth face skin in their place, with the same skin tone and soft cel shading as the rest of the face. Keep the nose, ears, jaw line and hair exactly as they are.`,
  },
  {
    id: 'E03', file: 'edit_03_eyes_half.png', title: 'Eyes half closed',
    select: [pad(slot('eyes'), 6)], selectText: 'both eyes only',
    prompt: `Make the eyes HALF CLOSED: upper eyelids lowered halfway, relaxed. Same eye shape, colour, lashes and line style.`,
  },
  {
    id: 'E04', file: 'edit_04_eyes_closed.png', title: 'Eyes closed',
    select: [pad(slot('eyes'), 6)], selectText: 'both eyes only',
    prompt: `Make the eyes peacefully CLOSED, showing only the curved lash lines. Same line style and colours.`,
  },
  {
    id: 'E05', file: 'edit_05_eyes_wide.png', title: 'Eyes wide (surprise)',
    select: [pad(slot('eyes'), 6)], selectText: 'both eyes only',
    prompt: `Make the eyes WIDE OPEN in surprise: larger whites, slightly smaller irises. Same eye colour, lashes and line style.`,
  },
  {
    id: 'E06', file: 'edit_06_brows_raised.png', title: 'Brows raised',
    select: [pad(slot('brows'), 8)], selectText: 'both eyebrows only (include a little forehead above them)',
    prompt: `Raise both eyebrows about 10 pixels and arch them more, a surprised expression. Same colour and thickness.`,
  },
  {
    id: 'E07', file: 'edit_07_mouth_neutral.png', title: 'Mouth neutral',
    select: [pad(slot('mouth'), 6)], selectText: 'the mouth only',
    prompt: `Make the mouth NEUTRAL: a relaxed closed mouth, a short almost straight line, calm expression. Same line style.`,
  },
  {
    id: 'E08', file: 'edit_08_mouth_surprised.png', title: 'Mouth surprised',
    select: [pad(slot('mouth'), 6)], selectText: 'the mouth only',
    prompt: `Make the mouth a small open "o", surprised. Same line style and colours.`,
  },
  {
    id: 'E09', file: 'edit_09_no_arms.png', title: 'Arms removed',
    select: ['upperarm_front', 'forearm_front', 'hand_front', 'upperarm_back', 'forearm_back', 'hand_back'].map((id) => grownShape(slot(id), 12)),
    selectText: 'both arms: sleeves from the shoulders down, cuffs, forearms, the watch and both hands',
    prompt: `Remove both arms completely (sleeves, cuffs, forearms, watch and hands). Repaint what would be behind them: the sides and shoulders of the same jacket with rounded shoulders where the sleeves attached, and the trousers and pockets behind the hands. Same design and colours.`,
  },
  {
    id: 'E09b', file: 'edit_09b_shoulders.png', title: 'Shoulders without sleeve tops',
    base: 'edit_09_no_arms.png',
    select: [rect(330, 445, 140, 150), rect(575, 450, 120, 140)],
    selectText: 'the top of each shoulder where the sleeve tops (and the WR badge) are still left',
    prompt: `Remove the remaining tops of both sleeves, including the WR badge patch on the left shoulder. Repaint them as the jacket's own rounded shoulders: the jacket body ends at the shoulder seam with a smooth curved shoulder line, same jacket colours and outline style, no badge.`,
  },
  {
    id: 'E10', file: 'edit_10_belt.png', title: 'Belt fully visible',
    select: [rect(415, 688, 245, 72)],
    selectText: 'the bottom edge of the jacket and the belt',
    prompt: `Show the belt and the top of the trousers fully, as if the jacket hem were slightly shorter: the full belt with buckle and the trouser waistband all the way across. Same colours and style.`,
  },
];

async function main(): Promise<void> {
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });
  copyFileSync(REF, join(OUT, 'design_reference.png'));

  for (const e of EDITS) {
    const outline = e.select.map((s) => shapeElement(s, 'fill="#ff2d2d" fill-opacity="0.28" stroke="#ff2d2d" stroke-width="4"')).join('');
    const dimMask = `<defs><mask id="m"><rect width="100%" height="100%" fill="white"/>${e.select.map((s) => shapeElement(s, 'fill="black"')).join('')}</mask></defs>` +
      `<rect width="100%" height="100%" fill="#ffffff" fill-opacity="0.45" mask="url(#m)"/>`;
    const label = `<rect x="20" y="20" width="${W - 40}" height="96" rx="12" fill="#2b2130" opacity="0.92"/>` +
      `<text x="40" y="60" font-family="${FONT}" font-size="28" font-weight="800" fill="#fff8ec">${esc(`${e.id}  ${e.title}`)}</text>` +
      `<text x="40" y="96" font-family="${FONT}" font-size="20" font-weight="500" fill="#ffb3b3">${esc('Select the RED area in ChatGPT\'s image editor')}</text>`;
    const base = await sharp({ create: { width: W, height: H, channels: 4, background: '#ffffff' } }).composite([{ input: REF }]).png().toBuffer();
    await sharp(base).composite([{ input: Buffer.from(svgDoc(W, H, dimMask + outline + label)) }]).png().toFile(join(OUT, `${e.id}_${e.file.replace(/^edit_\d+b?_/, '').replace('.png', '')}_SELECT.png`));
  }

  // Overview: all selection pictures in one grid.
  const thumbs = EDITS.map((e) => join(OUT, `${e.id}_${e.file.replace(/^edit_\d+b?_/, '').replace('.png', '')}_SELECT.png`));
  const tw = 256, th = 384, cols = 6;
  const tiles = await Promise.all(thumbs.map((f) => sharp(f).resize(tw, th).png().toBuffer()));
  await sharp({ create: { width: tw * cols, height: th * Math.ceil(tiles.length / cols), channels: 3, background: '#ffffff' } })
    .composite(tiles.map((input, i) => ({ input, left: (i % cols) * tw, top: Math.floor(i / cols) * th })))
    .png().toFile(join(OUT, 'OVERVIEW.png'));

  const md = [
    '# CyberWR character edit kit: prompts',
    '',
    'For **every** edit:',
    '',
    '1. Open a new message in your CyberWR ChatGPT Project and upload **`design_reference.png`** (always the original, never a previous edit).',
    '2. Open the image in ChatGPT\'s **image editor** and use the **select / brush tool** to mark the area shown in red in the matching `E0x_..._SELECT.png` picture.',
    '3. Paste the prompt below for that edit and send.',
    '4. Download the result and rename it to the **file name** given. Check that nothing outside the red area moved.',
    '5. When all 10 are done, zip them and send them to Claude.',
    '',
    'If the editor has no selection tool available, attach both `design_reference.png` and the `_SELECT` picture and say: "Edit only the area outlined in red in the second image."',
    '',
  ];
  for (const e of EDITS) {
    md.push(`## ${e.id}: ${e.title}`, '');
    if (e.base) md.push(`- **Upload instead of the design reference:** \`${e.base}\` (your earlier result)`);
    md.push(`- **Select:** ${e.selectText} (see \`${e.id}_..._SELECT.png\`)`, `- **Save the result as:** \`${e.file}\``, '', '```', STYLE, '', `Edit only the selected area. ${e.prompt}`, KEEP, '```', '');
  }
  writeFileSync(join(OUT, 'PROMPTS.md'), md.join('\n'));
  execFileSync('zip', ['-r', '-q', '-X', 'cyberwr_edit_kit_v1.zip', '.', '-x', '*.zip'], { cwd: OUT });
  console.log(`Edit kit written to ${OUT}`);
}

await main();
