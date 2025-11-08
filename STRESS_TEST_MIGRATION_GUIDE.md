# Competitive Intelligence - Migration & Stress Test Guide

## Phase 1: Database Migration

### Option 1: Supabase Dashboard (RECOMMENDED)

1. Go to: https://supabase.com/dashboard/project/fuqdbewftdthbjfcecrz
2. Navigate to: **SQL Editor**
3. Click: **New Query**
4. Copy the entire content of: `supabase/migrations/20251031_competitive_intelligence.sql`
5. Paste into SQL editor
6. Click: **Run** (bottom right)
7. Wait for completion (~30 seconds)

### Option 2: psql Command Line

If you have the correct database credentials:

```bash
PGPASSWORD=[YOUR_PASSWORD] psql \
  -h aws-0-eu-west-2.pooler.supabase.com \
  -U postgres.fuqdbewftdthbjfcecrz \
  -d postgres \
  -p 6543 \
  -f supabase/migrations/20251031_competitive_intelligence.sql
```

### Verification

After migration, verify tables were created:

```sql
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename LIKE 'competitive%'
  OR tablename LIKE 'competitor%'
ORDER BY tablename;
```

**Expected output (12 tables):**
- analysis_access_grants
- analysis_snapshots
- competitive_analyses
- competitive_analysis_competitors
- competitive_moat_scores
- competitor_companies
- data_source_citations
- feature_matrix_entries
- feature_parity_scores
- industry_recognitions
- market_positioning
- pricing_comparisons

---

## Phase 2-10: Web-Based Testing

Once migration is complete, start the development server:

```bash
npm run dev
```

Then navigate to: **http://localhost:3000/competitive-analysis**

### Phase 2: Create ITONICS Analysis

**Click "New Analysis"** and follow the wizard:

#### Step 1: Target Company
- **Company Name**: ITONICS GmbH
- **Website**: https://www.itonics-innovation.com
- **Description**:
```
AI-powered Innovation Operating System connecting foresight, ideation, and portfolio management.
Founded in 2009 in Germany, ITONICS serves 150+ enterprise customers including Cisco, Toyota,
adidas, and Johnson & Johnson. The platform features InnovationGPT for AI-assisted innovation
strategy and is recognized in 4 Gartner innovation categories.
```

#### Step 2: Analysis Settings
- **Title**: ITONICS Innovation OS - Q4 2024 Acquisition Analysis
- **Market Segment**: Innovation Management Software / Enterprise SaaS
- **Geographic Focus**: Global
- **Representative Price**: 50000

#### Step 3: Competitors (Add 7)

1. **HYPE Innovation**
   - Name: HYPE Innovation
   - Website: https://www.hypeinnovation.com

2. **Brightidea**
   - Name: Brightidea
   - Website: https://www.brightidea.com

3. **Qmarkets**
   - Name: Qmarkets
   - Website: https://www.qmarkets.net

4. **Planview IdeaPlace**
   - Name: Planview IdeaPlace
   - Website: https://www.planview.com/products-solutions/products/ideaplace

5. **Wazoku**
   - Name: Wazoku
   - Website: https://www.wazoku.com

6. **IdeaScale**
   - Name: IdeaScale
   - Website: https://www.ideascale.com

7. **Innosabi**
   - Name: Innosabi
   - Website: https://www.innosabi.com

**Click "Create Analysis"** → Should redirect to dashboard

---

## Test Data Ready to Copy

### Features to Add (Copy-paste ready)

**AI Capabilities:**
- InnovationGPT
- Smart Ideation with GenAI
- Automated Trend Monitoring
- AI-Powered Evaluations
- Recommendation Engines

**Core Platform:**
- Trend Scouting
- Idea Management
- Innovation Challenges
- Portfolio Optimization
- Strategic Roadmapping
- Real-time Dashboards

**Integrations:**
- Atlassian Jira (bidirectional)
- Salesforce CRM
- HubSpot
- Microsoft Teams
- SharePoint
- LeanIX
- Google Analytics
- Tableau
- Power BI
- RESTful API

**Enterprise Features:**
- ISO 27001 Certified
- Multi-language Support
- Custom Workflows
- Role-Based Permissions
- Unlimited Users (varies by tier)
- Mobile-Friendly

**Differentiators:**
- Innovation OS Positioning
- Gartner 4-Category Recognition
- End-to-End Integration (Foresight → Ideation → Portfolio)
- 100% Bootstrapped (No VC Funding)
- Recent M&A Activity (Acquired Braineet 2024)

---

## Expected Results

### Dashboard Should Show:
- 7 competitor cards in sidebar
- 4 tabs: Overview, Features, Pricing, Moat
- Summary stats (competitors count, features count)
- Data age badge (never refreshed initially)
- Actions: Refresh, Export, Share buttons

### After AI Refresh (20-30 min):
- Feature parity scores calculated
- Moat score generated (expected: 70-80/100)
- Feature matrix populated with AI-detected features
- Pricing data (limited - most will be "undisclosed")

### Scoring Expectations:
- **Feature Parity** (vs each competitor):
  - HYPE: 75-85% (closest competitor)
  - Brightidea: 70-80% (strong enterprise features)
  - Qmarkets: 70-75% (similar modular approach)
  - Planview: 65-75% (larger platform, different focus)
  - Wazoku: 60-70% (sustainability niche)
  - IdeaScale: 60-70% (crowdsourcing focus)
  - Innosabi: 70-80% (end-to-end comparable)

- **Moat Score Breakdown**:
  - Feature Differentiation: 75-85 (InnovationGPT unique)
  - Pricing Power: 70-80 (premium positioning)
  - Brand Recognition: 80-90 (Gartner 4 categories)
  - Customer Lock-In: 60-70 (standard SaaS)
  - Network Effects: 50-60 (not a marketplace)
  - **Overall: 70-80/100** (Strong moat)

---

## Known Issues to Document

### Expected Gaps:
1. **Export Functions**: Will return 501 Not Implemented (service not built yet)
2. **Pricing Data**: Most competitors = "undisclosed" (realistic for enterprise SaaS)
3. **AI Data Quality**: Varies by website structure (some competitors have better-structured data)
4. **Manual Feature Entry**: Time-consuming (50+ features × 8 companies = 400 entries)

### Edge Cases to Test:
1. Empty feature matrix → Empty state message?
2. Missing pricing → Graceful handling in chart?
3. Stale data (>30 days) → Alert banner appears?
4. Remove all competitors → Refresh button disabled?
5. Long competitor name → UI truncation works?

---

## Success Checklist

After completing all phases, verify:

- [ ] Migration applied successfully (12 tables created)
- [ ] Analysis created via wizard
- [ ] 7 competitors added
- [ ] Dashboard loads without errors
- [ ] Feature matrix displays
- [ ] Pricing chart renders (with missing data handling)
- [ ] Moat radar shows 5 dimensions
- [ ] Refresh button works (triggers background process)
- [ ] Share dialog opens and invites work
- [ ] Export dialog opens (even if download fails)
- [ ] Competitor cards show parity scores
- [ ] Data age badge displays correctly
- [ ] Navigation works (list ↔ dashboard ↔ share page)
- [ ] Delete analysis works
- [ ] Access control enforced (try accessing non-existent ID)

---

## Troubleshooting

### Dashboard doesn't load
- Check browser console for errors
- Verify API endpoint returns 200: `curl http://localhost:3000/api/competitive-analysis`
- Check Supabase connection in .env.local

### No competitors showing
- Check API: `curl http://localhost:3000/api/competitive-analysis/[ID]/competitors`
- Verify junction table has entries
- Check RLS policies allow read access

### Refresh fails
- Check API logs for errors
- Verify OpenRouter API key is set
- Check rate limiting (500ms delays)
- Monitor background process (may take 20+ minutes for 7 competitors)

### Charts not rendering
- Check recharts dependency installed
- Verify data format matches component props
- Check browser console for React errors

---

## Test Report Template

```markdown
# ITONICS Stress Test Report

**Date**: [DATE]
**Tester**: [NAME]
**Duration**: [TIME]

## Phase Results

### Phase 1: Migration ✅/❌
- Tables created: [12/12]
- Errors: [NONE/LIST]

### Phase 2: Analysis Creation ✅/❌
- Wizard completion: [SUCCESS/FAIL]
- Redirect to dashboard: [YES/NO]
- Errors: [NONE/LIST]

### Phase 3-10: [Repeat for each phase]

## Bugs Found
1. [BUG DESCRIPTION]
   - Severity: [CRITICAL/HIGH/MEDIUM/LOW]
   - Steps to reproduce: [STEPS]
   - Expected: [EXPECTED]
   - Actual: [ACTUAL]

## Data Quality Assessment
- AI-extracted features vs. research: [X% accurate]
- Pricing data completeness: [X/7 competitors]
- Scoring algorithm accuracy: [VALID/NEEDS TUNING]

## Performance Metrics
- Dashboard initial load: [X seconds]
- Refresh duration (7 competitors): [X minutes]
- Export generation: [X seconds or N/A]

## Recommendations
1. [RECOMMENDATION 1]
2. [RECOMMENDATION 2]
```

---

**Ready to begin testing! Start with Phase 1 migration.**
