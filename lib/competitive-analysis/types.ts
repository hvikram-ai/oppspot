import { z } from 'zod';

// ================================================================
// COMPETITIVE ANALYSIS TYPES
// ================================================================

export const AnalysisStatusSchema = z.enum(['draft', 'in_progress', 'completed', 'archived']);
export type AnalysisStatus = z.infer<typeof AnalysisStatusSchema>;

export const DealStatusSchema = z.enum(['active', 'closed_acquired', 'closed_passed', 'abandoned']);
export type DealStatus = z.infer<typeof DealStatusSchema>;

export const CompetitiveAnalysisSchema = z.object({
  id: z.string().uuid(),
  created_by: z.string().uuid(),
  organization_id: z.string().uuid().nullable().optional(),
  target_company_id: z.string().uuid().nullable().optional(),
  target_company_name: z.string().min(1).max(255),
  target_company_website: z.string().url().nullable().optional(),
  title: z.string().min(1).max(255),
  description: z.string().nullable().optional(),
  market_segment: z.string().max(100).nullable().optional(),
  geography: z.string().max(100).nullable().optional(),
  status: AnalysisStatusSchema.default('draft'),
  deal_status: DealStatusSchema.default('active'),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  last_viewed_at: z.string().datetime().nullable().optional(),
  last_refreshed_at: z.string().datetime().nullable().optional(),
  archived_at: z.string().datetime().nullable().optional(),
  auto_archive_at: z.string().datetime().nullable().optional(),
  competitor_count: z.number().int().default(0),
  avg_feature_parity_score: z.number().nullable().optional(),
  overall_moat_score: z.number().nullable().optional(),
  deleted_at: z.string().datetime().nullable().optional(),
});

export type CompetitiveAnalysis = z.infer<typeof CompetitiveAnalysisSchema>;

export const CreateCompetitiveAnalysisSchema = CompetitiveAnalysisSchema.pick({
  target_company_name: true,
  target_company_website: true,
  title: true,
  description: true,
  market_segment: true,
  geography: true,
  target_company_id: true,
  organization_id: true,
}).refine(
  (data) => {
    // Additional validation: if website provided, ensure it's valid
    if (data.target_company_website) {
      try {
        new URL(data.target_company_website);
        return true;
      } catch {
        return false;
      }
    }
    return true;
  },
  {
    message: 'Invalid website URL format',
    path: ['target_company_website'],
  }
);

export type CreateCompetitiveAnalysis = z.infer<typeof CreateCompetitiveAnalysisSchema>;

export const UpdateCompetitiveAnalysisSchema = CompetitiveAnalysisSchema.partial().pick({
  title: true,
  description: true,
  market_segment: true,
  geography: true,
  status: true,
  deal_status: true,
});

export type UpdateCompetitiveAnalysis = z.infer<typeof UpdateCompetitiveAnalysisSchema>;

// ================================================================
// COMPETITOR COMPANY TYPES
// ================================================================

export const CompetitorCompanySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255),
  website: z.string().url().nullable().optional(),
  business_id: z.string().uuid().nullable().optional(),
  industry: z.string().max(100).nullable().optional(),
  company_size_band: z.string().max(50).nullable().optional(),
  headquarters_location: z.string().max(255).nullable().optional(),
  founded_year: z.number().int().nullable().optional(),
  employee_count_estimate: z.number().int().nullable().optional(),
  revenue_estimate: z.number().nullable().optional(),
  funding_total: z.number().nullable().optional(),
  primary_product: z.string().max(255).nullable().optional(),
  product_description: z.string().nullable().optional(),
  target_customer_segment: z.string().max(100).nullable().optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export type CompetitorCompany = z.infer<typeof CompetitorCompanySchema>;

export const CreateCompetitorCompanySchema = CompetitorCompanySchema.pick({
  name: true,
  website: true,
  business_id: true,
  industry: true,
  company_size_band: true,
  headquarters_location: true,
  founded_year: true,
  employee_count_estimate: true,
  revenue_estimate: true,
  funding_total: true,
  primary_product: true,
  product_description: true,
  target_customer_segment: true,
});

export type CreateCompetitorCompany = z.infer<typeof CreateCompetitorCompanySchema>;

// ================================================================
// COMPETITIVE ANALYSIS COMPETITORS (JUNCTION)
// ================================================================

export const RelationshipTypeSchema = z.enum(['direct_competitor', 'adjacent_market', 'potential_threat', 'substitute']);
export type RelationshipType = z.infer<typeof RelationshipTypeSchema>;

export const ThreatLevelSchema = z.enum(['low', 'medium', 'high', 'critical']);
export type ThreatLevel = z.infer<typeof ThreatLevelSchema>;

export const CompetitiveAnalysisCompetitorSchema = z.object({
  analysis_id: z.string().uuid(),
  competitor_id: z.string().uuid(),
  added_at: z.string().datetime(),
  added_by: z.string().uuid().nullable().optional(),
  relationship_type: RelationshipTypeSchema.default('direct_competitor'),
  threat_level: ThreatLevelSchema.nullable().optional(),
  notes: z.string().nullable().optional(),
});

export type CompetitiveAnalysisCompetitor = z.infer<typeof CompetitiveAnalysisCompetitorSchema>;

export const AddCompetitorSchema = z.object({
  competitor_name: z.string().min(1).max(255),
  competitor_website: z.string().url().nullable().optional(),
  relationship_type: RelationshipTypeSchema.default('direct_competitor'),
  threat_level: ThreatLevelSchema.nullable().optional(),
  notes: z.string().nullable().optional(),
});

export type AddCompetitor = z.infer<typeof AddCompetitorSchema>;

// ================================================================
// FEATURE MATRIX TYPES
// ================================================================

export const FeatureCategorySchema = z.enum(['core', 'integrations', 'enterprise', 'mobile', 'analytics', 'security', 'other']);
export type FeatureCategory = z.infer<typeof FeatureCategorySchema>;

export const FeatureMatrixEntrySchema = z.object({
  id: z.string().uuid(),
  analysis_id: z.string().uuid(),
  feature_name: z.string().min(1).max(255),
  feature_description: z.string().nullable().optional(),
  feature_category: FeatureCategorySchema,
  category_weight: z.number().default(0.40),
  possessed_by: z.record(z.string(), z.boolean()).default({}),
  source_type: z.string().max(50).nullable().optional(),
  source_citation_id: z.string().uuid().nullable().optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export type FeatureMatrixEntry = z.infer<typeof FeatureMatrixEntrySchema>;

export const CreateFeatureMatrixEntrySchema = FeatureMatrixEntrySchema.pick({
  analysis_id: true,
  feature_name: true,
  feature_description: true,
  feature_category: true,
  category_weight: true,
  possessed_by: true,
  source_type: true,
  source_citation_id: true,
});

export type CreateFeatureMatrixEntry = z.infer<typeof CreateFeatureMatrixEntrySchema>;

// ================================================================
// FEATURE PARITY SCORE TYPES
// ================================================================

export const ConfidenceLevelSchema = z.enum(['high', 'medium', 'low']);
export type ConfidenceLevel = z.infer<typeof ConfidenceLevelSchema>;

export const FeatureParityScoreSchema = z.object({
  id: z.string().uuid(),
  analysis_id: z.string().uuid(),
  competitor_id: z.string().uuid(),
  parity_score: z.number().min(0).max(100),
  overlap_score: z.number().nullable().optional(),
  differentiation_score: z.number().nullable().optional(),
  calculation_method: z.string().max(50).default('weighted_overlap_differentiation'),
  confidence_level: ConfidenceLevelSchema.nullable().optional(),
  last_calculated_at: z.string().datetime(),
  feature_counts: z.record(z.string(), z.number()).nullable().optional(),
});

export type FeatureParityScore = z.infer<typeof FeatureParityScoreSchema>;

export const CreateFeatureParityScoreSchema = FeatureParityScoreSchema.omit({
  id: true,
  last_calculated_at: true,
});

export type CreateFeatureParityScore = z.infer<typeof CreateFeatureParityScoreSchema>;

// ================================================================
// PRICING COMPARISON TYPES
// ================================================================

export const PricingPositioningSchema = z.enum(['premium', 'parity', 'discount']);
export type PricingPositioning = z.infer<typeof PricingPositioningSchema>;

export const PriceTierSchema = z.object({
  name: z.string(),
  price: z.number(),
  features: z.array(z.string()).optional(),
});

export type PriceTier = z.infer<typeof PriceTierSchema>;

export const PricingComparisonSchema = z.object({
  id: z.string().uuid(),
  analysis_id: z.string().uuid(),
  competitor_id: z.string().uuid(),
  pricing_model: z.string().max(50).nullable().optional(),
  billing_frequency: z.string().max(20).nullable().optional(),
  price_tiers: z.array(PriceTierSchema).nullable().optional(),
  representative_price: z.number().nullable().optional(),
  relative_positioning: PricingPositioningSchema.nullable().optional(),
  price_delta_percent: z.number().nullable().optional(),
  pricing_strategy_assessment: z.string().nullable().optional(),
  source_citation_id: z.string().uuid().nullable().optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export type PricingComparison = z.infer<typeof PricingComparisonSchema>;

export const CreatePricingComparisonSchema = PricingComparisonSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export type CreatePricingComparison = z.infer<typeof CreatePricingComparisonSchema>;

// ================================================================
// MARKET POSITIONING TYPES
// ================================================================

export const MarketPositioningSchema = z.object({
  id: z.string().uuid(),
  analysis_id: z.string().uuid(),
  competitor_id: z.string().uuid(),
  positioning_label: z.string().max(100).nullable().optional(),
  market_share_estimate: z.number().nullable().optional(),
  customer_segments: z.array(z.string()).nullable().optional(),
  geographic_presence: z.array(z.string()).nullable().optional(),
  differentiation_factors: z.array(z.string()).nullable().optional(),
  supporting_evidence: z.string().nullable().optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export type MarketPositioning = z.infer<typeof MarketPositioningSchema>;

export const CreateMarketPositioningSchema = MarketPositioningSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export type CreateMarketPositioning = z.infer<typeof CreateMarketPositioningSchema>;

// ================================================================
// COMPETITIVE MOAT SCORE TYPES
// ================================================================

export const CompetitiveMoatScoreSchema = z.object({
  id: z.string().uuid(),
  analysis_id: z.string().uuid(),
  moat_score: z.number().min(0).max(100),
  feature_differentiation_score: z.number().nullable().optional(),
  pricing_power_score: z.number().nullable().optional(),
  brand_recognition_score: z.number().nullable().optional(),
  customer_lock_in_score: z.number().nullable().optional(),
  network_effects_score: z.number().nullable().optional(),
  supporting_evidence: z.record(z.string(), z.unknown()).nullable().optional(),
  risk_factors: z.array(z.string()).nullable().optional(),
  last_calculated_at: z.string().datetime(),
  created_at: z.string().datetime(),
});

export type CompetitiveMoatScore = z.infer<typeof CompetitiveMoatScoreSchema>;

export const CreateCompetitiveMoatScoreSchema = CompetitiveMoatScoreSchema.omit({
  id: true,
  last_calculated_at: true,
  created_at: true,
});

export type CreateCompetitiveMoatScore = z.infer<typeof CreateCompetitiveMoatScoreSchema>;

// ================================================================
// INDUSTRY RECOGNITION TYPES
// ================================================================

export const IndustryRecognitionSchema = z.object({
  id: z.string().uuid(),
  competitor_id: z.string().uuid(),
  recognition_type: z.string().max(100).nullable().optional(),
  source: z.string().max(100).nullable().optional(),
  category: z.string().max(100).nullable().optional(),
  position: z.string().max(50).nullable().optional(),
  date_received: z.string().nullable().optional(),
  year: z.number().int().nullable().optional(),
  context_notes: z.string().nullable().optional(),
  url: z.string().url().nullable().optional(),
  created_at: z.string().datetime(),
});

export type IndustryRecognition = z.infer<typeof IndustryRecognitionSchema>;

export const CreateIndustryRecognitionSchema = IndustryRecognitionSchema.omit({
  id: true,
  created_at: true,
});

export type CreateIndustryRecognition = z.infer<typeof CreateIndustryRecognitionSchema>;

// ================================================================
// DATA SOURCE CITATION TYPES
// ================================================================

export const DataSourceCitationSchema = z.object({
  id: z.string().uuid(),
  analysis_id: z.string().uuid(),
  source_type: z.string().max(50),
  source_name: z.string().max(255).nullable().optional(),
  url: z.string().url().nullable().optional(),
  access_date: z.string(),
  confidence_level: ConfidenceLevelSchema.nullable().optional(),
  analyst_notes: z.string().nullable().optional(),
  entered_by: z.string().uuid().nullable().optional(),
  created_at: z.string().datetime(),
});

export type DataSourceCitation = z.infer<typeof DataSourceCitationSchema>;

export const CreateDataSourceCitationSchema = DataSourceCitationSchema.omit({
  id: true,
  created_at: true,
});

export type CreateDataSourceCitation = z.infer<typeof CreateDataSourceCitationSchema>;

// ================================================================
// ANALYSIS SNAPSHOT TYPES
// ================================================================

export const AnalysisSnapshotSchema = z.object({
  id: z.string().uuid(),
  analysis_id: z.string().uuid(),
  snapshot_data: z.record(z.string(), z.unknown()),
  snapshot_date: z.string().datetime(),
  snapshot_trigger: z.string().max(50).nullable().optional(),
  created_by: z.string().uuid().nullable().optional(),
  changes_summary: z.record(z.string(), z.unknown()).nullable().optional(),
  created_at: z.string().datetime(),
});

export type AnalysisSnapshot = z.infer<typeof AnalysisSnapshotSchema>;

export const CreateAnalysisSnapshotSchema = AnalysisSnapshotSchema.omit({
  id: true,
  snapshot_date: true,
  created_at: true,
});

export type CreateAnalysisSnapshot = z.infer<typeof CreateAnalysisSnapshotSchema>;

// ================================================================
// ANALYSIS ACCESS GRANT TYPES
// ================================================================

export const AccessLevelSchema = z.enum(['view', 'edit']);
export type AccessLevel = z.infer<typeof AccessLevelSchema>;

export const InvitationMethodSchema = z.enum(['email', 'user_selection']);
export type InvitationMethod = z.infer<typeof InvitationMethodSchema>;

export const AnalysisAccessGrantSchema = z.object({
  id: z.string().uuid(),
  analysis_id: z.string().uuid(),
  user_id: z.string().uuid(),
  access_level: AccessLevelSchema.default('view'),
  granted_by: z.string().uuid(),
  granted_at: z.string().datetime(),
  revoked_at: z.string().datetime().nullable().optional(),
  revoked_by: z.string().uuid().nullable().optional(),
  invitation_method: InvitationMethodSchema.nullable().optional(),
  invitation_email: z.string().email().nullable().optional(),
});

export type AnalysisAccessGrant = z.infer<typeof AnalysisAccessGrantSchema>;

export const CreateAnalysisAccessGrantSchema = z.object({
  user_email: z.string().email(),
  access_level: AccessLevelSchema.default('view'),
});

export type CreateAnalysisAccessGrant = z.infer<typeof CreateAnalysisAccessGrantSchema>;

// ================================================================
// DASHBOARD DATA TYPE (AGGREGATED)
// ================================================================

export const DashboardDataSchema = z.object({
  analysis: CompetitiveAnalysisSchema,
  competitors: z.array(CompetitorCompanySchema),
  feature_parity_scores: z.array(FeatureParityScoreSchema),
  feature_matrix: z.array(FeatureMatrixEntrySchema),
  pricing_comparisons: z.array(PricingComparisonSchema),
  market_positioning: z.array(MarketPositioningSchema),
  moat_score: CompetitiveMoatScoreSchema.nullable().optional(),
});

export type DashboardData = z.infer<typeof DashboardDataSchema>;

// ================================================================
// REFRESH RESPONSE TYPES
// ================================================================

export const RefreshResponseSchema = z.object({
  status: z.enum(['processing', 'completed', 'failed']),
  estimated_completion_seconds: z.number().optional(),
  message: z.string().optional(),
});

export type RefreshResponse = z.infer<typeof RefreshResponseSchema>;

// ================================================================
// STALE ALERT TYPES
// ================================================================

export const StaleAnalysisSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  last_refreshed_at: z.string().datetime().nullable(),
  days_since_refresh: z.number().int(),
});

export type StaleAnalysis = z.infer<typeof StaleAnalysisSchema>;

export const StaleAlertsResponseSchema = z.object({
  stale_analyses: z.array(StaleAnalysisSchema),
});

export type StaleAlertsResponse = z.infer<typeof StaleAlertsResponseSchema>;
