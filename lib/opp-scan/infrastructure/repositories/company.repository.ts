/**
 * Company Repository Implementation
 * Handles persistence of company entities with search capabilities
 */

import { CompanyEntity } from '../../domain/entities/company.entity'
import { ICompanyRepository, SearchCriteria } from '../../core/interfaces'

export class CompanyRepository implements ICompanyRepository {
  constructor(
    private readonly db: { query: (sql: string, params: unknown[]) => Promise<{ rows: Array<Record<string, unknown>> }> }
  ) {}

  async findById(id: string): Promise<CompanyEntity | null> {
    try {
      const result = await this.db.query(
        'SELECT * FROM companies WHERE id = $1',
        [id]
      )

      if (result.rows.length === 0) {
        return null
      }

      const row = result.rows[0]
      return this.mapRowToEntity(row)
    } catch (error) {
      console.error('Error finding company by ID:', error)
      throw new Error(`Failed to find company with ID ${id}`)
    }
  }

  async findByName(name: string): Promise<CompanyEntity[]> {
    try {
      const result = await this.db.query(
        'SELECT * FROM companies WHERE name ILIKE $1',
        [`%${name}%`]
      )

      return result.rows.map((row: unknown) => this.mapRowToEntity(row))
    } catch (error) {
      console.error('Error finding companies by name:', error)
      throw new Error(`Failed to find companies with name ${name}`)
    }
  }

  async findByRegistrationNumber(registrationNumber: string): Promise<CompanyEntity | null> {
    try {
      const result = await this.db.query(
        'SELECT * FROM companies WHERE registration_number = $1',
        [registrationNumber]
      )

      if (result.rows.length === 0) {
        return null
      }

      return this.mapRowToEntity(result.rows[0])
    } catch (error) {
      console.error('Error finding company by registration number:', error)
      throw new Error(`Failed to find company with registration number ${registrationNumber}`)
    }
  }

  async search(criteria: SearchCriteria, limit: number = 100): Promise<CompanyEntity[]> {
    try {
      let query = 'SELECT * FROM companies WHERE 1=1'
      const params: unknown[] = []
      let paramIndex = 1

      // Industry filtering
      if (criteria.industries && criteria.industries.length > 0) {
        query += ` AND industry_codes && $${paramIndex}`
        params.push(criteria.industries)
        paramIndex++
      }

      // Region/Country filtering
      if (criteria.regions && criteria.regions.length > 0) {
        query += ` AND country = ANY($${paramIndex})`
        params.push(criteria.regions)
        paramIndex++
      }

      // Employee count filtering
      if (criteria.filters?.minEmployees) {
        query += ` AND COALESCE(CAST(REGEXP_REPLACE(employee_count, '[^0-9]', '', 'g') AS INTEGER), 0) >= $${paramIndex}`
        params.push(criteria.filters.minEmployees)
        paramIndex++
      }

      if (criteria.filters?.maxEmployees) {
        query += ` AND COALESCE(CAST(REGEXP_REPLACE(employee_count, '[^0-9]', '', 'g') AS INTEGER), 999999) <= $${paramIndex}`
        params.push(criteria.filters.maxEmployees)
        paramIndex++
      }

      // Revenue filtering
      if (criteria.filters?.minRevenue) {
        query += ` AND COALESCE(revenue_estimate, 0) >= $${paramIndex}`
        params.push(criteria.filters.minRevenue)
        paramIndex++
      }

      if (criteria.filters?.maxRevenue) {
        query += ` AND COALESCE(revenue_estimate, 999999999) <= $${paramIndex}`
        params.push(criteria.filters.maxRevenue)
        paramIndex++
      }

      // Founding year filtering
      if (criteria.filters?.foundingYear) {
        query += ` AND founding_year >= $${paramIndex}`
        params.push(criteria.filters.foundingYear)
        paramIndex++
      }

      // Exclude industries
      if (criteria.filters?.excludeIndustries && criteria.filters.excludeIndustries.length > 0) {
        query += ` AND NOT (industry_codes && $${paramIndex})`
        params.push(criteria.filters.excludeIndustries)
        paramIndex++
      }

      // Order by confidence score and limit results
      query += ` ORDER BY confidence_score DESC, created_at DESC LIMIT $${paramIndex}`
      params.push(limit)

      const result = await this.db.query(query, params)
      return result.rows.map((row: unknown) => this.mapRowToEntity(row))
    } catch (error) {
      console.error('Error searching companies:', error)
      throw new Error('Failed to search companies')
    }
  }

  async save(company: CompanyEntity): Promise<void> {
    const companyData = company.toJSON()
    
    try {
      await this.db.query('BEGIN')
      
      // Check if company exists
      const existingResult = await this.db.query(
        'SELECT id FROM companies WHERE id = $1',
        [company.id]
      )

      if (existingResult.rows.length > 0) {
        // Update existing company
        await this.db.query(`
          UPDATE companies SET
            name = $2,
            registration_number = $3,
            country = $4,
            industry_codes = $5,
            website = $6,
            description = $7,
            employee_count = $8,
            revenue_estimate = $9,
            founding_year = $10,
            address = $11,
            contact_info = $12,
            confidence_score = $13,
            source_metadata = $14,
            updated_at = $15
          WHERE id = $1
        `, [
          company.id,
          companyData.name,
          companyData.registrationNumber,
          companyData.country,
          companyData.industryCodes,
          companyData.website,
          companyData.description,
          companyData.employeeCount,
          companyData.revenueEstimate,
          companyData.foundingYear,
          JSON.stringify(companyData.address),
          JSON.stringify(companyData.contactInfo),
          companyData.confidenceScore,
          JSON.stringify(companyData.sourceMetadata),
          companyData.updatedAt
        ])
      } else {
        // Insert new company
        await this.db.query(`
          INSERT INTO companies (
            id, name, registration_number, country, industry_codes, website,
            description, employee_count, revenue_estimate, founding_year,
            address, contact_info, confidence_score, source_metadata,
            created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        `, [
          company.id,
          companyData.name,
          companyData.registrationNumber,
          companyData.country,
          companyData.industryCodes,
          companyData.website,
          companyData.description,
          companyData.employeeCount,
          companyData.revenueEstimate,
          companyData.foundingYear,
          JSON.stringify(companyData.address),
          JSON.stringify(companyData.contactInfo),
          companyData.confidenceScore,
          JSON.stringify(companyData.sourceMetadata),
          companyData.createdAt,
          companyData.updatedAt
        ])
      }

      await this.db.query('COMMIT')
    } catch (error) {
      await this.db.query('ROLLBACK')
      console.error('Error saving company:', error)
      throw new Error(`Failed to save company ${company.id}`)
    }
  }

  async saveMany(companies: CompanyEntity[]): Promise<void> {
    if (companies.length === 0) return

    try {
      await this.db.query('BEGIN')

      // Build bulk insert query
      const values: unknown[] = []
      const valueRows: string[] = []
      let paramIndex = 1

      for (let i = 0; i < companies.length; i++) {
        const company = companies[i]
        const companyData = company.toJSON()
        
        valueRows.push(`($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, $${paramIndex + 5}, $${paramIndex + 6}, $${paramIndex + 7}, $${paramIndex + 8}, $${paramIndex + 9}, $${paramIndex + 10}, $${paramIndex + 11}, $${paramIndex + 12}, $${paramIndex + 13}, $${paramIndex + 14}, $${paramIndex + 15})`)
        
        values.push(
          company.id,
          companyData.name,
          companyData.registrationNumber,
          companyData.country,
          companyData.industryCodes,
          companyData.website,
          companyData.description,
          companyData.employeeCount,
          companyData.revenueEstimate,
          companyData.foundingYear,
          JSON.stringify(companyData.address),
          JSON.stringify(companyData.contactInfo),
          companyData.confidenceScore,
          JSON.stringify(companyData.sourceMetadata),
          companyData.createdAt,
          companyData.updatedAt
        )
        
        paramIndex += 16
      }

      const query = `
        INSERT INTO companies (
          id, name, registration_number, country, industry_codes, website,
          description, employee_count, revenue_estimate, founding_year,
          address, contact_info, confidence_score, source_metadata,
          created_at, updated_at
        ) VALUES ${valueRows.join(', ')}
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          registration_number = EXCLUDED.registration_number,
          country = EXCLUDED.country,
          industry_codes = EXCLUDED.industry_codes,
          website = EXCLUDED.website,
          description = EXCLUDED.description,
          employee_count = EXCLUDED.employee_count,
          revenue_estimate = EXCLUDED.revenue_estimate,
          founding_year = EXCLUDED.founding_year,
          address = EXCLUDED.address,
          contact_info = EXCLUDED.contact_info,
          confidence_score = EXCLUDED.confidence_score,
          source_metadata = EXCLUDED.source_metadata,
          updated_at = EXCLUDED.updated_at
      `

      await this.db.query(query, values)
      await this.db.query('COMMIT')
    } catch (error) {
      await this.db.query('ROLLBACK')
      console.error('Error saving companies in batch:', error)
      throw new Error('Failed to save companies in batch')
    }
  }

  async delete(id: string): Promise<void> {
    try {
      const result = await this.db.query(
        'DELETE FROM companies WHERE id = $1',
        [id]
      )

      if (result.rowCount === 0) {
        throw new Error(`Company with ID ${id} not found`)
      }
    } catch (error) {
      console.error('Error deleting company:', error)
      throw new Error(`Failed to delete company ${id}`)
    }
  }

  async findHighConfidenceCompanies(minScore: number = 0.8): Promise<CompanyEntity[]> {
    try {
      const result = await this.db.query(
        'SELECT * FROM companies WHERE confidence_score >= $1 ORDER BY confidence_score DESC',
        [minScore]
      )

      return result.rows.map((row: unknown) => this.mapRowToEntity(row))
    } catch (error) {
      console.error('Error finding high confidence companies:', error)
      throw new Error('Failed to find high confidence companies')
    }
  }

  async countByIndustry(industryCodes: string[]): Promise<Record<string, number>> {
    try {
      const result = await this.db.query(`
        SELECT 
          unnest(industry_codes) as industry_code, 
          COUNT(*) as count
        FROM companies 
        WHERE industry_codes && $1
        GROUP BY unnest(industry_codes)
      `, [industryCodes])

      const counts: Record<string, number> = {}
      for (const row of result.rows) {
        counts[row.industry_code] = parseInt(row.count)
      }

      return counts
    } catch (error) {
      console.error('Error counting companies by industry:', error)
      throw new Error('Failed to count companies by industry')
    }
  }

  async findSimilarCompanies(company: CompanyEntity, threshold: number = 0.8): Promise<CompanyEntity[]> {
    try {
      // Simple similarity search - in production would use more sophisticated algorithms
      let query = 'SELECT * FROM companies WHERE id != $1'
      const params: unknown[] = [company.id]
      let paramIndex = 2

      // Search by registration number first (exact match)
      if (company.registrationNumber) {
        const regResult = await this.db.query(
          'SELECT * FROM companies WHERE registration_number = $1 AND id != $2',
          [company.registrationNumber, company.id]
        )
        
        if (regResult.rows.length > 0) {
          return regResult.rows.map((row: unknown) => this.mapRowToEntity(row))
        }
      }

      // Name similarity search
      query += ` AND similarity(name, $${paramIndex}) > $${paramIndex + 1}`
      params.push(company.name, threshold)
      paramIndex += 2

      // Same country
      query += ` AND country = $${paramIndex}`
      params.push(company.country)
      paramIndex++

      // Similar industry codes
      query += ` AND industry_codes && $${paramIndex}`
      params.push(company.industryCodes)

      query += ' ORDER BY similarity(name, $2) DESC LIMIT 10'

      const result = await this.db.query(query, params)
      return result.rows.map((row: unknown) => this.mapRowToEntity(row))
    } catch (error) {
      console.error('Error finding similar companies:', error)
      // Fallback to simpler search if similarity extension not available
      return this.findByName(company.name)
    }
  }

  private mapRowToEntity(row: unknown): CompanyEntity {
    return CompanyEntity.fromJSON({
      id: row.id,
      name: row.name,
      registrationNumber: row.registration_number,
      country: row.country,
      industryCodes: row.industry_codes || [],
      website: row.website,
      description: row.description,
      employeeCount: row.employee_count,
      revenueEstimate: row.revenue_estimate,
      foundingYear: row.founding_year,
      address: row.address ? JSON.parse(row.address) : null,
      contactInfo: row.contact_info ? JSON.parse(row.contact_info) : null,
      confidenceScore: row.confidence_score,
      sourceMetadata: JSON.parse(row.source_metadata),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    })
  }
}