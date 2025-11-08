# Research: Competitive Intelligence Dashboard

**Date**: 2025-10-31
**Phase**: 0 (Outline & Research)
**Status**: Complete

## Overview

This document consolidates research findings for technical decisions required to implement the Competitive Intelligence Dashboard feature.

---

## R1: Data Source Strategy

### Question
How should competitor data be gathered given the on-demand refresh constraint (FR-009)?

### Research Findings

**Existing oppspot Infrastructure**:
- ResearchGPT™ already implements web scraping with rate limiting
- Has integrations with: Companies House API, News API, Website Scraper
- Uses OpenRouter + Claude Sonnet 3.5 for intelligent data extraction
- Built-in caching mechanism with differential TTL

**Additional Data Sources Evaluated**:
- **G2 Crowd API**: Product reviews, feature lists, pricing (requires API key, $500/mo)
- **Capterra API**: Similar to G2, less coverage for SaaS (no public API)
- **TrustRadius**: Limited API access
- **Crunchbase API**: Company metadata, funding (requires Pro plan)
- **LinkedIn Company Pages**: Can be scraped for employee count, products (rate limits apply)
- **Manual Entry**: Spreadsheet import + form UI for proprietary intelligence

### Decision

**Hybrid Approach**:

**Automatic Data Gathering** (Phase 1):
1. Extend ResearchGPT™ with new `lib/research-gpt/competitor-analyzer.ts`
2. Data sources per metric:
   - **Features**: Web scraping of competitor product pages + pricing pages
   - **Pricing**: Scrape pricing pages, fallback to manual entry
   - **Market Position**: G2 reviews (if API key available), news articles
   - **Recognition**: Scrape Gartner press releases, G2 badges, award pages

**Manual Entry** (Phase 1):
- CSV import for bulk feature lists
- Form UI for individual competitor attributes
- All manual entries require source attribution (FR-023)

**Future Enhancements** (Phase 2+):
- G2 API integration (if customer funds it)
- Crunchbase integration for funding/valuation data

### Rationale
- Balances automation with analyst expertise
- Reuses existing ResearchGPT™ infrastructure (DRY principle)
- Rate limiting and caching already solved
- Manual entry covers gaps where automation fails
- Flexible enough to add paid APIs later

---

## R2: PowerPoint Export Library

### Question
Which library should be used for PPTX generation in Node.js environment?

### Options Evaluated

| Library | Pros | Cons | Stars | Last Update |
|---------|------|------|-------|-------------|
| **pptxgenjs** | TypeScript support, charts/tables, active maintenance | 230KB bundle size | 2.8K | 2024-09 |
| **officegen** | Lightweight (120KB), streaming support | No TypeScript, last update 2019 | 2.5K | 2019-08 |
| **node-pptx** | Simple API | No chart support, maintenance unclear | 300 | 2022-05 |
| **Manual XML** | Full control, zero dependencies | High complexity, error-prone | N/A | N/A |

### Decision

**pptxgenjs** (v3.12+)

### Installation
```bash
npm install pptxgenjs --save
npm install @types/pptxgenjs --save-dev
```

### Rationale
- Active maintenance (updated Sept 2024)
- Full TypeScript support with type definitions
- Supports charts (required for FR-015: radar charts, bar charts)
- Supports tables (required for FR-013: feature matrix)
- 50K+ downloads/month indicates production readiness
- Bundle size (230KB) acceptable for server-side export generation

### Implementation Notes
- Generate PPTX files server-side in API route
- Return as downloadable blob via `Content-Disposition` header
- Cache generated exports for 1 hour to reduce regeneration

---

## R3: Feature Parity Scoring Algorithm

### Question
How to calculate a 0-100 feature parity score comparing target vs competitor features (FR-003)?

### Algorithm Design

**Inputs**:
- `T`: Set of target company features
- `C`: Set of competitor company features
- `W`: Weights by feature category

**Steps**:
1. **Feature Universe**: `U = T ∪ C`
2. **Categorize Features**: Each feature tagged as `core`, `integrations`, `enterprise`, `mobile`, `other`
3. **Assign Category Weights**:
   - Core functionality: 40%
   - Integrations: 25%
   - Enterprise features: 20%
   - Mobile apps: 10%
   - Other: 5%

4. **Calculate Overlap Score**:
   ```
   overlap = |T ∩ C| / |T|  // What % of target features does competitor have?
   ```

5. **Calculate Differentiation Score**:
   ```
   differentiation = |T \ C| / |T|  // What % of target features are unique?
   ```

6. **Weighted Parity Score**:
   ```
   parity_score = (0.7 * overlap + 0.3 * differentiation) * 100
   ```

**Interpretation**:
- **Score 90-100**: Near parity, commodity risk HIGH
- **Score 75-89**: Strong overlap, differentiation moderate
- **Score 50-74**: Significant gaps, target has advantages
- **Score <50**: Weak competitor, different market segment

### Example Calculation

**Target (ITONICS)**: 20 features (10 core, 5 integrations, 3 enterprise, 2 mobile)
**Competitor (Miro)**: 18 features (8 core overlap, 4 integration overlap, 2 enterprise overlap, 2 mobile overlap, 2 unique to Miro)

```
overlap = 16/20 = 0.80 (80% feature coverage)
differentiation = 4/20 = 0.20 (20% unique to ITONICS)
parity_score = (0.7 * 0.80 + 0.3 * 0.20) * 100 = 62

Interpretation: Miro has 80% feature overlap but ITONICS has 20% unique features
→ Moderate competitive differentiation
```

### Rationale
- Penalizes feature gaps (overlap component = 70% weight)
- Rewards unique differentiators (differentiation component = 30% weight)
- Category weights favor core functionality (40%) over nice-to-haves
- Score anchored to target features (not competitor features) for acquisition perspective

---

## R4: Competitive Moat Strength Calculation

### Question
How to compute a 0-100 composite moat score from multiple competitive factors (FR-005)?

### Algorithm Design

**Multi-Factor Model** (inspired by Porter's Five Forces):

```
moat_score = weighted_average([
  feature_differentiation: 35%,    // Product moat
  pricing_power: 25%,               // Economic moat
  brand_recognition: 20%,           // Marketing moat
  customer_lock_in: 10%,            // Switching cost moat
  network_effects: 10%              // Platform moat
])
```

**Component Calculations**:

1. **Feature Differentiation (35%)**:
   ```
   avg_parity = average(parity_scores for all competitors)
   feature_diff = 100 - avg_parity

   Example: If avg parity = 65, then feature_diff = 35
   (Lower parity = higher differentiation = stronger moat)
   ```

2. **Pricing Power (25%)**:
   ```
   price_premium = (target_price - median_competitor_price) / median_competitor_price * 100
   pricing_power = normalize(price_premium, -50 to +100, 0 to 100)

   Example: ITONICS at $50/user, competitors median $45/user
   price_premium = (50-45)/45 * 100 = +11%
   pricing_power = 61 (above parity pricing indicates brand strength)
   ```

3. **Brand Recognition (20%)**:
   ```
   brand_score = weighted_average([
     g2_rating: 40%,           // G2 score (0-5) → normalize to 0-100
     gartner_mentions: 30%,    // Count of Gartner mentions (cap at 10) → scale to 100
     awards: 20%,              // Industry awards count (cap at 5) → scale to 100
     review_volume: 10%        // G2 review count (cap at 1000) → scale to 100
   ])
   ```

4. **Customer Lock-In (10%)**:
   ```
   lock_in_score = weighted_average([
     contract_length: 50%,     // Months (cap at 36) → scale to 100
     migration_cost: 30%,      // Estimated days (cap at 90) → scale to 100
     integrations: 20%         // Deep integrations count (cap at 20) → scale to 100
   ])
   ```

5. **Network Effects (10%)**:
   ```
   network_score = weighted_average([
     user_base: 60%,           // Log scale of users (cap at 1M) → scale to 100
     ecosystem_size: 40%       // Partner/plugin count (cap at 500) → scale to 100
   ])
   ```

**Final Moat Score**:
```
moat_score =
  0.35 * feature_differentiation +
  0.25 * pricing_power +
  0.20 * brand_recognition +
  0.10 * customer_lock_in +
  0.10 * network_effects
```

### Interpretation Scale

- **80-100**: **Dominant Moat** - Market leader, high defensibility
- **60-79**: **Strong Moat** - Sustainable competitive advantage
- **40-59**: **Moderate Moat** - Defensible but vulnerable
- **20-39**: **Weak Moat** - High commoditization risk
- **0-19**: **No Moat** - Undifferentiated offering

### Rationale
- **Weights emphasize measurable factors**: Feature differentiation (35%) and pricing power (25%) are easier to quantify than network effects
- **Multi-dimensional**: Captures product, economic, brand, and structural moats
- **Acquisition-focused**: Helps answer "Is this worth the premium?" for M&A context
- **Comparable across sectors**: Normalization allows cross-industry comparison

---

## R5: ResearchGPT™ Integration

### Question
How to extend existing ResearchGPT™ infrastructure for batch competitor analysis without duplicating code?

### Current ResearchGPT™ Architecture

**Location**: `lib/research-gpt/`

**Structure**:
```
lib/research-gpt/
├── research-gpt-service.ts          # Orchestration
├── data-sources/
│   ├── companies-house.ts
│   ├── news-api.ts
│   ├── website-scraper.ts
│   └── reed-jobs.ts
├── analyzers/
│   ├── snapshot-analyzer.ts
│   ├── signals-analyzer.ts
│   ├── decision-makers-analyzer.ts
│   ├── revenue-analyzer.ts
│   └── recommendations-analyzer.ts
└── repository/
    └── research-repository.ts
```

**Key Capabilities**:
- Parallel data fetching from 4+ sources
- OpenRouter + Claude Sonnet 3.5 for AI analysis
- Smart caching (7 days for snapshots, 6 hours for signals)
- Rate limiting built-in
- Performance: 95% complete in <30 seconds

### Integration Design

**New Files** (extend, don't duplicate):

1. **`lib/research-gpt/competitor-analyzer.ts`** - New analyzer for competitive positioning
   ```typescript
   export class CompetitorAnalyzer {
     async analyzeCompetitor(companyUrl: string): Promise<CompetitorProfile> {
       // Reuse website-scraper.ts
       const websiteData = await this.websiteScraper.scrape(companyUrl);

       // Use Claude to extract features, pricing, positioning
       const analysis = await this.llmClient.analyze(websiteData, prompt);

       return {
         features: analysis.features,
         pricing: analysis.pricing,
         positioning: analysis.positioning
       };
     }
   }
   ```

2. **`lib/competitive-analysis/data-gatherer.ts`** - Wrapper calling ResearchGPT™
   ```typescript
   import { CompetitorAnalyzer } from '@/lib/research-gpt/competitor-analyzer';

   export async function gatherCompetitorData(competitors: string[]): Promise<CompetitorData[]> {
     const analyzer = new CompetitorAnalyzer();
     return Promise.all(competitors.map(c => analyzer.analyzeCompetitor(c)));
   }
   ```

**Reused Components**:
- `website-scraper.ts` - For fetching competitor websites
- `news-api.ts` - For recent competitor news
- OpenRouter client wrapper - For Claude Sonnet 3.5 calls
- Caching layer - Store competitor data with 7-day TTL
- Rate limiter - Existing implementation

**New Prompt Templates** (for Claude):
```
System: You are analyzing a competitor company for M&A due diligence.

Task: Extract structured data from the company website.

Required fields:
- Product features (list)
- Pricing model (description + price points)
- Market positioning statement
- Target customer segments
- Key differentiators

Output: JSON format {...}
```

### Benefits
- **DRY**: Reuse 80% of existing ResearchGPT™ code
- **Consistency**: Same rate limiting, error handling, caching strategy
- **Performance**: Proven <30s completion time carries over
- **Maintainability**: Bug fixes in ResearchGPT™ automatically improve competitor analysis

---

## R6: Historical Data Retention Policy

### Question
How long should competitor analysis snapshots be retained (addresses deferred clarification #7)?

### Options Evaluated

| Retention Period | Storage Cost (est) | Use Case Coverage | Risk |
|------------------|-------------------|-------------------|------|
| 6 months | Low | Active deals only | Lose post-mortem data |
| 12 months | Medium | + Closed deals | Short learning window |
| 24 months | Medium-High | + Historical comparison | Growing storage |
| Indefinite | High | Full historical record | Unbounded growth |

### Decision

**Tiered Retention Policy**:

1. **Active Analyses**: Indefinite retention
   - Definition: Analysis with last_viewed_at < 90 days OR marked as "active"
   - Rationale: Ongoing deals need historical snapshots for trend analysis

2. **Closed Deals** (Target Acquired): 24 months after deal closure
   - Definition: Analysis marked with `deal_status = 'closed_acquired'`
   - Rationale: Post-mortem learning ("Were our competitive assumptions correct?")
   - After 24 months: Auto-archive to cold storage (optional retrieval)

3. **Abandoned Deals**: 12 months after last activity
   - Definition: Analysis with last_viewed_at > 90 days AND no activity
   - Rationale: May revisit target later; 12 months gives sufficient window
   - After 12 months: Soft delete (can be restored for 90 days)

4. **User-Initiated Archival**: Immediate
   - Users can manually archive analyses to cold storage
   - Archived analyses excluded from stale-data alerts (FR-025)

### Implementation

**Database Fields** (add to `competitive_analyses` table):
```sql
deal_status VARCHAR(20) CHECK (deal_status IN ('active', 'closed_acquired', 'closed_passed', 'abandoned')),
archived_at TIMESTAMPTZ,
auto_archive_at TIMESTAMPTZ  -- Calculated trigger
```

**Automated Job** (optional for v1, required for v2):
- Cron job runs weekly
- Flags analyses for archival based on retention rules
- Sends email notification before auto-archival (7-day warning)

### Storage Impact (Estimated)

**Assumptions**:
- 100 active M&A analysts
- 2 new analyses per analyst per month = 200 analyses/month
- Average analysis size: 5MB (including snapshots)

**Projections**:
- Year 1: 200 analyses/mo * 12 mo * 5MB = 12GB
- Year 2 (with retention policy): ~18GB (steady state with deletions)
- Without retention: ~24GB/year (linear growth)

**Savings**: ~25% storage reduction with tiered policy

### Rationale
- Balances learning from history with storage cost management
- Active deals never lose data (critical for ongoing due diligence)
- Post-mortem analysis window (24 mo) aligns with typical integration timeline
- User control via manual archival
- Automated cleanup reduces maintenance burden

---

## Technology Decisions Summary

| Decision Area | Choice | Primary Rationale |
|---------------|--------|-------------------|
| Data Sources | Hybrid (ResearchGPT™ + Manual) | Reuse existing infrastructure, fill gaps |
| PPTX Export | pptxgenjs | TypeScript support, active maintenance, chart support |
| Feature Parity | Overlap + Differentiation | Penalizes gaps, rewards uniqueness |
| Moat Scoring | 5-factor weighted average | Multi-dimensional, measurable, acquisition-focused |
| ResearchGPT™ Integration | Extend with new analyzer | DRY principle, proven performance |
| Data Retention | Tiered (indefinite/24mo/12mo) | Balance history access with storage costs |

---

## Dependencies & Risks

### New Dependencies
```json
{
  "dependencies": {
    "pptxgenjs": "^3.12.0",
    "exceljs": "^4.4.0",
    "@react-pdf/renderer": "^3.1.14"
  }
}
```

### Integration Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| ResearchGPT™ rate limits | Analysis fails for >10 competitors | Implement queue + retry mechanism |
| Web scraping blocked | Missing competitor data | Graceful degradation to manual entry |
| Export library bugs | Failed PDF/PPTX generation | Comprehensive error handling + fallback to JSON |
| Claude API timeout | Slow analysis generation | Set 120s timeout, show progress indicators |

### Performance Validation Required

- [ ] Test data gathering for 10 competitors < 2 minutes (FR-028)
- [ ] Test dashboard load < 3 seconds (FR-029)
- [ ] Test export generation < 10 seconds per format
- [ ] Test concurrent analyses (50+ simultaneous users)

---

## Open Questions for Phase 1

None - all Phase 0 research complete. Ready to proceed with data model design and contract generation.

---

**Next Phase**: Phase 1 (Design & Contracts) - Create data-model.md, contracts/, quickstart.md
