/** Global constants. The game renders at a fixed logical resolution and scales to fit the window. */
export const GAME_WIDTH = 1920;
export const GAME_HEIGHT = 1080;

export const SceneKeys = {
  Boot: 'boot',
  Preload: 'preload',
  Title: 'title',
  Explore: 'explore',
  Cinematic: 'cinematic',
  RigLab: 'riglab',
  Defense: 'defense',
} as const;

/** Warm, hand-drawn UI palette (placeholder until the art direction supplies a final one). */
export const Palette = {
  ink: 0x2b2130,
  inkSoft: 0x3b2a26,
  paper: 0xfff8ec,
  paperDim: 0xe8dccb,
  amber: 0xf6bd60,
  teal: 0x6b9e92,
  plum: 0x86608e,
  danger: 0xc0392b,
} as const;

export const FontFamily = "'Trebuchet MS', 'Segoe UI', system-ui, sans-serif";
export const MonoFamily = "'DejaVu Sans Mono', Consolas, monospace";
