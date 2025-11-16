import { createClient } from '@/lib/supabase/server';
import {
  DatabaseError,
  NotFoundError,
  ConflictError,
} from './errors';
import type {
  CompetitiveAnalysis,
  CreateCompetitiveAnalysis,
  UpdateCompetitiveAnalysis,
  CompetitorCompany,
  CreateCompetitorCompany,
  CompetitiveAnalysisCompetitor,
  AddCompetitor,
  FeatureMatrixEntry,
  CreateFeatureMatrixEntry,
  FeatureParityScore,
  CreateFeatureParityScore,
  PricingComparison,
  CreatePricingComparison,
  MarketPositioning,
  CreateMarketPositioning,
  CompetitiveMoatScore,
  CreateCompetitiveMoatScore,
  IndustryRecognition,
  CreateIndustryRecognition,
  DataSourceCitation,
  CreateDataSourceCitation,
  AnalysisSnapshot,
  CreateAnalysisSnapshot,
  AnalysisAccessGrant,
  DashboardData,
} from './types';

export class CompetitiveAnalysisRepository {
  // ================================================================
  // COMPETITIVE ANALYSES
  // ================================================================

  async create(data: CreateCompetitiveAnalysis, userId: string): Promise<CompetitiveAnalysis> {
    const supabase = await createClient();

    const { data: analysis, error } = await supabase
      .from('competitive_analyses')
      .insert({
        ...data,
        created_by: userId,
      })
      .select()
      .single();

    if (error) {
      throw new DatabaseError('create analysis', error);
    }
    return analysis as CompetitiveAnalysis;
  }

  async findById(id: string): Promise<CompetitiveAnalysis | null> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('competitive_analyses')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw new DatabaseError('fetch analysis', error);
    }

    return data as CompetitiveAnalysis;
  }

  async findByUser(
    userId: string,
    options?: {
      status?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<{ analyses: CompetitiveAnalysis[]; total: number }> {
    const supabase = await createClient();

    let query = supabase
      .from('competitive_analyses')
      .select('*', { count: 'exact' })
      .is('deleted_at', null)
      .order('updated_at', { ascending: false });

    // Filter by status if provided
    if (options?.status) {
      query = query.eq('status', options.status);
    }

    // Apply pagination
    const limit = options?.limit || 20;
    const offset = options?.offset || 0;
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) throw new DatabaseError('fetch analyses', error);

    return {
      analyses: (data || []) as CompetitiveAnalysis[],
      total: count || 0,
    };
  }

  async update(id: string, data: UpdateCompetitiveAnalysis, userId: string): Promise<CompetitiveAnalysis> {
    const supabase = await createClient();

    const { data: updated, error } = await supabase
      .from('competitive_analyses')
      .update(data)
      .eq('id', id)
      .eq('created_by', userId)
      .select()
      .single();

    if (error) throw new DatabaseError('update analysis', error);
    return updated as CompetitiveAnalysis;
  }

  async softDelete(id: string, userId: string): Promise<void> {
    const supabase = await createClient();

    const { error } = await supabase
      .from('competitive_analyses')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('created_by', userId);

    if (error) throw new DatabaseError('delete analysis', error);
  }

  async updateLastViewed(id: string): Promise<void> {
    const supabase = await createClient();

    const { error } = await supabase
      .from('competitive_analyses')
      .update({ last_viewed_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw new DatabaseError('update last viewed', error);
  }

  async updateLastRefreshed(id: string): Promise<void> {
    const supabase = await createClient();

    const { error } = await supabase
      .from('competitive_analyses')
      .update({ last_refreshed_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw new DatabaseError('update last refreshed', error);
  }

  // ================================================================
  // COMPETITORS
  // ================================================================

  async findOrCreateCompetitor(data: CreateCompetitorCompany): Promise<CompetitorCompany> {
    const supabase = await createClient();

    // Try to find existing competitor
    const { data: existing, error: findError } = await supabase
      .from('competitor_companies')
      .select('*')
      .eq('name', data.name)
      .eq('website', data.website || '')
      .single();

    if (existing && !findError) {
      return existing as CompetitorCompany;
    }

    // Create new competitor
    const { data: created, error: createError } = await supabase
      .from('competitor_companies')
      .insert(data)
      .select()
      .single();

    if (createError) throw new DatabaseError('create competitor', createError);
    return created as CompetitorCompany;
  }

  async addCompetitor(
    analysisId: string,
    competitorData: AddCompetitor,
    userId: string
  ): Promise<CompetitiveAnalysisCompetitor> {
    const supabase = await createClient();

    // Find or create competitor company
    const competitor = await this.findOrCreateCompetitor({
      name: competitorData.competitor_name,
      website: competitorData.competitor_website,
    });

    // Add to analysis
    const { data, error } = await supabase
      .from('competitive_analysis_competitors')
      .insert({
        analysis_id: analysisId,
        competitor_id: competitor.id,
        added_by: userId,
        relationship_type: competitorData.relationship_type,
        threat_level: competitorData.threat_level,
        notes: competitorData.notes,
      })
      .select()
      .single();

    if (error) throw new DatabaseError('add competitor', error);
    return data as CompetitiveAnalysisCompetitor;
  }

  async removeCompetitor(analysisId: string, competitorId: string): Promise<void> {
    const supabase = await createClient();

    const { error } = await supabase
      .from('competitive_analysis_competitors')
      .delete()
      .eq('analysis_id', analysisId)
      .eq('competitor_id', competitorId);

    if (error) throw new DatabaseError('remove competitor', error);
  }

  async getCompetitors(analysisId: string): Promise<CompetitorCompany[]> {
    const supabase = await createClient();

    interface CompetitorJoin {
      competitor_companies: CompetitorCompany;
    }

    const { data, error } = await supabase
      .from('competitive_analysis_competitors')
      .select('competitor_companies(*)')
      .eq('analysis_id', analysisId);

    if (error) throw new DatabaseError('fetch competitors', error);
    return (data || []).map((item: CompetitorJoin) => item.competitor_companies);
  }

  // ================================================================
  // FEATURE MATRIX
  // ================================================================

  async createFeatureMatrixEntry(data: CreateFeatureMatrixEntry): Promise<FeatureMatrixEntry> {
    const supabase = await createClient();

    const { data: entry, error } = await supabase
      .from('feature_matrix_entries')
      .insert(data)
      .select()
      .single();

    if (error) throw new DatabaseError('create feature entry', error);
    return entry as FeatureMatrixEntry;
  }

  async getFeatureMatrix(analysisId: string): Promise<FeatureMatrixEntry[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('feature_matrix_entries')
      .select('*')
      .eq('analysis_id', analysisId)
      .order('feature_category')
      .order('feature_name');

    if (error) throw new DatabaseError('fetch feature matrix', error);
    return (data || []) as FeatureMatrixEntry[];
  }

  async updateFeatureMatrixEntry(id: string, possessed_by: Record<string, boolean>): Promise<void> {
    const supabase = await createClient();

    const { error } = await supabase
      .from('feature_matrix_entries')
      .update({ possessed_by })
      .eq('id', id);

    if (error) throw new DatabaseError('update feature entry', error);
  }

  // ================================================================
  // FEATURE PARITY SCORES
  // ================================================================

  async upsertParityScore(data: CreateFeatureParityScore): Promise<FeatureParityScore> {
    const supabase = await createClient();

    const { data: score, error } = await supabase
      .from('feature_parity_scores')
      .upsert(
        {
          ...data,
          last_calculated_at: new Date().toISOString(),
        },
        {
          onConflict: 'analysis_id,competitor_id',
        }
      )
      .select()
      .single();

    if (error) throw new DatabaseError('upsert parity score', error);
    return score as FeatureParityScore;
  }

  async getParityScores(analysisId: string): Promise<FeatureParityScore[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('feature_parity_scores')
      .select('*')
      .eq('analysis_id', analysisId)
      .order('parity_score', { ascending: false });

    if (error) throw new DatabaseError('fetch parity scores', error);
    return (data || []) as FeatureParityScore[];
  }

  // ================================================================
  // PRICING COMPARISONS
  // ================================================================

  async upsertPricingComparison(data: CreatePricingComparison): Promise<PricingComparison> {
    const supabase = await createClient();

    const { data: pricing, error } = await supabase
      .from('pricing_comparisons')
      .upsert(data, {
        onConflict: 'analysis_id,competitor_id',
      })
      .select()
      .single();

    if (error) throw new DatabaseError('upsert pricing comparison', error);
    return pricing as PricingComparison;
  }

  async getPricingComparisons(analysisId: string): Promise<PricingComparison[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('pricing_comparisons')
      .select('*')
      .eq('analysis_id', analysisId);

    if (error) throw new DatabaseError('fetch pricing comparisons', error);
    return (data || []) as PricingComparison[];
  }

  // ================================================================
  // MARKET POSITIONING
  // ================================================================

  async upsertMarketPositioning(data: CreateMarketPositioning): Promise<MarketPositioning> {
    const supabase = await createClient();

    const { data: positioning, error } = await supabase
      .from('market_positioning')
      .upsert(data, {
        onConflict: 'analysis_id,competitor_id',
      })
      .select()
      .single();

    if (error) throw new DatabaseError('upsert market positioning', error);
    return positioning as MarketPositioning;
  }

  async getMarketPositioning(analysisId: string): Promise<MarketPositioning[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('market_positioning')
      .select('*')
      .eq('analysis_id', analysisId);

    if (error) throw new DatabaseError('fetch market positioning', error);
    return (data || []) as MarketPositioning[];
  }

  // ================================================================
  // MOAT SCORES
  // ================================================================

  async upsertMoatScore(data: CreateCompetitiveMoatScore): Promise<CompetitiveMoatScore> {
    const supabase = await createClient();

    const { data: moat, error } = await supabase
      .from('competitive_moat_scores')
      .upsert(
        {
          ...data,
          last_calculated_at: new Date().toISOString(),
        },
        {
          onConflict: 'analysis_id',
        }
      )
      .select()
      .single();

    if (error) throw new DatabaseError('upsert moat score', error);
    return moat as CompetitiveMoatScore;
  }

  async getMoatScore(analysisId: string): Promise<CompetitiveMoatScore | null> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('competitive_moat_scores')
      .select('*')
      .eq('analysis_id', analysisId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new DatabaseError('fetch moat score', error);
    }

    return data as CompetitiveMoatScore;
  }

  // ================================================================
  // DATA SOURCE CITATIONS
  // ================================================================

  async createCitation(data: CreateDataSourceCitation): Promise<DataSourceCitation> {
    const supabase = await createClient();

    const { data: citation, error } = await supabase
      .from('data_source_citations')
      .insert(data)
      .select()
      .single();

    if (error) throw new DatabaseError('create citation', error);
    return citation as DataSourceCitation;
  }

  async getCitations(analysisId: string): Promise<DataSourceCitation[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('data_source_citations')
      .select('*')
      .eq('analysis_id', analysisId)
      .order('created_at', { ascending: false });

    if (error) throw new DatabaseError('fetch citations', error);
    return (data || []) as DataSourceCitation[];
  }

  // ================================================================
  // SNAPSHOTS
  // ================================================================

  async createSnapshot(data: CreateAnalysisSnapshot): Promise<AnalysisSnapshot> {
    const supabase = await createClient();

    const { data: snapshot, error } = await supabase
      .from('analysis_snapshots')
      .insert({
        ...data,
        snapshot_date: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw new DatabaseError('create snapshot', error);
    return snapshot as AnalysisSnapshot;
  }

  async getSnapshots(analysisId: string): Promise<AnalysisSnapshot[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('analysis_snapshots')
      .select('*')
      .eq('analysis_id', analysisId)
      .order('snapshot_date', { ascending: false });

    if (error) throw new DatabaseError('fetch snapshots', error);
    return (data || []) as AnalysisSnapshot[];
  }

  // ================================================================
  // ACCESS GRANTS (SHARING)
  // ================================================================

  async grantAccess(
    analysisId: string,
    userId: string,
    accessLevel: 'view' | 'edit',
    grantedBy: string,
    invitationMethod?: 'email' | 'user_selection',
    invitationEmail?: string
  ): Promise<AnalysisAccessGrant> {
    const supabase = await createClient();

    const { data: grant, error } = await supabase
      .from('analysis_access_grants')
      .insert({
        analysis_id: analysisId,
        user_id: userId,
        access_level: accessLevel,
        granted_by: grantedBy,
        invitation_method: invitationMethod,
        invitation_email: invitationEmail,
      })
      .select()
      .single();

    if (error) throw new DatabaseError('grant access', error);
    return grant as AnalysisAccessGrant;
  }

  async revokeAccess(grantId: string, revokedBy: string): Promise<void> {
    const supabase = await createClient();

    const { error } = await supabase
      .from('analysis_access_grants')
      .update({
        revoked_at: new Date().toISOString(),
        revoked_by: revokedBy,
      })
      .eq('id', grantId);

    if (error) throw new DatabaseError('revoke access', error);
  }

  async getAccessGrants(analysisId: string): Promise<AnalysisAccessGrant[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('analysis_access_grants')
      .select('*')
      .eq('analysis_id', analysisId)
      .is('revoked_at', null)
      .order('granted_at', { ascending: false });

    if (error) throw new DatabaseError('fetch access grants', error);
    return (data || []) as AnalysisAccessGrant[];
  }

  // ================================================================
  // DASHBOARD DATA (AGGREGATED)
  // ================================================================

  async getDashboardData(analysisId: string): Promise<DashboardData | null> {
    const startTime = Date.now();

    const analysis = await this.findById(analysisId);
    if (!analysis) return null;

    const [
      competitors,
      feature_parity_scores,
      feature_matrix,
      pricing_comparisons,
      market_positioning,
      moat_score,
    ] = await Promise.all([
      this.getCompetitors(analysisId),
      this.getParityScores(analysisId),
      this.getFeatureMatrix(analysisId),
      this.getPricingComparisons(analysisId),
      this.getMarketPositioning(analysisId),
      this.getMoatScore(analysisId),
    ]);

    // Performance monitoring
    const duration = Date.now() - startTime;
    if (duration > 100) {
      console.warn(
        `[CompetitiveAnalysis] Slow dashboard query: ${duration}ms for analysis ${analysisId}`
      );
    } else {
      console.log(
        `[CompetitiveAnalysis] Dashboard query completed in ${duration}ms for analysis ${analysisId}`
      );
    }

    return {
      analysis,
      competitors,
      feature_parity_scores,
      feature_matrix,
      pricing_comparisons,
      market_positioning,
      moat_score,
    };
  }

  // ================================================================
  // STALE DATA ALERTS
  // ================================================================

  async getStaleAnalyses(userId: string, thresholdDays: number = 30) {
    const supabase = await createClient();

    interface StaleAnalysisRow {
      id: string;
      title: string;
      last_refreshed_at: string | null;
    }

    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - thresholdDays);

    const { data, error } = await supabase
      .from('competitive_analyses')
      .select('id, title, last_refreshed_at')
      .eq('created_by', userId)
      .is('deleted_at', null)
      .or(`last_refreshed_at.is.null,last_refreshed_at.lt.${thresholdDate.toISOString()}`);

    if (error) throw new DatabaseError('fetch stale analyses', error);

    return (data || []).map((analysis: StaleAnalysisRow) => ({
      id: analysis.id,
      title: analysis.title,
      last_refreshed_at: analysis.last_refreshed_at,
      days_since_refresh: analysis.last_refreshed_at
        ? Math.floor((Date.now() - new Date(analysis.last_refreshed_at).getTime()) / (1000 * 60 * 60 * 24))
        : 999,
    }));
  }

  // ================================================================
  // ACCESS CONTROL
  // ================================================================

  async checkUserAccess(analysisId: string, userId: string): Promise<boolean> {
    const supabase = await createClient();

    // Check if user is owner
    const { data: analysis, error: analysisError } = await supabase
      .from('competitive_analyses')
      .select('created_by')
      .eq('id', analysisId)
      .is('deleted_at', null)
      .single();

    if (analysisError || !analysis) return false;
    if (analysis.created_by === userId) return true;

    // Check if user has granted access
    const { data: grant, error: grantError } = await supabase
      .from('analysis_access_grants')
      .select('id')
      .eq('analysis_id', analysisId)
      .eq('user_id', userId)
      .is('revoked_at', null)
      .single();

    if (grantError || !grant) return false;
    return true;
  }
}

// Export singleton instance
export const competitiveAnalysisRepository = new CompetitiveAnalysisRepository();
