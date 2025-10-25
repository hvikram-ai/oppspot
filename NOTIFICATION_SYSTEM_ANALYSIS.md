# OppSpot Notification System: Comprehensive Analysis & Gaps Assessment

## Executive Summary

The oppspot platform has a **partial notification infrastructure** with foundational pieces in place for user notifications, but **significant gaps exist for critical system failure alerting**. The current system is designed for business event notifications (ratings, reviews, signals) rather than infrastructure/system health monitoring.

---

## 1. EXISTING NOTIFICATION INFRASTRUCTURE

### 1.1 Database Schema (types/database.ts)

#### Implemented Tables:
- **`notifications`** (lines 1834-1868)
  - Core user notification storage
  - Fields: id, user_id, title, message, type, status, metadata, created_at, read_at
  - **Schema Mismatch Issue**: Database schema is minimal, but code expects additional fields:
    - Expected: `priority`, `action_url`, `image_url`, `delivered_channels`, `is_archived`, `is_read`
    - Actual in DB: `type`, `status`, `metadata` (limited)
  - RLS: Accessible to authenticated users

- **`business_followers`** (lines 1627-1649)
  - Tracks user follows on businesses
  - Used to trigger notifications about followed entities
  - Fields: notification_preference (flexible for future use)

- **`buying_signals`** (lines 1381-1430)
  - Tracks buying signals that trigger notifications
  - signal_type: funding, executive_change, job_posting, etc.
  - signal_strength: very_strong, strong, moderate, weak
  - Has `acted_upon_at` for notification follow-ups

#### Missing/Incomplete Tables:
- `notification_preferences` - Referenced but not in schema
- `notification_queue` - Referenced but not in schema
- `notification_templates` - Referenced but not in schema
- `push_tokens` - Referenced for web push support
- `notification_subscriptions` - Referenced but not in schema
- `signal_alert_configs` - Referenced in signals/alerts API
- `threshold_alerts` - Referenced in signals/alerts API

---

### 1.2 Service Layer Architecture

#### **NotificationService** (`lib/notifications/notification-service.ts`)
**210 lines of implemented logic**

**Capabilities:**
- Multi-channel delivery coordination (email, SMS, push, in-app)
- User preference management (quiet hours, channel preferences)
- Priority-based routing (low/medium/high/urgent)
- In-app notification creation and storage
- Email delivery via Resend API
- Real-time notification subscriptions
- Notification queuing for quiet hours

**Key Methods:**
```typescript
- sendNotification(data) - Main entry point
- createInAppNotification() - Persist to DB
- sendEmailNotification() - Via Resend
- sendPushNotification() - Placeholder for web/mobile
- getUserPreferences() - Fetch user settings
- isInQuietHours() - Smart scheduling
- queueNotification() - Defer during quiet hours
```

**Error Handling:**
- Basic try/catch with console.error logging
- **Gap**: No critical failure reporting mechanism
- **Gap**: No error aggregation or alerting for notification failures

**Email Template System:**
- HTML wrapping with CSS styling
- Variable substitution ({{key}} syntax)
- Branding and footer with preference link

---

#### **NotificationTriggers** (`lib/notifications/notification-triggers.ts`)
**429 lines of trigger implementations**

**Business Event Triggers:**
1. **New Competitor** - Alert users subscribed to competitor sets
2. **Rating Change** - Notify on significant rating shifts (±0.5)
3. **New Review** - Alert business owners, escalate low ratings
4. **Social Mention** - Track social media mentions
5. **Market Shift** - Notify category subscribers (growth/decline/disruption)
6. **Business Followed** - Notify when followed
7. **Milestone Reached** - 100 reviews, 500, 1000, 4.5+ rating, etc.
8. **Weekly Digest** - Summary of followed businesses

**Architecture Issues:**
- Scheduled via `checkAllTriggers()` (requires cron job)
- **Gap**: No implemented cron job configuration
- **Gap**: No error handling for failed trigger checks
- **Gap**: Methods like `checkBusinessTriggers()` are empty stubs

---

#### **Real-time Notification Provider** (`lib/notifications/realtime-notifications.tsx`)
**270 lines (React Context)**

**Features:**
- Supabase real-time subscription to notifications table
- Auto-refresh on INSERT and UPDATE events
- Toast notifications for high/urgent priority
- Unread count tracking
- Mark as read/archive functionality

**Limitations:**
- Client-side only (can't receive notifications without app open)
- No service worker for background notifications
- No web push integration
- Real-time dependent on Supabase subscription

**Error Handling:**
- Basic error logging to console
- Toast error messages for failed operations

---

### 1.3 API Routes

#### **GET/POST/PATCH/DELETE /api/notifications** (`app/api/notifications/route.ts`)
**269 lines - Core notification API**

**Features:**
- Fetch notifications with pagination (page/limit)
- Filter by type, unread status
- Create notifications (admin/owner only)
- Mark single/multiple/all as read
- Archive notifications (soft delete)
- Hard delete support

**Gaps:**
- **No critical failure notifications**
- **No system health alerts**
- **Limited access control** (only admin/owner can send)
- **No batch failure reporting**

---

#### **GET/POST /api/notifications/preferences** (`app/api/notifications/preferences/route.ts`)
**116 lines - User preferences**

**Features:**
- Fetch notification preferences (with defaults)
- Update preferences via upsert
- Email/phone validation
- Type-specific preferences support

**Limitations:**
- References non-existent `notification_preferences` table
- API still works (returns defaults) but won't persist user changes
- **Gap**: No system-level preference overrides for critical alerts

---

#### **GET /api/notifications/count** (`app/api/notifications/count/route.ts`)
**30 lines - Unread count endpoint**

**Issues:**
- Uses wrong column: `read` instead of `is_read` (type mismatch)
- Would fail in production
- Returns 0 on any error (silent failure)

---

#### **GET /api/signals/alerts** (`app/api/signals/alerts/route.ts`)
**Partial implementation for signal-based alerts**

**Features:**
- Alert configuration management
- Recent alert retrieval (up to 20)
- References `signal_alert_configs` table (not in schema)
- References `threshold_alerts` table (not in schema)

---

### 1.4 UI Components

#### **NotificationCenter** (`components/notifications/notification-center.tsx`)
**278 lines - Rich notification UI**

**Features:**
- Dropdown menu with notification list
- Filter by read/unread status
- Priority-based coloring (urgent/high/medium/low)
- Type-specific icons (competitor, review, social, market, alert)
- Quick actions (mark read, delete)
- Settings link
- Empty state messaging

**Limitations:**
- Displays user notifications only
- No system alert display
- No direct critical failure indicators

---

### 1.5 Email Infrastructure

**Resend Email Provider:**
- Configured via `RESEND_API_KEY` environment variable
- From address: `notifications@oppspot.com`
- HTML email templates with branding
- Support for custom footer and action buttons

**Current Usage:**
- User notifications only
- No system/admin email alerts

---

## 2. EXISTING ERROR HANDLING & MONITORING

### 2.1 Error Boundary Component
**`components/error-boundary.tsx` (158 lines)**

**Features:**
- React Error Boundary for catching component errors
- User-friendly fallback UI
- Development mode error details
- TODO for Sentry integration (not implemented)
- Reset and navigate home functionality

**Limitations:**
- Only catches React component rendering errors
- No API error handling
- No service-level failure tracking
- **Gap**: No critical failure notification to admins

---

### 2.2 Performance Monitoring
**`lib/hooks/use-performance-monitoring.ts` (133 lines)**

**Tracks:**
- LCP (Largest Contentful Paint)
- FID (First Input Delay)
- CLS (Cumulative Layout Shift)
- TTFB (Time to First Byte)
- FCP (First Contentful Paint)

**Limitations:**
- Client-side performance only
- Sent to `/api/dashboard/analytics/view`
- **Gap**: Not connected to alert system

---

### 2.3 Current Logging Approach

**Standard Pattern Across Services:**
```typescript
console.error('[ServiceName] Error description:', error)
console.log('[ServiceName] Status message')
console.warn('[ServiceName] Warning')
```

**Issues:**
- Reliant on Node.js console output
- No centralized logging
- No error aggregation
- **No monitoring/alerting infrastructure**

---

### 2.4 Agent Task Runner Error Handling
**`lib/agents/agent-task-runner.ts`**

**Has:**
- Retry mechanism (configurable max_retries)
- Task status tracking (pending/processing/completed/failed)
- Error logging on poll loop failures
- Graceful task failure handling

**Lacks:**
- Critical failure escalation
- Admin notification of repeated failures
- Dashboard visibility of failed tasks

---

## 3. CRITICAL GAPS FOR FAILURE ALERTING

### 3.1 Missing System-Level Alert Channels

| Channel | Status | Gap |
|---------|--------|-----|
| Email (Admin) | Not implemented | No admin alert emails |
| SMS | Stub only | No SMS provider configured |
| Slack/Discord | Missing | No webhook integration |
| PagerDuty | Missing | No on-call escalation |
| Database Alerts | Missing | No replication/failure detection |
| API Health | Missing | No endpoint monitoring |
| Service Status | Missing | No internal status page |

### 3.2 Missing Database Tables

**Required for production alert system:**
```sql
-- Admin notification preferences
CREATE TABLE admin_alerts (
  id UUID PRIMARY KEY,
  admin_user_id UUID REFERENCES auth.users,
  alert_type TEXT,
  severity ENUM('critical', 'high', 'medium', 'low'),
  channels JSON,
  thresholds JSON,
  is_active BOOLEAN,
  created_at TIMESTAMP
);

-- System health events
CREATE TABLE system_health_events (
  id UUID PRIMARY KEY,
  event_type TEXT,
  severity ENUM('critical', 'warning', 'info'),
  component TEXT,
  details JSON,
  resolved_at TIMESTAMP,
  created_at TIMESTAMP
);

-- Service status log
CREATE TABLE service_status (
  id UUID PRIMARY KEY,
  service_name TEXT,
  status ENUM('healthy', 'degraded', 'down'),
  last_check TIMESTAMP,
  response_time_ms INTEGER,
  error_count INTEGER,
  details JSON
);

-- Critical failure log
CREATE TABLE critical_failures (
  id UUID PRIMARY KEY,
  failure_type TEXT,
  error_message TEXT,
  error_stack TEXT,
  affected_users UUID[],
  affected_component TEXT,
  severity ENUM('critical', 'severe'),
  resolution_steps JSON,
  escalation_level INTEGER,
  alert_sent_at TIMESTAMP,
  resolved_at TIMESTAMP,
  created_at TIMESTAMP
);
```

### 3.3 Missing Monitoring Infrastructure

**Gaps:**
- No centralized error collection (Sentry, Datadog, LogRocket)
- No uptime monitoring
- No API response time tracking
- No database replication monitoring
- No background job monitoring
- No rate limit tracking
- No quota monitoring
- No resource exhaustion detection

### 3.4 Missing Escalation Procedures

**Current:**
- console.error → logs to Node.js stdout
- No escalation workflow
- No severity levels
- No on-call assignment

**Needed:**
- Severity classification system
- Escalation timers (critical → 5 min, high → 30 min)
- On-call rotation
- Runbook links
- Auto-remediation hooks

---

## 4. CURRENT NOTIFICATION FLOW ANALYSIS

### 4.1 User Notifications (Implemented)

```
Business Event
    ↓
NotificationTriggers.trigger*()
    ↓
Get subscribed users
    ↓
NotificationService.sendNotification()
    ├─→ Check quiet hours
    ├─→ In-app: Create in DB
    ├─→ Email: Send via Resend
    ├─→ Push: Queue for tokens
    └─→ SMS: Placeholder
    ↓
Real-time: Supabase subscription
    ↓
Client: Toast + notification center
```

### 4.2 What's Missing for Critical Failures

```
System Failure ← NOT IMPLEMENTED
    ↓
Detect failure (WHERE?)
    ↓
Classify severity (HOW?)
    ↓
Create alert (WHAT TABLE?)
    ↓
Notify admins (WHICH CHANNELS?)
    ├─→ Email (require setup)
    ├─→ SMS (require setup)
    ├─→ Slack (require setup)
    └─→ PagerDuty (require setup)
    ↓
Track resolution (NO TRACKING)
    ↓
Post-mortem (NO SYSTEM)
```

---

## 5. ENVIRONMENT CONFIGURATION

### Configured:
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
RESEND_API_KEY
OPENROUTER_API_KEY
```

### Missing for Alert System:
```
SLACK_WEBHOOK_URL (or SLACK_BOT_TOKEN)
TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN
PAGERDUTY_API_KEY
DATADOG_API_KEY
SENTRY_DSN
ADMIN_ALERT_EMAIL
ALERT_ESCALATION_EMAIL
```

---

## 6. COMPATIBILITY WITH NEXT.JS 15

**Current Setup:**
- App Router (not Pages Router)
- Server Components for data fetching
- Client Components with 'use client' for interactivity
- Route handlers (not API routes)

**Notification System Alignment:**
- ✅ Uses createClient for both server/client
- ✅ API routes properly structured
- ✅ Real-time subscriptions in client components
- ⚠️ Missing server-side background job infrastructure for monitoring
- ⚠️ No built-in cron support (needs external service)

---

## 7. EXISTING INTEGRATIONS & DEPENDENCIES

### Email:
- **Resend** (v2.0+): Production-ready email service

### Database:
- **Supabase**: PostgreSQL + Real-time subscriptions
- **Supabase Auth**: User authentication

### Monitoring (None):
- No Sentry integration
- No Datadog integration
- No LogRocket integration

### Task Queue:
- **Inngest** client configured (lib/inngest/client.ts)
- ✅ Can be leveraged for background alerting

---

## 8. RECOMMENDATIONS SUMMARY

### High Priority (Blocking Production Safety):
1. **Create critical failure alert system**
   - Database tables for system events & failures
   - Admin alert preferences management
   - Email/SMS/Slack integration

2. **Implement monitoring endpoints**
   - Health check endpoints
   - Service status page
   - Metrics collection

3. **Admin notification channels**
   - Admin-specific notification routes
   - Critical alert broadcasting
   - On-call management

### Medium Priority (Production Enhancement):
4. Centralized error logging service
5. Database backup/replication monitoring
6. API rate limit tracking
7. Background job failure tracking
8. Resource usage alerts

### Low Priority (Nice to Have):
9. PagerDuty integration
10. Datadog/Sentry integration
11. Automated runbook execution
12. Team Slack integration for announcements

---

## 9. FILES SUMMARY

### Core Notification Files (5):
- `/home/vik/oppspot/lib/notifications/notification-service.ts` (210 lines)
- `/home/vik/oppspot/lib/notifications/notification-triggers.ts` (429 lines)
- `/home/vik/oppspot/lib/notifications/realtime-notifications.tsx` (270 lines)
- `/home/vik/oppspot/components/notifications/notification-center.tsx` (278 lines)
- `/home/vik/oppspot/app/api/notifications/route.ts` (269 lines)

### Supporting Files:
- `/home/vik/oppspot/app/api/notifications/preferences/route.ts` (116 lines)
- `/home/vik/oppspot/app/api/notifications/count/route.ts` (30 lines)
- `/home/vik/oppspot/app/api/signals/alerts/route.ts` (partial)
- `/home/vik/oppspot/components/error-boundary.tsx` (158 lines)

### Database Schema:
- `/home/vik/oppspot/types/database.ts` (2220 lines total)
  - `notifications` table (34 lines, 1834-1868)
  - `business_followers` table (22 lines, 1627-1649)
  - `buying_signals` table (49 lines, 1381-1430)
  - Missing: notification_preferences, queue, templates, subscriptions

---

## 10. QUICK REFERENCE: SCHEMA MISMATCH

**What notifications table has:**
- id, user_id, title, message, type, status, metadata, created_at, read_at

**What code expects:**
- priority, action_url, image_url, delivered_channels, is_archived, is_read, email_sent, email_sent_at

**Migration needed:**
```sql
ALTER TABLE notifications 
ADD COLUMN priority VARCHAR DEFAULT 'medium',
ADD COLUMN action_url TEXT,
ADD COLUMN image_url TEXT,
ADD COLUMN delivered_channels TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN is_archived BOOLEAN DEFAULT false,
ADD COLUMN is_read BOOLEAN DEFAULT false,
ADD COLUMN email_sent BOOLEAN DEFAULT false,
ADD COLUMN email_sent_at TIMESTAMP;
```

