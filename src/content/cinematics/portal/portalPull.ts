import type { Beat } from '../../../systems/cinematics/Cinematic';
import { screenCentre, type LaptopRig } from './shared';

/** Beat 5: a portal opens on the screen and the camera is pulled into it. */
export const portalPull: Beat = {
  id: 'pull',
  async run(ctx) {
    const { scene, stage } = ctx;
    const rig = ctx.store.get('laptop') as LaptopRig;
    const c = screenCentre(rig);
    const ring = scene.add.image(c.x, c.y, 'fx.portal_ring').setScale(0.05).setTint(0x9fd8d0).setBlendMode('ADD');
    const ring2 = scene.add.image(c.x, c.y, 'fx.portal_ring').setScale(0.03).setTint(0xf6bd60).setBlendMode('ADD').setAngle(40);
    stage.add([ring, ring2]);

    const cam = scene.cameras.main;
    void ctx.tween({ targets: ring, scale: 0.45, angle: 360, duration: 1500, ease: 'Sine.easeIn' });
    void ctx.tween({ targets: ring2, scale: 0.32, angle: -320, duration: 1500, ease: 'Sine.easeIn' });
    await ctx.wait(500);
    cam.pan(c.x, c.y, ctx.skipping ? 0 : 1300, 'Sine.easeIn');
    cam.zoomTo(ctx.reducedMotion ? 1.8 : 3.2, ctx.skipping ? 0 : 1300, 'Cubic.easeIn');
    await ctx.wait(1300);
    await ctx.flash(260);
  },
};
