import { createClient } from '@/lib/supabase/server'
import type { BANTQualification, MEDDICQualification } from '@/types/qualification'

/**
 * CRM Integration Helper for Qualification Data
 * Provides standardized methods for syncing with popular CRMs
 */

export interface CRMConfig {
  provider: 'salesforce' | 'hubspot' | 'pipedrive' | 'zoho' | 'custom'
  apiKey?: string
  apiSecret?: string
  accessToken?: string
  refreshToken?: string
  instanceUrl?: string
  apiVersion?: string
  customFieldMapping?: Record<string, string>
}

export interface CRMSyncResult {
  success: boolean
  recordId?: string
  errors?: string[]
  syncedAt?: string
  details?: any
}

export interface CRMLead {
  id?: string
  externalId?: string
  company: string
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  title?: string
  website?: string
  industry?: string
  employeeCount?: number
  revenue?: number
  score?: number
  status?: string
  customFields?: Record<string, any>
}

export class CRMIntegration {
  private config: CRMConfig
  private supabase: any

  constructor(config: CRMConfig) {
    this.config = config
  }

  private async getSupabase() {
    if (!this.supabase) {
      this.supabase = await createClient()
    }
    return this.supabase
  }

  /**
   * Sync qualification data to CRM
   */
  async syncQualification(
    qualificationId: string,
    framework: 'BANT' | 'MEDDIC'
  ): Promise<CRMSyncResult> {
    try {
      const qualification = await this.getQualificationData(qualificationId, framework)
      if (!qualification) {
        return { success: false, errors: ['Qualification not found'] }
      }

      const crmData = this.transformToCRMFormat(qualification, framework)

      switch (this.config.provider) {
        case 'salesforce':
          return await this.syncToSalesforce(crmData)
        case 'hubspot':
          return await this.syncToHubSpot(crmData)
        case 'pipedrive':
          return await this.syncToPipedrive(crmData)
        case 'zoho':
          return await this.syncToZoho(crmData)
        case 'custom':
          return await this.syncToCustomCRM(crmData)
        default:
          return { success: false, errors: ['Unsupported CRM provider'] }
      }
    } catch (error) {
      console.error('Error syncing to CRM:', error)
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      }
    }
  }

  /**
   * Get qualification data from database
   */
  private async getQualificationData(
    qualificationId: string,
    framework: 'BANT' | 'MEDDIC'
  ): Promise<BANTQualification | MEDDICQualification | null> {
    const supabase = await this.getSupabase()
    const table = framework === 'BANT' ? 'bant_qualifications' : 'meddic_qualifications'

    const { data, error } = await supabase
      .from(table)
      .select('*')
      .eq('id', qualificationId)
      .single()

    if (error || !data) return null
    return data
  }

  /**
   * Transform qualification data to CRM format
   */
  private transformToCRMFormat(
    qualification: BANTQualification | MEDDICQualification,
    framework: 'BANT' | 'MEDDIC'
  ): CRMLead {
    const baseData: CRMLead = {
      externalId: qualification.lead_id,
      company: qualification.company_id,
      score: qualification.overall_score,
      status: this.mapQualificationStatus(qualification),
      customFields: {}
    }

    if (framework === 'BANT') {
      const bant = qualification as BANTQualification
      baseData.customFields = {
        ...baseData.customFields,
        bant_budget_score: bant.budget_score,
        bant_authority_score: bant.authority_score,
        bant_need_score: bant.need_score,
        bant_timeline_score: bant.timeline_score,
        bant_qualification_status: bant.qualification_status,
        bant_budget_range: bant.budget_details?.budget_range,
        bant_decision_date: bant.timeline_details?.decision_date,
        bant_urgency_level: bant.need_details?.urgency_level
      }
    } else {
      const meddic = qualification as MEDDICQualification
      baseData.customFields = {
        ...baseData.customFields,
        meddic_metrics_score: meddic.metrics_score,
        meddic_economic_buyer_score: meddic.economic_buyer_score,
        meddic_decision_criteria_score: meddic.decision_criteria_score,
        meddic_decision_process_score: meddic.decision_process_score,
        meddic_identify_pain_score: meddic.identify_pain_score,
        meddic_champion_score: meddic.champion_score,
        meddic_forecast_category: meddic.forecast_category,
        meddic_qualification_confidence: meddic.qualification_confidence,
        meddic_economic_buyer_identified: meddic.economic_buyer_details?.identified,
        meddic_champion_identified: meddic.champion_details?.identified
      }
    }

    // Apply custom field mapping if provided
    if (this.config.customFieldMapping) {
      const mappedFields: Record<string, any> = {}
      Object.entries(baseData.customFields).forEach(([key, value]) => {
        const mappedKey = this.config.customFieldMapping![key] || key
        mappedFields[mappedKey] = value
      })
      baseData.customFields = mappedFields
    }

    return baseData
  }

  /**
   * Map qualification status to CRM status
   */
  private mapQualificationStatus(
    qualification: BANTQualification | MEDDICQualification
  ): string {
    if ('qualification_status' in qualification) {
      switch (qualification.qualification_status) {
        case 'qualified':
          return 'Qualified'
        case 'nurture':
          return 'Nurturing'
        case 'disqualified':
          return 'Disqualified'
        default:
          return 'New'
      }
    } else if ('forecast_category' in qualification) {
      switch (qualification.forecast_category) {
        case 'commit':
          return 'Qualified'
        case 'best_case':
          return 'Working'
        case 'pipeline':
          return 'Nurturing'
        case 'omitted':
          return 'Disqualified'
        default:
          return 'New'
      }
    }
    return 'New'
  }

  /**
   * Sync to Salesforce
   */
  private async syncToSalesforce(data: CRMLead): Promise<CRMSyncResult> {
    try {
      const response = await fetch(`${this.config.instanceUrl}/services/data/${this.config.apiVersion}/sobjects/Lead`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          Company: data.company,
          Status: data.status,
          Rating: this.getLeadRating(data.score),
          ...this.mapToSalesforceFields(data.customFields)
        })
      })

      if (response.ok) {
        const result = await response.json()
        return {
          success: true,
          recordId: result.id,
          syncedAt: new Date().toISOString()
        }
      } else {
        const error = await response.json()
        return {
          success: false,
          errors: [error.message || 'Failed to sync to Salesforce']
        }
      }
    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Salesforce sync failed']
      }
    }
  }

  /**
   * Sync to HubSpot
   */
  private async syncToHubSpot(data: CRMLead): Promise<CRMSyncResult> {
    try {
      const response = await fetch('https://api.hubapi.com/crm/v3/objects/contacts', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          properties: {
            company: data.company,
            lead_status: data.status,
            hs_lead_score: data.score,
            ...this.mapToHubSpotProperties(data.customFields)
          }
        })
      })

      if (response.ok) {
        const result = await response.json()
        return {
          success: true,
          recordId: result.id,
          syncedAt: new Date().toISOString()
        }
      } else {
        const error = await response.json()
        return {
          success: false,
          errors: [error.message || 'Failed to sync to HubSpot']
        }
      }
    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'HubSpot sync failed']
      }
    }
  }

  /**
   * Sync to Pipedrive
   */
  private async syncToPipedrive(data: CRMLead): Promise<CRMSyncResult> {
    try {
      const response = await fetch(`https://api.pipedrive.com/v1/persons?api_token=${this.config.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: data.company,
          org_id: data.company,
          ...this.mapToPipedriveFields(data.customFields)
        })
      })

      if (response.ok) {
        const result = await response.json()
        return {
          success: true,
          recordId: result.data.id,
          syncedAt: new Date().toISOString()
        }
      } else {
        const error = await response.json()
        return {
          success: false,
          errors: [error.error || 'Failed to sync to Pipedrive']
        }
      }
    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Pipedrive sync failed']
      }
    }
  }

  /**
   * Sync to Zoho CRM
   */
  private async syncToZoho(data: CRMLead): Promise<CRMSyncResult> {
    try {
      const response = await fetch('https://www.zohoapis.com/crm/v2/Leads', {
        method: 'POST',
        headers: {
          'Authorization': `Zoho-oauthtoken ${this.config.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          data: [{
            Company: data.company,
            Lead_Status: data.status,
            Lead_Score: data.score,
            ...this.mapToZohoFields(data.customFields)
          }]
        })
      })

      if (response.ok) {
        const result = await response.json()
        return {
          success: true,
          recordId: result.data[0].details.id,
          syncedAt: new Date().toISOString()
        }
      } else {
        const error = await response.json()
        return {
          success: false,
          errors: [error.message || 'Failed to sync to Zoho']
        }
      }
    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Zoho sync failed']
      }
    }
  }

  /**
   * Sync to custom CRM via webhook
   */
  private async syncToCustomCRM(data: CRMLead): Promise<CRMSyncResult> {
    try {
      const response = await fetch(this.config.instanceUrl!, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })

      if (response.ok) {
        const result = await response.json()
        return {
          success: true,
          recordId: result.id || result.recordId,
          syncedAt: new Date().toISOString(),
          details: result
        }
      } else {
        return {
          success: false,
          errors: ['Failed to sync to custom CRM']
        }
      }
    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Custom CRM sync failed']
      }
    }
  }

  /**
   * Bulk sync qualifications
   */
  async bulkSync(
    qualifications: Array<{ id: string; framework: 'BANT' | 'MEDDIC' }>
  ): Promise<{ successful: number; failed: number; results: CRMSyncResult[] }> {
    const results: CRMSyncResult[] = []
    let successful = 0
    let failed = 0

    for (const qual of qualifications) {
      const result = await this.syncQualification(qual.id, qual.framework)
      results.push(result)

      if (result.success) {
        successful++
      } else {
        failed++
      }

      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200))
    }

    return { successful, failed, results }
  }

  /**
   * Get lead rating based on score
   */
  private getLeadRating(score?: number): string {
    if (!score) return 'Cold'
    if (score >= 80) return 'Hot'
    if (score >= 60) return 'Warm'
    return 'Cold'
  }

  /**
   * Map custom fields to Salesforce format
   */
  private mapToSalesforceFields(customFields?: Record<string, any>): Record<string, any> {
    if (!customFields) return {}

    const mapped: Record<string, any> = {}
    Object.entries(customFields).forEach(([key, value]) => {
      // Salesforce custom fields typically end with __c
      const sfKey = key.endsWith('__c') ? key : `${key}__c`
      mapped[sfKey] = value
    })
    return mapped
  }

  /**
   * Map custom fields to HubSpot properties
   */
  private mapToHubSpotProperties(customFields?: Record<string, any>): Record<string, any> {
    if (!customFields) return {}

    const mapped: Record<string, any> = {}
    Object.entries(customFields).forEach(([key, value]) => {
      // HubSpot properties use lowercase with underscores
      const hsKey = key.toLowerCase().replace(/-/g, '_')
      mapped[hsKey] = value
    })
    return mapped
  }

  /**
   * Map custom fields to Pipedrive format
   */
  private mapToPipedriveFields(customFields?: Record<string, any>): Record<string, any> {
    if (!customFields) return {}

    // Pipedrive uses custom field IDs, this is a simplified mapping
    return customFields
  }

  /**
   * Map custom fields to Zoho format
   */
  private mapToZohoFields(customFields?: Record<string, any>): Record<string, any> {
    if (!customFields) return {}

    const mapped: Record<string, any> = {}
    Object.entries(customFields).forEach(([key, value]) => {
      // Zoho uses Title_Case for field names
      const zohoKey = key.split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join('_')
      mapped[zohoKey] = value
    })
    return mapped
  }

  /**
   * Validate CRM configuration
   */
  async validateConfig(): Promise<{ valid: boolean; errors?: string[] }> {
    const errors: string[] = []

    if (!this.config.provider) {
      errors.push('CRM provider is required')
    }

    switch (this.config.provider) {
      case 'salesforce':
        if (!this.config.instanceUrl) errors.push('Salesforce instance URL is required')
        if (!this.config.accessToken) errors.push('Salesforce access token is required')
        break

      case 'hubspot':
        if (!this.config.accessToken) errors.push('HubSpot access token is required')
        break

      case 'pipedrive':
        if (!this.config.apiKey) errors.push('Pipedrive API key is required')
        break

      case 'zoho':
        if (!this.config.accessToken) errors.push('Zoho access token is required')
        break

      case 'custom':
        if (!this.config.instanceUrl) errors.push('Custom CRM URL is required')
        if (!this.config.apiKey) errors.push('Custom CRM API key is required')
        break
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    }
  }

  /**
   * Test CRM connection
   */
  async testConnection(): Promise<{ connected: boolean; message: string }> {
    try {
      // Attempt a simple API call based on provider
      switch (this.config.provider) {
        case 'salesforce':
          const sfResponse = await fetch(`${this.config.instanceUrl}/services/data`, {
            headers: { 'Authorization': `Bearer ${this.config.accessToken}` }
          })
          return {
            connected: sfResponse.ok,
            message: sfResponse.ok ? 'Connected to Salesforce' : 'Failed to connect to Salesforce'
          }

        case 'hubspot':
          const hsResponse = await fetch('https://api.hubapi.com/crm/v3/objects/contacts?limit=1', {
            headers: { 'Authorization': `Bearer ${this.config.accessToken}` }
          })
          return {
            connected: hsResponse.ok,
            message: hsResponse.ok ? 'Connected to HubSpot' : 'Failed to connect to HubSpot'
          }

        default:
          return { connected: false, message: 'Test not implemented for this provider' }
      }
    } catch (error) {
      return {
        connected: false,
        message: error instanceof Error ? error.message : 'Connection test failed'
      }
    }
  }
}