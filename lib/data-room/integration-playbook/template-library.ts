/**
 * Integration Playbook Template Library
 * Pre-built templates for common M&A scenarios
 */

import type {
  PlaybookTemplate,
  IntegrationPhase,
  IntegrationWorkstream,
  IntegrationActivity,
  IntegrationDay1ChecklistItem,
  IntegrationSynergy,
  IntegrationRisk,
  IntegrationKPI,
  DealType,
} from '@/lib/data-room/types';

/**
 * Default Tech Acquisition Template
 * For acquiring technology companies
 */
export const TECH_ACQUISITION_TEMPLATE: PlaybookTemplate = {
  id: 'tech-acquisition-default',
  template_name: 'Tech Company Acquisition',
  deal_type: 'acquisition',
  industry: 'technology',

  phases: [
    {
      phase_name: 'Day 1-30: Foundation & Stabilization',
      phase_type: 'day_1_30',
      phase_order: 1,
      phase_description: 'Establish integration governance, ensure business continuity, and execute Day 1 communications',
      objectives: [
        'Ensure zero operational disruption on Day 1',
        'Establish integration management office (IMO)',
        'Execute comprehensive communication plan',
        'Identify and secure key talent',
        'Achieve 3-5 quick wins for momentum',
      ],
      success_criteria: [
        'All critical systems operational',
        '95%+ employee awareness of deal',
        'IMO fully staffed with clear governance',
        'Key customer relationships maintained',
        'Quick wins identified and in progress',
      ],
      duration_days: 30,
    },
    {
      phase_name: 'Day 31-60: Integration & Consolidation',
      phase_type: 'day_31_60',
      phase_order: 2,
      phase_description: 'Consolidate IT systems, standardize processes, and execute cost synergies',
      objectives: [
        'Consolidate IT infrastructure and systems',
        'Standardize key business processes',
        'Execute immediate cost synergies',
        'Integrate product roadmaps',
        'Maintain 95%+ retention of critical employees',
      ],
      success_criteria: [
        'IT integration plan finalized and approved',
        '60%+ of cost synergies captured',
        'Critical employee retention above 95%',
        'Customer satisfaction maintained or improved',
        'Product roadmap integration complete',
      ],
      duration_days: 30,
    },
    {
      phase_name: 'Day 61-100: Optimization & Synergy Capture',
      phase_type: 'day_61_100',
      phase_order: 3,
      phase_description: 'Optimize combined operations, capture revenue synergies, and measure success',
      objectives: [
        'Launch cross-sell and upsell initiatives',
        'Optimize combined go-to-market strategy',
        'Realize planned synergies',
        'Complete cultural integration',
        'Achieve integration KPI targets',
      ],
      success_criteria: [
        '80%+ of planned synergies realized',
        'Revenue from cross-sell initiatives launched',
        'Customer retention above 97%',
        'Employee engagement scores normalized',
        'Integration milestones achieved',
      ],
      duration_days: 40,
    },
    {
      phase_name: 'Day 100+: Long-term Value Creation',
      phase_type: 'post_100',
      phase_order: 4,
      phase_description: 'Transition to business-as-usual and focus on long-term value creation',
      objectives: [
        'Transition to BAU operations',
        'Optimize for long-term growth',
        'Continuous improvement initiatives',
        'Post-integration review and lessons learned',
      ],
      success_criteria: [
        'All integration activities complete',
        'Synergy targets achieved or on track',
        'Organization operating as one company',
        'Long-term strategic initiatives launched',
      ],
    },
  ],

  workstreams: [
    {
      workstream_name: 'IT Systems Integration',
      workstream_description: 'Consolidate technology infrastructure, migrate systems, and ensure cybersecurity',
      objectives: [
        'Consolidate IT infrastructure',
        'Migrate critical systems',
        'Ensure cybersecurity compliance',
        'Standardize development practices',
      ],
      key_deliverables: [
        'IT integration roadmap',
        'System migration plan',
        'Cybersecurity assessment',
        'Tech stack consolidation plan',
      ],
    },
    {
      workstream_name: 'HR & Organizational Design',
      workstream_description: 'Integrate teams, harmonize benefits, and manage organizational change',
      objectives: [
        'Finalize organizational structure',
        'Execute retention strategy',
        'Harmonize compensation and benefits',
        'Drive cultural integration',
      ],
      key_deliverables: [
        'Org design',
        'Retention plan',
        'Benefits harmonization',
        'Change management plan',
      ],
    },
    {
      workstream_name: 'Finance & Accounting',
      workstream_description: 'Integrate financial systems, consolidate reporting, and ensure compliance',
      objectives: [
        'Integrate accounting systems',
        'Consolidate financial reporting',
        'Ensure regulatory compliance',
        'Synergy tracking',
      ],
      key_deliverables: [
        'Chart of accounts mapping',
        'Consolidated reporting',
        'Compliance matrix',
        'Synergy tracker',
      ],
    },
    {
      workstream_name: 'Operations & Product',
      workstream_description: 'Integrate product development, consolidate operations, and optimize workflows',
      objectives: [
        'Integrate product roadmaps',
        'Consolidate R&D efforts',
        'Optimize operations',
        'Maintain product quality',
      ],
      key_deliverables: [
        'Integrated product roadmap',
        'R&D consolidation plan',
        'Operations playbook',
        'Quality standards',
      ],
    },
    {
      workstream_name: 'Commercial & Customer Success',
      workstream_description: 'Integrate sales teams, consolidate customer success, and drive cross-sell',
      objectives: [
        'Integrate sales organizations',
        'Consolidate customer success',
        'Execute cross-sell strategy',
        'Maintain customer satisfaction',
      ],
      key_deliverables: [
        'Sales integration plan',
        'Customer transition plan',
        'Cross-sell playbook',
        'Customer retention program',
      ],
    },
  ],

  activities: [], // Generated dynamically

  day1_checklist: [
    {
      checklist_item: 'Legal closing documents signed and filed',
      category: 'legal',
      is_critical: true,
      responsible_party: 'buyer',
      item_order: 1,
      status: 'pending',
    },
    {
      checklist_item: 'Employee announcement email sent',
      category: 'communications',
      is_critical: true,
      responsible_party: 'buyer',
      item_order: 2,
      status: 'pending',
    },
    {
      checklist_item: 'Customer notification letters sent',
      category: 'communications',
      is_critical: true,
      responsible_party: 'buyer',
      item_order: 3,
      status: 'pending',
    },
    {
      checklist_item: 'Press release issued',
      category: 'communications',
      is_critical: false,
      responsible_party: 'buyer',
      item_order: 4,
      status: 'pending',
    },
    {
      checklist_item: 'IT systems access granted to integration team',
      category: 'IT',
      is_critical: true,
      responsible_party: 'seller',
      item_order: 5,
      status: 'pending',
    },
    {
      checklist_item: 'Email systems configured for new employees',
      category: 'IT',
      is_critical: true,
      responsible_party: 'buyer',
      item_order: 6,
      status: 'pending',
    },
    {
      checklist_item: 'VPN and network access provisioned',
      category: 'IT',
      is_critical: true,
      responsible_party: 'buyer',
      item_order: 7,
      status: 'pending',
    },
    {
      checklist_item: 'HR onboarding packets distributed',
      category: 'HR',
      is_critical: true,
      responsible_party: 'buyer',
      item_order: 8,
      status: 'pending',
    },
    {
      checklist_item: 'Benefit enrollment initiated',
      category: 'HR',
      is_critical: false,
      responsible_party: 'buyer',
      item_order: 9,
      status: 'pending',
    },
    {
      checklist_item: 'Payroll systems configured',
      category: 'HR',
      is_critical: true,
      responsible_party: 'buyer',
      item_order: 10,
      status: 'pending',
    },
    {
      checklist_item: 'Bank accounts and payment systems updated',
      category: 'finance',
      is_critical: true,
      responsible_party: 'buyer',
      item_order: 11,
      status: 'pending',
    },
    {
      checklist_item: 'Supplier notifications sent',
      category: 'operations',
      is_critical: false,
      responsible_party: 'buyer',
      item_order: 12,
      status: 'pending',
    },
    {
      checklist_item: 'Key customer transition meetings scheduled',
      category: 'operations',
      is_critical: true,
      responsible_party: 'buyer',
      item_order: 13,
      status: 'pending',
    },
    {
      checklist_item: 'Security badges and facility access provisioned',
      category: 'operations',
      is_critical: true,
      responsible_party: 'buyer',
      item_order: 14,
      status: 'pending',
    },
    {
      checklist_item: 'Insurance policies transferred',
      category: 'legal',
      is_critical: true,
      responsible_party: 'buyer',
      item_order: 15,
      status: 'pending',
    },
  ],

  typical_synergies: [
    {
      synergy_type: 'cost',
      category: 'headcount',
      synergy_name: 'G&A Headcount Reduction',
      description: 'Eliminate redundant G&A roles (Finance, HR, Admin)',
      probability_of_realization: 90,
      year_1_actual: 0,
      year_2_actual: 0,
      year_3_actual: 0,
      total_actual: 0,
      status: 'planned',
    },
    {
      synergy_type: 'cost',
      category: 'IT',
      synergy_name: 'IT Infrastructure Consolidation',
      description: 'Consolidate cloud infrastructure, SaaS licenses, and tooling',
      probability_of_realization: 85,
      year_1_actual: 0,
      year_2_actual: 0,
      year_3_actual: 0,
      total_actual: 0,
      status: 'planned',
    },
    {
      synergy_type: 'cost',
      category: 'facilities',
      synergy_name: 'Office Space Consolidation',
      description: 'Consolidate offices and reduce real estate footprint',
      probability_of_realization: 75,
      year_1_actual: 0,
      year_2_actual: 0,
      year_3_actual: 0,
      total_actual: 0,
      status: 'planned',
    },
    {
      synergy_type: 'revenue',
      category: 'cross_sell',
      synergy_name: 'Cross-sell Products to Existing Customers',
      description: 'Introduce acquired products to existing customer base',
      probability_of_realization: 70,
      year_1_actual: 0,
      year_2_actual: 0,
      year_3_actual: 0,
      total_actual: 0,
      status: 'planned',
    },
    {
      synergy_type: 'revenue',
      category: 'market_expansion',
      synergy_name: 'Geographic Market Expansion',
      description: 'Leverage combined capabilities to enter new markets',
      probability_of_realization: 60,
      year_1_actual: 0,
      year_2_actual: 0,
      year_3_actual: 0,
      total_actual: 0,
      status: 'planned',
    },
  ],

  typical_risks: [
    {
      risk_name: 'Key Employee Attrition',
      risk_description: 'Critical employees leave during or after integration',
      risk_category: 'people',
      impact: 'critical',
      probability: 'medium',
      status: 'open',
    },
    {
      risk_name: 'Customer Churn',
      risk_description: 'Key customers leave due to acquisition uncertainty',
      risk_category: 'customers',
      impact: 'high',
      probability: 'medium',
      status: 'open',
    },
    {
      risk_name: 'IT Integration Delays',
      risk_description: 'System consolidation takes longer than planned',
      risk_category: 'systems',
      impact: 'high',
      probability: 'medium',
      status: 'open',
    },
    {
      risk_name: 'Cultural Clash',
      risk_description: 'Cultural differences lead to employee disengagement',
      risk_category: 'cultural',
      impact: 'medium',
      probability: 'high',
      status: 'open',
    },
    {
      risk_name: 'Synergy Shortfall',
      risk_description: 'Projected synergies not realized as planned',
      risk_category: 'operations',
      impact: 'high',
      probability: 'medium',
      status: 'open',
    },
  ],

  typical_kpis: [
    {
      kpi_name: 'Employee Retention Rate',
      kpi_category: 'employee',
      kpi_description: 'Percentage of target company employees retained',
      unit: '%',
      measurement_frequency: 'monthly',
    },
    {
      kpi_name: 'Customer Retention Rate',
      kpi_category: 'customer',
      kpi_description: 'Percentage of customers retained post-acquisition',
      unit: '%',
      measurement_frequency: 'monthly',
    },
    {
      kpi_name: 'Synergy Realization',
      kpi_category: 'synergy',
      kpi_description: 'Percentage of planned synergies realized',
      unit: '%',
      measurement_frequency: 'monthly',
    },
    {
      kpi_name: 'Integration Milestone Completion',
      kpi_category: 'operational',
      kpi_description: 'Percentage of integration milestones completed on time',
      unit: '%',
      measurement_frequency: 'weekly',
    },
    {
      kpi_name: 'Revenue Growth',
      kpi_category: 'financial',
      kpi_description: 'Combined revenue growth rate',
      unit: '%',
      measurement_frequency: 'monthly',
    },
  ],
};

/**
 * Get template by deal type
 */
export function getTemplateByDealType(dealType: DealType): PlaybookTemplate {
  // For MVP, return tech acquisition template for all deal types
  // In production, create specific templates for each deal type
  return TECH_ACQUISITION_TEMPLATE;
}

/**
 * Get all available templates
 */
export function getAllTemplates(): PlaybookTemplate[] {
  return [TECH_ACQUISITION_TEMPLATE];
}
