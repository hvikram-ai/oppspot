# Feature Specification: Financial & Revenue Quality Analytics

**Feature Branch**: `012-oppspot-docs-financial`
**Created**: 2025-10-30
**Status**: Draft
**Input**: User description: "/oppspot/docs/FINANCIAL_REVENUE_QUALITY_SPEC.md"

## Execution Flow (main)
```
1. Parse user description from Input
   � Feature description provided via implementation spec document
2. Extract key concepts from description
   � Identified: financial KPI tracking, revenue quality analysis, benchmarking, export capabilities
3. For each unclear aspect:
   � Marked with [NEEDS CLARIFICATION: specific question]
4. Fill User Scenarios & Testing section
   � Primary scenarios: financial analysis, board reporting, risk assessment
5. Generate Functional Requirements
   � Each requirement testable and business-focused
   � Removed technical implementation details
6. Identify Key Entities (if data involved)
   � Key entities: customers, subscriptions, invoices, payments, financial metrics
7. Run Review Checklist
   � Validated requirements are business-focused and testable
8. Return: SUCCESS (spec ready for planning)
```

---

## � Quick Guidelines
-  Focus on WHAT users need and WHY
- L Avoid HOW to implement (no tech stack, APIs, code structure)
- =e Written for business stakeholders, not developers

---

## Clarifications

### Session 2025-10-30
- Q: Does v1 support multi-currency financial data, or should all data be in a single currency per company? → A: Single currency only - all uploaded data must be in one company reporting currency (no conversion)
- Q: How should the system determine a company's sector for benchmarking purposes? → A: Use existing sector field from companies table (already in oppSpot database)
- Q: What should define company size bands for peer benchmarking? → A: Annual revenue ranges (e.g., <$1M, $1M-$10M, $10M-$50M, $50M+)
- Q: What is the acceptable performance target for recalculating 24 months of financial data? → A: Under 5 seconds - near-instant recalculation for responsive user experience
- Q: Are "editor" and "admin" roles existing in oppSpot's current permission model? → A: No, these are new roles that need to be defined for this feature

---

## User Scenarios & Testing

### Primary User Story

As a business analyst or executive, I need to understand the financial health and revenue quality of companies we're tracking. I want to see key SaaS and recurring revenue metrics (ARR, MRR, net retention, customer lifetime value), analyze revenue durability through cohort retention and concentration risk, and compare performance against industry benchmarks. I need to export board-ready reports with charts and commentary that demonstrate financial quality for M&A due diligence or investment decisions.

### Acceptance Scenarios

1. **Given** a company with subscription and invoice data uploaded, **When** I view the financial analytics dashboard, **Then** I see current month's ARR, MRR, net revenue retention (NRR), gross revenue retention (GRR), customer acquisition cost (CAC), lifetime value (LTV), and gross margin with explanations of how each metric is calculated.

2. **Given** 24 months of historical subscription data, **When** I view the cohort analysis, **Then** I see a retention heatmap showing what percentage of customers from each acquisition month remained active over time, with both customer count and revenue retention displayed.

3. **Given** multiple customers contributing revenue, **When** I view revenue concentration analysis, **Then** I see what percentage of total revenue comes from the top 1, 3, 5, and 10 customers, plus a concentration index indicating customer dependency risk.

4. **Given** outstanding invoices and payment data, **When** I view accounts receivable aging, **Then** I see how much revenue is outstanding in 0-30, 31-60, 61-90, and 90+ day buckets, plus days sales outstanding (DSO) trends indicating collection efficiency.

5. **Given** my company's sector and size, **When** I view benchmark comparisons, **Then** I see how our key metrics (NRR, gross margin, CAC, LTV:CAC ratio) compare to industry medians with clear indicators showing whether we're above, at, or below typical performance.

6. **Given** completed financial analysis, **When** I request an export, **Then** I receive a PDF report with executive summary, KPI overview charts, retention analysis, concentration risk assessment, and benchmark positioning suitable for board presentation.

### Edge Cases

- What happens when a company has insufficient data (e.g., only 3 months of history) to calculate meaningful cohort retention or trends?
- What happens if uploaded data contains mixed currencies? System must reject and require single currency.
- What happens when key data is missing (e.g., no COGS data provided, preventing gross margin calculation)?
- How are anomalies surfaced (e.g., sudden spike in overdue receivables, dramatic drop in retention)?
- What happens when no benchmark data exists for a company's specific sector or size band?
- How does the system handle companies that switch from annual to monthly billing or vice versa?
- What happens when a customer reactivates after churning (wins back scenario)?

## Requirements

### Functional Requirements

**Core KPI Tracking**
- **FR-001**: System MUST calculate and display Monthly Recurring Revenue (MRR) and Annual Recurring Revenue (ARR) based on active subscriptions at the end of each month
- **FR-002**: System MUST calculate Gross Revenue Retention (GRR) showing what percentage of revenue was retained from existing customers excluding expansion
- **FR-003**: System MUST calculate Net Revenue Retention (NRR) showing what percentage of revenue was retained including expansion and contraction from existing customers
- **FR-004**: System MUST calculate Customer Acquisition Cost (CAC) by dividing sales and marketing costs by new customers acquired in the period
- **FR-005**: System MUST calculate Lifetime Value (LTV) based on average revenue per customer, gross margin, and churn rate
- **FR-006**: System MUST calculate gross margin by subtracting cost of goods sold from revenue
- **FR-007**: System MUST display formulas and assumptions used for each metric calculation so users understand how numbers are derived
- **FR-008**: System MUST show trends for each KPI over time (minimum 12 months, maximum 24 months) with period-over-period change percentages

**Cohort & Retention Analysis**
- **FR-009**: System MUST group customers by acquisition month (cohort) based on when their first subscription started
- **FR-010**: System MUST track and display what percentage of customers from each cohort remained active in subsequent months
- **FR-011**: System MUST track and display what percentage of revenue from each cohort was retained in subsequent months
- **FR-012**: System MUST visualize retention as a heatmap showing cohort performance at a glance
- **FR-013**: System MUST calculate both logo churn (customer count) and revenue churn separately

**Revenue Quality & Concentration**
- **FR-014**: System MUST calculate revenue concentration showing what percentage of total revenue comes from the top 1, 3, 5, and 10 customers
- **FR-015**: System MUST calculate a concentration index (HHI) that indicates overall customer dependency risk
- **FR-016**: System MUST identify and flag when a single customer represents more than [NEEDS CLARIFICATION: what threshold? 20%? 30%?] of total revenue as a risk indicator
- **FR-017**: System MUST allow users to drill down to see individual customer revenue contributions

**Accounts Receivable & Payable Analysis**
- **FR-018**: System MUST categorize outstanding invoices into aging buckets (0-30 days, 31-60 days, 61-90 days, 90+ days)
- **FR-019**: System MUST calculate Days Sales Outstanding (DSO) showing average collection time
- **FR-020**: System MUST calculate Days Payables Outstanding (DPO) if cost/payable data is available
- **FR-021**: System MUST flag anomalies when aging trends deteriorate significantly (e.g., 90+ day receivables spike above [NEEDS CLARIFICATION: what threshold?])
- **FR-022**: System MUST show trends of DSO/DPO over time to identify collection efficiency changes

**Peer Benchmarking**
- **FR-023**: System MUST compare company metrics to industry sector medians for NRR, gross margin, CAC, LTV:CAC ratio, and ARR growth
- **FR-024**: System MUST retrieve company's sector from the existing companies table sector field for benchmark matching
- **FR-025**: System MUST determine company's size band based on annual revenue (ARR) using ranges: <$1M, $1M-$10M, $10M-$50M, $50M+
- **FR-025a**: System MUST calculate the company's current ARR from subscription data to assign the appropriate size band
- **FR-026**: System MUST display benchmark comparisons with clear visual indicators (above/at/below peer median)
- **FR-027**: System MUST show quartile positions (25th, 50th, 75th percentile) for context
- **FR-028**: System MUST explain when benchmarks are unavailable for a specific sector/size combination

**Data Ingestion**
- **FR-029**: System MUST allow users to upload subscription data including customer identifier, plan name, start date, end date (if applicable), monthly amount, and currency
- **FR-030**: System MUST allow users to upload invoice data including customer identifier, issue date, due date, amount, currency, and payment status
- **FR-031**: System MUST allow users to upload payment data including invoice identifier, payment date, amount, and payment method
- **FR-032**: System MUST allow users to upload cost of goods sold (COGS) entries with date, amount, currency, and category
- **FR-033**: System MUST allow users to upload sales and marketing cost data with date, amount, currency, and channel
- **FR-034**: System MUST support CSV format for data uploads [NEEDS CLARIFICATION: are there specific CSV schema requirements/templates provided to users?]
- **FR-035**: System MUST validate uploaded data and report errors (missing required fields, invalid dates, negative amounts where not permitted)
- **FR-036**: System MUST handle re-uploads of the same data without creating duplicates (idempotent ingestion)
- **FR-037**: System MUST enforce single currency per company - all uploaded data (subscriptions, invoices, payments, costs) must be in the same currency as the company's designated reporting currency
- **FR-037a**: System MUST reject uploads containing mixed currencies and display clear error message indicating single currency requirement

**Recomputation & Data Refresh**
- **FR-038**: System MUST automatically recalculate all metrics when new data is uploaded
- **FR-039**: System MUST allow authorized users to manually trigger recalculation of metrics for a specified time period
- **FR-040**: System MUST process recalculations for 24 months of data within 5 seconds to provide near-instant results
- **FR-041**: System MUST show when metrics were last calculated/updated

**Exports & Reporting**
- **FR-042**: System MUST generate PDF reports containing executive summary, KPI overview, NRR waterfall chart, cohort retention heatmap, revenue concentration analysis, AR/AP aging tables, and benchmark positioning
- **FR-043**: PDF reports MUST include chart visualizations, not just tables
- **FR-044**: PDF reports MUST be suitable for board presentation (professional formatting, clear labeling)
- **FR-045**: System MUST allow users to download raw data tables as CSV for further analysis
- **FR-046**: System MUST name exported files with company identifier and period date for easy organization

**Permissions & Access Control**
- **FR-047**: System MUST restrict financial data access to users within the same organization as the company being analyzed
- **FR-048**: System MUST allow read access (view metrics, reports, charts) to all organization members
- **FR-049**: System MUST define new permission roles for financial data management: "Financial Editor" (can upload data and trigger recalculations) and "Financial Admin" (editor permissions plus ability to manage user roles and delete data)
- **FR-049a**: System MUST restrict data upload and manual recalculation actions to users with Financial Editor or Financial Admin role
- **FR-049b**: System MUST restrict role assignment and data deletion to users with Financial Admin role only

**User Experience**
- **FR-050**: System MUST display KPI metrics with context (comparison to previous period, trend direction indicators)
- **FR-051**: System MUST explain financial terminology and metrics with tooltips or info buttons for users unfamiliar with SaaS financial metrics
- **FR-052**: System MUST highlight anomalies and risk indicators with clear visual prominence
- **FR-053**: System MUST load key metrics summary within [NEEDS CLARIFICATION: acceptable load time? 300ms? 1 second?] when accessing the financial analytics page
- **FR-054**: System MUST provide empty state messaging with guidance when insufficient data exists to calculate a metric

### Key Entities

- **Customer**: A business or individual that subscribes to or purchases from the company being analyzed. Key attributes: identifier, name, acquisition date. May have multiple subscriptions over time.

- **Subscription**: An ongoing recurring revenue arrangement with a customer. Key attributes: customer reference, plan/tier, start date, end date (null if active), monthly recurring amount, currency, active status. Represents the foundation for MRR/ARR calculations.

- **Invoice**: A billing document requesting payment from a customer. Key attributes: customer reference, issue date, due date, amount, currency, payment status (open/paid/void/uncollectible). Used for revenue recognition and AR aging analysis.

- **Payment**: A recorded payment received against an invoice. Key attributes: invoice reference, payment date, amount, currency, payment method. Used to reconcile invoices and track collection efficiency.

- **COGS Entry**: Cost of goods sold expense incurred in a period. Key attributes: date, amount, currency, category. Used to calculate gross margin.

- **Sales & Marketing Cost**: Expenditure on customer acquisition activities. Key attributes: date, amount, currency, channel. Used to calculate CAC.

- **KPI Snapshot**: A calculated set of key metrics for a company at a specific point in time (typically monthly). Contains: ARR, MRR, GRR, NRR, CAC, LTV, gross margin, average revenue per user (ARPU), churn rate, expansion rate, contraction rate. Represents the stored results of financial analysis for historical tracking.

- **Cohort Metric**: Retention data for a specific customer acquisition cohort at a specific later period. Contains: cohort month, period month, retained customer count, churned customer count, retention rate, revenue retained. Enables cohort retention analysis.

- **Revenue Concentration**: Risk metrics showing customer revenue distribution at a point in time. Contains: concentration index, top 1/3/5/10 customer percentages. Identifies dependency risk.

- **AR/AP Aging**: Snapshot of outstanding receivables and payables by age bucket at a specific date. Contains: amounts in 0-30, 31-60, 61-90, 90+ day buckets, DSO, DPO. Measures collection and payment efficiency.

- **Anomaly**: A detected unusual pattern or risk indicator in financial metrics. Contains: metric affected, period, severity level, description, before/after values. Alerts users to potential issues requiring investigation.

- **Sector Benchmark**: Industry median and quartile values for key metrics by sector and company size. Contains: sector, size band (based on ARR ranges: <$1M, $1M-$10M, $10M-$50M, $50M+), metric name, 25th/50th/75th percentile values. Enables peer comparison.

---

## Review & Acceptance Checklist

### Content Quality
- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

### Requirement Completeness
- [ ] No [NEEDS CLARIFICATION] markers remain (4 clarifications remain - see below)
- [x] Requirements are testable and unambiguous (except where marked)
- [x] Success criteria are measurable
- [x] Scope is clearly bounded (v1 focused on CSV ingestion, core KPIs, single company view)
- [x] Dependencies and assumptions identified (requires existing company records, organization structure, new role definitions)

### Clarifications Resolved (Session 2025-10-30)
- ✅ **FR-037**: Currency handling - Single currency per company enforced
- ✅ **FR-024**: Sector determination - Use existing companies.sector field
- ✅ **FR-025**: Size band definition - ARR ranges (<$1M, $1M-$10M, $10M-$50M, $50M+)
- ✅ **FR-040**: Recalculation performance - Under 5 seconds for 24 months
- ✅ **FR-049**: Permission roles - New Financial Editor/Admin roles to be defined

### Outstanding Clarifications (Deferred to Planning)

1. **FR-016**: What revenue concentration threshold should trigger risk flags? (20%? 30%?)
2. **FR-021**: What threshold for aging anomalies should trigger alerts?
3. **FR-034**: Should specific CSV templates/schemas be provided to users for each data type?
4. **FR-053**: What is the acceptable page load time target for the financial analytics dashboard?

---

## Execution Status

- [x] User description parsed
- [x] Key concepts extracted
- [x] Ambiguities marked (9 clarification questions identified)
- [x] User scenarios defined
- [x] Requirements generated (54 functional requirements)
- [x] Entities identified (11 key entities)
- [x] Clarification session completed (5 of 9 questions resolved)
- [x] Critical ambiguities resolved for planning phase
- [ ] Review checklist passed (4 low-impact clarifications deferred to planning)

---

## Notes for Planning Phase

**Scope Boundaries for v1:**
- Focus on CSV-based ingestion (manual upload); defer direct ERP/CRM connectors
- Single company analysis view; defer portfolio/multi-company aggregation
- Assume single reporting currency per company initially
- Provide core SaaS KPIs (ARR, MRR, NRR, GRR, CAC, LTV, GM); defer advanced metrics
- Static benchmark datasets; defer real-time benchmark updates

**Integration Points:**
- Must integrate with existing `companies` table and organization structure
- Must respect existing user authentication and authorization patterns
- May integrate with existing `lib/benchmarking` if compatible
- Must follow existing Supabase RLS patterns for data access control

**User Types:**
- Primary users: Business analysts, investors, M&A professionals, executives (read-only access)
- Secondary users: Sales/account managers viewing their customer financial health (read-only access)
- Financial Editors: Users who upload financial data and trigger recalculations
- Financial Admins: Users with full permissions including role management and data deletion

**Success Metrics:**
- Users can generate board-ready financial report in < [time target TBD]
- Financial analysis identifies revenue concentration risks accurately
- Benchmark comparisons provide actionable insights for improvement
- PDF exports meet professional presentation standards without additional editing
