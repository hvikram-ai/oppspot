# SmartSync™ - File Reference

Quick reference for all SmartSync™ files and their purposes.

---

## 📁 Core Files

### Database
- **`supabase/migrations/20251002000008_smartsync_crm_integrations.sql`**
  - 5 tables: integrations, sync_logs, field_mappings, entity_mappings, sync_queue
  - RLS policies, indexes, helper functions
  - ~750 lines

### Type Definitions
- **`lib/integrations/crm/types.ts`**
  - All TypeScript types and interfaces
  - CRM entity types, error classes
  - ~450 lines

### Base Connector
- **`lib/integrations/crm/base-connector.ts`**
  - Abstract base class for all CRM integrations
  - Common auth flow, error handling, retry logic
  - Factory pattern for connector creation
  - ~400 lines

### HubSpot Connector
- **`lib/integrations/crm/hubspot-connector.ts`**
  - Full HubSpot implementation
  - CRUD for Contacts, Companies, Deals, Tasks, Notes
  - OAuth, field mapping, associations
  - ~800 lines

### AI Enrichment
- **`lib/integrations/crm/enrichment-service.ts`**
  - AI enrichment with ResearchGPT integration
  - Lead scoring, signal extraction, action suggestions
  - Auto-assignment logic
  - ~400 lines

### Orchestrator
- **`lib/integrations/crm/smartsync-orchestrator.ts`**
  - Main sync workflow coordinator
  - Manages connectors, mappings, entity tracking
  - Auto-creates tasks and deals
  - ~500 lines

### Exports
- **`lib/integrations/crm/index.ts`**
  - Central export point
  - Connector factory registration
  - ~30 lines

---

## 🔌 API Endpoints

### Connect CRM
- **`app/api/integrations/crm/connect/route.ts`**
  - POST: Connect or update CRM integration
  - GET: List all integrations
  - ~200 lines

### Sync Operations
- **`app/api/integrations/crm/sync/route.ts`**
  - POST: Sync contact or company
  - GET: Get sync history/logs
  - ~150 lines

---

## 📚 Documentation

### Quick Start
- **`SMARTSYNC_QUICKSTART.md`**
  - Setup instructions (5 steps)
  - Testing guide with curl examples
  - API reference
  - Troubleshooting
  - Production checklist

### Technical README
- **`lib/integrations/crm/README.md`**
  - Architecture overview
  - How it works
  - API usage examples
  - Configuration guide
  - Contributing guidelines

### Implementation Plan
- **`SMARTSYNC_IMPLEMENTATION.md`**
  - Detailed 8-week plan
  - Code examples for all components
  - Database schema design
  - UI mockups

### Executive Summary
- **`SMARTSYNC_SUMMARY.md`**
  - Business value proposition
  - Feature comparison vs competitors
  - Customer impact metrics
  - Status and next steps

### File Reference
- **`SMARTSYNC_FILES.md`** (this file)
  - Quick reference for all files
  - File sizes and line counts

---

## 📊 File Statistics

| File | Lines | Size | Purpose |
|------|-------|------|---------|
| `20251002000008_smartsync_crm_integrations.sql` | ~750 | 32K | Database schema |
| `types.ts` | ~450 | 8.6K | Type definitions |
| `base-connector.ts` | ~400 | 12K | Base class |
| `hubspot-connector.ts` | ~800 | 22K | HubSpot integration |
| `enrichment-service.ts` | ~400 | 12K | AI enrichment |
| `smartsync-orchestrator.ts` | ~500 | 16K | Orchestrator |
| `index.ts` | ~30 | 824B | Exports |
| `connect/route.ts` | ~200 | 6.9K | Connect API |
| `sync/route.ts` | ~150 | 5.4K | Sync API |
| **Total** | **~3,680** | **~115K** | |

---

## 🗂️ Directory Structure

```
oppspot/
├── supabase/
│   └── migrations/
│       └── 20251002000008_smartsync_crm_integrations.sql
│
├── lib/
│   └── integrations/
│       └── crm/
│           ├── types.ts
│           ├── base-connector.ts
│           ├── hubspot-connector.ts
│           ├── enrichment-service.ts
│           ├── smartsync-orchestrator.ts
│           ├── index.ts
│           └── README.md
│
├── app/
│   └── api/
│       └── integrations/
│           └── crm/
│               ├── connect/
│               │   └── route.ts
│               └── sync/
│                   └── route.ts
│
├── SMARTSYNC_IMPLEMENTATION.md
├── SMARTSYNC_SUMMARY.md
├── SMARTSYNC_QUICKSTART.md
└── SMARTSYNC_FILES.md (this file)
```

---

## 🔍 Quick Navigation

### To Set Up
→ `SMARTSYNC_QUICKSTART.md`

### To Understand Architecture
→ `lib/integrations/crm/README.md`
→ `SMARTSYNC_IMPLEMENTATION.md`

### To Use the API
→ `lib/integrations/crm/README.md` (API section)
→ `SMARTSYNC_QUICKSTART.md` (Examples)

### To Add New CRM
→ `lib/integrations/crm/base-connector.ts` (Extend)
→ `lib/integrations/crm/hubspot-connector.ts` (Reference)

### To Debug
→ `SMARTSYNC_QUICKSTART.md` (Troubleshooting)
→ `crm_sync_logs` table in database

### For Business Context
→ `SMARTSYNC_SUMMARY.md`

---

## 🚀 Import Paths

```typescript
// Types
import { 
  Contact, 
  Company, 
  Deal, 
  EnrichmentResult,
  CRMIntegration 
} from '@/lib/integrations/crm/types';

// Services
import { getSmartSyncOrchestrator } from '@/lib/integrations/crm/smartsync-orchestrator';
import { getEnrichmentService } from '@/lib/integrations/crm/enrichment-service';

// Connectors
import { HubSpotConnector } from '@/lib/integrations/crm/hubspot-connector';
import { CRMConnectorFactory } from '@/lib/integrations/crm/base-connector';

// Or import everything
import * as SmartSync from '@/lib/integrations/crm';
```

---

## 📝 Key Tables

### `crm_integrations`
Stores CRM connections
- Fields: organization_id, crm_type, access_token, config, auto_enrich, etc.
- Query: `SELECT * FROM crm_integrations WHERE organization_id = '...'`

### `crm_sync_logs`
Audit trail of all syncs
- Fields: sync_type, operation, status, enrichments, duration_ms
- Query: `SELECT * FROM crm_sync_logs WHERE status = 'success' ORDER BY created_at DESC`

### `crm_entity_mappings`
Maps oppSpot IDs ↔ CRM IDs
- Fields: oppspot_entity_id, crm_entity_id, last_synced_at
- Query: `SELECT * FROM crm_entity_mappings WHERE oppspot_entity_id = '...'`

### `crm_field_mappings`
Custom field configurations
- Fields: oppspot_field, crm_field, transform_function
- Query: `SELECT * FROM crm_field_mappings WHERE integration_id = '...'`

### `crm_sync_queue`
Async job queue (future use)
- Fields: job_type, priority, status, payload
- Query: `SELECT * FROM crm_sync_queue WHERE status = 'queued'`

---

**Last Updated**: 2025-10-02
**Version**: 1.0.0
