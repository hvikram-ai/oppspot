/**
 * Demo ResearchGPT™ Reports
 * Pre-seeded intelligence reports for live demo mode
 *
 * These are complete, realistic research reports demonstrating all 6 sections:
 * - Company Snapshot
 * - Buying Signals
 * - Decision Makers
 * - Revenue Signals
 * - Recommended Approach
 * - Sources
 */

import type {
  ResearchReportResponse,
  CompanySnapshot,
  BuyingSignal,
  DecisionMaker,
  RecommendedApproach,
  RevenueSignal,
  SourcesList,
} from '@/types/research-gpt';

// ============================================================================
// TECHHUB SOLUTIONS - Complete Research Report
// ============================================================================

export const demoResearchReportTechHub: ResearchReportResponse = {
  report_id: 'demo-research-techhub-001',
  company: {
    id: 'demo-1',
    name: 'TechHub Solutions',
    company_number: '10234567',
  },
  status: 'complete',
  confidence_score: 0.87,

  sections: {
    snapshot: {
      // Core identification
      company_name: 'TechHub Solutions',
      company_number: '10234567',

      // Basic information (FR-006)
      founded_year: 2018,
      company_type: 'Private Limited Company',
      company_status: 'Active',

      // Location data
      registered_address: {
        address_line_1: '123 Tech Street',
        locality: 'Shoreditch',
        city: 'London',
        region: 'Greater London',
        postal_code: 'EC2A 4BX',
        country: 'United Kingdom',
      },
      headquarters_location: 'London, United Kingdom',
      operating_locations: ['London', 'Manchester', 'Edinburgh'],

      // Employee metrics (FR-007)
      employee_count: 72,
      employee_growth_yoy: 44,
      employee_growth_trend: 'growing',

      // Financial estimates (FR-008)
      revenue_estimate: {
        amount: 7800000,
        currency: 'GBP',
        confidence: 'high',
        last_filed_accounts: {
          date: '2024-03-31',
          revenue: 6500000,
        },
      },
      revenue_growth_yoy: 35,

      // Technology stack (FR-009)
      tech_stack: [
        {
          category: 'Cloud Infrastructure',
          technology: 'AWS',
          detected_at: '2024-08-15',
        },
        {
          category: 'Cloud Infrastructure',
          technology: 'Azure',
          detected_at: '2024-08-15',
        },
        {
          category: 'Development',
          technology: 'TypeScript',
          detected_at: '2024-08-15',
        },
        {
          category: 'Development',
          technology: 'React',
          detected_at: '2024-08-15',
        },
        {
          category: 'Database',
          technology: 'PostgreSQL',
          detected_at: '2024-08-15',
        },
        {
          category: 'AI/ML',
          technology: 'OpenAI API',
          detected_at: '2024-08-15',
        },
      ],

      // Funding history (FR-010)
      funding_rounds: [
        {
          round_type: 'Seed',
          amount: 800000,
          currency: 'GBP',
          announced_date: '2018-09-15',
          investors: ['TechStart Ventures', 'Angel Investors'],
        },
        {
          round_type: 'Series A',
          amount: 3500000,
          currency: 'GBP',
          announced_date: '2021-03-20',
          investors: ['Index Ventures', 'Balderton Capital'],
        },
      ],
      total_funding: {
        amount: 4300000,
        currency: 'GBP',
      },

      // Additional context
      industry: 'Software Development',
      sic_codes: ['62012', '62020'],
      description: 'Leading software development company specializing in custom enterprise solutions, cloud architecture, and AI/ML integration. Provides end-to-end digital transformation services for mid-market and enterprise clients.',
      mission_statement: 'Empowering businesses through innovative technology solutions that drive growth and efficiency.',
      value_proposition: 'Full-stack development expertise combined with deep domain knowledge in finance, healthcare, and logistics sectors. Proven track record of delivering scalable enterprise solutions.',
      business_model: 'B2B SaaS and professional services. Mix of recurring revenue (60%) from SaaS products and project-based revenue (40%) from consulting engagements.',

      // Market presence
      target_market: ['Financial Services', 'Healthcare', 'Logistics', 'Professional Services'],
      geographic_presence: ['United Kingdom', 'Ireland', 'Germany'],

      // Jurisdiction
      jurisdiction: 'England & Wales',

      // Metadata
      last_updated: '2024-08-25T10:30:00Z',
    },

    buying_signals: [
      {
        signal_type: 'hiring',
        priority: 'high',
        detected_date: '2024-08-20',
        confidence: 'high',
        title: 'Aggressive hiring across senior technical roles',
        description: '15 open positions for senior engineers, architects, and team leads posted in the last 30 days',
        source_url: 'https://techhub-demo.com/careers',
        source_type: 'job_posting',
        category: 'Growth Signal',
        relevance_score: 0.92,
        details: {
          job_postings_count: 15,
          departments: ['Engineering', 'Product', 'DevOps'],
          seniority_levels: ['Senior', 'Lead', 'Principal'],
          job_titles: ['Senior Full-Stack Engineer', 'Solutions Architect', 'Engineering Manager'],
          posted_within_days: 30,
        },
      },
      {
        signal_type: 'expansion',
        priority: 'high',
        detected_date: '2024-07-15',
        confidence: 'high',
        title: 'New Edinburgh office opening',
        description: 'TechHub Solutions announced the opening of a new 10,000 sq ft office in Edinburgh to support Scottish market expansion',
        source_url: 'https://techhub-demo.com/press/edinburgh-expansion',
        source_type: 'press_release',
        category: 'Market Expansion',
        relevance_score: 0.88,
        details: {
          expansion_type: 'new_office',
          location: 'Edinburgh, Scotland',
          announced_date: '2024-07-15',
          press_release_url: 'https://techhub-demo.com/press/edinburgh-expansion',
        },
      },
      {
        signal_type: 'leadership',
        priority: 'medium',
        detected_date: '2024-06-10',
        confidence: 'high',
        title: 'New Chief Technology Officer appointed',
        description: 'Former Amazon Web Services senior manager joins as CTO to lead cloud modernization initiatives',
        source_url: 'https://linkedin.com/in/jane-smith-cto',
        source_type: 'linkedin',
        category: 'Leadership Change',
        relevance_score: 0.81,
        details: {
          change_type: 'new_hire',
          person_name: 'Jane Smith',
          role: 'Chief Technology Officer',
          department: 'Engineering',
          announced_date: '2024-06-10',
        },
      },
      {
        signal_type: 'product_launch',
        priority: 'high',
        detected_date: '2024-08-01',
        confidence: 'high',
        title: 'Launch of AI-powered analytics platform',
        description: 'New SaaS product "InsightFlow" launched for enterprise data analytics with built-in AI/ML capabilities',
        source_url: 'https://techhub-demo.com/products/insightflow',
        source_type: 'company_website',
        category: 'Product Innovation',
        relevance_score: 0.89,
      },
      {
        signal_type: 'tech_change',
        priority: 'medium',
        detected_date: '2024-05-20',
        confidence: 'medium',
        title: 'Migration to microservices architecture',
        description: 'Job postings indicate major technical transformation from monolithic to microservices architecture',
        source_url: 'https://techhub-demo.com/careers/senior-microservices-architect',
        source_type: 'job_posting',
        category: 'Technology Transformation',
        relevance_score: 0.75,
        details: {
          technology: 'Kubernetes',
          change_type: 'adoption',
          detected_from: 'Job postings and engineering blog',
        },
      },
    ],

    decision_makers: [
      {
        // FR-018: Core information
        name: 'David Chen',
        job_title: 'Chief Executive Officer',
        department: 'Executive',
        seniority_level: 'C-level',
        linkedin_url: 'https://linkedin.com/in/davidchen-ceo',

        // FR-018: Background
        background_summary: 'Former VP of Engineering at Pivotal Software. 15+ years in enterprise software. MBA from London Business School.',
        years_in_role: 6,
        previous_companies: ['Pivotal Software', 'VMware', 'Accenture'],

        // FR-019: Reporting structure
        reports_to: 'Board of Directors',
        team_size: 72,

        // FR-020: Champion identification
        decision_influence: 'champion',
        influence_rationale: 'Final decision authority on strategic partnerships and large vendor contracts. Known for championing innovation and efficiency improvements.',
        influence_score: 0.95,
        is_decision_maker: true,

        // FR-021: GDPR-compliant contact info
        business_email: 'david.chen@techhub-demo.com',
        business_phone: '+44 20 7123 4567',
        contact_source: 'Companies House',
        contact_verified_date: '2024-08-15',
        appointed_date: '2018-06-01',
      },
      {
        name: 'Jane Smith',
        job_title: 'Chief Technology Officer',
        department: 'Engineering',
        seniority_level: 'C-level',
        linkedin_url: 'https://linkedin.com/in/jane-smith-cto',

        background_summary: 'Former AWS senior manager with deep expertise in cloud infrastructure and distributed systems. Led teams of 50+ engineers.',
        years_in_role: 0.3,
        previous_companies: ['Amazon Web Services', 'Microsoft Azure'],

        reports_to: 'David Chen',
        team_size: 45,

        decision_influence: 'influencer',
        influence_rationale: 'New hire with strong mandate to modernize tech stack. Key influencer on all technology purchasing decisions.',
        influence_score: 0.88,
        is_decision_maker: true,

        business_email: 'jane.smith@techhub-demo.com',
        contact_source: 'Company website',
        contact_verified_date: '2024-08-15',
        appointed_date: '2024-06-10',
      },
      {
        name: 'Sarah Mitchell',
        job_title: 'Chief Financial Officer',
        department: 'Finance',
        seniority_level: 'C-level',
        linkedin_url: 'https://linkedin.com/in/sarahmitchell-cfo',

        background_summary: 'Former CFO at fintech startup. Chartered Accountant with expertise in SaaS metrics and fundraising.',
        years_in_role: 3,
        previous_companies: ['Revolut', 'PwC'],

        reports_to: 'David Chen',
        team_size: 8,

        decision_influence: 'influencer',
        influence_rationale: 'Controls budget allocation. Must approve all expenditures over £50k. Focuses on ROI and efficiency metrics.',
        influence_score: 0.82,
        is_decision_maker: true,

        business_email: 'sarah.mitchell@techhub-demo.com',
        contact_source: 'Companies House',
        contact_verified_date: '2024-08-15',
        appointed_date: '2021-05-01',
      },
      {
        name: 'Michael Brown',
        job_title: 'VP of Engineering',
        department: 'Engineering',
        seniority_level: 'VP',
        linkedin_url: 'https://linkedin.com/in/michaelbrown-vp',

        background_summary: 'Early employee who grew from senior engineer to VP. Deep institutional knowledge and product expertise.',
        years_in_role: 2,
        previous_companies: ['Google', 'Deliveroo'],

        reports_to: 'Jane Smith',
        team_size: 35,

        decision_influence: 'influencer',
        influence_rationale: 'Reports to new CTO. Influences technical tool selection and development practices.',
        influence_score: 0.75,
        is_decision_maker: false,

        appointed_date: '2019-01-15',
      },
    ],

    revenue_signals: [
      {
        metric_type: 'revenue',
        value: 7800000,
        unit: 'GBP',
        time_period: '2024 (projected)',
        source: 'Management estimate',
        source_url: 'https://techhub-demo.com/press/growth-announcement',
        confidence_level: 'medium',
        published_date: '2024-08-01',
        signal_type: 'projection',
        positive: true,
        description: '35% YoY revenue growth driven by new product launch and enterprise client wins',
      },
      {
        metric_type: 'revenue',
        value: 6500000,
        unit: 'GBP',
        time_period: 'FY 2023-24',
        source: 'Companies House filing',
        source_url: 'https://find-and-update.company-information.service.gov.uk/company/10234567',
        confidence_level: 'high',
        published_date: '2024-06-30',
        signal_type: 'actual',
        positive: true,
        description: 'Confirmed annual revenue from filed accounts',
      },
      {
        metric_type: 'customer_growth',
        value: 127,
        unit: 'enterprise clients',
        time_period: 'Q2 2024',
        source: 'Company blog',
        source_url: 'https://techhub-demo.com/blog/milestone-100-clients',
        confidence_level: 'high',
        published_date: '2024-07-15',
        signal_type: 'milestone',
        positive: true,
        description: 'Surpassed 100 enterprise clients milestone with strong retention rate',
      },
      {
        metric_type: 'profitability',
        value: 12,
        unit: 'percent EBITDA margin',
        time_period: 'FY 2023-24',
        source: 'Companies House filing',
        source_url: 'https://find-and-update.company-information.service.gov.uk/company/10234567',
        confidence_level: 'high',
        published_date: '2024-06-30',
        signal_type: 'actual',
        positive: true,
        description: 'Achieved profitability with healthy EBITDA margin',
      },
    ],

    recommended_approach: {
      // FR-027: Best contact person
      recommended_contact_id: 'demo-dm-techhub-001',
      recommended_contact_name: 'David Chen',
      contact_rationale: 'As CEO, David has final decision authority on strategic partnerships and major vendor relationships. His background in enterprise software and focus on innovation makes him receptive to solutions that improve efficiency and scale.',

      // FR-026: Strategy
      approach_summary: 'TechHub Solutions is in a high-growth phase with strong expansion signals. The new Edinburgh office, aggressive hiring, and recent CTO appointment indicate readiness for infrastructure investments. Lead with ROI-focused value proposition emphasizing how your solution supports their scaling challenges. The company has moved from profitability to growth mode, suggesting budget availability for strategic investments.\n\nKey leverage points: Their microservices migration creates immediate need for supporting infrastructure. The new CTO from AWS background suggests cloud-native solution preference. Recent £3.5M Series A provides capital for growth investments.',
      key_talking_points: [
        'Support for rapid team scaling (44% employee growth YoY)',
        'Cloud-native architecture alignment with their AWS/Azure stack',
        'Enterprise-grade reliability for their 127+ clients',
        'Integration capabilities with their TypeScript/React tech stack',
        'ROI case studies from similar-sized software companies',
      ],

      // FR-028: Timing
      timing_suggestion: {
        urgency: 'within_week',
        rationale: 'Multiple concurrent initiatives (Edinburgh expansion, microservices migration, 15 open engineering roles) create urgency. New CTO in first 90 days is actively evaluating tech stack. Budget cycle likely aligns with fiscal year end (March).',
        optimal_time: 'September-October 2024 (Q3) before budget freeze',
      },

      // FR-029: Conversation starters
      conversation_starters: [
        {
          opener: 'I noticed you recently brought on Jane Smith as CTO from AWS. Congratulations on the hire!',
          signal_reference: 'New CTO appointment',
          value_proposition: 'Many companies going through similar cloud modernization journeys find that [your solution] accelerates their migration timeline by 40%.',
        },
        {
          opener: 'Saw the announcement about your Edinburgh expansion. Exciting growth!',
          signal_reference: 'New office opening',
          value_proposition: 'As you scale to multiple locations, distributed teams often need better [collaboration/development/infrastructure] tools. We helped a similar company reduce onboarding time from 2 weeks to 3 days.',
        },
        {
          opener: 'Congratulations on hitting 100+ enterprise clients! That is a major milestone.',
          signal_reference: 'Customer growth',
          value_proposition: 'At this scale, many software companies struggle with [technical support/deployment/monitoring] complexity. We have helped companies like yours maintain 99.9% uptime while growing their customer base.',
        },
      ],

      // AI reasoning transparency
      reasoning: {
        signals_considered: [
          'Aggressive hiring (15 senior positions) suggests budget availability',
          'New CTO from AWS indicates cloud modernization priority',
          'Edinburgh expansion shows geographic scaling needs',
          'Microservices migration creates infrastructure requirements',
          'Recent profitability (12% EBITDA) indicates financial health',
        ],
        decision_maker_factors: [
          'CEO David Chen has final approval on strategic partnerships',
          'New CTO Jane Smith is actively evaluating tech stack (90-day window)',
          'CFO Sarah Mitchell controls budget but focuses on ROI',
          'VP Engineering Michael Brown influences technical decisions',
        ],
        risk_factors: [
          'New CTO might have vendor preferences from AWS days',
          'Recent fundraise might mean vendor consolidation efforts',
          'Microservices migration could delay other initiatives',
          'Geographic expansion might strain resources',
        ],
      },
    },

    sources: {
      total_sources: 18,
      sources: [
        {
          url: 'https://find-and-update.company-information.service.gov.uk/company/10234567',
          title: 'TechHub Solutions Ltd - Companies House',
          published_date: '2024-06-30',
          accessed_date: '2024-08-25',
          source_type: 'companies_house',
          reliability_score: 1.0,
          domain: 'companieshouse.gov.uk',
          content_snippet: 'Annual accounts filed for period ending 31 March 2024. Turnover: £6,500,000. Employees: 50-100.',
        },
        {
          url: 'https://techhub-demo.com/press/edinburgh-expansion',
          title: 'TechHub Solutions Opens New Edinburgh Office',
          published_date: '2024-07-15',
          accessed_date: '2024-08-25',
          source_type: 'press_release',
          reliability_score: 0.95,
          domain: 'techhub-demo.com',
          content_snippet: 'TechHub Solutions announced today the opening of a new 10,000 square foot office in Edinburgh...',
        },
        {
          url: 'https://techhub-demo.com/careers',
          title: 'Careers at TechHub Solutions',
          published_date: null,
          accessed_date: '2024-08-25',
          source_type: 'company_website',
          reliability_score: 0.90,
          domain: 'techhub-demo.com',
          content_snippet: 'Join our growing team! We have 15 open positions across engineering, product, and operations.',
        },
        {
          url: 'https://linkedin.com/company/techhub-solutions',
          title: 'TechHub Solutions | LinkedIn',
          published_date: null,
          accessed_date: '2024-08-25',
          source_type: 'linkedin',
          reliability_score: 0.85,
          domain: 'linkedin.com',
          content_snippet: '72 employees · Software Development · London, United Kingdom',
        },
        {
          url: 'https://techhub-demo.com/products/insightflow',
          title: 'InsightFlow - AI-Powered Analytics Platform',
          published_date: '2024-08-01',
          accessed_date: '2024-08-25',
          source_type: 'company_website',
          reliability_score: 0.90,
          domain: 'techhub-demo.com',
          content_snippet: 'Introducing InsightFlow, our new enterprise data analytics platform with built-in AI/ML capabilities...',
        },
        {
          url: 'https://techhub-demo.com/blog/milestone-100-clients',
          title: 'Celebrating 100+ Enterprise Clients',
          published_date: '2024-07-15',
          accessed_date: '2024-08-25',
          source_type: 'company_website',
          reliability_score: 0.88,
          domain: 'techhub-demo.com',
          content_snippet: 'We are thrilled to announce that we have surpassed 100 enterprise clients across financial services, healthcare, and logistics sectors.',
        },
        {
          url: 'https://crunchbase.com/organization/techhub-solutions',
          title: 'TechHub Solutions - Crunchbase',
          published_date: null,
          accessed_date: '2024-08-25',
          source_type: 'industry_report',
          reliability_score: 0.82,
          domain: 'crunchbase.com',
          content_snippet: 'Total funding: £4.3M across 2 rounds. Latest funding: Series A (£3.5M) in March 2021.',
        },
        {
          url: 'https://linkedin.com/in/davidchen-ceo',
          title: 'David Chen - CEO at TechHub Solutions',
          published_date: null,
          accessed_date: '2024-08-25',
          source_type: 'linkedin',
          reliability_score: 0.85,
          domain: 'linkedin.com',
          content_snippet: 'CEO & Founder at TechHub Solutions. Former VP Engineering at Pivotal Software.',
        },
        {
          url: 'https://linkedin.com/in/jane-smith-cto',
          title: 'Jane Smith - CTO at TechHub Solutions',
          published_date: '2024-06-10',
          accessed_date: '2024-08-25',
          source_type: 'linkedin',
          reliability_score: 0.85,
          domain: 'linkedin.com',
          content_snippet: 'Joined TechHub Solutions as Chief Technology Officer in June 2024. Previously Senior Manager at AWS.',
        },
        {
          url: 'https://techhub-demo.com/about/team',
          title: 'Leadership Team - TechHub Solutions',
          published_date: null,
          accessed_date: '2024-08-25',
          source_type: 'company_website',
          reliability_score: 0.90,
          domain: 'techhub-demo.com',
          content_snippet: 'Meet our leadership team: David Chen (CEO), Jane Smith (CTO), Sarah Mitchell (CFO), Michael Brown (VP Engineering).',
        },
        {
          url: 'https://techhub-demo.com/press/series-a',
          title: 'TechHub Solutions Raises £3.5M Series A',
          published_date: '2021-03-20',
          accessed_date: '2024-08-25',
          source_type: 'press_release',
          reliability_score: 0.95,
          domain: 'techhub-demo.com',
          content_snippet: 'TechHub Solutions announced today the completion of its £3.5M Series A funding round led by Index Ventures.',
        },
        {
          url: 'https://builtwith.com/techhub-demo.com',
          title: 'Technology Profile - TechHub Solutions',
          published_date: null,
          accessed_date: '2024-08-25',
          source_type: 'industry_report',
          reliability_score: 0.78,
          domain: 'builtwith.com',
          content_snippet: 'Tech stack: AWS, TypeScript, React, PostgreSQL, Redis.',
        },
        {
          url: 'https://techhub-demo.com/blog/microservices-journey',
          title: 'Our Journey to Microservices Architecture',
          published_date: '2024-05-20',
          accessed_date: '2024-08-25',
          source_type: 'company_website',
          reliability_score: 0.87,
          domain: 'techhub-demo.com',
          content_snippet: 'We are embarking on a major technical transformation, migrating from our monolithic architecture to microservices using Kubernetes.',
        },
        {
          url: 'https://stackoverflow.com/jobs/companies/techhub-solutions',
          title: 'Jobs at TechHub Solutions',
          published_date: null,
          accessed_date: '2024-08-25',
          source_type: 'job_posting',
          reliability_score: 0.80,
          domain: 'stackoverflow.com',
          content_snippet: '15 open positions including Senior Full-Stack Engineer, Solutions Architect, Engineering Manager.',
        },
        {
          url: 'https://www.google.com/maps/place/123+Tech+Street+London',
          title: 'TechHub Solutions Office Location',
          published_date: null,
          accessed_date: '2024-08-25',
          source_type: 'company_website',
          reliability_score: 0.75,
          domain: 'google.com',
          content_snippet: '123 Tech Street, Shoreditch, London EC2A 4BX',
        },
        {
          url: 'https://glassdoor.com/Overview/Working-at-TechHub-Solutions',
          title: 'TechHub Solutions Employee Reviews',
          published_date: null,
          accessed_date: '2024-08-25',
          source_type: 'social_media',
          reliability_score: 0.72,
          domain: 'glassdoor.com',
          content_snippet: '4.2/5 rating. Employees praise fast-paced environment and learning opportunities.',
        },
        {
          url: 'https://techhub-demo.com/customers',
          title: 'Customer Success Stories',
          published_date: null,
          accessed_date: '2024-08-25',
          source_type: 'company_website',
          reliability_score: 0.85,
          domain: 'techhub-demo.com',
          content_snippet: 'Serving 127+ enterprise clients across financial services, healthcare, logistics, and professional services sectors.',
        },
        {
          url: 'https://techcrunch.com/2021/03/20/techhub-solutions-series-a',
          title: 'TechHub Solutions Raises Series A to Expand Enterprise Software Suite',
          published_date: '2021-03-20',
          accessed_date: '2024-08-25',
          source_type: 'news_article',
          reliability_score: 0.92,
          domain: 'techcrunch.com',
          content_snippet: 'London-based TechHub Solutions has raised £3.5M in Series A funding to expand its enterprise software offering...',
        },
      ],
      sources_by_type: {
        companies_house: 1,
        press_release: 3,
        company_website: 8,
        linkedin: 3,
        job_posting: 1,
        industry_report: 2,
        news_article: 1,
        social_media: 1,
      },
    },
  },

  metadata: {
    generated_at: '2024-08-25T10:30:00Z',
    cached_until: '2024-09-01T10:30:00Z',
    generation_time_ms: 24500,
    cache_age: 'Just now',
    can_refresh: false,
  },
};

// ============================================================================
// GREEN ENERGY PARTNERS - Complete Research Report
// ============================================================================

export const demoResearchReportGreenEnergy: ResearchReportResponse = {
  report_id: 'demo-research-greenenergy-002',
  company: {
    id: 'demo-2',
    name: 'Green Energy Partners',
    company_number: '11567890',
  },
  status: 'complete',
  confidence_score: 0.82,

  sections: {
    snapshot: {
      company_name: 'Green Energy Partners',
      company_number: '11567890',

      founded_year: 2019,
      company_type: 'Private Limited Company',
      company_status: 'Active',

      registered_address: {
        address_line_1: '45 Eco Plaza',
        locality: 'City Centre',
        city: 'Manchester',
        region: 'Greater Manchester',
        postal_code: 'M1 5GD',
        country: 'United Kingdom',
      },
      headquarters_location: 'Manchester, United Kingdom',
      operating_locations: ['Manchester', 'Leeds', 'Liverpool', 'Sheffield'],

      employee_count: 38,
      employee_growth_yoy: 42,
      employee_growth_trend: 'growing',

      revenue_estimate: {
        amount: 3200000,
        currency: 'GBP',
        confidence: 'medium',
        last_filed_accounts: {
          date: '2024-02-28',
          revenue: 2800000,
        },
      },
      revenue_growth_yoy: 42,

      tech_stack: [
        { category: 'CRM', technology: 'Salesforce', detected_at: '2024-08-15' },
        { category: 'Project Management', technology: 'Monday.com', detected_at: '2024-08-15' },
        { category: 'Analytics', technology: 'Tableau', detected_at: '2024-08-15' },
      ],

      funding_rounds: [
        {
          round_type: 'Seed',
          amount: 500000,
          currency: 'GBP',
          announced_date: '2019-06-15',
          investors: ['Green Future Fund', 'Climate Angels'],
        },
      ],
      total_funding: { amount: 500000, currency: 'GBP' },

      industry: 'Renewable Energy',
      sic_codes: ['35110', '43220'],
      description: 'Sustainable energy solutions provider specializing in solar, wind, and battery storage systems for commercial and residential properties. Focus on UK market with emphasis on Northern England.',
      mission_statement: 'Accelerating the transition to clean, affordable energy for all.',
      value_proposition: 'End-to-end renewable energy solutions combining technology, installation, and ongoing maintenance. Guaranteed ROI within 7 years.',
      business_model: 'B2B and B2C revenue split 70/30. Project-based installation revenue plus recurring maintenance contracts.',

      target_market: ['Commercial Real Estate', 'Manufacturing', 'Agriculture', 'Residential'],
      geographic_presence: ['United Kingdom'],

      jurisdiction: 'England & Wales',
      last_updated: '2024-08-25T11:00:00Z',
    },

    buying_signals: [
      {
        signal_type: 'partnership',
        priority: 'high',
        detected_date: '2024-08-10',
        confidence: 'high',
        title: 'Strategic partnership with UK battery manufacturer',
        description: 'Announced exclusive partnership with BritishVolt for battery storage integration',
        source_url: 'https://greenenergy-demo.com/press/britishvolt-partnership',
        source_type: 'press_release',
        category: 'Strategic Partnership',
        relevance_score: 0.91,
      },
      {
        signal_type: 'funding',
        priority: 'high',
        detected_date: '2024-07-05',
        confidence: 'high',
        title: 'Government grant for innovation',
        description: 'Awarded £1.2M Innovate UK grant for smart grid technology development',
        source_url: 'https://greenenergy-demo.com/press/innovate-uk-grant',
        source_type: 'press_release',
        category: 'Funding',
        relevance_score: 0.88,
      },
      {
        signal_type: 'hiring',
        priority: 'medium',
        detected_date: '2024-08-18',
        confidence: 'high',
        title: 'Expanding installation team',
        description: '8 open positions for solar installation engineers and project managers',
        source_url: 'https://greenenergy-demo.com/careers',
        source_type: 'job_posting',
        category: 'Growth Signal',
        relevance_score: 0.79,
      },
      {
        signal_type: 'award',
        priority: 'low',
        detected_date: '2024-06-20',
        confidence: 'high',
        title: 'Sustainability Award 2024',
        description: 'Winner of Greater Manchester Chamber of Commerce Sustainability Award',
        source_url: 'https://greenenergy-demo.com/press/sustainability-award',
        source_type: 'news_article',
        category: 'Recognition',
        relevance_score: 0.72,
      },
    ],

    decision_makers: [
      {
        name: 'Emma Richardson',
        job_title: 'Chief Executive Officer',
        department: 'Executive',
        seniority_level: 'C-level',
        linkedin_url: 'https://linkedin.com/in/emma-richardson-greenenergy',

        background_summary: 'Former VP at Schneider Electric with 12 years in renewable energy sector. Chartered Engineer.',
        years_in_role: 5,
        previous_companies: ['Schneider Electric', 'Siemens Energy', 'E.ON'],

        reports_to: 'Board of Directors',
        team_size: 38,

        decision_influence: 'champion',
        influence_rationale: 'Founder and CEO with final approval on all strategic decisions. Passionate about innovation and sustainability.',
        influence_score: 0.96,
        is_decision_maker: true,

        business_email: 'emma.richardson@greenenergy-demo.com',
        business_phone: '+44 161 234 5678',
        contact_source: 'Companies House',
        contact_verified_date: '2024-08-15',
        appointed_date: '2019-05-01',
      },
      {
        name: 'Marcus Thompson',
        job_title: 'Operations Director',
        department: 'Operations',
        seniority_level: 'Director',
        linkedin_url: 'https://linkedin.com/in/marcus-thompson-ops',

        background_summary: 'Operations expert with background in construction and project management. Lean Six Sigma Black Belt.',
        years_in_role: 3,
        previous_companies: ['Balfour Beatty', 'Carillion'],

        reports_to: 'Emma Richardson',
        team_size: 25,

        decision_influence: 'influencer',
        influence_rationale: 'Oversees all installations. Influences equipment and tool purchasing decisions.',
        influence_score: 0.81,
        is_decision_maker: true,

        business_email: 'marcus.thompson@greenenergy-demo.com',
        contact_source: 'Company website',
        contact_verified_date: '2024-08-15',
        appointed_date: '2021-04-01',
      },
    ],

    revenue_signals: [
      {
        metric_type: 'revenue',
        value: 3200000,
        unit: 'GBP',
        time_period: '2024 (projected)',
        source: 'Management estimate',
        source_url: 'https://greenenergy-demo.com/press/growth-update',
        confidence_level: 'medium',
        published_date: '2024-07-01',
        signal_type: 'projection',
        positive: true,
        description: '42% YoY revenue growth driven by government incentives and commercial demand',
      },
      {
        metric_type: 'revenue',
        value: 2800000,
        unit: 'GBP',
        time_period: 'FY 2023-24',
        source: 'Companies House filing',
        source_url: 'https://find-and-update.company-information.service.gov.uk/company/11567890',
        confidence_level: 'high',
        published_date: '2024-05-31',
        signal_type: 'actual',
        positive: true,
      },
      {
        metric_type: 'customer_growth',
        value: 450,
        unit: 'installations completed',
        time_period: '2023-24',
        source: 'Company blog',
        source_url: 'https://greenenergy-demo.com/blog/450-installations',
        confidence_level: 'high',
        published_date: '2024-06-15',
        signal_type: 'milestone',
        positive: true,
        description: 'Completed 450+ installations across commercial and residential sectors',
      },
    ],

    recommended_approach: {
      recommended_contact_id: 'demo-dm-greenenergy-001',
      recommended_contact_name: 'Emma Richardson',
      contact_rationale: 'As founder and CEO, Emma drives all strategic decisions. Her engineering background and sustainability passion make her receptive to innovative solutions that improve efficiency or sustainability metrics.',

      approach_summary: 'Green Energy Partners is in rapid growth phase with strong tailwinds from government support (£1.2M grant) and strategic partnerships. The company is scaling operations aggressively with new hires and geographic expansion. Key focus areas are installation efficiency, project management, and customer satisfaction.\n\nThe BritishVolt partnership signals commitment to battery storage integration, creating potential for supporting technology needs. Government grant suggests R&D investment and innovation focus.',
      key_talking_points: [
        'Support for rapid scaling (42% growth, 8 new hires)',
        'Installation efficiency and project tracking capabilities',
        'Integration with battery storage systems',
        'Sustainability and carbon reduction metrics',
        'Government compliance and grant reporting',
      ],

      timing_suggestion: {
        urgency: 'within_month',
        rationale: 'Government grant funding provides immediate budget availability. Partnership announcement suggests active technology evaluation period. Hiring surge indicates capacity expansion needs.',
        optimal_time: 'September-October 2024 before winter slowdown',
      },

      conversation_starters: [
        {
          opener: 'Congratulations on the Innovate UK grant! £1.2M is a significant validation of your smart grid work.',
          signal_reference: 'Government grant',
          value_proposition: 'Many grant recipients find they need better [project tracking/data analytics/compliance reporting] tools. We helped a similar company reduce grant reporting overhead by 60%.',
        },
        {
          opener: 'Saw the BritishVolt partnership announcement. That\'s an exciting direction for battery storage integration.',
          signal_reference: 'Strategic partnership',
          value_proposition: 'As you integrate battery systems, companies often need better [monitoring/scheduling/optimization] capabilities. Our solution helps maximize battery ROI by 25%.',
        },
      ],

      reasoning: {
        signals_considered: [
          'Government grant (£1.2M) provides budget for innovation',
          'Strategic partnership creates integration opportunities',
          'Aggressive hiring (8 positions) signals growth capacity needs',
          'Sustainability award demonstrates commitment to impact metrics',
          '42% revenue growth shows financial momentum',
        ],
        decision_maker_factors: [
          'CEO Emma Richardson has engineering background and technical credibility',
          'Operations Director Marcus influences equipment decisions',
          'Small team means faster decision cycles',
        ],
        risk_factors: [
          'Project-based revenue can be lumpy',
          'Government incentive dependency',
          'Installation capacity constraints might limit near-term growth',
        ],
      },
    },

    sources: {
      total_sources: 12,
      sources: [
        {
          url: 'https://find-and-update.company-information.service.gov.uk/company/11567890',
          title: 'Green Energy Partners Ltd - Companies House',
          published_date: '2024-05-31',
          accessed_date: '2024-08-25',
          source_type: 'companies_house',
          reliability_score: 1.0,
          domain: 'companieshouse.gov.uk',
        },
        {
          url: 'https://greenenergy-demo.com/press/britishvolt-partnership',
          title: 'Green Energy Partners Announces Strategic Partnership with BritishVolt',
          published_date: '2024-08-10',
          accessed_date: '2024-08-25',
          source_type: 'press_release',
          reliability_score: 0.95,
          domain: 'greenenergy-demo.com',
        },
        {
          url: 'https://greenenergy-demo.com/press/innovate-uk-grant',
          title: 'Green Energy Partners Awarded £1.2M Innovate UK Grant',
          published_date: '2024-07-05',
          accessed_date: '2024-08-25',
          source_type: 'press_release',
          reliability_score: 0.95,
          domain: 'greenenergy-demo.com',
        },
        {
          url: 'https://greenenergy-demo.com/careers',
          title: 'Join Our Team - Green Energy Partners',
          published_date: null,
          accessed_date: '2024-08-25',
          source_type: 'company_website',
          reliability_score: 0.90,
          domain: 'greenenergy-demo.com',
        },
        {
          url: 'https://linkedin.com/company/green-energy-partners',
          title: 'Green Energy Partners | LinkedIn',
          published_date: null,
          accessed_date: '2024-08-25',
          source_type: 'linkedin',
          reliability_score: 0.85,
          domain: 'linkedin.com',
        },
        {
          url: 'https://greenenergy-demo.com/blog/450-installations',
          title: 'Celebrating 450+ Successful Installations',
          published_date: '2024-06-15',
          accessed_date: '2024-08-25',
          source_type: 'company_website',
          reliability_score: 0.88,
          domain: 'greenenergy-demo.com',
        },
        {
          url: 'https://manchestereveningnews.co.uk/green-energy-partners-sustainability-award',
          title: 'Manchester Company Wins Sustainability Award',
          published_date: '2024-06-20',
          accessed_date: '2024-08-25',
          source_type: 'news_article',
          reliability_score: 0.87,
          domain: 'manchestereveningnews.co.uk',
        },
        {
          url: 'https://linkedin.com/in/emma-richardson-greenenergy',
          title: 'Emma Richardson - CEO at Green Energy Partners',
          published_date: null,
          accessed_date: '2024-08-25',
          source_type: 'linkedin',
          reliability_score: 0.85,
          domain: 'linkedin.com',
        },
        {
          url: 'https://greenenergy-demo.com/about',
          title: 'About Us - Green Energy Partners',
          published_date: null,
          accessed_date: '2024-08-25',
          source_type: 'company_website',
          reliability_score: 0.90,
          domain: 'greenenergy-demo.com',
        },
        {
          url: 'https://greenenergy-demo.com/case-studies',
          title: 'Customer Success Stories',
          published_date: null,
          accessed_date: '2024-08-25',
          source_type: 'company_website',
          reliability_score: 0.85,
          domain: 'greenenergy-demo.com',
        },
        {
          url: 'https://gov.uk/guidance/innovate-uk-smart-grants',
          title: 'Innovate UK Smart Grant Recipients 2024',
          published_date: '2024-07-05',
          accessed_date: '2024-08-25',
          source_type: 'industry_report',
          reliability_score: 0.95,
          domain: 'gov.uk',
        },
        {
          url: 'https://renewableenergyworld.com/uk-solar-market-trends-2024',
          title: 'UK Solar Market Analysis 2024',
          published_date: '2024-08-01',
          accessed_date: '2024-08-25',
          source_type: 'industry_report',
          reliability_score: 0.82,
          domain: 'renewableenergyworld.com',
        },
      ],
      sources_by_type: {
        companies_house: 1,
        press_release: 3,
        company_website: 4,
        linkedin: 2,
        news_article: 1,
        industry_report: 2,
      },
    },
  },

  metadata: {
    generated_at: '2024-08-25T11:00:00Z',
    cached_until: '2024-09-01T11:00:00Z',
    generation_time_ms: 22800,
    cache_age: 'Just now',
    can_refresh: false,
  },
};

// ============================================================================
// FINTECH INNOVATIONS - Complete Research Report
// ============================================================================

export const demoResearchReportFinTech: ResearchReportResponse = {
  report_id: 'demo-research-fintech-003',
  company: {
    id: 'demo-4',
    name: 'FinTech Innovations Ltd',
    company_number: '12345678',
  },
  status: 'complete',
  confidence_score: 0.91,

  sections: {
    snapshot: {
      company_name: 'FinTech Innovations Ltd',
      company_number: '12345678',

      founded_year: 2020,
      company_type: 'Private Limited Company',
      company_status: 'Active',

      registered_address: {
        address_line_1: '200 Canary Wharf',
        locality: 'Canary Wharf',
        city: 'London',
        region: 'Greater London',
        postal_code: 'E14 5RS',
        country: 'United Kingdom',
      },
      headquarters_location: 'London, United Kingdom',
      operating_locations: ['London', 'Dublin'],

      employee_count: 142,
      employee_growth_yoy: 65,
      employee_growth_trend: 'growing',

      revenue_estimate: {
        amount: 18500000,
        currency: 'GBP',
        confidence: 'high',
        last_filed_accounts: {
          date: '2024-03-31',
          revenue: 14200000,
        },
      },
      revenue_growth_yoy: 65,

      tech_stack: [
        { category: 'Cloud', technology: 'AWS', detected_at: '2024-08-15' },
        { category: 'Backend', technology: 'Node.js', detected_at: '2024-08-15' },
        { category: 'Backend', technology: 'Go', detected_at: '2024-08-15' },
        { category: 'Database', technology: 'PostgreSQL', detected_at: '2024-08-15' },
        { category: 'Database', technology: 'Redis', detected_at: '2024-08-15' },
        { category: 'Blockchain', technology: 'Ethereum', detected_at: '2024-08-15' },
        { category: 'Payments', technology: 'Stripe', detected_at: '2024-08-15' },
      ],

      funding_rounds: [
        {
          round_type: 'Seed',
          amount: 2000000,
          currency: 'GBP',
          announced_date: '2020-09-15',
          investors: ['Fintech Ventures', 'Seedcamp'],
        },
        {
          round_type: 'Series A',
          amount: 12000000,
          currency: 'GBP',
          announced_date: '2023-01-20',
          investors: ['Accel', 'Index Ventures', 'Stripe'],
        },
      ],
      total_funding: { amount: 14000000, currency: 'GBP' },

      industry: 'Financial Technology',
      sic_codes: ['64191', '64999'],
      description: 'Next-generation payment processing and financial automation platform for modern businesses. Provides API-first infrastructure for payments, invoicing, reconciliation, and financial reporting.',
      mission_statement: 'Democratizing access to financial infrastructure for businesses of all sizes.',
      value_proposition: 'Developer-friendly APIs, transparent pricing, and enterprise-grade reliability. 99.99% uptime SLA with sub-200ms latency globally.',
      business_model: 'B2B SaaS with transaction-based pricing. Platform fees plus usage-based charges. Mix of SMB (40%) and enterprise (60%) customers.',

      target_market: ['SaaS Companies', 'Marketplaces', 'E-commerce', 'Platform Businesses'],
      geographic_presence: ['United Kingdom', 'Ireland', 'European Union'],

      jurisdiction: 'England & Wales',
      last_updated: '2024-08-25T12:00:00Z',
    },

    buying_signals: [
      {
        signal_type: 'funding',
        priority: 'high',
        detected_date: '2023-01-20',
        confidence: 'high',
        title: '£12M Series A led by Accel',
        description: 'Raised significant Series A round from top-tier VCs including strategic investment from Stripe',
        source_url: 'https://fintech-demo.com/press/series-a',
        source_type: 'press_release',
        category: 'Funding',
        relevance_score: 0.95,
      },
      {
        signal_type: 'hiring',
        priority: 'high',
        detected_date: '2024-08-15',
        confidence: 'high',
        title: 'Massive hiring across engineering and sales',
        description: '25 open positions including VP of Sales, Senior Engineers, and Product Managers',
        source_url: 'https://fintech-demo.com/careers',
        source_type: 'job_posting',
        category: 'Growth Signal',
        relevance_score: 0.93,
        details: {
          job_postings_count: 25,
          departments: ['Engineering', 'Sales', 'Product', 'Compliance'],
          seniority_levels: ['VP', 'Senior', 'Lead'],
          job_titles: ['VP of Sales', 'Senior Backend Engineer', 'Product Manager'],
          posted_within_days: 30,
        },
      },
      {
        signal_type: 'expansion',
        priority: 'high',
        detected_date: '2024-06-01',
        confidence: 'high',
        title: 'Dublin office opening for EU expansion',
        description: 'New European headquarters in Dublin to serve EU market and navigate post-Brexit landscape',
        source_url: 'https://fintech-demo.com/press/dublin-expansion',
        source_type: 'press_release',
        category: 'Market Expansion',
        relevance_score: 0.89,
        details: {
          expansion_type: 'new_office',
          location: 'Dublin, Ireland',
          announced_date: '2024-06-01',
          press_release_url: 'https://fintech-demo.com/press/dublin-expansion',
        },
      },
      {
        signal_type: 'product_launch',
        priority: 'high',
        detected_date: '2024-07-10',
        confidence: 'high',
        title: 'Launch of embedded finance platform',
        description: 'New white-label embedded finance solution allowing SaaS platforms to offer financial products',
        source_url: 'https://fintech-demo.com/products/embedded-finance',
        source_type: 'company_website',
        category: 'Product Innovation',
        relevance_score: 0.91,
      },
      {
        signal_type: 'leadership_change',
        priority: 'medium',
        detected_date: '2024-05-15',
        confidence: 'high',
        title: 'Former Stripe executive joins as COO',
        description: 'Hired COO from Stripe to scale operations and go-to-market',
        source_url: 'https://linkedin.com/in/alex-wilson-coo',
        source_type: 'linkedin',
        category: 'Leadership',
        relevance_score: 0.84,
        details: {
          change_type: 'new_hire',
          person_name: 'Alex Wilson',
          role: 'Chief Operating Officer',
          department: 'Operations',
          announced_date: '2024-05-15',
        },
      },
    ],

    decision_makers: [
      {
        name: 'Priya Patel',
        job_title: 'Chief Executive Officer',
        department: 'Executive',
        seniority_level: 'C-level',
        linkedin_url: 'https://linkedin.com/in/priya-patel-fintech',

        background_summary: 'Serial entrepreneur with previous fintech exit. Former product leader at PayPal. MBA from Stanford GSB.',
        years_in_role: 4,
        previous_companies: ['PayPal', 'Square', 'Goldman Sachs'],

        reports_to: 'Board of Directors',
        team_size: 142,

        decision_influence: 'champion',
        influence_rationale: 'Visionary founder-CEO with strong conviction on product direction. Makes all strategic decisions. Highly respected in fintech community.',
        influence_score: 0.97,
        is_decision_maker: true,

        business_email: 'priya.patel@fintech-demo.com',
        business_phone: '+44 20 7987 6543',
        contact_source: 'Companies House',
        contact_verified_date: '2024-08-15',
        appointed_date: '2020-07-01',
      },
      {
        name: 'Alex Wilson',
        job_title: 'Chief Operating Officer',
        department: 'Operations',
        seniority_level: 'C-level',
        linkedin_url: 'https://linkedin.com/in/alex-wilson-coo',

        background_summary: 'Former Stripe operations leader with deep expertise in scaling fintech infrastructure. Led Stripe EMEA expansion.',
        years_in_role: 0.25,
        previous_companies: ['Stripe', 'Adyen', 'Amazon'],

        reports_to: 'Priya Patel',
        team_size: 65,

        decision_influence: 'influencer',
        influence_rationale: 'New hire with mandate to scale operations. Key influencer on infrastructure and vendor decisions.',
        influence_score: 0.89,
        is_decision_maker: true,

        business_email: 'alex.wilson@fintech-demo.com',
        contact_source: 'Company website',
        contact_verified_date: '2024-08-15',
        appointed_date: '2024-05-15',
      },
      {
        name: 'Tom Bradford',
        job_title: 'Chief Technology Officer',
        department: 'Engineering',
        seniority_level: 'C-level',
        linkedin_url: 'https://linkedin.com/in/tom-bradford-cto',

        background_summary: 'Technical co-founder with deep expertise in payment systems and distributed systems. Former Google engineer.',
        years_in_role: 4,
        previous_companies: ['Google', 'TransferWise'],

        reports_to: 'Priya Patel',
        team_size: 72,

        decision_influence: 'influencer',
        influence_rationale: 'Technical co-founder who drives all technology decisions. High bar for engineering tools and infrastructure.',
        influence_score: 0.92,
        is_decision_maker: true,

        business_email: 'tom.bradford@fintech-demo.com',
        contact_source: 'Companies House',
        contact_verified_date: '2024-08-15',
        appointed_date: '2020-07-01',
      },
      {
        name: 'Rachel Kumar',
        job_title: 'VP of Engineering',
        department: 'Engineering',
        seniority_level: 'VP',
        linkedin_url: 'https://linkedin.com/in/rachel-kumar-vp',

        background_summary: 'Engineering leader from Monzo with expertise in regulated fintech systems. Strong focus on reliability and security.',
        years_in_role: 2,
        previous_companies: ['Monzo', 'Revolut', 'Citrix'],

        reports_to: 'Tom Bradford',
        team_size: 55,

        decision_influence: 'influencer',
        influence_rationale: 'Manages majority of engineering team. Influences day-to-day tooling and development decisions.',
        influence_score: 0.78,
        is_decision_maker: false,

        appointed_date: '2022-03-01',
      },
    ],

    revenue_signals: [
      {
        metric_type: 'revenue',
        value: 18500000,
        unit: 'GBP',
        time_period: '2024 (projected)',
        source: 'Series A pitch deck',
        source_url: 'https://fintech-demo.com/investors',
        confidence_level: 'high',
        published_date: '2023-01-20',
        signal_type: 'projection',
        positive: true,
        description: '65% YoY revenue growth driven by enterprise customer wins and product expansion',
      },
      {
        metric_type: 'revenue',
        value: 14200000,
        unit: 'GBP',
        time_period: 'FY 2023-24',
        source: 'Companies House filing',
        source_url: 'https://find-and-update.company-information.service.gov.uk/company/12345678',
        confidence_level: 'high',
        published_date: '2024-06-30',
        signal_type: 'actual',
        positive: true,
      },
      {
        metric_type: 'customer_growth',
        value: 850,
        unit: 'business customers',
        time_period: 'Q2 2024',
        source: 'Company blog',
        source_url: 'https://fintech-demo.com/blog/customer-milestone',
        confidence_level: 'high',
        published_date: '2024-07-30',
        signal_type: 'milestone',
        positive: true,
        description: '850+ businesses now using the platform, processing £2B+ annually',
      },
      {
        metric_type: 'market_share',
        value: 8,
        unit: 'percent UK SMB market',
        time_period: '2024',
        source: 'Industry analyst report',
        source_url: 'https://fintechinsights.com/uk-payment-platforms-2024',
        confidence_level: 'medium',
        published_date: '2024-08-01',
        signal_type: 'analysis',
        positive: true,
        description: 'Estimated 8% market share of UK SMB payment processing, growing rapidly',
      },
    ],

    recommended_approach: {
      recommended_contact_id: 'demo-dm-fintech-001',
      recommended_contact_name: 'Alex Wilson',
      contact_rationale: 'As the new COO from Stripe, Alex has a fresh mandate to evaluate and optimize operations. In first 6 months, likely actively reviewing tech stack and vendor relationships. His Stripe background means familiarity with best-in-class tooling.',

      approach_summary: 'FinTech Innovations is in hyper-growth mode with exceptional momentum. The £12M Series A, Dublin expansion, and 25 open roles indicate significant scaling challenges ahead. New COO from Stripe brings both expertise and urgency to operationalize growth.\n\nKey leverage: Embedded finance product launch creates new infrastructure needs. 850+ customers processing £2B means reliability and scale are critical. Stripe investor and COO hire suggest strategic alignment with modern fintech stack.',
      key_talking_points: [
        'Support for hyper-growth scaling (65% revenue growth, 142 employees)',
        'Enterprise-grade reliability and compliance',
        'Multi-region infrastructure (London + Dublin)',
        'Developer experience and API-first integration',
        'Financial services regulatory compliance (FCA, PSD2)',
      ],

      timing_suggestion: {
        urgency: 'immediate',
        rationale: 'New COO in first 90 days is actively evaluating operations. Dublin office launch requires infrastructure decisions. 25 open engineering roles suggest immediate capacity needs. Embedded finance launch requires supporting systems.',
        optimal_time: 'Immediately - COO onboarding window',
      },

      conversation_starters: [
        {
          opener: 'Congratulations on bringing Alex Wilson from Stripe as your COO. That\'s a phenomenal hire!',
          signal_reference: 'COO hire',
          value_proposition: 'Alex probably has high standards from Stripe. We work with several Stripe alumni who appreciate our [reliability/developer experience/scalability]. We helped a similar fintech reduce deployment time from 2 hours to 8 minutes.',
        },
        {
          opener: 'Saw the embedded finance platform launch. That\'s a huge market opportunity!',
          signal_reference: 'Product launch',
          value_proposition: 'White-label platforms often need robust [monitoring/testing/deployment] infrastructure. We\'ve helped embedded finance platforms achieve 99.99% uptime while shipping 20+ deploys per day.',
        },
        {
          opener: 'Congratulations on the Dublin expansion. Strategic move for EU market access.',
          signal_reference: 'Dublin office',
          value_proposition: 'Multi-region infrastructure creates [latency/compliance/data residency] challenges. We helped a similar fintech reduce EU latency by 65% while maintaining FCA/GDPR compliance.',
        },
      ],

      reasoning: {
        signals_considered: [
          '£12M Series A provides significant budget for growth investments',
          'New COO from Stripe indicates infrastructure evaluation period',
          '25 open roles (especially VP Sales) suggests GTM acceleration',
          'Dublin expansion creates multi-region infrastructure needs',
          'Embedded finance launch requires new technical capabilities',
          '850+ customers processing £2B demands enterprise reliability',
        ],
        decision_maker_factors: [
          'CEO Priya Patel has final approval but delegates operational decisions',
          'New COO Alex Wilson has mandate to optimize operations (90-day window)',
          'CTO Tom Bradford has high technical standards from Google/TransferWise',
          'All three C-level executives have fintech pedigree and understand modern tooling',
        ],
        risk_factors: [
          'COO from Stripe might have strong vendor preferences',
          'Hyper-growth can create decision paralysis',
          'Regulatory compliance requirements might slow vendor approvals',
          'Recent fundraise might mean existing vendor commitments',
        ],
      },
    },

    sources: {
      total_sources: 15,
      sources: [
        {
          url: 'https://find-and-update.company-information.service.gov.uk/company/12345678',
          title: 'FinTech Innovations Ltd - Companies House',
          published_date: '2024-06-30',
          accessed_date: '2024-08-25',
          source_type: 'companies_house',
          reliability_score: 1.0,
          domain: 'companieshouse.gov.uk',
        },
        {
          url: 'https://fintech-demo.com/press/series-a',
          title: 'FinTech Innovations Raises £12M Series A',
          published_date: '2023-01-20',
          accessed_date: '2024-08-25',
          source_type: 'press_release',
          reliability_score: 0.98,
          domain: 'fintech-demo.com',
        },
        {
          url: 'https://fintech-demo.com/press/dublin-expansion',
          title: 'FinTech Innovations Opens Dublin Office',
          published_date: '2024-06-01',
          accessed_date: '2024-08-25',
          source_type: 'press_release',
          reliability_score: 0.96,
          domain: 'fintech-demo.com',
        },
        {
          url: 'https://fintech-demo.com/careers',
          title: 'Careers at FinTech Innovations',
          published_date: null,
          accessed_date: '2024-08-25',
          source_type: 'job_posting',
          reliability_score: 0.90,
          domain: 'fintech-demo.com',
        },
        {
          url: 'https://fintech-demo.com/products/embedded-finance',
          title: 'Embedded Finance Platform',
          published_date: '2024-07-10',
          accessed_date: '2024-08-25',
          source_type: 'company_website',
          reliability_score: 0.92,
          domain: 'fintech-demo.com',
        },
        {
          url: 'https://fintech-demo.com/blog/customer-milestone',
          title: 'Celebrating 850+ Business Customers',
          published_date: '2024-07-30',
          accessed_date: '2024-08-25',
          source_type: 'company_website',
          reliability_score: 0.89,
          domain: 'fintech-demo.com',
        },
        {
          url: 'https://linkedin.com/company/fintech-innovations',
          title: 'FinTech Innovations | LinkedIn',
          published_date: null,
          accessed_date: '2024-08-25',
          source_type: 'linkedin',
          reliability_score: 0.85,
          domain: 'linkedin.com',
        },
        {
          url: 'https://linkedin.com/in/priya-patel-fintech',
          title: 'Priya Patel - CEO at FinTech Innovations',
          published_date: null,
          accessed_date: '2024-08-25',
          source_type: 'linkedin',
          reliability_score: 0.85,
          domain: 'linkedin.com',
        },
        {
          url: 'https://linkedin.com/in/alex-wilson-coo',
          title: 'Alex Wilson - COO at FinTech Innovations',
          published_date: '2024-05-15',
          accessed_date: '2024-08-25',
          source_type: 'linkedin',
          reliability_score: 0.85,
          domain: 'linkedin.com',
        },
        {
          url: 'https://techcrunch.com/2023/01/20/fintech-innovations-series-a',
          title: 'FinTech Innovations Raises £12M to Build Payment Infrastructure',
          published_date: '2023-01-20',
          accessed_date: '2024-08-25',
          source_type: 'news_article',
          reliability_score: 0.93,
          domain: 'techcrunch.com',
        },
        {
          url: 'https://fintechinsights.com/uk-payment-platforms-2024',
          title: 'UK Payment Platforms Market Analysis 2024',
          published_date: '2024-08-01',
          accessed_date: '2024-08-25',
          source_type: 'industry_report',
          reliability_score: 0.84,
          domain: 'fintechinsights.com',
        },
        {
          url: 'https://builtwith.com/fintech-demo.com',
          title: 'FinTech Innovations Technology Stack',
          published_date: null,
          accessed_date: '2024-08-25',
          source_type: 'industry_report',
          reliability_score: 0.78,
          domain: 'builtwith.com',
        },
        {
          url: 'https://crunchbase.com/organization/fintech-innovations',
          title: 'FinTech Innovations - Crunchbase',
          published_date: null,
          accessed_date: '2024-08-25',
          source_type: 'industry_report',
          reliability_score: 0.82,
          domain: 'crunchbase.com',
        },
        {
          url: 'https://fintech-demo.com/about/team',
          title: 'Leadership Team',
          published_date: null,
          accessed_date: '2024-08-25',
          source_type: 'company_website',
          reliability_score: 0.90,
          domain: 'fintech-demo.com',
        },
        {
          url: 'https://www.fca.org.uk/firms/authorised-payment-institutions',
          title: 'FCA Authorized Payment Institutions Register',
          published_date: '2024-08-15',
          accessed_date: '2024-08-25',
          source_type: 'financial_filing',
          reliability_score: 1.0,
          domain: 'fca.org.uk',
        },
      ],
      sources_by_type: {
        companies_house: 1,
        press_release: 3,
        company_website: 4,
        linkedin: 3,
        job_posting: 1,
        news_article: 1,
        industry_report: 3,
        financial_filing: 1,
      },
    },
  },

  metadata: {
    generated_at: '2024-08-25T12:00:00Z',
    cached_until: '2024-09-01T12:00:00Z',
    generation_time_ms: 26700,
    cache_age: 'Just now',
    can_refresh: false,
  },
};

// ============================================================================
// EXPORTS - All Demo Research Reports
// ============================================================================

export const demoResearchReports = {
  'demo-1': demoResearchReportTechHub,
  'demo-2': demoResearchReportGreenEnergy,
  'demo-4': demoResearchReportFinTech,
};

export const demoResearchReportsList = [
  demoResearchReportTechHub,
  demoResearchReportGreenEnergy,
  demoResearchReportFinTech,
];
