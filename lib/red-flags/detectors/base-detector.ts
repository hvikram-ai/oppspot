/**
 * Base Detector Abstract Class
 *
 * Provides common functionality for all red flag detectors:
 * - Fingerprint generation for deduplication
 * - Timeout guards to prevent long-running detectors
 * - Common result structure
 *
 * All detectors must extend this base class.
 */

import {
  RedFlag,
  FlagCategory,
  EntityType,
  DetectorResult,
  DetectorOptions,
} from '../types';
import { generateFingerprint, normalizeText, extractKeyAttributes } from '../consolidation/fingerprint';

/**
 * Abstract base class for all red flag detectors
 */
export abstract class BaseDetector {
  /**
   * Unique name of the detector (e.g., "financial", "legal")
   */
  abstract readonly name: string;

  /**
   * Primary category this detector focuses on
   */
  abstract readonly category: FlagCategory;

  /**
   * Version of the detector (for tracking algorithm changes)
   */
  abstract readonly version: string;

  /**
   * Main detection method - must be implemented by subclasses
   */
  abstract detect(options: DetectorOptions): Promise<DetectorResult>;

  /**
   * Generate a deterministic fingerprint for a flag to support deduplication
   * Delegates to the standalone fingerprint utility
   */
  protected generateFingerprint(flag: Partial<RedFlag>): string {
    return generateFingerprint(flag);
  }

  /**
   * Wrap a promise with a timeout guard
   * If the promise doesn't resolve within the timeout, reject with timeout error
   *
   * @param promise The promise to wrap
   * @param timeoutMs Timeout in milliseconds (default: 10000ms = 10s)
   * @returns Promise that rejects on timeout
   */
  protected async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number = 10000
  ): Promise<T> {
    let timeoutHandle: NodeJS.Timeout;

    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutHandle = setTimeout(() => {
        reject(new Error(`Detector ${this.name} timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    });

    try {
      const result = await Promise.race([promise, timeoutPromise]);
      clearTimeout(timeoutHandle!);
      return result;
    } catch (error) {
      clearTimeout(timeoutHandle!);
      throw error;
    }
  }

  /**
   * Create a standard detector result
   * This helper ensures all detectors return consistent result structures
   */
  protected createResult(
    flags: Partial<RedFlag>[],
    durationMs: number,
    error?: string
  ): DetectorResult {
    return {
      flags,
      metadata: {
        detector: this.name,
        version: this.version,
        duration_ms: Math.round(durationMs),
        ...(error && { error }),
      },
    };
  }

  /**
   * Safe execution wrapper that catches errors and returns partial results
   * Use this in the detect() method to ensure graceful degradation
   */
  protected async safeExecute(
    operation: () => Promise<Partial<RedFlag>[]>
  ): Promise<DetectorResult> {
    const startTime = Date.now();

    try {
      const flags = await this.withTimeout(operation());
      const duration = Date.now() - startTime;
      return this.createResult(flags, duration);
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Log error but return empty results to allow other detectors to continue
      console.error(`[${this.name}] Detection failed:`, errorMessage);

      return this.createResult([], duration, errorMessage);
    }
  }
}
