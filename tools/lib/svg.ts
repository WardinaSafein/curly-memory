/** Small SVG helpers for the rig template and placeholder generators (rendered to PNG with sharp). */
import type { GuideShape, Vec2 } from '../../src/systems/rig/RigDefinition';

export const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const FONT = "Inter, 'DejaVu Sans', Arial, sans-serif";

/** Tapered capsule outline from a (radius r1) to b (radius r2). */
function capsulePath(a: Vec2, b: Vec2, r1: number, r2: number): string {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const p = (pt: Vec2, r: number, s: number): string => `${(pt[0] + nx * r * s).toFixed(1)} ${(pt[1] + ny * r * s).toFixed(1)}`;
  return [
    `M ${p(a, r1, 1)}`,
    `L ${p(b, r2, 1)}`,
    `A ${r2} ${r2} 0 0 0 ${p(b, r2, -1)}`,
    `L ${p(a, r1, -1)}`,
    `A ${r1} ${r1} 0 0 0 ${p(a, r1, 1)}`,
    'Z',
  ].join(' ');
}

/** Smooth closed path through polygon points (Catmull-Rom -> cubic Bezier), for a hand-drawn look. */
function smoothPolyPath(points: Vec2[]): string {
  const n = points.length;
  const at = (i: number): Vec2 => points[(i + n) % n];
  let d = `M ${at(0)[0]} ${at(0)[1]}`;
  for (let i = 0; i < n; i++) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
    const c1: Vec2 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: Vec2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C ${c1[0].toFixed(1)} ${c1[1].toFixed(1)}, ${c2[0].toFixed(1)} ${c2[1].toFixed(1)}, ${p2[0]} ${p2[1]}`;
  }
  return d + ' Z';
}

export function shapeElement(shape: GuideShape, attrs: string): string {
  switch (shape.type) {
    case 'capsule':
      return `<path d="${capsulePath(shape.a, shape.b, shape.r1, shape.r2)}" ${attrs}/>`;
    case 'ellipse':
      return `<ellipse cx="${shape.c[0]}" cy="${shape.c[1]}" rx="${shape.rx}" ry="${shape.ry}" ${attrs}/>`;
    case 'rect':
      return `<rect x="${shape.x}" y="${shape.y}" width="${shape.w}" height="${shape.h}" rx="${Math.min(shape.w, shape.h) / 2}" ${attrs}/>`;
    case 'poly':
      return `<path d="${smoothPolyPath(shape.points)}" ${attrs}/>`;
  }
}

/** The shape grown by `grow` px, used to show where hidden overlap must still be painted. */
export function grownShape(shape: GuideShape, grow: number): GuideShape {
  switch (shape.type) {
    case 'capsule':
      return { ...shape, r1: shape.r1 + grow, r2: shape.r2 + grow };
    case 'ellipse':
      return { ...shape, rx: shape.rx + grow, ry: shape.ry + grow };
    case 'rect':
      return { type: 'rect', x: shape.x - grow, y: shape.y - grow, w: shape.w + grow * 2, h: shape.h + grow * 2 };
    case 'poly': {
      const cx = shape.points.reduce((s, p) => s + p[0], 0) / shape.points.length;
      const cy = shape.points.reduce((s, p) => s + p[1], 0) / shape.points.length;
      return {
        type: 'poly',
        points: shape.points.map(([x, y]) => {
          const len = Math.hypot(x - cx, y - cy) || 1;
          return [x + ((x - cx) / len) * grow, y + ((y - cy) / len) * grow] as Vec2;
        }),
      };
    }
  }
}

export function svgDoc(width: number, height: number, body: string, background?: string): string {
  const bg = background ? `<rect width="100%" height="100%" fill="${background}"/>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${bg}${body}</svg>`;
}

/** Darken/lighten a #rrggbb colour by a factor (-1..1). */
export function shade(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v: number): number => Math.round(amount < 0 ? v * (1 + amount) : v + (255 - v) * amount);
  const r = ch((n >> 16) & 255), g = ch((n >> 8) & 255), b = ch(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}
