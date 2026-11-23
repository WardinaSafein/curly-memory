import { FontFamily, MonoFamily } from '../../../config/game';
import type { Beat } from '../../../systems/cinematics/Cinematic';
import { SCREEN_RECT, type LaptopRig } from './shared';

/** Beat 2: the screen wakes up: boot logo, then the desktop wallpaper. Screen UI is live code, not art. */
export const bootScreen: Beat = {
  id: 'boot',
  async run(ctx) {
    const { scene } = ctx;
    const rig = ctx.store.get('laptop') as LaptopRig;
    const r = rig.lid.lidRectToLocal(SCREEN_RECT.x, SCREEN_RECT.y, SCREEN_RECT.w, SCREEN_RECT.h);
    const screen = scene.add.container(r.x, r.y).setScale(r.w / SCREEN_RECT.w, r.h / SCREEN_RECT.h);
    rig.group.add(screen);
    rig.screen = screen;

    const black = scene.add.rectangle(0, 0, SCREEN_RECT.w, SCREEN_RECT.h, 0x000000).setOrigin(0);
    const wallpaper = scene.add.image(0, 0, 'os.wallpaper').setOrigin(0).setAlpha(0);
    const logo = scene.add.image(SCREEN_RECT.w / 2, SCREEN_RECT.h / 2 - 40, 'os.bootlogo').setAlpha(0).setScale(0.8);
    const status = scene.add.text(SCREEN_RECT.w / 2, SCREEN_RECT.h / 2 + 130, '', { fontFamily: MonoFamily, fontSize: '28px', color: '#cfe8e2' }).setOrigin(0.5);
    const clock = scene.add.text(SCREEN_RECT.w - 30, 22, '23:52', { fontFamily: FontFamily, fontSize: '26px', color: '#fff8ec', fontStyle: 'bold' }).setOrigin(1, 0).setAlpha(0);
    screen.add([black, wallpaper, logo, status, clock]);

    // The screen lights up the desk.
    const glow = scene.add.ellipse(rig.group.x, rig.group.y - 120, 1500, 700, 0x9fd8d0, 0).setBlendMode('ADD');
    ctx.stage.addAt(glow, 1);

    await ctx.tween({ targets: logo, alpha: 1, scale: 1, duration: 600, ease: 'Sine.easeOut' });
    void ctx.tween({ targets: glow, fillAlpha: 0.12, duration: 900 });
    for (const line of ['booting…', 'checking updates…', 'welcome back']) {
      status.setText(line);
      await ctx.wait(420);
    }
    await ctx.tween({ targets: [logo, status], alpha: 0, duration: 300 });
    await ctx.tween({ targets: [wallpaper, clock], alpha: 1, duration: 500 });
    ctx.store.set('screenGlow', glow);
  },
};
