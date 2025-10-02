# SmartSync™ - AI-Powered CRM Integration

**Status**: Core Implementation Complete (Week 1-4 Done)
**Next Steps**: UI Dashboard, Salesforce connector, E2E tests

---

## What We've Built

SmartSync™ transforms traditional "dumb" CRM sync into intelligent, AI-powered integration that automatically enriches your CRM with actionable intelligence.

### ✅ Completed Components

1. **Database Schema** (`/supabase/migrations/20251002000008_smartsync_crm_integrations.sql`)
   - 5 tables for managing integrations, sync logs, field mappings, queue, and entity mappings
   - Full RLS policies for security
   - Automatic triggers and helper functions
   - Optimized indexes for performance

2. **Type Definitions** (`types.ts`)
   - Comprehensive TypeScript types for all CRM entities
   - Contact, Company, Deal, Task, Note interfaces
   - Error types and validation schemas
   - 450+ lines of type safety

3. **Base Connector** (`base-connector.ts`)
   - Abstract base class for all CRM integrations
   - Common authentication flow
   - Error handling and retry logic
   - Rate limit handling
   - Factory pattern for connector creation

4. **HubSpot Connector** (`hubspot-connector.ts`)
   - Full CRUD operations for Contacts, Companies, Deals, Tasks, Notes
   - OAuth authentication with token refresh
   - Field discovery and custom field mapping
   - Association handling (link contacts to companies/deals)
   - 800+ lines of production-ready code

5. **AI Enrichment Service** (`enrichment-service.ts`)
   - Integrates with ResearchGPT for company intelligence
   - Auto-generates lead scores (0-100)
   - Extracts buying signals from research data
   - Determines deal stage automatically
   - Suggests next actions for sales reps
   - Auto-assignment logic (territory/industry-based)

6. **SmartSync Orchestrator** (`smartsync-orchestrator.ts`)
   - Coordinates entire sync workflow
   - Manages connector lifecycle
   - Applies field mappings
   - Creates follow-up tasks automatically
   - Auto-creates deals for high-scoring leads
   - Comprehensive error logging

7. **API Endpoints**
   - `POST /api/integrations/crm/connect` - Connect/update CRM integration
   - `GET /api/integrations/crm/connect` - List all integrations
   - `POST /api/integrations/crm/sync` - Sync contact or company
   - `GET /api/integrations/crm/sync` - Get sync history/logs

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    oppSpot                          │
│  ┌──────────────────────────────────────────────┐  │
│  │   API: /api/integrations/crm/sync            │  │
│  └──────────────┬───────────────────────────────┘  │
│                 │                                    │
│                 ▼                                    │
│  ┌──────────────────────────────────────────────┐  │
│  │   SmartSync Orchestrator                     │  │
│  │   - Manages sync workflow                    │  │
│  │   - Applies field mappings                   │  │
│  │   - Handles entity mappings                  │  │
│  └──────┬────────────────────┬──────────────────┘  │
│         │                    │                       │
│         ▼                    ▼                       │
│  ┌──────────────┐   ┌───────────────────────────┐  │
│  │ Enrichment   │   │ CRM Connector (HubSpot)   │  │
│  │ Service      │   │ - CRUD operations         │  │
│  │ - Research   │   │ - Authentication          │  │
│  │ - Scoring    │   │ - Field mapping           │  │
│  │ - Signals    │   └───────────┬───────────────┘  │
│  └──────────────┘               │                   │
└─────────────────────────────────┼────────────────────┘
                                  │
                                  ▼
                     ┌─────────────────────────┐
                     │   HubSpot API           │
                     │   - Contacts            │
                     │   - Companies           │
                     │   - Deals               │
                     │   - Tasks               │
                     └─────────────────────────┘
```

---

## How It Works

### Example: Syncing a Contact

```typescript
import { getSmartSyncOrchestrator } from '@/lib/integrations/crm';

const orchestrator = getSmartSyncOrchestrator();

const result = await orchestrator.syncContact(
  'integration-id',
  {
    email: 'sarah.chen@revolut.com',
    firstName: 'Sarah',
    lastName: 'Chen',
    company: 'Revolut',
    companyId: 'abc-123', // oppSpot company ID
    title: 'VP Engineering',
  }
);

// Result: Contact synced to HubSpot with enriched data:
// ✅ AI-generated company summary
// ✅ Lead score (89/100)
// ✅ Buying signals (hiring 12 engineers, posted 3 roles)
// ✅ Suggested actions (Schedule call within 48h)
// ✅ Automated follow-up task created
// ✅ Deal created (because score >= 70)
```

### What Gets Synced to CRM

**Standard Fields:**
- Contact details (email, name, phone, title)
- Company information

**AI-Enriched Custom Fields:**
- `oppspot_summary` - AI-generated company summary
- `oppspot_score` - Lead score (0-100)
- `oppspot_signals` - Comma-separated buying signals
- `oppspot_next_actions` - Suggested next steps
- `oppspot_deal_stage` - Auto-determined stage
- `oppspot_score_financial` - Financial health subscore
- `oppspot_score_growth` - Growth trajectory subscore
- `oppspot_score_engagement` - Engagement level subscore
- `oppspot_score_fit` - ICP fit subscore

**Automated Actions (if enabled):**
- ✅ Follow-up task created with AI-suggested action
- ✅ Deal created for high-scoring leads (score >= 70)
- ✅ Contact assigned to appropriate sales rep

---

## Database Schema

### `crm_integrations`
Stores CRM connection configurations:
- OAuth tokens (encrypted)
- Sync settings (direction, frequency)
- AI feature toggles (auto_enrich, auto_score, auto_assign, auto_create_tasks)
- Status tracking (last_sync_at, sync_count, last_error)

### `crm_sync_logs`
Audit log of all sync operations:
- What was synced (entity type, operation)
- Enrichments applied (JSON)
- Performance metrics (duration, enrichment time)
- Success/failure status with error details

### `crm_field_mappings`
Custom field mapping configurations:
- Map oppSpot fields → CRM fields
- Support for transformations
- Per-entity-type mappings

### `crm_entity_mappings`
Tracks oppSpot ID ↔ CRM ID relationships:
- Prevents duplicate syncs
- Enables updates instead of creates
- Tracks sync count and last sync time

### `crm_sync_queue`
Async job queue (future use):
- Priority-based job scheduling
- Retry logic with max attempts
- Processing time tracking

---

## API Usage

### Connect HubSpot

```typescript
POST /api/integrations/crm/connect

{
  "crm_type": "hubspot",
  "access_token": "CMa...xyz",
  "refresh_token": "CM...abc",
  "sync_direction": "bidirectional",
  "sync_frequency": "realtime",
  "auto_enrich": true,
  "auto_score": true,
  "auto_assign": true,
  "auto_create_tasks": true
}

// Response:
{
  "success": true,
  "integration": {
    "id": "...",
    "crm_type": "hubspot",
    "is_active": true,
    ...
  }
}
```

### Sync Contact

```typescript
POST /api/integrations/crm/sync

{
  "entity_type": "contact",
  "contact": {
    "email": "john@company.com",
    "firstName": "John",
    "lastName": "Doe",
    "company": "Acme Corp",
    "companyId": "abc-123",
    "phone": "+44 20 1234 5678",
    "title": "CTO"
  },
  "options": {
    "skipEnrichment": false,
    "priority": 8
  }
}

// Response:
{
  "success": true,
  "crmContactId": "12345678",
  "entityType": "contact"
}
```

### Get Sync Logs

```typescript
GET /api/integrations/crm/sync?integration_id=abc&status=success&limit=50

// Response:
{
  "logs": [
    {
      "id": "...",
      "sync_type": "contact",
      "operation": "create",
      "status": "success",
      "enrichments": {
        "summary": "Acme Corp is a SaaS company...",
        "leadScore": 89,
        "buyingSignals": ["Hiring 5 engineers", "Raised Series B"],
        ...
      },
      "duration_ms": 1250,
      "created_at": "2025-10-02T..."
    }
  ]
}
```

---

## Configuration

### Environment Variables

Add to `.env.local`:

```bash
# HubSpot OAuth
HUBSPOT_CLIENT_ID=your-client-id
HUBSPOT_CLIENT_SECRET=your-client-secret
NEXT_PUBLIC_HUBSPOT_REDIRECT_URI=http://localhost:3000/api/auth/hubspot/callback

# Salesforce OAuth (future)
# SALESFORCE_CLIENT_ID=...
# SALESFORCE_CLIENT_SECRET=...
```

### HubSpot Setup

1. Create HubSpot app at https://app.hubspot.com/
2. Enable OAuth scopes:
   - `crm.objects.contacts.write`
   - `crm.objects.companies.write`
   - `crm.objects.deals.write`
   - `crm.objects.tasks.write`
3. Set redirect URI: `https://yourdomain.com/api/auth/hubspot/callback`
4. Copy Client ID and Secret to environment variables

---

## Testing the Implementation

### 1. Run Database Migration

```bash
npx supabase db push
```

### 2. Test HubSpot Connection

```typescript
import { HubSpotConnector } from '@/lib/integrations/crm';

const connector = new HubSpotConnector();
await connector.connect({
  type: 'hubspot',
  accessToken: 'YOUR_ACCESS_TOKEN',
});

const isValid = await connector.validateCredentials();
console.log('Connection valid:', isValid);
```

### 3. Test Contact Sync

```typescript
import { getSmartSyncOrchestrator } from '@/lib/integrations/crm';

const orchestrator = getSmartSyncOrchestrator();

const result = await orchestrator.syncContact(
  'your-integration-id',
  {
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    company: 'Test Company',
    companyId: 'some-company-id',
  }
);

console.log('Sync result:', result);
```

---

## What's Next (Remaining Tasks)

### Week 5: UI Dashboard
- [ ] Integration connection UI
- [ ] Sync history table
- [ ] Field mapping configuration interface
- [ ] Real-time sync status indicators

### Week 6: Salesforce Connector
- [ ] Implement `salesforce-connector.ts`
- [ ] Handle Salesforce OAuth flow
- [ ] Map Salesforce-specific field types
- [ ] Test with sandbox account

### Week 7-8: Advanced Features
- [ ] Webhook handlers for bi-directional sync
- [ ] Bulk sync operations
- [ ] Background job queue with Inngest
- [ ] Advanced field mapping (transformations)
- [ ] E2E tests with Playwright

---

## Performance Metrics

**Target Performance:**
- Sync latency: <5 seconds (90th percentile)
- Enrichment time: <2 seconds
- API response time: <500ms
- Sync success rate: >99%

**Current Implementation:**
- ✅ Full error handling and retry logic
- ✅ Comprehensive logging for debugging
- ✅ Optimized database queries with indexes
- ✅ Entity mapping prevents duplicate syncs

---

## Security Considerations

1. **Token Storage**: Access tokens stored encrypted in database
2. **RLS Policies**: Row-level security ensures org isolation
3. **Rate Limiting**: Built-in retry with exponential backoff
4. **Audit Logging**: Every sync operation logged with full details
5. **Error Handling**: No sensitive data leaked in error messages

---

## Support & Troubleshooting

### Common Issues

**Issue**: "Invalid CRM credentials"
- **Solution**: Refresh OAuth token or reconnect integration

**Issue**: "Sync failed: Rate limit exceeded"
- **Solution**: Wait for rate limit reset (check `retry-after` header)

**Issue**: "Contact already exists"
- **Solution**: SmartSync automatically detects and updates existing contacts

**Issue**: "Enrichment timeout"
- **Solution**: Use `skipEnrichment: true` option for faster syncs

### Debug Logs

Enable debug logging:
```typescript
process.env.DEBUG = 'smartsync:*';
```

Check sync logs:
```sql
SELECT * FROM crm_sync_logs
WHERE status = 'failed'
ORDER BY created_at DESC
LIMIT 10;
```

---

## Contributing

To add a new CRM connector:

1. Create `new-crm-connector.ts` extending `BaseCRMConnector`
2. Implement all required methods (connect, create*, update*, etc.)
3. Register in `index.ts`: `CRMConnectorFactory.register('newcrm', NewCRMConnector)`
4. Add OAuth flow in `/app/api/auth/newcrm/callback/route.ts`
5. Update types in `types.ts` if needed
6. Write tests

---

## License

Part of oppSpot - All Rights Reserved

---

**Last Updated**: 2025-10-02
**Version**: 1.0.0 (Core Implementation)
**Status**: Production-Ready for HubSpot Integration
