import type { HotspotDef, LayerDef, SceneDef } from '../../systems/scene/SceneDefinition';

/** Working titles for the five game districts (placeholders, to be renamed by the team). */
export const DISTRICTS = [
  { n: '01', x: 380, name: 'The Phish Market' },
  { n: '02', x: 1060, name: 'The Password Vault' },
  { n: '03', x: 1740, name: 'Patchworks' },
  { n: '04', x: 3140, name: 'The Social Club' },
  { n: '05', x: 3820, name: 'Data Harbour' },
] as const;

const BUILDING_SCALE = 0.8;
const STREET_Y = 780;
const WALK_Y = 945;

const buildingLayers: LayerDef[] = DISTRICTS.map((d) => ({ id: `bldg${d.n}`, key: `town.bldg.${d.n}`, x: d.x, y: 812, origin: [0.5, 1], scale: BUILDING_SCALE, depth: 30 }));

const buildingHotspots: HotspotDef[] = DISTRICTS.map((d) => ({
  id: `bldg${d.n}`,
  label: `${d.name} (locked)`,
  area: { x: d.x - 240, y: 812 - 640, w: 480, h: 640 },
  highlight: `bldg${d.n}`,
  walkTo: d.x,
  face: 'right',
  actions: [{ type: 'dialogue', knot: 'building_locked', args: [d.name] }],
}));

/** CyberTown high street: arrival plaza in the middle, five districts along the street. Scrolls horizontally. */
export const cybertown: SceneDef = {
  id: 'cybertown',
  title: 'CyberTown',
  world: { width: 4200, height: 1080 },
  layers: [
    { key: 'town.sky', parallax: 0, depth: 0 },
    { key: 'town.far', y: 200, parallax: 0.15, repeatX: true, depth: 1 },
    { key: 'town.mid', y: 40, parallax: 0.4, repeatX: true, depth: 2 },
    { key: 'town.street', y: STREET_Y, repeatX: true, depth: 3 },
    ...buildingLayers,
    { key: 'town.prop.lamppost', x: 2000, y: 960, origin: [0.5, 1], depth: 40 },
    { key: 'town.prop.lamppost', x: 2900, y: 960, origin: [0.5, 1], depth: 40 },
    { id: 'noticeboard', key: 'town.prop.noticeboard', x: 2170, y: 950, origin: [0.5, 1], depth: 40 },
    { key: 'town.prop.bench', x: 3480, y: 965, origin: [0.5, 1], depth: 40 },
    { key: 'town.portal_pad', x: 2440, y: 985, origin: [0.5, 1], depth: 42 },
    { id: 'gus', key: 'npc.gus', x: 2720, y: WALK_Y + 4, origin: [0.5, 1], scale: 0.38, depth: 48, bob: { y: 4, duration: 1400 } },
    { key: 'town.fg', parallax: 1.25, repeatX: true, depth: 100 },
  ],
  walk: { y: WALK_Y, minX: 120, maxX: 4080 },
  player: { scale: 0.34, tint: 0xece6f4, depth: 50 },
  hotspots: [
    ...buildingHotspots,
    { id: 'gus', label: 'Gus', area: { x: 2600, y: 480, w: 240, h: 470 }, highlight: 'gus', walkTo: 2580, face: 'right', actions: [{ type: 'dialogue', knot: 'gus_talk' }] },
    { id: 'noticeboard', label: 'Notice board', area: { x: 2040, y: 700, w: 260, h: 260 }, highlight: 'noticeboard', walkTo: 2280, face: 'left', actions: [{ type: 'dialogue', knot: 'noticeboard' }] },
  ],
  entries: {
    default: { x: 2440, facing: 'right' },
    portal: {
      x: 2440,
      facing: 'right',
      actions: [
        { type: 'land', height: 700 },
        { type: 'dialogue', knot: 'cybertown_arrival', unless: 'arrived' },
      ],
    },
  },
};
