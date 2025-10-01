# Data Model: ResearchGPT™

**Feature**: ResearchGPT™ - Deep Company Intelligence
**Date**: 2025-10-01
**Source**: Extracted from [spec.md](./spec.md) Key Entities section

---

## Entity Relationship Overview

```
User (profiles)
  └── 1:N → ResearchReport
             ├── 1:6 → ResearchSection (6 mandatory sections)
             ├── 1:N → ResearchSource (10+ sources per report)
             └── 1:1 → ResearchQuota

Business (businesses)
  └── 1:N → ResearchReport
```

---

## Core Entities

### 1. ResearchReport

**Purpose**: Main intelligence document containing all 6 research sections

**Table**: `research_reports`

**Fields**:
```typescript
interface ResearchReport {
  id: string;                    // UUID, primary key
  user_id: string;               // FK to profiles (who requested)
  company_id: string;            // FK to businesses (subject company)
  company_name: string;          // Denormalized for performance
  company_number: string;        // Companies House number
  status: ReportStatus;          // pending | generating | complete | failed
  confidence_score: number;      // 0-1, overall report quality
  generated_at: timestamp;       // When report was created
  cached_until: timestamp;       // Smart cache expiration
  sections_complete: number;     // 0-6, how many sections succeeded
  total_sources: number;         // Count of sources cited
  metadata: {
    generation_time_ms: number;  // Performance tracking
    api_calls_made: number;      // Cost tracking
    cache_hit: boolean;          // Was cached data used?
    force_refresh: boolean;      // Did user force refresh?
  };
  created_at: timestamp;
  updated_at: timestamp;
}

type ReportStatus = 'pending' | 'generating' | 'complete' | 'failed' | 'partial';
```

**Indexes**:
- `idx_research_reports_user_id` (for user's report history)
- `idx_research_reports_company_id` (for company research history)
- `idx_research_reports_status` (for monitoring)
- `idx_research_reports_cached_until` (for cache invalidation)

**RLS Policies**:
```sql
-- Users can only see their own research reports
CREATE POLICY "Users can view own research"
  ON research_reports FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own research"
  ON research_reports FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

**Validation Rules** (from FR-001, FR-002):
- Must include 6 sections (enforced by FK constraint)
- company_id must reference valid business
- user_id must reference valid profile
- status transitions: pending → generating → (complete | failed | partial)

**State Transitions**:
```
pending
  ↓ (API request initiated)
generating
  ↓ (all sections complete)
complete
  ↓ (some sections failed)
partial
  ↓ (all sections failed)
failed
```

---

### 2. ResearchSection

**Purpose**: One of 6 mandatory sections in a research report

**Table**: `research_sections`

**Fields**:
```typescript
interface ResearchSection {
  id: string;                         // UUID, primary key
  report_id: string;                  // FK to research_reports
  section_type: SectionType;          // Which of 6 sections
  content: SectionContent;            // JSONB, section-specific structure
  confidence: ConfidenceLevel;        // high | medium | low
  sources_count: number;              // How many sources cited
  cached_at: timestamp;               // When this section was cached
  expires_at: timestamp;              // Cache expiration (7d or 6h)
  generation_time_ms: number;         // Performance tracking
  error_message: string | null;       // If section failed
  created_at: timestamp;
  updated_at: timestamp;
}

type SectionType =
  | 'snapshot'           // Company fundamentals (FR-006 to FR-010)
  | 'buying_signals'     // Hiring, expansion, funding (FR-011 to FR-016)
  | 'decision_makers'    // Key people (FR-017 to FR-021)
  | 'revenue_signals'    // Financial performance (FR-022 to FR-025)
  | 'recommended_approach' // AI-generated strategy (FR-026 to FR-029)
  | 'sources';           // Source verification (FR-030 to FR-033)

type ConfidenceLevel = 'high' | 'medium' | 'low';

// Section-specific content structures (JSONB)
type SectionContent =
  | CompanySnapshot
  | BuyingSignal[]
  | DecisionMaker[]
  | RevenueSignal[]
  | RecommendedApproach
  | SourcesList;
```

**Indexes**:
- `idx_research_sections_report_id` (for fetching all sections)
- `idx_research_sections_type_expires` (for cache invalidation)
- `idx_research_sections_confidence` (for quality monitoring)

**Validation Rules** (from FR-002):
- Each report MUST have exactly 6 sections (one per section_type)
- section_type must be unique per report_id
- expires_at = cached_at + (7 days if snapshot, 6 hours otherwise)

**Cache Strategy** (from FR-042):
```typescript
const getCacheExpiration = (sectionType: SectionType): number => {
  if (sectionType === 'snapshot') {
    return 7 * 24 * 60 * 60 * 1000; // 7 days for static data
  }
  return 6 * 60 * 60 * 1000; // 6 hours for dynamic signals
};
```

---

### 3. CompanySnapshot

**Purpose**: Company fundamentals section (FR-006 to FR-010)

**Stored In**: `research_sections.content` where `section_type = 'snapshot'`

**Structure**:
```typescript
interface CompanySnapshot {
  // FR-006: Basic information
  founded_year: number;
  company_type: string;              // e.g., "Private limited company"
  company_status: string;            // e.g., "Active", "Dissolved"

  // FR-007: Employee metrics
  employee_count: number;
  employee_growth_yoy: number;       // Percentage
  employee_growth_trend: 'growing' | 'stable' | 'declining';

  // FR-008: Financial estimates
  revenue_estimate: {
    amount: number | null;
    currency: string;
    confidence: ConfidenceLevel;
    last_filed_accounts?: {
      date: string;
      revenue: number;
    };
  };

  // FR-009: Technology stack
  tech_stack: {
    category: string;                // e.g., "CRM", "Analytics"
    technology: string;              // e.g., "Salesforce", "Google Analytics"
    detected_at: string;
  }[];

  // FR-010: Funding history
  funding_rounds: {
    round_type: string;              // Series A/B/C, Seed
    amount: number;
    currency: string;
    announced_date: string;
    investors: string[];
  }[];

  // Additional context
  industry: string;
  sic_codes: string[];
  headquarters: {
    city: string;
    country: string;
    address: string;
  };
}
```

**Validation Rules**:
- founded_year must be > 1800 and <= current_year
- employee_count must be >= 0
- company_status must be from Companies House enum

---

### 4. BuyingSignal

**Purpose**: Indicator that company is in buying mode (FR-011 to FR-016)

**Stored In**: `research_sections.content` where `section_type = 'buying_signals'`

**Structure**:
```typescript
interface BuyingSignal {
  signal_type: SignalType;
  priority: 'high' | 'medium' | 'low';  // FR-016
  detected_date: string;
  confidence: ConfidenceLevel;
  description: string;
  source_url: string;
  source_type: string;

  // Type-specific data
  details: HiringSignal | ExpansionSignal | LeadershipSignal | TechSignal;
}

type SignalType =
  | 'hiring'           // FR-011
  | 'expansion'        // FR-012
  | 'leadership'       // FR-013
  | 'tech_change'      // FR-014
  | 'social_sentiment'; // FR-015

interface HiringSignal {
  job_postings_count: number;
  departments: string[];              // e.g., ["Engineering", "Sales"]
  seniority_levels: string[];        // e.g., ["Senior", "Lead"]
  job_titles: string[];
  posted_within_days: number;
}

interface ExpansionSignal {
  expansion_type: 'new_office' | 'market_entry' | 'acquisition';
  location: string;
  announced_date: string;
  press_release_url: string;
}

interface LeadershipSignal {
  change_type: 'new_hire' | 'promotion' | 'departure';
  person_name: string;
  role: string;
  department: string;
  announced_date: string;
}

interface TechSignal {
  technology: string;
  change_type: 'adoption' | 'migration' | 'expansion';
  detected_from: string;             // e.g., "Job posting requirements"
}
```

**Validation Rules** (from FR-011 to FR-016):
- detected_date must be within last 90 days (freshness)
- priority based on signal_type and recency
- confidence based on source reliability

**Priority Algorithm**:
```typescript
const calculatePriority = (signal: BuyingSignal): 'high' | 'medium' | 'low' => {
  const age_days = daysSince(signal.detected_date);

  if (signal.signal_type === 'hiring' && age_days < 7 && signal.details.job_postings_count > 5) {
    return 'high';
  }
  if (signal.signal_type === 'expansion' && age_days < 30) {
    return 'high';
  }
  if (age_days > 60) {
    return 'low';
  }
  return 'medium';
};
```

---

### 5. DecisionMaker

**Purpose**: Key person at company who influences purchasing (FR-017 to FR-021)

**Stored In**: `research_sections.content` where `section_type = 'decision_makers'`

**Structure**:
```typescript
interface DecisionMaker {
  // FR-018: Core information
  name: string;
  job_title: string;
  department: string;
  seniority_level: 'C-level' | 'VP' | 'Director' | 'Manager' | 'IC';
  linkedin_url: string | null;

  // FR-018: Background summary
  background_summary: string;        // AI-generated summary
  years_in_role: number | null;
  previous_companies: string[];

  // FR-019: Reporting structure
  reports_to: string | null;         // Name of manager
  team_size: number | null;

  // FR-020: Champion identification
  decision_influence: 'champion' | 'influencer' | 'blocker' | 'neutral' | 'unknown';
  influence_rationale: string;       // Why classified this way

  // FR-021, FR-021a, FR-021b: Contact info (GDPR-compliant)
  business_email: string | null;     // Only if from official source
  business_phone: string | null;     // Only if from official source
  contact_source: string;            // Where contact info found
  contact_verified_date: string;

  // FR-021c: GDPR removal tracking
  removal_requested: boolean;
  removal_date: string | null;
}
```

**Validation Rules** (from FR-021 series):
- business_email MUST be company domain (not personal)
- contact_source MUST be official (company website or press release)
- If removal_requested = true, anonymize fields except role/title
- Auto-delete personal data after 6 months (NFR-008)

**GDPR Compliance**:
```typescript
const anonymizeDecisionMaker = (dm: DecisionMaker): DecisionMaker => {
  return {
    ...dm,
    name: `[Anonymized ${dm.job_title}]`,
    linkedin_url: null,
    business_email: null,
    business_phone: null,
    background_summary: `${dm.job_title} at company`,
    previous_companies: [],
  };
};
```

---

### 6. RevenueSignal

**Purpose**: Financial performance indicators (FR-022 to FR-025)

**Stored In**: `research_sections.content` where `section_type = 'revenue_signals'`

**Structure**:
```typescript
interface RevenueSignal {
  metric_type: MetricType;
  value: number | string;
  unit: string;                      // e.g., "%", "£", "customers"
  time_period: string;               // e.g., "Q3 2024", "YoY"
  source: string;
  source_url: string;
  confidence_level: ConfidenceLevel;
  published_date: string;
}

type MetricType =
  | 'customer_growth'     // FR-022
  | 'revenue'             // FR-023
  | 'profitability'       // FR-023
  | 'market_share'        // FR-025
  | 'competitive_position'; // FR-025

// Example instances
const examples: RevenueSignal[] = [
  {
    metric_type: 'customer_growth',
    value: 150,
    unit: '%',
    time_period: 'YoY 2024',
    source: 'Press Release',
    source_url: 'https://...',
    confidence_level: 'high',
    published_date: '2024-09-15'
  },
  {
    metric_type: 'market_share',
    value: 'Market leader in UK fintech',
    unit: 'qualitative',
    time_period: '2024',
    source: 'Industry Report',
    confidence_level: 'medium',
  }
];
```

**Validation Rules** (from FR-022 to FR-025):
- published_date must be within last 2 years
- confidence based on source reliability
- numeric values must have units

**Benchmark Comparison** (FR-024):
```typescript
interface BenchmarkComparison {
  metric: string;
  company_value: number;
  industry_average: number;
  percentile: number;              // Where company ranks
  interpretation: string;          // e.g., "Above average growth"
}
```

---

### 7. RecommendedApproach

**Purpose**: AI-generated outreach strategy (FR-026 to FR-029)

**Stored In**: `research_sections.content` where `section_type = 'recommended_approach'`

**Structure**:
```typescript
interface RecommendedApproach {
  // FR-027: Best contact person
  recommended_contact_id: string;    // FK to DecisionMaker
  recommended_contact_name: string;
  contact_rationale: string;         // Why this person

  // FR-026: Personalized strategy
  approach_summary: string;          // 2-3 paragraph recommendation
  key_talking_points: string[];      // Bullet points for conversation

  // FR-028: Timing recommendation
  timing_suggestion: {
    urgency: 'immediate' | 'within_week' | 'within_month' | 'monitor';
    rationale: string;
    optimal_time: string;            // e.g., "Next quarter when hiring ramps up"
  };

  // FR-029: Conversation starters
  conversation_starters: {
    opener: string;
    signal_reference: string;        // Which buying signal to mention
    value_proposition: string;
  }[];

  // AI reasoning transparency
  reasoning: {
    signals_considered: string[];
    decision_maker_factors: string[];
    risk_factors: string[];
  };
}
```

**Validation Rules** (from FR-026 to FR-029):
- recommended_contact_id must reference a DecisionMaker in same report
- approach_summary must be 100-500 words
- Must reference at least 1 buying signal

---

### 8. Source

**Purpose**: Verified reference for research data (FR-030 to FR-033)

**Table**: `research_sources`

**Fields**:
```typescript
interface Source {
  id: string;                        // UUID, primary key
  report_id: string;                 // FK to research_reports
  section_type: SectionType | 'multiple'; // Which section(s) cite this

  // FR-031: Source details
  url: string;
  title: string;
  published_date: string | null;     // FR-032
  accessed_date: string;             // When we fetched it

  // FR-030: Source type classification
  source_type: SourceType;
  reliability_score: number;         // 0-1, FR-033

  // Metadata
  domain: string;                    // Extracted from URL
  content_snippet: string;           // Excerpt used in report

  created_at: timestamp;
}

type SourceType =
  | 'companies_house'      // Official government data
  | 'press_release'        // Company announcements
  | 'news_article'         // Journalism
  | 'company_website'      // Official company pages
  | 'job_posting'          // Hiring signals
  | 'linkedin'             // Professional profiles
  | 'financial_filing'     // Annual reports
  | 'industry_report'      // Market research
  | 'social_media';        // Twitter, etc.
```

**Indexes**:
- `idx_research_sources_report_id` (for fetching all sources)
- `idx_research_sources_domain` (for reliability tracking)

**Validation Rules** (from FR-030 to FR-033):
- Each report must have >= 10 sources (FR-030)
- url must be valid HTTP(S) URL (FR-031)
- reliability_score based on source_type and domain

**Reliability Scoring**:
```typescript
const calculateReliability = (source: Source): number => {
  const baseScores = {
    companies_house: 1.0,
    financial_filing: 0.95,
    press_release: 0.85,
    news_article: 0.75,
    company_website: 0.70,
    job_posting: 0.65,
    industry_report: 0.60,
    linkedin: 0.50,
    social_media: 0.30,
  };

  let score = baseScores[source.source_type];

  // Reduce score for old sources
  const age_days = daysSince(source.published_date);
  if (age_days > 365) score *= 0.8;
  if (age_days > 730) score *= 0.6;

  return score;
};
```

---

### 9. UserResearchQuota

**Purpose**: Track user's monthly research limit (FR-041)

**Table**: `user_research_quotas`

**Fields**:
```typescript
interface UserResearchQuota {
  user_id: string;                   // PK, FK to profiles
  period_start: timestamp;           // Start of current month
  period_end: timestamp;             // End of current month
  researches_used: number;           // Current usage
  researches_limit: number;          // Quota limit (default 100)
  tier: 'free' | 'standard' | 'premium';

  // FR-041b: Notification tracking
  notification_90_percent_sent: boolean;
  notification_100_percent_sent: boolean;

  created_at: timestamp;
  updated_at: timestamp;
}
```

**Validation Rules** (from FR-041):
- researches_limit = 100 for standard tier
- researches_used <= researches_limit (enforced before creating report)
- period resets monthly

**Quota Check**:
```typescript
const checkQuota = async (userId: string): Promise<boolean> => {
  const quota = await getQuota(userId);

  // FR-041b: Notify at 90%
  if (quota.researches_used >= quota.researches_limit * 0.9 &&
      !quota.notification_90_percent_sent) {
    await sendQuotaWarning(userId, 90);
  }

  return quota.researches_used < quota.researches_limit;
};
```

---

## Database Migrations

**File**: `supabase/migrations/YYYYMMDD_research_gpt_schema.sql`

**Migration includes**:
1. Create `research_reports` table with RLS
2. Create `research_sections` table with RLS
3. Create `research_sources` table with RLS
4. Create `user_research_quotas` table with RLS
5. Create indexes for performance
6. Create triggers for cache invalidation
7. Create function for quota enforcement
8. Create function for automatic anonymization (6-month cleanup)

---

## State Machine: Research Report Lifecycle

```
[User clicks "Research with AI"]
  ↓
pending → Check quota → If exceeded: reject
  ↓
generating → Fetch Companies House
  ↓
generating → Parallel: Fetch news, jobs, website
  ↓
generating → Generate 6 sections with AI
  ↓
complete (6/6 sections) OR partial (1-5 sections) OR failed (0 sections)
  ↓
[Cache for 7d/6h based on section]
  ↓
[Auto-anonymize after 6 months]
```

---

## JSONB Schema Validation

All JSONB content fields should be validated with Zod schemas:

```typescript
// Example for BuyingSignal validation
import { z } from 'zod';

const BuyingSignalSchema = z.object({
  signal_type: z.enum(['hiring', 'expansion', 'leadership', 'tech_change', 'social_sentiment']),
  priority: z.enum(['high', 'medium', 'low']),
  detected_date: z.string().datetime(),
  confidence: z.enum(['high', 'medium', 'low']),
  description: z.string().min(10).max(500),
  source_url: z.string().url(),
  source_type: z.string(),
  details: z.union([
    HiringSignalSchema,
    ExpansionSignalSchema,
    LeadershipSignalSchema,
    TechSignalSchema,
  ]),
});
```

---

**Data Model Status**: ✅ COMPLETE - Ready for contracts generation
