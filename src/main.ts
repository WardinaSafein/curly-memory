import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from './config/game';
import { BootScene } from './scenes/BootScene';
import { CinematicScene } from './scenes/CinematicScene';
import { ExploreScene } from './scenes/ExploreScene';
import { PreloadScene } from './scenes/PreloadScene';
import { RigLabScene } from './scenes/RigLabScene';
import { TitleScene } from './scenes/TitleScene';

/**
 * Desktop-first: a fixed 1920x1080 logical canvas scaled to fit the window.
 * UI is positioned through src/ui/layout.ts and all input uses pointer events,
 * so responsive (EXPAND) layouts and touch can be enabled later without rewrites.
 */
const params = new URLSearchParams(location.search);
// Multi-texture batching produced missing triangles on animated rig parts in testing (Chromium's
// software renderer). One texture per draw call is free at our sprite counts; revisit once rig parts
// are packed into atlases. Override for testing with ?maxtex=-1 (all units) or ?maxtex=N.
const maxTextures = Number(params.get('maxtex') ?? 1);

const game = new Phaser.Game({
  type: Phaser.WEBGL,
  parent: 'game',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#1b1424',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  input: { activePointers: 2 },
  render: { maxTextures },
  scene: [BootScene, PreloadScene, TitleScene, ExploreScene, CinematicScene, RigLabScene],
});

// Handy for debugging in the browser console.
(globalThis as unknown as { game: Phaser.Game }).game = game;
