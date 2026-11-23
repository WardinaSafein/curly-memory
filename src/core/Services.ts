import { AssetRegistry } from './AssetRegistry';
import { GameState } from './GameState';
import { LocalSaveService, MemorySaveService } from './SaveService';

const params = new URLSearchParams(globalThis.location?.search ?? '');

/**
 * Shared services, created once at boot. Kept deliberately small: scenes pull
 * what they need from here instead of passing everything through constructors.
 */
export const services = {
  assets: new AssetRegistry(),
  state: new GameState(params.has('nosave') ? new MemorySaveService() : new LocalSaveService()),
  params,
};

if (params.has('reset')) services.state.reset();
