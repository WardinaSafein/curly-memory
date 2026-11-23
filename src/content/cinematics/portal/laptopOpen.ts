import type { Beat } from '../../../systems/cinematics/Cinematic';
import { PerspectiveLid } from '../../../systems/fx/PerspectiveLid';
import { BASE_HINGE_OFFSET, LAPTOP, type LaptopRig } from './shared';

/** Beat 1: close-up of the desk; the lid swings open in 3D. */
export const laptopOpen: Beat = {
  id: 'laptop-open',
  async run(ctx) {
    const { scene, stage } = ctx;
    const bg = scene.add.image(0, 0, 'laptop.closeup_bg').setOrigin(0);
    const group = scene.add.container(LAPTOP.x, LAPTOP.y).setScale(LAPTOP.scale);
    const base = scene.add.image(0, 0, 'laptop.base');
    base.setOrigin(0.5, BASE_HINGE_OFFSET / base.height);
    const lid = new PerspectiveLid(scene, 0, 0, 'laptop.lid_inner', 'laptop.lid_outer');
    group.add([base, lid]);
    stage.add([bg, group]);
    const rig: LaptopRig = { group, lid };
    ctx.store.set('laptop', rig);

    scene.cameras.main.fadeIn(ctx.skipping ? 0 : 700, 0, 0, 0);
    await ctx.wait(800);
    await ctx.tween({ targets: lid, lidAngle: LAPTOP.openAngle, duration: 1700, ease: 'Back.easeOut' });
    await ctx.wait(250);
  },
};
