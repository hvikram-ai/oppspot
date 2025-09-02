/**
 * Company Entity Unit Tests
 * Tests the business logic and validation of the Company domain entity
 */

import { CompanyEntity } from '../../../domain/entities/company.entity'
import { CompanyCreatedEvent } from '../../../domain/events/company.events'

describe('CompanyEntity', () => {
  const mockSourceMetadata = {
    source: 'companies_house',
    discoveredAt: new Date(),
    confidence: 0.9
  }

  const mockAddress = {
    line1: '123 Business St',
    line2: 'Suite 100',
    city: 'London',
    postalCode: 'SW1A 1AA',
    country: 'UK'
  }

  describe('Creation and Validation', () => {
    it('should create a valid company entity', () => {
      const company = CompanyEntity.create(
        'company-123',
        'Test Company Ltd',
        'UK',
        ['70100', '70200'],
        0.85,
        mockSourceMetadata,
        'REG123456',
        'https://testcompany.com',
        'A test company',
        '50-100',
        1000000,
        2015,
        mockAddress
      )

      expect(company.id).toBe('company-123')
      expect(company.name).toBe('Test Company Ltd')
      expect(company.country).toBe('UK')
      expect(company.confidenceScore).toBe(0.85)
      expect(company.registrationNumber).toBe('REG123456')
      expect(company.website).toBe('https://testcompany.com')
      expect(company.revenueEstimate).toBe(1000000)
      expect(company.foundingYear).toBe(2015)
    })

    it('should raise domain event on creation', () => {
      const company = CompanyEntity.create(
        'company-123',
        'Test Company Ltd',
        'UK',
        ['70100'],
        0.85,
        mockSourceMetadata
      )

      expect(company.domainEvents).toHaveLength(1)
      expect(company.domainEvents[0]).toBeInstanceOf(CompanyCreatedEvent)
      
      const event = company.domainEvents[0] as CompanyCreatedEvent
      expect(event.payload.companyId).toBe('company-123')
      expect(event.payload.name).toBe('Test Company Ltd')
    })

    it('should validate confidence score range', () => {
      expect(() => {
        CompanyEntity.create('test', 'Test Co', 'UK', ['70100'], 1.5, mockSourceMetadata)
      }).toThrow('Confidence score must be between 0 and 1')

      expect(() => {
        CompanyEntity.create('test', 'Test Co', 'UK', ['70100'], -0.1, mockSourceMetadata)
      }).toThrow('Confidence score must be between 0 and 1')
    })

    it('should validate required fields', () => {
      expect(() => {
        CompanyEntity.create('', 'Test Co', 'UK', ['70100'], 0.8, mockSourceMetadata)
      }).toThrow()

      expect(() => {
        CompanyEntity.create('test', '', 'UK', ['70100'], 0.8, mockSourceMetadata)
      }).toThrow('Company name cannot be empty')

      expect(() => {
        CompanyEntity.create('test', 'Test Co', '', ['70100'], 0.8, mockSourceMetadata)
      }).toThrow('Country cannot be empty')
    })

    it('should validate name length', () => {
      const longName = 'A'.repeat(201)
      expect(() => {
        CompanyEntity.create('test', longName, 'UK', ['70100'], 0.8, mockSourceMetadata)
      }).toThrow('Company name cannot exceed 200 characters')
    })
  })

  describe('Business Logic Methods', () => {
    let company: CompanyEntity

    beforeEach(() => {
      company = CompanyEntity.create(
        'company-123',
        'Test Company Ltd',
        'UK',
        ['70100', '70200'],
        0.85,
        mockSourceMetadata,
        'REG123456',
        'https://testcompany.com',
        'A test company',
        '50-100',
        1000000,
        2015,
        mockAddress
      )
    })

    describe('Confidence Level Checking', () => {
      it('should correctly identify high confidence companies', () => {
        const highConfidenceCompany = CompanyEntity.create(
          'test', 'Test Co', 'UK', ['70100'], 0.9, mockSourceMetadata
        )
        expect(highConfidenceCompany.isHighConfidence()).toBe(true)
      })

      it('should correctly identify medium confidence companies', () => {
        const mediumConfidenceCompany = CompanyEntity.create(
          'test', 'Test Co', 'UK', ['70100'], 0.6, mockSourceMetadata
        )
        expect(mediumConfidenceCompany.isMediumConfidence()).toBe(true)
      })

      it('should correctly identify low confidence companies', () => {
        const lowConfidenceCompany = CompanyEntity.create(
          'test', 'Test Co', 'UK', ['70100'], 0.3, mockSourceMetadata
        )
        expect(lowConfidenceCompany.isLowConfidence()).toBe(true)
      })
    })

    describe('Company Age Calculations', () => {
      it('should calculate company age correctly', () => {
        const currentYear = new Date().getFullYear()
        const expectedAge = currentYear - 2015
        expect(company.getCompanyAge()).toBe(expectedAge)
      })

      it('should return null for companies without founding year', () => {
        const companyNoYear = CompanyEntity.create(
          'test', 'Test Co', 'UK', ['70100'], 0.8, mockSourceMetadata
        )
        expect(companyNoYear.getCompanyAge()).toBeNull()
      })

      it('should identify established companies correctly', () => {
        const oldCompany = CompanyEntity.create(
          'test', 'Old Co', 'UK', ['70100'], 0.8, mockSourceMetadata,
          undefined, undefined, undefined, undefined, undefined, 2010
        )
        expect(oldCompany.isEstablishedCompany()).toBe(true)

        const newCompany = CompanyEntity.create(
          'test', 'New Co', 'UK', ['70100'], 0.8, mockSourceMetadata,
          undefined, undefined, undefined, undefined, undefined, new Date().getFullYear() - 1
        )
        expect(newCompany.isEstablishedCompany()).toBe(false)
      })
    })

    describe('Industry Matching', () => {
      it('should match single industry code', () => {
        expect(company.isInIndustry('70100')).toBe(true)
        expect(company.isInIndustry('99999')).toBe(false)
      })

      it('should match multiple industry codes', () => {
        expect(company.matchesIndustries(['70100', '80000'])).toBe(true)
        expect(company.matchesIndustries(['99999', '88888'])).toBe(false)
      })
    })

    describe('Contact Information', () => {
      it('should identify companies with complete contact info', () => {
        const contactInfo = {
          email: 'test@company.com',
          phone: '+44 20 1234 5678'
        }
        company.updateContactInfo(contactInfo)
        expect(company.hasCompleteContactInfo()).toBe(true)
      })

      it('should identify companies without complete contact info', () => {
        expect(company.hasCompleteContactInfo()).toBe(false)
      })

      it('should identify companies with web presence', () => {
        expect(company.hasWebPresence()).toBe(true)
        
        const companyNoWebsite = CompanyEntity.create(
          'test', 'Test Co', 'UK', ['70100'], 0.8, mockSourceMetadata
        )
        expect(companyNoWebsite.hasWebPresence()).toBe(false)
      })
    })
  })

  describe('Update Operations', () => {
    let company: CompanyEntity

    beforeEach(() => {
      company = CompanyEntity.create(
        'company-123',
        'Test Company Ltd',
        'UK',
        ['70100'],
        0.85,
        mockSourceMetadata
      )
    })

    it('should update confidence score', () => {
      company.updateConfidenceScore(0.95)
      expect(company.confidenceScore).toBe(0.95)
    })

    it('should validate confidence score on update', () => {
      expect(() => {
        company.updateConfidenceScore(1.5)
      }).toThrow('Confidence score must be between 0 and 1')
    })

    it('should update name', () => {
      company.updateName('New Company Name')
      expect(company.name).toBe('New Company Name')
    })

    it('should validate name on update', () => {
      expect(() => {
        company.updateName('')
      }).toThrow('Company name cannot be empty')
    })

    it('should update industry codes', () => {
      company.updateIndustryCodes(['80100', '80200'])
      expect(company.industryCodes).toEqual(['80100', '80200'])
    })

    it('should require at least one industry code', () => {
      expect(() => {
        company.updateIndustryCodes([])
      }).toThrow('Company must have at least one industry code')
    })

    it('should update revenue estimate', () => {
      company.updateRevenueEstimate(2000000)
      expect(company.revenueEstimate).toBe(2000000)
    })

    it('should validate revenue estimate', () => {
      expect(() => {
        company.updateRevenueEstimate(-100)
      }).toThrow('Revenue estimate cannot be negative')
    })

    it('should update website URL', () => {
      company.updateWebsite('https://newwebsite.com')
      expect(company.website).toBe('https://newwebsite.com')
    })

    it('should validate website URL format', () => {
      expect(() => {
        company.updateWebsite('not-a-url')
      }).toThrow('Invalid website URL format')
    })
  })

  describe('Similarity and Comparison', () => {
    let company1: CompanyEntity
    let company2: CompanyEntity

    beforeEach(() => {
      company1 = CompanyEntity.create(
        'company-1',
        'Test Company Ltd',
        'UK',
        ['70100'],
        0.85,
        mockSourceMetadata,
        'REG123456'
      )
    })

    it('should identify equal companies by ID', () => {
      const sameCompany = CompanyEntity.create(
        'company-1', // Same ID
        'Different Name',
        'UK',
        ['70100'],
        0.85,
        mockSourceMetadata
      )
      expect(company1.equals(sameCompany)).toBe(true)
    })

    it('should identify similar companies by registration number', () => {
      company2 = CompanyEntity.create(
        'company-2', // Different ID
        'Different Name',
        'UK',
        ['70100'],
        0.85,
        mockSourceMetadata,
        'REG123456' // Same registration number
      )
      expect(company1.isSimilarTo(company2)).toBe(true)
    })

    it('should identify similar companies by name', () => {
      company2 = CompanyEntity.create(
        'company-2',
        'Test Company Limited', // Similar name
        'UK',
        ['70100'],
        0.85,
        mockSourceMetadata
      )
      expect(company1.isSimilarTo(company2, 0.5)).toBe(true)
    })

    it('should not identify dissimilar companies', () => {
      company2 = CompanyEntity.create(
        'company-2',
        'Completely Different Name',
        'UK',
        ['70100'],
        0.85,
        mockSourceMetadata
      )
      expect(company1.isSimilarTo(company2)).toBe(false)
    })
  })

  describe('Serialization', () => {
    let company: CompanyEntity

    beforeEach(() => {
      company = CompanyEntity.create(
        'company-123',
        'Test Company Ltd',
        'UK',
        ['70100', '70200'],
        0.85,
        mockSourceMetadata,
        'REG123456',
        'https://testcompany.com',
        'A test company',
        '50-100',
        1000000,
        2015,
        mockAddress
      )
    })

    it('should serialize to JSON correctly', () => {
      const json = company.toJSON()
      
      expect(json.id).toBe('company-123')
      expect(json.name).toBe('Test Company Ltd')
      expect(json.country).toBe('UK')
      expect(json.industryCodes).toEqual(['70100', '70200'])
      expect(json.confidenceScore).toBe(0.85)
      expect(json.registrationNumber).toBe('REG123456')
      expect(json.website).toBe('https://testcompany.com')
      expect(json.revenueEstimate).toBe(1000000)
      expect(json.foundingYear).toBe(2015)
      expect(typeof json.createdAt).toBe('string')
      expect(typeof json.updatedAt).toBe('string')
    })

    it('should deserialize from JSON correctly', () => {
      const json = company.toJSON()
      const deserializedCompany = CompanyEntity.fromJSON(json)
      
      expect(deserializedCompany.id).toBe(company.id)
      expect(deserializedCompany.name).toBe(company.name)
      expect(deserializedCompany.country).toBe(company.country)
      expect(deserializedCompany.industryCodes).toEqual(company.industryCodes)
      expect(deserializedCompany.confidenceScore).toBe(company.confidenceScore)
      expect(deserializedCompany.registrationNumber).toBe(company.registrationNumber)
      expect(deserializedCompany.website).toBe(company.website)
      expect(deserializedCompany.revenueEstimate).toBe(company.revenueEstimate)
      expect(deserializedCompany.foundingYear).toBe(company.foundingYear)
    })

    it('should handle round-trip serialization', () => {
      const json = company.toJSON()
      const deserializedCompany = CompanyEntity.fromJSON(json)
      const json2 = deserializedCompany.toJSON()
      
      expect(json).toEqual(json2)
    })
  })

  describe('Domain Events', () => {
    it('should clear domain events when marked as handled', () => {
      const company = CompanyEntity.create(
        'test', 'Test Co', 'UK', ['70100'], 0.8, mockSourceMetadata
      )
      
      expect(company.domainEvents).toHaveLength(1)
      
      company.markEventsAsHandled()
      expect(company.domainEvents).toHaveLength(0)
    })

    it('should not raise events on deserialization', () => {
      const company = CompanyEntity.create(
        'test', 'Test Co', 'UK', ['70100'], 0.8, mockSourceMetadata
      )
      const json = company.toJSON()
      
      const deserializedCompany = CompanyEntity.fromJSON(json)
      expect(deserializedCompany.domainEvents).toHaveLength(0)
    })
  })
})