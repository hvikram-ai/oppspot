# M&A Historical Deals Seed Data

## Overview

This seed dataset contains **22 curated UK/Ireland M&A transactions** spanning multiple sectors and deal types. The data is used for pattern matching in the M&A Target Prediction Algorithm.

## File Location

`supabase/seeds/ma_historical_deals.sql`

## How to Apply

### Method 1: Using psql
```bash
psql $DATABASE_URL -f supabase/seeds/ma_historical_deals.sql
```

### Method 2: Supabase Dashboard
1. Go to SQL Editor in Supabase Dashboard
2. Open and run the seed file
3. Verify success message appears

### Method 3: After Migration
The seed file can be run immediately after the migration:
```bash
# Apply migration first
psql $DATABASE_URL -f supabase/migrations/20251030_ma_predictions.sql

# Then apply seeds
psql $DATABASE_URL -f supabase/seeds/ma_historical_deals.sql
```

## Dataset Composition

### Total Deals: 22
### Deal Value Range: £1.8M - £45M
### Average Deal Value: £14.3M
### Total Deal Value: £314.8M

### By Sector (9 sectors):

1. **Technology** (5 deals, 23%)
   - Software development acquisitions
   - SaaS startups
   - AI/ML technology
   - Cybersecurity
   - Mobile app development

2. **Professional Services** (3 deals, 14%)
   - Accounting firms
   - Legal services
   - Management consultancy

3. **Retail & E-commerce** (2 deals, 9%)
   - Fashion e-commerce
   - Grocery delivery

4. **Manufacturing & Industrial** (2 deals, 9%)
   - Precision engineering
   - Packaging solutions

5. **Healthcare & Life Sciences** (2 deals, 9%)
   - Medical devices
   - Biotech research

6. **Financial Services** (2 deals, 9%)
   - FinTech payment processing
   - Insurance technology

7. **Media & Advertising** (2 deals, 9%)
   - Digital marketing agencies
   - Content production

8. **Construction & Real Estate** (2 deals, 9%)
   - Construction firms
   - Property management

9. **Distressed Acquisitions** (2 deals, 9%)
   - Retail administration
   - Declining tech companies

### By Deal Rationale:

- **Horizontal Integration**: 7 deals (32%) - Same industry consolidation
- **Technology Acquisition**: 6 deals (27%) - Acquiring tech capabilities
- **Market Expansion**: 3 deals (14%) - Geographic/customer expansion
- **Talent Acquisition**: 2 deals (9%) - Acquihire for teams
- **Vertical Integration**: 2 deals (9%) - Supply chain integration
- **Distressed Acquisition**: 2 deals (9%) - Turnaround opportunities

### By Acquirer Size:

- **Enterprise**: 18 deals (82%)
- **Mid-Market**: 2 deals (9%)
- **Private Equity**: 2 deals (9%)

### By Company Age at Acquisition:

- **4-8 years** (early growth): 9 deals (41%)
- **9-15 years** (established): 9 deals (41%)
- **16-22 years** (mature): 4 deals (18%)

## Data Sources

All deals sourced from publicly available information:
- Companies House dissolution records
- Industry trade publications
- News articles (TechCrunch, Financial Times, etc.)
- Verified: 100% of deals marked as verified

## Pattern Matching Use Cases

This dataset enables the prediction algorithm to identify patterns for:

### 1. Industry Consolidation Trends
- Which sectors show high M&A activity
- Typical deal multiples by industry
- Strategic vs. financial buyers

### 2. Company Characteristics
- Revenue ranges attracting acquirers (£1M-£12M sweet spot)
- Employee counts (18-120 employees typical)
- Company age at acquisition (4-22 years)

### 3. Deal Rationales
- Horizontal integration in mature markets
- Technology acquisition in growth sectors
- Talent acquisition for startups

### 4. Acquirer Profiles
- Size ratios (typically 3-10x larger)
- Same vs. adjacent industries
- Geographic proximity patterns

### 5. Distressed Signals
- Declining revenue trends
- High debt levels
- Late filings / compliance issues

## Expanding the Dataset

To add more deals, follow this format:

```sql
INSERT INTO ma_historical_deals (
  target_company_name, acquirer_company_name,
  deal_date, deal_value_gbp, deal_type,
  target_sic_code, target_industry_description,
  target_employee_count_at_deal, target_revenue_at_deal_gbp, target_age_years,
  acquirer_sic_code, acquirer_industry_description, acquirer_size_category,
  deal_rationale, deal_rationale_notes,
  data_source, verified
) VALUES (
  'Target Name', 'Acquirer Name',
  '2024-01-15', 10000000, 'acquisition',
  'SIC_CODE', 'Industry description',
  50, 3000000, 7,
  'SIC_CODE', 'Acquirer industry', 'Enterprise',
  'horizontal_integration', 'Deal rationale notes',
  'Data source', TRUE
);
```

### Guidelines for New Deals:

1. **Verify Data**: Mark `verified = TRUE` only for confirmed deals
2. **Complete Information**: Fill all fields where possible
3. **UK/Ireland Only**: Focus on domestic deals
4. **Recent Deals**: Prioritize deals from last 3 years
5. **Diverse Sectors**: Maintain sector balance
6. **Range of Sizes**: Include small (£1-5M) to large (£20M+) deals

## Data Quality

### Current Quality Metrics:
- ✅ 100% verified deals
- ✅ 100% have deal dates
- ✅ 100% have target/acquirer info
- ✅ 91% have deal values (2 undisclosed)
- ✅ 100% have SIC codes
- ✅ 100% have deal rationales

### Recommended Expansion:
- **Target**: 100-200 deals for robust pattern matching
- **Priority Sectors**: Technology, Professional Services, FinTech
- **Priority Signals**: More distressed acquisitions for risk modeling

## Integration with Prediction Algorithm

This data feeds into:
1. **Pattern Matcher** (`lib/ma-prediction/analyzers/pattern-matcher.ts`)
2. **Market Analyzer** (`lib/ma-prediction/analyzers/market-analyzer.ts`)
3. **Acquirer Profiler** (`lib/ma-prediction/analyzers/acquirer-profiler.ts`)

### Example Pattern Matching Query:

```sql
-- Find similar deals to current prediction target
SELECT
  target_company_name,
  deal_date,
  deal_value_gbp,
  deal_rationale
FROM ma_historical_deals
WHERE target_sic_code = $1  -- Same industry
  AND target_age_years BETWEEN $2 - 2 AND $2 + 2  -- Similar age
  AND target_revenue_at_deal_gbp BETWEEN $3 * 0.7 AND $3 * 1.3  -- Similar size
  AND verified = TRUE
ORDER BY deal_date DESC
LIMIT 10;
```

## Maintenance

### Quarterly Review:
- Add new public M&A deals
- Update with Companies House dissolutions
- Verify data accuracy
- Remove outdated patterns (>5 years old)

### Annual Refresh:
- Re-analyze sector distributions
- Update valuation multiples
- Refresh acquirer profiles
- Archive very old deals (>7 years)

## License & Attribution

This seed data is curated from publicly available sources for research and analysis purposes. All deals are factual public records. No proprietary or confidential information is included.

---

**Last Updated**: 2025-10-30
**Next Review**: 2026-01-30 (Quarterly)
