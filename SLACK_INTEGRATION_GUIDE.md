# Slack Integration Guide - oppSpot Alert System

**Complete Setup Guide** | Get Slack notifications for critical alerts

---

## Overview

Receive real-time alert notifications in Slack with rich formatting, color coding by severity, and automatic resolution updates.

### Features
- 🔴 Color-coded messages (P0=red, P1=orange, P2=yellow, P3=green)
- 📊 Rich message formatting with alert details
- ⚡ Real-time notifications when alerts trigger
- ✅ Automatic updates when alerts are resolved
- 🔔 @channel mentions for critical alerts (configurable)
- 🔗 Direct links to alert dashboard
- 🎯 Customizable per severity level

---

## Quick Setup (5 Minutes)

### Step 1: Create Slack Incoming Webhook

1. **Go to Slack App Directory:**
   ```
   https://api.slack.com/messaging/webhooks
   ```

2. **Create a new Slack App:**
   - Click "Create New App"
   - Choose "From scratch"
   - App Name: `oppSpot Alerts`
   - Workspace: Select your workspace
   - Click "Create App"

3. **Enable Incoming Webhooks:**
   - In your app settings, click "Incoming Webhooks"
   - Toggle "Activate Incoming Webhooks" to **On**
   - Click "Add New Webhook to Workspace"
   - Select the channel to post to (e.g., `#alerts`)
   - Click "Allow"

4. **Copy the Webhook URL:**
   ```
   https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX
   ```
   - You'll need this in Step 2

### Step 2: Configure in Database

Execute this SQL in your Supabase SQL Editor:

```sql
UPDATE alert_configurations
SET config_value = '{
  "enabled": true,
  "webhook_url": "https://hooks.slack.com/services/YOUR/WEBHOOK/URL",
  "channel": "#alerts",
  "mention_on": ["P0", "P1"],
  "username": "oppSpot Alerts",
  "icon_emoji": ":warning:"
}'::jsonb
WHERE config_key = 'slack_settings';
```

**Replace `YOUR/WEBHOOK/URL` with your actual webhook URL from Step 1.**

### Step 3: Test the Integration

```bash
# Start your dev server
npm run dev

# In another terminal, test Slack
curl -X POST http://localhost:3000/api/notifications/slack/test \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN" \
  -H "Content-Type: application/json"
```

**Or test via the Settings UI (coming soon in Phase 3).**

You should see a test message in your Slack channel:
```
✅ Test Message: Slack Integration Working!
oppSpot Alert System - Test
Status: ✅ Connected
Timestamp: 2025-10-22T...
```

---

## Configuration Options

### Full Configuration Schema

```typescript
{
  enabled: boolean          // Enable/disable Slack notifications
  webhook_url: string       // Slack incoming webhook URL
  channel?: string          // Optional: Override default channel
  mention_on?: string[]     // Severities that trigger @channel mention
  username?: string         // Display name for bot (default: "oppSpot Alerts")
  icon_emoji?: string       // Bot icon emoji (default: ":warning:")
}
```

### Configuration Examples

#### Basic Configuration (Minimal)
```json
{
  "enabled": true,
  "webhook_url": "https://hooks.slack.com/services/..."
}
```

#### Recommended Configuration
```json
{
  "enabled": true,
  "webhook_url": "https://hooks.slack.com/services/...",
  "channel": "#alerts",
  "mention_on": ["P0", "P1"],
  "username": "oppSpot Alerts",
  "icon_emoji": ":rotating_light:"
}
```

#### Silent Mode (No Mentions)
```json
{
  "enabled": true,
  "webhook_url": "https://hooks.slack.com/services/...",
  "channel": "#monitoring",
  "mention_on": [],
  "username": "oppSpot Monitor"
}
```

#### Critical Alerts Only
```json
{
  "enabled": true,
  "webhook_url": "https://hooks.slack.com/services/...",
  "channel": "#critical-alerts",
  "mention_on": ["P0"],
  "username": "🚨 Critical Alerts"
}
```

---

## Message Format

### Alert Notification

When an alert triggers, you'll receive:

```
🔴 P0 Alert: Database Connection Failure
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
oppSpot Alert System

🗄️ Database Connection Failure
Failed to connect to PostgreSQL after 3 retries

Severity: 🔴 P0          Category: Database Failure
Service: database        Occurrences: 3x

🔍 View Dashboard →

oppSpot Alert System | 2:45 PM
```

### Resolution Notification

When resolved, you'll receive:

```
✅ Alert Resolved: Database Connection Failure
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Issue fixed by restarting database connection pool

Resolved By: John Smith
Original Severity: P0

oppSpot Alert System | 2:50 PM
```

### Severity Color Coding

| Severity | Color | Emoji | Use Case |
|----------|-------|-------|----------|
| **P0** | 🔴 Red | 🔴 | System down, critical failure |
| **P1** | 🟠 Orange | 🟠 | Major feature broken |
| **P2** | 🟡 Yellow | 🟡 | Degraded performance |
| **P3** | 🟢 Green | 🟢 | Minor issues |

---

## Advanced Configuration

### Multiple Slack Channels

To send different severities to different channels, you'll need multiple webhooks:

1. Create separate Slack apps for each channel
2. Get webhook URL for each
3. Modify alert service to route by severity (custom code)

**Example custom routing:**
```typescript
// lib/alerts/alert-service.ts (custom modification)
private async sendSlackAlert(alert: Alert) {
  const webhookUrl = alert.severity === 'P0'
    ? process.env.SLACK_CRITICAL_WEBHOOK
    : process.env.SLACK_GENERAL_WEBHOOK

  // Send to appropriate webhook
}
```

### Custom Alert Filtering

Filter which alerts go to Slack:

```sql
-- Only send database and API failures
UPDATE alert_configurations
SET config_value = jsonb_set(
  config_value,
  '{filter_categories}',
  '["database_failure", "api_failure"]'::jsonb
)
WHERE config_key = 'slack_settings';
```

**Note:** Requires custom code modification to respect this filter.

### Scheduled Digest (Future)

Instead of real-time alerts, send daily/hourly digests:

```sql
-- Configure digest mode (future feature)
UPDATE alert_configurations
SET config_value = jsonb_set(
  config_value,
  '{mode}',
  '"digest"'::jsonb
)
WHERE config_key = 'slack_settings';
```

---

## Troubleshooting

### Issue 1: No Messages Appearing in Slack

**Symptoms:** Alert triggers but no Slack message

**Solutions:**

1. **Check webhook URL is correct:**
   ```sql
   SELECT config_value->>'webhook_url'
   FROM alert_configurations
   WHERE config_key = 'slack_settings';
   ```

2. **Verify enabled is true:**
   ```sql
   SELECT config_value->>'enabled'
   FROM alert_configurations
   WHERE config_key = 'slack_settings';
   -- Should return: true
   ```

3. **Test webhook directly:**
   ```bash
   curl -X POST https://hooks.slack.com/services/YOUR/WEBHOOK/URL \
     -H 'Content-Type: application/json' \
     -d '{"text": "Test message"}'
   ```

4. **Check server logs:**
   ```bash
   # Look for Slack notifier logs
   grep "SlackNotifier" logs/server.log
   ```

### Issue 2: Webhook URL Invalid

**Error:** `Slack API error: 404` or `invalid_token`

**Solutions:**
- Regenerate webhook in Slack
- Ensure no extra spaces in URL
- Check webhook wasn't deleted in Slack settings
- Verify Slack app is installed in workspace

### Issue 3: @channel Mentions Not Working

**Symptoms:** No @channel mentions despite configuration

**Solutions:**

1. **Check mention_on array:**
   ```sql
   SELECT config_value->'mention_on'
   FROM alert_configurations
   WHERE config_key = 'slack_settings';
   -- Should return: ["P0", "P1"]
   ```

2. **Verify bot has permissions:**
   - Go to Slack App settings
   - OAuth & Permissions
   - Ensure `chat:write` permission is granted

3. **Test with P0 alert:**
   ```typescript
   await alertService.triggerAlert({
     severity: 'P0',
     category: 'custom',
     title: 'Test @channel Mention',
     message: 'Testing mentions',
     sourceService: 'test',
   })
   ```

### Issue 4: Messages Too Verbose

**Solution:** Customize message format in `lib/notifications/slack-notifier.ts`

Reduce fields shown:
```typescript
// In buildSlackPayload method
fields: [
  { title: 'Severity', value: alert.severity, short: true },
  { title: 'Service', value: alert.sourceService, short: true },
  // Remove other fields for brevity
],
```

### Issue 5: Rate Limiting

**Error:** `rate_limited` from Slack

**Solutions:**
- Slack allows ~1 message per second per webhook
- Implement queuing for burst alerts
- Use digest mode instead of real-time
- Deduplicate aggressively (already implemented)

---

## Monitoring & Debugging

### Check Notification Success

```sql
-- View alerts with Slack notifications
SELECT
  id,
  severity,
  title,
  channels_notified,
  notification_sent_at,
  notification_failed,
  notification_error
FROM system_alerts
WHERE 'slack' = ANY(channels_notified)
ORDER BY created_at DESC
LIMIT 10;
```

### Check Failed Notifications

```sql
-- Find failed Slack notifications
SELECT
  id,
  severity,
  title,
  notification_error,
  created_at
FROM system_alerts
WHERE notification_failed = true
  AND 'slack' != ANY(channels_notified)
ORDER BY created_at DESC;
```

### Server Logs

Look for these log messages:

```bash
# Successful send
[SlackNotifier] Alert sent to Slack: <alert-id>
[AlertService] Slack notification sent: <alert-id>

# Configuration loaded
[SlackNotifier] Slack notifications configured

# Failed send
[SlackNotifier] Failed to send alert: <error>
[AlertService] Slack notification failed: <alert-id>

# Not configured
[SlackNotifier] No Slack configuration found
[SlackNotifier] Slack disabled or no webhook URL
```

---

## Security Considerations

### Webhook URL Protection

⚠️ **Important:** Webhook URLs are sensitive credentials!

1. **Store in database config** (already done)
   - Not in code or environment variables
   - Encrypted at rest in Supabase

2. **Access control:**
   - Only admins can view/modify
   - RLS policies enforce this

3. **Rotation:**
   - Regenerate webhook if compromised
   - Update database config immediately

### Message Content

- **Do NOT include:**
  - Passwords or secrets
  - Personal identifiable information (PII)
  - Full credit card numbers
  - Authentication tokens

- **OK to include:**
  - Error messages (sanitized)
  - Service names
  - Timestamps
  - Severity levels
  - Generic error descriptions

### Channel Permissions

- Make `#alerts` channel private if sensitive
- Limit membership to ops/engineering team
- Consider separate channels for different data sensitivity levels

---

## Best Practices

### Channel Organization

**Recommended setup:**

```
#alerts-critical    → P0 alerts only, @channel mentions
#alerts-high        → P1 alerts, no mentions
#alerts-monitoring  → P2/P3 alerts, informational
#alerts-resolved    → Resolution notifications only
```

### Alert Fatigue Prevention

1. **Use severity appropriately:**
   - P0: True emergencies only
   - P1: Important but not urgent
   - P2/P3: Informational

2. **Configure mentions wisely:**
   ```json
   {
     "mention_on": ["P0"]  // Only critical alerts
   }
   ```

3. **Enable deduplication** (already implemented)
   - Prevents duplicate alerts within 5 minutes

4. **Consider digest mode:**
   - Hourly summaries instead of real-time
   - Reduces noise for P2/P3 alerts

### Response Workflows

**When a Slack alert arrives:**

1. Click "View Dashboard" button
2. Acknowledge alert in dashboard (adds note)
3. Investigate and fix issue
4. Resolve alert with resolution notes
5. Slack automatically posts resolution

**Example workflow:**
```
1. 🔴 Alert arrives in Slack → Click link → Dashboard
2. 👀 Acknowledge → Add note: "Investigating database connection"
3. 🔧 Fix issue → Restart connection pool
4. ✅ Resolve → Notes: "Restarted connection pool, monitoring"
5. ✅ Slack posts resolution automatically
```

---

## Integration with Other Tools

### Jira (Future)

Create Jira tickets from Slack alerts:
- Use Slack workflow builder
- Connect to Jira webhook
- Automatically create ticket when alert arrives

### PagerDuty (Future)

Escalate critical alerts:
- Forward P0 alerts to PagerDuty
- Implement in custom code
- Use PagerDuty API

### Microsoft Teams (Alternative)

If using Teams instead of Slack:
- Similar incoming webhook setup
- Modify `lib/notifications/slack-notifier.ts`
- Adjust message format for Teams connectors

---

## Disabling Slack Notifications

### Temporary Disable

```sql
UPDATE alert_configurations
SET config_value = jsonb_set(
  config_value,
  '{enabled}',
  'false'::jsonb
)
WHERE config_key = 'slack_settings';
```

### Permanent Removal

```sql
-- Reset to default disabled state
UPDATE alert_configurations
SET config_value = '{
  "enabled": false,
  "webhook_url": "",
  "channel": "",
  "mention_on": []
}'::jsonb
WHERE config_key = 'slack_settings';
```

---

## Future Enhancements

### Coming Soon (Phase 3+)

- ✅ **Settings UI:** Configure Slack without SQL
- 🔜 **Interactive buttons:** Acknowledge/resolve from Slack
- 🔜 **Slack app:** Full two-way integration
- 🔜 **Thread replies:** Updates in thread instead of new messages
- 🔜 **Digest mode:** Scheduled summaries
- 🔜 **Custom filters:** Per-category routing
- 🔜 **Slash commands:** `/oppspot status` in Slack

### Requested Features

Vote for features in GitHub Issues:
- Custom message templates
- Emoji customization per severity
- Scheduled quiet hours
- Per-user direct messages
- Alert snoozing from Slack

---

## Support

**Documentation:**
- Alert System Overview: `COMPLETE_ALERT_SYSTEM_SUMMARY.md`
- Getting Started: `GETTING_STARTED_ALERTS.md`
- API Reference: `lib/alerts/README.md`

**Test Endpoint:**
```
POST /api/notifications/slack/test
```

**Source Code:**
- Service: `lib/notifications/slack-notifier.ts`
- Integration: `lib/alerts/alert-service.ts` (sendSlackAlert method)
- Test API: `app/api/notifications/slack/test/route.ts`

---

## Example: Complete Setup

### 1. Create Slack Webhook
```
Webhook URL: https://hooks.slack.com/services/T123/B456/xyz789
Channel: #alerts
```

### 2. Configure Database
```sql
UPDATE alert_configurations
SET config_value = '{
  "enabled": true,
  "webhook_url": "https://hooks.slack.com/services/T123/B456/xyz789",
  "channel": "#alerts",
  "mention_on": ["P0", "P1"],
  "username": "oppSpot Alerts",
  "icon_emoji": ":rotating_light:"
}'::jsonb
WHERE config_key = 'slack_settings';
```

### 3. Test Integration
```bash
curl -X POST http://localhost:3000/api/notifications/slack/test \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 4. Trigger Test Alert
```typescript
import { AlertService } from '@/lib/alerts'

const alertService = new AlertService()
await alertService.triggerAlert({
  severity: 'P1',
  category: 'custom',
  title: 'Test Slack Integration',
  message: 'This is a test alert to verify Slack notifications',
  sourceService: 'test-script',
})
```

### 5. Verify in Slack
Check `#alerts` channel for message:
```
🟠 P1 Alert: Test Slack Integration
This is a test alert to verify Slack notifications
Severity: 🟠 P1 | Service: test-script
🔍 View Dashboard →
```

---

**🎉 Slack integration complete!**

Your alert system now sends real-time notifications to Slack with rich formatting and automatic updates.

---

*Slack Integration Guide v1.0 | Created: 2025-10-22*
*Part of oppSpot Critical Alerts System - Phase 3*
