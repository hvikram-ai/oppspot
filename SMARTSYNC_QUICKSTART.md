# SmartSync™ - Quick Start Guide

**Last Updated**: 2025-10-02
**Status**: Production-Ready for HubSpot Integration

---

## 📋 Prerequisites

- Node.js 18+
- Supabase account with database access
- HubSpot developer account (for OAuth credentials)
- oppSpot codebase with ResearchGPT and Lead Scoring implemented

---

## 🚀 Quick Setup (5 Steps)

### Step 1: Run Database Migration

```bash
# Navigate to project root
cd /home/vik/oppspot

# Push migration to database
npx supabase db push

# Verify tables created
npx supabase db diff
```

**Expected Output:**
- ✅ `crm_integrations` table created
- ✅ `crm_sync_logs` table created
- ✅ `crm_field_mappings` table created
- ✅ `crm_entity_mappings` table created
- ✅ `crm_sync_queue` table created

---

### Step 2: Set Up HubSpot App

1. Go to https://app.hubspot.com/
2. Navigate to **Settings** → **Integrations** → **Private Apps**
3. Click **Create a private app**
4. Configure:
   - **Name**: oppSpot SmartSync
   - **Description**: AI-powered CRM integration
   - **Scopes**:
     - `crm.objects.contacts.read`
     - `crm.objects.contacts.write`
     - `crm.objects.companies.read`
     - `crm.objects.companies.write`
     - `crm.objects.deals.read`
     - `crm.objects.deals.write`
     - `crm.objects.owners.read`
     - `oauth`

5. Click **Create app**
6. Copy **Access Token** (for testing)

**For OAuth (Production):**
1. Go to https://developers.hubspot.com/
2. Create new app
3. Set **Redirect URL**: `https://yourdomain.com/api/auth/hubspot/callback`
4. Copy **Client ID** and **Client Secret**

---

### Step 3: Configure Environment Variables

Add to `.env.local`:

```bash
# HubSpot OAuth (Production)
HUBSPOT_CLIENT_ID=your-client-id-here
HUBSPOT_CLIENT_SECRET=your-client-secret-here
NEXT_PUBLIC_HUBSPOT_REDIRECT_URI=http://localhost:3000/api/auth/hubspot/callback

# HubSpot Private App (Testing)
HUBSPOT_ACCESS_TOKEN=your-access-token-here
```

Restart development server:
```bash
npm run dev
```

---

### Step 4: Test the Integration

#### A. Test HubSpot Connection

```bash
# Using curl
curl -X POST http://localhost:3000/api/integrations/crm/connect \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SUPABASE_JWT_TOKEN" \
  -d '{
    "crm_type": "hubspot",
    "access_token": "YOUR_HUBSPOT_ACCESS_TOKEN",
    "sync_direction": "bidirectional",
    "sync_frequency": "realtime",
    "auto_enrich": true,
    "auto_score": true,
    "auto_assign": true,
    "auto_create_tasks": true
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "integration": {
    "id": "abc-123-...",
    "crm_type": "hubspot",
    "is_active": true,
    "auto_enrich": true
  },
  "message": "CRM integration connected successfully"
}
```

#### B. Test Contact Sync

```bash
curl -X POST http://localhost:3000/api/integrations/crm/sync \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SUPABASE_JWT_TOKEN" \
  -d '{
    "entity_type": "contact",
    "contact": {
      "email": "test@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "company": "Test Company",
      "phone": "+44 20 1234 5678",
      "title": "CTO"
    }
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "crmContactId": "12345678",
  "entityType": "contact"
}
```

#### C. Check Sync Logs

```bash
curl -X GET "http://localhost:3000/api/integrations/crm/sync?status=success&limit=10" \
  -H "Authorization: Bearer YOUR_SUPABASE_JWT_TOKEN"
```

**Expected Response:**
```json
{
  "logs": [
    {
      "id": "...",
      "sync_type": "contact",
      "operation": "create",
      "status": "success",
      "enrichments": {
        "summary": "Test Company is a...",
        "leadScore": 75,
        "buyingSignals": ["..."]
      },
      "duration_ms": 1250
    }
  ]
}
```

---

### Step 5: Verify in HubSpot

1. Log in to HubSpot
2. Go to **Contacts** → **Contacts**
3. Search for the contact you synced
4. Check for custom fields:
   - `oppspot_summary`
   - `oppspot_score`
   - `oppspot_signals`
   - `oppspot_next_actions`
   - `oppspot_deal_stage`

---

## 🧪 Testing with TypeScript

Create a test file: `scripts/test-smartsync.ts`

```typescript
import { getSmartSyncOrchestrator } from '@/lib/integrations/crm';

async function testSmartSync() {
  const orchestrator = getSmartSyncOrchestrator();

  // Test contact sync
  const result = await orchestrator.syncContact(
    'your-integration-id', // Get from Step 4A response
    {
      email: 'sarah.chen@revolut.com',
      firstName: 'Sarah',
      lastName: 'Chen',
      company: 'Revolut',
      companyId: 'abc-123', // oppSpot company ID (optional)
      title: 'VP Engineering',
    }
  );

  console.log('Sync result:', result);

  if (result.success) {
    console.log('✅ Contact synced to HubSpot!');
    console.log('HubSpot Contact ID:', result.crmContactId);
  } else {
    console.log('❌ Sync failed:', result.error);
  }
}

testSmartSync();
```

Run:
```bash
npx tsx scripts/test-smartsync.ts
```

---

## 📊 Monitoring & Debugging

### Check Database

```sql
-- View all integrations
SELECT * FROM crm_integrations;

-- View recent sync logs
SELECT
  sync_type,
  operation,
  status,
  duration_ms,
  created_at
FROM crm_sync_logs
ORDER BY created_at DESC
LIMIT 10;

-- View failed syncs
SELECT * FROM crm_sync_logs
WHERE status = 'failed'
ORDER BY created_at DESC;

-- View enrichment data
SELECT
  sync_type,
  enrichments->>'leadScore' as score,
  enrichments->>'buyingSignals' as signals,
  enrichment_time_ms
FROM crm_sync_logs
WHERE enrichments IS NOT NULL
LIMIT 5;
```

### Enable Debug Logging

Add to your `.env.local`:
```bash
DEBUG=smartsync:*
LOG_LEVEL=debug
```

### Common Issues

**Issue**: "Integration not found or inactive"
```bash
# Solution: Check if integration exists and is active
SELECT id, crm_type, is_active FROM crm_integrations;
```

**Issue**: "Invalid CRM credentials"
```bash
# Solution: Refresh access token
# 1. Get new token from HubSpot
# 2. Update integration:
UPDATE crm_integrations
SET access_token = 'NEW_TOKEN', updated_at = NOW()
WHERE id = 'your-integration-id';
```

**Issue**: "Rate limit exceeded"
```bash
# Solution: Wait for rate limit reset
# SmartSync automatically retries with exponential backoff
# Check retry_count in sync logs
SELECT retry_count, error_message FROM crm_sync_logs
WHERE error_code = 'RATE_LIMIT'
ORDER BY created_at DESC;
```

---

## 🎯 Usage Examples

### Example 1: Sync Contact with Company

```typescript
import { getSmartSyncOrchestrator } from '@/lib/integrations/crm';

const orchestrator = getSmartSyncOrchestrator();

// Sync contact (will auto-enrich if company exists in oppSpot)
await orchestrator.syncContact('integration-id', {
  email: 'john@acme.com',
  firstName: 'John',
  lastName: 'Smith',
  company: 'Acme Corp',
  companyId: 'oppspot-company-id', // Important: Links to oppSpot data
  phone: '+44 20 1234 5678',
  title: 'CEO',
});
```

### Example 2: Sync Without Enrichment (Fast)

```typescript
await orchestrator.syncContact(
  'integration-id',
  {
    email: 'jane@example.com',
    firstName: 'Jane',
    lastName: 'Doe',
  },
  {
    skipEnrichment: true, // Skip AI enrichment for speed
  }
);
```

### Example 3: Sync Company

```typescript
await orchestrator.syncCompany('integration-id', {
  companyId: 'oppspot-company-id',
  name: 'Revolut',
  domain: 'revolut.com',
  industry: 'Fintech',
  employeeCount: 2800,
  revenue: 880000000,
  description: 'Digital banking platform',
});
```

### Example 4: Check Integration Status

```typescript
// GET /api/integrations/crm/connect
const response = await fetch('/api/integrations/crm/connect');
const { integrations } = await response.json();

console.log('Active integrations:', integrations);
```

---

## 🔒 Security Checklist

- [ ] Environment variables set (never commit `.env.local`)
- [ ] RLS policies enabled on all tables
- [ ] Access tokens stored encrypted
- [ ] JWT authentication required for all API endpoints
- [ ] Admin-only access to integration management
- [ ] Audit logging enabled
- [ ] Rate limiting configured

---

## 📈 Performance Tuning

### Database Indexes

Already created in migration:
```sql
-- Optimize sync log queries
CREATE INDEX idx_crm_sync_logs_created ON crm_sync_logs(created_at DESC);
CREATE INDEX idx_crm_sync_logs_status ON crm_sync_logs(status);

-- Optimize entity mapping lookups
CREATE INDEX idx_crm_entity_mappings_oppspot ON crm_entity_mappings(oppspot_entity_id, oppspot_entity_type);
```

### Caching

```typescript
// Connectors are automatically cached by orchestrator
// No manual caching needed
```

### Batch Operations (Future)

```typescript
// Coming in Week 7-8
await orchestrator.syncBatch('integration-id', {
  contacts: [
    { email: 'contact1@example.com', ... },
    { email: 'contact2@example.com', ... },
    // ... up to 100 contacts
  ]
});
```

---

## 📚 API Reference

### POST /api/integrations/crm/connect

Connect or update CRM integration.

**Request:**
```json
{
  "crm_type": "hubspot",
  "access_token": "string (required)",
  "refresh_token": "string (optional)",
  "sync_direction": "bidirectional" | "to_crm" | "from_crm",
  "sync_frequency": "realtime" | "hourly" | "daily" | "manual",
  "auto_enrich": true,
  "auto_score": true,
  "auto_assign": true,
  "auto_create_tasks": true
}
```

**Response:**
```json
{
  "success": true,
  "integration": { ... },
  "message": "CRM integration connected successfully"
}
```

### POST /api/integrations/crm/sync

Sync contact or company to CRM.

**Request:**
```json
{
  "integration_id": "uuid (optional - uses first active)",
  "entity_type": "contact" | "company",
  "contact": {
    "email": "string (required)",
    "firstName": "string (optional)",
    "lastName": "string (optional)",
    "company": "string (optional)",
    "companyId": "uuid (optional)",
    "phone": "string (optional)",
    "title": "string (optional)"
  },
  "options": {
    "skipEnrichment": false,
    "priority": 5
  }
}
```

**Response:**
```json
{
  "success": true,
  "crmContactId": "12345678",
  "entityType": "contact"
}
```

### GET /api/integrations/crm/sync

Get sync history and logs.

**Query Parameters:**
- `integration_id`: Filter by integration (optional)
- `status`: Filter by status - success, failed, pending (optional)
- `limit`: Max results (default: 50, max: 100)

**Response:**
```json
{
  "logs": [
    {
      "id": "uuid",
      "sync_type": "contact",
      "operation": "create",
      "status": "success",
      "enrichments": { ... },
      "duration_ms": 1250,
      "created_at": "2025-10-02T..."
    }
  ]
}
```

---

## 🚀 Next Steps

### Week 5: Build UI Dashboard
- Integration connection wizard
- Sync history table
- Real-time status indicators
- Field mapping configuration

### Week 6: Add Salesforce
- Implement `salesforce-connector.ts`
- OAuth flow
- Test with sandbox

### Week 7-8: Advanced Features
- Webhook handlers (bi-directional sync)
- Bulk operations
- Background job queue (Inngest)
- E2E tests (Playwright)

---

## 📞 Support

### Documentation
- **Technical README**: `lib/integrations/crm/README.md`
- **Implementation Plan**: `SMARTSYNC_IMPLEMENTATION.md`
- **Executive Summary**: `SMARTSYNC_SUMMARY.md`

### Troubleshooting
- Check sync logs in database
- Enable debug logging (`DEBUG=smartsync:*`)
- Review error messages in `crm_sync_logs` table

### Common Commands

```bash
# View logs
SELECT * FROM crm_sync_logs ORDER BY created_at DESC LIMIT 10;

# Check integration status
SELECT id, crm_type, is_active, last_sync_at FROM crm_integrations;

# Count successful syncs
SELECT COUNT(*) FROM crm_sync_logs WHERE status = 'success';

# Average sync duration
SELECT AVG(duration_ms) FROM crm_sync_logs WHERE status = 'success';
```

---

## ✅ Checklist for Production

- [ ] Database migration applied
- [ ] Environment variables configured
- [ ] HubSpot app created and configured
- [ ] OAuth flow tested
- [ ] Test contacts synced successfully
- [ ] Enrichment working (summaries, scores, signals)
- [ ] Automated tasks created in HubSpot
- [ ] Automated deals created for high-scoring leads
- [ ] Sync logs verified in database
- [ ] Error handling tested (invalid tokens, rate limits)
- [ ] RLS policies tested (org isolation)
- [ ] Performance metrics acceptable (<5 sec sync time)
- [ ] Documentation reviewed
- [ ] Beta users identified for testing

---

**Status**: ✅ Ready for Production (HubSpot)
**Last Updated**: 2025-10-02
**Version**: 1.0.0
