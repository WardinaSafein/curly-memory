/**
 * Persistence boundary. The prototype saves to localStorage; a backend
 * implementation (cloud saves, accounts) can replace it without touching game code.
 */
export interface SaveService {
  load<T>(slot: string): T | null;
  save<T>(slot: string, data: T): void;
  clear(slot: string): void;
}

export class LocalSaveService implements SaveService {
  constructor(private readonly prefix = 'cyberwr:') {}

  load<T>(slot: string): T | null {
    try {
      const raw = globalThis.localStorage?.getItem(this.prefix + slot);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null; // storage blocked (private mode) or corrupt: start fresh
    }
  }

  save<T>(slot: string, data: T): void {
    try {
      globalThis.localStorage?.setItem(this.prefix + slot, JSON.stringify(data));
    } catch {
      /* storage unavailable: the session continues without saving */
    }
  }

  clear(slot: string): void {
    try {
      globalThis.localStorage?.removeItem(this.prefix + slot);
    } catch {
      /* ignore */
    }
  }
}

/** In-memory implementation for tests and for `?nosave`. */
export class MemorySaveService implements SaveService {
  private data = new Map<string, string>();
  load<T>(slot: string): T | null {
    const raw = this.data.get(slot);
    return raw ? (JSON.parse(raw) as T) : null;
  }
  save<T>(slot: string, data: T): void {
    this.data.set(slot, JSON.stringify(data));
  }
  clear(slot: string): void {
    this.data.delete(slot);
  }
}
