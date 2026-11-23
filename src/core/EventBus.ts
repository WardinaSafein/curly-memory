import Phaser from 'phaser';

/** Game-wide events. Systems communicate through these instead of importing each other. */
export interface GameEvents {
  'state:changed': [];
  'dialogue:start': [knot: string];
  'dialogue:end': [knot: string];
  'dialogue:tag': [tag: string, value: string];
  'hotspot:activated': [sceneId: string, hotspotId: string];
  'cinematic:start': [id: string];
  'cinematic:end': [id: string];
}

class TypedEmitter extends Phaser.Events.EventEmitter {
  emitEvent<K extends keyof GameEvents>(event: K, ...args: GameEvents[K]): boolean {
    return super.emit(event, ...args);
  }
  onEvent<K extends keyof GameEvents>(event: K, fn: (...args: GameEvents[K]) => void, context?: unknown): this {
    return super.on(event, fn as (...args: unknown[]) => void, context);
  }
  offEvent<K extends keyof GameEvents>(event: K, fn: (...args: GameEvents[K]) => void, context?: unknown): this {
    return super.off(event, fn as (...args: unknown[]) => void, context);
  }
}

export const EventBus = new TypedEmitter();
