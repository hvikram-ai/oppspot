// SmartSync™ - CRM Integration Types
// Type definitions for CRM connectors and entities

export type CRMType = 'hubspot' | 'salesforce' | 'pipedrive';

export type SyncDirection = 'to_crm' | 'from_crm' | 'bidirectional';

export type SyncFrequency = 'realtime' | 'hourly' | 'daily' | 'manual';

export type EntityType = 'contact' | 'company' | 'deal' | 'task' | 'note';

export type SyncStatus = 'pending' | 'processing' | 'success' | 'failed' | 'skipped';

export type QueueStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';

// =====================================================
// CRM Credentials
// =====================================================

export interface CRMCredentials {
  type: CRMType;
  accessToken: string;
  refreshToken?: string;
  tokenExpiresAt?: Date;
  instanceUrl?: string; // For Salesforce
  clientId?: string;
  clientSecret?: string;
}

// =====================================================
// CRM Integration Config
// =====================================================

export interface CRMIntegration {
  id: string;
  organizationId: string;
  crmType: CRMType;
  accessToken: string;
  refreshToken?: string;
  tokenExpiresAt?: Date;
  instanceUrl?: string;
  config: Record<string, unknown>;
  fieldMappings: Record<string, unknown>;
  syncDirection: SyncDirection;
  syncFrequency: SyncFrequency;
  autoEnrich: boolean;
  autoScore: boolean;
  autoAssign: boolean;
  autoCreateTasks: boolean;
  isActive: boolean;
  lastSyncAt?: Date;
  lastError?: string;
  syncCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// =====================================================
// Entity Definitions
// =====================================================

export interface Contact {
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  mobilePhone?: string;
  company?: string;
  title?: string;
  department?: string;
  linkedinUrl?: string;
  website?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  customFields?: Record<string, unknown>;
}

export interface Company {
  name: string;
  domain?: string;
  industry?: string;
  employeeCount?: number;
  revenue?: number;
  description?: string;
  website?: string;
  phone?: string;
  foundedYear?: number;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  socialMedia?: {
    linkedin?: string;
    twitter?: string;
    facebook?: string;
  };
  customFields?: Record<string, unknown>;
}

export interface Deal {
  name: string;
  amount?: number;
  currency?: string;
  stage?: string;
  closeDate?: Date;
  probability?: number;
  contactId?: string;
  companyId?: string;
  ownerId?: string;
  description?: string;
  customFields?: Record<string, unknown>;
}

export interface Task {
  title: string;
  description?: string;
  dueDate?: Date;
  assignedTo?: string;
  priority?: 'low' | 'medium' | 'high';
  status?: 'todo' | 'in_progress' | 'done';
  relatedTo?: {
    type: 'contact' | 'company' | 'deal';
    id: string;
  };
  customFields?: Record<string, unknown>;
}

export interface Note {
  body: string;
  createdBy?: string;
  relatedTo?: {
    type: 'contact' | 'company' | 'deal';
    id: string;
  };
}

// =====================================================
// CRM Response Types
// =====================================================

export interface CRMContact {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  properties?: Record<string, unknown>;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CRMCompany {
  id: string;
  name: string;
  domain?: string;
  properties?: Record<string, unknown>;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CRMDeal {
  id: string;
  name: string;
  amount?: number;
  stage?: string;
  properties?: Record<string, unknown>;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CRMTask {
  id: string;
  title: string;
  dueDate?: Date;
  properties?: Record<string, unknown>;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CRMNote {
  id: string;
  body: string;
  createdAt?: Date;
}

// =====================================================
// Field Definitions
// =====================================================

export interface CRMField {
  name: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'enum' | 'object' | 'array';
  description?: string;
  required?: boolean;
  options?: Array<{ label: string; value: string }>; // For enum fields
  hidden?: boolean;
  readOnly?: boolean;
  groupName?: string;
}

export interface FieldMapping {
  id: string;
  integrationId: string;
  entityType: EntityType;
  oppspotField: string;
  crmField: string;
  fieldType: 'standard' | 'custom' | 'computed';
  transformFunction?: string;
  defaultValue?: string;
  isRequired: boolean;
  syncDirection: SyncDirection;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// =====================================================
// Sync Log
// =====================================================

export interface SyncLog {
  id: string;
  integrationId: string;
  syncType: EntityType;
  direction: SyncDirection;
  operation: 'create' | 'update' | 'delete' | 'skip';
  oppspotEntityId?: string;
  oppspotEntityType?: string;
  crmEntityId?: string;
  payload?: Record<string, unknown>;
  enrichments?: EnrichmentResult;
  enrichmentTimeMs?: number;
  status: SyncStatus;
  errorMessage?: string;
  errorCode?: string;
  retryCount: number;
  maxRetries: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  durationMs?: number;
}

// =====================================================
// Sync Queue
// =====================================================

export interface SyncJob {
  id: string;
  integrationId: string;
  jobType: 'sync_contact' | 'sync_company' | 'sync_deal' | 'enrich_and_sync' | 'bulk_sync';
  priority: number; // 1-10
  payload: Record<string, unknown>;
  status: QueueStatus;
  attempts: number;
  maxAttempts: number;
  errorMessage?: string;
  result?: Record<string, unknown>;
  scheduledFor: Date;
  startedAt?: Date;
  completedAt?: Date;
  processingTimeMs?: number;
  createdAt: Date;
  updatedAt: Date;
}

// =====================================================
// Entity Mapping
// =====================================================

export interface EntityMapping {
  id: string;
  integrationId: string;
  oppspotEntityId: string;
  oppspotEntityType: 'business' | 'contact' | 'deal' | 'task';
  crmEntityId: string;
  crmEntityType: string;
  lastSyncedAt: Date;
  syncCount: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// =====================================================
// AI Enrichment Types
// =====================================================

export interface EnrichmentResult {
  summary: string;
  buyingSignals: string[];
  leadScore: number;
  scoreBreakdown?: {
    financial: number;
    growth: number;
    engagement: number;
    fit: number;
  };
  suggestedActions: string[];
  assignedTo?: string;
  dealStage?: string;
  nextSteps?: string;
  competitors?: string[];
  painPoints?: string[];
  recommendations?: string;
}

// =====================================================
// Webhook Types
// =====================================================

export interface WebhookConfig {
  url: string;
  events: string[];
  secret?: string;
}

export interface WebhookPayload {
  event: string;
  objectType: EntityType;
  objectId: string;
  occurredAt: Date;
  data: Record<string, unknown>;
}

// =====================================================
// Error Types
// =====================================================

export class CRMIntegrationError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number,
    public details?: unknown
  ) {
    super(message);
    this.name = 'CRMIntegrationError';
  }
}

export class CRMAuthenticationError extends CRMIntegrationError {
  constructor(message: string, details?: unknown) {
    super(message, 'AUTH_ERROR', 401, details);
    this.name = 'CRMAuthenticationError';
  }
}

export class CRMRateLimitError extends CRMIntegrationError {
  constructor(
    message: string,
    public retryAfter?: number,
    details?: unknown
  ) {
    super(message, 'RATE_LIMIT', 429, details);
    this.name = 'CRMRateLimitError';
  }
}

export class CRMValidationError extends CRMIntegrationError {
  constructor(message: string, public fields?: string[], details?: unknown) {
    super(message, 'VALIDATION_ERROR', 400, details);
    this.name = 'CRMValidationError';
  }
}
