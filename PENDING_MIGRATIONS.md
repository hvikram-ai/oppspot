# Pending Database Migrations - Action Required

**Status:** ⚠️ Migrations Not Yet Executed
**Priority:** HIGH - Required for Alert System to Function
**Estimated Time:** 10 minutes

---

## Overview

The Critical Alerts System has been fully implemented in code, but database migrations must be executed manually to create the required tables and schema.

**Migration Files:**
1. `supabase/migrations/20251022000001_critical_alerts_system.sql` - Core alert system
2. `supabase/migrations/20251022100001_webhook_logs.sql` - Webhook logging (Phase 3)

---

## Quick Start (Recommended Method)

### Method 1: Supabase Dashboard (Easiest - 5 minutes)

#### Step 1: Core Alert System Migration

1. **Open Supabase SQL Editor:**
   - Visit: https://supabase.com/dashboard/project/fuqdbewftdthbjfcecrz/sql/new
   - Or navigate: Your Project → SQL Editor → New Query

2. **Copy First Migration File:**
   ```bash
   cat supabase/migrations/20251022000001_critical_alerts_system.sql
   ```
   - Or open the file in your editor and copy all contents

3. **Paste and Execute:**
   - Paste the entire SQL content into the SQL Editor
   - Click "Run" button (bottom right)
   - Wait for "Success" message

#### Step 2: Webhook Logs Migration (Phase 3 Feature)

1. **Create New Query:**
   - Click "New Query" in SQL Editor

2. **Copy Second Migration File:**
   ```bash
   cat supabase/migrations/20251022100001_webhook_logs.sql
   ```

3. **Paste and Execute:**
   - Paste the entire SQL content
   - Click "Run" button
   - Wait for "Success" message

#### Step 3: Verify Both Migrations

```bash
npx tsx scripts/verify-migration.ts
```

**Expected output:** All 6 tables created (system_alerts, alert_rules, alert_configurations, alert_history, service_health_checks, webhook_logs)

**Expected Output:**
```
✅ All 5 tables created successfully
✅ RLS policies applied
✅ Seed data inserted
```

---

## Alternative Methods

### Method 2: Supabase CLI

```bash
# Install Supabase CLI (if not installed)
npm install -g supabase
# or
brew install supabase/tap/supabase

# Login to Supabase
supabase login

# Link to project
supabase link --project-ref fuqdbewftdthbjfcecrz

# Push migration
supabase db push

# Verify
npx tsx scripts/verify-migration.ts
```

### Method 3: Direct psql Connection

```bash
# Set password environment variable
export PGPASSWORD=TCLP-oppSpot3

# Execute migration
psql -h aws-0-eu-west-2.pooler.supabase.com \
     -U postgres.fuqdbewftdthbjfcecrz \
     -d postgres \
     -p 6543 \
     -f supabase/migrations/20251022000001_critical_alerts_system.sql

# Verify
npx tsx scripts/verify-migration.ts
```

---

## What This Migration Creates

### 5 New Database Tables

1. **`system_alerts`** (Main alerts table)
   - Columns: id, severity, category, title, message, error_stack, context, source_service, status, fingerprint, occurrence_count, etc.
   - Indexes: severity, status, category, fingerprint, created_at
   - RLS: Admin-only access

2. **`alert_rules`** (Alert configuration rules)
   - Columns: id, rule_name, severity, category, conditions, actions, enabled
   - Seed data: 5 pre-configured rules
   - RLS: Admin-only access

3. **`alert_configurations`** (System settings)
   - Columns: id, config_key, config_value, description
   - Seed data: 4 configurations (email, Slack, SMS, webhook)
   - RLS: Admin-only access

4. **`alert_history`** (Audit trail)
   - Columns: id, alert_id, action, performed_by, notes
   - Tracks: acknowledgments, resolutions, status changes
   - RLS: Admin-only access

5. **`service_health_checks`** (Health monitoring)
   - Columns: id, service_name, status, response_time_ms, error_message
   - Retention: 30 days (automatic cleanup)
   - RLS: Admin-only access

### Enhanced Table

**`notifications`** (8 new columns added):
- `alert_severity`: P0/P1/P2/P3
- `alert_category`: database_failure, api_failure, etc.
- `requires_acknowledgment`: boolean
- `acknowledged_at`: timestamp
- `acknowledged_by`: UUID
- `resolved_at`: timestamp
- `resolved_by`: UUID
- `resolution_notes`: text

---

## Verification Steps

### 1. Check Tables Exist

Run the verification script:
```bash
npx tsx scripts/verify-migration.ts
```

**Expected output:**
```
🔍 Verifying Critical Alerts System Migration...

✅ Table 'system_alerts' exists
✅ Table 'alert_rules' exists
✅ Table 'alert_configurations' exists
✅ Table 'alert_history' exists
✅ Table 'service_health_checks' exists

✅ Found 5 alert rules (seed data)
✅ Found 4 alert configurations (seed data)

🎉 Migration verification complete!
All tables and seed data are in place.
```

### 2. Check Database Connection

```bash
npx tsx scripts/check-db-connection.ts
```

**Expected output:**
```
✅ Database connection successful
✅ Auth working
✅ Tables accessible
```

### 3. Test API Endpoints

```bash
# Health check
curl http://localhost:3000/api/health

# Expected response:
{
  "status": "healthy",
  "timestamp": "2025-10-22T...",
  "services": [
    {"name": "database", "status": "healthy", "responseTimeMs": 45},
    {"name": "supabase_auth", "status": "healthy", "responseTimeMs": 120},
    {"name": "openrouter", "status": "healthy", "responseTimeMs": 200},
    {"name": "resend", "status": "healthy", "responseTimeMs": 150}
  ]
}
```

### 4. Access Dashboard

```bash
# Start dev server
npm run dev

# Navigate to:
http://localhost:3000/admin/alerts

# You should see:
- System Health card with 4 services
- Alert Statistics (will be empty initially)
- Alert list (will be empty initially)
```

---

## Post-Migration Configuration

### 1. Configure Admin Emails

```sql
-- In Supabase SQL Editor
UPDATE alert_configurations
SET config_value = jsonb_set(
  config_value,
  '{admin_emails}',
  '["your-email@oppspot.ai", "team@oppspot.ai"]'::jsonb
)
WHERE config_key = 'email_settings';
```

### 2. Configure Slack (Optional)

```sql
UPDATE alert_configurations
SET config_value = '{
  "enabled": true,
  "webhook_url": "https://hooks.slack.com/services/YOUR/WEBHOOK/URL",
  "channel": "#alerts",
  "mention_on": ["P0", "P1"]
}'::jsonb
WHERE config_key = 'slack_settings';
```

### 3. Configure SMS (Optional)

```sql
UPDATE alert_configurations
SET config_value = '{
  "enabled": false,
  "provider": "twilio",
  "account_sid": "YOUR_TWILIO_SID",
  "auth_token": "YOUR_TWILIO_TOKEN",
  "from_number": "+1234567890",
  "to_numbers": ["+1987654321"]
}'::jsonb
WHERE config_key = 'sms_settings';
```

---

## Troubleshooting Migration Issues

### Issue 1: "Table already exists" Error

**Solution:** Tables may already exist from a previous attempt.

```sql
-- Check if tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
  'system_alerts',
  'alert_rules',
  'alert_configurations',
  'alert_history',
  'service_health_checks'
);

-- If they exist but migration failed, drop and retry:
DROP TABLE IF EXISTS system_alerts CASCADE;
DROP TABLE IF EXISTS alert_rules CASCADE;
DROP TABLE IF EXISTS alert_configurations CASCADE;
DROP TABLE IF EXISTS alert_history CASCADE;
DROP TABLE IF EXISTS service_health_checks CASCADE;

-- Then re-run the migration
```

### Issue 2: Permission Denied

**Solution:** Ensure you're logged in with admin credentials or using service role key.

```bash
# Check your Supabase credentials in .env.local:
grep SUPABASE .env.local

# Required variables:
# NEXT_PUBLIC_SUPABASE_URL=https://fuqdbewftdthbjfcecrz.supabase.co
# SUPABASE_SERVICE_ROLE_KEY=eyJ... (full key)
```

### Issue 3: RLS Policies Block Access

**Solution:** The backend services use service role key which bypasses RLS. For manual testing:

```sql
-- Temporarily disable RLS for testing (re-enable after!)
ALTER TABLE system_alerts DISABLE ROW LEVEL SECURITY;

-- Test your queries...

-- Re-enable RLS
ALTER TABLE system_alerts ENABLE ROW LEVEL SECURITY;
```

### Issue 4: Seed Data Not Inserted

**Solution:** Check if data already exists:

```sql
-- Check alert rules
SELECT COUNT(*) FROM alert_rules;
-- Should return: 5

-- Check configurations
SELECT COUNT(*) FROM alert_configurations;
-- Should return: 4

-- If counts are 0, manually insert seed data:
-- (Copy the INSERT statements from the migration file)
```

---

## Migration Rollback (If Needed)

If you need to completely remove the alert system:

```sql
-- Drop all tables (cascades to foreign keys)
DROP TABLE IF EXISTS system_alerts CASCADE;
DROP TABLE IF EXISTS alert_rules CASCADE;
DROP TABLE IF EXISTS alert_configurations CASCADE;
DROP TABLE IF EXISTS alert_history CASCADE;
DROP TABLE IF EXISTS service_health_checks CASCADE;

-- Revert notifications table changes
ALTER TABLE notifications
  DROP COLUMN IF EXISTS alert_severity,
  DROP COLUMN IF EXISTS alert_category,
  DROP COLUMN IF EXISTS requires_acknowledgment,
  DROP COLUMN IF EXISTS acknowledged_at,
  DROP COLUMN IF EXISTS acknowledged_by,
  DROP COLUMN IF EXISTS resolved_at,
  DROP COLUMN IF EXISTS resolved_by,
  DROP COLUMN IF EXISTS resolution_notes;
```

---

## Next Steps After Migration

### 1. Test the System

Create a test alert:
```typescript
// In any API route or server component
import { AlertService } from '@/lib/alerts'

const alertService = new AlertService()
await alertService.triggerAlert({
  severity: 'P3',
  category: 'custom',
  title: 'Test Alert - System Verification',
  message: 'This is a test alert to verify the system is working correctly',
  sourceService: 'test-script',
})
```

### 2. Integrate Error Detection

Wrap critical API routes:
```typescript
// app/api/companies/route.ts
import { withErrorDetection } from '@/lib/alerts'

export const GET = withErrorDetection(async (request) => {
  // Your existing code
  // Errors will be automatically caught and alerted
  const companies = await fetchCompanies()
  return NextResponse.json({ companies })
})
```

### 3. Start Health Monitoring

```typescript
// In app/layout.tsx or app initialization
import { getFailureDetector } from '@/lib/alerts'

// Start monitoring every 60 seconds
if (typeof window === 'undefined') {
  // Server-side only
  getFailureDetector().startMonitoring(60000)
}
```

### 4. Access the Dashboard

- Navigate to: `/admin/alerts`
- Or click: Sidebar → Admin Section → "System Alerts"
- Or click: Admin Dashboard → "System Alerts" card

### 5. Read Documentation

- **Quick Start:** `GETTING_STARTED_ALERTS.md`
- **Interactive Demo:** `ALERTS_DASHBOARD_DEMO_WALKTHROUGH.md`
- **API Reference:** `lib/alerts/README.md`
- **Full Overview:** `COMPLETE_ALERT_SYSTEM_SUMMARY.md`

---

## Checklist

Use this to track your migration progress:

### Pre-Migration
- [ ] Database credentials verified (`.env.local`)
- [ ] Supabase project accessible
- [ ] Migration file reviewed (`supabase/migrations/20251022000001_critical_alerts_system.sql`)
- [ ] Backup created (optional, for production)

### Migration Execution
- [ ] Method selected (Dashboard/CLI/psql)
- [ ] SQL executed successfully
- [ ] No errors in execution log
- [ ] Verification script run (`npx tsx scripts/verify-migration.ts`)
- [ ] All 5 tables confirmed created
- [ ] Seed data confirmed (5 rules, 4 configs)

### Post-Migration Configuration
- [ ] Admin emails configured
- [ ] Slack webhook configured (optional)
- [ ] SMS settings configured (optional)
- [ ] Health endpoint tested (`/api/health`)
- [ ] Dashboard accessible (`/admin/alerts`)

### Integration
- [ ] At least 1 API route wrapped with error detection
- [ ] Health monitoring started
- [ ] Test alert created and visible
- [ ] Alert acknowledged successfully
- [ ] Alert resolved successfully

### Documentation Review
- [ ] Getting started guide read
- [ ] Dashboard walkthrough reviewed
- [ ] Team trained on alert management
- [ ] Escalation procedures defined

---

## Support

**Documentation:**
- Migration Guide: `ALERTS_MIGRATION_GUIDE.md`
- Getting Started: `GETTING_STARTED_ALERTS.md`
- Dashboard Demo: `ALERTS_DASHBOARD_DEMO_WALKTHROUGH.md`
- Complete Summary: `COMPLETE_ALERT_SYSTEM_SUMMARY.md`
- Documentation Index: `ALERTS_DOCUMENTATION_INDEX.md`

**Helper Scripts:**
- `scripts/verify-migration.ts` - Verify migration status
- `scripts/check-db-connection.ts` - Test database connection
- `scripts/test-alerts-system.ts` - Validate TypeScript types

**Supabase Resources:**
- Dashboard: https://supabase.com/dashboard/project/fuqdbewftdthbjfcecrz
- SQL Editor: https://supabase.com/dashboard/project/fuqdbewftdthbjfcecrz/sql/new
- Documentation: https://supabase.com/docs

---

## Summary

**Migration Required:** YES ⚠️
**Time Required:** ~5 minutes
**Difficulty:** Easy (copy/paste SQL)
**Risk Level:** Low (creates new tables only)

**Recommended Method:** Supabase Dashboard SQL Editor
**Verification:** Run `npx tsx scripts/verify-migration.ts`
**Next Action:** Configure admin emails + access dashboard

---

*Last Updated: 2025-10-22*
*Part of oppSpot Critical Alerts System*
