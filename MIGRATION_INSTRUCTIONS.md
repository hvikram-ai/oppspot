# Database Migration Instructions

## Qualification Workflows Migration

The qualification workflows system requires database tables to be created. Here's how to run the migration on your Supabase production database:

### Option 1: Supabase Dashboard (Recommended)

1. **Go to Supabase SQL Editor**:
   - Visit: https://supabase.com/dashboard/project/fuqdbewftdthbjfcecrz/sql
   - Or direct link: https://fuqdbewftdthbjfcecrz.supabase.co/project/fuqdbewftdthbjfcecrz/editor

2. **Copy the Migration SQL**:
   - The migration file is located at: `supabase/migrations/20250118_qualification_workflows.sql`
   - Copy the entire contents of this file

3. **Run the Migration**:
   - Paste the SQL into the SQL Editor
   - Click "Run" or press Ctrl+Enter
   - The migration creates tables with "IF NOT EXISTS" so it's safe to run multiple times

### Option 2: Using Supabase CLI (Requires Auth)

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Login to Supabase
npx supabase login

# Link your project
npx supabase link --project-ref fuqdbewftdthbjfcecrz

# Run the migration
npx supabase db push
```

### Option 3: Direct API (For Automation)

```bash
# Run the provided script (already attempted)
node scripts/run-migration.js
```

## Migration Creates These Tables

The qualification workflows migration creates the following tables:

1. **bant_qualifications** - BANT scoring framework
2. **meddic_qualifications** - MEDDIC scoring framework
3. **lead_routing_rules** - Automated lead assignment rules
4. **lead_assignments** - Lead-to-rep assignments
5. **qualification_checklists** - Custom qualification checklists
6. **checklist_items** - Individual checklist items
7. **lead_recycling_rules** - Rules for recycling leads
8. **lead_recycling_history** - History of recycled leads
9. **advanced_alert_configs** - Alert configurations
10. **alert_history** - Alert trigger history

All tables include:
- Proper indexes for performance
- Row Level Security (RLS) policies
- Updated_at triggers
- Foreign key relationships

## Verification

After running the migration, verify success by checking if tables exist:

```sql
-- Check if tables were created
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
  'bant_qualifications',
  'meddic_qualifications',
  'lead_routing_rules',
  'lead_assignments',
  'qualification_checklists',
  'checklist_items',
  'lead_recycling_rules',
  'lead_recycling_history',
  'advanced_alert_configs',
  'alert_history'
);
```

Expected result: Should return all 10 table names.

## Troubleshooting

### If tables already exist
The migration uses `IF NOT EXISTS` clauses, so it's safe to run multiple times. Existing tables won't be affected.

### If you get permission errors
Make sure you're using an account with sufficient privileges or use the service role key.

### If indexes fail to create
Indexes also use `IF NOT EXISTS`, but if they fail, the application will still work (just potentially slower).

## Next Steps

After successful migration:

1. **Test the Qualification Features**:
   - Navigate to `/qualification` in your app
   - Test BANT and MEDDIC scoring
   - Create test checklists
   - Set up routing rules

2. **Configure Automation**:
   - Set up alert thresholds
   - Configure lead recycling rules
   - Define assignment criteria

3. **Monitor Performance**:
   - Check query performance
   - Monitor table sizes
   - Review index usage

## Support

If you encounter issues:
1. Check the Supabase logs in the Dashboard
2. Verify your environment variables are correct
3. Ensure your Supabase project is active and not paused