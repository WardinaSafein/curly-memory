import type { SceneDef } from '../../systems/scene/SceneDefinition';

/** The player's bedroom at night: the story starts here. Single screen, no scrolling. */
export const bedroom: SceneDef = {
  id: 'bedroom',
  title: 'Bedroom',
  world: { width: 1920, height: 1080 },
  layers: [
    { key: 'bedroom.bg', depth: 0 },
    { id: 'desk', key: 'bedroom.desk', x: 1430, y: 1000, origin: [0.5, 1], depth: 20 },
    { id: 'laptop', key: 'bedroom.laptop_closed', x: 1500, y: 604, origin: [0.5, 1], depth: 21 },
    { key: 'bedroom.fg', depth: 100, parallax: 1 },
  ],
  walk: { y: 1000, minX: 180, maxX: 1760 },
  player: { scale: 0.42, tint: 0xffe6cc, depth: 50 },
  hotspots: [
    {
      id: 'laptop',
      label: 'Work laptop',
      area: { x: 1340, y: 480, w: 320, h: 150 },
      highlight: 'laptop',
      walkTo: 1150,
      face: 'right',
      actions: [
        { type: 'setFlag', flag: 'laptop_open', value: false },
        { type: 'dialogue', knot: 'bedroom_laptop' },
        { type: 'cinematic', id: 'portal', if: 'laptop_open' },
      ],
    },
    { id: 'window', label: 'Window', area: { x: 240, y: 180, w: 460, h: 420 }, walkTo: 470, face: 'right', actions: [{ type: 'dialogue', knot: 'bedroom_window' }] },
    { id: 'poster', label: 'Poster', area: { x: 1180, y: 240, w: 300, h: 200 }, walkTo: 1080, face: 'right', actions: [{ type: 'dialogue', knot: 'bedroom_poster' }] },
  ],
  entries: {
    default: {
      x: 760,
      facing: 'right',
      actions: [
        { type: 'dialogue', knot: 'bedroom_intro', unless: 'intro_done' },
        { type: 'setFlag', flag: 'intro_done', value: true },
      ],
    },
  },
};
