/**
 * Asset pipeline: validates deliveries in assets-src/ against the declared
 * manifest, generates labelled placeholders for anything missing or invalid,
 * trims sprites, and writes public/assets/ + the runtime manifest.
 *
 *   npm run assets             build everything
 *   npm run assets:validate    check deliveries only, exit 1 on errors
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import sharp from 'sharp';
import { expandManifest, type DeclaredAsset, type DeclaredManifest, type RuntimeAsset, type RuntimeManifest } from '../src/core/AssetManifest';
import { coverageProbes, shapeBounds, type RigDef } from '../src/systems/rig/RigDefinition';
import playerRig from '../src/content/characters/player.rig.json' with { type: 'json' };
import declared from '../src/content/assets/manifest.json' with { type: 'json' };
import { placeholderSvg } from './lib/placeholders';

const ROOT = join(import.meta.dirname, '..');
const SRC = join(ROOT, 'assets-src');
const OUT = join(ROOT, 'public', 'assets');
const REPORTS = join(OUT, '_reports');
const validateOnly = process.argv.includes('--validate-only');

const rigs: Record<string, RigDef> = { player: playerRig as unknown as RigDef };

type Level = 'error' | 'warn' | 'info';
interface Issue { level: Level; key: string; file: string; message: string }
const issues: Issue[] = [];
const note = (level: Level, a: DeclaredAsset, message: string): void => { issues.push({ level, key: a.key, file: a.file, message }); };

interface Raster { data: Buffer; width: number; height: number }

async function rasterFromFile(path: string): Promise<{ raster: Raster; format?: string; hadAlpha: boolean }> {
  const img = sharp(path);
  const meta = await img.metadata();
  const { data, info } = await img.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { raster: { data, width: info.width, height: info.height }, format: meta.format, hadAlpha: meta.hasAlpha ?? false };
}

async function rasterFromSvg(svg: string): Promise<Raster> {
  const { data, info } = await sharp(Buffer.from(svg)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

/** Fallback for generators that cannot export transparency: key out a flat #00FF00 background. */
function chromaKey(r: Raster): boolean {
  const px = (x: number, y: number): number[] => { const i = (y * r.width + x) * 4; return [r.data[i], r.data[i + 1], r.data[i + 2]]; };
  const isGreen = ([R, G, B]: number[]): boolean => G > 180 && R < 90 && B < 90;
  const corners = [px(0, 0), px(r.width - 1, 0), px(0, r.height - 1), px(r.width - 1, r.height - 1)];
  if (!corners.every(isGreen)) return false;
  for (let i = 0; i < r.data.length; i += 4) {
    const R = r.data[i], G = r.data[i + 1], B = r.data[i + 2];
    const greenness = G - Math.max(R, B);
    if (greenness > 90) r.data[i + 3] = 0;
    else if (greenness > 25) {
      r.data[i + 3] = Math.round(255 * (1 - (greenness - 25) / 65));
      r.data[i + 1] = Math.max(R, B); // spill suppression
    }
  }
  return true;
}

function alphaBounds(r: Raster, threshold = 8): { x: number; y: number; w: number; h: number } | null {
  let x0 = r.width, y0 = r.height, x1 = -1, y1 = -1;
  for (let y = 0; y < r.height; y++) {
    for (let x = 0; x < r.width; x++) {
      if (r.data[(y * r.width + x) * 4 + 3] > threshold) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

function validatePixels(a: DeclaredAsset, r: Raster): void {
  let transparent = 0, semi = 0, white = 0, green = 0;
  for (let i = 0; i < r.data.length; i += 4) {
    const al = r.data[i + 3];
    if (al < 250) transparent++;
    if (al > 10 && al < 200) {
      semi++;
      const R = r.data[i], G = r.data[i + 1], B = r.data[i + 2];
      if (Math.min(R, G, B) > 225) white++;
      if (G > 180 && R < 120 && B < 120) green++;
    }
  }
  if (a.alpha && transparent === 0) note('error', a, 'Must have a transparent background, but every pixel is opaque.');
  if (!a.alpha && transparent > 0) note('warn', a, `Should be fully opaque, found ${transparent} transparent pixels.`);
  if (a.alpha && semi > 200 && white / semi > 0.4) note('warn', a, 'Edges look like they have a white halo/fringe.');
  if (a.alpha && semi > 200 && green / semi > 0.2) note('warn', a, 'Edges show green-screen spill.');

  const pad = a.padding ?? 0;
  if (a.alpha && pad > 0) {
    const tx = a.tile === 'x' || a.tile === 'xy';
    const ty = a.tile === 'y' || a.tile === 'xy';
    let touching = 0;
    for (let y = 0; y < r.height; y++) {
      for (let x = 0; x < r.width; x++) {
        const inBand = (!tx && (x < pad || x >= r.width - pad)) || (!ty && (y < pad || y >= r.height - pad));
        if (inBand && r.data[(y * r.width + x) * 4 + 3] > 8) touching++;
      }
    }
    if (touching > 0) note('warn', a, `${touching} visible pixels inside the ${pad}px edge padding (art may be cropped).`);
  }

  if (a.rig) {
    const rig = rigs[a.rig.id];
    const slot = rig.slots.find((s) => s.id === a.rig!.slot)!;
    const art = alphaBounds(r);
    const guide = shapeBounds(slot.shape);
    if (!art) {
      note('error', a, 'Part is completely empty.');
      return;
    }
    const dx = art.x + art.w / 2 - (guide.x + guide.w / 2);
    const dy = art.y + art.h / 2 - (guide.y + guide.h / 2);
    const off = Math.hypot(dx, dy);
    const tolerance = Math.max(40, 0.45 * Math.max(guide.w, guide.h));
    if (off > tolerance) note('warn', a, `Misaligned: art centre is ${Math.round(off)}px from the template position (dx ${Math.round(dx)}, dy ${Math.round(dy)}).`);
    // Hidden overlap: every probe point (past each joint) must be painted.
    const missing = coverageProbes(rig, slot).filter(([x, y]) => !covered(r, x, y));
    for (const [x, y] of missing) {
      const near = rig.bones.filter((b) => b.parent).reduce((best, b) => (Math.hypot(b.pivot[0] - x, b.pivot[1] - y) < Math.hypot(best.pivot[0] - x, best.pivot[1] - y) ? b : best));
      note('error', a, `Hidden overlap not painted at (${x}, ${y}): paint ~${rig.jointOverlap}px past ${near.label ?? near.id} (${near.pivot[0]}, ${near.pivot[1]}).`);
    }
  }
}

/** True if any opaque pixel lies within `radius` px of (x, y). */
function covered(r: Raster, x: number, y: number, radius = 4): boolean {
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const px = x + dx, py = y + dy;
      if (px < 0 || py < 0 || px >= r.width || py >= r.height) continue;
      if (r.data[(py * r.width + px) * 4 + 3] > 128) return true;
    }
  }
  return false;
}

/**
 * Checks that need several rig parts at once (run before the main loop so
 * failures fall back to placeholders): duplicated expression states, hair drawn
 * in both layers, and facial features baked into the head.
 */
async function crossCheckRigParts(assets: DeclaredAsset[]): Promise<void> {
  const delivered = new Map<string, { a: DeclaredAsset; r: Raster }>();
  for (const a of assets) {
    if (!a.rig) continue;
    const path = join(SRC, a.file);
    if (!existsSync(path)) continue;
    const { raster } = await rasterFromFile(path);
    if (raster.width === a.size[0] && raster.height === a.size[1]) delivered.set(a.key, { a, r: raster });
  }
  const opaque = (r: Raster, i: number): boolean => r.data[i * 4 + 3] > 128;
  const opaqueCount = (r: Raster): number => { let n = 0; for (let i = 0; i < r.width * r.height; i++) if (opaque(r, i)) n++; return n; };

  // 0. Expression states must actually contain a drawing (not a few stray pixels).
  for (const d of delivered.values()) {
    if (!d.a.rig?.state) continue;
    const n = opaqueCount(d.r);
    if (n > 0 && n < 80) note('error', d.a, `Almost empty (${n} visible pixels); the ${d.a.rig.state} state needs a clear drawing.`);
  }

  // 1. Expression states must be different drawings.
  const bySlot = new Map<string, { a: DeclaredAsset; r: Raster }[]>();
  for (const d of delivered.values()) {
    if (!d.a.rig?.state) continue;
    const group = d.a.key.slice(0, d.a.key.lastIndexOf('.'));
    bySlot.set(group, [...(bySlot.get(group) ?? []), d]);
  }
  for (const states of bySlot.values()) {
    for (let i = 1; i < states.length; i++) {
      const twin = states.slice(0, i).find((o) => o.r.data.equals(states[i].r.data));
      if (twin && opaqueCount(states[i].r) > 0) {
        note('error', states[i].a, `Identical to the "${twin.a.rig!.state}" state; each state must be its own drawing.`);
      }
    }
  }

  for (const d of delivered.values()) {
    const rig = rigs[d.a.rig!.id];
    // 2. Hair must not be drawn in both layers.
    if (d.a.rig!.slot === 'hair_back') {
      const front = delivered.get(d.a.key.replace(/\.back$/, '.front'));
      if (front) {
        let frontPx = 0, both = 0;
        for (let i = 0; i < d.r.width * d.r.height; i++) {
          if (!opaque(front.r, i)) continue;
          frontPx++;
          if (opaque(d.r, i)) both++;
        }
        const share = frontPx ? both / frontPx : 0;
        if (share > 0.5) note('error', d.a, `Contains the front hair as well (${Math.round(share * 100)}% of hair_front is painted here too). Keep only the hair behind the head.`);
        else if (share > 0.15) note('warn', d.a, `${Math.round(share * 100)}% of hair_front is also painted in hair_back; keep the overlap to a thin blend edge.`);
      }
    }
    // 3. The head must be skin only: no dark eye or mouth line art in the feature zones.
    if (d.a.rig!.slot === 'head') {
      for (const zoneId of ['eyes', 'mouth']) {
        const zone = rig.slots.find((s) => s.id === zoneId);
        if (!zone) continue;
        const b = shapeBounds(zone.shape);
        let dark = 0, area = 0;
        for (let y = Math.round(b.y); y < b.y + b.h; y++) {
          for (let x = Math.round(b.x); x < b.x + b.w; x++) {
            const i = y * d.r.width + x;
            area++;
            const R = d.r.data[i * 4], G = d.r.data[i * 4 + 1], B = d.r.data[i * 4 + 2];
            if (opaque(d.r, i) && 0.299 * R + 0.587 * G + 0.114 * B < 80) dark++;
          }
        }
        if (dark / area > 0.04) note('error', d.a, `Looks like it still contains the ${zoneId} (${Math.round((dark / area) * 100)}% dark line art in the ${zoneId} zone). The head must be skin only.`);
      }
    }
  }
}

async function main(): Promise<void> {
  const manifest = declared as unknown as DeclaredManifest;
  const { assets, problems } = expandManifest(manifest, rigs);
  if (problems.length) {
    for (const p of problems) console.error(`manifest: ${p}`);
    process.exit(1);
  }

  if (!validateOnly) {
    rmSync(OUT, { recursive: true, force: true });
    mkdirSync(REPORTS, { recursive: true });
  }

  const runtime: RuntimeManifest = { version: 1, generatedAt: new Date().toISOString(), assets: {}, summary: { total: 0, real: 0, placeholders: 0, warnings: 0, errors: 0 } };
  const fullCanvas = new Map<string, Raster>(); // untrimmed rasters, for the rig composite report
  await crossCheckRigParts(assets);
  const hasError = (key: string): boolean => issues.some((i) => i.key === key && i.level === 'error');

  for (const a of assets) {
    const srcPath = join(SRC, a.file);
    let raster: Raster | null = null;
    let isPlaceholder = true;

    if (existsSync(srcPath)) {
      const { raster: r, format, hadAlpha } = await rasterFromFile(srcPath);
      if (format !== 'png') note('error', a, `Must be PNG, got ${format}.`);
      const sizeOk = r.width === a.size[0] && r.height === a.size[1];
      if (!sizeOk) note('error', a, `Wrong size ${r.width}×${r.height}, expected ${a.size[0]}×${a.size[1]}.`);
      if (a.alpha && !hadAlpha) {
        if (chromaKey(r)) note('warn', a, 'No alpha channel; keyed out a #00FF00 background. Prefer real transparency.');
      }
      // Position-based checks are meaningless on the wrong canvas size.
      if (sizeOk) validatePixels(a, r);
      if (!hasError(a.key)) {
        raster = r;
        isPlaceholder = false;
      } else {
        note('info', a, 'Using placeholder until the errors above are fixed.');
      }
    } else if (a.required) {
      note('error', a, 'Required asset is missing.');
    }

    if (!raster) raster = await rasterFromSvg(placeholderSvg(a, rigs));
    if (a.rig) fullCanvas.set(a.key, raster);

    let out = sharp(raster.data, { raw: { width: raster.width, height: raster.height, channels: 4 } });
    let trim: { x: number; y: number } | undefined;
    let width = raster.width, height = raster.height;
    if (a.trim) {
      const b = alphaBounds(raster, 0);
      if (b) {
        const m = 2;
        const x = Math.max(0, b.x - m), y = Math.max(0, b.y - m);
        width = Math.min(raster.width, b.x + b.w + m) - x;
        height = Math.min(raster.height, b.y + b.h + m) - y;
        out = out.extract({ left: x, top: y, width, height });
        trim = { x, y };
      }
    }

    const url = `assets/${a.file}`;
    if (!validateOnly) {
      mkdirSync(dirname(join(OUT, a.file)), { recursive: true });
      await out.png({ compressionLevel: 9 }).toFile(join(OUT, a.file));
    }
    const entry: RuntimeAsset = { key: a.key, type: a.type ?? 'image', url, placeholder: isPlaceholder, width, height, source: { width: a.size[0], height: a.size[1] }, trim, rig: a.rig };
    runtime.assets[a.key] = entry;
    runtime.summary.total++;
    runtime.summary[isPlaceholder ? 'placeholders' : 'real']++;
  }

  // Files delivered that the manifest does not know about (usually a naming typo).
  const known = new Set(assets.map((a) => a.file));
  const walk = (dir: string): string[] => (existsSync(dir) ? readdirSync(dir).flatMap((f) => { const p = join(dir, f); return statSync(p).isDirectory() ? walk(p) : [p]; }) : []);
  for (const f of walk(SRC)) {
    const rel = relative(SRC, f).split('\\').join('/');
    if (/\.(png|jpe?g|webp|psd)$/i.test(rel) && !known.has(rel)) issues.push({ level: 'warn', key: '-', file: rel, message: 'Not in the manifest (check the file name and folder against docs/ASSET_SPEC.md).' });
  }

  // Rig composite: every part at rest pose in draw order. Compare against the reference render.
  if (!validateOnly) {
    for (const set of manifest.rigs ?? []) {
      const rig = rigs[set.rig];
      for (const appearance of set.appearances) {
        const layers = rig.slots.map((slot) => {
          const key = slot.key.replace(/\{(\w+)\}/g, (_, n: string) => (n === 'state' ? slot.default! : appearance[n]));
          const r = fullCanvas.get(key)!;
          return { input: r.data, raw: { width: r.width, height: r.height, channels: 4 as const }, left: 0, top: 0 };
        });
        const name = `${rig.id}_${appearance.outfit ?? 'default'}_composite.png`;
        await sharp({ create: { width: rig.canvas.width, height: rig.canvas.height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite(layers).png().toFile(join(REPORTS, name));
        runtime.assets[`report.${rig.id}.${appearance.outfit}.composite`] = { key: `report.${rig.id}.${appearance.outfit}.composite`, type: 'image', url: `assets/_reports/${name}`, placeholder: false, width: rig.canvas.width, height: rig.canvas.height, source: { width: rig.canvas.width, height: rig.canvas.height } };
      }
    }
    // The rig template guide doubles as an overlay in the Rig Lab.
    const guide = join(ROOT, 'docs', 'rig-template', 'rig_template_guide.png');
    if (existsSync(guide)) {
      mkdirSync(join(OUT, '_dev'), { recursive: true });
      writeFileSync(join(OUT, '_dev', 'rig_template_guide.png'), readFileSync(guide));
      runtime.assets['dev.rig_template'] = { key: 'dev.rig_template', type: 'image', url: 'assets/_dev/rig_template_guide.png', placeholder: false, width: 1024, height: 1536, source: { width: 1024, height: 1536 } };
    }
    // The approved design reference, for comparing the rig against the intended look.
    const design = join(ROOT, 'docs', 'rig-template', 'design_reference.png');
    if (existsSync(design)) {
      mkdirSync(join(OUT, '_dev'), { recursive: true });
      writeFileSync(join(OUT, '_dev', 'design_reference.png'), readFileSync(design));
      runtime.assets['dev.design_ref'] = { key: 'dev.design_ref', type: 'image', url: 'assets/_dev/design_reference.png', placeholder: false, width: 1024, height: 1536, source: { width: 1024, height: 1536 } };
    }
  }

  runtime.summary.errors = issues.filter((i) => i.level === 'error').length;
  runtime.summary.warnings = issues.filter((i) => i.level === 'warn').length;
  if (!validateOnly) {
    writeFileSync(join(OUT, 'manifest.json'), JSON.stringify(runtime, null, 2));
    writeFileSync(join(REPORTS, 'asset-report.json'), JSON.stringify({ summary: runtime.summary, issues }, null, 2));
  }

  for (const i of issues) {
    const tag = i.level === 'error' ? 'ERROR' : i.level === 'warn' ? 'warn ' : 'info ';
    console.log(`${tag} ${i.file}: ${i.message}`);
  }
  const s = runtime.summary;
  console.log(`assets: ${s.total} total · ${s.real} delivered · ${s.placeholders} placeholders · ${s.warnings} warnings · ${s.errors} errors`);
  if (validateOnly && s.errors > 0) process.exit(1);
}

await main();
