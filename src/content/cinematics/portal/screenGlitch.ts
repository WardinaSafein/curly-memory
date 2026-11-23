import type { Beat } from '../../../systems/cinematics/Cinematic';
import { SCREEN_RECT, screenCentre, type LaptopRig } from './shared';

const GLYPHS = ['fx.glyph.zero', 'fx.glyph.one', 'fx.glyph.lock', 'fx.glyph.key', 'fx.glyph.shield', 'fx.glyph.hex'];

/** Beat 4: the screen glitches and data glyphs leak out. Flicker stays under 3 Hz (photosensitivity). */
export const screenGlitch: Beat = {
  id: 'glitch',
  async run(ctx) {
    const { scene, stage } = ctx;
    const rig = ctx.store.get('laptop') as LaptopRig;
    const bars = scene.add.container(0, 0);
    for (let i = 0; i < 9; i++) {
      const y = (i * 97) % SCREEN_RECT.h;
      const color = [0x6b9e92, 0x86608e, 0xf6bd60][i % 3];
      bars.add(scene.add.rectangle((i * 211) % 400, y, SCREEN_RECT.w, 14 + (i % 4) * 10, color, 0.55).setOrigin(0));
    }
    bars.setAlpha(0);
    rig.screen?.add(bars);
    if (!ctx.reducedMotion) {
      void ctx.tween({ targets: bars, alpha: 0.9, duration: 200, yoyo: true, repeat: 3, ease: 'Stepped' });
      void ctx.tween({ targets: bars, x: 40, duration: 400, yoyo: true, repeat: 1 });
    } else {
      void ctx.tween({ targets: bars, alpha: 0.6, duration: 800, yoyo: true });
    }
    ctx.shake(1400, 0.004);

    const c = screenCentre(rig);
    const leaks: Promise<void>[] = [];
    for (let i = 0; i < 18; i++) {
      const key = GLYPHS[i % GLYPHS.length];
      const img = scene.add.image(c.x, c.y, key).setTint([0x9fd8d0, 0xf6bd60, 0xcbbbd9][i % 3]).setAlpha(0).setScale(0.6);
      stage.add(img);
      const angle = (i / 18) * Math.PI * 2;
      leaks.push(ctx.tween({
        targets: img,
        x: c.x + Math.cos(angle) * (300 + (i % 5) * 70),
        y: c.y + Math.sin(angle) * (200 + (i % 4) * 50),
        alpha: { from: 1, to: 0 },
        scale: 1.4,
        angle: (i % 2 ? 1 : -1) * 90,
        delay: i * 60,
        duration: 1100,
        ease: 'Sine.easeOut',
      }));
    }
    await Promise.all(leaks);
  },
};
