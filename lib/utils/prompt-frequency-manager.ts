/**
 * Prompt Frequency Manager
 *
 * Manages the frequency of upgrade prompts and conversion triggers
 * to avoid user fatigue and improve conversion experience.
 *
 * Features:
 * - Rate limiting per prompt type (max 1 show per hour by default)
 * - Session-based tracking (persists across page reloads)
 * - Configurable cooldown periods
 * - Analytics-friendly (track show counts)
 *
 * @example
 * ```typescript
 * const manager = new PromptFrequencyManager();
 *
 * if (manager.canShow('exit_intent')) {
 *   // Show exit intent modal
 *   manager.recordShown('exit_intent');
 * }
 * ```
 */

export type PromptType =
  | 'exit_intent'
  | 'feature_restriction'
  | 'quota_limit'
  | 'tour_complete'
  | 'upgrade_general';

export interface PromptRecord {
  /** Last time this prompt type was shown (Unix timestamp in ms) */
  lastShown: number;
  /** Total number of times shown in current session */
  showCount: number;
  /** Total number of times dismissed (clicked away without converting) */
  dismissCount: number;
}

export interface PromptFrequencyConfig {
  /** Cooldown period in milliseconds (default: 1 hour) */
  cooldownMs?: number;
  /** Maximum shows per session (default: 3) */
  maxShowsPerSession?: number;
  /** localStorage key (default: 'oppspot:prompt-frequency') */
  storageKey?: string;
}

interface PromptState {
  [promptType: string]: PromptRecord;
}

export class PromptFrequencyManager {
  private cooldownMs: number;
  private maxShowsPerSession: number;
  private storageKey: string;

  constructor(config: PromptFrequencyConfig = {}) {
    this.cooldownMs = config.cooldownMs ?? 60 * 60 * 1000; // 1 hour default
    this.maxShowsPerSession = config.maxShowsPerSession ?? 3;
    this.storageKey = config.storageKey ?? 'oppspot:prompt-frequency';
  }

  /**
   * Check if a prompt can be shown based on frequency rules
   *
   * @param promptType - Type of prompt to check
   * @returns true if prompt can be shown, false otherwise
   */
  canShow(promptType: PromptType): boolean {
    try {
      // Check browser environment
      if (typeof window === 'undefined') {
        return false;
      }

      const state = this.getState();
      const record = state[promptType];

      // If never shown, allow
      if (!record) {
        return true;
      }

      // Check session limit
      if (record.showCount >= this.maxShowsPerSession) {
        console.log(`PromptFrequencyManager: ${promptType} exceeded session limit (${this.maxShowsPerSession})`);
        return false;
      }

      // Check cooldown
      const timeSinceLastShow = Date.now() - record.lastShown;
      if (timeSinceLastShow < this.cooldownMs) {
        const remainingMs = this.cooldownMs - timeSinceLastShow;
        const remainingMin = Math.ceil(remainingMs / (60 * 1000));
        console.log(`PromptFrequencyManager: ${promptType} in cooldown (${remainingMin}min remaining)`);
        return false;
      }

      return true;
    } catch (error) {
      console.error('PromptFrequencyManager: Error in canShow:', error);
      return false; // Fail closed
    }
  }

  /**
   * Record that a prompt was shown
   *
   * @param promptType - Type of prompt that was shown
   */
  recordShown(promptType: PromptType): void {
    try {
      if (typeof window === 'undefined') {
        return;
      }

      const state = this.getState();
      const existing = state[promptType];

      state[promptType] = {
        lastShown: Date.now(),
        showCount: (existing?.showCount ?? 0) + 1,
        dismissCount: existing?.dismissCount ?? 0
      };

      this.setState(state);

      console.log(`PromptFrequencyManager: Recorded ${promptType} shown (count: ${state[promptType].showCount})`);
    } catch (error) {
      console.error('PromptFrequencyManager: Error recording shown:', error);
    }
  }

  /**
   * Record that a prompt was dismissed (not converted)
   *
   * @param promptType - Type of prompt that was dismissed
   */
  recordDismissed(promptType: PromptType): void {
    try {
      if (typeof window === 'undefined') {
        return;
      }

      const state = this.getState();
      const existing = state[promptType];

      if (existing) {
        state[promptType] = {
          ...existing,
          dismissCount: existing.dismissCount + 1
        };

        this.setState(state);

        console.log(`PromptFrequencyManager: Recorded ${promptType} dismissed (count: ${state[promptType].dismissCount})`);
      }
    } catch (error) {
      console.error('PromptFrequencyManager: Error recording dismissed:', error);
    }
  }

  /**
   * Get statistics for a prompt type
   *
   * @param promptType - Type of prompt to get stats for
   * @returns Prompt record or null if never shown
   */
  getStats(promptType: PromptType): PromptRecord | null {
    try {
      const state = this.getState();
      return state[promptType] ?? null;
    } catch (error) {
      console.error('PromptFrequencyManager: Error getting stats:', error);
      return null;
    }
  }

  /**
   * Get all prompt statistics
   *
   * @returns Complete state object with all prompt records
   */
  getAllStats(): PromptState {
    return this.getState();
  }

  /**
   * Reset frequency tracking for a specific prompt type
   *
   * @param promptType - Type of prompt to reset
   */
  reset(promptType: PromptType): void {
    try {
      if (typeof window === 'undefined') {
        return;
      }

      const state = this.getState();
      delete state[promptType];
      this.setState(state);

      console.log(`PromptFrequencyManager: Reset ${promptType}`);
    } catch (error) {
      console.error('PromptFrequencyManager: Error resetting:', error);
    }
  }

  /**
   * Reset all frequency tracking
   */
  resetAll(): void {
    try {
      if (typeof window === 'undefined') {
        return;
      }

      localStorage.removeItem(this.storageKey);
      console.log('PromptFrequencyManager: Reset all prompts');
    } catch (error) {
      console.error('PromptFrequencyManager: Error resetting all:', error);
    }
  }

  /**
   * Get remaining cooldown time for a prompt type
   *
   * @param promptType - Type of prompt to check
   * @returns Remaining milliseconds, or 0 if no cooldown
   */
  getRemainingCooldown(promptType: PromptType): number {
    const record = this.getStats(promptType);
    if (!record) {
      return 0;
    }

    const timeSinceLastShow = Date.now() - record.lastShown;
    const remaining = this.cooldownMs - timeSinceLastShow;

    return remaining > 0 ? remaining : 0;
  }

  /**
   * Check if a prompt type has exceeded session limit
   *
   * @param promptType - Type of prompt to check
   * @returns true if session limit exceeded
   */
  hasExceededSessionLimit(promptType: PromptType): boolean {
    const record = this.getStats(promptType);
    if (!record) {
      return false;
    }

    return record.showCount >= this.maxShowsPerSession;
  }

  // Private methods

  private getState(): PromptState {
    try {
      const data = localStorage.getItem(this.storageKey);
      if (!data) {
        return {};
      }
      return JSON.parse(data);
    } catch (error) {
      console.error('PromptFrequencyManager: Error parsing state:', error);
      return {};
    }
  }

  private setState(state: PromptState): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(state));
    } catch (error) {
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        console.error('PromptFrequencyManager: localStorage quota exceeded');
        // Try to clear old data
        this.resetAll();
      } else {
        console.error('PromptFrequencyManager: Error saving state:', error);
      }
    }
  }
}

/**
 * Singleton instance for global use
 */
export const promptFrequencyManager = new PromptFrequencyManager();
