# oppSpot → Deal Intelligence Platform Transformation Roadmap

**Version:** 1.0
**Date:** October 2025
**Timeline:** 12-18 Months
**Target:** Corporate Development Teams

---

## 🎯 Vision

Transform oppSpot into the **#1 AI-powered deal intelligence platform** for corporate development teams to scout, validate, and execute on M&A, PE, VC, and strategic partnership opportunities using comprehensive due diligence frameworks.

---

## 📊 Current State Assessment

### ✅ Strong Foundation (Already Built)

Your platform already has exceptional capabilities:

- **Opp Scan Engine** - Target identification and scoring
- **Data Rooms** - Due diligence document management with AI analysis
- **ResearchGPT™** - Company intelligence generation (<30 seconds)
- **Risk Assessment** - Multi-dimensional risk scoring
- **Valuation Models** - DCF, comparable company analysis
- **Multi-Agent System** - AI orchestration infrastructure
- **Streams** - Collaborative deal workspaces
- **Lead Scoring** - BANT, MEDDIC frameworks
- **Buying Signals** - 10+ signal types with confidence scoring
- **Stakeholder Tracking** - Engagement and relationship management

### 🔨 Transformation Priorities

- **Deal Pipeline Management** - Currently missing, critical for deal tracking
- **Enhanced DD Frameworks** - Expand to all 4 frameworks (Strategic, Financial, Operational, Commercial)
- **Deal Execution Tools** - LOI, term sheets, closing checklists
- **Deal Comparison** - Multi-deal analysis and portfolio management
- **Predictive Analytics** - AI-powered deal success prediction

---

## 🗓️ 12-18 Month Roadmap

---

## **Phase 1: Foundation & Rebranding** (Months 1-3)

### 1.1 Platform Rebranding

**Goal:** Position as deal intelligence platform

**Tasks:**
- [ ] Update branding: "oppSpot Deal Intelligence Platform"
- [ ] Rewrite homepage with deal-centric messaging
- [ ] Update navigation:
  - "Search" → "Deal Sourcing"
  - "Opp Scan" → "Target Scanner"
  - Add "Deal Pipeline" section
  - Add "Deal Validation" section
- [ ] Create deal-focused onboarding flow
- [ ] Add landing pages for each deal type (M&A, PE, VC, Partnerships)

**Files to Modify:**
- `app/page.tsx` - Homepage
- `components/layout/navbar.tsx` - Navigation
- `CLAUDE.md` - Project description
- `README.md` - Project overview

---

### 1.2 Deal Pipeline Management ⭐ NEW CORE FEATURE

**Goal:** Track deals from sourcing → execution → closure

**New Features:**

#### A. Deal Pipeline View
- Kanban board with customizable stages
- Default stages: Sourcing → Screening → LOI → DD → Negotiation → Closing → Post-Close
- Drag-and-drop deal cards
- Stage-specific metrics and KPIs
- Filter by deal type, size, team member, date range

#### B. Deal Record (Central Deal Profile)
- Deal overview (type, size, stage, team, timeline)
- Quick links to:
  - Target research (ResearchGPT)
  - Data room
  - Valuation models
  - Due diligence reports
- Activity timeline
- Deal health score (0-100)
- Team collaboration area

#### C. Pipeline Analytics Dashboard
- Funnel metrics (conversion rates by stage)
- Average time in stage
- Deal velocity trends
- Win/loss analysis
- Resource allocation view

**New Database Tables:**
```sql
-- Core deal tracking
CREATE TABLE deals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  deal_type TEXT NOT NULL CHECK (deal_type IN ('ma', 'pe', 'vc', 'partnership')),
  stage TEXT NOT NULL,
  target_company_id UUID REFERENCES businesses(id),
  acquirer_company_id UUID REFERENCES businesses(id),
  deal_value NUMERIC(15, 2),
  currency TEXT DEFAULT 'GBP',
  probability INTEGER CHECK (probability BETWEEN 0 AND 100),
  expected_close_date DATE,
  actual_close_date DATE,
  deal_health_score INTEGER CHECK (deal_health_score BETWEEN 0 AND 100),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'on_hold', 'won', 'lost', 'archived')),
  owner_id UUID REFERENCES profiles(id),
  org_id UUID REFERENCES organizations(id),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stage tracking and analytics
CREATE TABLE deal_stages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
  stage TEXT NOT NULL,
  entered_at TIMESTAMPTZ DEFAULT NOW(),
  exited_at TIMESTAMPTZ,
  duration_days INTEGER,
  notes TEXT
);

-- Deal team
CREATE TABLE deal_team_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  role TEXT NOT NULL, -- lead, analyst, legal, finance, operations
  responsibilities TEXT[],
  joined_at TIMESTAMPTZ DEFAULT NOW()
);

-- Milestones and tasks
CREATE TABLE deal_milestones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
  milestone_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  completed_at TIMESTAMPTZ,
  owner_id UUID REFERENCES profiles(id),
  dependencies UUID[], -- Array of milestone IDs
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Deal notes and updates
CREATE TABLE deal_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
  author_id UUID REFERENCES profiles(id),
  content TEXT NOT NULL,
  note_type TEXT DEFAULT 'general', -- general, update, decision, risk
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**New Components:**
- `components/deals/pipeline-board.tsx` - Kanban view
- `components/deals/deal-card.tsx` - Deal card component
- `components/deals/deal-detail-page.tsx` - Main deal page
- `components/deals/deal-health-indicator.tsx` - Health score visualization
- `components/deals/pipeline-analytics.tsx` - Analytics dashboard
- `app/deals/page.tsx` - Pipeline page
- `app/deals/[id]/page.tsx` - Deal detail page

**Integration Points:**
- Link `acquisition_scans` → `deals` (auto-create deal from qualified targets)
- Link `data_rooms` → `deals` (one-to-one or one-to-many)
- Link `research_reports` → `deals` (via target_company_id)
- Sync deal stage with data room progress
- Update deal health based on DD completion

---

### 1.3 Enhanced Target Scoring

**Goal:** Score targets specifically for deal fit

**New Scoring Dimensions:**

#### A. Strategic Fit Score (0-100)
Factors:
- Market positioning alignment (25%)
- Product/service complementarity (20%)
- Customer base overlap/expansion (20%)
- Geographic expansion value (15%)
- Technology/IP strategic value (20%)

#### B. Integration Complexity Score
Rating: Easy / Medium / Hard / Very Hard

Factors:
- System compatibility
- Organizational culture fit
- Geographic distance
- Regulatory complexity
- Size differential
- Industry differences

#### C. Deal Attractiveness Matrix
- 2x2 matrix: Strategic Value (x-axis) vs. Integration Complexity (y-axis)
- Quadrants:
  - **High Value, Low Complexity** → "Quick Wins" (Pursue aggressively)
  - **High Value, High Complexity** → "Strategic Bets" (Plan carefully)
  - **Low Value, Low Complexity** → "Opportunistic" (Consider if cheap)
  - **Low Value, High Complexity** → "Avoid" (Pass)
- Visual plotting of all targets
- Filterable by deal type, size, industry

**New Database Columns:**
```sql
ALTER TABLE target_companies
ADD COLUMN strategic_fit_score INTEGER CHECK (strategic_fit_score BETWEEN 0 AND 100),
ADD COLUMN integration_complexity TEXT CHECK (integration_complexity IN ('easy', 'medium', 'hard', 'very_hard')),
ADD COLUMN deal_attractiveness_quadrant TEXT;
```

**New Components:**
- `components/scoring/strategic-fit-scorer.tsx`
- `components/scoring/integration-complexity-calculator.tsx`
- `components/visualization/deal-attractiveness-matrix.tsx`

**Leverage Existing:**
- `lib/ai/scoring/lead-scoring-service.ts` - Extend with new scorers
- `lib/ai/scoring/financial-health-scorer.ts` - Keep as-is
- `lib/ai/scoring/industry-alignment-scorer.ts` - Keep as-is

---

## **Phase 2: Due Diligence Frameworks** (Months 4-6)

### 2.1 Strategic Due Diligence Module

**Goal:** Validate strategic fit and synergy potential

**New Features:**

#### A. Synergy Analysis Wizard
Multi-step wizard to calculate and validate synergies:

**Step 1: Revenue Synergies**
- Cross-sell opportunities calculator
- Up-sell potential estimator
- Market expansion value
- Customer base expansion
- Pricing power improvement

**Step 2: Cost Synergies**
- Economies of scale calculator
- Redundancy elimination (headcount, facilities)
- Procurement leverage
- Process optimization
- Technology consolidation

**Step 3: Synergy Timeline**
- Year 1, 2, 3, 4, 5 projections
- Implementation costs per year
- Net synergy value (synergies - costs)
- Breakeven analysis

**Step 4: Risk Adjustment**
- Probability of realization (0-100%)
- Risk-adjusted synergy value
- Sensitivity analysis

#### B. Market Position Analyzer
- Competitive landscape mapping (visual)
- Market share impact modeling
- Porter's Five Forces analysis
- Customer concentration analysis
- Supplier power assessment

#### C. Strategic Fit Assessment
Questionnaire-based evaluation (20-30 questions):
- Vision/mission alignment
- Product roadmap compatibility
- Go-to-market synergy
- Brand positioning fit
- Technology strategy alignment

**New Database Tables:**
```sql
CREATE TABLE strategic_dd_assessments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
  overall_score INTEGER CHECK (overall_score BETWEEN 0 AND 100),
  strategic_rationale TEXT,
  key_risks TEXT[],
  recommendations TEXT,
  completed_by UUID REFERENCES profiles(id),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE synergy_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assessment_id UUID REFERENCES strategic_dd_assessments(id) ON DELETE CASCADE,
  synergy_type TEXT NOT NULL, -- revenue_cross_sell, revenue_upsell, cost_headcount, cost_procurement, etc.
  category TEXT NOT NULL, -- revenue, cost
  description TEXT NOT NULL,
  year_1_value NUMERIC(15, 2),
  year_2_value NUMERIC(15, 2),
  year_3_value NUMERIC(15, 2),
  year_4_value NUMERIC(15, 2),
  year_5_value NUMERIC(15, 2),
  probability_of_realization INTEGER CHECK (probability_of_realization BETWEEN 0 AND 100),
  implementation_cost NUMERIC(15, 2),
  risk_factors TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE market_position_analyses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assessment_id UUID REFERENCES strategic_dd_assessments(id) ON DELETE CASCADE,
  combined_market_share NUMERIC(5, 2),
  top_3_competitors JSONB, -- {name, market_share, threat_level}[]
  porters_five_forces JSONB, -- {buyer_power, supplier_power, threat_of_substitutes, threat_of_new_entrants, competitive_rivalry}
  market_concentration_hhi INTEGER, -- Herfindahl-Hirschman Index
  competitive_position TEXT, -- leader, challenger, follower, niche
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Components:**
- `app/deals/[id]/dd/strategic/page.tsx` - Strategic DD page
- `components/dd/strategic/synergy-wizard.tsx` - Synergy calculator
- `components/dd/strategic/market-position-analyzer.tsx`
- `components/dd/strategic/porters-five-forces.tsx`
- `components/dd/strategic/strategic-fit-questionnaire.tsx`

**Report Templates:**
- Strategic DD Executive Summary (PDF)
- Synergy Realization Plan (Excel)
- Competitive Analysis Report (PDF)

---

### 2.2 Financial Due Diligence Module

**Goal:** Deep financial validation beyond current valuation models

**Enhancements:**

#### A. Quality of Earnings Analysis
- Revenue quality assessment
  - Recurring vs. one-time revenue breakdown
  - Revenue concentration risk
  - Customer retention analysis
- EBITDA adjustments and normalization
  - Non-recurring items identification
  - Owner compensation adjustments
  - Related party transactions
- Working capital analysis
  - Working capital trends
  - Normalize working capital calculation
  - Cash flow impact
- Cash flow sustainability check
  - FCF vs. EBITDA comparison
  - Capex requirements
  - Cash conversion cycle

#### B. Debt Capacity Analysis
- Leverage ratio calculations (Debt/EBITDA)
- Debt service coverage ratio (DSCR)
- Interest coverage ratio
- Covenant compliance modeling
- Optimal capital structure recommendation
- Pro forma debt schedule

#### C. Financial Projection Validation
- Management forecast vs. market benchmarks
- Revenue driver analysis
  - Volume vs. price analysis
  - Customer acquisition trends
  - Market share trajectory
- Margin sustainability
  - Gross margin analysis
  - Operating leverage
  - EBITDA margin trends
- Scenario planning (base, upside, downside)

**New Database Tables:**
```sql
CREATE TABLE financial_dd_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
  qoe_adjusted_ebitda NUMERIC(15, 2),
  ebitda_adjustments JSONB, -- [{description, amount, category, rationale}]
  working_capital_normalized NUMERIC(15, 2),
  debt_capacity NUMERIC(15, 2),
  debt_service_coverage_ratio NUMERIC(5, 2),
  financial_health_score INTEGER CHECK (financial_health_score BETWEEN 0 AND 100),
  red_flags TEXT[],
  recommendations TEXT,
  completed_by UUID REFERENCES profiles(id),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE financial_scenarios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id UUID REFERENCES financial_dd_reports(id) ON DELETE CASCADE,
  scenario_type TEXT NOT NULL, -- base, upside, downside
  probability INTEGER CHECK (probability BETWEEN 0 AND 100),
  revenue_cagr NUMERIC(5, 2),
  ebitda_margin NUMERIC(5, 2),
  year_1_revenue NUMERIC(15, 2),
  year_2_revenue NUMERIC(15, 2),
  year_3_revenue NUMERIC(15, 2),
  year_1_ebitda NUMERIC(15, 2),
  year_2_ebitda NUMERIC(15, 2),
  year_3_ebitda NUMERIC(15, 2),
  key_assumptions JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Components:**
- `app/deals/[id]/dd/financial/page.tsx`
- `components/dd/financial/qoe-analyzer.tsx`
- `components/dd/financial/debt-capacity-calculator.tsx`
- `components/dd/financial/scenario-planner.tsx`
- `components/dd/financial/red-flag-detector.tsx`

**AI Enhancement:**
- Use AI to detect anomalies in financial statements
- Auto-suggest EBITDA adjustments
- Compare metrics to industry benchmarks automatically

**Leverage Existing:**
- `lib/ai/scoring/financial-health-scorer.ts`
- `lib/ai/scoring/ai-financial-scorer.ts`
- Existing financial_analysis table
- Document upload in Data Rooms

---

### 2.3 Operational Due Diligence Module

**Goal:** Assess operational health and integration readiness

**New Features:**

#### A. Operational Assessment Framework
- **Supply Chain Mapping**
  - Supplier concentration risk
  - Critical supplier identification
  - Lead times and reliability
  - Single points of failure

- **Manufacturing/Service Delivery**
  - Capacity utilization
  - Scalability assessment
  - Quality control processes
  - Bottleneck identification

- **IT Systems Inventory**
  - Core systems list (ERP, CRM, etc.)
  - Technology stack
  - System compatibility check
  - Integration complexity estimate

- **Key Person Dependency**
  - Critical roles identification
  - Knowledge transfer risk
  - Succession planning

- **Customer/Supplier Concentration**
  - Top 10 customers (% of revenue)
  - Top 10 suppliers (% of COGS)
  - Contractual protections
  - Switching costs

#### B. Integration Complexity Calculator
- **Systems Integration Roadmap**
  - Phase 1: Critical systems (Day 1-90)
  - Phase 2: Standard systems (Day 91-180)
  - Phase 3: Long-term consolidation (180+ days)
  - Cost estimate per phase

- **Organizational Impact**
  - Headcount analysis (keep, transfer, eliminate)
  - Reporting structure changes
  - Location consolidation plan
  - Cultural integration approach

- **Process Standardization**
  - Process inventory (current state)
  - Process gap analysis
  - Standardization roadmap
  - Training requirements

#### C. Operational KPI Tracker
- Efficiency metrics (utilization rates, cycle times)
- Quality metrics (defect rates, customer satisfaction, NPS)
- Capacity metrics (throughput, bottlenecks)
- Trend analysis and benchmarking

**New Database Tables:**
```sql
CREATE TABLE operational_dd_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
  operational_health_score INTEGER CHECK (operational_health_score BETWEEN 0 AND 100),
  integration_complexity TEXT, -- easy, medium, hard, very_hard
  integration_timeline_days INTEGER,
  integration_cost_estimate NUMERIC(15, 2),
  key_risks TEXT[],
  recommendations TEXT,
  completed_by UUID REFERENCES profiles(id),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE key_systems (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id UUID REFERENCES operational_dd_reports(id) ON DELETE CASCADE,
  system_name TEXT NOT NULL,
  system_category TEXT, -- erp, crm, financial, hr, operations
  vendor TEXT,
  version TEXT,
  users INTEGER,
  compatibility_score INTEGER CHECK (compatibility_score BETWEEN 0 AND 100),
  integration_approach TEXT, -- keep, migrate, replace
  integration_timeline_days INTEGER,
  integration_cost NUMERIC(15, 2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE integration_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id UUID REFERENCES operational_dd_reports(id) ON DELETE CASCADE,
  plan_type TEXT NOT NULL, -- day_1, day_100, long_term
  milestones JSONB, -- [{title, description, owner, due_date, dependencies}]
  resource_requirements JSONB,
  risks JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Components:**
- `app/deals/[id]/dd/operational/page.tsx`
- `components/dd/operational/systems-inventory.tsx`
- `components/dd/operational/integration-calculator.tsx`
- `components/dd/operational/key-person-matrix.tsx`
- `components/dd/operational/integration-roadmap.tsx`

**Report Templates:**
- Operational DD Report (PDF)
- Integration Plan (PDF + Excel)
- Day 1 / Day 100 Checklist (Excel)

---

### 2.4 Commercial Due Diligence Module

**Goal:** Validate market opportunity and commercial viability

**New Features:**

#### A. Market Validation Engine
- **TAM/SAM/SOM Analysis**
  - Total Addressable Market calculation
  - Serviceable Available Market
  - Serviceable Obtainable Market
  - Growth rate validation
  - Market size sources and assumptions

- **Market Dynamics**
  - Market growth drivers
  - Headwinds and challenges
  - Regulatory environment
  - Technology trends

- **Competitive Landscape**
  - Competitor mapping
  - Market share analysis
  - Pricing power assessment
  - Competitive advantages (moats)

#### B. Customer Intelligence
- **Customer Concentration**
  - Top 10 customers (% of revenue)
  - Customer diversification risk
  - Contract terms and renewal risk

- **Customer Retention Analysis**
  - Retention rate trends
  - Churn analysis by segment
  - Customer lifetime value
  - Cohort analysis

- **Customer Satisfaction**
  - NPS score tracking
  - Customer feedback synthesis
  - Support ticket analysis
  - Product review sentiment

- **Top Customer Interviews**
  - Interview guide templates
  - Key findings synthesis
  - Switching risk assessment
  - Upsell/cross-sell potential

#### C. Commercial Risk Assessment
- **Revenue Quality**
  - Contract terms analysis
  - Renewal rates by cohort
  - Pricing trends
  - Discounting practices

- **Revenue Concentration**
  - By customer segment
  - By product line
  - By geography
  - Dependency risks

- **Sales Pipeline Quality**
  - Pipeline coverage ratio
  - Win rate trends
  - Sales cycle length
  - Deal size trends

- **Go-to-Market Effectiveness**
  - CAC (Customer Acquisition Cost)
  - LTV/CAC ratio
  - Sales efficiency metrics
  - Channel effectiveness

**New Database Tables:**
```sql
CREATE TABLE commercial_dd_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
  commercial_health_score INTEGER CHECK (commercial_health_score BETWEEN 0 AND 100),
  tam NUMERIC(15, 2),
  sam NUMERIC(15, 2),
  som NUMERIC(15, 2),
  market_growth_rate NUMERIC(5, 2),
  customer_concentration_risk TEXT, -- low, medium, high
  nps_score INTEGER,
  key_risks TEXT[],
  recommendations TEXT,
  completed_by UUID REFERENCES profiles(id),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE customer_insights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id UUID REFERENCES commercial_dd_reports(id) ON DELETE CASCADE,
  customer_name TEXT,
  revenue_contribution NUMERIC(5, 2), -- Percentage
  contract_end_date DATE,
  renewal_likelihood INTEGER CHECK (renewal_likelihood BETWEEN 0 AND 100),
  interview_conducted BOOLEAN DEFAULT FALSE,
  interview_summary TEXT,
  switching_risk TEXT, -- low, medium, high
  upsell_potential NUMERIC(15, 2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE competitive_analyses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id UUID REFERENCES commercial_dd_reports(id) ON DELETE CASCADE,
  competitor_name TEXT NOT NULL,
  market_share NUMERIC(5, 2),
  estimated_revenue NUMERIC(15, 2),
  strengths TEXT[],
  weaknesses TEXT[],
  competitive_threat TEXT, -- low, medium, high
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Components:**
- `app/deals/[id]/dd/commercial/page.tsx`
- `components/dd/commercial/market-sizing-calculator.tsx`
- `components/dd/commercial/customer-concentration-chart.tsx`
- `components/dd/commercial/competitive-landscape-map.tsx`
- `components/dd/commercial/customer-interview-tracker.tsx`

**Report Templates:**
- Commercial DD Report (PDF)
- Customer Analysis Dashboard (Excel)
- Market Opportunity Validation (PDF)

---

## **Phase 3: Deal Execution Tools** (Months 7-9)

### 3.1 Deal Documentation Suite

**Goal:** Automate and manage deal documents

**New Features:**

#### A. Letter of Intent (LOI) Generator
- Template library by deal type (M&A, PE, Partnership)
- Interactive builder:
  - Buyer/Seller information
  - Purchase price and structure
  - Due diligence period
  - Exclusivity period
  - Confidentiality terms
  - Contingencies and conditions
- AI-powered clause suggestions based on:
  - Deal size
  - Industry
  - Complexity
  - Risk factors
- Redlining and version control
- E-signature integration (DocuSign/HelloSign)
- Execution tracking

#### B. Term Sheet Builder
- Interactive term sheet creator
- Deal structure optimizer:
  - Cash vs. stock mix
  - Earnout calculator
  - Escrow requirements
  - Holdback provisions
  - Working capital adjustments
- Term negotiation tracker
  - Original proposal
  - Counterproposals
  - Current status
  - Decision required
- What-if scenario modeling
- Comparison to market precedents

#### C. Purchase Agreement Assistant
- SPA template management
- Representation & warranty tracking
- Indemnification clause library
- Escrow and holdback calculator
- Closing conditions checklist
- Regulatory filing tracker

**New Database Tables:**
```sql
CREATE TABLE deal_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL, -- loi, term_sheet, spa, nda, amendment
  document_name TEXT NOT NULL,
  version INTEGER DEFAULT 1,
  status TEXT DEFAULT 'draft', -- draft, under_review, executed, superseded
  file_url TEXT,
  data_room_document_id UUID REFERENCES documents(id),
  terms JSONB, -- Structured terms for querying
  created_by UUID REFERENCES profiles(id),
  executed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE document_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID REFERENCES deal_documents(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  changes_summary TEXT,
  file_url TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE term_negotiations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID REFERENCES deal_documents(id) ON DELETE CASCADE,
  term_name TEXT NOT NULL,
  original_proposal TEXT,
  current_value TEXT,
  counterproposals JSONB, -- [{value, proposed_by, proposed_at, rationale}]
  status TEXT DEFAULT 'open', -- open, agreed, rejected
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Components:**
- `app/deals/[id]/documents/page.tsx`
- `components/deal-documents/loi-generator.tsx`
- `components/deal-documents/term-sheet-builder.tsx`
- `components/deal-documents/spa-assistant.tsx`
- `components/deal-documents/version-control.tsx`
- `components/deal-documents/e-signature-integration.tsx`

**Integration:**
- Auto-populate from deal data
- Link to data room for supporting documents
- Track approval workflow
- E-signature status tracking

---

### 3.2 Deal Tracking & Management

**Goal:** Manage all deal execution activities

**New Features:**

#### A. Deal Timeline Manager
- Gantt chart view of deal milestones
- Critical path analysis
- Dependency tracking (milestone dependencies)
- Automated reminders:
  - Upcoming milestones (7 days)
  - Overdue milestones
  - Dependency blockers
- Timeline scenarios (optimistic, realistic, pessimistic)

#### B. Stakeholder Communication Hub
- Deal team communication (thread-based)
- Board/executive update generator:
  - Weekly/monthly update templates
  - Auto-populate key metrics
  - Progress vs. plan visualization
- Stakeholder approval tracking:
  - Approval requests
  - Status dashboard
  - Reminder system
- Deal memo templates:
  - Investment committee memo
  - Board approval memo
  - Executive summary

#### C. Closing Checklist Automation
- **Pre-closing checklist** (auto-generated from deal type):
  - Legal (SPA, disclosures, corporate documents)
  - Financial (closing statement, working capital)
  - Operational (employee transfers, asset transfers)
  - Regulatory (filings, approvals)
- **Closing conditions tracker**:
  - Condition description
  - Owner
  - Status
  - Evidence/proof
- **Post-closing integration checklist**:
  - Day 1 priorities
  - First 100 days plan
  - Integration milestones
- **Completion status dashboard**

**New Database Tables:**
```sql
-- Already have deal_milestones, enhance with:
ALTER TABLE deal_milestones
ADD COLUMN milestone_category TEXT, -- legal, financial, operational, regulatory, integration
ADD COLUMN critical_path BOOLEAN DEFAULT FALSE,
ADD COLUMN dependencies UUID[], -- Other milestone IDs
ADD COLUMN status TEXT DEFAULT 'not_started', -- not_started, in_progress, completed, blocked
ADD COLUMN blockers TEXT;

CREATE TABLE closing_conditions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
  condition_type TEXT NOT NULL, -- legal, financial, regulatory, operational
  description TEXT NOT NULL,
  responsible_party TEXT, -- buyer, seller, third_party
  owner_id UUID REFERENCES profiles(id),
  status TEXT DEFAULT 'pending', -- pending, satisfied, waived, failed
  evidence_document_id UUID REFERENCES documents(id),
  satisfied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE deal_communications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
  message_type TEXT DEFAULT 'update', -- update, decision, question, approval_request
  subject TEXT NOT NULL,
  content TEXT NOT NULL,
  author_id UUID REFERENCES profiles(id),
  recipients UUID[], -- Array of user IDs
  thread_id UUID, -- For replies
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Components:**
- `app/deals/[id]/timeline/page.tsx`
- `components/deal-execution/gantt-chart.tsx`
- `components/deal-execution/critical-path-view.tsx`
- `components/deal-execution/communication-hub.tsx`
- `components/deal-execution/closing-checklist.tsx`
- `components/deal-execution/board-update-generator.tsx`

---

### 3.3 Regulatory & Compliance Module

**Goal:** Track regulatory requirements and approvals

**New Features:**

#### A. Regulatory Approval Tracker
- **Jurisdiction-specific requirements**:
  - UK: Competition and Markets Authority (CMA)
  - EU: European Commission (EC)
  - US: Federal Trade Commission (FTC), DOJ
  - Country-specific regulations

- **Competition authority filings**:
  - Filing type determination (pre-notification, full notification)
  - Timeline estimation by jurisdiction
  - Filing requirements checklist
  - Submission tracking

- **Sector-specific regulations**:
  - Financial services (FCA, PRA)
  - Healthcare (CQC, MHRA)
  - Energy (Ofgem)
  - Communications (Ofcom)

#### B. Compliance Risk Assessment
- **Anti-trust risk scoring**:
  - Combined market share calculation
  - HHI (Herfindahl-Hirschman Index)
  - Vertical integration concerns
  - Potential remedies

- **GDPR/Data Privacy**:
  - Data transfer impact assessment
  - Privacy policy alignment
  - Consent management review
  - Data subject rights compliance

- **Sanctions & Export Control**:
  - Sanctions list screening (OFAC, UN, EU)
  - Export control classification
  - Restricted party screening
  - Compliance attestations

**New Database Tables:**
```sql
CREATE TABLE regulatory_approvals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
  jurisdiction TEXT NOT NULL, -- UK, EU, US, etc.
  authority TEXT NOT NULL, -- CMA, EC, FTC, etc.
  filing_type TEXT, -- pre_notification, full_merger_notification, sector_approval
  filing_status TEXT DEFAULT 'not_started', -- not_started, preparing, submitted, under_review, approved, rejected
  submission_date DATE,
  expected_decision_date DATE,
  actual_decision_date DATE,
  decision_outcome TEXT, -- approved, approved_with_conditions, rejected, withdrawn
  conditions TEXT,
  filing_reference TEXT,
  estimated_timeline_days INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE compliance_checks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
  check_type TEXT NOT NULL, -- antitrust, data_privacy, sanctions, sector_specific
  risk_level TEXT, -- low, medium, high
  findings TEXT,
  remediation_required BOOLEAN DEFAULT FALSE,
  remediation_plan TEXT,
  status TEXT DEFAULT 'pending', -- pending, in_progress, completed, waived
  completed_by UUID REFERENCES profiles(id),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Components:**
- `app/deals/[id]/regulatory/page.tsx`
- `components/regulatory/approval-tracker.tsx`
- `components/regulatory/jurisdiction-timeline.tsx`
- `components/regulatory/antitrust-calculator.tsx`
- `components/regulatory/compliance-checklist.tsx`
- `components/regulatory/sanctions-screening.tsx`

**Report Templates:**
- Regulatory Approval Roadmap (PDF + Gantt)
- Compliance Risk Report (PDF)
- Filing Requirements Checklist (Excel)

---

## **Phase 4: Advanced Intelligence & AI** (Months 10-12)

### 4.1 Predictive Deal Analytics

**Goal:** Use AI to predict deal success and optimize strategy

**New Features:**

#### A. Deal Success Predictor
- **ML Model Training**:
  - Train on historical deals (internal + public data)
  - Features: deal size, type, industry, valuation multiples, DD findings, team experience, timing
  - Target variable: Success (Won/Lost) + Time to close

- **Success Probability Score (0-100%)**:
  - Real-time scoring as deal progresses
  - Updated based on DD findings
  - Confidence intervals

- **Key Success/Failure Factors**:
  - Top 10 factors influencing prediction
  - Feature importance visualization
  - Mitigation strategies for risk factors

- **Comparable Deal Analysis**:
  - Find similar deals (by size, industry, structure)
  - Success rate of comparables
  - Average time to close
  - Lessons learned

#### B. Optimal Deal Terms Recommender
- **AI-powered valuation range**:
  - Based on comparable transactions
  - Adjusted for market conditions
  - Seller expectations analysis

- **Deal structure optimization**:
  - Cash/stock mix recommendation
  - Earnout structure (if applicable)
  - Holdback provisions
  - Escrow amounts

- **Negotiation strategy suggestions**:
  - Opening offer recommendation
  - Walk-away price
  - Key negotiation points
  - Concession strategy

- **Market precedent analysis**:
  - Recent deals in same industry
  - Valuation multiples trends
  - Deal terms benchmarking

#### C. Competitive Intelligence Monitoring
- **Track other potential bidders**:
  - Monitor public filings
  - News mentions of competitors
  - PE firm activity
  - Strategic buyer movements

- **Target's other discussions**:
  - Media coverage analysis
  - Companies House filings
  - Social media signals
  - Website changes

- **Competitive positioning**:
  - Your advantages vs. competitors
  - Positioning recommendations
  - Differentiation strategy

**New Database Tables:**
```sql
CREATE TABLE deal_predictions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
  prediction_date DATE NOT NULL,
  success_probability NUMERIC(5, 2) CHECK (success_probability BETWEEN 0 AND 100),
  estimated_close_date DATE,
  confidence_interval_lower NUMERIC(5, 2),
  confidence_interval_upper NUMERIC(5, 2),
  key_success_factors JSONB,
  key_risk_factors JSONB,
  model_version TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE comparable_deals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deal_id UUID REFERENCES deals(id),
  comparable_deal_name TEXT NOT NULL,
  comparable_deal_date DATE,
  target_industry TEXT,
  deal_value NUMERIC(15, 2),
  enterprise_value NUMERIC(15, 2),
  revenue_multiple NUMERIC(5, 2),
  ebitda_multiple NUMERIC(5, 2),
  deal_structure TEXT,
  outcome TEXT, -- completed, failed, ongoing
  time_to_close_days INTEGER,
  source_url TEXT,
  similarity_score NUMERIC(5, 2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE competitive_intelligence (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
  competitor_name TEXT,
  intelligence_type TEXT, -- potential_bidder, market_activity, strategic_move
  signal_type TEXT, -- news, filing, social_media, website_change
  description TEXT NOT NULL,
  source_url TEXT,
  confidence_level TEXT, -- low, medium, high
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Components:**
- `app/deals/[id]/ai/page.tsx`
- `components/ai/deal-success-predictor.tsx`
- `components/ai/term-recommender.tsx`
- `components/ai/comparable-deals-finder.tsx`
- `components/ai/competitive-intel-dashboard.tsx`

**ML Model:**
- `lib/ml/deal-success-model.py` (or TypeScript with TensorFlow.js)
- Training pipeline (Inngest scheduled job)
- Feature engineering from deal data
- Model versioning and A/B testing

**Leverage Existing:**
- `lib/ai/llm-factory.ts` - Use for text analysis
- `lib/ai/scoring/` - Scoring infrastructure
- `lib/agents/` - Multi-agent orchestration
- `lib/signals/` - Signal detection system

---

### 4.2 Automated Deal Intelligence

**Goal:** Continuous monitoring and intelligence gathering

**New Features:**

#### A. Deal Signal Detection (Enhancements)
Extend existing buying signals to deal-specific signals:

**Target Distress Signals:**
- Revenue decline (>10% YoY)
- EBITDA compression
- Executive turnover (CEO, CFO, CTO)
- Layoffs or hiring freezes
- Credit rating downgrades
- Delayed filings

**Opportunity Signals:**
- Funding rounds (indicates growth)
- Geographic expansion announcements
- New product launches
- Strategic hires
- Awards or recognition
- Major customer wins

**Competitive Threat Signals:**
- Competitor acquisitions in space
- New entrants
- Technology disruption
- Regulatory changes
- Pricing pressure

**Regulatory Change Alerts:**
- New regulations in target's industry
- Antitrust policy changes
- Data privacy law updates

#### B. Market Intelligence Automation
- **Automated market research updates**:
  - Weekly market reports for active deals
  - TAM/SAM updates
  - Competitive landscape changes

- **Competitor M&A activity tracking**:
  - Monitor competitors' acquisitions
  - Track PE firm investments
  - Strategic partnership announcements

- **Industry consolidation trends**:
  - M&A activity in industry
  - Average valuation multiples trends
  - Deal volume and value trends

- **Deal comparables database**:
  - Auto-updated from public sources
  - Web scraping of deal announcements
  - API integration (PitchBook, Crunchbase)

#### C. Post-Deal Performance Tracking
- **Actual vs. Projected Performance**:
  - Revenue: actual vs. plan
  - EBITDA: actual vs. plan
  - Synergies realized: actual vs. plan
  - Integration milestones: on-time %

- **Synergy Realization Tracking**:
  - By synergy item
  - By category (revenue, cost)
  - By timeline (Year 1, 2, 3)
  - Variance analysis

- **Integration Milestone Completion**:
  - Day 1 checklist completion
  - Day 100 milestones status
  - Long-term integration progress

- **Lessons Learned Database**:
  - What went well
  - What went wrong
  - Key learnings
  - Best practices captured

**New Database Tables:**
```sql
-- Enhance existing buying_signals table
ALTER TABLE buying_signals
ADD COLUMN signal_category TEXT DEFAULT 'opportunity', -- opportunity, distress, competitive, regulatory
ADD COLUMN deal_id UUID REFERENCES deals(id),
ADD COLUMN action_recommended TEXT;

CREATE TABLE market_intelligence_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deal_id UUID REFERENCES deals(id),
  report_type TEXT NOT NULL, -- weekly_update, competitive_activity, industry_trend
  report_date DATE NOT NULL,
  summary TEXT,
  key_findings JSONB,
  sources TEXT[],
  generated_by TEXT DEFAULT 'automated',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE post_deal_performance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
  measurement_period TEXT NOT NULL, -- Q1_year1, Q2_year1, etc.
  actual_revenue NUMERIC(15, 2),
  projected_revenue NUMERIC(15, 2),
  revenue_variance NUMERIC(5, 2),
  actual_ebitda NUMERIC(15, 2),
  projected_ebitda NUMERIC(15, 2),
  ebitda_variance NUMERIC(5, 2),
  synergies_realized NUMERIC(15, 2),
  synergies_planned NUMERIC(15, 2),
  synergy_variance NUMERIC(5, 2),
  integration_completion_pct NUMERIC(5, 2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE lessons_learned (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
  category TEXT NOT NULL, -- sourcing, dd, negotiation, integration, overall
  lesson_type TEXT, -- success, challenge, improvement
  description TEXT NOT NULL,
  impact TEXT, -- high, medium, low
  recommendation TEXT,
  tags TEXT[],
  captured_by UUID REFERENCES profiles(id),
  captured_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Components:**
- `components/intelligence/signal-monitor.tsx`
- `components/intelligence/market-intelligence-feed.tsx`
- `components/intelligence/competitor-activity-tracker.tsx`
- `app/deals/[id]/post-close/page.tsx`
- `components/post-close/performance-dashboard.tsx`
- `components/post-close/synergy-tracker.tsx`
- `components/post-close/lessons-learned.tsx`

**Background Jobs (Inngest):**
- Daily signal detection for active deals
- Weekly market intelligence reports
- Monthly synergy realization tracking
- Quarterly performance variance analysis

**Leverage Existing:**
- `lib/signals/` - Signal detection infrastructure
- `lib/alerts/alert-service.ts` - Alert system
- `lib/agents/agent-task-runner.ts` - Background tasks
- `lib/research-gpt/` - Intelligence gathering

---

### 4.3 Deal Comparison & Portfolio Analytics

**Goal:** Compare multiple deals and manage portfolio

**New Features:**

#### A. Multi-Deal Comparison View
- **Side-by-side comparison** of 2-5 deals:
  - Key metrics (size, valuation, IRR, risk)
  - Scoring (strategic fit, financial, operational, commercial)
  - Timeline (expected close date)
  - Team allocation
  - Capital requirements

- **Scoring across all frameworks**:
  - Overall deal score (weighted)
  - Strategic DD score
  - Financial DD score
  - Operational DD score
  - Commercial DD score
  - Integration complexity
  - Synergy potential

- **Resource allocation optimizer**:
  - Team capacity view
  - Deal priority recommendations
  - Budget allocation suggestions
  - Timeline conflict detection

- **Priority ranking based on strategy**:
  - Alignment with corporate strategy
  - Resource efficiency
  - Risk-adjusted returns
  - Opportunity cost analysis

#### B. Portfolio Analytics Dashboard
- **Active Deals Overview**:
  - By stage (funnel view)
  - By deal type (M&A, PE, VC, Partnership)
  - By industry
  - By size
  - By expected close date

- **Pipeline Health Metrics**:
  - Total pipeline value
  - Probability-weighted pipeline value
  - Average deal size
  - Deals by stage (count and value)
  - Conversion rates (stage to stage)
  - Average time in each stage
  - Bottleneck identification

- **Resource Utilization**:
  - Team allocation (by deal)
  - Team capacity vs. demand
  - Budget spent vs. allocated
  - External advisor spend

- **Deal Team Performance**:
  - Win rate by deal leader
  - Average time to close
  - Success factors analysis
  - Team productivity metrics

- **Historical Deal Database**:
  - Completed deals archive
  - Success rate trends
  - Lessons learned library
  - Comparable transactions

#### C. Deal Playbook Builder
- **Best Practices Capture**:
  - Successful deal patterns
  - Winning strategies
  - Effective DD approaches
  - Integration best practices

- **Template Library**:
  - By deal type (M&A, PE, etc.)
  - By industry
  - By deal size
  - Customizable templates

- **Success Pattern Recognition**:
  - AI-powered pattern detection
  - Common success factors
  - Risk mitigation strategies
  - Timeline optimization tips

**New Database Tables:**
```sql
CREATE TABLE deal_comparisons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  comparison_name TEXT NOT NULL,
  deal_ids UUID[] NOT NULL, -- Array of deal IDs being compared
  created_by UUID REFERENCES profiles(id),
  comparison_criteria JSONB, -- Weights for different factors
  recommendation TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE portfolio_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES organizations(id),
  snapshot_date DATE NOT NULL,
  total_pipeline_value NUMERIC(15, 2),
  weighted_pipeline_value NUMERIC(15, 2),
  active_deals_count INTEGER,
  avg_deal_size NUMERIC(15, 2),
  stage_distribution JSONB, -- {sourcing: 10, screening: 8, loi: 5, dd: 3, negotiation: 2, closing: 1}
  conversion_rates JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE deal_playbooks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES organizations(id),
  playbook_name TEXT NOT NULL,
  deal_type TEXT, -- ma, pe, vc, partnership
  industry TEXT,
  size_range TEXT, -- small, medium, large
  best_practices JSONB,
  templates JSONB, -- {loi_template_id, term_sheet_template_id, etc.}
  success_patterns JSONB,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Components:**
- `app/deals/compare/page.tsx`
- `components/portfolio/comparison-table.tsx`
- `components/portfolio/resource-optimizer.tsx`
- `app/portfolio/page.tsx`
- `components/portfolio/pipeline-health-dashboard.tsx`
- `components/portfolio/team-performance-metrics.tsx`
- `components/portfolio/historical-deals-archive.tsx`
- `app/playbooks/page.tsx`
- `components/playbooks/playbook-library.tsx`
- `components/playbooks/pattern-recognition.tsx`

---

## **Phase 5: Enterprise Features & Scale** (Months 13-18)

### 5.1 Advanced Integrations

**Goal:** Connect with enterprise systems

**Integrations to Build:**

#### A. CRM Integration Suite
1. **Salesforce Native Integration**
   - Bi-directional sync (Accounts, Contacts, Opportunities, Custom Objects)
   - Custom object for Deals
   - Activity logging
   - Document attachments

2. **HubSpot Advanced Sync** (expand existing)
   - Companies, Contacts, Deals sync
   - Custom properties
   - Workflow triggers
   - Email integration

3. **Microsoft Dynamics 365**
   - Accounts, Contacts, Opportunities sync
   - Custom entities
   - Power Automate integration

#### B. Financial Systems Integration
1. **QuickBooks/Xero** - Financial data import
2. **NetSuite** - ERP integration
3. **SAP** - Enterprise connector
4. **Automated financial data extraction** from uploaded statements

#### C. Communication Platform Integration
1. **Slack Workspace Integration**
   - Deal channels auto-creation
   - Milestone notifications
   - Bot commands (/deal status, /deal update)

2. **Microsoft Teams Integration**
   - Teams channels for deals
   - Tab apps for deal views
   - Notifications

3. **Email Integration** (Gmail, Outlook)
   - Deal-related email tracking
   - Auto-logging to deal timeline

4. **Calendar Sync**
   - Deal milestones to calendar
   - Meeting scheduling
   - Deadline reminders

#### D. Document Management Integration
1. **SharePoint** - Document sync
2. **Google Drive** - File storage integration
3. **Dropbox Business** - File sync
4. **Box** - Enterprise document management

**Implementation:**
- OAuth 2.0 authentication for all integrations
- Webhook-based real-time sync
- Scheduled sync jobs for bulk updates
- Conflict resolution strategies
- Error handling and retry logic

**New Database Tables:**
```sql
CREATE TABLE integration_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES organizations(id),
  integration_type TEXT NOT NULL, -- salesforce, hubspot, slack, etc.
  connection_status TEXT DEFAULT 'disconnected', -- connected, disconnected, error
  credentials_encrypted TEXT, -- OAuth tokens, encrypted
  sync_settings JSONB, -- {sync_frequency, sync_direction, field_mappings}
  last_sync_at TIMESTAMPTZ,
  last_sync_status TEXT,
  error_log JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE integration_sync_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  connection_id UUID REFERENCES integration_connections(id) ON DELETE CASCADE,
  sync_type TEXT NOT NULL, -- full, incremental
  direction TEXT NOT NULL, -- inbound, outbound, bidirectional
  records_processed INTEGER,
  records_succeeded INTEGER,
  records_failed INTEGER,
  errors JSONB,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Components:**
- `app/settings/integrations/page.tsx`
- `components/integrations/connection-manager.tsx`
- `components/integrations/field-mapping-editor.tsx`
- `components/integrations/sync-status-dashboard.tsx`

**Services:**
- `lib/integrations/salesforce/` - Salesforce connector
- `lib/integrations/hubspot/` - HubSpot connector (expand existing)
- `lib/integrations/slack/` - Slack bot and API
- `lib/integrations/google/` - Google Workspace APIs
- `lib/integrations/microsoft/` - Microsoft Graph API

---

### 5.2 White-Label & Multi-Tenant

**Goal:** Enable partner/client customization

**New Features:**

#### A. White-Label Configuration
- **Custom branding**:
  - Logo upload (light and dark mode)
  - Primary and secondary colors
  - Custom domain (deals.clientcompany.com)
  - Favicon
  - Email templates

- **Configurable terminology**:
  - "Target" → "Portfolio Company"
  - "Deal" → "Transaction"
  - Custom stage names
  - Custom field labels

- **Client-specific templates**:
  - LOI templates
  - Term sheet templates
  - Report templates
  - Email templates

#### B. Advanced Multi-Tenancy
- **Tenant isolation**:
  - Row-level security (RLS) in Supabase
  - Data encryption per tenant
  - Separate storage buckets

- **Per-tenant configuration**:
  - Custom workflows
  - Custom fields
  - Custom scoring weights
  - Custom DD frameworks

- **Usage-based billing**:
  - Track usage metrics (deals, users, storage, API calls)
  - Billing tiers
  - Overage charges
  - Usage analytics

- **Tenant admin portal**:
  - User management
  - Settings configuration
  - Billing and invoicing
  - Usage dashboard

**New Database Tables:**
```sql
ALTER TABLE organizations
ADD COLUMN white_label_config JSONB, -- {logo_url, primary_color, secondary_color, custom_domain, terminology}
ADD COLUMN billing_plan TEXT DEFAULT 'starter', -- starter, professional, enterprise, custom
ADD COLUMN max_users INTEGER,
ADD COLUMN max_deals INTEGER,
ADD COLUMN max_storage_gb INTEGER,
ADD COLUMN custom_fields JSONB;

CREATE TABLE tenant_usage_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES organizations(id),
  metric_date DATE NOT NULL,
  active_users INTEGER,
  active_deals INTEGER,
  storage_used_gb NUMERIC(10, 2),
  api_calls INTEGER,
  documents_uploaded INTEGER,
  research_reports_generated INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Components:**
- `app/admin/white-label/page.tsx`
- `components/admin/branding-configurator.tsx`
- `components/admin/terminology-editor.tsx`
- `components/admin/tenant-settings.tsx`
- `components/admin/usage-dashboard.tsx`

---

### 5.3 Enterprise Security & Compliance

**Goal:** Meet enterprise security requirements

**New Features:**

#### A. Advanced Security Features
- **SSO/SAML 2.0 Integration**:
  - Okta, Azure AD, Google Workspace
  - Just-in-time (JIT) provisioning
  - SCIM for user provisioning

- **Enhanced RBAC**:
  - Custom roles beyond default (admin, user, viewer)
  - Granular permissions (deal-level, document-level)
  - Role inheritance
  - Time-bound access

- **Comprehensive Audit Logging**:
  - All user actions
  - API calls
  - Data access logs
  - Export to SIEM (Splunk, DataDog)

- **Data Encryption**:
  - At rest (AES-256)
  - In transit (TLS 1.3)
  - End-to-end encryption for sensitive documents
  - Key management (AWS KMS, Azure Key Vault)

- **IP Whitelisting**:
  - Organization-level IP restrictions
  - API IP restrictions
  - Login IP restrictions

#### B. Compliance Certifications
- **SOC 2 Type II Compliance**:
  - Security controls
  - Availability controls
  - Processing integrity
  - Confidentiality
  - Privacy

- **ISO 27001 Certification**:
  - Information security management
  - Risk assessment
  - Incident response

- **GDPR Compliance Enhancements**:
  - Data processing agreement (DPA)
  - Subprocessor list
  - Data subject access request (DSAR) automation
  - Consent management

- **Data Residency Options**:
  - EU data centers (Supabase EU region)
  - US data centers
  - UK data centers
  - Regional compliance

#### C. Advanced Data Governance
- **Data Retention Policies**:
  - Configurable retention periods
  - Auto-deletion after retention period
  - Legal hold override

- **Right to be Forgotten (GDPR)**:
  - User deletion workflow
  - Data anonymization
  - Compliance reporting

- **Data Export/Import Tools**:
  - Full data export (JSON, CSV)
  - Selective export
  - Bulk import tools
  - Migration assistance

- **Backup and Disaster Recovery**:
  - Automated daily backups
  - Point-in-time recovery
  - Geographic redundancy
  - Recovery time objective (RTO): <4 hours
  - Recovery point objective (RPO): <1 hour

**Implementation:**
- Partner with compliance consultants for certifications
- Security audit quarterly
- Penetration testing (annual)
- Bug bounty program

**New Database Tables:**
```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES organizations(id),
  user_id UUID REFERENCES profiles(id),
  action_type TEXT NOT NULL, -- create, read, update, delete, export, share
  resource_type TEXT NOT NULL, -- deal, document, user, etc.
  resource_id UUID,
  ip_address INET,
  user_agent TEXT,
  request_method TEXT,
  request_path TEXT,
  response_status INTEGER,
  changes JSONB, -- Before/after for updates
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE data_retention_policies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES organizations(id),
  resource_type TEXT NOT NULL, -- deal, document, research_report
  retention_period_days INTEGER NOT NULL,
  auto_delete BOOLEAN DEFAULT FALSE,
  legal_hold BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE security_incidents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  incident_type TEXT NOT NULL, -- unauthorized_access, data_breach, suspicious_activity
  severity TEXT NOT NULL, -- low, medium, high, critical
  description TEXT NOT NULL,
  affected_resources JSONB,
  detected_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### 5.4 API & Developer Platform

**Goal:** Enable custom integrations and extensions

**New Features:**

#### A. Public REST API
- **Full CRUD Operations**:
  - Deals (create, read, update, delete, list)
  - Targets (create, read, update, list)
  - Documents (upload, download, list)
  - Due Diligence Reports (create, read)
  - Users (create, read, update, list)

- **Webhook Support**:
  - Deal stage changed
  - Document uploaded
  - DD report completed
  - Milestone reached
  - Approval requested

- **Rate Limiting**:
  - 1000 requests/hour for standard plan
  - 10000 requests/hour for enterprise plan
  - Custom limits for partners

- **API Documentation**:
  - OpenAPI 3.0 specification
  - Interactive docs (Swagger UI)
  - Code samples (JavaScript, Python, cURL)
  - Postman collection

#### B. Developer Portal
- **API Key Management**:
  - Generate API keys
  - Rotate keys
  - Revoke keys
  - Scoped permissions per key

- **Usage Analytics**:
  - Request volume over time
  - Endpoint usage
  - Error rates
  - Latency metrics

- **Code Samples and SDKs**:
  - JavaScript/TypeScript SDK
  - Python SDK
  - REST examples

- **Integration Guides**:
  - Getting started tutorial
  - Authentication guide
  - Webhooks setup
  - Best practices

#### C. Custom Plugin System
- **Custom Data Sources**:
  - Plugin interface for new data sources
  - Data normalization
  - Caching strategy

- **Custom Scoring Algorithms**:
  - Plugin interface for scorers
  - Access to deal data
  - Return standardized scores

- **Custom Report Templates**:
  - Template builder
  - Variable interpolation
  - PDF generation

- **Custom Workflow Actions**:
  - Plugin interface for actions
  - Trigger definitions
  - Action execution

**Implementation:**
- `app/api/v1/` - Versioned API routes
- `lib/api/` - API utilities (auth, rate limiting, validation)
- `app/developers/page.tsx` - Developer portal
- OpenAPI spec generation from route handlers

**API Routes:**
```
POST   /api/v1/deals                     - Create deal
GET    /api/v1/deals                     - List deals
GET    /api/v1/deals/:id                 - Get deal
PATCH  /api/v1/deals/:id                 - Update deal
DELETE /api/v1/deals/:id                 - Delete deal

POST   /api/v1/deals/:id/documents       - Upload document
GET    /api/v1/deals/:id/documents       - List documents
GET    /api/v1/documents/:id             - Get document
DELETE /api/v1/documents/:id             - Delete document

POST   /api/v1/deals/:id/dd/strategic    - Create strategic DD
GET    /api/v1/deals/:id/dd/strategic    - Get strategic DD
POST   /api/v1/deals/:id/dd/financial    - Create financial DD
... (similar for operational, commercial)

POST   /api/v1/webhooks                  - Register webhook
GET    /api/v1/webhooks                  - List webhooks
DELETE /api/v1/webhooks/:id              - Delete webhook
```

---

## 🎨 UI/UX Transformation

### Navigation Restructure

**Current (General BI):**
```
- Dashboard
- Search
- Opp Scan
- Data Rooms
- Research
- Streams
- Team
```

**New (Deal Intelligence):**
```
🎯 Deal Pipeline
   ├── Active Deals
   ├── Pipeline View (Kanban)
   └── Pipeline Analytics

🔍 Deal Sourcing
   ├── Target Scanner
   ├── Market Intelligence
   └── Saved Targets

✅ Deal Validation
   ├── Strategic DD
   ├── Financial DD
   ├── Operational DD
   └── Commercial DD

📋 Data Rooms
   ├── Active Rooms
   ├── Document Analytics
   └── Compliance Tracker

📊 Deal Execution
   ├── Documentation (LOI, Term Sheets, SPA)
   ├── Timeline & Milestones
   └── Closing Checklist

🤖 AI & Intelligence
   ├── Deal Predictor
   ├── Competitive Intel
   └── Signal Monitor

📈 Portfolio & Analytics
   ├── Portfolio Dashboard
   ├── Deal Comparisons
   └── Playbook Library

⚙️ Settings
   ├── Team & Access
   ├── Integrations
   ├── Deal Frameworks
   └── White-Label Config (Enterprise)
```

### Key Page Designs

#### 1. New Homepage (Deal-Centric)
**Sections:**
- Hero: "Your active deals" summary cards (by stage)
- Upcoming milestones (next 7 days)
- Recent activity feed (deal-focused)
- Quick actions: "New Deal", "Source Targets", "Upload Documents"
- Key metrics: Pipeline value, Avg time to close, Win rate

#### 2. Deal Detail Page (NEW - Most Important)
**Layout:**
- **Header**:
  - Deal name, stage badge, deal type badge
  - Key metrics: Value, Expected close, Probability, Health score
  - Action buttons: "Move stage", "Add milestone", "Assign team"

- **Tabbed Navigation**:
  1. **Overview**
     - Deal summary
     - Team members
     - Recent activity
     - Key dates

  2. **Target Intelligence**
     - Link to ResearchGPT report
     - Company profile
     - Buying signals
     - Competitive landscape

  3. **Due Diligence**
     - Strategic DD tab
     - Financial DD tab
     - Operational DD tab
     - Commercial DD tab
     - Overall DD status

  4. **Documents**
     - Link to Data Room
     - Deal-specific documents (LOI, Term Sheet, SPA)
     - Version history

  5. **Valuation**
     - Valuation models
     - Comparable transactions
     - Synergy analysis
     - Deal terms modeling

  6. **Execution**
     - Timeline (Gantt chart)
     - Milestones & tasks
     - Closing checklist
     - Regulatory approvals

  7. **Team & Comms**
     - Team directory
     - Communication hub
     - Stakeholder updates
     - Approval tracker

  8. **AI Insights**
     - Success predictor
     - Recommended terms
     - Competitive intelligence
     - Risk alerts

#### 3. Pipeline View (Kanban)
- Horizontal swim lanes by stage
- Deal cards showing:
  - Deal name
  - Target company logo
  - Value
  - Expected close date
  - Owner avatar
  - Health score indicator
- Drag and drop to change stage
- Filter by: owner, deal type, size, date range
- Sort by: value, date, health score

#### 4. Target Scanner (Enhanced from Opp Scan)
- Existing search and filtering
- Add "Deal Attractiveness Matrix" visualization
- Add "Create Deal" action for qualified targets
- Show strategic fit score prominently

---

## 📐 Technical Architecture

### Microservices Approach (Optional - for scale)

If you choose to break into microservices later:

1. **Deal Pipeline Service** - Pipeline management, deal CRUD
2. **DD Framework Service** - All 4 DD frameworks
3. **Deal Execution Service** - Documents, milestones, closing
4. **Intelligence Service** - AI predictions, signals, market intel
5. **Integration Service** - All external integrations

### Enhanced AI/ML Components

1. **Custom Models**:
   - Deal success prediction model (XGBoost or Neural Network)
   - Document classification model (fine-tuned BERT)
   - Named entity recognition for contracts

2. **Expanded Embeddings**:
   - Deal similarity embeddings
   - Document similarity for DD
   - Comparable transaction matching

3. **NLP for Contracts**:
   - Clause extraction
   - Key terms identification
   - Risk flag detection

4. **Computer Vision**:
   - OCR for scanned documents
   - Table extraction from PDFs
   - Logo/signature detection

### Infrastructure Scaling

As you grow:
- **Database**: Scale Supabase (vertical first, then read replicas)
- **File Storage**: Use Supabase Storage with CDN (Cloudflare)
- **Background Jobs**: Scale Inngest workers
- **Caching**: Redis for hot data
- **Search**: Consider Elasticsearch/Algolia for advanced search

---

## 🎯 Success Metrics (KPIs)

### Product Metrics
- **Deal close rate**: % of deals that close successfully (Target: 30-40%)
- **Average time from sourcing to close**: Days (Target: 90-180 days for M&A)
- **DD completion rate**: % of deals with all 4 DD frameworks completed (Target: 90%+)
- **Synergy realization rate**: Actual vs. predicted synergies (Target: 80%+)
- **Deal health score correlation**: Correlation between health score and actual outcome (Target: r > 0.7)

### User Adoption Metrics
- **Monthly active users (MAU)**: Corporate dev team members using platform
- **Deals per organization**: Average active deals per customer (Target: 5-20)
- **Feature adoption**: % of users using each DD framework (Target: 70%+)
- **Data room usage**: % of deals with active data rooms (Target: 95%+)
- **Document upload volume**: Documents per deal (Target: 100+)
- **Net Promoter Score (NPS)**: Target: 70+

### Business Metrics
- **Customer acquisition**: Enterprise customers (Target: 20-50 in 18 months)
- **Revenue per customer (ARPC)**: Target: $50K-$200K ARR
- **Customer retention rate (CRR)**: Target: 95%+
- **Logo expansion rate**: % of customers expanding usage (Target: 40%+)
- **Sales cycle**: Days to close new customer (Target: 60-90 days)
- **Customer lifetime value (LTV)**: Target: $500K-$1M

---

## 💰 Investment Required

### Engineering Team

**Phase 1-2 (Months 1-6):**
- 3 Senior Full-Stack Engineers (Next.js, TypeScript, Supabase)
- 1 Product Designer (UI/UX)
- 1 Product Manager
- **Cost**: ~$150K/month = $900K for 6 months

**Phase 3-4 (Months 7-12):**
- +2 Engineers (5 total)
- +1 AI/ML Engineer
- +1 QA Engineer
- Product Designer (continued)
- Product Manager (continued)
- **Cost**: ~$200K/month = $1.2M for 6 months

**Phase 5 (Months 13-18):**
- +2 Engineers (7 total)
- +1 DevOps Engineer
- AI/ML Engineer (continued)
- QA Engineer (continued)
- Product Designer (continued)
- Product Manager (continued)
- **Cost**: ~$250K/month = $1.5M for 6 months

### Infrastructure & Tools

**Cloud Infrastructure (Supabase, Vercel, etc.):**
- Phase 1-2: $5K/month = $30K
- Phase 3-4: $10K/month = $60K
- Phase 5: $15K/month = $90K
- **Total**: $180K

**AI/ML Compute:**
- GPU instances for model training: $3K/month
- LLM API costs (OpenRouter): $5K/month
- **Total 18 months**: $144K

**Third-party Services:**
- Compliance tools (SOC 2, security): $50K
- Legal (contracts, privacy): $30K
- Design tools (Figma, etc.): $5K
- **Total**: $85K

### External Services

- **Compliance Consultants** (SOC 2, ISO 27001): $150K
- **Security Audit & Pen Testing**: $75K
- **Data Providers** (comparables, market data): $50K
- **Integration Partners** (Salesforce, etc.): $25K
- **Total**: $300K

### Marketing & Sales (to acquire 20-50 customers)

- Content marketing: $100K
- Demand generation: $200K
- Sales team (2 AEs): $300K
- **Total**: $600K

---

### **TOTAL 18-MONTH BUDGET: $4.8M - $5.5M**

Breakdown:
- Engineering: $3.6M (67%)
- Infrastructure: $400K (7%)
- External services: $300K (6%)
- Marketing/Sales: $600K (11%)
- Buffer (10%): $500K (9%)

---

## 🚀 Quick Wins (First 30 Days)

While planning the full transformation, here are **immediate high-impact changes**:

### Week 1-2: Branding & Navigation
- [ ] Update site title to "oppSpot Deal Intelligence Platform"
- [ ] Rename navigation items:
  - "Search" → "Deal Sourcing"
  - "Opp Scan" → "Target Scanner"
- [ ] Add "Deal Intelligence" tagline to homepage
- [ ] Update README and CLAUDE.md with new positioning

### Week 3: Deal Record Prototype
- [ ] Create basic deal profile page (`/deals/[id]`)
- [ ] Add deal creation form (minimal fields)
- [ ] Link to existing features:
  - ResearchGPT reports
  - Data Room
  - Target from Opp Scan
- [ ] Simple stage tracker (dropdown or progress bar)

### Week 4: Strategic Fit Scoring
- [ ] Extend lead scoring with strategic fit questions
- [ ] Add strategic fit score (0-100) to target pages
- [ ] Show strategic fit on Opp Scan results

### Bonus (if time permits):
- [ ] Add "Deal Attractiveness" section to Opp Scan reports
- [ ] Include integration complexity estimate
- [ ] Recommend deal structure based on size/industry

---

## 🎓 Change Management

### Internal Team Training
1. **Deal Intelligence Methodology** (2-day workshop)
   - M&A fundamentals
   - Due diligence best practices
   - Deal execution process

2. **Platform Training** (1 day per phase)
   - Feature walkthroughs
   - Hands-on exercises
   - Q&A sessions

### Customer Onboarding (30-60 days)
1. **Discovery Call** (Week 1) - Understand customer's deal process
2. **Configuration** (Week 2) - Setup org, users, integrations, templates
3. **Training** (Week 3-4) - 4-hour training session + recordings
4. **Pilot Deal** (Week 5-8) - Run 1-2 deals with support
5. **Go-Live** (Week 9+) - Full adoption

### Documentation
- **User Guides** (per module)
  - Deal Pipeline Management
  - Due Diligence Frameworks
  - Deal Execution Tools
  - Portfolio Analytics

- **Video Tutorials** (5-10 min each)
  - Creating a deal
  - Running strategic DD
  - Generating an LOI
  - Comparing deals

- **API Documentation**
  - Getting started
  - Authentication
  - Endpoint reference
  - Webhooks

- **Admin Guides**
  - User management
  - Integration setup
  - White-label configuration

### Customer Success Program
- **Dedicated Onboarding** (first 60 days)
- **Weekly Check-ins** (first 3 months)
- **Quarterly Business Reviews** (ongoing)
- **User Community Forum**
- **Annual User Conference**

---

## 🏆 Competitive Positioning

### Key Competitors
1. **DealCloud** (Intapp) - Enterprise M&A workflow
2. **Affinity** - Relationship intelligence for deal flow
3. **4Degrees** - Deal sourcing and CRM
4. **SourceScrub** - Target identification
5. **Midaxo** - M&A project management

### oppSpot Differentiators
1. ✅ **AI-First Approach** - ResearchGPT, predictive analytics, document analysis
2. ✅ **Comprehensive DD Automation** - All 4 frameworks in one platform
3. ✅ **Built-in Data Room** - Seamless document management
4. ✅ **UK & Ireland Focus** - Deep integration with Companies House, CRO
5. ✅ **Affordable for Mid-Market** - Not just for enterprise
6. ✅ **Modern Tech Stack** - Fast, responsive, mobile-friendly
7. ✅ **Developer-Friendly** - Public API, webhooks, extensibility

### Pricing Strategy (Suggested)
- **Starter**: £2,500/month (5 users, 10 active deals, 100GB storage)
- **Professional**: £7,500/month (15 users, 30 deals, 500GB, integrations)
- **Enterprise**: Custom (unlimited users, deals, storage, white-label, API)

---

## 📝 Next Steps After Roadmap Approval

### Immediate Actions (This Week)
1. ✅ **Save this roadmap** to project (DEAL_INTELLIGENCE_ROADMAP.md)
2. **Create project board** - GitHub Projects or Linear
3. **Set up milestones** - One per phase
4. **Assign owners** - Who owns each phase?
5. **Schedule kickoff** - Team alignment meeting

### Phase 1 Kickoff (Month 1)
1. **Design sprint** - Wireframes for deal pipeline, deal detail page
2. **Database design** - Schema for deals, deal_stages, milestones
3. **Technical spike** - Evaluate any new libraries needed
4. **Create tickets** - Break down Phase 1 into user stories
5. **Sprint planning** - 2-week sprints

---

## 📚 Appendix

### Useful Resources
- **M&A Frameworks**:
  - [Harvard Business Review - M&A](https://hbr.org/topic/mergers-and-acquisitions)
  - Deloitte M&A Trends Report
  - BCG M&A Playbook

- **Due Diligence Guides**:
  - [Gartner DD Checklist](https://www.gartner.com)
  - PwC Due Diligence Guide
  - KPMG M&A Handbook

- **Regulatory Resources**:
  - UK Competition and Markets Authority (CMA)
  - European Commission Merger Control
  - FTC Merger Guidelines

### Technical References
- **Supabase**: https://supabase.com/docs
- **Next.js 15**: https://nextjs.org/docs
- **OpenRouter API**: https://openrouter.ai/docs
- **shadcn/ui**: https://ui.shadcn.com

---

**End of Roadmap**

This roadmap transforms oppSpot into a comprehensive, enterprise-grade deal intelligence platform that rivals the best in the market. The phased approach allows you to deliver value incrementally while building toward the full vision over 12-18 months.

**Ready to start implementation!** 🚀