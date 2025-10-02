// SmartSync™ - Main Export
// Central export point for all CRM integration functionality

// Types
export * from './types';

// Base Connector
export { BaseCRMConnector, ICRMConnector, CRMConnectorFactory } from './base-connector';

// Connectors
export { HubSpotConnector } from './hubspot-connector';

// Services
export { CRMEnrichmentService, getEnrichmentService } from './enrichment-service';
export { SmartSyncOrchestrator, getSmartSyncOrchestrator } from './smartsync-orchestrator';

// Register connectors
import { CRMConnectorFactory } from './base-connector';
import { HubSpotConnector } from './hubspot-connector';

CRMConnectorFactory.register('hubspot', HubSpotConnector);
// CRMConnectorFactory.register('salesforce', SalesforceConnector);
// CRMConnectorFactory.register('pipedrive', PipedriveConnector);
