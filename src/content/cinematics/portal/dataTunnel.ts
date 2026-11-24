import { createPlayer } from '../../characters/player';
import type { Beat } from '../../../systems/cinematics/Cinematic';

const GLYPHS = ['fx.glyph.zero', 'fx.glyph.one', 'fx.glyph.lock', 'fx.glyph.key', 'fx.glyph.shield', 'fx.glyph.hex'];

/**
 * Beat 6: falling through the data tunnel. The player's own customised rig is
 * composited here (cinematic art never contains the player character).
 */
export const dataTunnel: Beat = {
  id: 'tunnel',
  async run(ctx) {
    const { scene, stage } = ctx;
    stage.removeAll(true);
    const cam = scene.cameras.main;
    cam.setZoom(1).centerOn(960, 540);

    const bg = scene.add.graphics();
    bg.fillGradientStyle(0x1d2a3a, 0x1d2a3a, 0x3b2a4a, 0x3b2a4a, 1).fillRect(0, 0, 1920, 1080);
    stage.add(bg);

    // Expanding streak layers give the feeling of rushing forward.
    [0, 1, 2].forEach((i) => {
      const s = scene.add.image(960, 540, 'fx.tunnel_streaks').setTint([0x9fd8d0, 0xcbbbd9, 0xf6bd60][i]).setAlpha(0).setBlendMode('ADD');
      stage.add(s);
      void ctx.tween({ targets: s, scale: { from: 0.4, to: 3.2 }, alpha: { from: 0.8, to: 0 }, angle: 30 * (i - 1), duration: 1200, delay: i * 400, repeat: 1 });
    });

    for (let i = 0; i < 26; i++) {
      const g = scene.add.image(960, 540, GLYPHS[i % GLYPHS.length]).setAlpha(0).setScale(0.3).setTint(0xfff1d6);
      stage.add(g);
      const a = (i * 137.5 * Math.PI) / 180;
      void ctx.tween({ targets: g, x: 960 + Math.cos(a) * 1100, y: 540 + Math.sin(a) * 700, scale: 1.8, alpha: { from: 0.9, to: 0 }, delay: (i * 90) % 2000, duration: 900, ease: 'Quad.easeIn' });
    }

    // The player leaves home in socks; halfway down the tunnel the portal "suits them up" (boots + backpack).
    const player = createPlayer(scene, 960, 700, 0.12, 'right', 'socks');
    player.setRigTint(0xe8f4f0);
    stage.add(player);
    void player.animator.playOnce('surprise');
    scene.time.delayedCall(1250, () => {
      if (!player.active) return;
      const burst = scene.add.circle(player.x, player.y - 746 * player.scaleY, 30, 0xfff1d6, 0.9).setBlendMode('ADD');
      stage.add(burst);
      void ctx.tween({ targets: burst, scale: 9, alpha: 0, duration: 520, ease: 'Quad.easeOut' }).then(() => burst.destroy());
      player.setOutfit('boots');
    });
    // Tumbling towards the camera (the picture faces right, so scaleX stays positive).
    await ctx.tween({ targets: player, angle: ctx.reducedMotion ? 15 : 340, y: 930, scaleX: 0.42 * player.scaleX / 0.12, scaleY: 0.42 * player.scaleY / 0.12, duration: 2600, ease: 'Sine.easeInOut' });
    await ctx.flash(400);
  },
};
