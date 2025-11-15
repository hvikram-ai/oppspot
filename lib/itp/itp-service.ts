/**
 * ITP Service Layer
 *
 * Handles CRUD operations and business logic for Ideal Target Profiles.
 * Includes matching, tagging, and statistics.
 */

import { createClient } from '@/lib/supabase/server';
import { itpScoringEngine } from './scoring-engine';
import type {
  IdealTargetProfile,
  CreateITPRequest,
  UpdateITPRequest,
  ITPMatch,
  ITPMatchResult,
  ITPMatchStats,
  RunMatchingResponse,
  ScoringWeights,
} from '@/types/itp';
import type { Business } from '@/types/database';
import { DEFAULT_SCORING_WEIGHTS, DEFAULT_MIN_MATCH_SCORE } from '@/types/itp';

export class ITPService {
  // ============================================================================
  // CRUD OPERATIONS
  // ============================================================================

  /**
   * Create a new ITP
   */
  async createITP(
    userId: string,
    data: CreateITPRequest
  ): Promise<IdealTargetProfile> {
    const supabase = await createClient();

    const itpData = {
      user_id: userId,
      name: data.name,
      description: data.description,
      criteria: data.criteria,
      scoring_weights: data.scoring_weights || DEFAULT_SCORING_WEIGHTS,
      min_match_score: data.min_match_score || DEFAULT_MIN_MATCH_SCORE,
      auto_tag: data.auto_tag,
      auto_add_to_list_id: data.auto_add_to_list_id,
    };

    const { data: itp, error } = await supabase
      .from('ideal_target_profiles')
      .insert(itpData)
      .select()
      .single();

    if (error) {
      console.error('[ITP Service] Create error:', error);
      throw new Error(`Failed to create ITP: ${error.message}`);
    }

    return itp;
  }

  /**
   * Get user's ITPs
   */
  async getITPs(
    userId: string,
    options?: {
      is_active?: boolean;
      is_favorite?: boolean;
      limit?: number;
      offset?: number;
    }
  ): Promise<{ itps: IdealTargetProfile[]; total: number }> {
    const supabase = await createClient();

    let query = supabase
      .from('ideal_target_profiles')
      .select('*', { count: 'exact' })
      .eq('user_id', userId);

    if (options?.is_active !== undefined) {
      query = query.eq('is_active', options.is_active);
    }

    if (options?.is_favorite) {
      query = query.eq('is_favorite', true);
    }

    query = query.order('created_at', { ascending: false });

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.range(
        options.offset,
        options.offset + (options.limit || 20) - 1
      );
    }

    const { data: itps, error, count } = await query;

    if (error) {
      console.error('[ITP Service] Get ITPs error:', error);
      throw new Error(`Failed to fetch ITPs: ${error.message}`);
    }

    return {
      itps: itps || [],
      total: count || 0,
    };
  }

  /**
   * Get single ITP by ID
   */
  async getITP(userId: string, itpId: string): Promise<IdealTargetProfile> {
    const supabase = await createClient();

    const { data: itp, error } = await supabase
      .from('ideal_target_profiles')
      .select('*')
      .eq('id', itpId)
      .eq('user_id', userId)
      .single();

    if (error || !itp) {
      throw new Error('ITP not found');
    }

    return itp;
  }

  /**
   * Update an ITP
   */
  async updateITP(
    userId: string,
    itpId: string,
    updates: UpdateITPRequest
  ): Promise<IdealTargetProfile> {
    const supabase = await createClient();

    const { data: itp, error } = await supabase
      .from('ideal_target_profiles')
      .update(updates)
      .eq('id', itpId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('[ITP Service] Update error:', error);
      throw new Error(`Failed to update ITP: ${error.message}`);
    }

    return itp;
  }

  /**
   * Delete an ITP (cascade deletes matches)
   */
  async deleteITP(userId: string, itpId: string): Promise<void> {
    const supabase = await createClient();

    const { error } = await supabase
      .from('ideal_target_profiles')
      .delete()
      .eq('id', itpId)
      .eq('user_id', userId);

    if (error) {
      console.error('[ITP Service] Delete error:', error);
      throw new Error(`Failed to delete ITP: ${error.message}`);
    }
  }

  /**
   * Toggle favorite status
   */
  async toggleFavorite(
    userId: string,
    itpId: string
  ): Promise<IdealTargetProfile> {
    const supabase = await createClient();

    // Get current state
    const itp = await this.getITP(userId, itpId);

    // Toggle
    return this.updateITP(userId, itpId, {
      is_favorite: !itp.is_favorite,
    });
  }

  // ============================================================================
  // MATCHING OPERATIONS
  // ============================================================================

  /**
   * Run ITP matching against businesses
   */
  async runMatching(
    userId: string,
    itpId: string,
    options?: {
      business_ids?: string[];
      force_rematch?: boolean;
      limit?: number;
    }
  ): Promise<RunMatchingResponse> {
    const startTime = Date.now();
    const supabase = await createClient();

    // Get ITP
    const itp = await this.getITP(userId, itpId);

    if (!itp.is_active) {
      throw new Error('ITP is not active');
    }

    // Get businesses to match
    let query = supabase.from('businesses').select('*');

    if (options?.business_ids && options.business_ids.length > 0) {
      query = query.in('id', options.business_ids);
    } else {
      // Match against active businesses only
      query = query.eq('is_active', true);

      // Limit to prevent timeout
      query = query.limit(options?.limit || 100);
    }

    const { data: businesses, error: businessError } = await query;

    if (businessError) {
      throw new Error(`Failed to fetch businesses: ${businessError.message}`);
    }

    if (!businesses || businesses.length === 0) {
      return {
        itp_id: itpId,
        new_matches: 0,
        total_matches: 0,
        execution_time_ms: Date.now() - startTime,
      };
    }

    // Score each business
    const matches: ITPMatch[] = [];
    let highestScore = 0;

    for (const business of businesses) {
      const { score, details } = itpScoringEngine.calculateMatchScore(
        business,
        itp.criteria,
        itp.scoring_weights
      );

      // Only create match if score meets threshold
      if (score >= itp.min_match_score) {
        matches.push({
          id: crypto.randomUUID(),
          itp_id: itpId,
          business_id: business.id,
          match_score: score,
          matching_details: details,
          user_action: 'pending',
          matched_at: new Date().toISOString(),
        });

        if (score > highestScore) {
          highestScore = score;
        }
      }
    }

    // Save matches (upsert to handle re-matching)
    let newMatchesCount = 0;
    if (matches.length > 0) {
      const { error: matchError, count } = await supabase
        .from('itp_matches')
        .upsert(matches, {
          onConflict: 'itp_id,business_id',
          ignoreDuplicates: !options?.force_rematch,
        })
        .select('id', { count: 'exact', head: true });

      if (matchError) {
        console.error('[ITP Service] Save matches error:', matchError);
        throw new Error(`Failed to save matches: ${matchError.message}`);
      }

      newMatchesCount = count || matches.length;

      // Auto-tag if configured
      if (itp.auto_tag && newMatchesCount > 0) {
        await this.autoTagMatches(
          userId,
          matches.map((m) => m.business_id),
          itp.auto_tag,
          itpId
        );
      }

      // Auto-add to list if configured
      if (itp.auto_add_to_list_id && newMatchesCount > 0) {
        await this.autoAddToList(
          userId,
          matches.map((m) => m.business_id),
          itp.auto_add_to_list_id
        );
      }
    }

    // Update ITP execution stats
    await supabase.rpc('increment_itp_execution', {
      p_itp_id: itpId,
      p_new_matches: newMatchesCount,
    });

    const executionTime = Date.now() - startTime;

    return {
      itp_id: itpId,
      new_matches: newMatchesCount,
      total_matches: matches.length,
      execution_time_ms: executionTime,
      highest_score: highestScore > 0 ? highestScore : undefined,
    };
  }

  /**
   * Get matches for an ITP
   */
  async getMatches(
    userId: string,
    itpId: string,
    options?: {
      min_score?: number;
      max_score?: number;
      user_action?: 'accepted' | 'rejected' | 'pending';
      limit?: number;
      offset?: number;
    }
  ): Promise<{ matches: ITPMatchResult[]; total: number }> {
    const supabase = await createClient();

    // Verify user owns this ITP
    await this.getITP(userId, itpId);

    // Build query
    let query = supabase
      .from('itp_matches')
      .select('*, business:businesses(*)', { count: 'exact' })
      .eq('itp_id', itpId);

    if (options?.min_score !== undefined) {
      query = query.gte('match_score', options.min_score);
    }

    if (options?.max_score !== undefined) {
      query = query.lte('match_score', options.max_score);
    }

    if (options?.user_action) {
      query = query.eq('user_action', options.user_action);
    }

    query = query.order('match_score', { ascending: false });

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.range(
        options.offset,
        options.offset + (options.limit || 20) - 1
      );
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('[ITP Service] Get matches error:', error);
      throw new Error(`Failed to fetch matches: ${error.message}`);
    }

    // Get ITP name
    const itp = await this.getITP(userId, itpId);

    const matches: ITPMatchResult[] = (data || []).map((row: any) => ({
      match: {
        id: row.id,
        itp_id: row.itp_id,
        business_id: row.business_id,
        match_score: row.match_score,
        matching_details: row.matching_details,
        user_action: row.user_action,
        user_notes: row.user_notes,
        action_taken_at: row.action_taken_at,
        matched_at: row.matched_at,
      },
      business: row.business,
      itp_name: itp.name,
    }));

    return {
      matches,
      total: count || 0,
    };
  }

  /**
   * Update match user action
   */
  async updateMatchAction(
    userId: string,
    matchId: string,
    action: 'accepted' | 'rejected' | 'pending',
    notes?: string
  ): Promise<ITPMatch> {
    const supabase = await createClient();

    // Get match and verify user owns the ITP
    const { data: match, error: fetchError } = await supabase
      .from('itp_matches')
      .select('itp_id')
      .eq('id', matchId)
      .single();

    if (fetchError || !match) {
      throw new Error('Match not found');
    }

    // Verify ownership through ITP
    await this.getITP(userId, match.itp_id);

    // Update match
    const { data: updatedMatch, error } = await supabase
      .from('itp_matches')
      .update({
        user_action: action,
        user_notes: notes,
        action_taken_at: new Date().toISOString(),
      })
      .eq('id', matchId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update match: ${error.message}`);
    }

    return updatedMatch;
  }

  /**
   * Get match statistics for an ITP
   */
  async getMatchStats(userId: string, itpId: string): Promise<ITPMatchStats> {
    const supabase = await createClient();

    // Verify ownership
    await this.getITP(userId, itpId);

    const { data, error } = await supabase.rpc('get_itp_match_stats', {
      p_itp_id: itpId,
    });

    if (error) {
      console.error('[ITP Service] Get stats error:', error);
      throw new Error(`Failed to fetch stats: ${error.message}`);
    }

    return data[0] || {
      total_matches: 0,
      pending_matches: 0,
      accepted_matches: 0,
      rejected_matches: 0,
      avg_match_score: 0,
      top_match_score: 0,
      recent_matches: 0,
    };
  }

  // ============================================================================
  // AUTO-ACTIONS
  // ============================================================================

  /**
   * Auto-tag businesses that match
   */
  private async autoTagMatches(
    userId: string,
    businessIds: string[],
    tagName: string,
    itpId: string
  ): Promise<void> {
    const supabase = await createClient();

    try {
      // Use the tag_business function for each business
      for (const businessId of businessIds) {
        await supabase.rpc('tag_business', {
          p_user_id: userId,
          p_business_id: businessId,
          p_tag_name: tagName,
          p_itp_id: itpId,
          p_notes: `Auto-tagged by ITP`,
        });
      }

      console.log(
        `[ITP Service] Auto-tagged ${businessIds.length} businesses with "${tagName}"`
      );
    } catch (error) {
      console.error('[ITP Service] Auto-tag error:', error);
      // Don't throw - tagging failure shouldn't break matching
    }
  }

  /**
   * Auto-add businesses to a list
   */
  private async autoAddToList(
    userId: string,
    businessIds: string[],
    listId: string
  ): Promise<void> {
    const supabase = await createClient();

    try {
      // Add businesses to saved_businesses table
      const items = businessIds.map((businessId) => ({
        user_id: userId,
        business_id: businessId,
        list_id: listId,
      }));

      await supabase.from('saved_businesses').upsert(items, {
        onConflict: 'user_id,business_id,list_id',
        ignoreDuplicates: true,
      });

      console.log(
        `[ITP Service] Auto-added ${businessIds.length} businesses to list ${listId}`
      );
    } catch (error) {
      console.error('[ITP Service] Auto-add to list error:', error);
      // Don't throw - list addition failure shouldn't break matching
    }
  }

  // ============================================================================
  // BATCH OPERATIONS
  // ============================================================================

  /**
   * Run all active ITPs for a user (for background job)
   */
  async runAllActiveITPs(
    userId: string,
    options?: { limit_per_itp?: number }
  ): Promise<{ itp_id: string; result: RunMatchingResponse }[]> {
    const { itps } = await this.getITPs(userId, { is_active: true });

    const results: { itp_id: string; result: RunMatchingResponse }[] = [];

    for (const itp of itps) {
      try {
        const result = await this.runMatching(userId, itp.id, {
          limit: options?.limit_per_itp || 100,
        });
        results.push({ itp_id: itp.id, result });
      } catch (error) {
        console.error(`[ITP Service] Failed to run ITP ${itp.id}:`, error);
      }
    }

    return results;
  }
}

/**
 * Singleton instance
 */
export const itpService = new ITPService();
