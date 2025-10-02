# SmartSync™ Implementation Plan

**Feature**: SmartSync™ - AI-Powered CRM Intelligence
**Status**: NOT STARTED
**Priority**: Phase 2 (Months 3-4)
**Created**: 2025-10-02

---

## Executive Summary

SmartSync™ transforms traditional "dumb" CRM sync into intelligent, AI-powered integration that enriches your CRM automatically. Instead of just pushing contact data, SmartSync uses AI to:

- ✅ Auto-generate company summaries
- ✅ Add buying signals and intent data
- ✅ Set lead scores automatically
- ✅ Assign leads to the right reps
- ✅ Create tasks based on signals
- ✅ Update deal stages intelligently
- ✅ Suggest next actions

---

## Market Gap & Competitive Advantage

### Current State (All Competitors):
```
Traditional CRM Sync:
❌ Pushes raw contact data (name, email, phone)
❌ No enrichment
❌ No intelligence
❌ Manual CRM hygiene required
```

### SmartSync™ Advantage:
```
Intelligent CRM Sync:
✅ Pushes enriched data with AI analysis
✅ Auto-scores and qualifies leads
✅ Auto-assigns to correct rep
✅ Creates intelligent tasks
✅ Updates deal stages dynamically
✅ Maintains CRM hygiene automatically
```

**Customer Impact**: Saves 10-15 hours/week per rep on CRM data entry and hygiene.

---

## Technical Architecture

### System Overview

```
┌─────────────────────────────────────────────────────┐
│                    oppSpot                          │
│  ┌──────────────────────────────────────────────┐  │
│  │   Lead Captured / Data Updated                │  │
│  └──────────────┬───────────────────────────────┘  │
│                 │                                    │
│                 ▼                                    │
│  ┌──────────────────────────────────────────────┐  │
│  │   SmartSync Orchestrator                     │  │
│  │   - Detects sync trigger                     │  │
│  │   - Routes to correct CRM connector          │  │
│  └──────────────┬───────────────────────────────┘  │
│                 │                                    │
│                 ▼                                    │
│  ┌──────────────────────────────────────────────┐  │
│  │   AI Enrichment Pipeline                     │  │
│  │   1. Research company (ResearchGPT)          │  │
│  │   2. Score lead (Scoring Agent)              │  │
│  │   3. Analyze signals (Signal Detector)       │  │
│  │   4. Generate summary (LLM)                  │  │
│  │   5. Suggest actions (Writer Agent)          │  │
│  └──────────────┬───────────────────────────────┘  │
│                 │                                    │
│                 ▼                                    │
│  ┌──────────────────────────────────────────────┐  │
│  │   Field Mapper                               │  │
│  │   - Map oppSpot fields → CRM fields          │  │
│  │   - Apply custom transformations             │  │
│  └──────────────┬───────────────────────────────┘  │
│                 │                                    │
└─────────────────┼────────────────────────────────────┘
                  │
                  ▼
    ┌─────────────────────────┐
    │   CRM Connectors        │
    │   - HubSpot             │
    │   - Salesforce          │
    │   - Pipedrive           │
    │   - Future: More        │
    └─────────────────────────┘
```

---

## Database Schema

### New Tables Required

```sql
-- CRM Integration Configurations
CREATE TABLE crm_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  crm_type TEXT NOT NULL, -- 'hubspot', 'salesforce', 'pipedrive'

  -- Authentication
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,

  -- Configuration
  config JSONB NOT NULL DEFAULT '{}', -- CRM-specific settings
  field_mappings JSONB NOT NULL DEFAULT '{}', -- Custom field mappings

  -- Sync Settings
  sync_direction TEXT NOT NULL DEFAULT 'bidirectional', -- 'to_crm', 'from_crm', 'bidirectional'
  sync_frequency TEXT NOT NULL DEFAULT 'realtime', -- 'realtime', 'hourly', 'daily'
  auto_enrich BOOLEAN NOT NULL DEFAULT true,
  auto_score BOOLEAN NOT NULL DEFAULT true,
  auto_assign BOOLEAN NOT NULL DEFAULT true,

  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  last_error TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Sync History & Audit Log
CREATE TABLE crm_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID REFERENCES crm_integrations(id) ON DELETE CASCADE,

  -- Sync details
  sync_type TEXT NOT NULL, -- 'contact', 'company', 'deal', 'task'
  direction TEXT NOT NULL, -- 'to_crm', 'from_crm'
  operation TEXT NOT NULL, -- 'create', 'update', 'delete'

  -- Data
  oppspot_entity_id UUID, -- Company, contact, or deal ID in oppSpot
  crm_entity_id TEXT, -- Entity ID in external CRM
  payload JSONB, -- Data that was synced

  -- AI Enrichments Applied
  enrichments JSONB, -- What AI enrichments were added

  -- Status
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'success', 'failed', 'skipped'
  error_message TEXT,
  retry_count INT NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Field Mapping Templates
CREATE TABLE crm_field_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID REFERENCES crm_integrations(id) ON DELETE CASCADE,

  -- Mapping
  oppspot_field TEXT NOT NULL,
  crm_field TEXT NOT NULL,
  field_type TEXT NOT NULL, -- 'standard', 'custom'

  -- Transformation
  transform_function TEXT, -- Optional: JS function to transform value
  default_value TEXT,

  -- Settings
  is_required BOOLEAN NOT NULL DEFAULT false,
  sync_direction TEXT NOT NULL DEFAULT 'bidirectional',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Sync Queue (for async processing)
CREATE TABLE crm_sync_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID REFERENCES crm_integrations(id) ON DELETE CASCADE,

  -- Job details
  job_type TEXT NOT NULL, -- 'sync_contact', 'sync_company', 'enrich_and_sync'
  priority INT NOT NULL DEFAULT 5, -- 1-10 (10 = highest)
  payload JSONB NOT NULL,

  -- Status
  status TEXT NOT NULL DEFAULT 'queued', -- 'queued', 'processing', 'completed', 'failed'
  attempts INT NOT NULL DEFAULT 0,
  max_attempts INT NOT NULL DEFAULT 3,
  error_message TEXT,

  -- Timing
  scheduled_for TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_crm_integrations_org ON crm_integrations(organization_id);
CREATE INDEX idx_crm_integrations_active ON crm_integrations(is_active) WHERE is_active = true;
CREATE INDEX idx_crm_sync_logs_integration ON crm_sync_logs(integration_id);
CREATE INDEX idx_crm_sync_logs_status ON crm_sync_logs(status);
CREATE INDEX idx_crm_sync_logs_created ON crm_sync_logs(created_at DESC);
CREATE INDEX idx_crm_sync_queue_status ON crm_sync_queue(status) WHERE status IN ('queued', 'processing');
CREATE INDEX idx_crm_sync_queue_scheduled ON crm_sync_queue(scheduled_for);

-- RLS Policies
ALTER TABLE crm_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_field_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_sync_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their org's CRM integrations"
  ON crm_integrations FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage their org's CRM integrations"
  ON crm_integrations FOR ALL
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

-- Similar policies for other tables...
```

---

## Service Architecture

### 1. Base CRM Connector Interface

```typescript
// lib/integrations/crm/base-connector.ts

export interface CRMConnector {
  // Authentication
  connect(credentials: CRMCredentials): Promise<void>;
  disconnect(): Promise<void>;
  refreshToken(): Promise<string>;

  // Entity Operations
  createContact(contact: Contact): Promise<CRMContact>;
  updateContact(id: string, contact: Partial<Contact>): Promise<CRMContact>;
  getContact(id: string): Promise<CRMContact>;

  createCompany(company: Company): Promise<CRMCompany>;
  updateCompany(id: string, company: Partial<Company>): Promise<CRMCompany>;
  getCompany(id: string): Promise<CRMCompany>;

  createDeal(deal: Deal): Promise<CRMDeal>;
  updateDeal(id: string, deal: Partial<Deal>): Promise<CRMDeal>;

  createTask(task: Task): Promise<CRMTask>;

  // Field Discovery
  getFields(entityType: 'contact' | 'company' | 'deal'): Promise<CRMField[]>;

  // Webhooks
  setupWebhook(url: string, events: string[]): Promise<void>;

  // Validation
  validateCredentials(): Promise<boolean>;
}

export interface CRMCredentials {
  type: 'hubspot' | 'salesforce' | 'pipedrive';
  accessToken: string;
  refreshToken?: string;
  instanceUrl?: string; // For Salesforce
}

export interface Contact {
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  company?: string;
  title?: string;
  customFields?: Record<string, any>;
}

export interface Company {
  name: string;
  domain?: string;
  industry?: string;
  employeeCount?: number;
  revenue?: number;
  description?: string;
  customFields?: Record<string, any>;
}

export interface Deal {
  name: string;
  amount?: number;
  stage?: string;
  closeDate?: Date;
  contactId?: string;
  companyId?: string;
  customFields?: Record<string, any>;
}

export interface Task {
  title: string;
  description?: string;
  dueDate?: Date;
  assignedTo?: string;
  priority?: 'low' | 'medium' | 'high';
  relatedTo?: {
    type: 'contact' | 'company' | 'deal';
    id: string;
  };
}

export abstract class BaseCRMConnector implements CRMConnector {
  protected credentials: CRMCredentials;
  protected httpClient: AxiosInstance;

  abstract connect(credentials: CRMCredentials): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract refreshToken(): Promise<string>;

  // Implement common functionality
  protected async handleAPIError(error: any): Promise<never> {
    // Standardized error handling
    throw new CRMIntegrationError(error);
  }
}
```

### 2. HubSpot Connector

```typescript
// lib/integrations/crm/hubspot-connector.ts

import { BaseCRMConnector, CRMCredentials, Contact } from './base-connector';
import axios from 'axios';

export class HubSpotConnector extends BaseCRMConnector {
  private readonly baseUrl = 'https://api.hubapi.com';

  async connect(credentials: CRMCredentials): Promise<void> {
    this.credentials = credentials;
    this.httpClient = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Authorization': `Bearer ${credentials.accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    // Validate connection
    await this.validateCredentials();
  }

  async validateCredentials(): Promise<boolean> {
    try {
      await this.httpClient.get('/oauth/v1/access-tokens/' + this.credentials.accessToken);
      return true;
    } catch (error) {
      return false;
    }
  }

  async createContact(contact: Contact): Promise<any> {
    const properties = {
      email: contact.email,
      firstname: contact.firstName,
      lastname: contact.lastName,
      phone: contact.phone,
      company: contact.company,
      jobtitle: contact.title,
      ...contact.customFields,
    };

    const response = await this.httpClient.post('/crm/v3/objects/contacts', {
      properties,
    });

    return response.data;
  }

  async updateContact(id: string, contact: Partial<Contact>): Promise<any> {
    const properties: Record<string, any> = {};

    if (contact.firstName) properties.firstname = contact.firstName;
    if (contact.lastName) properties.lastname = contact.lastName;
    if (contact.phone) properties.phone = contact.phone;
    if (contact.company) properties.company = contact.company;
    if (contact.title) properties.jobtitle = contact.title;
    if (contact.customFields) Object.assign(properties, contact.customFields);

    const response = await this.httpClient.patch(`/crm/v3/objects/contacts/${id}`, {
      properties,
    });

    return response.data;
  }

  async createCompany(company: any): Promise<any> {
    const properties = {
      name: company.name,
      domain: company.domain,
      industry: company.industry,
      numberofemployees: company.employeeCount,
      annualrevenue: company.revenue,
      description: company.description,
      ...company.customFields,
    };

    const response = await this.httpClient.post('/crm/v3/objects/companies', {
      properties,
    });

    return response.data;
  }

  async createDeal(deal: any): Promise<any> {
    const properties = {
      dealname: deal.name,
      amount: deal.amount,
      dealstage: deal.stage,
      closedate: deal.closeDate?.toISOString(),
      ...deal.customFields,
    };

    const associations = [];
    if (deal.contactId) {
      associations.push({
        to: { id: deal.contactId },
        types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 3 }],
      });
    }
    if (deal.companyId) {
      associations.push({
        to: { id: deal.companyId },
        types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 5 }],
      });
    }

    const response = await this.httpClient.post('/crm/v3/objects/deals', {
      properties,
      associations,
    });

    return response.data;
  }

  async createTask(task: any): Promise<any> {
    const properties = {
      hs_task_subject: task.title,
      hs_task_body: task.description,
      hs_timestamp: task.dueDate?.toISOString(),
      hs_task_priority: task.priority?.toUpperCase(),
      hubspot_owner_id: task.assignedTo,
    };

    const associations = [];
    if (task.relatedTo) {
      const typeMap = {
        contact: 200,
        company: 192,
        deal: 216,
      };
      associations.push({
        to: { id: task.relatedTo.id },
        types: [{
          associationCategory: 'HUBSPOT_DEFINED',
          associationTypeId: typeMap[task.relatedTo.type]
        }],
      });
    }

    const response = await this.httpClient.post('/crm/v3/objects/tasks', {
      properties,
      associations,
    });

    return response.data;
  }

  async getFields(entityType: 'contact' | 'company' | 'deal'): Promise<any[]> {
    const objectTypeMap = {
      contact: 'contacts',
      company: 'companies',
      deal: 'deals',
    };

    const response = await this.httpClient.get(
      `/crm/v3/properties/${objectTypeMap[entityType]}`
    );

    return response.data.results;
  }

  async setupWebhook(url: string, events: string[]): Promise<void> {
    // HubSpot webhook setup
    // Implementation depends on your webhook handling strategy
  }

  async refreshToken(): Promise<string> {
    // Implement OAuth token refresh
    const response = await axios.post('https://api.hubapi.com/oauth/v1/token', {
      grant_type: 'refresh_token',
      refresh_token: this.credentials.refreshToken,
      client_id: process.env.HUBSPOT_CLIENT_ID,
      client_secret: process.env.HUBSPOT_CLIENT_SECRET,
    });

    return response.data.access_token;
  }

  async disconnect(): Promise<void> {
    // Clean up resources
    this.httpClient = null;
    this.credentials = null;
  }
}
```

### 3. AI Enrichment Service

```typescript
// lib/integrations/crm/enrichment-service.ts

import { ResearchGPTService } from '@/lib/research-gpt/research-gpt-service';
import { LeadScoringService } from '@/lib/ai/scoring/lead-scoring-service';
import { SignalDetectionService } from '@/lib/ai/signals/signal-detection-service';
import { LLMFactory } from '@/lib/ai/llm-factory';

export interface EnrichmentResult {
  summary: string;
  buyingSignals: string[];
  leadScore: number;
  suggestedActions: string[];
  assignedTo?: string;
  dealStage?: string;
  nextSteps?: string;
}

export class CRMEnrichmentService {
  constructor(
    private researchService: ResearchGPTService,
    private scoringService: LeadScoringService,
    private signalService: SignalDetectionService,
    private llm: LLMFactory
  ) {}

  async enrichContact(contactData: {
    email: string;
    company: string;
    companyId?: string;
  }): Promise<EnrichmentResult> {
    const results: Partial<EnrichmentResult> = {};

    // 1. Research company if we have company ID
    if (contactData.companyId) {
      const research = await this.researchService.generateReport(contactData.companyId);

      // Generate AI summary
      results.summary = await this.generateSummary(research);

      // Extract buying signals
      results.buyingSignals = this.extractSignals(research);
    } else {
      // Basic enrichment without full research
      results.summary = `Contact at ${contactData.company}`;
      results.buyingSignals = [];
    }

    // 2. Score the lead
    if (contactData.companyId) {
      const score = await this.scoringService.scoreCompany(contactData.companyId);
      results.leadScore = score.totalScore;
    } else {
      results.leadScore = 50; // Default mid-range score
    }

    // 3. Determine deal stage based on score and signals
    results.dealStage = this.determineDealStage(
      results.leadScore,
      results.buyingSignals.length
    );

    // 4. Generate suggested actions
    results.suggestedActions = await this.generateActions(
      contactData,
      results.leadScore,
      results.buyingSignals
    );

    // 5. Auto-assign to rep (based on territory/industry)
    results.assignedTo = await this.assignToRep(contactData);

    return results as EnrichmentResult;
  }

  private async generateSummary(research: any): Promise<string> {
    const llm = this.llm.create('gpt-4o-mini');

    const prompt = `Generate a concise 2-3 sentence CRM summary for this company:

Company: ${research.snapshot.name}
Industry: ${research.snapshot.industry}
Employees: ${research.snapshot.employeeCount}
Signals: ${research.signals.map((s: any) => s.signal).join(', ')}

Focus on: What they do, their size/stage, and key opportunities.`;

    const response = await llm.chat([
      { role: 'system', content: 'You are a sales intelligence assistant. Generate concise, actionable CRM summaries.' },
      { role: 'user', content: prompt },
    ]);

    return response.content;
  }

  private extractSignals(research: any): string[] {
    return research.signals
      .filter((s: any) => s.priority === 'high')
      .map((s: any) => s.signal);
  }

  private determineDealStage(score: number, signalCount: number): string {
    if (score >= 80 && signalCount >= 2) return 'qualified';
    if (score >= 60) return 'contacted';
    if (score >= 40) return 'lead';
    return 'prospect';
  }

  private async generateActions(
    contactData: any,
    score: number,
    signals: string[]
  ): Promise<string[]> {
    const actions: string[] = [];

    if (score >= 80) {
      actions.push('Schedule discovery call within 48 hours');
    }

    if (signals.includes('hiring')) {
      actions.push('Mention team scaling in outreach');
    }

    if (signals.includes('funding')) {
      actions.push('Highlight ROI and rapid deployment');
    }

    actions.push(`Research ${contactData.company} on LinkedIn`);
    actions.push('Send personalized email with case study');

    return actions;
  }

  private async assignToRep(contactData: any): Promise<string | undefined> {
    // Implement territory/industry-based assignment logic
    // This could query a `territories` table or use AI to match
    return undefined; // Return CRM user ID
  }
}
```

### 4. SmartSync Orchestrator

```typescript
// lib/integrations/crm/smartsync-orchestrator.ts

import { HubSpotConnector } from './hubspot-connector';
import { SalesforceConnector } from './salesforce-connector';
import { CRMEnrichmentService } from './enrichment-service';
import { createClient } from '@/lib/supabase/server';

export class SmartSyncOrchestrator {
  private connectors: Map<string, BaseCRMConnector> = new Map();

  constructor(
    private enrichmentService: CRMEnrichmentService
  ) {}

  async syncContact(
    integrationId: string,
    contactData: {
      email: string;
      firstName?: string;
      lastName?: string;
      company?: string;
      companyId?: string;
    }
  ): Promise<void> {
    const supabase = await createClient();

    // 1. Load integration config
    const { data: integration } = await supabase
      .from('crm_integrations')
      .select('*')
      .eq('id', integrationId)
      .single();

    if (!integration || !integration.is_active) {
      throw new Error('Integration not found or inactive');
    }

    // 2. Get or create connector
    const connector = await this.getConnector(integration);

    // 3. AI Enrichment (if enabled)
    let enrichment: EnrichmentResult | null = null;
    if (integration.auto_enrich) {
      enrichment = await this.enrichmentService.enrichContact(contactData);
    }

    // 4. Prepare contact payload
    const contactPayload: Contact = {
      email: contactData.email,
      firstName: contactData.firstName,
      lastName: contactData.lastName,
      company: contactData.company,
      customFields: {},
    };

    // Add enrichments to custom fields
    if (enrichment) {
      contactPayload.customFields = {
        oppspot_summary: enrichment.summary,
        oppspot_score: enrichment.leadScore,
        oppspot_signals: enrichment.buyingSignals.join(', '),
        oppspot_next_actions: enrichment.suggestedActions.join('\n'),
      };
    }

    // 5. Apply field mappings
    const mappedPayload = await this.applyFieldMappings(
      integration.id,
      'contact',
      contactPayload
    );

    // 6. Sync to CRM
    try {
      const crmContact = await connector.createContact(mappedPayload);

      // 7. Create associated records (tasks, deals)
      if (enrichment && integration.auto_assign) {
        // Create task
        await connector.createTask({
          title: enrichment.suggestedActions[0],
          description: `Lead score: ${enrichment.leadScore}\nSignals: ${enrichment.buyingSignals.join(', ')}`,
          dueDate: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 hours
          priority: enrichment.leadScore >= 80 ? 'high' : 'medium',
          relatedTo: {
            type: 'contact',
            id: crmContact.id,
          },
        });
      }

      // 8. Log sync
      await supabase.from('crm_sync_logs').insert({
        integration_id: integrationId,
        sync_type: 'contact',
        direction: 'to_crm',
        operation: 'create',
        oppspot_entity_id: contactData.companyId,
        crm_entity_id: crmContact.id,
        payload: contactPayload,
        enrichments: enrichment,
        status: 'success',
        completed_at: new Date().toISOString(),
      });

    } catch (error) {
      // Log error
      await supabase.from('crm_sync_logs').insert({
        integration_id: integrationId,
        sync_type: 'contact',
        direction: 'to_crm',
        operation: 'create',
        payload: contactPayload,
        status: 'failed',
        error_message: error.message,
        completed_at: new Date().toISOString(),
      });

      throw error;
    }
  }

  private async getConnector(integration: any): Promise<BaseCRMConnector> {
    const cacheKey = integration.id;

    if (this.connectors.has(cacheKey)) {
      return this.connectors.get(cacheKey);
    }

    let connector: BaseCRMConnector;

    switch (integration.crm_type) {
      case 'hubspot':
        connector = new HubSpotConnector();
        break;
      case 'salesforce':
        connector = new SalesforceConnector();
        break;
      default:
        throw new Error(`Unsupported CRM type: ${integration.crm_type}`);
    }

    await connector.connect({
      type: integration.crm_type,
      accessToken: integration.access_token,
      refreshToken: integration.refresh_token,
    });

    this.connectors.set(cacheKey, connector);
    return connector;
  }

  private async applyFieldMappings(
    integrationId: string,
    entityType: string,
    payload: any
  ): Promise<any> {
    const supabase = await createClient();

    const { data: mappings } = await supabase
      .from('crm_field_mappings')
      .select('*')
      .eq('integration_id', integrationId);

    if (!mappings || mappings.length === 0) {
      return payload; // No custom mappings
    }

    const mapped: any = {};

    for (const mapping of mappings) {
      const value = payload[mapping.oppspot_field] || payload.customFields?.[mapping.oppspot_field];

      if (value !== undefined) {
        mapped[mapping.crm_field] = value;
      } else if (mapping.default_value) {
        mapped[mapping.crm_field] = mapping.default_value;
      }
    }

    return mapped;
  }
}
```

---

## API Endpoints

### 1. Connect CRM

```typescript
// app/api/integrations/crm/connect/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const ConnectSchema = z.object({
  crm_type: z.enum(['hubspot', 'salesforce', 'pipedrive']),
  access_token: z.string(),
  refresh_token: z.string().optional(),
  instance_url: z.string().optional(), // For Salesforce
  config: z.record(z.any()).optional(),
});

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // Get user's organization
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single();

  // Parse and validate request
  const body = await request.json();
  const validated = ConnectSchema.parse(body);

  // Validate credentials with CRM
  const connector = createConnector(validated.crm_type);
  await connector.connect({
    type: validated.crm_type,
    accessToken: validated.access_token,
    refreshToken: validated.refresh_token,
  });

  const isValid = await connector.validateCredentials();
  if (!isValid) {
    return NextResponse.json(
      { error: 'Invalid CRM credentials' },
      { status: 400 }
    );
  }

  // Store integration
  const { data: integration, error } = await supabase
    .from('crm_integrations')
    .insert({
      organization_id: profile.organization_id,
      crm_type: validated.crm_type,
      access_token: validated.access_token,
      refresh_token: validated.refresh_token,
      config: validated.config || {},
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    integration,
  });
}
```

### 2. Sync Contact

```typescript
// app/api/integrations/crm/sync/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { SmartSyncOrchestrator } from '@/lib/integrations/crm/smartsync-orchestrator';
import { z } from 'zod';

const SyncSchema = z.object({
  integration_id: z.string().uuid(),
  contact: z.object({
    email: z.string().email(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    company: z.string().optional(),
    companyId: z.string().uuid().optional(),
  }),
});

export async function POST(request: NextRequest) {
  const body = await request.json();
  const validated = SyncSchema.parse(body);

  const orchestrator = new SmartSyncOrchestrator(/* inject dependencies */);

  try {
    await orchestrator.syncContact(
      validated.integration_id,
      validated.contact
    );

    return NextResponse.json({
      success: true,
      message: 'Contact synced successfully',
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
```

### 3. Get Field Mappings

```typescript
// app/api/integrations/crm/[id]/fields/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();

  const { data: integration } = await supabase
    .from('crm_integrations')
    .select('*')
    .eq('id', params.id)
    .single();

  if (!integration) {
    return NextResponse.json({ error: 'Integration not found' }, { status: 404 });
  }

  const connector = await createConnector(integration.crm_type);
  await connector.connect({
    type: integration.crm_type,
    accessToken: integration.access_token,
  });

  const fields = await connector.getFields('contact');

  return NextResponse.json({
    fields: fields.map(f => ({
      name: f.name,
      label: f.label,
      type: f.type,
      required: f.required,
    })),
  });
}
```

---

## UI Components

### 1. CRM Connection Setup

```typescript
// app/(dashboard)/settings/integrations/page.tsx

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function IntegrationsPage() {
  const [connecting, setConnecting] = useState(false);

  const connectHubSpot = async () => {
    setConnecting(true);

    // OAuth flow
    const clientId = process.env.NEXT_PUBLIC_HUBSPOT_CLIENT_ID;
    const redirectUri = `${window.location.origin}/api/auth/hubspot/callback`;
    const scope = 'crm.objects.contacts.write crm.objects.companies.write';

    const authUrl = `https://app.hubspot.com/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}`;

    window.location.href = authUrl;
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">CRM Integrations</h1>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <img src="/logos/hubspot.svg" alt="HubSpot" className="w-12 h-12" />
            <div>
              <h3 className="font-semibold">HubSpot</h3>
              <p className="text-sm text-muted-foreground">
                Sync contacts, companies, and deals
              </p>
            </div>
          </div>

          <Button
            onClick={connectHubSpot}
            disabled={connecting}
            className="w-full mt-4"
          >
            {connecting ? 'Connecting...' : 'Connect HubSpot'}
          </Button>
        </Card>

        {/* Similar cards for Salesforce, Pipedrive */}
      </div>
    </div>
  );
}
```

### 2. Field Mapping Configuration

```typescript
// components/integrations/field-mapper.tsx

'use client';

import { useState, useEffect } from 'react';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

export function FieldMapper({ integrationId }: { integrationId: string }) {
  const [oppspotFields, setOppspotFields] = useState([]);
  const [crmFields, setCrmFields] = useState([]);
  const [mappings, setMappings] = useState([]);

  useEffect(() => {
    loadFields();
  }, [integrationId]);

  const loadFields = async () => {
    // Load oppSpot fields (hardcoded schema)
    setOppspotFields([
      { name: 'email', label: 'Email', type: 'string' },
      { name: 'firstName', label: 'First Name', type: 'string' },
      { name: 'lastName', label: 'Last Name', type: 'string' },
      // ...
    ]);

    // Load CRM fields (from API)
    const response = await fetch(`/api/integrations/crm/${integrationId}/fields`);
    const data = await response.json();
    setCrmFields(data.fields);
  };

  const addMapping = () => {
    setMappings([...mappings, { oppspotField: '', crmField: '' }]);
  };

  const saveMapping = async () => {
    await fetch(`/api/integrations/crm/${integrationId}/mappings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mappings }),
    });
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Field Mappings</h3>

      {mappings.map((mapping, index) => (
        <div key={index} className="flex gap-4">
          <Select
            value={mapping.oppspotField}
            onChange={(e) => {
              const newMappings = [...mappings];
              newMappings[index].oppspotField = e.target.value;
              setMappings(newMappings);
            }}
          >
            <option value="">Select oppSpot field</option>
            {oppspotFields.map(f => (
              <option key={f.name} value={f.name}>{f.label}</option>
            ))}
          </Select>

          <span className="flex items-center">→</span>

          <Select
            value={mapping.crmField}
            onChange={(e) => {
              const newMappings = [...mappings];
              newMappings[index].crmField = e.target.value;
              setMappings(newMappings);
            }}
          >
            <option value="">Select CRM field</option>
            {crmFields.map(f => (
              <option key={f.name} value={f.name}>{f.label}</option>
            ))}
          </Select>
        </div>
      ))}

      <div className="flex gap-2">
        <Button onClick={addMapping}>Add Mapping</Button>
        <Button onClick={saveMapping} variant="default">
          Save Mappings
        </Button>
      </div>
    </div>
  );
}
```

---

## Implementation Timeline

### Week 1: Foundation
- [x] Create database schema
- [x] Run migrations
- [ ] Implement base connector interface
- [ ] Set up OAuth flows

### Week 2: HubSpot Integration
- [ ] Implement HubSpot connector
- [ ] Test CRUD operations
- [ ] Build OAuth callback handler
- [ ] Create connection UI

### Week 3: AI Enrichment
- [ ] Implement enrichment service
- [ ] Integrate with ResearchGPT
- [ ] Integrate with scoring service
- [ ] Test enrichment pipeline

### Week 4: Orchestration
- [ ] Implement SmartSync orchestrator
- [ ] Build sync queue system
- [ ] Add retry logic
- [ ] Create sync logs UI

### Week 5: Field Mapping
- [ ] Build field mapping UI
- [ ] Implement mapping engine
- [ ] Test transformations
- [ ] Add validation

### Week 6: Testing & Polish
- [ ] Write E2E tests
- [ ] Load testing
- [ ] Error handling improvements
- [ ] Documentation

### Week 7-8: Salesforce Integration
- [ ] Implement Salesforce connector
- [ ] Test OAuth flow
- [ ] Handle Salesforce quirks
- [ ] Update UI for multi-CRM

---

## Success Metrics

- **Sync Success Rate**: >99% (excluding CRM API failures)
- **Sync Latency**: <5 seconds (90th percentile)
- **Enrichment Quality**: >90% customer satisfaction
- **Time Saved**: 10+ hours/week per user
- **CRM Data Quality**: 2x improvement in completeness

---

## Next Steps

1. ✅ Review this implementation plan
2. ✅ Get approval on architecture
3. ⏳ Begin Week 1 tasks (database schema)
4. ⏳ Set up HubSpot developer account
5. ⏳ Create Salesforce sandbox environment

---

**Last Updated**: 2025-10-02
**Status**: Ready for Implementation
**Estimated Completion**: 8 weeks
