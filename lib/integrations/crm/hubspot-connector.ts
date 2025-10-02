// SmartSync™ - HubSpot Connector
// Implementation of HubSpot CRM integration

import { BaseCRMConnector } from './base-connector';
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
} from './types';

export class HubSpotConnector extends BaseCRMConnector {
  private readonly baseUrl = 'https://api.hubapi.com';
  private readonly apiVersion = 'v3';

  constructor() {
    super('hubspot');
  }

  // =====================================================
  // Authentication
  // =====================================================

  async connect(credentials: CRMCredentials): Promise<void> {
    this.credentials = credentials;
    this.httpClient = this.createHttpClient(this.baseUrl, credentials.accessToken);

    // Validate connection
    const isValid = await this.validateCredentials();
    if (!isValid) {
      throw new Error('Invalid HubSpot credentials');
    }

    this.log('info', 'Successfully connected to HubSpot');
  }

  async refreshToken(): Promise<string> {
    if (!this.credentials?.refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await this.httpClient!.post('/oauth/v1/token', {
        grant_type: 'refresh_token',
        refresh_token: this.credentials.refreshToken,
        client_id: this.credentials.clientId,
        client_secret: this.credentials.clientSecret,
      });

      const newAccessToken = response.data.access_token;
      const newRefreshToken = response.data.refresh_token;

      // Update credentials
      this.credentials.accessToken = newAccessToken;
      this.credentials.refreshToken = newRefreshToken;

      // Recreate HTTP client with new token
      this.httpClient = this.createHttpClient(this.baseUrl, newAccessToken);

      this.log('info', 'Successfully refreshed HubSpot token');
      return newAccessToken;
    } catch (error) {
      this.log('error', 'Failed to refresh token', error);
      throw await this.handleAPIError(error);
    }
  }

  protected async testConnection(): Promise<void> {
    try {
      await this.httpClient!.get('/oauth/v1/access-tokens/' + this.credentials!.accessToken);
    } catch (error) {
      throw await this.handleAPIError(error);
    }
  }

  getApiVersion(): string {
    return this.apiVersion;
  }

  // =====================================================
  // Contact Operations
  // =====================================================

  async createContact(contact: Contact): Promise<CRMContact> {
    this.ensureConnected();

    try {
      const properties = this.mapContactToHubSpot(contact);

      const response = await this.httpClient!.post('/crm/v3/objects/contacts', {
        properties,
      });

      this.log('info', 'Created HubSpot contact', { id: response.data.id });
      return this.mapHubSpotToContact(response.data);
    } catch (error) {
      this.log('error', 'Failed to create contact', error);
      throw await this.handleAPIError(error);
    }
  }

  async updateContact(id: string, contact: Partial<Contact>): Promise<CRMContact> {
    this.ensureConnected();

    try {
      const properties = this.mapContactToHubSpot(contact);

      const response = await this.httpClient!.patch(`/crm/v3/objects/contacts/${id}`, {
        properties,
      });

      this.log('info', 'Updated HubSpot contact', { id });
      return this.mapHubSpotToContact(response.data);
    } catch (error) {
      this.log('error', 'Failed to update contact', error);
      throw await this.handleAPIError(error);
    }
  }

  async getContact(id: string): Promise<CRMContact> {
    this.ensureConnected();

    try {
      const response = await this.httpClient!.get(`/crm/v3/objects/contacts/${id}`);
      return this.mapHubSpotToContact(response.data);
    } catch (error) {
      throw await this.handleAPIError(error);
    }
  }

  async deleteContact(id: string): Promise<void> {
    this.ensureConnected();

    try {
      await this.httpClient!.delete(`/crm/v3/objects/contacts/${id}`);
      this.log('info', 'Deleted HubSpot contact', { id });
    } catch (error) {
      this.log('error', 'Failed to delete contact', error);
      throw await this.handleAPIError(error);
    }
  }

  async searchContacts(query: string): Promise<CRMContact[]> {
    this.ensureConnected();

    try {
      const response = await this.httpClient!.post('/crm/v3/objects/contacts/search', {
        filterGroups: [
          {
            filters: [
              {
                propertyName: 'email',
                operator: 'CONTAINS_TOKEN',
                value: query,
              },
            ],
          },
        ],
        limit: 100,
      });

      return response.data.results.map((result: any) => this.mapHubSpotToContact(result));
    } catch (error) {
      throw await this.handleAPIError(error);
    }
  }

  // =====================================================
  // Company Operations
  // =====================================================

  async createCompany(company: Company): Promise<CRMCompany> {
    this.ensureConnected();

    try {
      const properties = this.mapCompanyToHubSpot(company);

      const response = await this.httpClient!.post('/crm/v3/objects/companies', {
        properties,
      });

      this.log('info', 'Created HubSpot company', { id: response.data.id });
      return this.mapHubSpotToCompany(response.data);
    } catch (error) {
      this.log('error', 'Failed to create company', error);
      throw await this.handleAPIError(error);
    }
  }

  async updateCompany(id: string, company: Partial<Company>): Promise<CRMCompany> {
    this.ensureConnected();

    try {
      const properties = this.mapCompanyToHubSpot(company);

      const response = await this.httpClient!.patch(`/crm/v3/objects/companies/${id}`, {
        properties,
      });

      this.log('info', 'Updated HubSpot company', { id });
      return this.mapHubSpotToCompany(response.data);
    } catch (error) {
      this.log('error', 'Failed to update company', error);
      throw await this.handleAPIError(error);
    }
  }

  async getCompany(id: string): Promise<CRMCompany> {
    this.ensureConnected();

    try {
      const response = await this.httpClient!.get(`/crm/v3/objects/companies/${id}`);
      return this.mapHubSpotToCompany(response.data);
    } catch (error) {
      throw await this.handleAPIError(error);
    }
  }

  async deleteCompany(id: string): Promise<void> {
    this.ensureConnected();

    try {
      await this.httpClient!.delete(`/crm/v3/objects/companies/${id}`);
      this.log('info', 'Deleted HubSpot company', { id });
    } catch (error) {
      this.log('error', 'Failed to delete company', error);
      throw await this.handleAPIError(error);
    }
  }

  async searchCompanies(query: string): Promise<CRMCompany[]> {
    this.ensureConnected();

    try {
      const response = await this.httpClient!.post('/crm/v3/objects/companies/search', {
        filterGroups: [
          {
            filters: [
              {
                propertyName: 'name',
                operator: 'CONTAINS_TOKEN',
                value: query,
              },
            ],
          },
        ],
        limit: 100,
      });

      return response.data.results.map((result: any) => this.mapHubSpotToCompany(result));
    } catch (error) {
      throw await this.handleAPIError(error);
    }
  }

  // =====================================================
  // Deal Operations
  // =====================================================

  async createDeal(deal: Deal): Promise<CRMDeal> {
    this.ensureConnected();

    try {
      const properties = this.mapDealToHubSpot(deal);

      const associations: any[] = [];
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

      const response = await this.httpClient!.post('/crm/v3/objects/deals', {
        properties,
        associations,
      });

      this.log('info', 'Created HubSpot deal', { id: response.data.id });
      return this.mapHubSpotToDeal(response.data);
    } catch (error) {
      this.log('error', 'Failed to create deal', error);
      throw await this.handleAPIError(error);
    }
  }

  async updateDeal(id: string, deal: Partial<Deal>): Promise<CRMDeal> {
    this.ensureConnected();

    try {
      const properties = this.mapDealToHubSpot(deal);

      const response = await this.httpClient!.patch(`/crm/v3/objects/deals/${id}`, {
        properties,
      });

      this.log('info', 'Updated HubSpot deal', { id });
      return this.mapHubSpotToDeal(response.data);
    } catch (error) {
      this.log('error', 'Failed to update deal', error);
      throw await this.handleAPIError(error);
    }
  }

  async getDeal(id: string): Promise<CRMDeal> {
    this.ensureConnected();

    try {
      const response = await this.httpClient!.get(`/crm/v3/objects/deals/${id}`);
      return this.mapHubSpotToDeal(response.data);
    } catch (error) {
      throw await this.handleAPIError(error);
    }
  }

  async deleteDeal(id: string): Promise<void> {
    this.ensureConnected();

    try {
      await this.httpClient!.delete(`/crm/v3/objects/deals/${id}`);
      this.log('info', 'Deleted HubSpot deal', { id });
    } catch (error) {
      this.log('error', 'Failed to delete deal', error);
      throw await this.handleAPIError(error);
    }
  }

  // =====================================================
  // Task Operations
  // =====================================================

  async createTask(task: Task): Promise<CRMTask> {
    this.ensureConnected();

    try {
      const properties = this.mapTaskToHubSpot(task);

      const associations: any[] = [];
      if (task.relatedTo) {
        const typeMap: Record<string, number> = {
          contact: 204,
          company: 192,
          deal: 216,
        };
        associations.push({
          to: { id: task.relatedTo.id },
          types: [{
            associationCategory: 'HUBSPOT_DEFINED',
            associationTypeId: typeMap[task.relatedTo.type],
          }],
        });
      }

      const response = await this.httpClient!.post('/crm/v3/objects/tasks', {
        properties,
        associations,
      });

      this.log('info', 'Created HubSpot task', { id: response.data.id });
      return this.mapHubSpotToTask(response.data);
    } catch (error) {
      this.log('error', 'Failed to create task', error);
      throw await this.handleAPIError(error);
    }
  }

  async updateTask(id: string, task: Partial<Task>): Promise<CRMTask> {
    this.ensureConnected();

    try {
      const properties = this.mapTaskToHubSpot(task);

      const response = await this.httpClient!.patch(`/crm/v3/objects/tasks/${id}`, {
        properties,
      });

      this.log('info', 'Updated HubSpot task', { id });
      return this.mapHubSpotToTask(response.data);
    } catch (error) {
      this.log('error', 'Failed to update task', error);
      throw await this.handleAPIError(error);
    }
  }

  async getTask(id: string): Promise<CRMTask> {
    this.ensureConnected();

    try {
      const response = await this.httpClient!.get(`/crm/v3/objects/tasks/${id}`);
      return this.mapHubSpotToTask(response.data);
    } catch (error) {
      throw await this.handleAPIError(error);
    }
  }

  async deleteTask(id: string): Promise<void> {
    this.ensureConnected();

    try {
      await this.httpClient!.delete(`/crm/v3/objects/tasks/${id}`);
      this.log('info', 'Deleted HubSpot task', { id });
    } catch (error) {
      this.log('error', 'Failed to delete task', error);
      throw await this.handleAPIError(error);
    }
  }

  // =====================================================
  // Note Operations
  // =====================================================

  async createNote(note: Note): Promise<CRMNote> {
    this.ensureConnected();

    try {
      const properties = {
        hs_note_body: note.body,
        hs_timestamp: new Date().toISOString(),
      };

      const associations: any[] = [];
      if (note.relatedTo) {
        const typeMap: Record<string, number> = {
          contact: 202,
          company: 190,
          deal: 214,
        };
        associations.push({
          to: { id: note.relatedTo.id },
          types: [{
            associationCategory: 'HUBSPOT_DEFINED',
            associationTypeId: typeMap[note.relatedTo.type],
          }],
        });
      }

      const response = await this.httpClient!.post('/crm/v3/objects/notes', {
        properties,
        associations,
      });

      this.log('info', 'Created HubSpot note', { id: response.data.id });
      return {
        id: response.data.id,
        body: note.body,
        createdAt: new Date(response.data.createdAt),
      };
    } catch (error) {
      this.log('error', 'Failed to create note', error);
      throw await this.handleAPIError(error);
    }
  }

  // =====================================================
  // Field Operations
  // =====================================================

  async getFields(entityType: 'contact' | 'company' | 'deal' | 'task'): Promise<CRMField[]> {
    this.ensureConnected();

    const objectTypeMap = {
      contact: 'contacts',
      company: 'companies',
      deal: 'deals',
      task: 'tasks',
    };

    try {
      const response = await this.httpClient!.get(
        `/crm/v3/properties/${objectTypeMap[entityType]}`
      );

      return response.data.results.map((prop: any) => ({
        name: prop.name,
        label: prop.label,
        type: this.mapHubSpotFieldType(prop.type),
        description: prop.description,
        required: prop.required || false,
        options: prop.options?.map((opt: any) => ({
          label: opt.label,
          value: opt.value,
        })),
        hidden: prop.hidden || false,
        readOnly: prop.modificationMetadata?.readOnlyValue || false,
        groupName: prop.groupName,
      }));
    } catch (error) {
      throw await this.handleAPIError(error);
    }
  }

  // =====================================================
  // Webhook Operations
  // =====================================================

  async setupWebhook(config: WebhookConfig): Promise<void> {
    this.ensureConnected();

    try {
      // HubSpot uses subscriptions instead of traditional webhooks
      await this.httpClient!.post('/webhooks/v3/subscriptions', {
        eventType: config.events[0], // HubSpot only supports one event per subscription
        propertyName: undefined, // Optional filter
        active: true,
      });

      this.log('info', 'Set up HubSpot webhook', { events: config.events });
    } catch (error) {
      this.log('error', 'Failed to set up webhook', error);
      throw await this.handleAPIError(error);
    }
  }

  async deleteWebhook(webhookId: string): Promise<void> {
    this.ensureConnected();

    try {
      await this.httpClient!.delete(`/webhooks/v3/subscriptions/${webhookId}`);
      this.log('info', 'Deleted HubSpot webhook', { webhookId });
    } catch (error) {
      this.log('error', 'Failed to delete webhook', error);
      throw await this.handleAPIError(error);
    }
  }

  // =====================================================
  // Rate Limit Status
  // =====================================================

  async getRateLimitStatus(): Promise<{ remaining: number; limit: number; resetAt: Date }> {
    // HubSpot returns rate limit info in headers
    // This is a placeholder - actual implementation would track from response headers
    return {
      remaining: 100,
      limit: 100,
      resetAt: new Date(Date.now() + 10000),
    };
  }

  // =====================================================
  // Mapping Functions
  // =====================================================

  private mapContactToHubSpot(contact: Partial<Contact>): Record<string, any> {
    const properties: Record<string, any> = {};

    if (contact.email) properties.email = contact.email;
    if (contact.firstName) properties.firstname = contact.firstName;
    if (contact.lastName) properties.lastname = contact.lastName;
    if (contact.phone) properties.phone = contact.phone;
    if (contact.mobilePhone) properties.mobilephone = contact.mobilePhone;
    if (contact.company) properties.company = contact.company;
    if (contact.title) properties.jobtitle = contact.title;
    if (contact.website) properties.website = contact.website;
    if (contact.linkedinUrl) properties.linkedin_bio = contact.linkedinUrl;

    if (contact.address) {
      if (contact.address.street) properties.address = contact.address.street;
      if (contact.address.city) properties.city = contact.address.city;
      if (contact.address.state) properties.state = contact.address.state;
      if (contact.address.postalCode) properties.zip = contact.address.postalCode;
      if (contact.address.country) properties.country = contact.address.country;
    }

    if (contact.customFields) {
      Object.assign(properties, contact.customFields);
    }

    return properties;
  }

  private mapHubSpotToContact(data: any): CRMContact {
    return {
      id: data.id,
      email: data.properties.email,
      firstName: data.properties.firstname,
      lastName: data.properties.lastname,
      phone: data.properties.phone,
      properties: data.properties,
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),
    };
  }

  private mapCompanyToHubSpot(company: Partial<Company>): Record<string, any> {
    const properties: Record<string, any> = {};

    if (company.name) properties.name = company.name;
    if (company.domain) properties.domain = company.domain;
    if (company.industry) properties.industry = company.industry;
    if (company.employeeCount) properties.numberofemployees = company.employeeCount;
    if (company.revenue) properties.annualrevenue = company.revenue;
    if (company.description) properties.description = company.description;
    if (company.website) properties.website = company.website;
    if (company.phone) properties.phone = company.phone;
    if (company.foundedYear) properties.founded_year = company.foundedYear;

    if (company.address) {
      if (company.address.street) properties.address = company.address.street;
      if (company.address.city) properties.city = company.address.city;
      if (company.address.state) properties.state = company.address.state;
      if (company.address.postalCode) properties.zip = company.address.postalCode;
      if (company.address.country) properties.country = company.address.country;
    }

    if (company.customFields) {
      Object.assign(properties, company.customFields);
    }

    return properties;
  }

  private mapHubSpotToCompany(data: any): CRMCompany {
    return {
      id: data.id,
      name: data.properties.name,
      domain: data.properties.domain,
      properties: data.properties,
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),
    };
  }

  private mapDealToHubSpot(deal: Partial<Deal>): Record<string, any> {
    const properties: Record<string, any> = {};

    if (deal.name) properties.dealname = deal.name;
    if (deal.amount) properties.amount = deal.amount;
    if (deal.stage) properties.dealstage = deal.stage;
    if (deal.closeDate) properties.closedate = deal.closeDate.toISOString();
    if (deal.description) properties.description = deal.description;
    if (deal.probability !== undefined) properties.hs_deal_probability = deal.probability;

    if (deal.customFields) {
      Object.assign(properties, deal.customFields);
    }

    return properties;
  }

  private mapHubSpotToDeal(data: any): CRMDeal {
    return {
      id: data.id,
      name: data.properties.dealname,
      amount: parseFloat(data.properties.amount) || undefined,
      stage: data.properties.dealstage,
      properties: data.properties,
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),
    };
  }

  private mapTaskToHubSpot(task: Partial<Task>): Record<string, any> {
    const properties: Record<string, any> = {};

    if (task.title) properties.hs_task_subject = task.title;
    if (task.description) properties.hs_task_body = task.description;
    if (task.dueDate) properties.hs_timestamp = task.dueDate.toISOString();
    if (task.priority) properties.hs_task_priority = task.priority.toUpperCase();
    if (task.status) properties.hs_task_status = task.status.toUpperCase();
    if (task.assignedTo) properties.hubspot_owner_id = task.assignedTo;

    if (task.customFields) {
      Object.assign(properties, task.customFields);
    }

    return properties;
  }

  private mapHubSpotToTask(data: any): CRMTask {
    return {
      id: data.id,
      title: data.properties.hs_task_subject,
      dueDate: data.properties.hs_timestamp ? new Date(data.properties.hs_timestamp) : undefined,
      properties: data.properties,
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),
    };
  }

  private mapHubSpotFieldType(hubspotType: string): CRMField['type'] {
    const typeMap: Record<string, CRMField['type']> = {
      string: 'string',
      number: 'number',
      bool: 'boolean',
      date: 'date',
      datetime: 'date',
      enumeration: 'enum',
    };

    return typeMap[hubspotType] || 'string';
  }
}
