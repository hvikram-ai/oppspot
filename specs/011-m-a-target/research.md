# Research: M&A Target Prediction Algorithm

**Date**: 2025-10-30
**Status**: Complete
**Purpose**: Resolve technical unknowns and establish design decisions for M&A prediction feature

---

## 1. Operational Metrics Selection (FR-002)

### Decision
Analyze the following operational metrics for M&A prediction:
- **Employee count trends** (growth/decline rate over 2+ years)
- **Director changes** (frequent C-level changes may indicate instability or succession planning)
- **Registered office relocations** (stability indicator)
- **Filing punctuality** (consistent late filings may indicate organizational stress)

### Rationale
These metrics are **available via Companies House API** (existing integration) and have predictive power:
- Declining employee count + stable revenue = efficiency improvements (attractive)
- Rapid employee growth + declining profitability = unsustainable scaling (vulnerable)
- Frequent director changes = potential succession-driven M&A
- Late filings = potential distress signals

### Data Availability
- Companies House API: Director appointments, resignations, registered office changes
- oppSpot existing data: Employee count estimates (if available from earlier enrichment)
- ResearchGPT™ integration: Can extract employee trends from news/website scraping

### Alternatives Considered
- Customer concentration: Not publicly available for most UK/Ireland companies
- Contract pipeline: Private information, not accessible
- **Rejected**: Metrics requiring proprietary data sources

---

## 2. Market Position Factors (FR-003)

### Decision
Evaluate market position using:
- **Industry consolidation rate** (M&A activity in company's SIC code over past 3 years)
- **Company age** (younger companies more likely targets for acquihire/tech acquisition)
- **Geographic clustering** (companies in M&A-active regions)
- **Sector maturity** (mature sectors see more roll-up M&A)

### Rationale
These factors are derivable from existing oppSpot data:
- `businesses.sic_code` + historical M&A patterns → industry consolidation rate
- `businesses.incorporation_date` → company age calculation
- `locations.region` → geographic patterns
- SIC code mapping → sector maturity classification

### Integration with market_metrics
- **Extend** existing `market_metrics` table to include:
  - `ma_activity_score` (M&A deals per industry per year)
  - `sector_maturity` (emerging/growth/mature classification)
- OR create new `ma_market_indicators` table to avoid polluting existing metrics

### Alternatives Considered
- Market share analysis: Requires competitive intelligence data (expensive)
- Brand recognition: Subjective and hard to quantify
- **Rejected**: Factors requiring expensive third-party data

---

## 3. Acquirer Profile Logic (FR-018)

### Decision
Generate acquirer profiles using rule-based matching:
1. **Industry Match**: Companies in same or adjacent SIC codes
2. **Size Ratio**: Acquirers typically 3-10x larger by revenue/employees
3. **Geographic Proximity**: UK/Ireland companies prioritize local acquisitions (but consider global PE firms)
4. **Strategic Rationale**: Pattern matching based on historical M&A deals
   - Horizontal integration: Same industry, expand market share
   - Vertical integration: Supply chain consolidation
   - Technology acquisition: Younger tech companies acquired by larger incumbents

### Rationale
Rule-based approach is **explainable** and doesn't require ML training data. Can be enhanced later with AI-powered pattern recognition.

### Implementation Approach
```
For each High/Very High prediction:
  1. Query businesses table for:
     - Same industry (SIC code match)
     - 3-10x size difference
     - Active status
  2. Rank by:
     - Geographic proximity (same region = higher score)
     - Historical acquisition behavior (if available)
     - Financial capacity (cash reserves, profitability)
  3. Return top 5 acquirer profiles
```

### Alternatives Considered
- AI-powered acquirer prediction: Requires extensive training data (hundreds of deals)
- External API integration: Expensive (Crunchbase, PitchBook)
- **Rejected**: Complexity and cost outweigh value for MVP

---

## 4. Minimum Data Threshold (FR-024)

### Decision
Require minimum data for predictions:
- **2 years of financial data** (revenue, profitability, cash flow)
- **Basic company info** (industry, employee count estimate, age)
- **Recent activity** (filing within past 18 months = active)

If insufficient data:
- Display **"Insufficient Data"** message instead of prediction
- Log as `confidence_level: null` in database
- Suggest user trigger ResearchGPT™ to gather more data

### Rationale
- 2 years establishes trend direction (growth/decline)
- Younger companies (<2 years) get **lower confidence** scores but still predict (acquihire potential)
- Inactive companies (no recent filings) excluded to avoid false positives

### Edge Cases
- **Partial data**: Generate prediction with "Low confidence" flag
- **Stale data**: Warn users "Last updated: 12 months ago"
- **Newly incorporated**: Use industry averages + company age as proxy

### Alternatives Considered
- 3+ years of data: Too restrictive, excludes young growth companies
- No minimum: Generates unreliable predictions
- **Decision**: 2 years balances data quality and coverage

---

## 5. Regulatory Compliance (FR-027)

### Decision
Include **financial disclaimer** on all M&A prediction pages:
```
⚠️ DISCLAIMER: M&A predictions are for informational purposes only and do not
constitute financial, legal, or investment advice. oppSpot is not regulated by
the Financial Conduct Authority (FCA). Predictions are based on publicly
available data and algorithmic analysis. Always conduct independent due
diligence and consult professional advisors before making business decisions.
```

### Rationale
- UK FCA regulations apply to **investment advice** but oppSpot provides **information tools**
- Disclaimer clarifies we are not providing regulated advice
- Similar to financial news sites (Bloomberg, Reuters) that publish analysis without FCA authorization

### Implementation
- Add disclaimer component to all M&A prediction pages
- Include in exported PDF/Excel reports
- Log user acceptance in audit trail (optional for future compliance)

### Legal Review
**Recommendation**: Have legal counsel review disclaimer before production release.

### Alternatives Considered
- FCA authorization: Expensive and unnecessary for information tools
- No disclaimer: Legal risk
- **Decision**: Clear disclaimer protects oppSpot while providing value

---

## 6. Historical M&A Data Source

### Decision
Use **multi-source approach**:
1. **Manual seed dataset**: Curate 100-200 notable UK/Ireland M&A deals from public sources
   - Companies House dissolution records (acquired companies often dissolve)
   - News articles (TechCrunch, Business Insider UK, Irish Times)
   - Public filings (AIM market announcements)
2. **Ongoing enrichment**: Users can flag completed M&A deals to improve algorithm
3. **Future enhancement**: Integrate with Crunchbase API (if budget allows)

### Rationale
- Free public data sufficient for MVP pattern matching
- Manual curation ensures quality (better than noisy web scraping)
- Community feedback loop improves accuracy over time

### Data Structure
Store in new `ma_historical_deals` table:
- Deal date, target company, acquirer, deal value (if public)
- Target company SIC code, size, age at acquisition
- Acquirer SIC code, size
- Deal rationale (horizontal, vertical, technology, etc.)

### Alternatives Considered
- Crunchbase API: $50K+ per year
- Web scraping: Legal gray area, data quality issues
- **Decision**: Manual curation for MVP, API integration later if ROI justifies

---

## 7. Prediction Algorithm Design

### Decision
**Hybrid AI + Rule-Based Scoring**:

#### Phase 1: Rule-Based Scoring (50% weight)
Calculate base score from:
- **Financial Health** (30%): Declining revenue + profitability = higher score
- **Company Age** (10%): 5-15 years = sweet spot for acquisition
- **Industry Activity** (10%): High M&A activity in sector = higher score

#### Phase 2: AI-Powered Analysis (50% weight)
Use OpenRouter API (Claude 3.5 Sonnet) to analyze:
- Prompt: "Based on the following company data, assess M&A likelihood on 0-100 scale..."
- Input: Financial trends, operational metrics, industry context, recent news
- Output: Score + top 5 contributing factors with explanations

#### Final Score
```
final_score = (rule_based_score * 0.5) + (ai_score * 0.5)
likelihood_category = categorize(final_score) // Low/Medium/High/Very High
confidence_level = calculate_confidence(data_completeness, data_recency)
```

### Rationale
- **Rule-based** provides consistency and explainability
- **AI-powered** captures nuanced patterns humans miss
- **Hybrid** balances interpretability with predictive power

### Performance
- Rule-based scoring: <500ms per company
- AI analysis: 2-4s per company (OpenRouter API call)
- **Total**: <5s target achievable with parallel processing

### Alternatives Considered
- Pure ML model: Requires extensive training data (don't have yet)
- Pure rule-based: Misses nuanced patterns
- **Decision**: Hybrid approach leverages AI strengths while maintaining explainability

---

## 8. Batch Processing Strategy

### Decision
Use **Vercel Cron Jobs** + Next.js API Route:

```typescript
// app/api/cron/ma-predictions/route.ts
export async function GET(request: NextRequest) {
  // Verify cron secret for security
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Process companies in batches of 100
  const companies = await fetchAllActiveCompanies();
  for (const batch of chunk(companies, 100)) {
    await Promise.all(batch.map(company =>
      generatePrediction(company.id)
    ));
  }

  return NextResponse.json({ processed: companies.length });
}
```

**Vercel Cron Configuration** (vercel.json):
```json
{
  "crons": [{
    "path": "/api/cron/ma-predictions",
    "schedule": "0 2 * * *"  // 2 AM daily
  }]
}
```

### Rationale
- **Vercel Cron**: Native platform support, no additional infrastructure
- **Nightly at 2 AM**: Low traffic time, predictions ready by morning
- **Batch size 100**: Balances parallelism and API rate limits

### Performance Estimation
- 10,000 companies × 4s average = 40,000 seconds sequential
- With 100 parallel: 40,000 / 100 = 400 seconds (~7 minutes) ✅
- Fallback: If processing exceeds Vercel function timeout (10 min), split across multiple cron jobs

### Alternatives Considered
- Supabase Edge Functions: Limited to 100MB memory, may struggle with large batches
- Separate worker process: Added infrastructure complexity
- **Decision**: Vercel Cron is simplest and sufficient for scale

---

## 9. Real-Time Recalculation Trigger

### Decision
Use **Supabase Database Webhook**:

```sql
-- Trigger function
CREATE OR REPLACE FUNCTION trigger_ma_recalculation()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert job into prediction_recalc_queue
  INSERT INTO ma_prediction_queue (company_id, trigger_type, created_at)
  VALUES (NEW.id, 'data_update', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach to businesses table
CREATE TRIGGER businesses_update_trigger
AFTER UPDATE OF revenue, profitability, employees
ON businesses
FOR EACH ROW
EXECUTE FUNCTION trigger_ma_recalculation();
```

**Queue Processor**:
- Next.js API route polls `ma_prediction_queue` every 60 seconds
- Processes queued recalculations in batches
- Updates existing predictions or creates new ones

### Rationale
- **Database trigger** ensures no updates are missed
- **Queue-based** processing prevents overwhelming the system
- **Async** recalculation doesn't block user workflows

### Alternatives Considered
- Immediate recalculation: Could spike API costs with bulk data imports
- Event-driven (Supabase Realtime): Added complexity
- **Decision**: Queue-based approach balances responsiveness and cost control

---

## 10. Export Implementation

### Decision
Reuse **PDF generation patterns** from ResearchGPT™:

```typescript
// lib/ma-prediction/export/
├── pdf-generator.ts        // Puppeteer HTML→PDF
├── excel-generator.ts      // ExcelJS workbook creation
└── csv-generator.ts        // Simple CSV serialization
```

**Export Flow**:
1. User clicks "Export" → selects format (PDF/Excel/CSV)
2. API generates file in memory (or Supabase Storage for large exports)
3. Return download link or stream file directly

### Rationale
- **Consistent UX** with existing ResearchGPT™ exports
- **Proven patterns** reduce implementation risk
- **No new dependencies** (reuse Puppeteer, ExcelJS)

### Performance
- PDF: 2-5s for single company report
- Excel: 1-3s for bulk export (100 companies)
- CSV: <1s (simple text serialization)

### Alternatives Considered
- Server-side rendering: Slower than client-side generation
- Third-party export APIs: Added cost and dependency
- **Decision**: In-house generation using existing tools

---

## Summary of Decisions

| Item | Decision | Rationale |
|------|----------|-----------|
| Operational Metrics | Employee trends, director changes, filing punctuality | Available via Companies House API |
| Market Factors | Industry consolidation rate, company age, geography | Derivable from existing oppSpot data |
| Acquirer Profiles | Rule-based matching (industry + size + location) | Explainable, no ML training data needed |
| Min Data Threshold | 2 years financial data | Balances quality and coverage |
| Regulatory | Financial disclaimer (not FCA-regulated advice) | Legal protection, common practice |
| Historical M&A Data | Manual seed dataset + ongoing enrichment | Free, quality-controlled |
| Prediction Algorithm | Hybrid AI (OpenRouter) + rule-based scoring | Balances accuracy and explainability |
| Batch Processing | Vercel Cron Jobs (nightly 2 AM) | Native platform support, sufficient scale |
| Real-Time Updates | Supabase triggers + queue processor | Reliable, doesn't miss updates |
| Export | Reuse ResearchGPT™ patterns (Puppeteer, ExcelJS) | Proven, no new dependencies |

---

**Next Phase**: Generate data-model.md and API contracts based on these decisions.
