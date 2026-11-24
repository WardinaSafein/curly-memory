import type { SceneDef } from '../../systems/scene/SceneDefinition';

/**
 * The player's bedroom at night: the story starts here. Single screen, no scrolling.
 * The delivered background (bedroom_bg.png) has the desk and the closed laptop painted in,
 * so the laptop hotspot points at the painted laptop.
 */
export const bedroom: SceneDef = {
  id: 'bedroom',
  title: 'Bedroom',
  world: { width: 1920, height: 1080 },
  layers: [{ key: 'bedroom.bg', depth: 0 }],
  walk: { y: 905, minX: 160, maxX: 1380 },
  player: { scale: 0.57, tint: 0xffe8d0, depth: 50, outfit: 'socks' },
  hotspots: [
    {
      id: 'laptop',
      label: 'Work laptop',
      area: { x: 1590, y: 540, w: 200, h: 70 },
      walkTo: 1380,
      face: 'right',
      actions: [
        { type: 'setFlag', flag: 'laptop_open', value: false },
        { type: 'dialogue', knot: 'bedroom_laptop' },
        { type: 'cinematic', id: 'portal', if: 'laptop_open' },
      ],
    },
    { id: 'window', label: 'Window', area: { x: 130, y: 90, w: 460, h: 440 }, walkTo: 450, face: 'right', actions: [{ type: 'dialogue', knot: 'bedroom_window' }] },
    { id: 'poster', label: 'Photos', area: { x: 925, y: 325, w: 295, h: 150 }, walkTo: 1000, face: 'right', actions: [{ type: 'dialogue', knot: 'bedroom_poster' }] },
  ],
  entries: {
    default: {
      x: 700,
      facing: 'right',
      actions: [
        { type: 'dialogue', knot: 'bedroom_intro', unless: 'intro_done' },
        { type: 'setFlag', flag: 'intro_done', value: true },
      ],
    },
  },
};
