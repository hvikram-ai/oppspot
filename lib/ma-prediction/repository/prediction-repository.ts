/**
 * M&A Prediction Repository
 *
 * Handles all database operations for M&A predictions:
 * - Save/update predictions
 * - Retrieve active and historical predictions
 * - Save factors, valuations, acquirer profiles
 * - Audit trail logging
 * - Queue management
 *
 * Part of T021 implementation
 */

import { createClient } from '@/lib/supabase/server';
import type { MAPrediction, MAPredictionDetail, MAPredictionFactor, MAValuationEstimate, MAAcquirerProfile } from '@/lib/types/ma-prediction';

/**
 * Save a complete M&A prediction with all related data
 *
 * @param prediction - Core prediction data
 * @param factors - Top 5 contributing factors
 * @param valuation - Valuation estimate (optional, for Medium+ likelihood)
 * @param acquirerProfiles - Potential acquirer profiles (optional, for High+ likelihood)
 * @returns Saved prediction with ID
 */
export async function savePrediction(
  prediction: Omit<MAPrediction, 'id' | 'created_at' | 'updated_at'>,
  factors: Omit<MAPredictionFactor, 'id' | 'prediction_id' | 'created_at'>[],
  valuation: Omit<MAValuationEstimate, 'id' | 'prediction_id' | 'created_at'> | null,
  acquirerProfiles: Omit<MAAcquirerProfile, 'id' | 'prediction_id' | 'created_at'>[]
): Promise<MAPredictionDetail> {
  const supabase = await createClient();

  // Start transaction-like operation
  // Step 1: Deactivate existing active prediction for this company
  await supabase
    .from('ma_predictions')
    .update({ is_active: false })
    .eq('company_id', prediction.company_id)
    .eq('is_active', true);

  // Step 2: Insert new prediction
  const { data: savedPrediction, error: predictionError } = await supabase
    .from('ma_predictions')
    .insert({
      ...prediction,
      is_active: true
    })
    .select()
    .single();

  if (predictionError || !savedPrediction) {
    throw new Error(`Failed to save prediction: ${predictionError?.message}`);
  }

  const predictionId = savedPrediction.id;

  // Step 3: Insert factors
  if (factors.length > 0) {
    const factorsWithPredictionId = factors.map(factor => ({
      ...factor,
      prediction_id: predictionId
    }));

    const { error: factorsError } = await supabase
      .from('ma_prediction_factors')
      .insert(factorsWithPredictionId);

    if (factorsError) {
      console.error('Failed to save factors:', factorsError);
      // Non-fatal - continue
    }
  }

  // Step 4: Insert valuation if provided
  if (valuation) {
    const { error: valuationError } = await supabase
      .from('ma_valuation_estimates')
      .insert({
        ...valuation,
        prediction_id: predictionId
      });

    if (valuationError) {
      console.error('Failed to save valuation:', valuationError);
      // Non-fatal - continue
    }
  }

  // Step 5: Insert acquirer profiles if provided
  if (acquirerProfiles.length > 0) {
    const profilesWithPredictionId = acquirerProfiles.map(profile => ({
      ...profile,
      prediction_id: predictionId
    }));

    const { error: profilesError } = await supabase
      .from('ma_acquirer_profiles')
      .insert(profilesWithPredictionId);

    if (profilesError) {
      console.error('Failed to save acquirer profiles:', profilesError);
      // Non-fatal - continue
    }
  }

  // Step 6: Log to audit trail
  await logAuditTrail(predictionId, 'prediction_generated', {
    company_id: prediction.company_id,
    prediction_score: prediction.prediction_score,
    likelihood_category: prediction.likelihood_category
  });

  // Fetch and return complete prediction
  return await getActivePrediction(prediction.company_id);
}

/**
 * Get active (current) prediction for a company
 *
 * @param companyId - UUID of company
 * @returns Complete prediction with factors, valuation, acquirer profiles
 */
export async function getActivePrediction(companyId: string): Promise<MAPredictionDetail> {
  const supabase = await createClient();

  // Fetch active prediction
  const { data: prediction, error: predictionError } = await supabase
    .from('ma_predictions')
    .select('*')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .single();

  if (predictionError || !prediction) {
    throw new Error(`No active prediction found for company: ${predictionError?.message || 'Not found'}`);
  }

  const predictionId = prediction.id;

  // Fetch factors
  const { data: factors } = await supabase
    .from('ma_prediction_factors')
    .select('*')
    .eq('prediction_id', predictionId)
    .order('rank', { ascending: true });

  // Fetch valuation
  const { data: valuationArray } = await supabase
    .from('ma_valuation_estimates')
    .select('*')
    .eq('prediction_id', predictionId)
    .limit(1);

  const valuation = valuationArray && valuationArray.length > 0 ? valuationArray[0] : null;

  // Fetch acquirer profiles
  const { data: acquirerProfiles } = await supabase
    .from('ma_acquirer_profiles')
    .select('*')
    .eq('prediction_id', predictionId)
    .order('rank', { ascending: true });

  // Fetch company basic info
  const { data: company } = await supabase
    .from('businesses')
    .select('id, name, company_number')
    .eq('id', companyId)
    .single();

  return {
    ...(prediction as MAPrediction),
    factors: (factors || []) as MAPredictionFactor[],
    valuation: valuation as MAValuationEstimate | undefined,
    acquirer_profiles: (acquirerProfiles || []) as MAAcquirerProfile[],
    company: company || { id: companyId, name: 'Unknown', company_number: '' }
  };
}

/**
 * Get historical predictions for a company
 *
 * @param companyId - UUID of company
 * @param limit - Maximum number of predictions to return (default 10)
 * @returns Array of historical predictions
 */
export async function getHistoricalPredictions(
  companyId: string,
  limit: number = 10
): Promise<MAPrediction[]> {
  const supabase = await createClient();

  const { data: predictions, error } = await supabase
    .from('ma_predictions')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
    .limit(Math.min(limit, 100)); // Cap at 100

  if (error) {
    throw new Error(`Failed to fetch historical predictions: ${error.message}`);
  }

  return (predictions || []) as MAPrediction[];
}

/**
 * Add company to recalculation queue
 *
 * @param companyId - UUID of company
 * @param triggerType - What triggered the recalculation
 * @param metadata - Additional metadata
 */
export async function queueRecalculation(
  companyId: string,
  triggerType: 'data_update' | 'manual_request' | 'scheduled_batch',
  metadata?: Record<string, unknown>
): Promise<void> {
  const supabase = await createClient();

  // Insert into queue (ON CONFLICT DO NOTHING to avoid duplicates)
  const { error } = await supabase
    .from('ma_prediction_queue')
    .insert({
      company_id: companyId,
      trigger_type: triggerType,
      trigger_metadata: metadata || {},
      status: 'pending'
    });

  // Ignore conflict errors (company already queued)
  if (error && !error.message.includes('duplicate') && !error.message.includes('conflict')) {
    console.error('Failed to queue recalculation:', error);
  }
}

/**
 * Get next batch of companies from queue for processing
 *
 * @param batchSize - Number of companies to retrieve
 * @returns Array of company IDs to process
 */
export async function getQueuedCompanies(batchSize: number): Promise<string[]> {
  const supabase = await createClient();

  // Fetch pending jobs
  const { data: jobs, error } = await supabase
    .from('ma_prediction_queue')
    .select('id, company_id')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(batchSize);

  if (error || !jobs) {
    console.error('Failed to fetch queued companies:', error);
    return [];
  }

  // Mark as processing
  const jobIds = jobs.map(job => job.id);
  if (jobIds.length > 0) {
    await supabase
      .from('ma_prediction_queue')
      .update({ status: 'processing', started_at: new Date().toISOString() })
      .in('id', jobIds);
  }

  return jobs.map(job => job.company_id);
}

/**
 * Mark queue job as completed
 *
 * @param companyId - UUID of company
 */
export async function markQueueJobComplete(companyId: string): Promise<void> {
  const supabase = await createClient();

  await supabase
    .from('ma_prediction_queue')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString()
    })
    .eq('company_id', companyId)
    .in('status', ['pending', 'processing']);
}

/**
 * Mark queue job as failed
 *
 * @param companyId - UUID of company
 * @param errorMessage - Error details
 */
export async function markQueueJobFailed(companyId: string, errorMessage: string): Promise<void> {
  const supabase = await createClient();

  await supabase
    .from('ma_prediction_queue')
    .update({
      status: 'failed',
      error_message: errorMessage,
      completed_at: new Date().toISOString()
    })
    .eq('company_id', companyId)
    .in('status', ['pending', 'processing']);
}

/**
 * Log audit trail entry
 *
 * @param predictionId - UUID of prediction (optional)
 * @param eventType - Type of event
 * @param eventData - Event details
 */
export async function logAuditTrail(
  predictionId: string | null,
  eventType: string,
  eventData: Record<string, unknown>
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('ma_prediction_audit_log')
    .insert({
      prediction_id: predictionId,
      event_type: eventType,
      event_data: eventData
    });

  if (error) {
    console.error('Failed to log audit trail:', error);
    // Non-fatal - continue
  }
}

/**
 * Get queue status summary
 *
 * @returns Queue statistics
 */
export async function getQueueStatus(): Promise<{
  pending_count: number;
  processing_count: number;
  oldest_pending: string | null;
  average_processing_time_seconds: number;
}> {
  const supabase = await createClient();

  // Count pending
  const { count: pendingCount } = await supabase
    .from('ma_prediction_queue')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending');

  // Count processing
  const { count: processingCount } = await supabase
    .from('ma_prediction_queue')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'processing');

  // Oldest pending
  const { data: oldestPending } = await supabase
    .from('ma_prediction_queue')
    .select('created_at')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(1)
    .single();

  // Average processing time (from completed jobs in last 24 hours)
  const oneDayAgo = new Date();
  oneDayAgo.setDate(oneDayAgo.getDate() - 1);

  const { data: recentCompleted } = await supabase
    .from('ma_prediction_queue')
    .select('started_at, completed_at')
    .eq('status', 'completed')
    .gte('completed_at', oneDayAgo.toISOString())
    .not('started_at', 'is', null);

  let avgProcessingTime = 0;
  if (recentCompleted && recentCompleted.length > 0) {
    const durations = recentCompleted.map(job => {
      const start = new Date(job.started_at!).getTime();
      const end = new Date(job.completed_at!).getTime();
      return (end - start) / 1000; // seconds
    });
    avgProcessingTime = durations.reduce((sum, d) => sum + d, 0) / durations.length;
  }

  return {
    pending_count: pendingCount || 0,
    processing_count: processingCount || 0,
    oldest_pending: oldestPending?.created_at || null,
    average_processing_time_seconds: Math.round(avgProcessingTime * 10) / 10
  };
}
