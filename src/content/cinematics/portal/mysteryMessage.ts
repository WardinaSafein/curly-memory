import { FontFamily, Palette } from '../../../config/game';
import type { Beat } from '../../../systems/cinematics/Cinematic';
import { SCREEN_RECT, type LaptopRig } from './shared';

/** Beat 3: an unsigned message window pops up; the conversation runs in the dialogue box. */
export const mysteryMessage: Beat = {
  id: 'message',
  async run(ctx) {
    const { scene } = ctx;
    const rig = ctx.store.get('laptop') as LaptopRig;
    const w = 760, h = 380;
    const win = scene.add.container(SCREEN_RECT.w / 2, SCREEN_RECT.h / 2).setScale(0.6).setAlpha(0);
    const g = scene.add.graphics();
    g.fillStyle(Palette.paper, 1).fillRoundedRect(-w / 2, -h / 2, w, h, 22);
    g.fillStyle(Palette.plum, 1).fillRoundedRect(-w / 2, -h / 2, w, 64, { tl: 22, tr: 22, bl: 0, br: 0 });
    g.lineStyle(5, Palette.inkSoft, 1).strokeRoundedRect(-w / 2, -h / 2, w, h, 22);
    const title = scene.add.text(-w / 2 + 28, -h / 2 + 32, '1 new message · (no sender)', { fontFamily: FontFamily, fontSize: '28px', color: '#fff8ec', fontStyle: 'bold' }).setOrigin(0, 0.5);
    const body = scene.add.text(0, 20, '"Hello. We need your help."', { fontFamily: FontFamily, fontSize: '40px', color: '#2b2130', align: 'center', wordWrap: { width: w - 80 } }).setOrigin(0.5);
    win.add([g, title, body]);
    rig.screen?.add(win);

    await ctx.tween({ targets: win, alpha: 1, scale: 1, duration: 380, ease: 'Back.easeOut' });
    await ctx.wait(300);
    await ctx.dialogue('laptop_message');
    ctx.store.set('messageWindow', win);
  },
};
