# Getting Started - Critical Alerts System

**Quick Start Guide** | 5-10 minutes to get up and running

---

## 🚀 Quick Setup (3 Steps)

### Step 1: Run Database Migration

Choose one method:

**Option A: Supabase Dashboard** (Recommended - 2 minutes)
```
1. Open: https://supabase.com/dashboard/project/fuqdbewftdthbjfcecrz/sql/new
2. Copy file: supabase/migrations/20251022000001_critical_alerts_system.sql
3. Paste SQL and click "Run"
4. Verify: npx tsx scripts/verify-migration.ts
```

**Option B: Supabase CLI** (If you have it installed)
```bash
npm install -g supabase
supabase login
supabase link --project-ref fuqdbewftdthbjfcecrz
supabase db push
```

### Step 2: Access Dashboard

```
1. Start dev server: npm run dev
2. Login as admin user
3. Navigate to /admin/alerts
```

Or click:
- Sidebar → Admin Section → "System Alerts"
- Admin Dashboard → "System Alerts" card

### Step 3: Configure Admin Emails

```sql
-- In Supabase SQL Editor
UPDATE alert_configurations
SET config_value = jsonb_set(
  config_value,
  '{admin_emails}',
  '["your-email@oppspot.ai"]'
)
WHERE config_key = 'email_settings';
```

**Done!** 🎉 You're ready to monitor alerts.

---

## 📖 Documentation Road Map

### For First-Time Users

**Start Here:**
1. **GETTING_STARTED_ALERTS.md** ← You are here
2. **ALERTS_DASHBOARD_DEMO_WALKTHROUGH.md** ← Interactive guide
3. **ALERTS_MIGRATION_GUIDE.md** ← Migration help

### For Developers

**Read These:**
1. **PHASE_1_ALERT_SYSTEM_COMPLETE.md** ← Backend architecture
2. **lib/alerts/README.md** ← API usage examples
3. **COMPLETE_ALERT_SYSTEM_SUMMARY.md** ← Full overview

### For Admins

**Focus On:**
1. **ALERTS_DASHBOARD_DEMO_WALKTHROUGH.md** ← How to use dashboard
2. **Tips & Best Practices** section ← Alert management
3. **Use Case Scenarios** section ← Real-world examples

---

## 🎯 What You Get

### Automatic Error Detection
```typescript
// Just wrap your API routes
export const GET = withErrorDetection(async (request) => {
  // Errors caught & alerted automatically!
  return NextResponse.json({ data })
})
```

### Real-time Health Monitoring
- Database status
- Auth service status
- OpenRouter API status
- Resend email status

### Beautiful Admin Dashboard
- Filter & search alerts
- Real-time updates
- Alert statistics
- Acknowledge & resolve
- Mobile responsive

### Smart Alerting
- Severity levels (P0-P3)
- Deduplication (5-min window)
- Email notifications
- Full audit trail

---

## 🔧 Common Tasks

### View Current System Health

```
1. Navigate to /admin/alerts
2. Look at top "System Health" card
3. Green = good, Yellow = slow, Red = down
```

### Check for Critical Alerts

```
1. Navigate to /admin/alerts
2. Click "Critical (P0/P1)" tab
3. See all high-priority alerts
```

### Resolve an Alert

```
1. Find alert in list
2. Click "View Details"
3. Scroll to "Resolve Alert"
4. Enter notes: "Fixed by restarting service"
5. Click "Resolve Alert"
```

### Search for Specific Alerts

```
1. Navigate to /admin/alerts
2. Use search box: "database connection"
3. Results filter automatically
```

---

## 💡 Quick Tips

### For Daily Use
- ✅ Check dashboard once per shift
- ✅ Acknowledge P0 alerts immediately
- ✅ Write detailed resolution notes
- ✅ Monitor health card for degradation

### For Developers
- ✅ Wrap critical API routes with `withErrorDetection()`
- ✅ Test error handling thoroughly
- ✅ Start health monitoring: `getFailureDetector().startMonitoring(60000)`

### For Team Leads
- ✅ Review statistics daily
- ✅ Look for recurring patterns
- ✅ Adjust thresholds as needed
- ✅ Document root causes

---

## 📊 Key Metrics to Monitor

### Daily
- **Total Alerts** - Should be stable day-to-day
- **Critical Count** - Should be near zero
- **Resolution Rate** - Should be >80%
- **Active Alerts** - Should trend down

### Weekly
- **Alert Trends** - Compare week-over-week
- **Category Distribution** - Identify problem areas
- **Response Times** - Track P0 resolution speed

---

## 🆘 Need Help?

### If Dashboard Won't Load
1. Check you're logged in as admin
2. Verify URL: `/admin/alerts`
3. Check browser console for errors
4. Try hard refresh: Ctrl+Shift+R

### If Migration Fails
1. Check database credentials
2. Verify Supabase project is active
3. Run: `npx tsx scripts/check-db-connection.ts`
4. See: `ALERTS_MIGRATION_GUIDE.md`

### If No Alerts Appear
1. Verify migration ran: `npx tsx scripts/verify-migration.ts`
2. Wrap API routes with error detection
3. Trigger test alert (see below)
4. Check RLS policies

---

## 🧪 Test the System

### Create a Test Alert

```typescript
// In any API route or server component
import { AlertService } from '@/lib/alerts'

const alertService = new AlertService()
await alertService.triggerAlert({
  severity: 'P3',
  category: 'custom',
  title: 'Test Alert',
  message: 'This is a test to verify the system works',
  sourceService: 'test',
})
```

### Check Health Endpoint

```bash
curl http://localhost:3000/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "services": [
    {"name": "database", "status": "healthy"},
    {"name": "supabase_auth", "status": "healthy"},
    {"name": "openrouter", "status": "healthy"},
    {"name": "resend", "status": "healthy"}
  ]
}
```

---

## 🎓 Learn More

### Interactive Walkthrough
**File:** `ALERTS_DASHBOARD_DEMO_WALKTHROUGH.md`

Complete visual guide with:
- Screenshots-style representations
- Step-by-step instructions
- Real-world scenarios
- Tips & troubleshooting

### API Reference
**File:** `lib/alerts/README.md`

Comprehensive API documentation:
- Error detection usage
- Alert service methods
- Health monitoring
- Configuration options

### Implementation Details
**Files:**
- `PHASE_1_ALERT_SYSTEM_COMPLETE.md` - Backend
- `PHASE_2_ADMIN_DASHBOARD_COMPLETE.md` - Frontend
- `COMPLETE_ALERT_SYSTEM_SUMMARY.md` - Full overview

---

## ✅ Checklist

Use this to track your setup:

### Initial Setup
- [ ] Database migration run
- [ ] Migration verified (all 5 tables exist)
- [ ] Admin email configured
- [ ] Dashboard accessible at `/admin/alerts`

### Integration
- [ ] At least 1 API route wrapped with error detection
- [ ] Health monitoring started
- [ ] Test alert created and visible
- [ ] Alert acknowledged successfully
- [ ] Alert resolved successfully

### Configuration
- [ ] Admin emails set in alert_configurations
- [ ] Alert thresholds reviewed
- [ ] Notification channels configured (email/Slack)
- [ ] Team has admin access

### Training
- [ ] Team knows how to access dashboard
- [ ] Team understands severity levels
- [ ] Team knows how to acknowledge/resolve
- [ ] Escalation procedures documented

---

## 🎉 You're All Set!

Your critical alerts system is now:
- ✅ Detecting errors automatically
- ✅ Monitoring service health
- ✅ Sending notifications
- ✅ Providing real-time visibility
- ✅ Creating audit trails

### Next Steps

1. **Integrate More Routes**
   - Wrap additional API endpoints
   - Add error detection to critical paths

2. **Customize Alerts**
   - Adjust thresholds
   - Create custom alert rules
   - Configure Slack notifications

3. **Monitor & Improve**
   - Review daily statistics
   - Identify patterns
   - Optimize response times

4. **Train Your Team**
   - Share walkthrough guide
   - Practice alert management
   - Define escalation procedures

---

## 📞 Support

**Documentation:**
- All `.md` files in `/home/vik/oppspot/`
- Inline code comments
- TypeScript type definitions

**Scripts:**
- `scripts/verify-migration.ts` - Check migration
- `scripts/check-db-connection.ts` - Test connection
- `scripts/test-alerts-system.ts` - Validate types

**Community:**
- GitHub Issues: https://github.com/BoardGuruHV/oppspot/issues
- Team Slack: #alerts channel (if configured)

---

**Ready to start monitoring? Navigate to `/admin/alerts` now!** 🚀

*System Version: 1.0 | Created: 2025-10-22*
