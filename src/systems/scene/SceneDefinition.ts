/**
 * Data model for click-to-explore locations. A location is pure data: art
 * layers (by asset key), a walk line, hotspots and the actions they trigger.
 * `ExploreScene` renders any SceneDef; adding a location means adding data,
 * not a new scene class.
 */

/** Optional guards on any action or hotspot: run only if a flag is truthy / falsy. */
export interface Guard {
  if?: string;
  unless?: string;
}

export type Action = Guard &
  (
    | { type: 'dialogue'; knot: string; args?: (string | number | boolean)[] }
    | { type: 'cinematic'; id: string }
    | { type: 'goto'; scene: string; entry?: string }
    | { type: 'setFlag'; flag: string; value: boolean | number | string }
    /** One-shot player animation clip (e.g. surprise). */
    | { type: 'anim'; clip: string; wait?: boolean }
    /** Player drops in from above and lands (portal arrival). */
    | { type: 'land'; height?: number }
    | { type: 'walkTo'; x: number; face?: 'left' | 'right' }
    | { type: 'camera'; zoom?: number; x?: number; y?: number; duration?: number }
    | { type: 'wait'; ms: number }
  );

export interface LayerDef {
  /** Optional id so hotspots can highlight this layer. */
  id?: string;
  key: string;
  x?: number;
  y?: number;
  /** Image origin, default [0, 0] (top-left). Use [0.5, 1] for things standing on the ground. */
  origin?: [number, number];
  /** Camera scroll factor: 0 = fixed sky, 1 = moves with the world, >1 = foreground. Default 1. */
  parallax?: number;
  /** Draw order; the player is drawn at depth 50. Default: index in the list. */
  depth?: number;
  /** Repeat horizontally to cover the world (for seamless tiling layers). */
  repeatX?: boolean;
  scale?: number;
  alpha?: number;
  /** Gentle idle motion for placeholders / living details. */
  bob?: { y: number; duration: number };
  flipX?: boolean;
}

export type HotspotArea = { x: number; y: number; w: number; h: number } | { points: [number, number][] };

export interface HotspotDef extends Guard {
  id: string;
  /** Tooltip text shown on hover. */
  label: string;
  area: HotspotArea;
  /** World x the player walks to before acting (omit to act in place). */
  walkTo?: number;
  face?: 'left' | 'right';
  /** Layer id to glow on hover. */
  highlight?: string;
  actions: Action[];
}

export interface EntryDef {
  x: number;
  facing: 'left' | 'right';
  /** Actions run when the player arrives through this entry. */
  actions?: Action[];
}

export interface SceneDef {
  id: string;
  title: string;
  world: { width: number; height: number };
  backgroundColor?: string;
  layers: LayerDef[];
  /** Click-to-walk line. Omit for scenes where the player doesn't move. */
  walk?: { y: number; minX: number; maxX: number };
  player?: { scale: number; tint?: number; depth?: number };
  hotspots: HotspotDef[];
  entries: Record<string, EntryDef>;
}

export function guardPasses(g: Guard, getFlag: (name: string) => unknown): boolean {
  if (g.if && !getFlag(g.if)) return false;
  if (g.unless && getFlag(g.unless)) return false;
  return true;
}

export function areaBounds(area: HotspotArea): { x: number; y: number; w: number; h: number } {
  if ('points' in area) {
    const xs = area.points.map((p) => p[0]);
    const ys = area.points.map((p) => p[1]);
    const x = Math.min(...xs), y = Math.min(...ys);
    return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
  }
  return area;
}

/** Validate references between a scene and the assets/knots it uses. */
export function validateScene(def: SceneDef, known: { assetKeys: Set<string>; knots?: Set<string>; scenes?: Set<string>; cinematics?: Set<string> }): string[] {
  const problems: string[] = [];
  const layerIds = new Set(def.layers.map((l) => l.id).filter(Boolean));
  for (const l of def.layers) if (!known.assetKeys.has(l.key)) problems.push(`${def.id}: layer uses unknown asset "${l.key}"`);
  const checkActions = (where: string, actions: Action[]): void => {
    for (const a of actions) {
      if (a.type === 'dialogue' && known.knots && !known.knots.has(a.knot)) problems.push(`${where}: unknown dialogue knot "${a.knot}"`);
      if (a.type === 'goto' && known.scenes && !known.scenes.has(a.scene)) problems.push(`${where}: unknown scene "${a.scene}"`);
      if (a.type === 'cinematic' && known.cinematics && !known.cinematics.has(a.id)) problems.push(`${where}: unknown cinematic "${a.id}"`);
    }
  };
  const ids = new Set<string>();
  for (const h of def.hotspots) {
    if (ids.has(h.id)) problems.push(`${def.id}: duplicate hotspot "${h.id}"`);
    ids.add(h.id);
    if (h.highlight && !layerIds.has(h.highlight)) problems.push(`${def.id}/${h.id}: highlight layer "${h.highlight}" not found`);
    if (h.walkTo !== undefined && !def.walk) problems.push(`${def.id}/${h.id}: walkTo set but the scene has no walk line`);
    checkActions(`${def.id}/${h.id}`, h.actions);
  }
  for (const [name, e] of Object.entries(def.entries)) checkActions(`${def.id}/entry:${name}`, e.actions ?? []);
  if (!def.entries.default) problems.push(`${def.id}: needs a "default" entry`);
  return problems;
}
