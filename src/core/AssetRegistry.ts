import type Phaser from 'phaser';
import type { RuntimeAsset, RuntimeManifest } from './AssetManifest';

export const MANIFEST_URL = 'assets/manifest.json';
export const MANIFEST_CACHE_KEY = 'asset-manifest';

/**
 * Runtime view of the generated asset manifest. Game code refers to assets
 * only by key; whether a key is real art or a placeholder is invisible to it.
 */
export class AssetRegistry {
  private manifest: RuntimeManifest | null = null;

  setManifest(manifest: RuntimeManifest): void {
    this.manifest = manifest;
  }

  get loaded(): boolean {
    return this.manifest !== null;
  }

  get summary(): RuntimeManifest['summary'] | undefined {
    return this.manifest?.summary;
  }

  all(): RuntimeAsset[] {
    return Object.values(this.manifest?.assets ?? {});
  }

  has(key: string): boolean {
    return Boolean(this.manifest?.assets[key]);
  }

  get(key: string): RuntimeAsset {
    const a = this.manifest?.assets[key];
    if (!a) throw new Error(`Asset "${key}" is not in the manifest. Declare it in src/content/assets/manifest.json and run npm run assets.`);
    return a;
  }

  isPlaceholder(key: string): boolean {
    return this.manifest?.assets[key]?.placeholder ?? true;
  }

  /** Queue every image in the manifest on a Phaser loader. */
  queueAll(load: Phaser.Loader.LoaderPlugin): void {
    for (const a of this.all()) load.image(a.key, a.url);
  }
}
