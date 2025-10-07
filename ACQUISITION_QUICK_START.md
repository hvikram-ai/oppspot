# 🚀 Acquisition Target ID - Quick Start Guide

## 30-Second Demo Access

```
1. Visit: https://oppspot-one.vercel.app/login
2. Click: "Try Demo (No Registration)"
3. Navigate: Opp Scan → "🎯 Full-Stack SaaS Targets"
4. View: 127 analyzed acquisition targets ready!
```

---

## 5-Minute Real Scan Setup

### Step 1: Go to Opp Scan
```
Dashboard → Opp Scan → "New Scan"
```

### Step 2: Quick Configuration

**Industry**: Technology > SaaS
**Region**: Greater London
**Size**: 25-200 employees, £2M-10M revenue
**Data Source**: Companies House
**Depth**: Comprehensive

### Step 3: Execute
```
Review → Start Real Scan → Monitor Progress
```

### Step 4: Results (6-8 hours)
```
View Results → Filter by Score → Shortlist Top 10
```

---

## Configuration Cheat Sheet

### Industries (Most Popular)
```
✓ Technology > SaaS/Cloud
✓ Technology > FinTech
✓ Healthcare > HealthTech
✓ Manufacturing > Industrial Tech
✓ Professional Services > Consulting
```

### Regions (UK & Ireland)
```
✓ Greater London (highest deal flow)
✓ Greater Manchester (tech hub)
✓ Edinburgh (financial + tech)
✓ Dublin (European HQ location)
✓ Birmingham (manufacturing)
```

### Size Filters
```
Startup: 5-25 employees, <£1M revenue
Growth: 25-100 employees, £1M-£5M revenue  ⭐ SWEET SPOT
Scale: 100-500 employees, £5M-£50M revenue
Enterprise: 500+ employees, £50M+ revenue
```

### Data Sources
```
companies_house    ✅ FREE - UK companies (recommended)
irish_cro          💰 €2/company - Irish companies
financial_data     💰 £25/company - Credit ratings, financials
digital_footprint  💰 £15/company - Web/social presence
employee_data      💰 £18/company - LinkedIn data
```

### Scan Depth
```
Basic:         50-100 targets, basic info only
Detailed:      100-300 targets, financial analysis
Comprehensive: 300-1000 targets, full due diligence  ⭐ RECOMMENDED
```

---

## Results Interpretation

### Scoring Breakdown
```
Overall Score (0-100):
├─ Strategic Fit (40%):     Market, product, customer overlap
├─ Financial Health (30%):  Revenue, margins, growth, profitability
├─ Risk Assessment (20%):   Financial, operational, regulatory risk
└─ Synergy Potential (10%): Cultural fit, tech stack, team
```

### Priority Levels
```
🔥 85-100: Top Priority      → Immediate outreach
⭐ 70-84:  High Priority     → Schedule due diligence
✓  55-69:  Medium Priority   → Monitor & engage
⚠️ 40-54:  Low Priority      → Watch list
❌ <40:    Excluded          → Does not meet criteria
```

### Typical Deal Flow
```
Scan → 100+ targets identified
Filter → 30-50 qualified targets
Score → 10-15 high-priority targets
Outreach → 5-8 interested parties
Due Diligence → 2-3 serious discussions
LOI → 1-2 negotiations
Close → 1 acquisition
```

---

## Cost Estimates

### Companies House Only (FREE)
```
Basic Scan:         £0 (UK companies only)
Detailed Scan:      £0
Comprehensive Scan: £0
```

### Multi-Source Comprehensive
```
100 targets:  £1,800 - £3,500
200 targets:  £3,600 - £7,000
500 targets:  £9,000 - £17,500
1000 targets: £18,000 - £35,000
```

### ROI Example
```
Scan Cost:        £5,000
Targets Found:    200
High-Priority:    12
Acquisition:      1 @ £15M
ROI:              300,000% 🚀
```

---

## API Quick Reference

### Create Scan
```bash
POST /api/acquisition-scans
{
  "name": "My Scan",
  "selectedIndustries": [{"key": "technology:saas", "industry": "Technology"}],
  "selectedRegions": [{"id": "london", "name": "Greater London", "country": "England"}],
  "dataSources": ["companies_house"],
  "scanDepth": "comprehensive"
}
```

### Start Scan
```bash
POST /api/acquisition-scans/{scanId}/start-real-scan
```

### Get Results
```bash
GET /api/acquisition-scans/{scanId}/targets
```

---

## Pro Tips

### 🎯 Best Practices
```
✓ Start with 1-2 industries (avoid scope creep)
✓ Use Companies House first (it's free!)
✓ Set realistic revenue/size ranges
✓ Review partial results (don't wait for 100%)
✓ Export to Excel for team sharing
```

### ⚡ Power User Tips
```
✓ Save scan templates for repeat searches
✓ Set up alerts for new matching companies
✓ Use filters to find "hidden gems" (high score, low awareness)
✓ Cross-reference with CrunchBase for funding data
✓ Check Companies House for recent filings
```

### 🚫 Common Mistakes
```
✗ Scanning too broad (1000+ targets = analysis paralysis)
✗ Ignoring medium-priority targets (sometimes best deals)
✗ Not setting up follow-up process first
✗ Focusing only on top score (consider strategic fit too)
✗ Not budgeting time for due diligence
```

---

## Example Scans

### 1. Quick London SaaS Scan
```yaml
Name: London SaaS Quick Scan
Industries: Technology > SaaS
Regions: Greater London
Size: £1M-£10M revenue
Sources: companies_house
Depth: basic
Time: 2-3 hours
Cost: £0
Expected: 50-80 targets
```

### 2. Comprehensive UK FinTech
```yaml
Name: UK FinTech Deep Dive
Industries: Technology > FinTech, Financial Services
Regions: London, Manchester, Edinburgh
Size: £2M-£20M revenue, 25-200 employees
Sources: companies_house, financial_data, digital_footprint
Depth: comprehensive
Time: 6-8 hours
Cost: £3,000-£5,000
Expected: 100-150 targets
```

### 3. Irish Market Entry
```yaml
Name: Ireland Strategic Targets
Industries: Technology > SaaS, Professional Services
Regions: Dublin, Cork, Galway
Size: £500K-£5M revenue
Sources: irish_cro, digital_footprint
Depth: detailed
Time: 4-6 hours
Cost: £1,200-£2,000
Expected: 40-70 targets
```

---

## Troubleshooting

### Scan Not Starting?
```
✓ Check API keys configured (.env.local)
✓ Verify budget available (cost management)
✓ Ensure at least 1 data source selected
✓ Confirm region matches data source
```

### No Results Found?
```
✓ Broaden industry selection
✓ Expand region coverage
✓ Increase size ranges
✓ Reduce minimum criteria
✓ Try different data sources
```

### Too Many Results?
```
✓ Narrow industry subcategories
✓ Tighten size/revenue ranges
✓ Add strategic requirements
✓ Increase minimum scores
✓ Focus on specific regions
```

---

## Support Resources

📚 Full Documentation: [ACQUISITION_TARGET_DEMO.md](ACQUISITION_TARGET_DEMO.md)
🎥 Video Tutorial: `/tutorials/acquisition-scanning` (coming soon)
💬 Live Chat: Bottom-right corner
📧 Email: support@oppspot.ai
📞 Book Call: `/book-demo`

---

**Last Updated**: January 2025
**Quick Start Version**: 1.0
