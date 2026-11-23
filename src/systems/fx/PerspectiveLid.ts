import Phaser from 'phaser';

/**
 * A flat image hinged along its bottom edge and rotated in 3D (a laptop lid).
 * Phaser 4 has no Mesh/Plane, so the image is cut into thin horizontal strips
 * and each strip is projected with a simple pinhole camera. With ~64 strips
 * the result reads as a smooth perspective rotation.
 *
 * Angle 0 = closed (lying flat towards the viewer, showing the outer face),
 * 90 = upright, ~100-110 = typical open laptop (showing the inner face).
 *
 * The container's position is the hinge centre on screen.
 */
export class PerspectiveLid extends Phaser.GameObjects.Container {
  private readonly strips: { inner: Phaser.GameObjects.Image; outer: Phaser.GameObjects.Image; d0: number; d1: number }[] = [];
  private angleDeg = 0;
  readonly lidWidth: number;
  readonly lidHeight: number;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    innerKey: string,
    outerKey: string,
    private readonly opts: { strips?: number; elevationDeg?: number; cameraDistance?: number } = {},
  ) {
    super(scene, x, y);
    const inner = scene.textures.get(innerKey);
    const outer = scene.textures.get(outerKey);
    const src = inner.getSourceImage() as { width: number; height: number };
    this.lidWidth = src.width;
    this.lidHeight = src.height;
    const n = opts.strips ?? 64;
    const sh = this.lidHeight / n;
    for (let i = 0; i < n; i++) {
      const y0 = Math.floor(i * sh);
      const y1 = Math.floor((i + 1) * sh);
      const name = `lidstrip_${n}_${i}`;
      if (!inner.has(name)) inner.add(name, 0, 0, y0, this.lidWidth, y1 - y0 + 1);
      if (!outer.has(name)) outer.add(name, 0, 0, y0, this.lidWidth, y1 - y0 + 1);
      const innerImg = scene.add.image(0, 0, innerKey, name).setOrigin(0.5, 0);
      const outerImg = scene.add.image(0, 0, outerKey, name).setOrigin(0.5, 0);
      // Distance from the hinge (image bottom) of this strip's two edges.
      this.strips.push({ inner: innerImg, outer: outerImg, d0: this.lidHeight - y1, d1: this.lidHeight - y0 });
      this.add([outerImg, innerImg]);
    }
    this.setLidAngle(0);
    scene.add.existing(this);
  }

  get lidAngle(): number {
    return this.angleDeg;
  }

  set lidAngle(v: number) {
    this.setLidAngle(v);
  }

  /** Screen-space (container-local) projection of a point on the lid at distance d from the hinge and horizontal offset x. */
  project(x: number, d: number, angleDeg = this.angleDeg): { x: number; y: number; s: number } {
    const theta = (angleDeg * Math.PI) / 180;
    const phi = ((this.opts.elevationDeg ?? 15) * Math.PI) / 180;
    const D = this.opts.cameraDistance ?? 4000;
    // Lid point in 3D: hinge along X, Y up, Z towards the viewer.
    const Y = d * Math.sin(theta);
    const Z = d * Math.cos(theta);
    // Camera looks down at the hinge with elevation phi.
    const yc = Y * Math.cos(phi) - Z * Math.sin(phi);
    const zc = Y * Math.sin(phi) + Z * Math.cos(phi);
    const s = D / (D - zc);
    return { x: x * s, y: -yc * s, s };
  }

  setLidAngle(angleDeg: number): this {
    this.angleDeg = angleDeg;
    for (const st of this.strips) {
      const a = this.project(0, st.d0);
      const b = this.project(0, st.d1);
      // b is the strip edge further from the hinge. If it is above a on screen we see the inner face.
      const innerVisible = b.y < a.y;
      const top = Math.min(a.y, b.y);
      const h = Math.abs(b.y - a.y) + 0.75; // slight overlap hides seams
      const sx = (a.s + b.s) / 2;
      const frameH = st.inner.frame.height;
      st.inner.setVisible(innerVisible).setPosition(0, top).setScale(sx, h / frameH);
      // Outer face: rows run the other way when the lid is viewed from above.
      st.outer.setVisible(!innerVisible).setPosition(0, top).setScale(sx, h / frameH).setFlipY(true);
    }
    // Draw order: strips nearer the viewer on top (matters only mid-swing).
    return this;
  }

  /** Approximate screen rectangle of a lid-space rectangle (x from lid's left edge, y from its top), at the current angle. */
  lidRectToLocal(rx: number, ry: number, rw: number, rh: number): { x: number; y: number; w: number; h: number } {
    const topD = this.lidHeight - ry;
    const botD = this.lidHeight - (ry + rh);
    const t = this.project(rx - this.lidWidth / 2, topD);
    const b = this.project(rx - this.lidWidth / 2, botD);
    const tr = this.project(rx + rw - this.lidWidth / 2, topD);
    return { x: t.x, y: t.y, w: tr.x - t.x, h: b.y - t.y };
  }
}
