# OppSpot Notification System: Critical Gaps Summary

## Current State vs. Required State

### What Exists (User Notifications)
```
✅ User notification storage (DB table)
✅ In-app notification delivery
✅ Email delivery via Resend API
✅ Real-time updates via Supabase
✅ Notification UI components
✅ User preferences management
✅ Quiet hours scheduling
✅ Event-triggered notifications (8 types)
```

### What's Missing (System Failure Alerts)
```
❌ System health monitoring
❌ Critical failure detection
❌ Admin alert channels
❌ Escalation procedures
❌ On-call management
❌ Slack/SMS integration
❌ Database for critical events
❌ Health check endpoints
❌ Service status tracking
❌ Error aggregation
```

---

## Key Statistics

| Aspect | Count | Status |
|--------|-------|--------|
| Notification service files | 5 | Implemented |
| Lines of notification code | 1,227 | Active |
| Database tables (notification-related) | 3 | Exists |
| Database tables (referenced but missing) | 7 | Missing |
| API endpoints for notifications | 4 | Exists |
| Real-time channels | 1 (Supabase) | Implemented |
| Admin alert channels | 0 | Missing |
| Error monitoring systems | 0 | Missing |
| Email templates | 1 (generic HTML) | Implemented |
| SMS integration | 0 | Stub only |

---

## Architecture Diagram

### Current User Notification Flow
```
┌─────────────────────────────────────────────────────────────┐
│                    USER NOTIFICATIONS (WORKING)              │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Business Event                                               │
│      ↓                                                        │
│  NotificationTriggers.*()                                    │
│      ↓                                                        │
│  NotificationService.sendNotification()                      │
│      ├─→ Quiet Hours Check                                   │
│      ├─→ In-App (DB) + Real-time Supabase                   │
│      ├─→ Email (Resend)                                      │
│      ├─→ Push (Stub)                                         │
│      └─→ SMS (Stub)                                          │
│      ↓                                                        │
│  Client Real-time Listener                                   │
│      ├─→ Toast notification                                  │
│      ├─→ Notification Center                                 │
│      └─→ Unread badge                                        │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Missing System Failure Alert Flow
```
┌─────────────────────────────────────────────────────────────┐
│             SYSTEM FAILURE ALERTS (NOT IMPLEMENTED)          │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  System Failure Event ❌ (Where to detect?)                 │
│      ↓                                                        │
│  Classify Severity ❌ (No framework)                         │
│      ↓                                                        │
│  Store in DB ❌ (No critical_failures table)                │
│      ↓                                                        │
│  Notify Admins ❌ (No admin channels)                        │
│      ├─→ Email ❌ (Not configured)                           │
│      ├─→ SMS ❌ (Not integrated)                             │
│      ├─→ Slack ❌ (Not integrated)                           │
│      └─→ PagerDuty ❌ (Not integrated)                       │
│      ↓                                                        │
│  Escalation ❌ (No escalation procedures)                    │
│      ↓                                                        │
│  Resolution Tracking ❌ (No tracking DB)                     │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Critical Database Issues

### Schema Mismatch Problem
The `notifications` table definition in `types/database.ts` doesn't match what the code expects:

**Actual Schema (Database):**
```typescript
id, user_id, title, message, type, status, metadata, created_at, read_at
```

**Expected by Code:**
```typescript
id, user_id, title, message, type, status, metadata, created_at, read_at,
priority, action_url, image_url, delivered_channels, is_archived, is_read,
email_sent, email_sent_at
```

**Impact:** Code will fail when trying to update these fields

---

### Missing Tables Referenced by Code

| Table | Referenced In | Required Fields |
|-------|---------------|-----------------|
| `notification_preferences` | NotificationService.ts | user_id, email_enabled, push_enabled, quiet_hours |
| `notification_queue` | NotificationService.ts | user_id, notification_type, scheduled_for |
| `notification_templates` | NotificationService.ts | type, title, body_template, email_subject |
| `push_tokens` | NotificationService.ts | token, platform, user_id, is_active |
| `notification_subscriptions` | NotificationTriggers.ts | user_id, entity_type, entity_id, is_active |
| `signal_alert_configs` | signals/alerts API | user_id, name, signal_types, thresholds |
| `threshold_alerts` | signals/alerts API | config_id, triggered_at, alert_data |

---

## Error Handling Gaps

### Current Pattern (Across All Services)
```typescript
try {
  // do something
} catch (error) {
  console.error('[ServiceName]:', error)  // ← Dies here, no escalation
}
```

### Problems
1. **No Centralization**: Errors scattered across console logs
2. **No Aggregation**: Each service logs independently
3. **No Visibility**: Admins don't know about failures
4. **No Alerting**: Even critical failures are silent
5. **No Tracking**: Failed operations aren't recorded for analysis

---

## Environment Configuration Gaps

### Currently Available
```
RESEND_API_KEY ✅
SUPABASE_URL ✅
OPENROUTER_API_KEY ✅
```

### Missing for System Alerts
```
SLACK_WEBHOOK_URL ❌
SLACK_BOT_TOKEN ❌
TWILIO_ACCOUNT_SID ❌
TWILIO_AUTH_TOKEN ❌
PAGERDUTY_API_KEY ❌
ADMIN_ALERT_EMAIL ❌
SENTRY_DSN ❌
DATADOG_API_KEY ❌
```

---

## Component Dependencies

### Notification Service Dependencies
```
lib/notifications/
├── notification-service.ts
│   ├── @supabase/supabase-js
│   ├── resend
│   └── (missing) push-service
├── notification-triggers.ts
│   └── notification-service.ts
├── realtime-notifications.tsx
│   ├── @supabase/supabase-js
│   ├── sonner (toast)
│   └── React Context
└── [Missing]
    ├── admin-alert-service.ts
    ├── critical-failure-detector.ts
    ├── health-monitor.ts
    └── slack-notifier.ts
```

---

## Code Quality Issues

### Files Needing Schema Updates
1. `notification-service.ts` - Expects fields that don't exist
2. `notification-triggers.ts` - References missing subscriptions table
3. `app/api/notifications/count/route.ts` - Uses wrong column name

### Files with Incomplete Implementation
1. `notification-triggers.ts` - `checkBusinessTriggers()` is a stub
2. `notification-triggers.ts` - `checkCompetitorSetTriggers()` is a stub
3. `notification-triggers.ts` - `checkCategoryTriggers()` is a stub
4. `notification-service.ts` - `sendWebPush()` is a stub
5. `notification-service.ts` - `sendMobilePush()` is a stub

### Files with Error Boundary
1. `components/error-boundary.tsx` - Has TODO for Sentry integration

---

## Production Safety Assessment

### 🟢 Safe for User Features
- User notifications are functional
- Email delivery works
- Real-time updates operational
- Quiet hours scheduling works

### 🔴 Critical for Production
- **NO admin alert system** - Can't notify if system fails
- **NO critical failure detection** - Silent failures possible
- **NO database monitoring** - Replication issues go unnoticed
- **NO API health checks** - Downtime undetected
- **NO resource monitoring** - Out-of-memory crashes undetected
- **NO backup verification** - Data loss undetected

---

## Recommended Implementation Order

### Phase 1: Immediate Safety (1 week)
1. Create missing database tables
2. Fix schema mismatches
3. Create admin alert service
4. Implement email alerts to admins
5. Create critical_failures table

### Phase 2: Monitoring Foundation (2 weeks)
6. Health check endpoints
7. Service status tracking
8. Error aggregation service
9. Dashboard for system status
10. Escalation procedures

### Phase 3: Enhanced Alerting (2 weeks)
11. Slack integration
12. SMS integration (optional)
13. PagerDuty integration (optional)
14. On-call rotation management

### Phase 4: Observability (Ongoing)
15. Sentry or Datadog integration
16. Performance monitoring
17. Database replication monitoring
18. Resource usage tracking

---

## File Locations Reference

### Notification System Core
- `/home/vik/oppspot/lib/notifications/notification-service.ts`
- `/home/vik/oppspot/lib/notifications/notification-triggers.ts`
- `/home/vik/oppspot/lib/notifications/realtime-notifications.tsx`
- `/home/vik/oppspot/components/notifications/notification-center.tsx`
- `/home/vik/oppspot/app/api/notifications/route.ts`

### Supporting APIs
- `/home/vik/oppspot/app/api/notifications/preferences/route.ts`
- `/home/vik/oppspot/app/api/notifications/count/route.ts`
- `/home/vik/oppspot/app/api/signals/alerts/route.ts`

### Error Handling
- `/home/vik/oppspot/components/error-boundary.tsx`
- `/home/vik/oppspot/lib/hooks/use-performance-monitoring.ts`

### Database Schema
- `/home/vik/oppspot/types/database.ts` (lines 1834-1868 for notifications)

---

## Quick Start: What Needs to Be Built

If you're implementing critical failure alerts, these are the minimum requirements:

```typescript
// 1. Service to detect failures
class CriticalFailureDetector {
  detectDatabaseFailure()
  detectAPIFailure()
  detectAuthFailure()
  detectStorageFailure()
}

// 2. Service to alert admins
class AdminAlertService {
  alertViaEmail(admins, failure)
  alertViaSlack(failure)
  escalate(failure, level)
  track(failure) // Save to DB
}

// 3. Tables to store data
critical_failures // Log all failures
admin_alerts // Admin preferences
system_health_events // Health tracking
service_status // Real-time status

// 4. API endpoints
GET /api/health // System health
GET /api/health/services // Per-service status
POST /api/admin/alerts // Create alerts
GET /api/admin/alerts // List alerts
```

---

## Related Documentation

See `/home/vik/oppspot/NOTIFICATION_SYSTEM_ANALYSIS.md` for:
- Complete system walkthrough
- Database field-by-field analysis
- Environment variable requirements
- Detailed recommendations
- Code examples from each service

