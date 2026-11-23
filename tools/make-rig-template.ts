/**
 * Generates the rig template package for the art team from the rig
 * definition (src/content/characters/player.rig.json):
 *
 *   docs/rig-template/rig_template_guide.png      labelled guide: joints, lines, overlap zones
 *   docs/rig-template/rig_template_mannequin.png  clean mannequin on white, for image-edit input
 *   docs/rig-template/rig_template_parts_map.png  colour-coded parts + draw order + file names
 *   docs/rig-template/guides/guide_<slot>.png     one transparent canvas per part, showing exactly where it goes
 *   docs/rig-template/rig_joints.json             joint coordinates and expected file names
 *   docs/rig-template/cyberwr_rig_template_v1.zip everything above + README, for download
 *
 *   npm run rig:template
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { resolveTemplate, shapeBounds, type RigDef, type SlotDef } from '../src/systems/rig/RigDefinition';
import playerRig from '../src/content/characters/player.rig.json' with { type: 'json' };
import declared from '../src/content/assets/manifest.json' with { type: 'json' };
import { esc, FONT, grownShape, shapeElement, svgDoc } from './lib/svg';

const rig = playerRig as unknown as RigDef;
const ROOT = join(import.meta.dirname, '..');
const OUT = join(ROOT, 'docs', 'rig-template');
const W = rig.canvas.width;
const H = rig.canvas.height;
const appearance = (declared.rigs ?? []).find((r) => r.rig === rig.id)!.appearances[0];
const fileFor = (slot: SlotDef, state?: string): string => resolveTemplate(slot.file, appearance, state);

const isFace = (s: SlotDef): boolean => Boolean(s.states);
const isHair = (s: SlotDef): boolean => s.family === 'hair';
const isBackLimb = (s: SlotDef): boolean => s.id.endsWith('_back') && !isHair(s);

function text(x: number, y: number, t: string, opts: { size?: number; anchor?: 'start' | 'middle' | 'end'; weight?: number; fill?: string; halo?: boolean } = {}): string {
  const { size = 15, anchor = 'start', weight = 600, fill = '#2b2130', halo = true } = opts;
  const haloAttr = halo ? `stroke="#ffffff" stroke-width="4" stroke-linejoin="round" paint-order="stroke"` : '';
  return `<text x="${x}" y="${y}" font-family="${FONT}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}" ${haloAttr}>${esc(t)}</text>`;
}

function mannequin(opts: { fill: (s: SlotDef) => string; stroke: (s: SlotDef) => string; strokeWidth: number; includeHair: boolean; includeFace: boolean }): string {
  return rig.slots
    .filter((s) => (opts.includeHair || !isHair(s)) && (opts.includeFace || !isFace(s)))
    .map((s) => shapeElement(s.shape, `fill="${opts.fill(s)}" stroke="${opts.stroke(s)}" stroke-width="${opts.strokeWidth}" stroke-linejoin="round"`))
    .join('');
}

function jointMarker(x: number, y: number, r = 9): string {
  return `<circle cx="${x}" cy="${y}" r="${r}" fill="#ffffff" stroke="#c0392b" stroke-width="3"/>` +
    `<path d="M ${x - r - 6} ${y} H ${x + r + 6} M ${x} ${y - r - 6} V ${y + r + 6}" stroke="#c0392b" stroke-width="1.5"/>` +
    `<circle cx="${x}" cy="${y}" r="2" fill="#c0392b"/>`;
}

function grid(): string {
  let g = '';
  for (let x = 0; x <= W; x += 64) g += `<line x1="${x}" y1="0" x2="${x}" y2="${H}" stroke="${x % 256 === 0 ? '#ddd2c0' : '#eee7db'}" stroke-width="1"/>`;
  for (let y = 0; y <= H; y += 64) g += `<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="${y % 256 === 0 ? '#ddd2c0' : '#eee7db'}" stroke-width="1"/>`;
  return g;
}

function guideLines(): string {
  const p = rig.padding;
  return [
    `<rect x="${p}" y="${p}" width="${W - p * 2}" height="${H - p * 2}" fill="none" stroke="#c0392b" stroke-width="2" stroke-dasharray="10 6"/>`,
    `<line x1="0" y1="${rig.baselineY}" x2="${W}" y2="${rig.baselineY}" stroke="#c0392b" stroke-width="3"/>`,
    text(W - 30, rig.baselineY - 10, `BASELINE  y = ${rig.baselineY}  (front sole)`, { anchor: 'end', fill: '#c0392b' }),
    `<line x1="0" y1="${rig.skullTopY}" x2="${W}" y2="${rig.skullTopY}" stroke="#2e6fa8" stroke-width="2" stroke-dasharray="12 8"/>`,
    text(W - 30, rig.skullTopY - 10, `TOP OF SKULL  y = ${rig.skullTopY}  (hair may rise above)`, { anchor: 'end', fill: '#2e6fa8' }),
    `<line x1="${rig.centerX}" y1="0" x2="${rig.centerX}" y2="${H}" stroke="#2e6fa8" stroke-width="1.5" stroke-dasharray="4 8"/>`,
    text(rig.centerX + 8, 162, `CENTRE  x = ${rig.centerX}`, { fill: '#2e6fa8', size: 14 }),
    // height bracket
    `<path d="M 96 ${rig.skullTopY} H 120 M 108 ${rig.skullTopY} V ${rig.baselineY} M 96 ${rig.baselineY} H 120" stroke="#2e6fa8" stroke-width="2" fill="none"/>`,
    `<text x="92" y="${(rig.skullTopY + rig.baselineY) / 2}" font-family="${FONT}" font-size="18" font-weight="700" fill="#2e6fa8" text-anchor="middle" transform="rotate(-90 92 ${(rig.skullTopY + rig.baselineY) / 2})">${rig.baselineY - rig.skullTopY} px  sole → skull top</text>`,
    text(p + 6, p + 118, `${p}px padding: keep the border empty`, { size: 13, fill: '#c0392b' }),
  ].join('');
}

function header(title: string): string {
  return `<rect x="24" y="24" width="${W - 48}" height="92" rx="12" fill="#2b2130" opacity="0.92"/>` +
    text(44, 60, title, { size: 24, weight: 800, fill: '#fff8ec', halo: false }) +
    text(44, 92, `Canvas ${W}×${H} px · 3/4 view facing screen-right · rest pose · rig v${rig.version}`, { size: 16, weight: 500, fill: '#e8dccb', halo: false }) +
    `<path d="M ${W - 150} 70 H ${W - 60} M ${W - 78} 56 L ${W - 58} 70 L ${W - 78} 84" stroke="#f6bd60" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>` +
    text(W - 105, 102, 'FACING', { size: 13, anchor: 'middle', fill: '#f6bd60', halo: false });
}

function labelSide(boneId: string): 'left' | 'right' | 'centre' {
  if (boneId.endsWith('_front')) return 'left';
  if (boneId.endsWith('_back')) return 'right';
  return 'centre';
}

function jointLabels(): string {
  let out = '';
  for (const bone of rig.bones) {
    if (bone.id === 'root') continue;
    const [x, y] = bone.pivot;
    const side = labelSide(bone.id);
    const t = `${bone.label ?? bone.id} (${x}, ${y})`;
    if (side === 'left') out += `<line x1="${x - 12}" y1="${y}" x2="${x - 60}" y2="${y}" stroke="#c0392b" stroke-width="1.5"/>` + text(x - 64, y + 5, t, { anchor: 'end', size: 14 });
    else if (side === 'right') out += `<line x1="${x + 12}" y1="${y}" x2="${x + 70}" y2="${y}" stroke="#c0392b" stroke-width="1.5"/>` + text(x + 74, y + 5, t, { size: 14 });
    else {
      const lx = 760;
      const ly = ({ head: 372, neck: 445, torso: 752, pelvis: 796 } as Record<string, number>)[bone.id] ?? y;
      out += `<path d="M ${x + 12} ${y} L ${lx - 8} ${ly - 5}" stroke="#c0392b" stroke-width="1.5" fill="none"/>` + text(lx, ly, t, { size: 14 });
    }
    out += jointMarker(x, y);
  }
  const [rx, ry] = rig.bones[0].pivot;
  out += `<circle cx="${rx}" cy="${ry}" r="7" fill="#c0392b"/>` + text(rx + 14, ry - 10, `ROOT (${rx}, ${ry})`, { size: 13, fill: '#c0392b' });
  return out;
}

function faceZones(): string {
  return rig.slots.filter(isFace).map((s) => {
    const b = shapeBounds(s.shape);
    return `<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="6" fill="${s.color}" fill-opacity="0.12" stroke="${s.color}" stroke-width="2" stroke-dasharray="5 4"/>` +
      text(b.x + b.w + 8, b.y + b.h / 2 + 5, s.id, { size: 12, fill: '#5a4636' });
  }).join('');
}

function hairZone(): string {
  const hair = rig.slots.filter(isHair);
  return hair.map((s) => shapeElement(grownShape(s.shape, 24), `fill="none" stroke="${s.color}" stroke-width="2" stroke-dasharray="3 6"`)).join('') +
    text(150, 162, 'dotted = hair zone (approx.)', { size: 13, fill: '#7a5038' });
}

function overlapZones(): string {
  return rig.slots.filter((s) => !isFace(s) && !isHair(s)).map((s) =>
    shapeElement(grownShape(s.shape, rig.jointOverlap), `fill="none" stroke="${s.color}" stroke-opacity="0.75" stroke-width="1.5" stroke-dasharray="6 6"`)).join('');
}

const legendY = H - 52;

async function render(svg: string, file: string): Promise<void> {
  await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(file);
}

async function main(): Promise<void> {
  // Regenerate outputs but keep the hand-written README.md in the folder.
  rmSync(join(OUT, 'guides'), { recursive: true, force: true });
  rmSync(join(OUT, 'cyberwr_rig_template_v1.zip'), { force: true });
  mkdirSync(join(OUT, 'guides'), { recursive: true });

  // 1. Labelled guide
  const guide = svgDoc(W, H,
    grid() + guideLines() +
    mannequin({ fill: (s) => (isBackLimb(s) ? '#d9cfbf' : '#ebe2d3'), stroke: (s) => s.color ?? '#999', strokeWidth: 3, includeHair: false, includeFace: false }) +
    overlapZones() + faceZones() + hairZone() + jointLabels() + header('CyberWR · Player rig template') +
    `<rect x="130" y="${legendY - 24}" width="${W - 260}" height="46" rx="8" fill="#fff8ec" stroke="#ddd2c0"/>` +
    text(W / 2, legendY - 4, 'Solid outline = part shape · dashed = paint ~30px PAST each joint (hidden overlap)', { size: 14, anchor: 'middle', halo: false }) +
    text(W / 2, legendY + 15, 'Paint every part on its own transparent 1024×1536 canvas, in exactly this position.', { size: 14, anchor: 'middle', halo: false }),
    '#faf6ef');
  await render(guide, join(OUT, 'rig_template_guide.png'));

  // 2. Clean mannequin (no text) for image-to-image / edit input
  const clean = svgDoc(W, H,
    `<line x1="0" y1="${rig.baselineY}" x2="${W}" y2="${rig.baselineY}" stroke="#d8cfc2" stroke-width="2"/>` +
    mannequin({ fill: (s) => (isBackLimb(s) ? '#cfc6ba' : '#e4ddd3'), stroke: () => '#8c8177', strokeWidth: 3, includeHair: false, includeFace: false }) +
    rig.bones.filter((b) => b.id !== 'root').map((b) => `<circle cx="${b.pivot[0]}" cy="${b.pivot[1]}" r="4" fill="#b8aea2"/>`).join(''),
    '#ffffff');
  await render(clean, join(OUT, 'rig_template_mannequin.png'));

  // 3. Parts map with draw order legend
  const mapW = W + 620;
  const slotsBackToFront = rig.slots;
  let legend = text(W + 30, 60, 'Draw order (1 = back, drawn first)', { size: 20, weight: 800, halo: false });
  slotsBackToFront.forEach((s, i) => {
    const y = 100 + i * 58;
    const files = s.states ? s.states.map((st) => fileFor(s, st)) : [fileFor(s)];
    legend += `<rect x="${W + 30}" y="${y - 18}" width="26" height="26" rx="5" fill="${s.color}" stroke="#3b2a26" stroke-width="2"/>` +
      text(W + 68, y, `${i + 1}. ${s.id}`, { size: 17, weight: 700, halo: false }) +
      text(W + 68, y + 20, files.length > 1 ? `${files[0].replace(`_${s.states![0]}.png`, '_{state}.png')}  states: ${s.states!.join(', ')}` : files[0], { size: 12.5, weight: 500, fill: '#5a4f45', halo: false });
  });
  const partsMap = svgDoc(mapW, H,
    `<rect width="${W}" height="${H}" fill="#faf6ef"/>` + grid() +
    rig.slots.map((s) => shapeElement(s.shape, `fill="${s.color}" fill-opacity="${isFace(s) ? 0.9 : 0.85}" stroke="#3b2a26" stroke-width="2.5" stroke-linejoin="round"`)).join('') +
    rig.slots.filter((s) => !isFace(s)).map((s) => {
      const b = shapeBounds(s.shape);
      const lx = s.id === 'hair_back' ? b.x + 30 : s.id === 'hair_front' ? b.x + b.w / 2 : b.x + b.w / 2;
      const ly = s.id === 'hair_back' ? b.y + b.h - 40 : s.id === 'hair_front' ? b.y + 40 : b.y + b.h / 2;
      return `<text x="${lx}" y="${ly}" font-family="${FONT}" font-size="13" font-weight="700" fill="#ffffff" text-anchor="middle" stroke="#2b2130" stroke-width="3" paint-order="stroke">${esc(s.id)}</text>`;
    }).join('') +
    header('Parts map · one PNG per coloured region') + legend,
    '#ffffff');
  await render(partsMap, join(OUT, 'rig_template_parts_map.png'));

  // 4. Per-part guides (transparent canvases)
  for (const s of rig.slots) {
    const bone = rig.bones.find((b) => b.id === s.bone)!;
    const ctx = mannequin({ fill: () => 'none', stroke: () => '#8c8177', strokeWidth: 1.5, includeHair: false, includeFace: false });
    const files = s.states ? s.states.map((st) => fileFor(s, st)).join(' / ') : fileFor(s);
    const body =
      `<g opacity="0.35">${ctx}</g>` +
      (isFace(s) ? '' : shapeElement(grownShape(s.shape, isHair(s) ? 24 : rig.jointOverlap), `fill="${s.color}" fill-opacity="0.12" stroke="${s.color}" stroke-width="2" stroke-dasharray="6 6"`)) +
      shapeElement(s.shape, `fill="${s.color}" fill-opacity="0.45" stroke="${s.color}" stroke-width="3"`) +
      jointMarker(bone.pivot[0], bone.pivot[1]) +
      `<rect x="24" y="24" width="${W - 48}" height="${s.states ? 92 : 70}" rx="10" fill="#2b2130" opacity="0.9"/>` +
      text(40, 56, `${s.id}  →  pivot ${bone.label ?? bone.id} (${bone.pivot[0]}, ${bone.pivot[1]})`, { size: 20, weight: 800, fill: '#fff8ec', halo: false }) +
      text(40, 84, files.length > 70 ? files.slice(0, 70) + '…' : files, { size: 14, weight: 500, fill: '#e8dccb', halo: false }) +
      (s.states ? text(40, 106, `States: ${s.states.join(', ')}. Same canvas position for every state.`, { size: 14, weight: 500, fill: '#e8dccb', halo: false }) : '');
    await render(svgDoc(W, H, body), join(OUT, 'guides', `guide_${s.id}.png`));
  }

  // 5. Joints / files table
  writeFileSync(join(OUT, 'rig_joints.json'), JSON.stringify({
    rig: rig.id,
    version: rig.version,
    canvas: rig.canvas,
    baselineY: rig.baselineY,
    skullTopY: rig.skullTopY,
    centerX: rig.centerX,
    padding: rig.padding,
    jointOverlap: rig.jointOverlap,
    joints: rig.bones.map((b) => ({ id: b.id, label: b.label, x: b.pivot[0], y: b.pivot[1], parent: b.parent })),
    parts: rig.slots.map((s, i) => ({
      drawOrder: i + 1,
      slot: s.id,
      attachedTo: s.bone,
      files: s.states ? s.states.map((st) => `assets-src/characters/player/${fileFor(s, st)}`) : [`assets-src/characters/player/${fileFor(s)}`],
      approxBounds: shapeBounds(s.shape),
    })),
  }, null, 2) + '\n');

  // 6. Downloadable package
  const zip = join(OUT, 'cyberwr_rig_template_v1.zip');
  try {
    execFileSync('zip', ['-r', '-q', '-X', zip, '.', '-x', '*.zip'], { cwd: OUT });
  } catch {
    console.warn('zip not available; skipped the package archive');
  }
  console.log(`Rig template written to ${OUT}`);
}

await main();
