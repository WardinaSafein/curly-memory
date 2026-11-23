import Phaser from 'phaser';
import { SceneKeys } from '../config/game';
import type { RuntimeManifest } from '../core/AssetManifest';
import { MANIFEST_CACHE_KEY, MANIFEST_URL } from '../core/AssetRegistry';
import { services } from '../core/Services';

/** Loads the generated asset manifest, then hands over to the preloader. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.Boot);
  }

  preload(): void {
    this.load.json(MANIFEST_CACHE_KEY, `${MANIFEST_URL}?v=${Date.now()}`);
  }

  create(): void {
    const manifest = this.cache.json.get(MANIFEST_CACHE_KEY) as RuntimeManifest | undefined;
    if (!manifest) {
      this.add.text(40, 40, 'Asset manifest missing. Run `npm run assets`, then reload.', { fontSize: '32px', color: '#fff8ec' });
      return;
    }
    services.assets.setManifest(manifest);
    this.scene.start(SceneKeys.Preload);
  }
}
