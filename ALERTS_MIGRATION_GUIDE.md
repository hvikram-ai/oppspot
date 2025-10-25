# Critical Alerts System - Migration Guide

**Status:** ✅ Ready to deploy
**Estimated Time:** 5 minutes
**Difficulty:** Easy

## 🚀 Quick Start (3 Steps)

### Step 1: Open Supabase SQL Editor

**Click here:** [Open Supabase SQL Editor](https://supabase.com/dashboard/project/fuqdbewftdthbjfcecrz/sql/new)

*(Login to Supabase if prompted)*

### Step 2: Copy & Paste Migration SQL

**In your terminal:**
```bash
cat supabase/migrations/20251022000001_critical_alerts_system.sql
```

Or open in editor:
```bash
code supabase/migrations/20251022000001_critical_alerts_system.sql
```

**Copy all contents** (Ctrl+A / Cmd+A, then Ctrl+C / Cmd+C)

**Paste into Supabase SQL Editor** and click **"Run"** (or Ctrl+Enter)

### Step 3: Verify

**Run verification:**
```bash
npx tsx scripts/verify-migration.ts
```

**Expected output:** ✅ All checks pass

---

## 📊 What Gets Created

### 5 New Tables
- `system_alerts` - Critical failure alerts
- `alert_rules` - Configurable triggers
- `alert_configurations` - System settings
- `alert_history` - Audit trail
- `service_health_checks` - Monitoring results

### Enhanced Table
- `notifications` + 8 new columns

### Extras
- RLS policies (admin-only)
- Performance indexes
- Helper views
- Seed data (5 rules, 4 configs)

---

## ✅ Verification Output

You should see:

```
✓ system_alerts - EXISTS
✓ alert_rules - EXISTS
✓ alert_configurations - EXISTS
✓ alert_history - EXISTS
✓ service_health_checks - EXISTS

Tables verified: 5/5

✓ notifications table - All 8 new columns present

✓ alert_rules - Found 5 default rules
✓ alert_configurations - Found 4 configurations

✓ Test alert created successfully

✅ MIGRATION VERIFICATION PASSED!
```

---

## 🧪 Test the System

### 1. Test Health Endpoint

```bash
npm run dev
```

In another terminal:
```bash
curl http://localhost:3000/api/health
```

Expected:
```json
{
  "status": "healthy",
  "services": [
    { "name": "database", "status": "healthy" },
    { "name": "supabase_auth", "status": "healthy" },
    { "name": "openrouter", "status": "healthy" },
    { "name": "resend", "status": "healthy" }
  ]
}
```

### 2. Check Tables in Dashboard

Visit: [Supabase Table Editor](https://supabase.com/dashboard/project/fuqdbewftdthbjfcecrz/editor)

You should see 5 new tables.

---

## 🐛 Troubleshooting

**"Table already exists"**
→ Migration was partially run. Check which tables exist with:
```bash
npx tsx scripts/check-db-connection.ts
```

**"Permission denied"**
→ Ensure you're logged into the correct Supabase account with admin access

**"Schema cache" errors**
→ Refresh schema:
   1. Go to [API Settings](https://supabase.com/dashboard/project/fuqdbewftdthbjfcecrz/api)
   2. Click "Refresh schema" or "Restart API"
   3. Wait 30 seconds

**Verification fails**
→ Check for SQL errors in Supabase editor output
→ Re-run migration if needed

---

## 📝 Next Steps

### 1. Configure Admin Emails

```sql
UPDATE alert_configurations
SET config_value = jsonb_set(
  config_value,
  '{admin_emails}',
  '["your-email@oppspot.ai"]'
)
WHERE config_key = 'email_settings';
```

### 2. Wrap API Routes

```typescript
import { withErrorDetection } from '@/lib/alerts'

export const GET = withErrorDetection(async (request) => {
  // Errors auto-detected and alerted!
})
```

Priority routes:
- `/api/companies/enrich`
- `/api/search`
- `/api/auth/*`

### 3. Start Monitoring

```typescript
import { getFailureDetector } from '@/lib/alerts'

getFailureDetector().startMonitoring(60000) // Every 60s
```

### 4. Set Up Slack (Optional)

```sql
UPDATE alert_configurations
SET config_value = '{
  "enabled": true,
  "webhook_url": "https://hooks.slack.com/...",
  "channel": "#alerts"
}'::jsonb
WHERE config_key = 'slack_settings';
```

---

## 📚 Documentation

- **Usage Guide:** `lib/alerts/README.md`
- **Complete Summary:** `PHASE_1_ALERT_SYSTEM_COMPLETE.md`
- **Migration SQL:** `supabase/migrations/20251022000001_critical_alerts_system.sql`

---

## ✅ Migration Checklist

- [ ] Opened Supabase SQL Editor
- [ ] Copied migration SQL
- [ ] Executed SQL (saw "Success")
- [ ] Ran verification script
- [ ] All 5 tables created
- [ ] Health endpoint tested
- [ ] Configured admin emails
- [ ] Wrapped ≥1 API route
- [ ] Started monitoring (optional)

**All checked? Phase 1 complete!** 🎉

---

## 🆘 Alternative Methods

### Method 2: Install Supabase CLI

```bash
npm install -g supabase
supabase login
supabase link --project-ref fuqdbewftdthbjfcecrz
supabase db push
```

### Method 3: Manual SQL

Copy file contents and execute each section manually in Supabase SQL Editor.

---

**Need help?** Check the comprehensive documentation in `lib/alerts/README.md`
