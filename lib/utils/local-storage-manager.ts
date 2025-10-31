/**
 * Local Storage Manager
 *
 * Type-safe localStorage utility with expiry management and cross-tab sync
 *
 * Features:
 * - Type safety with generics
 * - Automatic expiry handling (timestamp-based)
 * - Cross-tab synchronization via StorageEvent
 * - Error handling for quota exceeded
 * - Serialization/deserialization support
 *
 * @example
 * ```typescript
 * const tourProgress = new LocalStorageManager({
 *   key: 'oppspot:tour-progress',
 *   defaultValue: { completed: false, step: 0 },
 *   expiry: 30 * 24 * 60 * 60 * 1000 // 30 days
 * });
 *
 * tourProgress.set({ completed: true, step: 5 });
 * const progress = tourProgress.get();
 * ```
 */

export interface StorageConfig<T> {
  /**
   * Unique key for localStorage
   * Recommended format: 'oppspot:feature-name:data-type'
   */
  key: string;

  /**
   * Default value returned when key doesn't exist or is expired
   */
  defaultValue?: T;

  /**
   * Expiry time in milliseconds
   * If not provided, data never expires
   */
  expiry?: number;

  /**
   * Custom serialization function
   * Default: JSON.stringify
   */
  serialize?: (value: T) => string;

  /**
   * Custom deserialization function
   * Default: JSON.parse
   */
  deserialize?: (value: string) => T;
}

interface StoredItem<T> {
  value: T;
  timestamp: number;
}

export class LocalStorageManager<T> {
  private config: StorageConfig<T>;

  constructor(config: StorageConfig<T>) {
    this.config = config;
  }

  /**
   * Get value from localStorage
   * Returns defaultValue if key doesn't exist or is expired
   */
  get(): T | null {
    try {
      // Check if we're in browser environment
      if (typeof window === 'undefined') {
        return this.config.defaultValue ?? null;
      }

      const item = localStorage.getItem(this.config.key);
      if (!item) {
        return this.config.defaultValue ?? null;
      }

      const parsed: StoredItem<T> = JSON.parse(item);

      // Check expiry
      if (this.config.expiry && parsed.timestamp) {
        const age = Date.now() - parsed.timestamp;
        if (age > this.config.expiry) {
          this.remove();
          return this.config.defaultValue ?? null;
        }
      }

      // Deserialize if custom function provided
      if (this.config.deserialize) {
        return this.config.deserialize(JSON.stringify(parsed.value));
      }

      return parsed.value;
    } catch (error) {
      console.error(`LocalStorageManager: Error getting ${this.config.key}:`, error);
      return this.config.defaultValue ?? null;
    }
  }

  /**
   * Set value in localStorage with timestamp
   * Throws error if quota exceeded
   */
  set(value: T): void {
    try {
      // Check if we're in browser environment
      if (typeof window === 'undefined') {
        console.warn('LocalStorageManager: Cannot set value in non-browser environment');
        return;
      }

      // Serialize if custom function provided
      const serialized = this.config.serialize
        ? this.config.serialize(value)
        : value;

      const item: StoredItem<T> = {
        value: serialized as T,
        timestamp: Date.now()
      };

      localStorage.setItem(this.config.key, JSON.stringify(item));
    } catch (error) {
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        console.error(`LocalStorageManager: Quota exceeded for ${this.config.key}`);
        throw new Error('localStorage quota exceeded. Please clear some data.');
      }
      console.error(`LocalStorageManager: Error setting ${this.config.key}:`, error);
      throw error;
    }
  }

  /**
   * Remove value from localStorage
   */
  remove(): void {
    try {
      if (typeof window === 'undefined') {
        return;
      }
      localStorage.removeItem(this.config.key);
    } catch (error) {
      console.error(`LocalStorageManager: Error removing ${this.config.key}:`, error);
    }
  }

  /**
   * Subscribe to changes from other tabs
   * Returns unsubscribe function
   *
   * @example
   * ```typescript
   * const unsubscribe = storage.subscribe((value) => {
   *   console.log('Value updated in another tab:', value);
   * });
   *
   * // Later, cleanup:
   * unsubscribe();
   * ```
   */
  subscribe(callback: (value: T | null) => void): () => void {
    if (typeof window === 'undefined') {
      return () => {}; // No-op in non-browser environment
    }

    const handler = (e: StorageEvent) => {
      if (e.key === this.config.key) {
        callback(this.get());
      }
    };

    window.addEventListener('storage', handler);

    // Return cleanup function
    return () => window.removeEventListener('storage', handler);
  }

  /**
   * Check if value exists and is not expired
   */
  exists(): boolean {
    return this.get() !== null;
  }

  /**
   * Get the raw stored value (including timestamp) without expiry check
   * Useful for debugging
   */
  getRaw(): StoredItem<T> | null {
    try {
      if (typeof window === 'undefined') {
        return null;
      }

      const item = localStorage.getItem(this.config.key);
      if (!item) {
        return null;
      }

      return JSON.parse(item);
    } catch (error) {
      console.error(`LocalStorageManager: Error getting raw ${this.config.key}:`, error);
      return null;
    }
  }

  /**
   * Get remaining time until expiry in milliseconds
   * Returns null if no expiry set or value doesn't exist
   */
  getRemainingTime(): number | null {
    if (!this.config.expiry) {
      return null;
    }

    const raw = this.getRaw();
    if (!raw) {
      return null;
    }

    const age = Date.now() - raw.timestamp;
    const remaining = this.config.expiry - age;

    return remaining > 0 ? remaining : 0;
  }
}

/**
 * Helper function to create a LocalStorageManager instance
 * with default namespace for oppSpot
 */
export function createOppSpotStorage<T>(
  name: string,
  defaultValue?: T,
  expiryDays?: number
): LocalStorageManager<T> {
  return new LocalStorageManager({
    key: `oppspot:${name}`,
    defaultValue,
    expiry: expiryDays ? expiryDays * 24 * 60 * 60 * 1000 : undefined
  });
}
