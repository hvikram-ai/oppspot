// SmartSync™ - Base CRM Connector
// Abstract base class for all CRM integrations

import axios, { AxiosInstance, AxiosError } from 'axios';
import {
  CRMCredentials,
  Contact,
  Company,
  Deal,
  Task,
  Note,
  CRMContact,
  CRMCompany,
  CRMDeal,
  CRMTask,
  CRMNote,
  CRMField,
  WebhookConfig,
  CRMIntegrationError,
  CRMAuthenticationError,
  CRMRateLimitError,
  CRMValidationError,
} from './types';

// =====================================================
// CRM Connector Interface
// =====================================================

export interface ICRMConnector {
  // Authentication
  connect(credentials: CRMCredentials): Promise<void>;
  disconnect(): Promise<void>;
  refreshToken(): Promise<string>;
  validateCredentials(): Promise<boolean>;

  // Contact Operations
  createContact(contact: Contact): Promise<CRMContact>;
  updateContact(id: string, contact: Partial<Contact>): Promise<CRMContact>;
  getContact(id: string): Promise<CRMContact>;
  deleteContact(id: string): Promise<void>;
  searchContacts(query: string): Promise<CRMContact[]>;

  // Company Operations
  createCompany(company: Company): Promise<CRMCompany>;
  updateCompany(id: string, company: Partial<Company>): Promise<CRMCompany>;
  getCompany(id: string): Promise<CRMCompany>;
  deleteCompany(id: string): Promise<void>;
  searchCompanies(query: string): Promise<CRMCompany[]>;

  // Deal Operations
  createDeal(deal: Deal): Promise<CRMDeal>;
  updateDeal(id: string, deal: Partial<Deal>): Promise<CRMDeal>;
  getDeal(id: string): Promise<CRMDeal>;
  deleteDeal(id: string): Promise<void>;

  // Task Operations
  createTask(task: Task): Promise<CRMTask>;
  updateTask(id: string, task: Partial<Task>): Promise<CRMTask>;
  getTask(id: string): Promise<CRMTask>;
  deleteTask(id: string): Promise<void>;

  // Note Operations
  createNote(note: Note): Promise<CRMNote>;

  // Field Discovery
  getFields(entityType: 'contact' | 'company' | 'deal' | 'task'): Promise<CRMField[]>;

  // Webhooks
  setupWebhook(config: WebhookConfig): Promise<void>;
  deleteWebhook(webhookId: string): Promise<void>;

  // Utilities
  getApiVersion(): string;
  getRateLimitStatus(): Promise<{ remaining: number; limit: number; resetAt: Date }>;
}

// =====================================================
// Base Connector Implementation
// =====================================================

export abstract class BaseCRMConnector implements ICRMConnector {
  protected credentials: CRMCredentials | null = null;
  protected httpClient: AxiosInstance | null = null;
  protected baseUrl: string = '';

  constructor(protected readonly crmType: string) {}

  // =====================================================
  // Abstract Methods (Must be implemented by subclasses)
  // =====================================================

  abstract connect(credentials: CRMCredentials): Promise<void>;
  abstract refreshToken(): Promise<string>;
  abstract getApiVersion(): string;

  // =====================================================
  // Common Implementations
  // =====================================================

  async disconnect(): Promise<void> {
    this.httpClient = null;
    this.credentials = null;
  }

  async validateCredentials(): Promise<boolean> {
    if (!this.httpClient) {
      return false;
    }

    try {
      await this.testConnection();
      return true;
    } catch (error) {
      return false;
    }
  }

  // Test connection (each connector should override with appropriate endpoint)
  protected async testConnection(): Promise<void> {
    throw new Error('testConnection must be implemented by subclass');
  }

  // =====================================================
  // HTTP Client Helpers
  // =====================================================

  protected createHttpClient(baseURL: string, accessToken: string): AxiosInstance {
    return axios.create({
      baseURL,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000, // 30 seconds
    });
  }

  protected async handleAPIError(error: unknown): Promise<never> {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      const status = axiosError.response?.status;
      const data = axiosError.response?.data as { message?: string; code?: string; fields?: unknown } | undefined;

      // Authentication errors
      if (status === 401 || status === 403) {
        throw new CRMAuthenticationError(
          data?.message || 'Authentication failed',
          data
        );
      }

      // Rate limiting
      if (status === 429) {
        const retryAfter = axiosError.response?.headers['retry-after'];
        throw new CRMRateLimitError(
          'Rate limit exceeded',
          retryAfter ? parseInt(retryAfter) : undefined,
          data
        );
      }

      // Validation errors
      if (status === 400) {
        throw new CRMValidationError(
          data?.message || 'Validation failed',
          data?.fields,
          data
        );
      }

      // Generic error
      throw new CRMIntegrationError(
        data?.message || axiosError.message,
        data?.code || 'API_ERROR',
        status,
        data
      );
    }

    // Non-Axios error
    throw new CRMIntegrationError(
      (error as Error).message || 'Unknown error',
      'UNKNOWN_ERROR',
      500,
      error
    );
  }

  // =====================================================
  // Rate Limit Handling
  // =====================================================

  async getRateLimitStatus(): Promise<{ remaining: number; limit: number; resetAt: Date }> {
    // Default implementation - override in subclasses
    return {
      remaining: 1000,
      limit: 10000,
      resetAt: new Date(Date.now() + 3600000), // 1 hour from now
    };
  }

  // =====================================================
  // Default Implementations (Can be overridden)
  // =====================================================

  async createContact(_contact: Contact): Promise<CRMContact> {
    throw new Error('createContact not implemented');
  }

  async updateContact(_id: string, _contact: Partial<Contact>): Promise<CRMContact> {
    throw new Error('updateContact not implemented');
  }

  async getContact(_id: string): Promise<CRMContact> {
    throw new Error('getContact not implemented');
  }

  async deleteContact(_id: string): Promise<void> {
    throw new Error('deleteContact not implemented');
  }

  async searchContacts(_query: string): Promise<CRMContact[]> {
    throw new Error('searchContacts not implemented');
  }

  async createCompany(_company: Company): Promise<CRMCompany> {
    throw new Error('createCompany not implemented');
  }

  async updateCompany(_id: string, _company: Partial<Company>): Promise<CRMCompany> {
    throw new Error('updateCompany not implemented');
  }

  async getCompany(_id: string): Promise<CRMCompany> {
    throw new Error('getCompany not implemented');
  }

  async deleteCompany(_id: string): Promise<void> {
    throw new Error('deleteCompany not implemented');
  }

  async searchCompanies(_query: string): Promise<CRMCompany[]> {
    throw new Error('searchCompanies not implemented');
  }

  async createDeal(_deal: Deal): Promise<CRMDeal> {
    throw new Error('createDeal not implemented');
  }

  async updateDeal(_id: string, _deal: Partial<Deal>): Promise<CRMDeal> {
    throw new Error('updateDeal not implemented');
  }

  async getDeal(_id: string): Promise<CRMDeal> {
    throw new Error('getDeal not implemented');
  }

  async deleteDeal(_id: string): Promise<void> {
    throw new Error('deleteDeal not implemented');
  }

  async createTask(_task: Task): Promise<CRMTask> {
    throw new Error('createTask not implemented');
  }

  async updateTask(_id: string, _task: Partial<Task>): Promise<CRMTask> {
    throw new Error('updateTask not implemented');
  }

  async getTask(_id: string): Promise<CRMTask> {
    throw new Error('getTask not implemented');
  }

  async deleteTask(_id: string): Promise<void> {
    throw new Error('deleteTask not implemented');
  }

  async createNote(_note: Note): Promise<CRMNote> {
    throw new Error('createNote not implemented');
  }

  async getFields(_entityType: 'contact' | 'company' | 'deal' | 'task'): Promise<CRMField[]> {
    throw new Error('getFields not implemented');
  }

  async setupWebhook(_config: WebhookConfig): Promise<void> {
    throw new Error('setupWebhook not implemented');
  }

  async deleteWebhook(_webhookId: string): Promise<void> {
    throw new Error('deleteWebhook not implemented');
  }

  // =====================================================
  // Utility Methods
  // =====================================================

  protected ensureConnected(): void {
    if (!this.httpClient || !this.credentials) {
      throw new CRMIntegrationError(
        'Not connected to CRM. Call connect() first.',
        'NOT_CONNECTED'
      );
    }
  }

  protected async retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    initialDelay: number = 1000
  ): Promise<T> {
    let lastError: unknown;

    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;

        // Don't retry authentication errors
        if (error instanceof CRMAuthenticationError) {
          throw error;
        }

        // Don't retry validation errors
        if (error instanceof CRMValidationError) {
          throw error;
        }

        // For rate limits, respect retry-after
        if (error instanceof CRMRateLimitError && error.retryAfter) {
          await this.delay(error.retryAfter * 1000);
          continue;
        }

        // Exponential backoff
        const delay = initialDelay * Math.pow(2, i);
        await this.delay(delay);
      }
    }

    throw lastError;
  }

  protected delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // =====================================================
  // Logging (Override for custom logging)
  // =====================================================

  protected log(level: 'info' | 'warn' | 'error', message: string, data?: unknown): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${this.crmType.toUpperCase()}] [${level.toUpperCase()}] ${message}`;

    if (data) {
      console[level](logMessage, data);
    } else {
      console[level](logMessage);
    }
  }
}

// =====================================================
// Connector Factory
// =====================================================

export class CRMConnectorFactory {
  private static connectors: Map<string, new () => BaseCRMConnector> = new Map();

  static register(crmType: string, connectorClass: new () => BaseCRMConnector): void {
    this.connectors.set(crmType, connectorClass);
  }

  static create(crmType: string): BaseCRMConnector {
    const ConnectorClass = this.connectors.get(crmType);

    if (!ConnectorClass) {
      throw new CRMIntegrationError(
        `No connector registered for CRM type: ${crmType}`,
        'CONNECTOR_NOT_FOUND'
      );
    }

    return new ConnectorClass();
  }

  static getSupportedCRMs(): string[] {
    return Array.from(this.connectors.keys());
  }
}
