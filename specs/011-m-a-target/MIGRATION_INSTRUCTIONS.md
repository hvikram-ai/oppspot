# Migration Instructions: M&A Predictions

## T007: Apply Migration to Database

### Prerequisites
- Supabase project access
- Database credentials configured in `.env.local`
- Either Supabase CLI installed OR direct database access

### Option 1: Using Supabase CLI (Recommended)

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Link to your project
supabase link --project-ref fuqdbewftdthbjfcecrz

# Apply migration
supabase db push

# Or apply specific migration
supabase migration up --file 20251030_ma_predictions.sql
```

### Option 2: Direct Database Connection

If you have direct database access configured:

```bash
# Using environment variable
psql $DATABASE_URL -f supabase/migrations/20251030_ma_predictions.sql

# Or using explicit connection string
psql "postgresql://postgres.[PROJECT-REF]:[PASSWORD]@[HOST]:5432/postgres" \
  -f supabase/migrations/20251030_ma_predictions.sql
```

### Option 3: Supabase Dashboard (Manual)

1. Go to: https://supabase.com/dashboard/project/fuqdbewftdthbjfcecrz/editor
2. Click "SQL Editor"
3. Create new query
4. Copy/paste contents of `supabase/migrations/20251030_ma_predictions.sql`
5. Run query
6. Verify success message: "✅ Migration complete: 7 M&A prediction tables created"

### Verification Steps

After applying migration, verify with:

```bash
# Check tables exist
psql $DATABASE_URL -c "\dt ma_*"

# Expected output:
#  public | ma_acquirer_profiles      | table | postgres
#  public | ma_historical_deals       | table | postgres
#  public | ma_prediction_audit_log   | table | postgres
#  public | ma_prediction_factors     | table | postgres
#  public | ma_prediction_queue       | table | postgres
#  public | ma_predictions            | table | postgres
#  public | ma_valuation_estimates    | table | postgres

# Check RLS is enabled
psql $DATABASE_URL -c "SELECT tablename, rowsecurity FROM pg_tables WHERE tablename LIKE 'ma_%' AND schemaname = 'public';"

# All should show: rowsecurity = t (true)

# Check trigger exists
psql $DATABASE_URL -c "SELECT tgname, tgrelid::regclass FROM pg_trigger WHERE tgname = 'businesses_update_trigger';"

# Should show: businesses_update_trigger | businesses
```

### Test the Trigger

```sql
-- Update a business to trigger recalculation
UPDATE businesses
SET revenue = revenue * 0.95
WHERE id = (SELECT id FROM businesses LIMIT 1);

-- Check queue has job
SELECT company_id, trigger_type, status, created_at
FROM ma_prediction_queue
ORDER BY created_at DESC
LIMIT 1;

-- Should see: trigger_type = 'data_update', status = 'pending'
```

### Rollback (if needed)

If you need to rollback this migration:

```sql
-- Drop all M&A prediction tables
DROP TABLE IF EXISTS ma_prediction_audit_log CASCADE;
DROP TABLE IF EXISTS ma_prediction_queue CASCADE;
DROP TABLE IF EXISTS ma_acquirer_profiles CASCADE;
DROP TABLE IF EXISTS ma_valuation_estimates CASCADE;
DROP TABLE IF EXISTS ma_prediction_factors CASCADE;
DROP TABLE IF EXISTS ma_predictions CASCADE;
DROP TABLE IF EXISTS ma_historical_deals CASCADE;

-- Drop trigger
DROP TRIGGER IF EXISTS businesses_update_trigger ON businesses;
DROP FUNCTION IF EXISTS trigger_ma_recalculation();
```

### Next Steps After Migration

1. **T008**: Create seed dataset (`supabase/seeds/ma_historical_deals.sql`)
2. **T010-T012**: Write contract tests (TDD phase)
3. Implement API routes and services

### Troubleshooting

**Connection Failed:**
- Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`
- Check IP whitelist in Supabase dashboard (Database > Settings > Connection Pooling)
- Try using Supabase Dashboard SQL Editor instead

**Permission Denied:**
- Ensure you're using `service_role` key, not `anon` key
- Check if you have admin access to the Supabase project

**Tables Already Exist:**
- Migration uses `IF NOT EXISTS` clauses, so it's safe to re-run
- If you get conflicts, check if a previous version was partially applied

**Trigger Not Firing:**
- Verify `businesses` table has columns: `revenue`, `profitability`, `employees`
- Check trigger with: `SELECT * FROM pg_trigger WHERE tgname = 'businesses_update_trigger';`
