# Critical Alerts System - Phase 1 Foundation

A comprehensive system for detecting, alerting, and managing critical failures in oppSpot.

## 📋 Overview

The Critical Alerts System provides:
- **Automatic error detection** in API routes
- **Health monitoring** for critical services (Database, Auth, OpenRouter, Resend)
- **Alert management** with severity levels and status tracking
- **Notification delivery** via email (with Slack support ready)
- **Admin dashboard** capabilities via API endpoints
- **Deduplication** to prevent alert fatigue

## 🏗️ Architecture

### Core Components

```
lib/alerts/
├── error-detector.ts       # API error detection middleware
├── alert-service.ts        # Alert management and delivery
├── failure-detector.ts     # Service health monitoring
└── index.ts               # Exports
```

### API Endpoints

```
app/api/
├── health/route.ts                    # GET  - System health check
└── alerts/
    ├── route.ts                       # GET  - List all alerts
    ├── stats/route.ts                 # GET  - Alert statistics
    ├── [id]/acknowledge/route.ts      # POST - Acknowledge alert
    └── [id]/resolve/route.ts          # POST - Resolve alert
```

### Database Schema

```
Tables:
- system_alerts              # Critical failure alerts
- alert_rules               # Configurable alert triggers
- alert_configurations      # System settings
- alert_history            # Audit trail
- service_health_checks    # Health check results
```

## 🚀 Quick Start

### 1. Run Database Migration

```bash
# Apply the migration to create tables
npx supabase db push
```

Or manually run:
```bash
PGPASSWORD=TCLP-oppSpot3 psql \
  -h aws-0-eu-west-2.pooler.supabase.com \
  -U postgres.fuqdbewftdthbjfcecrz \
  -d postgres \
  -p 6543 \
  -f supabase/migrations/20251022000001_critical_alerts_system.sql
```

### 2. Wrap API Routes with Error Detection

```typescript
// app/api/your-endpoint/route.ts
import { withErrorDetection } from '@/lib/alerts'
import { NextRequest, NextResponse } from 'next/server'

export const GET = withErrorDetection(async (request: NextRequest) => {
  // Your handler code - errors are automatically caught and alerted
  const data = await fetchSomeData()
  return NextResponse.json({ data })
})
```

### 3. Start Health Monitoring

```typescript
// Start monitoring in your app (e.g., app/layout.tsx or server startup)
import { getFailureDetector } from '@/lib/alerts'

// In server component or API route
const detector = getFailureDetector()
detector.startMonitoring(60000) // Check every 60 seconds
```

### 4. Check System Health

```bash
# Manual health check
curl http://localhost:3000/api/health

# Response:
{
  "status": "healthy",
  "timestamp": "2025-10-22T10:30:00Z",
  "services": [
    { "name": "database", "status": "healthy", "responseTimeMs": 45 },
    { "name": "supabase_auth", "status": "healthy", "responseTimeMs": 120 },
    { "name": "openrouter", "status": "healthy", "responseTimeMs": 850 },
    { "name": "resend", "status": "healthy", "responseTimeMs": 200 }
  ]
}
```

## 📊 Alert Severity Levels

| Level | Description | Response Time | Example |
|-------|-------------|---------------|---------|
| **P0** | Critical - System down | Immediate | Database unavailable, Auth system down |
| **P1** | High - Major feature broken | 5 minutes | External API failure, Data corruption |
| **P2** | Medium - Degraded performance | 15 minutes | Slow response times, Rate limits |
| **P3** | Low - Minor issues | 1 hour | Validation errors, Non-critical warnings |

## 🔧 Usage Examples

### Manual Alert Triggering

```typescript
import { AlertService } from '@/lib/alerts'

const alertService = new AlertService()

await alertService.triggerAlert({
  severity: 'P1',
  category: 'external_service_failure',
  title: 'OpenRouter API Failure',
  message: 'Failed to connect to OpenRouter after 3 retries',
  sourceService: 'openrouter',
  sourceEndpoint: '/api/ai-chat',
  errorStack: error.stack,
  context: {
    retryCount: 3,
    lastError: error.message,
  },
  tags: ['ai', 'critical'],
})
```

### Get Active Alerts

```typescript
import { AlertService } from '@/lib/alerts'

const alertService = new AlertService()
const criticalAlerts = await alertService.getActiveAlerts('P0')

console.log(`Found ${criticalAlerts.length} critical alerts`)
```

### Acknowledge/Resolve Alerts

```typescript
import { AlertService } from '@/lib/alerts'

const alertService = new AlertService()

// Acknowledge
await alertService.acknowledgeAlert(
  alertId,
  userId,
  'Investigating database connection issue'
)

// Resolve
await alertService.resolveAlert(
  alertId,
  userId,
  'Restarted database connection pool - issue resolved'
)
```

### Run Manual Health Checks

```typescript
import { getFailureDetector } from '@/lib/alerts'

const detector = getFailureDetector()
const results = await detector.runHealthChecks()

results.forEach(result => {
  console.log(`${result.service}: ${result.status} (${result.responseTimeMs}ms)`)
})
```

## 🎯 API Endpoints Usage

### List Alerts

```bash
# Get all alerts
GET /api/alerts

# Filter by severity
GET /api/alerts?severity=P0

# Filter by status
GET /api/alerts?status=open

# Combine filters
GET /api/alerts?severity=P1&status=open&limit=10
```

### Alert Statistics

```bash
# Last 24 hours (default)
GET /api/alerts/stats

# Last hour
GET /api/alerts/stats?window=1h

# Last 7 days
GET /api/alerts/stats?window=7d
```

### Acknowledge Alert

```bash
POST /api/alerts/{alert-id}/acknowledge
Content-Type: application/json

{
  "notes": "Looking into this issue"
}
```

### Resolve Alert

```bash
POST /api/alerts/{alert-id}/resolve
Content-Type: application/json

{
  "resolutionNotes": "Issue fixed by restarting service"
}
```

## ⚙️ Configuration

### Email Settings

Update alert configuration in database:

```sql
UPDATE alert_configurations
SET config_value = '{
  "enabled": true,
  "from": "alerts@oppspot.ai",
  "admin_emails": ["admin@oppspot.ai", "team@oppspot.ai"]
}'::jsonb
WHERE config_key = 'email_settings';
```

### Slack Integration (Optional)

```sql
UPDATE alert_configurations
SET config_value = '{
  "enabled": true,
  "webhook_url": "https://hooks.slack.com/services/YOUR/WEBHOOK/URL",
  "channel": "#alerts",
  "mention_on_p0": true
}'::jsonb
WHERE config_key = 'slack_settings';
```

### Alert Thresholds

```sql
UPDATE alert_configurations
SET config_value = '{
  "error_rate_p0": 50,
  "error_rate_p1": 20,
  "error_rate_p2": 10,
  "response_time_p1": 5000,
  "response_time_p2": 3000,
  "deduplication_window": 300
}'::jsonb
WHERE config_key = 'alert_thresholds';
```

## 🔍 Monitoring & Maintenance

### View Active Critical Alerts

```sql
SELECT * FROM active_critical_alerts;
```

### Check Alert Statistics

```sql
SELECT * FROM alert_statistics;
```

### Clean Up Old Health Checks

```sql
SELECT cleanup_old_health_checks();
```

### View Alert History for Specific Alert

```sql
SELECT
  action,
  actor_id,
  notes,
  created_at
FROM alert_history
WHERE alert_id = 'your-alert-id'
ORDER BY created_at DESC;
```

## 🎨 Row Level Security (RLS)

All tables have RLS policies that:
- Allow **admins** to view and manage alerts
- Allow **service role** (backend) to create alerts
- Prevent **regular users** from accessing alert data

## 📈 Next Steps (Future Phases)

**Phase 2: Enhanced Monitoring**
- Real-time alert dashboard UI
- Alert trend analysis
- Anomaly detection

**Phase 3: Advanced Delivery**
- Slack integration implementation
- SMS alerts via Twilio
- PagerDuty integration
- Custom webhook support

**Phase 4: Intelligence**
- Machine learning for alert correlation
- Automatic incident grouping
- Predictive failure detection
- Self-healing capabilities

## 🐛 Troubleshooting

### Alerts Not Being Created

1. Check service role permissions:
```sql
SELECT * FROM pg_roles WHERE rolname = 'service_role';
```

2. Verify RLS policies:
```sql
SELECT * FROM pg_policies WHERE tablename = 'system_alerts';
```

### Health Checks Failing

1. Check environment variables:
```bash
echo $OPENROUTER_API_KEY
echo $RESEND_API_KEY
```

2. Test database connection:
```bash
curl http://localhost:3000/api/health
```

### Email Notifications Not Sending

1. Verify Resend API key is configured
2. Check alert_configurations:
```sql
SELECT * FROM alert_configurations WHERE config_key = 'email_settings';
```

## 📝 Migration File

Location: `supabase/migrations/20251022000001_critical_alerts_system.sql`

This migration creates:
- ✅ 5 new tables (system_alerts, alert_rules, alert_configurations, alert_history, service_health_checks)
- ✅ 8 missing columns in notifications table
- ✅ RLS policies for all tables
- ✅ Indexes for performance
- ✅ Helper views (active_critical_alerts, alert_statistics)
- ✅ Seed data for default alert rules and configurations

## 🔐 Security Considerations

- All alert endpoints require admin authentication
- Service role bypass RLS for automated alert creation
- Sensitive data (API keys) stored in environment variables only
- Alert history provides full audit trail
- Fingerprint-based deduplication prevents DoS via alert flooding

## 📚 Related Documentation

- [NOTIFICATION_SYSTEM_GUIDE.md](/home/vik/oppspot/NOTIFICATION_SYSTEM_GUIDE.md)
- [NOTIFICATION_GAPS_SUMMARY.md](/home/vik/oppspot/NOTIFICATION_GAPS_SUMMARY.md)
- [NOTIFICATION_SYSTEM_ANALYSIS.md](/home/vik/oppspot/NOTIFICATION_SYSTEM_ANALYSIS.md)
