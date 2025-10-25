# Phase 3: Advanced Features - Implementation Plan

**Status:** 🚧 In Progress
**Started:** 2025-10-22
**Estimated Completion:** TBD

---

## Overview

Phase 3 extends the Critical Alerts System with advanced notification channels, bulk operations, export capabilities, and enhanced management features.

### Prerequisites
- ✅ Phase 1 complete (backend + database)
- ✅ Phase 2 complete (admin dashboard)
- ⚠️ Database migration executed (see `PENDING_MIGRATIONS.md`)

---

## Phase 3 Features

### 1. Slack Integration ⭐ HIGH PRIORITY
**Status:** Starting now
**Time:** ~2 hours

#### Implementation
- **Service:** `lib/notifications/slack-notifier.ts`
  - Send alerts to Slack channels
  - Format messages with color coding (P0=red, P1=orange, etc.)
  - Include action buttons (Acknowledge, View Dashboard)
  - Support @mentions for critical alerts
  - Thread replies for updates

- **API Endpoint:** `app/api/notifications/slack/test/route.ts`
  - Test webhook connection
  - Send test message

- **Configuration:**
  - Read from `alert_configurations` table
  - Webhook URL, channel, mention_on settings
  - Enable/disable per severity level

#### Features
- Real-time alert notifications
- Rich message formatting
- Emoji indicators (🔴 P0, 🟠 P1, 🟡 P2, 🟢 P3)
- Action buttons (requires Slack app)
- Thread updates when alerts resolved
- Configurable mention rules

---

### 2. Bulk Actions ⭐ HIGH PRIORITY
**Status:** Planned
**Time:** ~1 hour

#### Implementation
- **Component:** `components/admin/alerts/bulk-actions-bar.tsx`
  - Checkbox selection
  - Bulk acknowledge
  - Bulk resolve
  - Bulk delete (false positives)
  - Selection counter

- **Hook:** `hooks/use-bulk-selection.ts`
  - Track selected alerts
  - Select all/none
  - Selection state management

- **API Endpoint:** `app/api/alerts/bulk/route.ts`
  - POST: Bulk acknowledge
  - POST: Bulk resolve
  - DELETE: Bulk delete

#### Features
- Select multiple alerts with checkboxes
- Bulk acknowledge with common notes
- Bulk resolve with resolution notes
- Bulk delete for false positives
- "Select all visible" option
- Confirmation dialogs for destructive actions

---

### 3. Export Functionality ⭐ HIGH PRIORITY
**Status:** Planned
**Time:** ~2 hours

#### Implementation
- **Service:** `lib/alerts/export-service.ts`
  - Export to CSV
  - Export to JSON
  - Apply current filters
  - Include all metadata

- **Component:** `components/admin/alerts/export-dialog.tsx`
  - Format selection (CSV/JSON)
  - Date range picker
  - Filter options
  - Download button

- **API Endpoint:** `app/api/alerts/export/route.ts`
  - GET: Generate export file
  - Query params: format, date_range, filters

#### Features
- Export visible alerts or all alerts
- CSV format for spreadsheets
- JSON format for data processing
- Apply current filters to export
- Date range selection
- Include/exclude resolved alerts
- Metadata: timestamps, user actions, resolution notes

---

### 4. Custom Webhooks ⭐ MEDIUM PRIORITY
**Status:** Planned
**Time:** ~1.5 hours

#### Implementation
- **Service:** `lib/notifications/webhook-notifier.ts`
  - POST alerts to custom URLs
  - Retry logic (3 attempts)
  - Timeout handling
  - Signature verification (HMAC)

- **Database:** Add `webhook_logs` table
  - Track delivery status
  - Record response codes
  - Store retry attempts

- **API Endpoints:**
  - `app/api/webhooks/test/route.ts` - Test webhook
  - `app/api/webhooks/logs/route.ts` - View delivery logs

#### Features
- Send alerts to any HTTP endpoint
- Custom payload format
- Configurable per severity
- Retry with exponential backoff
- Delivery confirmation
- Webhook logs and monitoring
- HMAC signature for security

---

### 5. Email Configuration UI ⭐ MEDIUM PRIORITY
**Status:** Planned
**Time:** ~2 hours

#### Implementation
- **Page:** `app/admin/alerts/settings/page.tsx`
  - Email configuration form
  - Slack configuration form
  - SMS configuration form
  - Webhook configuration form
  - Test buttons for each channel

- **Components:**
  - `components/admin/alerts/settings/email-config.tsx`
  - `components/admin/alerts/settings/slack-config.tsx`
  - `components/admin/alerts/settings/sms-config.tsx`
  - `components/admin/alerts/settings/webhook-config.tsx`

- **API Endpoint:** `app/api/alerts/settings/route.ts`
  - GET: Fetch current settings
  - PUT: Update settings
  - POST: Test channel

#### Features
- Visual configuration (no SQL needed)
- Add/remove admin email addresses
- Configure Slack webhook + channel
- Configure Twilio credentials
- Add custom webhook URLs
- Test each channel before saving
- Enable/disable per channel
- Preview notification format

---

### 6. SMS Alerts (Twilio) ⭐ MEDIUM PRIORITY
**Status:** Planned
**Time:** ~1.5 hours

#### Implementation
- **Service:** `lib/notifications/sms-notifier.ts`
  - Send SMS via Twilio
  - Format for 160 characters
  - Include severity + title + link
  - Rate limiting

- **Configuration:**
  - Twilio Account SID
  - Auth Token
  - From phone number
  - List of recipient numbers
  - Severity levels to send

- **Environment Variables:**
  ```env
  TWILIO_ACCOUNT_SID=AC...
  TWILIO_AUTH_TOKEN=...
  TWILIO_PHONE_NUMBER=+1234567890
  ```

#### Features
- SMS for critical alerts (P0/P1 only)
- Concise message format
- Link to dashboard
- Multiple recipients
- Configurable per severity
- Rate limiting (max 5 SMS/hour per recipient)
- Cost tracking

---

### 7. Alert Templates 🔵 LOW PRIORITY
**Status:** Future
**Time:** ~2 hours

#### Implementation
- **Database:** `alert_templates` table
  - Template name
  - Severity
  - Category
  - Title template
  - Message template
  - Actions

- **Component:** `components/admin/alerts/template-manager.tsx`
  - Create/edit templates
  - Apply template to alert
  - Default templates

#### Features
- Pre-defined alert templates
- Quick alert creation
- Consistent messaging
- Variable substitution
- Template library

---

### 8. Alert Correlation 🔵 LOW PRIORITY
**Status:** Future
**Time:** ~4 hours

#### Implementation
- **Service:** `lib/alerts/correlation-engine.ts`
  - Group related alerts
  - Detect patterns
  - Create parent/child relationships
  - Suggest root cause

#### Features
- Automatic alert grouping
- Pattern detection
- Root cause analysis
- Impact radius visualization
- Cascade detection

---

### 9. Scheduled Reports 🔵 LOW PRIORITY
**Status:** Future
**Time:** ~3 hours

#### Implementation
- **Service:** `lib/alerts/report-scheduler.ts`
  - Daily/weekly summaries
  - Email delivery
  - PDF generation
  - Trend analysis

#### Features
- Daily digest emails
- Weekly summary reports
- Trend charts
- Top categories
- Resolution metrics

---

## Implementation Order

### Week 1 (High Priority - Starting Now)
1. ✅ Create Phase 3 plan (this document)
2. 🚧 Slack Integration (~2 hours)
3. ⏳ Bulk Actions (~1 hour)
4. ⏳ Export Functionality (~2 hours)

### Week 2 (Medium Priority)
5. ⏳ Custom Webhooks (~1.5 hours)
6. ⏳ Email Configuration UI (~2 hours)
7. ⏳ SMS Alerts (~1.5 hours)

### Week 3+ (Low Priority / Future)
8. ⏳ Alert Templates
9. ⏳ Alert Correlation
10. ⏳ Scheduled Reports

---

## Technical Requirements

### New Dependencies

```json
{
  "@slack/web-api": "^7.0.0",      // Slack SDK
  "twilio": "^5.0.0",               // SMS via Twilio
  "papaparse": "^5.4.0",            // CSV generation
  "@types/papaparse": "^5.3.0"     // TypeScript types
}
```

### New Environment Variables

```env
# Slack (optional)
SLACK_BOT_TOKEN=xoxb-...
SLACK_SIGNING_SECRET=...

# Twilio (optional)
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1234567890

# Webhooks (optional)
WEBHOOK_SECRET=your-secret-key-for-hmac
```

### Database Changes

```sql
-- New table for webhook logs
CREATE TABLE webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id UUID REFERENCES system_alerts(id) ON DELETE CASCADE,
  webhook_url TEXT NOT NULL,
  status_code INTEGER,
  response_body TEXT,
  error_message TEXT,
  attempt_number INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- New table for alert templates (future)
CREATE TABLE alert_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  severity TEXT NOT NULL,
  category TEXT NOT NULL,
  title_template TEXT NOT NULL,
  message_template TEXT NOT NULL,
  context_template JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

---

## Success Criteria

### Phase 3 Complete When:
- ✅ Slack notifications working
- ✅ Bulk actions implemented
- ✅ Export to CSV/JSON working
- ✅ Custom webhooks functional
- ✅ Settings UI deployed
- ✅ SMS alerts configured (optional)
- ✅ All features documented
- ✅ Tests passing

---

## Testing Plan

### 1. Slack Integration
- [ ] Test webhook connection
- [ ] Send test alert to Slack
- [ ] Verify message formatting
- [ ] Test different severity colors
- [ ] Verify @mentions work
- [ ] Test thread updates

### 2. Bulk Actions
- [ ] Select multiple alerts
- [ ] Bulk acknowledge 5+ alerts
- [ ] Bulk resolve with notes
- [ ] Test "select all" feature
- [ ] Verify database updates
- [ ] Test error handling

### 3. Export Functionality
- [ ] Export to CSV with filters
- [ ] Export to JSON
- [ ] Verify all fields present
- [ ] Test date range filtering
- [ ] Test with 1000+ alerts
- [ ] Verify file downloads

### 4. Custom Webhooks
- [ ] Configure webhook URL
- [ ] Send test alert
- [ ] Verify payload format
- [ ] Test retry logic
- [ ] Verify HMAC signature
- [ ] Check delivery logs

### 5. Settings UI
- [ ] Update email list
- [ ] Configure Slack webhook
- [ ] Test channel connections
- [ ] Save settings
- [ ] Verify persistence
- [ ] Test error validation

### 6. SMS Alerts
- [ ] Send test SMS
- [ ] Verify message format
- [ ] Test multiple recipients
- [ ] Check rate limiting
- [ ] Verify delivery status
- [ ] Test error handling

---

## Documentation Updates

### New Documentation Files
1. `PHASE_3_ADVANCED_FEATURES_COMPLETE.md` - Implementation details
2. `SLACK_INTEGRATION_GUIDE.md` - Slack setup instructions
3. `WEBHOOKS_GUIDE.md` - Custom webhook documentation
4. `EXPORT_USAGE_GUIDE.md` - Export functionality usage

### Updated Documentation
1. `COMPLETE_ALERT_SYSTEM_SUMMARY.md` - Add Phase 3 features
2. `GETTING_STARTED_ALERTS.md` - Add Slack/SMS setup
3. `lib/alerts/README.md` - Add new API endpoints
4. `ALERTS_DASHBOARD_DEMO_WALKTHROUGH.md` - Add new UI features

---

## API Endpoints Summary

### New Endpoints

```typescript
// Slack
POST /api/notifications/slack/test        // Test Slack webhook
POST /api/notifications/slack/send        // Manual send

// Bulk actions
POST /api/alerts/bulk/acknowledge         // Bulk acknowledge
POST /api/alerts/bulk/resolve             // Bulk resolve
DELETE /api/alerts/bulk                   // Bulk delete

// Export
GET /api/alerts/export?format=csv&...     // Export alerts

// Webhooks
POST /api/webhooks/test                   // Test webhook
GET /api/webhooks/logs                    // View delivery logs

// Settings
GET /api/alerts/settings                  // Get all settings
PUT /api/alerts/settings                  // Update settings
POST /api/alerts/settings/test            // Test channel

// SMS
POST /api/notifications/sms/test          // Test SMS
POST /api/notifications/sms/send          // Manual send
```

---

## Risk Assessment

### Low Risk ✅
- Slack integration (external service)
- Bulk actions (extends existing features)
- Export functionality (read-only)

### Medium Risk ⚠️
- Custom webhooks (network calls)
- Settings UI (modifies database config)

### High Risk 🔴
- SMS alerts (costs money per message)
- Alert correlation (complex logic)

### Mitigation Strategies
1. **SMS Costs:** Rate limiting, P0/P1 only, configurable disable
2. **Webhooks:** Timeout limits, retry limits, async processing
3. **Settings:** Validation, test before save, rollback capability
4. **Performance:** Background jobs for notifications, queue processing

---

## Next Steps

1. **Install dependencies:**
   ```bash
   npm install @slack/web-api twilio papaparse
   npm install --save-dev @types/papaparse
   ```

2. **Start with Slack integration** (highest value, lowest risk)

3. **Create webhook logs migration** (for webhook feature)

4. **Implement bulk actions** (improves UX significantly)

5. **Add export functionality** (for reporting/compliance)

6. **Build settings UI** (easier configuration)

7. **Add SMS alerts** (for critical P0 alerts)

---

## Questions to Resolve

1. **Slack App vs Webhook?**
   - Webhook: Simpler, incoming messages only
   - App: Interactive buttons, two-way communication
   - **Decision:** Start with webhooks, upgrade to app later

2. **SMS Rate Limits?**
   - Suggest: Max 5 SMS/hour per recipient
   - Only P0 alerts by default
   - **Decision:** Configurable limits with sane defaults

3. **Export File Size Limits?**
   - Large exports (10k+ alerts) may timeout
   - **Decision:** Limit to 1000 alerts, add pagination

4. **Webhook Delivery Guarantees?**
   - At-least-once delivery (may retry)
   - **Decision:** 3 retries max, log failures

---

## Success Metrics

### Quantitative
- 100% Slack message delivery rate
- < 5 second export generation time (for 1000 alerts)
- < 10% webhook failure rate
- 0 accidental SMS charges

### Qualitative
- Admins prefer bulk actions over one-by-one
- Export feature used weekly for reporting
- Settings UI eliminates SQL configuration needs
- Slack notifications reduce dashboard check frequency

---

**Ready to start implementation!** 🚀

*Phase 3 Plan v1.0 | Created: 2025-10-22*
