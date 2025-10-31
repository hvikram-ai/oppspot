/**
 * Red Flag Service - Main Orchestrator
 *
 * Coordinates the complete red flag detection workflow:
 * 1. Create run record (status='running')
 * 2. Execute detectors in parallel (Promise.allSettled)
 * 3. Consolidate results (fingerprinting, deduplication)
 * 4. Resolve evidence
 * 5. Generate explanations
 * 6. Upsert flags and evidence to database
 * 7. Update run record (stats, status)
 * 8. Emit alerts for critical/high flags
 *
 * Performance target: <10s for typical workload
 */

import { createClient } from '../supabase/server';
import {
  RedFlag,
  RedFlagRun,
  RedFlagEvidence,
  RedFlagDetail,
  FlagFilters,
  FlagListResult,
  FlagSummary,
  EntityType,
  RunStatus,
  RunStats,
  ActionPayload,
  FlagStatus,
  FlagCategory,
  FlagSeverity,
} from './types';
import { getFinancialDetector } from './detectors/financial-detector';
import { getOperationalDetector } from './detectors/operational-detector';
import { getLegalDetector } from './detectors/legal-detector';
import { getCyberDetector } from './detectors/cyber-detector';
import { getESGDetector } from './detectors/esg-detector';
import { generateFingerprint } from './consolidation/fingerprint';
import { mergeFlags, mergeEvidence, shouldAlertOnSeverityChange } from './consolidation/merger';
import { getEvidenceLinker } from './utils/evidence-linker';
import { getExplainerService } from './explainability/explainer-service';

/**
 * Red Flag Detection Service
 */
export class RedFlagService {
  /**
   * Run complete detection workflow
   */
  async runDetection(
    entityId: string,
    entityType: EntityType,
    detectorNames?: string[]
  ): Promise<RedFlagRun> {
    const startTime = Date.now();

    console.log(`[RedFlagService] Starting detection for ${entityType} ${entityId}`);

    // Step 1: Create run record
    const run = await this.createRun(entityId, entityType);

    try {
      // Step 2: Execute detectors in parallel
      const detectorResults = await this.executeDetectors(
        entityId,
        entityType,
        detectorNames
      );

      // Step 3: Consolidate results (deduplication)
      const { flags, stats, escalations } = await this.consolidateResults(
        entityId,
        entityType,
        detectorResults,
        run.id
      );

      // Step 4: Generate explanations for all flags
      await this.generateExplanations(flags);

      // Step 5: Upsert flags to database
      await this.upsertFlags(flags);

      // Step 6: Emit alerts for critical/high severity flags and escalations
      await this.emitAlerts(flags);
      await this.emitEscalationAlerts(escalations);

      // Step 7: Update run record with stats
      const duration = Date.now() - startTime;
      await this.completeRun(run.id, stats, 'success', duration);

      console.log(
        `[RedFlagService] Detection complete in ${duration}ms. ` +
        `Detected: ${stats.flags_detected}, New: ${stats.flags_new}, Updated: ${stats.flags_updated}`
      );

      // Return updated run record
      return await this.getRun(run.id);
    } catch (error) {
      console.error('[RedFlagService] Detection failed:', error);

      // Mark run as error
      await this.completeRun(run.id, {
        detectors_ran: 0,
        detectors_succeeded: 0,
        detectors_failed: 5,
        flags_detected: 0,
        flags_new: 0,
        flags_updated: 0,
      }, 'error', Date.now() - startTime);

      throw error;
    }
  }

  /**
   * Get flags with filtering and pagination
   */
  async getFlags(
    entityId: string,
    entityType: EntityType,
    filters: FlagFilters = {}
  ): Promise<FlagListResult> {
    const supabase = await createClient();

    // Build query
    let query = supabase
      .from('red_flags')
      .select('*', { count: 'exact' })
      .eq('entity_id', entityId)
      .eq('entity_type', entityType);

    // Apply filters
    if (filters.status && filters.status.length > 0) {
      query = query.in('status', filters.status);
    }
    if (filters.category && filters.category.length > 0) {
      query = query.in('category', filters.category);
    }
    if (filters.severity && filters.severity.length > 0) {
      query = query.in('severity', filters.severity);
    }
    if (filters.search) {
      query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }

    // Apply sorting
    const sortColumn = filters.sort === 'detected' ? 'first_detected_at' :
                      filters.sort === 'updated' ? 'last_updated_at' :
                      'severity'; // Default to severity

    if (sortColumn === 'severity') {
      // Custom severity sort (critical > high > medium > low)
      query = query.order('severity', { ascending: false });
    } else {
      query = query.order(sortColumn, { ascending: false });
    }

    // Apply pagination
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;

    query = query.range(offset, offset + limit - 1);

    // Execute query
    const { data: flags, error, count } = await query;

    if (error) {
      throw new Error(`Failed to fetch flags: ${error.message}`);
    }

    // Generate summary
    const summary = await this.generateSummary(entityId, entityType, filters);

    return {
      flags: flags || [],
      summary,
      pagination: {
        page,
        limit,
        total: count || 0,
        total_pages: Math.ceil((count || 0) / limit),
      },
    };
  }

  /**
   * Get detailed flag with evidence and actions
   */
  async getFlagDetail(flagId: string): Promise<RedFlagDetail> {
    const supabase = await createClient();

    // Get flag
    const { data: flag, error: flagError } = await supabase
      .from('red_flags')
      .select('*')
      .eq('id', flagId)
      .single();

    if (flagError || !flag) {
      throw new Error(`Flag not found: ${flagId}`);
    }

    // Get evidence
    const { data: evidence } = await supabase
      .from('red_flag_evidence')
      .select('*')
      .eq('flag_id', flagId)
      .order('importance', { ascending: false });

    // Get actions
    const { data: actions } = await supabase
      .from('red_flag_actions')
      .select('*')
      .eq('flag_id', flagId)
      .order('created_at', { ascending: false });

    // Resolve evidence metadata
    const evidenceLinker = getEvidenceLinker();
    const resolvedEvidence = await evidenceLinker.resolveEvidence(evidence || []);

    // Get owner profile if assigned
    let owner = undefined;
    if (flag.owner_id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, name, email')
        .eq('id', flag.owner_id)
        .single();

      if (profile) {
        owner = {
          id: profile.id,
          name: profile.name || 'Unknown',
          email: profile.email || '',
        };
      }
    }

    return {
      ...flag,
      evidence: resolvedEvidence,
      actions: actions || [],
      owner,
    };
  }

  /**
   * Record an action on a flag
   */
  async recordAction(
    flagId: string,
    action: ActionPayload,
    actorId: string
  ): Promise<void> {
    const supabase = await createClient();

    // Insert action
    const { error } = await supabase
      .from('red_flag_actions')
      .insert({
        flag_id: flagId,
        action_type: action.type,
        actor_id: actorId,
        payload: action,
      });

    if (error) {
      throw new Error(`Failed to record action: ${error.message}`);
    }

    // Update flag based on action type
    if (action.type === 'status_change') {
      await supabase
        .from('red_flags')
        .update({ status: action.to, last_updated_at: new Date().toISOString() })
        .eq('id', flagId);
    } else if (action.type === 'assign') {
      await supabase
        .from('red_flags')
        .update({ owner_id: action.assignee_id, last_updated_at: new Date().toISOString() })
        .eq('id', flagId);
    } else if (action.type === 'snooze') {
      await supabase
        .from('red_flags')
        .update({ snoozed_until: action.until, last_updated_at: new Date().toISOString() })
        .eq('id', flagId);
    }
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Create a new detection run record
   */
  private async createRun(
    entityId: string,
    entityType: EntityType
  ): Promise<RedFlagRun> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('red_flag_runs')
      .insert({
        entity_id: entityId,
        entity_type: entityType,
        status: 'running',
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to create run: ${error?.message}`);
    }

    return data;
  }

  /**
   * Execute all detectors in parallel
   */
  private async executeDetectors(
    entityId: string,
    entityType: EntityType,
    detectorNames?: string[]
  ) {
    const options = { entityId, entityType };

    // Get detectors
    const allDetectors = [
      getFinancialDetector(),
      getOperationalDetector(),
      getLegalDetector(),
      getCyberDetector(),
      getESGDetector(),
    ];

    // Filter if specific detectors requested
    const detectors = detectorNames
      ? allDetectors.filter(d => detectorNames.includes(d.name))
      : allDetectors;

    console.log(`[RedFlagService] Running ${detectors.length} detectors`);

    // Execute in parallel with Promise.allSettled
    const results = await Promise.allSettled(
      detectors.map(detector => detector.detect(options))
    );

    return results.map((result, idx) => {
      const detector = detectors[idx];
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        console.error(`[RedFlagService] Detector ${detector.name} failed:`, result.reason);
        return {
          flags: [],
          metadata: {
            detector: detector.name,
            version: detector.version,
            duration_ms: 0,
            error: result.reason?.message || 'Unknown error',
          },
        };
      }
    });
  }

  /**
   * Consolidate results from all detectors
   */
  private async consolidateResults(
    entityId: string,
    entityType: EntityType,
    detectorResults: Array<{ flags: Partial<RedFlag>[]; metadata: { detector: string; version: string; duration_ms: number; error?: string } }>,
    runId: string
  ): Promise<{ flags: RedFlag[]; stats: RunStats; escalations: Array<{ flag: RedFlag; from: FlagSeverity; to: FlagSeverity }> }> {
    const stats: RunStats = {
      detectors_ran: detectorResults.length,
      detectors_succeeded: detectorResults.filter(r => !r.metadata.error).length,
      detectors_failed: detectorResults.filter(r => r.metadata.error).length,
      flags_detected: 0,
      flags_new: 0,
      flags_updated: 0,
    };

    // Collect all flags from detectors
    const allCandidateFlags = detectorResults.flatMap(r => r.flags);
    stats.flags_detected = allCandidateFlags.length;

    console.log(`[RedFlagService] Consolidating ${allCandidateFlags.length} candidate flags`);

    // Get existing flags for this entity
    const existingFlags = await this.getExistingFlags(entityId, entityType);

    // Deduplicate and merge
    const consolidatedFlags: RedFlag[] = [];
    const escalations: Array<{ flag: RedFlag; from: FlagSeverity; to: FlagSeverity }> = [];
    const flagsByFingerprint = new Map<string, RedFlag>();

    // Index existing flags by fingerprint
    for (const existing of existingFlags) {
      flagsByFingerprint.set(existing.fingerprint, existing);
    }

    // Process candidate flags
    for (const candidate of allCandidateFlags) {
      if (!candidate.fingerprint) {
        candidate.fingerprint = generateFingerprint(candidate);
      }

      const existing = flagsByFingerprint.get(candidate.fingerprint);

      if (existing) {
        // Merge with existing
        const merged = mergeFlags(existing, candidate);
        flagsByFingerprint.set(candidate.fingerprint, merged.updatedFlag);

        if (merged.severityIncreased) {
          console.log(
            `[RedFlagService] Severity escalation detected: ${existing.severity} → ${merged.updatedFlag.severity} for flag: ${merged.updatedFlag.title}`
          );

          // Track escalation
          escalations.push({
            flag: merged.updatedFlag,
            from: existing.severity,
            to: merged.updatedFlag.severity,
          });

          // Record severity escalation action
          await this.recordEscalationAction(
            existing.id,
            existing.severity,
            merged.updatedFlag.severity,
            candidate.meta?.detector_metadata || {}
          );
        }

        stats.flags_updated++;
      } else {
        // New flag
        const newFlag: RedFlag = {
          id: '', // Will be set by database
          entity_type: candidate.entity_type || entityType,
          entity_id: candidate.entity_id || entityId,
          category: candidate.category!,
          title: candidate.title!,
          description: candidate.description || null,
          severity: candidate.severity!,
          confidence: candidate.confidence || null,
          status: candidate.status || 'open',
          first_detected_at: candidate.first_detected_at || new Date().toISOString(),
          last_updated_at: candidate.last_updated_at || new Date().toISOString(),
          run_id: runId,
          fingerprint: candidate.fingerprint!,
          meta: candidate.meta || {},
          owner_id: null,
          snoozed_until: null,
        };

        flagsByFingerprint.set(candidate.fingerprint, newFlag);
        stats.flags_new++;
      }
    }

    // Convert map to array
    consolidatedFlags.push(...flagsByFingerprint.values());

    return { flags: consolidatedFlags, stats, escalations };
  }

  /**
   * Get existing flags for entity
   */
  private async getExistingFlags(
    entityId: string,
    entityType: EntityType
  ): Promise<RedFlag[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('red_flags')
      .select('*')
      .eq('entity_id', entityId)
      .eq('entity_type', entityType);

    if (error) {
      console.warn('[RedFlagService] Error fetching existing flags:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Generate explanations for flags
   */
  private async generateExplanations(flags: RedFlag[]): Promise<void> {
    const explainerService = getExplainerService();

    for (const flag of flags) {
      try {
        await explainerService.generateExplanation(flag, []);
      } catch (error) {
        console.error(`[RedFlagService] Explanation generation failed for flag ${flag.id}:`, error);
      }
    }
  }

  /**
   * Upsert flags to database
   */
  private async upsertFlags(flags: RedFlag[]): Promise<void> {
    const supabase = await createClient();

    for (const flag of flags) {
      const { error } = await supabase
        .from('red_flags')
        .upsert(flag, { onConflict: 'entity_type,entity_id,fingerprint' });

      if (error) {
        console.error('[RedFlagService] Failed to upsert flag:', error);
      }
    }
  }

  /**
   * Record severity escalation action
   */
  private async recordEscalationAction(
    flagId: string,
    fromSeverity: FlagSeverity,
    toSeverity: FlagSeverity,
    detectorMetadata: Record<string, unknown>
  ): Promise<void> {
    try {
      const supabase = await createClient();

      // Extract reason from detector metadata if available
      let reason = `Severity escalated from ${fromSeverity} to ${toSeverity} based on latest detection.`;
      if (detectorMetadata.actual_value !== undefined && detectorMetadata.threshold !== undefined) {
        reason = `Threshold exceeded: ${detectorMetadata.actual_value} > ${detectorMetadata.threshold}`;
      }

      await supabase
        .from('red_flag_actions')
        .insert({
          flag_id: flagId,
          action_type: 'status_change', // Using status_change as proxy for escalation
          actor_id: null, // System-generated action
          payload: {
            type: 'status_change',
            from: fromSeverity,
            to: toSeverity,
            reason,
          },
        });

      console.log(`[RedFlagService] Escalation action recorded for flag ${flagId}`);
    } catch (error) {
      console.error(`[RedFlagService] Failed to record escalation action:`, error);
    }
  }

  /**
   * Emit alerts for severity escalations
   */
  private async emitEscalationAlerts(
    escalations: Array<{ flag: RedFlag; from: FlagSeverity; to: FlagSeverity }>
  ): Promise<void> {
    if (escalations.length === 0) {
      return;
    }

    const { AlertService } = await import('../alerts/alert-service');
    const alertService = new AlertService();

    for (const escalation of escalations) {
      try {
        // Always emit alert for escalations (even if not critical/high)
        const alertSeverity = escalation.to === 'critical' ? 'P1' :
                            escalation.to === 'high' ? 'P2' : 'P3';

        await alertService.triggerAlert({
          severity: alertSeverity as 'P1' | 'P2' | 'P3',
          category: 'custom',
          title: `Red Flag Severity Escalated: ${escalation.flag.title}`,
          message: `Severity escalated from ${escalation.from} to ${escalation.to}. ${escalation.flag.meta?.explainer?.why || 'Requires immediate attention.'}`,
          sourceService: 'red-flag-radar',
          sourceEndpoint: `/api/companies/${escalation.flag.entity_id}/red-flags/${escalation.flag.id}`,
          context: {
            flag_id: escalation.flag.id,
            category: escalation.flag.category,
            severity_from: escalation.from,
            severity_to: escalation.to,
            entity_type: escalation.flag.entity_type,
            entity_id: escalation.flag.entity_id,
            escalation: true,
          },
          tags: [escalation.flag.category, escalation.to, 'red-flag', 'escalation'],
        });

        console.log(
          `[RedFlagService] Escalation alert emitted for flag ${escalation.flag.id} (${escalation.from} → ${escalation.to})`
        );
      } catch (error) {
        console.error(`[RedFlagService] Failed to emit escalation alert:`, error);
      }
    }

    console.log(`[RedFlagService] Emitted ${escalations.length} escalation alerts`);
  }

  /**
   * Emit alerts for critical/high severity flags
   */
  private async emitAlerts(flags: RedFlag[]): Promise<void> {
    const { AlertService } = await import('../alerts/alert-service');
    const alertService = new AlertService();

    const criticalAndHighFlags = flags.filter(
      f => (f.severity === 'critical' || f.severity === 'high') && f.status === 'open'
    );

    for (const flag of criticalAndHighFlags) {
      try {
        // Map severity: Critical → P1, High → P2
        const alertSeverity = flag.severity === 'critical' ? 'P1' : 'P2';

        await alertService.triggerAlert({
          severity: alertSeverity as 'P1' | 'P2',
          category: 'custom',
          title: `Red Flag Detected: ${flag.title}`,
          message: flag.meta?.explainer?.why || flag.description || 'Red flag detected requiring immediate attention.',
          sourceService: 'red-flag-radar',
          sourceEndpoint: `/api/companies/${flag.entity_id}/red-flags/${flag.id}`,
          context: {
            flag_id: flag.id,
            category: flag.category,
            severity: flag.severity,
            confidence: flag.confidence,
            entity_type: flag.entity_type,
            entity_id: flag.entity_id,
          },
          tags: [flag.category, flag.severity, 'red-flag'],
        });

        console.log(`[RedFlagService] Alert emitted for flag ${flag.id} (${flag.severity})`);
      } catch (error) {
        console.error(`[RedFlagService] Failed to emit alert for flag ${flag.id}:`, error);
      }
    }

    if (criticalAndHighFlags.length > 0) {
      console.log(
        `[RedFlagService] Emitted ${criticalAndHighFlags.length} alerts for critical/high flags`
      );
    }
  }

  /**
   * Complete a run
   */
  private async completeRun(
    runId: string,
    stats: RunStats,
    status: RunStatus,
    durationMs: number
  ): Promise<void> {
    const supabase = await createClient();

    await supabase
      .from('red_flag_runs')
      .update({
        finished_at: new Date().toISOString(),
        stats,
        status,
      })
      .eq('id', runId);
  }

  /**
   * Get run record
   */
  private async getRun(runId: string): Promise<RedFlagRun> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('red_flag_runs')
      .select('*')
      .eq('id', runId)
      .single();

    if (error || !data) {
      throw new Error(`Run not found: ${runId}`);
    }

    return data;
  }

  /**
   * Generate summary statistics
   */
  private async generateSummary(
    entityId: string,
    entityType: EntityType,
    filters: FlagFilters
  ): Promise<FlagSummary> {
    const supabase = await createClient();

    // Get all flags for this entity (with basic filters)
    let query = supabase
      .from('red_flags')
      .select('category, severity, status')
      .eq('entity_id', entityId)
      .eq('entity_type', entityType);

    // Apply same filters as main query (for consistency)
    if (filters.status && filters.status.length > 0) {
      query = query.in('status', filters.status);
    }
    if (filters.category && filters.category.length > 0) {
      query = query.in('category', filters.category);
    }
    if (filters.severity && filters.severity.length > 0) {
      query = query.in('severity', filters.severity);
    }

    const { data: flags } = await query;

    // Calculate summary
    const summary: FlagSummary = {
      total: flags?.length || 0,
      by_category: {
        financial: 0,
        legal: 0,
        operational: 0,
        cyber: 0,
        esg: 0,
      },
      by_severity: {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
      },
      by_status: {
        open: 0,
        reviewing: 0,
        mitigating: 0,
        resolved: 0,
        false_positive: 0,
      },
    };

    for (const flag of flags || []) {
      summary.by_category[flag.category as FlagCategory]++;
      summary.by_severity[flag.severity as FlagSeverity]++;
      summary.by_status[flag.status as FlagStatus]++;
    }

    return summary;
  }
}

/**
 * Singleton instance
 */
let redFlagServiceInstance: RedFlagService | null = null;

/**
 * Get red flag service instance
 */
export function getRedFlagService(): RedFlagService {
  if (!redFlagServiceInstance) {
    redFlagServiceInstance = new RedFlagService();
  }
  return redFlagServiceInstance;
}
