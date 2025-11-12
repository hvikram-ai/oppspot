# ESG Risk Screening - User Guide

## Table of Contents
1. [What is ESG Risk Screening?](#what-is-esg-risk-screening)
2. [Accessing ESG Dashboards](#accessing-esg-dashboards)
3. [Understanding ESG Scores](#understanding-esg-scores)
4. [Viewing Metrics](#viewing-metrics)
5. [Benchmark Comparisons](#benchmark-comparisons)
6. [Exporting Reports](#exporting-reports)
7. [FAQs](#faqs)

---

## What is ESG Risk Screening?

ESG Risk Screening analyzes company performance across **Environmental, Social, and Governance** factors, providing:

- **26+ ESG Metrics** across E, S, G categories
- **Peer Benchmarking** by sector, size, and region
- **Performance Scoring** with leading/par/lagging levels
- **Board-Ready PDF Reports** for stakeholder communication
- **Evidence-Based Analysis** with citations to source documents

### Key Benefits

✅ **Risk Identification**: Spot ESG risks before they impact deals
✅ **Peer Comparison**: See how companies stack up vs. industry benchmarks
✅ **Data-Driven Decisions**: Make informed M&A and investment choices
✅ **Compliance Support**: Track ESG compliance requirements
✅ **Stakeholder Reporting**: Generate professional reports in seconds

---

## Accessing ESG Dashboards

### From Company Detail Page

1. Navigate to any company profile (e.g., `/business/[id]`)
2. Look for the **"Actions"** card on the right sidebar
3. Click the **"ESG Risk Screening"** button (green Leaf icon)
4. You'll be taken to the ESG dashboard at `/companies/[id]/esg`

### Direct URL Access

You can access any company's ESG dashboard directly:
```
https://oppspot.ai/companies/[company-id]/esg
```

---

## Understanding ESG Scores

### Score Scale: 0-100

- **0-24**: **Lagging** - Below industry standards 🔴
- **25-74**: **Par** - Meeting industry norms 🟡
- **75-100**: **Leading** - Exceeding benchmarks 🟢

### Three Main Categories

#### 1. Environmental (E)
Measures environmental impact and sustainability:
- **Climate & Emissions**: GHG Scope 1, 2, 3 emissions
- **Energy & Resources**: Energy consumption, renewable energy percentage
- **Water & Waste**: Water usage, waste management, recycling rates

#### 2. Social (S)
Assesses social responsibility and workplace practices:
- **Labor & Human Rights**: Employee turnover, training hours, safety (TRIR)
- **Diversity & Inclusion**: Gender diversity, Board diversity
- **Customer & Community**: Product safety, data privacy, community impact

#### 3. Governance (G)
Evaluates corporate governance structures:
- **Board & Leadership**: Board independence, Board diversity, tenure
- **Ethics & Compliance**: Ethics policies, ESG committees, whistleblowing
- **Risk Management**: Cybersecurity policies, risk frameworks

### How Scores Are Calculated

1. **Metric Collection**: Data extracted from company reports/documents
2. **Normalization**: Values normalized to comparable units
3. **Benchmark Matching**: Matched against sector/size/region peers
4. **Percentile Calculation**: Position determined (p10, p25, p50, p75, p90)
5. **Weighted Aggregation**: Category scores computed from metric scores
6. **Level Assignment**:
   - Leading: ≥ p75 (top 25%)
   - Par: p25-p75 (middle 50%)
   - Lagging: < p25 (bottom 25%)

---

## Viewing Metrics

### Category Tiles (Dashboard Overview)

At the top of the ESG dashboard, you'll see **3 large category cards**:

**What You See:**
- **Category Name** (Environmental, Social, Governance)
- **Overall Score** (e.g., 67/100)
- **Performance Level** badge (Leading/Par/Lagging)
- **Benchmark Position** (e.g., "p65 vs. peers")
- **Subcategories** (top 3 shown, e.g., "Climate & Emissions", "Labor & Human Rights")
- **Data Coverage** indicator

**How to Use:**
- Click any category card to filter the metrics table below
- Hover over subcategories to see individual scores
- Check the progress bar for visual score representation

### Metrics Table (Detailed View)

Below the category tiles, you'll find a comprehensive **metrics table**:

**Columns:**
- **Metric Name**: What's being measured
- **Category**: E / S / G badge
- **Value**: Actual measured value with unit
- **Benchmark Percentile**: Where you rank vs. peers
- **Confidence**: Extraction confidence (High/Medium/Low)
- **Source**: Document where data was found
- **Actions**: "View Citation" button

**Filtering:**
- **Category Filter**: Show only Environmental, Social, or Governance metrics
- **Subcategory Filter**: Narrow down further (e.g., "Climate & Emissions")
- **Search**: Type to find specific metrics

**Sorting:**
- Click any column header to sort ascending/descending
- Default sort: Category → Subcategory → Metric Name

### Evidence Panel (Citation Viewer)

Click **"View Citation"** on any metric to open the **Evidence Panel**:

**What You See:**
- **Extracted Value**: The numeric/text value found
- **Confidence Score**: Percentage with progress bar
- **Confidence Interpretation**:
  - **High (≥80%)**: Reliable, verified data
  - **Medium (50-79%)**: Generally accurate, minor uncertainties
  - **Low (<50%)**: Use with caution, verify manually
- **Source Citation**: Document ID and page number
- **Excerpt**: Text passage where value was found
- **Metadata**: Created date, updated date, category

**How to Use:**
- Click **"View in Document"** to open the source PDF at the exact page
- Review the excerpt to verify accuracy
- Use confidence scores to prioritize data quality improvements

---

## Benchmark Comparisons

### Benchmark Bars (Visual Comparison)

The **Benchmark Bars** section shows how your metrics compare visually:

**What You See:**
- **Horizontal bar** divided into color zones:
  - **Red zone** (left): Lagging (< p25)
  - **Yellow zone** (middle): Par (p25-p75)
  - **Green zone** (right): Leading (> p75)
- **Percentile markers**: p10, p25, p50, p75, p90
- **"You are here" marker**: Blue dot showing your position
- **Legend**: Percentile values for your sector/size/region

**How to Interpret:**
- **Green Zone**: You're outperforming 75%+ of peers
- **Yellow Zone**: You're in the middle 50% (typical)
- **Red Zone**: You're in the bottom 25% (needs improvement)

### Benchmark Metadata

Benchmarks are matched using this priority:
1. **Exact Match**: Your sector + size band + region
2. **Sector Match**: Your sector (any size/region)
3. **Global Fallback**: All companies (last resort)

**Example:**
- **Company**: Technology, Medium (50-250 employees), UK
- **Benchmark**: Technology, Medium, UK (31 companies, 2024 data)

**What's Included:**
- **Sector**: Technology, Financial Services, Manufacturing, etc.
- **Size Bands**: Small, Medium, Large, Enterprise
- **Regions**: UK, Ireland, EU
- **Sample Size**: Number of companies in benchmark
- **Data Year**: When benchmarks were last updated

---

## Exporting Reports

### PDF Export

Generate a professional **6-page PDF report** for stakeholders:

**How to Export:**
1. Click the **"Export PDF"** button (Download icon) in the top right
2. Select the year (current year or historical)
3. PDF downloads automatically with filename: `ESG_Report_[CompanyName]_[Year].pdf`

**Report Contents:**
- **Page 1**: Cover page with company name, reporting period
- **Page 2**: Executive Summary with category scores and highlights
- **Page 3**: Environmental Details (score, subcategories, key metrics)
- **Page 4**: Social Details (score, subcategories, key metrics)
- **Page 5**: Governance Details (score, subcategories, key metrics)
- **Page 6**: Complete Metrics Overview (all metrics table)

**Report Features:**
- ✅ Professional A4 layout
- ✅ Color-coded categories (green/blue/purple)
- ✅ Performance level badges
- ✅ Auto-generated highlights (strengths & weaknesses)
- ✅ Confidence scores for each metric
- ✅ Board-ready formatting

### JSON Export (API)

For programmatic access, use the API:
```bash
GET /api/companies/[id]/esg/summary?year=2024
```

Returns complete ESG data in JSON format for integration with other systems.

---

## Recomputing Scores

### When to Recompute

Recompute ESG scores when:
- ✅ New ESG documents have been uploaded
- ✅ Benchmarks have been updated
- ✅ You want to refresh stale data (> 30 days old)

### How to Recompute

1. Click the **"Recompute Scores"** button (RefreshCw icon)
2. System fetches latest metrics and benchmarks
3. Scores recalculated in real-time (~2-5 seconds)
4. Dashboard automatically refreshes with new data

**What Happens:**
- Metrics are re-matched with latest benchmarks
- Category scores recalculated with updated weights
- Performance levels (leading/par/lagging) reassigned
- Highlights regenerated based on new scores

---

## FAQs

### General Questions

**Q: How often are ESG scores updated?**
A: Scores are updated when new documents are uploaded or when you click "Recompute Scores". Benchmarks are updated quarterly.

**Q: Can I upload my own ESG reports?**
A: Yes! Upload sustainability reports, ESG disclosures, or annual reports to the Data Room. The system will automatically extract ESG metrics.

**Q: What file formats are supported?**
A: PDF documents with extractable text. Scanned PDFs may have lower extraction confidence.

**Q: How are benchmarks determined?**
A: Benchmarks are based on peer companies in the same sector, size band, and region from 2024 data (updated quarterly).

### Scoring Questions

**Q: Why is my score "Lagging" when I have good practices?**
A: "Lagging" means below the 25th percentile of peers, not necessarily "bad". It's relative to your industry peers. Consider improving documentation or disclosure quality.

**Q: Can I customize scoring weights?**
A: Currently, default weights are used (defined in ESG templates). Custom weights are a planned enhancement.

**Q: What does "No benchmark available" mean?**
A: No comparable peers exist for your specific sector/size/region. We fall back to broader benchmarks (sector-wide or global).

**Q: Why do some metrics have low confidence scores?**
A: Low confidence indicates uncertain extraction (ambiguous text, unclear units, conflicting values). Verify manually and consider updating source documents for clarity.

### Data Questions

**Q: Where does ESG data come from?**
A: Data is extracted from uploaded documents (sustainability reports, ESG disclosures, annual reports, policies) using pattern-based and AI-powered extraction.

**Q: Can I manually edit ESG metrics?**
A: Not currently. Metrics are extracted from documents to ensure auditability and compliance. Upload corrected documents for updated metrics.

**Q: How do I add missing metrics?**
A: Upload documents containing the missing information. The system will extract available metrics. Some metrics may require specific disclosures.

**Q: Are ESG scores audited?**
A: ESG scores are computed from extracted data with confidence scores. They are not third-party audited. Use as directional guidance, not compliance certification.

### Technical Questions

**Q: What happens if I have no ESG documents uploaded?**
A: The dashboard will show an empty state with guidance to upload ESG reports. No scores can be computed without source data.

**Q: Can I compare multiple companies side-by-side?**
A: Not in the current version. This is a planned enhancement. Use PDF exports to create manual comparisons.

**Q: How long does PDF export take?**
A: Typically 2-3 seconds. Large reports with 100+ metrics may take up to 5 seconds.

**Q: Can I access historical ESG data?**
A: Yes! Use the year selector at the top of the dashboard to view previous years (if data exists).

### Benchmark Questions

**Q: How many companies are in each benchmark?**
A: Sample sizes vary by sector/size/region. Typical ranges:
- Technology (UK, Medium): 45 companies
- Financial Services (UK, Large): 38 companies
- Manufacturing (Ireland, Medium): 31 companies

**Q: Are benchmarks industry-standard?**
A: Benchmarks are compiled from peer company data within oppSpot. They align with industry trends but are not official regulatory benchmarks (e.g., not TCFD/CSRD certified).

**Q: Can I request benchmark updates?**
A: Contact support to request sector-specific or regional benchmark updates. We update benchmarks quarterly based on latest disclosed data.

---

## Best Practices

### For Accurate Scores

1. **Upload Comprehensive Reports**: Include all ESG documents (sustainability reports, ESG disclosures, policies)
2. **Use Clear Formatting**: Well-formatted PDFs with clear labels improve extraction accuracy
3. **Verify High-Impact Metrics**: Manually review low-confidence scores, especially for critical metrics
4. **Update Regularly**: Upload new reports annually to track progress over time

### For Stakeholder Reporting

1. **Export PDFs Before Meetings**: Generate reports in advance for review
2. **Highlight Improvements**: Use multi-year data to show ESG progress
3. **Address Weaknesses**: Proactively explain lagging areas with improvement plans
4. **Cite Sources**: Use evidence panel to show data provenance

### For M&A Due Diligence

1. **Check All Categories**: Don't just focus on Environmental - S and G matter too
2. **Compare vs. Peers**: Use benchmark bars to identify outliers (risks or opportunities)
3. **Review Low-Confidence Metrics**: These may hide risks - verify manually
4. **Flag Red Flags**: Lagging governance scores may indicate compliance issues

---

## Support & Feedback

**Need Help?**
- Review this guide first
- Check FAQs above
- Contact support: support@oppspot.ai

**Found a Bug?**
- Report issues at: https://github.com/BoardGuruHV/oppspot/issues
- Include: Company ID, metric name, expected vs. actual behavior

**Feature Requests?**
- Submit via GitHub Issues
- Common requests: custom weights, peer comparison, TCFD compliance

---

**Last Updated**: November 2025
**Version**: 1.0
**For**: oppSpot ESG Risk Screening Feature
