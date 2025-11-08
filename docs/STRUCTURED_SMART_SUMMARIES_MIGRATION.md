# Structured Smart Summaries - Database Migration Guide

## Overview

This guide provides step-by-step instructions for applying the Structured Smart Summaries database migration to your Supabase project.

---

## Prerequisites

- Access to Supabase Dashboard: https://supabase.com/dashboard/project/fuqdbewftdthbjfcecrz
- Admin permissions on the database
- SQL Editor access in Supabase

---

## Migration Steps

### Step 1: Apply Main Migration

1. **Open Supabase SQL Editor**:
   - Go to: https://supabase.com/dashboard/project/fuqdbewftdthbjfcecrz/sql/new
   - Or navigate to: Dashboard → SQL Editor → New Query

2. **Copy the migration file**:
   - Open: `supabase/migrations/20251031000003_structured_summaries.sql`
   - Copy the entire contents (415 lines)

3. **Execute the migration**:
   - Paste into SQL Editor
   - Click "Run" button
   - Wait for confirmation

4. **Verify tables created**:
   ```sql
   SELECT table_name
   FROM information_schema.tables
   WHERE table_schema = 'public'
   AND table_name LIKE 'summary_%'
   ORDER BY table_name;
   ```

   Expected output (6 tables):
   - summary_field_values
   - summary_fields
   - summary_quality_issues
   - summary_runs
   - summary_templates
   - document_summaries

---

### Step 2: Load Seed Data

1. **Open new SQL query**

2. **Copy the seed file**:
   - Open: `supabase/seeds/summary_templates.sql`
   - Copy the entire contents (192 lines)

3. **Execute the seed**:
   - Paste into SQL Editor
   - Click "Run" button
   - Wait for confirmation

4. **Verify templates loaded**:
   ```sql
   SELECT key, title, doc_type, active,
          (SELECT COUNT(*) FROM summary_fields WHERE template_id = st.id) as field_count
   FROM summary_templates st
   WHERE org_id IS NULL
   ORDER BY key;
   ```

   Expected output (5 templates):
   - `corporate_profile` - Corporate Profile (13 fields)
   - `msa_standard` - Master Service Agreement (20 fields)
   - `nda_standard` - Non-Disclosure Agreement (10 fields)
   - `order_form_standard` - Order Form / Statement of Work (10 fields)
   - `policy_standard` - Corporate Policy (11 fields)

---

### Step 3: Verify RLS Policies

```sql
-- Check RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename LIKE 'summary_%';

-- Should return TRUE for all 6 tables

-- Check policy count
SELECT schemaname, tablename, COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
AND tablename LIKE 'summary_%'
GROUP BY schemaname, tablename
ORDER BY tablename;
```

Expected policy counts:
- summary_templates: 3 policies
- summary_fields: 1 policy
- summary_runs: 2 policies
- document_summaries: 2 policies
- summary_field_values: 2 policies
- summary_quality_issues: 2 policies

---

### Step 4: Test Basic Functionality

```sql
-- Test 1: Read templates (should work for any authenticated user)
SELECT id, key, title FROM summary_templates WHERE org_id IS NULL;

-- Test 2: Get fields for MSA template
SELECT f.key, f.title, f.field_type, f.required
FROM summary_fields f
JOIN summary_templates t ON t.id = f.template_id
WHERE t.key = 'msa_standard'
ORDER BY f.order_index;

-- Test 3: Check quality gate thresholds
SELECT key, title, required_coverage, min_confidence
FROM summary_templates
WHERE org_id IS NULL
ORDER BY key;
```

---

## Rollback (if needed)

If you need to rollback the migration:

```sql
-- WARNING: This will delete all summary data!

DROP TABLE IF EXISTS public.summary_quality_issues CASCADE;
DROP TABLE IF EXISTS public.summary_field_values CASCADE;
DROP TABLE IF EXISTS public.document_summaries CASCADE;
DROP TABLE IF EXISTS public.summary_runs CASCADE;
DROP TABLE IF EXISTS public.summary_fields CASCADE;
DROP TABLE IF EXISTS public.summary_templates CASCADE;

DROP FUNCTION IF EXISTS public.calculate_summary_metrics(UUID);
DROP FUNCTION IF EXISTS public.update_summary_template_timestamp();
```

---

## Troubleshooting

### Issue: "relation already exists"

**Cause**: Migration was partially applied before

**Solution**:
```sql
-- Check what exists
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE 'summary_%';

-- If partial, drop existing tables and reapply
```

### Issue: "permission denied"

**Cause**: User lacks necessary permissions

**Solution**: Use service role key or admin user

### Issue: "foreign key violation"

**Cause**: Referenced tables (organizations, documents, users) don't exist

**Solution**: Verify these tables exist:
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('organizations', 'documents', 'data_room_access', 'profiles');
```

---

## Post-Migration Checklist

- [ ] All 6 tables created successfully
- [ ] 5 system templates loaded
- [ ] 64 fields created across templates
- [ ] RLS enabled on all tables
- [ ] 12 policies created
- [ ] Function `calculate_summary_metrics()` created
- [ ] Trigger `update_summary_template_timestamp_trigger` created
- [ ] Test queries execute successfully

---

## Next Steps

After successful migration:

1. **Test API Endpoints**:
   ```bash
   # Test templates endpoint
   curl http://localhost:3000/api/data-room/templates \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

2. **Integrate with Document Viewer**:
   - Add summary tab to existing document viewer
   - Import components from `components/data-room/summary-*.tsx`
   - Connect to API endpoints

3. **Monitor Performance**:
   - Check query performance on `summary_runs` table
   - Monitor RLS policy execution times
   - Verify index usage

---

## Support

If you encounter issues:

1. Check Supabase logs: Dashboard → Logs → Postgres Logs
2. Review migration file: `supabase/migrations/20251031000003_structured_summaries.sql`
3. Check progress document: `docs/STRUCTURED_SMART_SUMMARIES_PROGRESS.md`
4. Review implementation plan: `docs/STRUCTURED_SMART_SUMMARIES_PLAN.md`

---

*Last Updated: 2025-10-31*
