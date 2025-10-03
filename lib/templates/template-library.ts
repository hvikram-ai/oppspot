/**
 * Comprehensive Goal Template Library
 * Pre-built templates for common business use cases
 */

import { GoalTemplate, GoalCategory } from '@/types/streams'

export interface ExtendedGoalTemplate extends GoalTemplate {
  typical_timeline_days?: number
  difficulty_level?: 'beginner' | 'intermediate' | 'advanced'
  industries?: string[]
  success_stories?: Array<{
    company: string
    result: string
  }>
  example_criteria?: Record<string, any>
}

/**
 * SALES & MARKETING TEMPLATES
 */
export const SALES_MARKETING_TEMPLATES: ExtendedGoalTemplate[] = [
  {
    id: 'lead_generation',
    name: 'B2B Lead Generation',
    description: 'Generate qualified leads matching your ideal customer profile for sales outreach',
    category: 'acquisition',
    icon: '📈',
    typical_timeline_days: 14,
    difficulty_level: 'beginner',
    industries: ['SaaS', 'Technology', 'Professional Services'],
    default_criteria: {
      industry: [],
      revenue: { min: 1000000, max: 100000000 },
      employee_count: { min: 20, max: 1000 },
      location: [],
      tech_stack: [],
      job_postings: { min: 5 }
    },
    default_metrics: {
      companies_to_find: 100,
      min_quality_score: 3.5,
      required_signals: ['hiring', 'growth']
    },
    default_success_criteria: {
      min_qualified: 60,
      min_contacted: 30,
      meetings_scheduled: 10
    },
    suggested_agents: [
      { agent_type: 'opportunity_bot', role: 'primary', order: 1 },
      { agent_type: 'enrichment_agent', role: 'enrichment', order: 2 },
      { agent_type: 'scoring_agent', role: 'scoring', order: 3 }
    ],
    use_count: 0,
    avg_success_rate: null,
    avg_completion_days: null,
    is_public: true,
    created_by: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'customer_acquisition_saas',
    name: 'SaaS Customer Acquisition',
    description: 'Find companies actively seeking SaaS solutions in your category',
    category: 'acquisition',
    icon: '💻',
    typical_timeline_days: 21,
    difficulty_level: 'intermediate',
    industries: ['SaaS', 'Technology'],
    default_criteria: {
      industry: ['Technology', 'SaaS', 'Software'],
      signals: ['tool_adoption', 'integration_needs', 'budget_allocated'],
      pain_points: [],
      current_solutions: []
    },
    default_metrics: {
      companies_to_find: 75,
      min_quality_score: 4.0,
      top_targets: 20
    },
    default_success_criteria: {
      min_qualified: 50,
      demos_booked: 15,
      trials_started: 10
    },
    suggested_agents: [
      { agent_type: 'opportunity_bot', role: 'primary', order: 1 },
      { agent_type: 'research_gpt', role: 'enrichment', order: 2 }
    ],
    use_count: 0,
    avg_success_rate: null,
    avg_completion_days: null,
    is_public: true,
    created_by: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'market_research',
    name: 'Market Research & Analysis',
    description: 'Gather intelligence on market trends, competitors, and customer needs',
    category: 'research',
    icon: '🔬',
    typical_timeline_days: 30,
    difficulty_level: 'intermediate',
    industries: ['All'],
    default_criteria: {
      market_segment: '',
      geographic_focus: [],
      company_size: 'all',
      timeframe: 'current'
    },
    default_metrics: {
      companies_to_review: 200,
      insights_to_generate: 50,
      reports_to_create: 5
    },
    default_success_criteria: {
      market_size_validated: true,
      trends_identified: 10,
      competitive_analysis_complete: true
    },
    suggested_agents: [
      { agent_type: 'scout_agent', role: 'primary', order: 1 },
      { agent_type: 'research_gpt', role: 'enrichment', order: 2 }
    ],
    use_count: 0,
    avg_success_rate: null,
    avg_completion_days: null,
    is_public: true,
    created_by: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
]

/**
 * PRODUCT & PARTNERSHIPS TEMPLATES
 */
export const PRODUCT_PARTNERSHIP_TEMPLATES: ExtendedGoalTemplate[] = [
  {
    id: 'integration_partners',
    name: 'Find Integration Partners',
    description: 'Discover complementary products for strategic integrations',
    category: 'partnership',
    icon: '🔌',
    typical_timeline_days: 21,
    difficulty_level: 'intermediate',
    industries: ['SaaS', 'Technology', 'API Platforms'],
    default_criteria: {
      product_category: [],
      integration_type: ['API', 'webhook', 'native'],
      customer_overlap: { min: 30 },
      technology_compatibility: true
    },
    default_metrics: {
      partners_to_find: 40,
      integrations_to_build: 10,
      meetings_to_schedule: 15
    },
    default_success_criteria: {
      partnerships_initiated: 8,
      integrations_launched: 5,
      joint_customers: 10
    },
    suggested_agents: [
      { agent_type: 'opportunity_bot', role: 'primary', order: 1 },
      { agent_type: 'research_gpt', role: 'enrichment', order: 2 }
    ],
    use_count: 0,
    avg_success_rate: null,
    avg_completion_days: null,
    is_public: true,
    created_by: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'beta_testers',
    name: 'Recruit Beta Testers',
    description: 'Find ideal beta testers for product validation and feedback',
    category: 'research',
    icon: '🧪',
    typical_timeline_days: 14,
    difficulty_level: 'beginner',
    industries: ['All'],
    default_criteria: {
      target_persona: '',
      use_case_fit: true,
      feedback_quality: 'high',
      engagement_level: ['active', 'very_active']
    },
    default_metrics: {
      companies_to_find: 50,
      beta_testers: 20,
      feedback_sessions: 30
    },
    default_success_criteria: {
      testers_onboarded: 20,
      features_validated: 5,
      product_market_fit_score: 8
    },
    suggested_agents: [
      { agent_type: 'opportunity_bot', role: 'primary', order: 1 }
    ],
    use_count: 0,
    avg_success_rate: null,
    avg_completion_days: null,
    is_public: true,
    created_by: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'reseller_channel',
    name: 'Build Reseller Channel',
    description: 'Identify and recruit channel partners and resellers',
    category: 'partnership',
    icon: '🤝',
    typical_timeline_days: 45,
    difficulty_level: 'advanced',
    industries: ['SaaS', 'Technology', 'Manufacturing'],
    default_criteria: {
      geographic_coverage: [],
      existing_customer_base: { min: 100 },
      industry_expertise: [],
      channel_experience: true
    },
    default_metrics: {
      partners_to_find: 30,
      agreements_to_sign: 10,
      revenue_target: 500000
    },
    default_success_criteria: {
      partners_onboarded: 10,
      first_sale: true,
      channel_revenue: 100000
    },
    suggested_agents: [
      { agent_type: 'opportunity_bot', role: 'primary', order: 1 },
      { agent_type: 'research_gpt', role: 'enrichment', order: 2 }
    ],
    use_count: 0,
    avg_success_rate: null,
    avg_completion_days: null,
    is_public: true,
    created_by: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
]

/**
 * RECRUITING & TALENT TEMPLATES
 */
export const RECRUITING_TEMPLATES: ExtendedGoalTemplate[] = [
  {
    id: 'talent_acquisition',
    name: 'Talent Acquisition Pipeline',
    description: 'Source companies with great talent pools for recruitment outreach',
    category: 'acquisition',
    icon: '👥',
    typical_timeline_days: 21,
    difficulty_level: 'intermediate',
    industries: ['All'],
    default_criteria: {
      role_type: [],
      skills_required: [],
      experience_level: ['mid', 'senior'],
      location: [],
      company_stage: ['growth', 'mature']
    },
    default_metrics: {
      companies_to_find: 60,
      candidates_to_source: 100,
      interviews_to_conduct: 20
    },
    default_success_criteria: {
      candidates_sourced: 100,
      interviews_scheduled: 20,
      offers_made: 5
    },
    suggested_agents: [
      { agent_type: 'scout_agent', role: 'primary', order: 1 },
      { agent_type: 'research_gpt', role: 'enrichment', order: 2 }
    ],
    use_count: 0,
    avg_success_rate: null,
    avg_completion_days: null,
    is_public: true,
    created_by: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'executive_search',
    name: 'Executive Search',
    description: 'Find C-level executives and senior leadership candidates',
    category: 'acquisition',
    icon: '👔',
    typical_timeline_days: 60,
    difficulty_level: 'advanced',
    industries: ['All'],
    default_criteria: {
      executive_level: ['C-level', 'VP'],
      industry_experience: [],
      company_size_managed: { min: 100 },
      track_record: 'proven_success'
    },
    default_metrics: {
      companies_to_research: 100,
      candidates_to_identify: 30,
      meetings_to_conduct: 10
    },
    default_success_criteria: {
      candidates_presented: 10,
      final_interviews: 5,
      offer_accepted: 1
    },
    suggested_agents: [
      { agent_type: 'scout_agent', role: 'primary', order: 1 },
      { agent_type: 'research_gpt', role: 'enrichment', order: 2 }
    ],
    use_count: 0,
    avg_success_rate: null,
    avg_completion_days: null,
    is_public: true,
    created_by: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
]

/**
 * INVESTMENT & FUNDRAISING TEMPLATES
 */
export const INVESTMENT_TEMPLATES: ExtendedGoalTemplate[] = [
  {
    id: 'series_a_prospects',
    name: 'Series A Investment Targets',
    description: 'Identify Series A stage companies matching investment thesis',
    category: 'research',
    icon: '💰',
    typical_timeline_days: 30,
    difficulty_level: 'advanced',
    industries: ['Venture Capital', 'Private Equity'],
    default_criteria: {
      funding_stage: ['seed', 'series_a'],
      sector: [],
      revenue: { min: 1000000, max: 10000000 },
      growth_rate: { min: 100 },
      unit_economics: 'positive_trajectory'
    },
    default_metrics: {
      companies_to_review: 150,
      deep_dives: 30,
      term_sheets: 3
    },
    default_success_criteria: {
      due_diligence_completed: 20,
      partner_meetings: 10,
      investments_made: 2
    },
    suggested_agents: [
      { agent_type: 'scout_agent', role: 'primary', order: 1 },
      { agent_type: 'research_gpt', role: 'enrichment', order: 2 },
      { agent_type: 'scoring_agent', role: 'scoring', order: 3 }
    ],
    use_count: 0,
    avg_success_rate: null,
    avg_completion_days: null,
    is_public: true,
    created_by: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'angel_investors',
    name: 'Find Angel Investors',
    description: 'Discover angel investors aligned with your startup stage and sector',
    category: 'acquisition',
    icon: '👼',
    typical_timeline_days: 21,
    difficulty_level: 'intermediate',
    industries: ['Startups', 'Technology'],
    default_criteria: {
      investment_stage: ['pre_seed', 'seed'],
      sector_focus: [],
      check_size: { min: 25000, max: 250000 },
      geographic_focus: [],
      value_add: ['mentor', 'connections', 'expertise']
    },
    default_metrics: {
      investors_to_find: 50,
      meetings_to_secure: 20,
      commitments_to_get: 5
    },
    default_success_criteria: {
      pitch_meetings: 20,
      term_sheets: 3,
      round_closed: true
    },
    suggested_agents: [
      { agent_type: 'opportunity_bot', role: 'primary', order: 1 },
      { agent_type: 'research_gpt', role: 'enrichment', order: 2 }
    ],
    use_count: 0,
    avg_success_rate: null,
    avg_completion_days: null,
    is_public: true,
    created_by: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
]

/**
 * OPERATIONS & VENDOR TEMPLATES
 */
export const OPERATIONS_TEMPLATES: ExtendedGoalTemplate[] = [
  {
    id: 'vendor_discovery',
    name: 'Vendor & Supplier Discovery',
    description: 'Find reliable vendors and suppliers for your business needs',
    category: 'research',
    icon: '📦',
    typical_timeline_days: 14,
    difficulty_level: 'beginner',
    industries: ['All'],
    default_criteria: {
      vendor_type: [],
      location: [],
      certifications: [],
      capacity: { min_annual_volume: 0 },
      pricing_tier: 'competitive'
    },
    default_metrics: {
      vendors_to_find: 30,
      rfps_to_send: 10,
      contracts_to_negotiate: 3
    },
    default_success_criteria: {
      vendors_qualified: 15,
      contracts_signed: 3,
      cost_savings: 15
    },
    suggested_agents: [
      { agent_type: 'opportunity_bot', role: 'primary', order: 1 },
      { agent_type: 'scoring_agent', role: 'scoring', order: 2 }
    ],
    use_count: 0,
    avg_success_rate: null,
    avg_completion_days: null,
    is_public: true,
    created_by: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
]

/**
 * INDUSTRY-SPECIFIC TEMPLATES
 */
export const INDUSTRY_SPECIFIC_TEMPLATES: ExtendedGoalTemplate[] = [
  {
    id: 'healthcare_targets',
    name: 'Healthcare System Prospects',
    description: 'Target hospital systems and healthcare providers for medical solutions',
    category: 'acquisition',
    icon: '🏥',
    typical_timeline_days: 45,
    difficulty_level: 'advanced',
    industries: ['Healthcare', 'MedTech'],
    default_criteria: {
      facility_type: ['hospital', 'clinic', 'health_system'],
      bed_count: { min: 100 },
      geographic_region: [],
      technology_adoption: 'early_majority',
      regulatory_compliance: ['HIPAA']
    },
    default_metrics: {
      facilities_to_find: 40,
      decision_makers_to_contact: 60,
      pilots_to_launch: 5
    },
    default_success_criteria: {
      facilities_qualified: 25,
      pilots_launched: 5,
      contracts_signed: 2
    },
    suggested_agents: [
      { agent_type: 'opportunity_bot', role: 'primary', order: 1 },
      { agent_type: 'research_gpt', role: 'enrichment', order: 2 }
    ],
    use_count: 0,
    avg_success_rate: null,
    avg_completion_days: null,
    is_public: true,
    created_by: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'fintech_banking_partners',
    name: 'Banking & Financial Partners',
    description: 'Find banking partners and financial institutions for FinTech collaboration',
    category: 'partnership',
    icon: '🏦',
    typical_timeline_days: 60,
    difficulty_level: 'advanced',
    industries: ['FinTech', 'Financial Services'],
    default_criteria: {
      institution_type: ['bank', 'credit_union', 'neobank'],
      asset_size: { min: 500000000 },
      innovation_focus: true,
      regulatory_region: [],
      api_availability: true
    },
    default_metrics: {
      institutions_to_find: 30,
      partnerships_to_establish: 5,
      integration_launches: 3
    },
    default_success_criteria: {
      partnerships_signed: 5,
      integrations_live: 3,
      customers_onboarded: 1000
    },
    suggested_agents: [
      { agent_type: 'opportunity_bot', role: 'primary', order: 1 },
      { agent_type: 'research_gpt', role: 'enrichment', order: 2 }
    ],
    use_count: 0,
    avg_success_rate: null,
    avg_completion_days: null,
    is_public: true,
    created_by: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'ecommerce_retail_partners',
    name: 'E-Commerce & Retail Partners',
    description: 'Discover retail partners and distributors for product placement',
    category: 'partnership',
    icon: '🛒',
    typical_timeline_days: 30,
    difficulty_level: 'intermediate',
    industries: ['E-Commerce', 'Retail', 'Consumer Goods'],
    default_criteria: {
      retailer_type: ['online', 'omnichannel', 'marketplace'],
      monthly_visitors: { min: 100000 },
      product_categories: [],
      geographic_reach: [],
      commission_model: 'negotiable'
    },
    default_metrics: {
      retailers_to_find: 40,
      partnerships_to_establish: 15,
      skus_listed: 50
    },
    default_success_criteria: {
      partnerships_signed: 15,
      products_live: 30,
      monthly_revenue: 50000
    },
    suggested_agents: [
      { agent_type: 'opportunity_bot', role: 'primary', order: 1 }
    ],
    use_count: 0,
    avg_success_rate: null,
    avg_completion_days: null,
    is_public: true,
    created_by: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
]

/**
 * Get all templates organized by category
 */
export const ALL_TEMPLATES: ExtendedGoalTemplate[] = [
  ...SALES_MARKETING_TEMPLATES,
  ...PRODUCT_PARTNERSHIP_TEMPLATES,
  ...RECRUITING_TEMPLATES,
  ...INVESTMENT_TEMPLATES,
  ...OPERATIONS_TEMPLATES,
  ...INDUSTRY_SPECIFIC_TEMPLATES
]

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: GoalCategory): ExtendedGoalTemplate[] {
  return ALL_TEMPLATES.filter(t => t.category === category)
}

/**
 * Get templates by industry
 */
export function getTemplatesByIndustry(industry: string): ExtendedGoalTemplate[] {
  return ALL_TEMPLATES.filter(t =>
    t.industries?.includes(industry) || t.industries?.includes('All')
  )
}

/**
 * Get templates by difficulty
 */
export function getTemplatesByDifficulty(level: 'beginner' | 'intermediate' | 'advanced'): ExtendedGoalTemplate[] {
  return ALL_TEMPLATES.filter(t => t.difficulty_level === level)
}

/**
 * Search templates
 */
export function searchTemplates(query: string): ExtendedGoalTemplate[] {
  const lowerQuery = query.toLowerCase()
  return ALL_TEMPLATES.filter(t =>
    t.name.toLowerCase().includes(lowerQuery) ||
    t.description.toLowerCase().includes(lowerQuery) ||
    t.industries?.some(i => i.toLowerCase().includes(lowerQuery))
  )
}
