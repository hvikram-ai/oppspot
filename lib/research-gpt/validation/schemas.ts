/**
 * Zod Validation Schemas for ResearchGPT™
 * Runtime validation for all types with helpful error messages
 */

import { z } from 'zod';

// ============================================================================
// ENUM SCHEMAS
// ============================================================================

export const reportStatusSchema = z.enum(['pending', 'generating', 'complete', 'partial', 'failed']);

export const sectionTypeSchema = z.enum([
  'snapshot',
  'buying_signals',
  'decision_makers',
  'revenue_signals',
  'recommended_approach',
  'sources',
]);

export const confidenceLevelSchema = z.enum(['high', 'medium', 'low']);

export const sourceTypeSchema = z.enum([
  'companies_house',
  'press_release',
  'news_article',
  'company_website',
  'job_posting',
  'linkedin',
  'financial_filing',
  'industry_report',
  'social_media',
]);

export const signalTypeSchema = z.enum([
  'hiring',
  'expansion',
  'leadership',
  'tech_change',
  'social_sentiment',
]);

export const signalPrioritySchema = z.enum(['high', 'medium', 'low']);

export const seniorityLevelSchema = z.enum(['C-level', 'VP', 'Director', 'Manager', 'IC']);

export const decisionInfluenceSchema = z.enum(['champion', 'influencer', 'blocker', 'neutral', 'unknown']);

export const timingUrgencySchema = z.enum(['immediate', 'within_week', 'within_month', 'monitor']);

export const userTierSchema = z.enum(['free', 'standard', 'premium']);

// ============================================================================
// DATABASE ENTITY SCHEMAS
// ============================================================================

export const researchReportSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  company_id: z.string().uuid(),
  company_name: z.string().min(1, 'Company name required'),
  company_number: z.string().nullable(),

  status: reportStatusSchema,
  confidence_score: z.number().min(0).max(1).nullable(),

  sections_complete: z.number().int().min(0).max(6),
  total_sources: z.number().int().min(0),

  generated_at: z.string().datetime().nullable(),
  cached_until: z.string().datetime().nullable(),

  metadata: z.record(z.unknown()),

  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const researchSectionSchema = z.object({
  id: z.string().uuid(),
  report_id: z.string().uuid(),
  section_type: sectionTypeSchema,

  content: z.record(z.unknown()), // Validated by section-specific schemas

  confidence: confidenceLevelSchema,
  sources_count: z.number().int().min(0),

  cached_at: z.string().datetime(),
  expires_at: z.string().datetime(),

  generation_time_ms: z.number().int().positive().nullable(),
  error_message: z.string().nullable(),

  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const sourceSchema = z.object({
  id: z.string().uuid().optional(),
  report_id: z.string().uuid().optional(),
  section_type: sectionTypeSchema.nullable().optional(),

  url: z.string().url('Invalid source URL'),
  title: z.string().min(1, 'Source title required'),
  published_date: z.string().datetime().nullable().optional(),
  accessed_date: z.string().datetime().optional(),

  source_type: sourceTypeSchema,
  reliability_score: z.number().min(0).max(1),

  domain: z.string().nullable().optional(),
  content_snippet: z.string().nullable().optional(),

  created_at: z.string().datetime().optional(),
});

export const userResearchQuotaSchema = z.object({
  user_id: z.string().uuid(),

  period_start: z.string().datetime(),
  period_end: z.string().datetime(),

  researches_used: z.number().int().min(0),
  researches_limit: z.number().int().positive(),

  tier: userTierSchema,

  notification_90_percent_sent: z.boolean(),
  notification_100_percent_sent: z.boolean(),

  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

// ============================================================================
// SECTION CONTENT SCHEMAS
// ============================================================================

export const techStackItemSchema = z.object({
  category: z.string(),
  technology: z.string(),
  detected_at: z.string().datetime(),
});

export const fundingRoundSchema = z.object({
  round_type: z.string(),
  amount: z.number().positive(),
  currency: z.string().length(3),
  announced_date: z.string().datetime(),
  investors: z.array(z.string()),
});

export const companySnapshotSchema = z.object({
  founded_year: z.number().int().min(1800).max(new Date().getFullYear()).nullable(),
  company_type: z.string().nullable(),
  company_status: z.string().nullable(),

  employee_count: z.number().int().min(0).nullable(),
  employee_growth_yoy: z.number().nullable(),
  employee_growth_trend: z.enum(['growing', 'stable', 'declining']).nullable(),

  revenue_estimate: z.object({
    amount: z.number().positive().nullable(),
    currency: z.string().length(3),
    confidence: confidenceLevelSchema,
    last_filed_accounts: z.object({
      date: z.string().datetime(),
      revenue: z.number(),
    }).optional(),
  }).nullable(),

  tech_stack: z.array(techStackItemSchema),
  funding_rounds: z.array(fundingRoundSchema),

  industry: z.string().nullable(),
  sic_codes: z.array(z.string()),
  headquarters: z.object({
    city: z.string().nullable(),
    country: z.string().nullable(),
    address: z.string().nullable(),
  }).nullable(),
});

// Buying Signal Detail Schemas
export const hiringSignalSchema = z.object({
  job_postings_count: z.number().int().min(0),
  departments: z.array(z.string()),
  seniority_levels: z.array(z.string()),
  job_titles: z.array(z.string()),
  posted_within_days: z.number().int().min(0),
});

export const expansionSignalSchema = z.object({
  expansion_type: z.enum(['new_office', 'market_entry', 'acquisition']),
  location: z.string(),
  announced_date: z.string().datetime(),
  press_release_url: z.string().url().nullable(),
});

export const leadershipSignalSchema = z.object({
  change_type: z.enum(['new_hire', 'promotion', 'departure']),
  person_name: z.string(),
  role: z.string(),
  department: z.string(),
  announced_date: z.string().datetime(),
});

export const techSignalSchema = z.object({
  technology: z.string(),
  change_type: z.enum(['adoption', 'migration', 'expansion']),
  detected_from: z.string(),
});

export const socialSentimentSignalSchema = z.object({
  platform: z.string(),
  sentiment: z.enum(['positive', 'neutral', 'negative']),
  mention_count: z.number().int().min(0),
  key_topics: z.array(z.string()),
});

export const buyingSignalSchema = z.object({
  signal_type: signalTypeSchema,
  priority: signalPrioritySchema,
  detected_date: z.string().datetime(),
  confidence: confidenceLevelSchema,
  description: z.string().min(10).max(500),
  source_url: z.string().url(),
  source_type: z.string(),

  details: z.union([
    hiringSignalSchema,
    expansionSignalSchema,
    leadershipSignalSchema,
    techSignalSchema,
    socialSentimentSignalSchema,
  ]),
});

// GDPR-compliant Decision Maker Schema
export const decisionMakerSchema = z.object({
  name: z.string().min(1),
  job_title: z.string().min(1),
  department: z.string(),
  seniority_level: seniorityLevelSchema,
  linkedin_url: z.string().url().nullable(),

  background_summary: z.string(),
  years_in_role: z.number().int().min(0).nullable(),
  previous_companies: z.array(z.string()),

  reports_to: z.string().nullable(),
  team_size: z.number().int().min(0).nullable(),

  decision_influence: decisionInfluenceSchema,
  influence_rationale: z.string(),

  // GDPR: Only business emails from official sources
  business_email: z.string().email().nullable()
    .refine(
      (email) => !email || !email.includes('@gmail.') && !email.includes('@yahoo.'),
      { message: 'Only business email addresses allowed (no personal emails)' }
    ),
  business_phone: z.string().nullable(),
  contact_source: z.string().min(1, 'Contact source attribution required for GDPR compliance'),
  contact_verified_date: z.string().datetime().nullable(),

  removal_requested: z.boolean(),
  removal_date: z.string().datetime().nullable(),
});

export const revenueSignalSchema = z.object({
  metric_type: z.enum(['customer_growth', 'revenue', 'profitability', 'market_share', 'competitive_position']),
  value: z.union([z.number(), z.string()]),
  unit: z.string(),
  time_period: z.string(),
  source: z.string(),
  source_url: z.string().url(),
  confidence_level: confidenceLevelSchema,
  published_date: z.string().datetime().nullable(),
});

export const conversationStarterSchema = z.object({
  opener: z.string().min(10),
  signal_reference: z.string(),
  value_proposition: z.string(),
});

export const recommendedApproachSchema = z.object({
  recommended_contact_id: z.string().uuid().nullable(),
  recommended_contact_name: z.string(),
  contact_rationale: z.string(),

  approach_summary: z.string().min(100).max(1000, 'Approach summary should be 2-3 paragraphs'),
  key_talking_points: z.array(z.string()).min(3).max(7),

  timing_suggestion: z.object({
    urgency: timingUrgencySchema,
    rationale: z.string(),
    optimal_time: z.string(),
  }),

  conversation_starters: z.array(conversationStarterSchema).min(2).max(5),

  reasoning: z.object({
    signals_considered: z.array(z.string()),
    decision_maker_factors: z.array(z.string()),
    risk_factors: z.array(z.string()),
  }),
});

export const sourcesListSchema = z.object({
  total_sources: z.number().int().min(10, 'At least 10 sources required (FR-030)'),
  sources: z.array(sourceSchema),
  sources_by_type: z.record(z.number()),
});

// ============================================================================
// API REQUEST/RESPONSE SCHEMAS
// ============================================================================

export const researchInitiatedResponseSchema = z.object({
  report_id: z.string().uuid(),
  status: z.enum(['pending', 'generating']),
  estimated_completion_seconds: z.number().int().positive(),
  poll_url: z.string().url(),
});

export const researchStatusResponseSchema = z.object({
  report_id: z.string().uuid(),
  status: reportStatusSchema,
  progress: z.object({
    current_step: z.string(),
    percent_complete: z.number().int().min(0).max(100),
    sections_complete: z.number().int().min(0).max(6),
  }),
  elapsed_time_ms: z.number().int().min(0),
});

export const researchReportResponseSchema = z.object({
  report_id: z.string().uuid(),
  company: z.object({
    id: z.string().uuid(),
    name: z.string(),
    company_number: z.string().nullable(),
  }),
  status: reportStatusSchema,
  confidence_score: z.number().min(0).max(1).nullable(),

  sections: z.object({
    snapshot: companySnapshotSchema.nullable(),
    buying_signals: z.array(buyingSignalSchema).nullable(),
    decision_makers: z.array(decisionMakerSchema).nullable(),
    revenue_signals: z.array(revenueSignalSchema).nullable(),
    recommended_approach: recommendedApproachSchema.nullable(),
    sources: sourcesListSchema.nullable(),
  }),

  metadata: z.object({
    generated_at: z.string().datetime(),
    cached_until: z.string().datetime(),
    generation_time_ms: z.number().int().positive(),
    cache_age: z.string(),
    can_refresh: z.boolean(),
  }),
});

export const quotaResponseSchema = z.object({
  user_id: z.string().uuid(),
  period_start: z.string().datetime(),
  period_end: z.string().datetime(),
  researches_used: z.number().int().min(0),
  researches_limit: z.number().int().positive(),
  researches_remaining: z.number().int().min(0),
  tier: userTierSchema,
});

export const quotaExceededResponseSchema = z.object({
  error: z.string(),
  quota: quotaResponseSchema,
  upgrade_url: z.string().url(),
});

export const researchReportSummarySchema = z.object({
  report_id: z.string().uuid(),
  company_name: z.string(),
  company_id: z.string().uuid(),
  status: reportStatusSchema,
  confidence_score: z.number().min(0).max(1).nullable(),
  generated_at: z.string().datetime(),
  sections_complete: z.number().int().min(0).max(6),
});

export const paginationSchema = z.object({
  page: z.number().int().positive(),
  limit: z.number().int().positive().max(100),
  total_pages: z.number().int().min(0),
  total_items: z.number().int().min(0),
});

export const researchHistoryResponseSchema = z.object({
  reports: z.array(researchReportSummarySchema),
  pagination: paginationSchema,
});

export const errorResponseSchema = z.object({
  error: z.string(),
  message: z.string(),
  details: z.record(z.unknown()).optional(),
});

// ============================================================================
// API REQUEST SCHEMAS (for validation of incoming requests)
// ============================================================================

export const generateResearchRequestSchema = z.object({
  focus_areas: z.array(sectionTypeSchema).optional(),
  user_context: z.string().max(500).optional(),
});

export const researchQueryParamsSchema = z.object({
  force_refresh: z.coerce.boolean().optional(),
});

export const historyQueryParamsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: reportStatusSchema.optional(),
});

// ============================================================================
// HELPER FUNCTIONS FOR VALIDATION
// ============================================================================

/**
 * Validate and parse data with Zod schema
 * Returns { success: true, data } or { success: false, error }
 */
export function validateData<T>(schema: z.ZodSchema<T>, data: unknown): {
  success: boolean;
  data?: T;
  error?: z.ZodError;
} {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  } else {
    return { success: false, error: result.error };
  }
}

/**
 * Format Zod validation errors for user-friendly display
 */
export function formatValidationErrors(error: z.ZodError): string[] {
  return error.errors.map((err: z.ZodIssue) => {
    const path = err.path.join('.');
    return `${path}: ${err.message}`;
  });
}

/**
 * Middleware helper for API route validation
 */
export function validateRequest<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): T {
  const result = schema.parse(data); // Throws ZodError if invalid
  return result;
}

// ============================================================================
// SECTION-SPECIFIC VALIDATORS
// ============================================================================

/**
 * Validate section content based on section type
 */
export function validateSectionContent(
  sectionType: string,
  content: unknown
): { valid: boolean; error?: string } {
  try {
    switch (sectionType) {
      case 'snapshot':
        companySnapshotSchema.parse(content);
        break;
      case 'buying_signals':
        z.array(buyingSignalSchema).parse(content);
        break;
      case 'decision_makers':
        z.array(decisionMakerSchema).parse(content);
        break;
      case 'revenue_signals':
        z.array(revenueSignalSchema).parse(content);
        break;
      case 'recommended_approach':
        recommendedApproachSchema.parse(content);
        break;
      case 'sources':
        sourcesListSchema.parse(content);
        break;
      default:
        return { valid: false, error: `Unknown section type: ${sectionType}` };
    }
    return { valid: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        valid: false,
        error: formatValidationErrors(error).join(', '),
      };
    }
    return { valid: false, error: 'Validation failed' };
  }
}

/**
 * Validate that decision maker email is business email (GDPR compliance)
 */
export function validateBusinessEmail(email: string | null): boolean {
  if (!email) return true; // Null is OK

  // Reject personal email providers
  const personalProviders = [
    'gmail.com',
    'yahoo.com',
    'hotmail.com',
    'outlook.com',
    'icloud.com',
    'aol.com',
  ];

  const domain = email.split('@')[1]?.toLowerCase();
  return !personalProviders.includes(domain);
}
