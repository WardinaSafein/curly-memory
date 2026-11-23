/**
 * Placeholder art generator. Every asset the game expects gets a clearly
 * labelled stand-in (file name + exact size) until the real PNG lands in
 * assets-src/. Placeholders go through exactly the same pipeline as real art.
 */
import type { DeclaredAsset } from '../../src/core/AssetManifest';
import type { RigDef, SlotDef } from '../../src/systems/rig/RigDefinition';
import { esc, FONT, grownShape, shade, shapeElement, svgDoc } from './svg';

const INK = '#3b2a26';

/** Label block: file name + size. `at` keeps labels away from gameplay areas on large layers. */
function label(asset: DeclaredAsset, w: number, h: number, dark = true, at: 'center' | 'top' | 'corner' = 'center'): string {
  const fg = dark ? '#fff8ec' : '#2b2130';
  const size = at === 'corner' ? 18 : Math.max(10, Math.min(34, Math.round(Math.min(w, h) / 14)));
  const anchorX = at === 'corner' ? 24 : w / 2;
  const anchorY = at === 'center' ? h / 2 : at === 'top' ? Math.min(h / 2, 150) : 40;
  const textAnchor = at === 'corner' ? 'start' : 'middle';
  const lines = [
    asset.placeholder?.label ?? asset.key,
    `${asset.file.split('/').pop()} · ${asset.size[0]}×${asset.size[1]}`,
    'PLACEHOLDER',
  ];
  return lines
    .map((t, i) => {
      const fs = i === 0 ? size : Math.round(size * 0.7);
      const y = anchorY + (i - 1) * size * 1.25;
      return `<text x="${anchorX}" y="${y}" font-family="${FONT}" font-size="${fs}" font-weight="${i === 0 ? 700 : 500}" fill="${fg}" fill-opacity="${i === 2 ? 0.6 : 0.95}" text-anchor="${textAnchor}" dominant-baseline="middle" stroke="${dark ? '#000' : '#fff'}" stroke-opacity="0.25" stroke-width="${Math.max(1, fs / 10)}" paint-order="stroke">${esc(t)}</text>`;
    })
    .join('');
}

function gradient(id: string, top: string, bottom: string): string {
  return `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/></linearGradient></defs>`;
}

function background(a: DeclaredAsset, w: number, h: number): string {
  const [c0 = '#444', c1 = '#666', c2 = '#f6bd60'] = a.placeholder?.palette ?? [];
  let detail = '';
  if (a.key.startsWith('bedroom.bg')) {
    detail = `<rect x="0" y="1000" width="${w}" height="${h - 1000}" fill="${shade(c0, -0.35)}"/>
      <rect x="240" y="180" width="460" height="420" rx="18" fill="${shade(c1, -0.4)}" stroke="${INK}" stroke-width="8"/>
      <circle cx="600" cy="260" r="34" fill="#f4e7c5" opacity="0.85"/>
      <rect x="240" y="384" width="460" height="10" fill="${INK}"/><rect x="465" y="180" width="10" height="420" fill="${INK}"/>
      <rect x="1180" y="240" width="300" height="200" rx="10" fill="${shade(c1, 0.15)}" stroke="${INK}" stroke-width="6"/>`;
  } else if (a.key.startsWith('town.sky') || a.key.startsWith('title')) {
    detail = `<circle cx="${w * 0.78}" cy="${h * 0.2}" r="70" fill="#f8e3b5" opacity="0.9"/>` +
      Array.from({ length: 40 }, (_, i) => `<circle cx="${(i * 397) % w}" cy="${(i * 211) % (h * 0.55)}" r="${1.5 + (i % 3)}" fill="#fff6dd" opacity="0.7"/>`).join('');
    if (a.key.startsWith('title')) detail += `<rect x="0" y="${h * 0.62}" width="${w}" height="${h * 0.38}" fill="${shade(c0, -0.3)}"/>`;
  } else if (a.key.startsWith('laptop.closeup_bg')) {
    detail = `<rect x="0" y="560" width="${w}" height="${h - 560}" fill="${shade(c1, -0.1)}"/><rect x="0" y="560" width="${w}" height="12" fill="${shade(c1, 0.2)}"/>
      <ellipse cx="${w / 2}" cy="300" rx="700" ry="260" fill="${c2}" opacity="0.12"/>`;
  } else if (a.key.startsWith('os.wallpaper')) {
    detail = `<circle cx="${w * 0.7}" cy="${h * 0.35}" r="160" fill="${c2}" opacity="0.35"/><path d="M0 ${h * 0.75} Q ${w * 0.5} ${h * 0.55} ${w} ${h * 0.8} L ${w} ${h} L 0 ${h} Z" fill="${shade(c0, -0.3)}"/>`;
  }
  return gradient('g', c0, c1) + `<rect width="${w}" height="${h}" fill="url(#g)"/>${detail}` + label(a, w, h, true, w >= 1920 ? 'top' : 'center');
}

function object(a: DeclaredAsset, w: number, h: number): string {
  const p = a.padding ?? 16;
  const [c0 = '#888', c1 = shade(c0, 0.3), c2 = '#f6bd60'] = a.placeholder?.palette ?? [];
  const iw = w - p * 2;
  const ih = h - p * 2;
  const stroke = `stroke="${INK}" stroke-width="${Math.max(3, Math.round(Math.min(w, h) / 90))}" stroke-linejoin="round"`;
  let body: string;
  if (a.key.startsWith('town.bldg')) {
    const roof = ih * 0.28;
    body = `<path d="M ${p + iw * 0.04} ${p + roof} L ${w / 2} ${p} L ${w - p - iw * 0.04} ${p + roof} Z" fill="${shade(c0, -0.35)}" ${stroke}/>
      <rect x="${p + iw * 0.08}" y="${p + roof}" width="${iw * 0.84}" height="${ih - roof}" fill="${c0}" ${stroke}/>
      <rect x="${p + iw * 0.08}" y="${p + roof}" width="${iw * 0.42}" height="${ih - roof}" fill="${c1}" opacity="0.35"/>
      <rect x="${w / 2 - 70}" y="${h - p - 230}" width="140" height="230" rx="60" fill="${shade(c0, -0.5)}" ${stroke}/>
      <rect x="${w / 2 - 180}" y="${p + roof + 30}" width="360" height="80" rx="10" fill="#f3e6cf" ${stroke}/>
      ${[0.2, 0.68].map((fx) => `<rect x="${p + iw * fx}" y="${p + roof + 170}" width="${iw * 0.14}" height="120" rx="8" fill="${c2}" ${stroke}/>`).join('')}`;
  } else if (a.key.includes('lamppost')) {
    body = `<rect x="${w / 2 - 12}" y="${p + 70}" width="24" height="${ih - 70}" fill="${c0}" ${stroke}/>
      <ellipse cx="${w / 2}" cy="${p + 60}" rx="54" ry="50" fill="${c2}" ${stroke}/><rect x="${w / 2 - 50}" y="${h - p - 20}" width="100" height="20" rx="6" fill="${c0}" ${stroke}/>`;
  } else if (a.key.includes('bench')) {
    body = `<rect x="${p + 10}" y="${h - p - 200}" width="${iw - 20}" height="40" rx="12" fill="${c1}" ${stroke}/>
      <rect x="${p + 10}" y="${h - p - 130}" width="${iw - 20}" height="34" rx="10" fill="${c1}" ${stroke}/>
      <rect x="${p + 40}" y="${h - p - 100}" width="22" height="100" fill="${c0}" ${stroke}/><rect x="${w - p - 62}" y="${h - p - 100}" width="22" height="100" fill="${c0}" ${stroke}/>`;
  } else if (a.key.includes('noticeboard')) {
    body = `<rect x="${w / 2 - 14}" y="${p + 200}" width="28" height="${ih - 200}" fill="${c0}" ${stroke}/>
      <rect x="${p + 40}" y="${p + 20}" width="${iw - 80}" height="240" rx="14" fill="#e8d7b8" ${stroke}/>
      <rect x="${p + 80}" y="${p + 60}" width="110" height="80" fill="#fff8ec" ${stroke}/><rect x="${p + 210}" y="${p + 90}" width="90" height="120" fill="${c2}" ${stroke}/>`;
  } else if (a.key.startsWith('bedroom.desk')) {
    body = `<rect x="${p}" y="${p + 180}" width="${iw}" height="44" rx="10" fill="${c1}" ${stroke}/>
      <rect x="${p + 30}" y="${p + 224}" width="40" height="${ih - 224}" fill="${c0}" ${stroke}/><rect x="${w - p - 70}" y="${p + 224}" width="40" height="${ih - 224}" fill="${c0}" ${stroke}/>
      <rect x="${w - p - 330}" y="${p + 224}" width="240" height="170" rx="8" fill="${c0}" ${stroke}/>
      <path d="M ${p + 120} ${p + 180} L ${p + 150} ${p + 60} L ${p + 210} ${p + 30}" fill="none" ${stroke}/>
      <path d="M ${p + 170} ${p + 20} L ${p + 270} ${p + 10} L ${p + 250} ${p + 70} Z" fill="${c2}" ${stroke}/>`;
  } else if (a.key.startsWith('laptop.base')) {
    // Matches PerspectiveLid's camera (15° elevation, distance 4000): hinge edge 1280 wide at y=24,
    // front edge ~1587 wide at y=281, then the base's front face.
    const cx = w / 2, hy = 24, fy = 281, back = 640, front = 794;
    body = `<path d="M ${cx - back} ${hy} L ${cx + back} ${hy} L ${cx + front} ${fy} L ${cx - front} ${fy} Z" fill="${c1}" ${stroke}/>
      <path d="M ${cx - front} ${fy} L ${cx + front} ${fy} L ${cx + front - 12} ${fy + 38} L ${cx - front + 12} ${fy + 38} Z" fill="${c0}" ${stroke}/>
      <path d="M ${cx - 540} ${hy + 22} L ${cx + 540} ${hy + 22} L ${cx + 600} ${hy + 160} L ${cx - 600} ${hy + 160} Z" fill="${shade(c0, -0.2)}" ${stroke}/>
      <path d="M ${cx - 170} ${hy + 182} L ${cx + 170} ${hy + 182} L ${cx + 180} ${hy + 240} L ${cx - 180} ${hy + 240} Z" fill="${shade(c1, 0.15)}" ${stroke}/>`;
  } else {
    body = `<rect x="${p}" y="${p}" width="${iw}" height="${ih}" rx="${Math.min(iw, ih) * 0.12}" fill="${c0}" ${stroke}/>
      <rect x="${p}" y="${p}" width="${iw}" height="${ih * 0.3}" rx="${Math.min(iw, ih) * 0.12}" fill="${c1}" opacity="0.55"/>`;
    if (a.key.startsWith('laptop.lid_outer')) body += `<circle cx="${w / 2}" cy="${h / 2}" r="70" fill="${c1}" ${stroke}/>`;
  }
  return body + label(a, w, h);
}

function screen(a: DeclaredAsset, w: number, h: number): string {
  const [bezel = '#2a2f36'] = a.placeholder?.palette ?? [];
  return `<rect x="0" y="0" width="${w}" height="${h}" rx="36" fill="${bezel}"/><rect x="40" y="32" width="1200" height="720" fill="#000"/>
    <circle cx="${w / 2}" cy="16" r="6" fill="#111"/>` + label(a, w, h);
}

function figure(a: DeclaredAsset, w: number, h: number): string {
  const [c0 = '#8a7a9e', c1 = '#cbbbd9'] = a.placeholder?.palette ?? [];
  const p = a.padding ?? 16;
  const stroke = `stroke="${INK}" stroke-width="6"`;
  const headR = w * 0.2;
  return `<ellipse cx="${w / 2}" cy="${h - p - 6}" rx="${w * 0.3}" ry="6" fill="${INK}" opacity="0.2"/>
    <rect x="${w * 0.2}" y="${p + headR * 2.1}" width="${w * 0.6}" height="${h - p * 2 - headR * 2.1}" rx="${w * 0.22}" fill="${c0}" ${stroke}/>
    <circle cx="${w / 2}" cy="${p + headR + 4}" r="${headR}" fill="${c1}" ${stroke}/>
    <text x="${w / 2}" y="${p + headR + 4}" font-family="${FONT}" font-size="${headR * 1.2}" font-weight="800" fill="${INK}" text-anchor="middle" dominant-baseline="central">?</text>` +
    label(a, w, h);
}

function tile(a: DeclaredAsset, w: number, h: number): string {
  const [c0 = '#555', c1 = shade(c0, 0.2), c2 = '#f6bd60'] = a.placeholder?.palette ?? [];
  let body = '';
  if (a.key === 'town.street') {
    body = `<rect width="${w}" height="${h}" fill="${c0}"/><rect y="0" width="${w}" height="190" fill="${c2}"/>
      <rect y="186" width="${w}" height="16" fill="${c1}"/>` +
      Array.from({ length: 16 }, (_, i) => `<rect x="${i * 120}" y="0" width="3" height="186" fill="${shade(c2, -0.25)}"/>`).join('') +
      Array.from({ length: 8 }, (_, i) => `<rect x="${i * 240 + 60}" y="250" width="120" height="10" rx="5" fill="#f3e6cf" opacity="0.6"/>`).join('');
  } else if (a.key.endsWith('.fg')) {
    body = `<path d="M 0 60 Q ${w / 2} 170 ${w} 60" fill="none" stroke="${c0}" stroke-width="10"/>
      <path d="M 0 30 Q ${w / 2} 110 ${w} 30" fill="none" stroke="${c0}" stroke-width="6"/>
      <ellipse cx="${a.tile ? w * 0.5 : 120}" cy="${h + 40}" rx="260" ry="140" fill="${c0}"/>`;
  } else {
    // skyline / rooftops: blocks of varying height, period divides width exactly
    const n = 12;
    const bw = w / n;
    body = Array.from({ length: n }, (_, i) => {
      const bh = h * (0.35 + ((i * 37) % 50) / 100);
      const x = i * bw + bw * 0.08;
      const roof = i % 3 === 0 ? `<path d="M ${x} ${h - bh} L ${x + bw * 0.42} ${h - bh - bw * 0.3} L ${x + bw * 0.84} ${h - bh} Z" fill="${c1}"/>` : '';
      const lit = c2 && i % 2 === 0 ? `<rect x="${x + bw * 0.3}" y="${h - bh + 30}" width="${bw * 0.2}" height="26" rx="4" fill="${c2}" opacity="0.8"/>` : '';
      return `${roof}<rect x="${x}" y="${h - bh}" width="${bw * 0.84}" height="${bh}" rx="6" fill="${i % 2 ? c0 : c1}"/>${lit}`;
    }).join('') + `<rect y="${h - 40}" width="${w}" height="40" fill="${c0}"/>`;
  }
  return body + label(a, w, h, true, a.key.endsWith('.fg') ? 'corner' : 'top');
}

function ring(w: number, h: number): string {
  const c = w / 2;
  return Array.from({ length: 7 }, (_, i) => {
    const r = c * (0.42 + i * 0.075);
    return `<circle cx="${c}" cy="${h / 2}" r="${r}" fill="none" stroke="#fff" stroke-opacity="${0.15 + (i % 3) * 0.25}" stroke-width="${10 + (i % 2) * 14}" stroke-dasharray="${r * 0.9} ${r * 0.35}" transform="rotate(${i * 23} ${c} ${h / 2})"/>`;
  }).join('');
}

function glyph(a: DeclaredAsset, w: number, h: number): string {
  const name = a.placeholder?.label ?? '';
  const s = `fill="none" stroke="#fff" stroke-width="${w / 12}" stroke-linecap="round" stroke-linejoin="round"`;
  const cx = w / 2, cy = h / 2, u = w / 64;
  switch (name) {
    case 'zero':
    case 'one':
      return `<text x="${cx}" y="${cy}" font-family="DejaVu Sans Mono, monospace" font-weight="700" font-size="${44 * u}" fill="#fff" text-anchor="middle" dominant-baseline="central">${name === 'zero' ? 0 : 1}</text>`;
    case 'lock':
      return `<rect x="${16 * u}" y="${28 * u}" width="${32 * u}" height="${24 * u}" rx="${4 * u}" fill="#fff"/><path d="M ${22 * u} ${28 * u} V ${20 * u} A ${10 * u} ${10 * u} 0 0 1 ${42 * u} ${20 * u} V ${28 * u}" ${s}/>`;
    case 'key':
      return `<circle cx="${20 * u}" cy="${32 * u}" r="${9 * u}" ${s}/><path d="M ${29 * u} ${32 * u} H ${54 * u} M ${46 * u} ${32 * u} V ${40 * u} M ${52 * u} ${32 * u} V ${38 * u}" ${s}/>`;
    case 'shield':
      return `<path d="M ${cx} ${8 * u} L ${52 * u} ${16 * u} V ${30 * u} C ${52 * u} ${44 * u} ${42 * u} ${52 * u} ${cx} ${57 * u} C ${22 * u} ${52 * u} ${12 * u} ${44 * u} ${12 * u} ${30 * u} V ${16 * u} Z" ${s}/>`;
    case 'hex':
      return `<path d="${Array.from({ length: 6 }, (_, i) => `${i ? 'L' : 'M'} ${cx + Math.cos((i * Math.PI) / 3) * 22 * u} ${cy + Math.sin((i * Math.PI) / 3) * 22 * u}`).join(' ')} Z" ${s}/>`;
    default:
      return `<circle cx="${cx}" cy="${cy}" r="${Math.min(w, h) * 0.3}" ${s}/><text x="${cx}" y="${cy}" font-family="${FONT}" font-size="${w / 6}" fill="#fff" text-anchor="middle" dominant-baseline="central">${esc(name)}</text>`;
  }
}

function streaks(w: number, h: number): string {
  let out = '';
  for (let i = 0; i < 70; i++) {
    const y = (i * 149) % h;
    const x = (i * 331) % w;
    const len = 120 + ((i * 53) % 320);
    const sw = 2 + (i % 4) * 2;
    const op = 0.25 + ((i * 7) % 10) / 14;
    for (const dx of [0, -w]) out += `<rect x="${x + dx}" y="${y}" width="${len}" height="${sw}" rx="${sw / 2}" fill="#fff" opacity="${op.toFixed(2)}"/>`;
  }
  return out;
}

// ---- rig parts -------------------------------------------------------------

function rigFace(slot: SlotDef, state: string): string {
  const line = `stroke="${INK}" stroke-width="5" stroke-linecap="round" fill="none"`;
  if (slot.id === 'eyes') {
    const eyes: [number, number, number][] = [[562, 302, 1], [612, 300, 0.72]];
    return eyes.map(([x, y, k]) => {
      if (state === 'closed') return `<path d="M ${x - 15 * k} ${y} Q ${x} ${y + 9} ${x + 15 * k} ${y}" ${line}/>`;
      const big = state === 'wide' ? 1.25 : 1;
      const rx = 14 * k * big, ry = 17 * big;
      const iris = `<circle cx="${x + 3 * k}" cy="${y + 2}" r="${(state === 'wide' ? 7 : 9) * k}" fill="#3d2b23"/><circle cx="${x + 6 * k}" cy="${y - 3}" r="${3 * k}" fill="#fff"/>`;
      const white = `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="#fffaf2" stroke="${INK}" stroke-width="4"/>`;
      if (state === 'half') {
        return `${white}${iris}<path d="M ${x - rx - 2} ${y} A ${rx + 2} ${ry + 2} 0 0 1 ${x + rx + 2} ${y} Z" fill="#e0a37f" stroke="${INK}" stroke-width="4"/>`;
      }
      return white + iris;
    }).join('');
  }
  if (slot.id === 'brows') {
    const lift = state === 'raised' ? -12 : 0;
    return `<path d="M 544 ${266 + lift} Q 562 ${256 + lift * 1.4} 580 ${263 + lift}" stroke="${INK}" stroke-width="7" stroke-linecap="round" fill="none"/>
      <path d="M 598 ${262 + lift} Q 612 ${254 + lift * 1.4} 626 ${260 + lift}" stroke="${INK}" stroke-width="6" stroke-linecap="round" fill="none"/>`;
  }
  // mouth
  if (state === 'surprised') return `<ellipse cx="594" cy="370" rx="11" ry="14" fill="#6b2f36" stroke="${INK}" stroke-width="4"/>`;
  if (state === 'smile') return `<path d="M 576 362 Q 594 382 614 360" ${line}/>`;
  return `<path d="M 580 370 Q 594 374 608 368" ${line}/>`;
}

export function rigPartSvg(rig: RigDef, slotId: string, state: string | undefined): string {
  const slot = rig.slots.find((s) => s.id === slotId)!;
  const { width, height } = rig.canvas;
  if (slot.states) return svgDoc(width, height, rigFace(slot, state ?? slot.default!));
  const color = slot.color ?? '#cccccc';
  // Painted slightly past the joint so rotations never open a gap (same rule the artists follow).
  const grow = slot.family === 'hair' ? 0 : 6;
  const shape = grownShape(slot.shape, grow);
  const clipId = `c_${slot.id}`;
  const body =
    `<defs><clipPath id="${clipId}">${shapeElement(shape, '')}</clipPath></defs>` +
    shapeElement(shape, `fill="${color}"`) +
    // soft cel shadow on the far side, clipped to the part
    `<g clip-path="url(#${clipId})">` +
    `<rect x="0" y="0" width="${width}" height="${height}" fill="${shade(color, -0.25)}" opacity="0.55" transform="translate(${shapeCenterX(slot) + 8} 0)"/></g>` +
    shapeElement(shape, `fill="none" stroke="${INK}" stroke-width="5" stroke-linejoin="round"`) +
    (slot.id === 'head'
      ? `<ellipse cx="462" cy="312" rx="16" ry="24" fill="${shade(color, -0.12)}" stroke="${INK}" stroke-width="4"/><path d="M 628 310 Q 642 332 624 338" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>`
      : '');
  return svgDoc(width, height, body);
}

function shapeCenterX(slot: SlotDef): number {
  const s = slot.shape;
  switch (s.type) {
    case 'capsule': return (s.a[0] + s.b[0]) / 2;
    case 'ellipse': return s.c[0];
    case 'rect': return s.x + s.w / 2;
    case 'poly': return s.points.reduce((t, p) => t + p[0], 0) / s.points.length;
  }
}

export function placeholderSvg(asset: DeclaredAsset, rigs: Record<string, RigDef>): string {
  const [w, h] = asset.size;
  if (asset.rig) return rigPartSvg(rigs[asset.rig.id], asset.rig.slot, asset.rig.state);
  const motif = asset.placeholder?.motif ?? (asset.alpha ? 'object' : 'background');
  switch (motif) {
    case 'background': return svgDoc(w, h, background(asset, w, h));
    case 'screen': return svgDoc(w, h, screen(asset, w, h));
    case 'figure': return svgDoc(w, h, figure(asset, w, h));
    case 'tile': return svgDoc(w, h, tile(asset, w, h));
    case 'ring': return svgDoc(w, h, ring(w, h));
    case 'glyph': return svgDoc(w, h, glyph(asset, w, h));
    case 'streaks': return svgDoc(w, h, streaks(w, h));
    case 'rig':
    case 'object':
    default: return svgDoc(w, h, object(asset, w, h));
  }
}
