// SmartSync™ - Orchestrator
// Coordinates CRM sync operations with AI enrichment

import { createClient } from '@/lib/supabase/server';
import { HubSpotConnector } from './hubspot-connector';
import { BaseCRMConnector } from './base-connector';
import { CRMEnrichmentService } from './enrichment-service';
import type { Row } from '@/lib/supabase/helpers'
import {
  CRMIntegration,
  Contact,
  Company,
  Deal,
  Task,
  EntityMapping,
  SyncLog,
  EnrichmentResult,
  CRMIntegrationError,
} from './types';

// =====================================================
// SmartSync Orchestrator
// =====================================================

export class SmartSyncOrchestrator {
  private connectors: Map<string, BaseCRMConnector> = new Map();
  private enrichmentService: CRMEnrichmentService;

  constructor() {
    this.enrichmentService = new CRMEnrichmentService();
  }

  // =====================================================
  // Contact Sync
  // =====================================================

  /**
   * Sync contact to CRM with AI enrichment
   */
  async syncContact(
    integrationId: string,
    contactData: {
      email: string;
      firstName?: string;
      lastName?: string;
      company?: string;
      companyId?: string;
      phone?: string;
      title?: string;
    },
    options: {
      skipEnrichment?: boolean;
      priority?: number;
    } = {}
  ): Promise<{ success: boolean; crmContactId?: string; error?: string }> {
    const supabase = await createClient();
    const startTime = Date.now();

    try {
      // 1. Load integration config
      const { data: integration, error: integrationError } = await supabase
        .from('crm_integrations')
        .select('*')
        .eq('id', integrationId)
        .single() as { data: (Row<'crm_integrations'> & { is_active?: boolean; auto_enrich?: boolean; auto_create_tasks?: boolean }) | null; error: any };

      if (integrationError || !integration || !integration.is_active) {
        throw new CRMIntegrationError('Integration not found or inactive');
      }

      // 2. Get or create connector
      const connector = await this.getConnector(integration);

      // 3. AI Enrichment (if enabled and not skipped)
      let enrichment: EnrichmentResult | null = null;
      const enrichmentStartTime = Date.now();

      if (integration.auto_enrich && !options.skipEnrichment) {
        const { data: { user } } = await supabase.auth.getUser();
        const { data: profile } = await supabase
          .from('profiles')
          .select('organization_id')
          .eq('id', user?.id || '')
          .single() as { data: (Row<'profiles'> & { organization_id?: string }) | null; error: any };

        enrichment = await this.enrichmentService.enrichContact({
          ...contactData,
          organizationId: profile?.organization_id || '',
        });
      }

      const enrichmentTime = Date.now() - enrichmentStartTime;

      // 4. Prepare contact payload
      const contactPayload: Contact = {
        email: contactData.email,
        firstName: contactData.firstName,
        lastName: contactData.lastName,
        company: contactData.company,
        phone: contactData.phone,
        title: contactData.title,
        customFields: {},
      };

      // Add enrichments to custom fields (if available)
      if (enrichment && integration.auto_enrich) {
        contactPayload.customFields = {
          oppspot_summary: enrichment.summary,
          oppspot_score: enrichment.leadScore.toString(),
          oppspot_signals: enrichment.buyingSignals.join(', '),
          oppspot_next_actions: enrichment.suggestedActions.join('\n'),
          oppspot_deal_stage: enrichment.dealStage,
          ...contactPayload.customFields,
        };

        // Add score breakdown if available
        if (enrichment.scoreBreakdown) {
          contactPayload.customFields.oppspot_score_financial = enrichment.scoreBreakdown.financial.toString();
          contactPayload.customFields.oppspot_score_growth = enrichment.scoreBreakdown.growth.toString();
          contactPayload.customFields.oppspot_score_engagement = enrichment.scoreBreakdown.engagement.toString();
          contactPayload.customFields.oppspot_score_fit = enrichment.scoreBreakdown.fit.toString();
        }
      }

      // 5. Apply field mappings
      const mappedPayload = await this.applyFieldMappings(
        integrationId,
        'contact',
        contactPayload
      );

      // 6. Check if contact already exists in CRM
      const existingMapping = await this.getEntityMapping(
        integrationId,
        contactData.companyId || '',
        'contact'
      );

      let crmContact;

      if (existingMapping) {
        // Update existing contact
        crmContact = await connector.updateContact(existingMapping.crmEntityId, mappedPayload);

        // Update mapping
        await this.updateEntityMapping(existingMapping.id);
      } else {
        // Create new contact
        crmContact = await connector.createContact(mappedPayload);

        // Create mapping
        await this.createEntityMapping(
          integrationId,
          contactData.companyId || '',
          'contact',
          crmContact.id,
          'contact'
        );
      }

      // 7. Create associated records (tasks, deals) if auto-create is enabled
      if (enrichment && integration.auto_create_tasks && enrichment.suggestedActions.length > 0) {
        await this.createFollowUpTask(
          connector,
          crmContact.id,
          enrichment
        );
      }

      // 8. Create deal if lead score is high enough
      if (enrichment && integration.auto_enrich && enrichment.leadScore >= 70) {
        await this.createDealFromContact(
          connector,
          crmContact.id,
          contactData,
          enrichment
        );
      }

      // 9. Log successful sync
      await this.logSync(
        integrationId,
        {
          syncType: 'contact',
          direction: 'to_crm',
          operation: existingMapping ? 'update' : 'create',
          oppspotEntityId: contactData.companyId,
          oppspotEntityType: 'business',
          crmEntityId: crmContact.id,
          payload: contactPayload,
          enrichments: enrichment,
          enrichmentTimeMs: enrichmentTime,
          status: 'success',
          durationMs: Date.now() - startTime,
        }
      );

      return {
        success: true,
        crmContactId: crmContact.id,
      };
    } catch (error: any) {
      // Log failed sync
      await this.logSync(
        integrationId,
        {
          syncType: 'contact',
          direction: 'to_crm',
          operation: 'create',
          payload: contactData,
          status: 'failed',
          errorMessage: error.message,
          errorCode: error.code,
          durationMs: Date.now() - startTime,
        }
      );

      console.error('SmartSync error:', error);

      return {
        success: false,
        error: error.message,
      };
    }
  }

  // =====================================================
  // Company Sync
  // =====================================================

  /**
   * Sync company to CRM
   */
  async syncCompany(
    integrationId: string,
    companyData: Company & { companyId: string }
  ): Promise<{ success: boolean; crmCompanyId?: string; error?: string }> {
    const supabase = await createClient();
    const startTime = Date.now();

    try {
      const { data: integration } = await supabase
        .from('crm_integrations')
        .select('*')
        .eq('id', integrationId)
        .single() as { data: (Row<'crm_integrations'> & { is_active?: boolean; auto_enrich?: boolean; auto_create_tasks?: boolean }) | null; error: any };

      if (!integration || !integration.is_active) {
        throw new CRMIntegrationError('Integration not found or inactive');
      }

      const connector = await this.getConnector(integration);

      // Check for existing mapping
      const existingMapping = await this.getEntityMapping(
        integrationId,
        companyData.companyId,
        'company'
      );

      let crmCompany;

      if (existingMapping) {
        crmCompany = await connector.updateCompany(existingMapping.crmEntityId, companyData);
        await this.updateEntityMapping(existingMapping.id);
      } else {
        crmCompany = await connector.createCompany(companyData);
        await this.createEntityMapping(
          integrationId,
          companyData.companyId,
          'business',
          crmCompany.id,
          'company'
        );
      }

      await this.logSync(integrationId, {
        syncType: 'company',
        direction: 'to_crm',
        operation: existingMapping ? 'update' : 'create',
        oppspotEntityId: companyData.companyId,
        oppspotEntityType: 'business',
        crmEntityId: crmCompany.id,
        payload: companyData,
        status: 'success',
        durationMs: Date.now() - startTime,
      });

      return {
        success: true,
        crmCompanyId: crmCompany.id,
      };
    } catch (error: any) {
      await this.logSync(integrationId, {
        syncType: 'company',
        direction: 'to_crm',
        operation: 'create',
        payload: companyData,
        status: 'failed',
        errorMessage: error.message,
        durationMs: Date.now() - startTime,
      });

      return {
        success: false,
        error: error.message,
      };
    }
  }

  // =====================================================
  // Helper Methods
  // =====================================================

  /**
   * Get or create CRM connector
   */
  private async getConnector(integration: any): Promise<BaseCRMConnector> {
    const cacheKey = integration.id;

    if (this.connectors.has(cacheKey)) {
      return this.connectors.get(cacheKey)!;
    }

    let connector: BaseCRMConnector;

    switch (integration.crm_type) {
      case 'hubspot':
        connector = new HubSpotConnector();
        break;
      // case 'salesforce':
      //   connector = new SalesforceConnector();
      //   break;
      default:
        throw new CRMIntegrationError(`Unsupported CRM type: ${integration.crm_type}`);
    }

    await connector.connect({
      type: integration.crm_type,
      accessToken: integration.access_token,
      refreshToken: integration.refresh_token,
      clientId: process.env.HUBSPOT_CLIENT_ID,
      clientSecret: process.env.HUBSPOT_CLIENT_SECRET,
    });

    this.connectors.set(cacheKey, connector);
    return connector;
  }

  /**
   * Apply field mappings to payload
   */
  private async applyFieldMappings(
    integrationId: string,
    entityType: string,
    payload: any
  ): Promise<any> {
    const supabase = await createClient();

    const { data: mappings } = await supabase
      .from('crm_field_mappings')
      .select('*')
      .eq('integration_id', integrationId)
      .eq('entity_type', entityType)
      .eq('is_active', true) as { data: Row<'crm_field_mappings'>[] | null; error: any };

    if (!mappings || mappings.length === 0) {
      return payload; // No custom mappings
    }

    const mapped: any = { ...payload };

    for (const mapping of mappings) {
      const value = payload[(mapping as any).oppspot_field] || payload.customFields?.[(mapping as any).oppspot_field];

      if (value !== undefined && value !== null) {
        // Apply transformation if specified
        if ((mapping as any).transform_function) {
          try {
            // TODO: Implement safe function execution
            mapped[(mapping as any).crm_field] = value;
          } catch (error) {
            console.error('Transform error:', error);
            mapped[(mapping as any).crm_field] = value;
          }
        } else {
          mapped[(mapping as any).crm_field] = value;
        }
      } else if ((mapping as any).default_value) {
        mapped[(mapping as any).crm_field] = (mapping as any).default_value;
      }
    }

    return mapped;
  }

  /**
   * Create follow-up task in CRM
   */
  private async createFollowUpTask(
    connector: BaseCRMConnector,
    contactId: string,
    enrichment: EnrichmentResult
  ): Promise<void> {
    try {
      const task: Task = {
        title: enrichment.suggestedActions[0],
        description: `Lead Score: ${enrichment.leadScore}/100\n\nBuying Signals:\n${enrichment.buyingSignals.join('\n')}\n\nNext Steps:\n${enrichment.nextSteps}`,
        dueDate: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 hours
        priority: enrichment.leadScore >= 80 ? 'high' : enrichment.leadScore >= 60 ? 'medium' : 'low',
        relatedTo: {
          type: 'contact',
          id: contactId,
        },
      };

      if (enrichment.assignedTo) {
        task.assignedTo = enrichment.assignedTo;
      }

      await connector.createTask(task);
    } catch (error) {
      console.error('Failed to create follow-up task:', error);
      // Don't throw - task creation is optional
    }
  }

  /**
   * Create deal from high-scoring contact
   */
  private async createDealFromContact(
    connector: BaseCRMConnector,
    contactId: string,
    contactData: any,
    enrichment: EnrichmentResult
  ): Promise<void> {
    try {
      const deal: Deal = {
        name: `${contactData.company || 'New Opportunity'} - ${contactData.firstName} ${contactData.lastName}`,
        stage: enrichment.dealStage || 'qualified',
        contactId,
        description: enrichment.summary,
        customFields: {
          oppspot_score: enrichment.leadScore,
          oppspot_signals: enrichment.buyingSignals.join(', '),
        },
      };

      await connector.createDeal(deal);
    } catch (error) {
      console.error('Failed to create deal:', error);
      // Don't throw - deal creation is optional
    }
  }

  /**
   * Get entity mapping
   */
  private async getEntityMapping(
    integrationId: string,
    oppspotEntityId: string,
    entityType: string
  ): Promise<EntityMapping | null> {
    const supabase = await createClient();

    const { data } = await supabase
      .from('crm_entity_mappings')
      .select('*')
      .eq('integration_id', integrationId)
      .eq('oppspot_entity_id', oppspotEntityId)
      .eq('oppspot_entity_type', entityType === 'contact' ? 'contact' : 'business')
      .eq('is_active', true)
      .single() as { data: Row<'crm_entity_mappings'> | null; error: any };

    return data;
  }

  /**
   * Create entity mapping
   */
  private async createEntityMapping(
    integrationId: string,
    oppspotEntityId: string,
    oppspotEntityType: string,
    crmEntityId: string,
    crmEntityType: string
  ): Promise<void> {
    const supabase = await createClient();

    // @ts-ignore - Supabase type inference issue
    await supabase.from('crm_entity_mappings').insert({
      integration_id: integrationId,
      oppspot_entity_id: oppspotEntityId,
      oppspot_entity_type: oppspotEntityType,
      crm_entity_id: crmEntityId,
      crm_entity_type: crmEntityType,
      last_synced_at: new Date().toISOString(),
      sync_count: 1,
      is_active: true,
    });
  }

  /**
   * Update entity mapping
   */
  private async updateEntityMapping(mappingId: string): Promise<void> {
    const supabase = await createClient();

    await supabase
      .from('crm_entity_mappings')
      // @ts-ignore - Type inference issue
      .update({
        last_synced_at: new Date().toISOString(),
        sync_count: supabase.rpc('increment', { row_id: mappingId }),
        updated_at: new Date().toISOString(),
      })
      .eq('id', mappingId);
  }

  /**
   * Log sync operation
   */
  private async logSync(
    integrationId: string,
    logData: Partial<SyncLog>
  ): Promise<void> {
    const supabase = await createClient();
// @ts-ignore - Supabase type inference issue

    await supabase.from('crm_sync_logs').insert({
      integration_id: integrationId,
      sync_type: logData.syncType,
      direction: logData.direction,
      operation: logData.operation,
      oppspot_entity_id: logData.oppspotEntityId,
      oppspot_entity_type: logData.oppspotEntityType,
      crm_entity_id: logData.crmEntityId,
      payload: logData.payload,
      enrichments: logData.enrichments,
      enrichment_time_ms: logData.enrichmentTimeMs,
      status: logData.status,
      error_message: logData.errorMessage,
      error_code: logData.errorCode,
      retry_count: logData.retryCount || 0,
      completed_at: new Date().toISOString(),
      duration_ms: logData.durationMs,
    });
  }
}

// =====================================================
// Singleton Instance
// =====================================================

let orchestratorInstance: SmartSyncOrchestrator | null = null;

export function getSmartSyncOrchestrator(): SmartSyncOrchestrator {
  if (!orchestratorInstance) {
    orchestratorInstance = new SmartSyncOrchestrator();
  }
  return orchestratorInstance;
}
