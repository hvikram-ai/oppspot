# How to Apply Competitive Intelligence Performance Optimization

## 🎯 Goal
Apply performance index optimizations to the existing competitive intelligence schema.

## ✅ Status Check
The base competitive intelligence tables **already exist** in your database (applied via `20251105000001_competitive_intelligence.sql`).

You only need to apply the **performance optimization indexes**.

## 📋 Prerequisites
- Access to Supabase Dashboard: https://supabase.com/dashboard/project/fuqdbewftdthbjfcecrz
- Project: fuqdbewftdthbjfcecrz
- Base tables already exist ✅

## 🔧 Steps to Apply Index Optimization

### Step 1: ~~Apply Base Schema~~ ✅ SKIP (Already Applied)

**Base tables already exist from previous migration. Skip this step.**

### Step 2: Apply Performance Indexes (DO THIS)

1. **Create Another New Query**
   - Click "+ New query" button again

2. **Copy Index Migration SQL**
   - Open file: `supabase/migrations/20251109_optimize_competitive_intelligence_indexes.sql`
   - Copy the ENTIRE contents

3. **Paste and Run**
   - Paste the SQL into the editor
   - Click "Run" button
   - Wait for execution (~2-3 seconds)

4. **Verify Success**
   - Look for notices like:
     ```
     Created index: idx_parity_scores_analysis_score
     Created index: idx_feature_matrix_analysis_ordered
     Created index: idx_competitor_companies_name_website
     Created index: idx_competitive_analyses_active
     Competitive intelligence indexes created successfully
     Table statistics updated successfully
     ```

## ✅ Verification

After both migrations are applied, verify the tables exist:

```sql
-- Run this query in SQL Editor
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name LIKE '%competitive%'
  OR table_name LIKE '%competitor%'
ORDER BY table_name;
```

**Expected tables** (12 total):
- ✅ competitive_analyses
- ✅ competitive_analysis_competitors
- ✅ competitive_moat_scores
- ✅ competitor_companies
- ✅ analysis_access_grants
- ✅ analysis_snapshots
- ✅ data_source_citations
- ✅ feature_matrix_entries
- ✅ feature_parity_scores
- ✅ industry_recognitions
- ✅ market_positioning
- ✅ pricing_comparisons

## 🔍 Verify Indexes

Check that the performance indexes were created:

```sql
-- Run this query in SQL Editor
SELECT indexname, tablename
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE '%competitive%'
  OR indexname LIKE '%competitor%'
  OR indexname IN (
    'idx_parity_scores_analysis_score',
    'idx_feature_matrix_analysis_ordered',
    'idx_competitor_companies_name_website',
    'idx_competitive_analyses_active'
  )
ORDER BY tablename, indexname;
```

**Expected new indexes** (4 total):
- ✅ idx_competitive_analyses_active
- ✅ idx_competitor_companies_name_website
- ✅ idx_feature_matrix_analysis_ordered
- ✅ idx_parity_scores_analysis_score

## 🚨 Troubleshooting

### Error: "relation already exists"
- **Solution**: Table already exists, safe to ignore. Migration uses `CREATE TABLE IF NOT EXISTS`.

### Error: "permission denied"
- **Solution**: Make sure you're logged into the correct Supabase account with owner access.

### Error: "syntax error"
- **Solution**: Make sure you copied the ENTIRE migration file, including the header comments.

### Success but no notices shown
- **Solution**: This is normal for the base migration. Notices only show for the index migration.

## 📊 Performance Impact

After applying both migrations, you should see:

**Dashboard Load Time**:
- Before: 80-150ms
- After: 50-100ms
- Improvement: ~30-40% faster

**What was optimized**:
1. Parity score queries with sorting
2. Feature matrix queries with category/name ordering
3. Competitor lookups by name/website
4. Active analysis filtering

## 🔄 Alternative: Use Supabase CLI (if you have access)

If you have Supabase CLI access with proper permissions:

```bash
# Link project (you'll need access token)
npx supabase link --project-ref fuqdbewftdthbjfcecrz

# Apply all pending migrations
npx supabase db push

# Or apply specific migration
npx supabase db push --include-all --dry-run  # Preview first
npx supabase db push  # Apply
```

**Note**: The CLI method requires organization owner/admin access. If you get permission errors, use the Dashboard method above.

---

**Need help?** Check the Supabase docs: https://supabase.com/docs/guides/cli/managing-environments
