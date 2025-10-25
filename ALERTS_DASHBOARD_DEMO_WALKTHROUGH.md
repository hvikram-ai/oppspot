# System Alerts Dashboard - Interactive Demo Walkthrough

**Version:** 1.0
**Date:** 2025-10-22
**Duration:** ~15 minutes
**Difficulty:** Beginner-friendly

---

## 🎬 Overview

This walkthrough demonstrates every feature of the System Alerts Dashboard, from basic navigation to advanced alert management. Follow along to learn how to monitor system health, manage critical failures, and leverage real-time alerts.

---

## 📋 Table of Contents

1. [Accessing the Dashboard](#1-accessing-the-dashboard)
2. [Dashboard Overview](#2-dashboard-overview)
3. [System Health Monitoring](#3-system-health-monitoring)
4. [Alert Statistics](#4-alert-statistics)
5. [Viewing & Filtering Alerts](#5-viewing--filtering-alerts)
6. [Alert Details](#6-alert-details)
7. [Managing Alerts](#7-managing-alerts)
8. [Real-time Updates](#8-real-time-updates)
9. [Use Case Scenarios](#9-use-case-scenarios)
10. [Tips & Best Practices](#10-tips--best-practices)

---

## 1. Accessing the Dashboard

### Method A: Via Sidebar (Recommended)

```
Step 1: Login to oppSpot
┌──────────────────────────────────────┐
│  📧 Email: admin@oppspot.ai         │
│  🔒 Password: ••••••••••            │
│  [Login] ─────────────────────────→ │
└──────────────────────────────────────┘

Step 2: Find Sidebar Navigation
┌────────────────────┐
│ Sidebar            │
│ ↓ Scroll Down      │
│                    │
│ Settings Section:  │
│ ╔════════════════╗ │
│ ║ 🛡️  Admin      ║ │
│ ║ ⚠️  Alerts ←   ║ │ ← Click Here
│ ║ ⚡  Agents     ║ │
│ ╚════════════════╝ │
└────────────────────┘

Result: Navigate to /admin/alerts
```

### Method B: Via Admin Dashboard

```
Step 1: Navigate to /admin
┌──────────────────────────────────────┐
│  Welcome back, Admin                 │
│  System administration dashboard     │
└──────────────────────────────────────┘

Step 2: Click System Alerts Card
┌───────────────┐  ┌───────────────┐
│ Role Mgmt     │  │ Sys Alerts    │
│     NEW       │  │     NEW ←     │ ← Click Here
└───────────────┘  └───────────────┘

Result: Navigate to /admin/alerts
```

### Method C: Direct URL

```
Simply type: /admin/alerts
```

---

## 2. Dashboard Overview

### Initial View

```
┌────────────────────────────────────────────────────────────────┐
│  System Alerts                              [🔄 Refresh]        │
│  Monitor and manage critical system failures                    │
├────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─ System Health ─────────────────────────────────────────┐  │
│  │  Status: Healthy ✓              Last checked: 1m ago    │  │
│  │                                                           │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │  │
│  │  │ Database │ │   Auth   │ │OpenRouter│ │  Resend  │  │  │
│  │  │ Healthy  │ │ Healthy  │ │ Healthy  │ │ Healthy  │  │  │
│  │  │  45ms    │ │  120ms   │ │  850ms   │ │  200ms   │  │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌─ Alert Statistics ──────────────── [1h][24h][7d] ────────┐  │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐       │  │
│  │  │ Total   │ │Critical │ │ Active  │ │Resolved │       │  │
│  │  │   42    │ │    3    │ │    5    │ │   37    │       │  │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘       │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌─ Alerts ───────────────────────────────────────────────┐  │
│  │ [Active] [All Alerts] [Resolved] [Critical (P0/P1)]    │  │
│  │                                                          │  │
│  │ 🔍 Search  [Severity ▼] [Category ▼]  [Clear]         │  │
│  │                                                          │  │
│  │ Showing 5 alerts                                        │  │
│  │                                                          │  │
│  │ ┌────────────────────────────────────────────────────┐ │  │
│  │ │ ⚠️  Database Connection Failure    [P0] [Open]    │ │  │
│  │ │ Failed to connect to database after 3 retries     │ │  │
│  │ │ database • /api/companies/enrich • 2 minutes ago  │ │  │
│  │ │ [View Details] [Acknowledge] [Resolve]            │ │  │
│  │ └────────────────────────────────────────────────────┘ │  │
│  └─────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────┘
```

### Key Components

1. **Header Bar** - Title and refresh button
2. **System Health Card** - Live service status
3. **Alert Statistics** - Metrics with time windows
4. **Tabs** - Filter by alert status
5. **Search & Filters** - Find specific alerts
6. **Alert List** - Scrollable list of alerts

---

## 3. System Health Monitoring

### Healthy System

```
┌─ System Health ────────────────────────────────────┐
│  Overall Status: ✅ Healthy                        │
│  All systems operational                            │
│  Last checked: 45 seconds ago      [🔄 Refresh]   │
│                                                     │
│  ┌─────────────┐ ┌─────────────┐                  │
│  │  Database   │ │   Auth      │                  │
│  │  ✅ Healthy │ │  ✅ Healthy │                  │
│  │  45ms       │ │  120ms      │                  │
│  └─────────────┘ └─────────────┘                  │
│  ┌─────────────┐ ┌─────────────┐                  │
│  │ OpenRouter  │ │   Resend    │                  │
│  │ ✅ Healthy  │ │  ✅ Healthy │                  │
│  │  850ms      │ │  200ms      │                  │
│  └─────────────┘ └─────────────┘                  │
│                                                     │
│  📊 4 Healthy • 0 Degraded • 0 Down                │
└─────────────────────────────────────────────────────┘
```

### Degraded Service

```
┌─ System Health ────────────────────────────────────┐
│  Overall Status: ⚠️ Degraded                       │
│  1 service experiencing issues                      │
│  Last checked: 10 seconds ago      [🔄 Refresh]   │
│                                                     │
│  ┌─────────────┐ ┌─────────────┐                  │
│  │  Database   │ │   Auth      │                  │
│  │  ✅ Healthy │ │  ✅ Healthy │                  │
│  │  45ms       │ │  120ms      │                  │
│  └─────────────┘ └─────────────┘                  │
│  ┌─────────────┐ ┌─────────────┐                  │
│  │ OpenRouter  │ │   Resend    │                  │
│  │ ⚠️ Degraded │ │  ✅ Healthy │  ← SLOW!         │
│  │  5250ms 🐌  │ │  180ms      │                  │
│  └─────────────┘ └─────────────┘                  │
│                                                     │
│  📊 3 Healthy • 1 Degraded • 0 Down                │
└─────────────────────────────────────────────────────┘
```

### Critical Failure

```
┌─ System Health ────────────────────────────────────┐
│  Overall Status: ❌ Unhealthy                      │
│  1 service DOWN - immediate attention required      │
│  Last checked: 5 seconds ago       [🔄 Refresh]   │
│                                                     │
│  ┌─────────────┐ ┌─────────────┐                  │
│  │  Database   │ │   Auth      │                  │
│  │  ❌ Down    │ │  ✅ Healthy │  ← CRITICAL!     │
│  │  FAILED     │ │  120ms      │                  │
│  │  Connection │ │             │                  │
│  │  refused    │ │             │                  │
│  └─────────────┘ └─────────────┘                  │
│  ┌─────────────┐ ┌─────────────┐                  │
│  │ OpenRouter  │ │   Resend    │                  │
│  │ ✅ Healthy  │ │  ✅ Healthy │                  │
│  │  820ms      │ │  190ms      │                  │
│  └─────────────┘ └─────────────┘                  │
│                                                     │
│  📊 3 Healthy • 0 Degraded • 1 Down ⚠️             │
└─────────────────────────────────────────────────────┘
```

### How to Use

1. **Check at a glance** - Green = good, Yellow = slow, Red = down
2. **Click Refresh** - Manually re-check all services
3. **Review response times** - Higher numbers = slower performance
4. **Read error messages** - Displayed in red cards when down

---

## 4. Alert Statistics

### Time Window Selection

```
┌─ Alert Statistics ────────────────────────────────┐
│                                                    │
│  Time Window:  [1h]  [24h]  [7d]                 │
│                       ^^^^                         │
│                     Selected                       │
│                                                    │
│  Last 24 Hours:                                   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────┐│
│  │  Total   │ │ Critical │ │  Active  │ │ Resol││
│  │    42    │ │     3    │ │     5    │ │  37  ││
│  │          │ │  P0/P1   │ │  Open+   │ │ 88%  ││
│  │  alerts  │ │  alerts  │ │   Ack    │ │ rate ││
│  └──────────┘ └──────────┘ └──────────┘ └──────┘│
│                                                    │
│  ┌─ By Severity ───┐  ┌─ By Category ─────────┐ │
│  │ P0 Critical   3 │  │ Database Failure    5 │ │
│  │ P1 High       8 │  │ API Failure        12 │ │
│  │ P2 Medium    15 │  │ External Service    8 │ │
│  │ P3 Low       16 │  │ Auth Failure        3 │ │
│  └─────────────────┘  │ Performance         7 │ │
│                        │ Other               7 │ │
│                        └─────────────────────────┘│
└────────────────────────────────────────────────────┘
```

### Interpreting Statistics

**Total Alerts**
- Count of all alerts in time window
- Helps understand system stability
- Compare across time windows

**Critical (P0/P1)**
- High-priority alerts requiring immediate action
- Should be investigated quickly
- Red color = urgent

**Active Alerts**
- Currently unresolved alerts
- Open + Acknowledged + Investigating
- Your action items

**Resolved**
- Successfully closed alerts
- Shows resolution rate (e.g., 88%)
- Higher is better

---

## 5. Viewing & Filtering Alerts

### Using Tabs

```
┌─ Alerts ──────────────────────────────────────────┐
│                                                    │
│  [Active]  [All Alerts]  [Resolved]  [Critical]  │
│   ^^^^                                             │
│  Selected - Shows only unresolved alerts          │
│                                                    │
│  🔍 Search...  [Severity ▼] [Category ▼]         │
│                                                    │
│  Showing 5 alerts                                 │
└────────────────────────────────────────────────────┘
```

**Tab Descriptions:**
- **Active** - Open, Acknowledged, or Investigating
- **All Alerts** - Every alert regardless of status
- **Resolved** - Successfully fixed alerts only
- **Critical** - P0 and P1 severity only

### Using Search

```
Step 1: Click search box
┌────────────────────────────────────────┐
│ 🔍 database connection                 │ ← Type here
└────────────────────────────────────────┘

Step 2: Results filter automatically (300ms delay)
┌────────────────────────────────────────┐
│ Showing 3 alerts                       │
│                                        │
│ ✅ Database Connection Failure        │
│ ✅ Database Connection Timeout        │
│ ✅ Database Pool Exhausted            │
└────────────────────────────────────────┘

Searches across:
- Alert title
- Message content
- Source service name
- Source endpoint
```

### Using Filters

```
┌─ Filters ──────────────────────────────┐
│                                        │
│  [Severity ▼]         [Category ▼]    │
│   │                    │               │
│   ├─ All Severities    ├─ All         │
│   ├─ P0 - Critical     ├─ Database    │
│   ├─ P1 - High         ├─ API         │
│   ├─ P2 - Medium       ├─ Auth        │
│   └─ P3 - Low          └─ External    │
│                                        │
│  [Clear Filters]                       │
└────────────────────────────────────────┘

Example: Select P0 + Database
Results: Only critical database alerts
```

### Combining Filters

```
Example Search: "connection"
    + Severity: P1
    + Category: External Service

Result: High-priority external service connection alerts

┌────────────────────────────────────────┐
│ 🔍 connection  [P1 ▼] [External ▼]    │
│ Showing 2 alerts                       │
│                                        │
│ ⚠️  OpenRouter Connection Failed      │
│ ⚠️  Resend API Connection Timeout     │
└────────────────────────────────────────┘
```

---

## 6. Alert Details

### Compact View (Default)

```
┌──────────────────────────────────────────────────┐
│ ⚠️  Database Connection Failure                 │
│ [P0] [Open] [Database]                 [3x]     │
│                                                  │
│ Failed to connect to database after 3 retries   │
│                                                  │
│ 🖥️  database • /api/companies/enrich • 2m ago   │
│                                                  │
│ [View Details] [Acknowledge] [Resolve] [▼]      │
└──────────────────────────────────────────────────┘
```

### Expanded View (Click ▼)

```
┌──────────────────────────────────────────────────┐
│ ⚠️  Database Connection Failure                 │
│ [P0] [Open] [Database]                 [3x]     │
│                                                  │
│ Failed to connect to database after 3 retries   │
│                                                  │
│ 🖥️  database • /api/companies/enrich • 2m ago   │
│                                                  │
│ [View Details] [Acknowledge] [Resolve] [▲]      │
├──────────────────────────────────────────────────┤
│ Full Message:                                    │
│ ┌────────────────────────────────────────────┐  │
│ │ Connection to PostgreSQL failed:           │  │
│ │ ECONNREFUSED 127.0.0.1:5432               │  │
│ │ Retried 3 times over 15 seconds           │  │
│ └────────────────────────────────────────────┘  │
│                                                  │
│ Error Stack:                                     │
│ ┌────────────────────────────────────────────┐  │
│ │ Error: connect ECONNREFUSED                │  │
│ │   at TCPConnectWrap.afterConnect           │  │
│ │   at lib/supabase/client.ts:45:12          │  │
│ └────────────────────────────────────────────┘  │
│                                                  │
│ Context:                                         │
│ {                                                │
│   "retryCount": 3,                              │
│   "timeout": 5000,                              │
│   "lastError": "ECONNREFUSED"                   │
│ }                                                │
│                                                  │
│ Timestamps:                                      │
│ First: 2025-10-22 14:30:15                      │
│ Last:  2025-10-22 14:32:20                      │
└──────────────────────────────────────────────────┘
```

### Full Detail Modal (Click "View Details")

```
┌────────────────────────────────────────────────────┐
│ ⚠️  Database Connection Failure           [✕]     │
│ Alert ID: a1b2c3d4-e5f6-7890-abcd-ef1234567890   │
├────────────────────────────────────────────────────┤
│                                                    │
│ Badges:  [P0] [Open] [Database] [3 occurrences]  │
│                                                    │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                    │
│ Message                                            │
│ ┌──────────────────────────────────────────────┐  │
│ │ Failed to connect to database after 3        │  │
│ │ retries. Connection refused on port 5432.    │  │
│ └──────────────────────────────────────────────┘  │
│                                                    │
│ Source Information                                 │
│ Service:   database                               │
│ Endpoint:  POST /api/companies/enrich             │
│                                                    │
│ Error Stack Trace                                  │
│ ┌──────────────────────────────────────────────┐  │
│ │ Error: connect ECONNREFUSED 127.0.0.1:5432  │  │
│ │   at TCPConnectWrap.afterConnect             │  │
│ │   at processTicksAndRejections               │  │
│ │   at async createClient                      │  │
│ │   at lib/supabase/client.ts:45:12            │  │
│ └──────────────────────────────────────────────┘  │
│                                                    │
│ Additional Context                                 │
│ {                                                  │
│   "retryCount": 3,                                │
│   "timeout": 5000,                                │
│   "connectionString": "postgres://...:5432",      │
│   "lastError": "ECONNREFUSED"                     │
│ }                                                  │
│                                                    │
│ Tags                                               │
│ [database] [connection] [critical]                │
│                                                    │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                    │
│ Timestamps                                         │
│ First Occurred: 2025-10-22 14:30:15               │
│                 (5 minutes ago)                    │
│ Last Occurred:  2025-10-22 14:32:20               │
│                 (3 minutes ago)                    │
│                                                    │
│ Notifications Sent                                 │
│ [email] Sent 4 minutes ago                        │
│                                                    │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                    │
│ Acknowledge Alert (Optional Notes)                 │
│ ┌──────────────────────────────────────────────┐  │
│ │ Investigating database connection issue...   │  │
│ │                                              │  │
│ └──────────────────────────────────────────────┘  │
│ [🕐 Acknowledge Alert]                            │
│                                                    │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                    │
│ Resolve Alert (Required Notes)                     │
│ ┌──────────────────────────────────────────────┐  │
│ │ Restarted database service. Connection       │  │
│ │ restored. Added monitoring to prevent future │  │
│ │ occurrences.                                 │  │
│ └──────────────────────────────────────────────┘  │
│ [✓ Resolve Alert]                                 │
│                                                    │
│ [View Runbook Documentation →]                    │
│                                                    │
└────────────────────────────────────────────────────┘
```

---

## 7. Managing Alerts

### Acknowledging an Alert

**Purpose:** Signal that you're aware and investigating

```
Step 1: Find alert
┌────────────────────────────────────────┐
│ ⚠️  OpenRouter API Timeout            │
│ [P1] [Open]                           │
│ [View Details] [Acknowledge] [Resolve]│
└────────────────────────────────────────┘

Step 2: Click "Acknowledge"
┌────────────────────────────────────────┐
│ Acknowledge Alert                      │
│                                        │
│ Optional Notes:                        │
│ ┌──────────────────────────────────┐  │
│ │ Looking into OpenRouter latency   │  │
│ │ issue. Checking status page.     │  │
│ └──────────────────────────────────┘  │
│                                        │
│ [Cancel]      [Acknowledge] ─────────→│
└────────────────────────────────────────┘

Step 3: Alert status updates
┌────────────────────────────────────────┐
│ ⚠️  OpenRouter API Timeout            │
│ [P1] [Acknowledged] ← Changed         │
│ Acknowledged by You • 1 second ago    │
└────────────────────────────────────────┘

Result:
✅ Alert marked as "Acknowledged"
✅ Your user ID recorded
✅ Notes saved in history
✅ Timestamp captured
```

### Resolving an Alert

**Purpose:** Close the alert as fixed

```
Step 1: Find alert
┌────────────────────────────────────────┐
│ ⚠️  Database Connection Failure       │
│ [P0] [Acknowledged]                   │
│ [View Details] [Resolve]              │
└────────────────────────────────────────┘

Step 2: Click "Resolve"
┌────────────────────────────────────────┐
│ Resolve Alert                          │
│                                        │
│ Resolution Notes (Required):           │
│ ┌──────────────────────────────────┐  │
│ │ Restarted PostgreSQL service.    │  │
│ │ Connection pool restored.        │  │
│ │ Added health check monitoring to │  │
│ │ prevent future occurrences.      │  │
│ └──────────────────────────────────┘  │
│                                        │
│ [Cancel]      [Resolve] ───────────→  │
└────────────────────────────────────────┘

Step 3: Alert status updates
┌────────────────────────────────────────┐
│ ✅ Database Connection Failure        │
│ [P0] [Resolved] ← Changed             │
│ Resolved by You • just now            │
│                                        │
│ Resolution: Restarted PostgreSQL...   │
└────────────────────────────────────────┘

Result:
✅ Alert marked as "Resolved"
✅ Resolution notes saved
✅ Resolved timestamp captured
✅ Alert removed from active list
✅ Appears in "Resolved" tab
```

### Quick Actions from List

```
Option 1: Quick Acknowledge
┌────────────────────────────────────────┐
│ ⚠️  API Rate Limit Exceeded           │
│ [P2] [Open]                           │
│ [Acknowledge] ← Click                 │
└────────────────────────────────────────┘
Acknowledges immediately with default note

Option 2: Quick Resolve
┌────────────────────────────────────────┐
│ ⚠️  Validation Error                  │
│ [P3] [Open]                           │
│ [Resolve] ← Click                     │
└────────────────────────────────────────┘
Opens resolve form (notes required)

Option 3: Detailed Management
┌────────────────────────────────────────┐
│ ⚠️  External Service Down             │
│ [P1] [Open]                           │
│ [View Details] ← Click                │
└────────────────────────────────────────┘
Opens full modal with all info + actions
```

---

## 8. Real-time Updates

### Automatic Refresh

```
Scenario: Dashboard is open

┌────────────────────────────────────────┐
│ Showing 5 alerts                       │
│                                        │
│ ⚠️  Alert 1                           │
│ ⚠️  Alert 2                           │
│ ⚠️  Alert 3                           │
│ ⚠️  Alert 4                           │
│ ⚠️  Alert 5                           │
└────────────────────────────────────────┘

[Backend triggers new alert]

Instantly updates (no refresh needed):
┌────────────────────────────────────────┐
│ Showing 6 alerts                       │
│                                        │
│ ⚠️  NEW! API Failure ← Just appeared  │
│ ⚠️  Alert 1                           │
│ ⚠️  Alert 2                           │
│ ⚠️  Alert 3                           │
│ ⚠️  Alert 4                           │
│ ⚠️  Alert 5                           │
└────────────────────────────────────────┘

Features:
✅ No page refresh needed
✅ Supabase real-time subscriptions
✅ Console logs show updates
✅ Alert count updates automatically
```

### Status Change Updates

```
Scenario: Another admin resolves an alert

Your View (Before):
┌────────────────────────────────────────┐
│ ⚠️  Database Timeout  [Open]          │
└────────────────────────────────────────┘

Admin 2: Resolves the alert

Your View (After - auto-updates):
┌────────────────────────────────────────┐
│ ✅ Database Timeout  [Resolved]       │
│ Resolved by Admin 2 • 5 seconds ago   │
└────────────────────────────────────────┘

Real-time means:
✅ See other admins' actions instantly
✅ Prevent duplicate work
✅ Coordinate responses
✅ Stay synchronized
```

### Connection Status

```
Check browser console:
┌────────────────────────────────────────┐
│ Console                                │
│                                        │
│ [Alert Subscription] Status: SUBSCRIBED│
│ [Alert Subscription] Connected: true   │
│ [Alert Subscription] Change: INSERT    │
│ [AlertList] Refreshing...              │
└────────────────────────────────────────┘

Connection States:
🟢 SUBSCRIBED - Connected, receiving updates
🟡 SUBSCRIBING - Connecting...
🔴 CLOSED - Disconnected (will auto-reconnect)
```

---

## 9. Use Case Scenarios

### Scenario 1: Morning Alert Review

**Goal:** Start your day by reviewing overnight alerts

```
Step 1: Access Dashboard
→ Navigate to /admin/alerts

Step 2: Check System Health
→ Verify all services are "Healthy"
→ If degraded, investigate

Step 3: Review Critical Alerts
→ Click "Critical (P0/P1)" tab
→ Check if any require immediate action

Step 4: Review Active Alerts
→ Click "Active" tab
→ See what's unresolved
→ Triage by priority

Step 5: Check Statistics
→ Switch to "Last 24 Hours"
→ Review alert trends
→ Compare to previous days

Step 6: Take Action
→ Acknowledge alerts you're investigating
→ Resolve fixed alerts
→ Escalate critical issues
```

### Scenario 2: Critical Database Failure

**Situation:** Database goes down during business hours

```
Notification Flow:

1. System detects failure
   ↓
2. Alert auto-created (P0)
   ↓
3. Email sent to admins
   ↓
4. Dashboard shows red alert
   ↓
5. You see notification

Your Response:

Step 1: Open Dashboard
→ See P0 alert at top

Step 2: Acknowledge Immediately
→ Click "Acknowledge"
→ Note: "Investigating DB connection"

Step 3: View Full Details
→ Click "View Details"
→ Check error stack
→ Review context (retry count, timeout)

Step 4: Investigate & Fix
→ Check database service
→ Restart if needed
→ Verify connection

Step 5: Resolve Alert
→ Click "Resolve"
→ Notes: "Restarted PostgreSQL. Root cause:
   memory exhaustion. Added monitoring."

Step 6: Monitor
→ Watch for recurrence
→ Check health card shows "Healthy"

Result:
✅ Issue resolved in <10 minutes
✅ Full audit trail preserved
✅ Team notified
✅ Prevention steps documented
```

### Scenario 3: Performance Investigation

**Situation:** Multiple "Degraded" health checks

```
Investigation Flow:

Step 1: Notice Pattern
→ Health card shows "Degraded"
→ OpenRouter response time: 5200ms (normal: 800ms)

Step 2: Search for Related Alerts
→ Search: "openrouter"
→ Filter: Category = External Service
→ Time: Last 24h

Step 3: Analyze Alerts
→ 8 alerts found
→ All show slow response times
→ Started 6 hours ago

Step 4: Check Statistics
→ Switch to "Last 24 Hours"
→ See spike in P2 alerts
→ Most are performance-related

Step 5: Investigate Root Cause
→ Check OpenRouter status page
→ Review API limits
→ Check network issues

Step 6: Document Findings
→ Acknowledge all related alerts
→ Notes: "OpenRouter degraded service.
   Monitoring their status page."

Step 7: Resolve When Fixed
→ Service returns to normal
→ Resolve all alerts
→ Notes: "OpenRouter resolved their issues.
   Our service back to normal."

Result:
✅ Trend identified
✅ Root cause found
✅ Service restored
✅ Documentation complete
```

### Scenario 4: Team Handoff

**Situation:** End of shift, passing to next admin

```
Handoff Process:

Step 1: Review Active Alerts
→ Click "Active" tab
→ Check what's unresolved

Step 2: Check Acknowledgments
→ See which you're investigating
→ Note: "Database monitoring - ongoing"

Step 3: Document Status
→ Update alert notes
→ Add current status
→ "Waiting for database team response"

Step 4: Notify Next Admin
→ Send handoff message
→ Include alert IDs
→ Mention priorities

Step 5: Next Admin Takes Over
→ Reviews dashboard
→ Sees acknowledged alerts
→ Reads your notes
→ Continues investigation

Step 6: Resolution
→ Next admin resolves
→ Notes: "Database team fixed.
   Handoff from [Your Name]"

Result:
✅ Smooth transition
✅ No lost context
✅ Continuous monitoring
✅ Clear ownership
```

---

## 10. Tips & Best Practices

### Dashboard Efficiency

```
💡 Tip 1: Use Keyboard Shortcuts
- Ctrl+R / Cmd+R: Refresh page
- Tab: Navigate between elements
- Enter: Activate focused button

💡 Tip 2: Bookmark Filtered Views
- Create bookmark for "Critical" tab
- Create bookmark for "Active" alerts
- Direct access to key views

💡 Tip 3: Multi-Monitor Setup
- Keep dashboard on secondary monitor
- Real-time updates visible
- Instant awareness of new alerts

💡 Tip 4: Mobile Access
- Dashboard is fully responsive
- Check alerts on phone
- Quick acknowledgments on-the-go
```

### Alert Management

```
✅ DO:
- Acknowledge alerts when investigating
- Write detailed resolution notes
- Review statistics daily
- Monitor trends
- Respond to P0 within 5 minutes
- Document root causes
- Share insights with team

❌ DON'T:
- Leave alerts unacknowledged
- Resolve without notes
- Ignore P0 alerts
- Acknowledge and forget
- Resolve recurring issues without fixing root cause
- Skip handoff documentation
```

### System Health

```
🎯 Best Practices:

1. Daily Health Check
   - Review at start of day
   - Check all services green
   - Note response times

2. Performance Baselines
   - Know normal response times
   - Database: <100ms
   - Auth: <200ms
   - OpenRouter: <1000ms
   - Resend: <300ms

3. Degradation Thresholds
   - Degraded: >2x normal
   - Down: Connection failed
   - Alert after 3 consecutive failures

4. Regular Refresh
   - Manual refresh every 5 minutes
   - Auto-refresh on page: 60 seconds
   - During incidents: every 30 seconds
```

### Alert Triage

```
Priority Matrix:

P0 (Critical) - Drop everything
└─ Database down
└─ Auth system failure
└─ Complete service outage

P1 (High) - Respond within 5 minutes
└─ API failures
└─ External service down
└─ Major feature broken

P2 (Medium) - Respond within 15 minutes
└─ Performance degradation
└─ High error rates
└─ Non-critical failures

P3 (Low) - Respond within 1 hour
└─ Validation errors
└─ Minor issues
└─ Warnings
```

### Common Patterns

```
Pattern 1: Cascading Failures
Symptom: Multiple alerts from different services
Action:  Find root cause (often database/network)
         Resolve root cause first
         Others should auto-resolve

Pattern 2: Recurring Alerts
Symptom: Same alert every hour
Action:  Don't just resolve repeatedly
         Investigate root cause
         Implement permanent fix
         Add monitoring

Pattern 3: False Positives
Symptom: Alert triggers incorrectly
Action:  Mark as "False Positive"
         Adjust alert rules
         Update thresholds
         Prevent future occurrences

Pattern 4: Alert Fatigue
Symptom: Too many low-priority alerts
Action:  Review alert rules
         Increase P3 thresholds
         Batch similar alerts
         Focus on critical issues
```

### Troubleshooting

```
Issue: Dashboard not loading
Fix:  - Check you're logged in as admin
      - Verify /admin/alerts URL
      - Check browser console for errors
      - Try hard refresh (Ctrl+Shift+R)

Issue: Real-time updates not working
Fix:  - Check browser console for "SUBSCRIBED"
      - Verify internet connection
      - Check Supabase status
      - Refresh page to reconnect

Issue: Can't acknowledge/resolve alerts
Fix:  - Verify admin role
      - Check browser console for errors
      - Try from alert detail modal
      - Check API endpoint permissions

Issue: Health checks show "down" but service works
Fix:  - Check environment variables
      - Verify API keys
      - Test service directly
      - Review error messages

Issue: No alerts shown
Fix:  - Check if migration ran
      - Verify RLS policies
      - Check tab selection (try "All Alerts")
      - Clear filters
      - Wrap API routes with error detection
```

---

## 🎓 Quick Reference Card

```
┌─────────────────────────────────────────────────┐
│             ALERTS DASHBOARD CHEAT SHEET        │
├─────────────────────────────────────────────────┤
│                                                 │
│ ACCESS:                                         │
│ → Sidebar: Admin Section → System Alerts       │
│ → URL: /admin/alerts                           │
│                                                 │
│ TABS:                                          │
│ → Active: Unresolved alerts                    │
│ → All: Everything                              │
│ → Resolved: Fixed alerts                       │
│ → Critical: P0/P1 only                         │
│                                                 │
│ ACTIONS:                                        │
│ → Acknowledge: Mark as investigating           │
│ → Resolve: Close with notes (required)         │
│ → View Details: Full modal                     │
│                                                 │
│ FILTERS:                                        │
│ → Search: Type to filter                       │
│ → Severity: P0, P1, P2, P3                     │
│ → Category: Database, API, etc.                │
│                                                 │
│ STATISTICS:                                     │
│ → Time: 1h, 24h, 7d                           │
│ → Total, Critical, Active, Resolved            │
│ → By severity, by category                     │
│                                                 │
│ HEALTH:                                         │
│ → Green: Healthy                               │
│ → Yellow: Degraded (slow)                      │
│ → Red: Down (critical)                         │
│ → Click refresh to re-check                    │
│                                                 │
│ RESPONSE TIMES:                                 │
│ → P0: Immediate (drop everything)              │
│ → P1: <5 minutes                               │
│ → P2: <15 minutes                              │
│ → P3: <1 hour                                  │
└─────────────────────────────────────────────────┘
```

---

## 📚 Related Documentation

- **PHASE_1_ALERT_SYSTEM_COMPLETE.md** - Backend details
- **PHASE_2_ADMIN_DASHBOARD_COMPLETE.md** - UI components
- **lib/alerts/README.md** - API usage
- **ALERTS_MIGRATION_GUIDE.md** - Setup instructions
- **COMPLETE_ALERT_SYSTEM_SUMMARY.md** - Full overview

---

## 🎬 Conclusion

You now know how to:
✅ Access the alerts dashboard
✅ Monitor system health
✅ View and filter alerts
✅ Acknowledge and resolve alerts
✅ Interpret statistics
✅ Use real-time updates
✅ Handle common scenarios
✅ Follow best practices

**Start using the dashboard today to monitor your system health and manage critical failures effectively!**

---

**Questions? Check the documentation or explore the dashboard hands-on!**

*This walkthrough is based on oppSpot Alert System v1.0 - Created 2025-10-22*
