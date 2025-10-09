/**
 * Company Domain Entity
 * Represents the core business object for companies in the acquisition intelligence system
 */

import { DomainEvent } from '../events/domain-event.base'
import { CompanyCreatedEvent } from '../events/company.events'
import { Address, ContactInfo, SourceMetadata } from '../../core/interfaces'

export class CompanyEntity {
  private _domainEvents: DomainEvent[] = []

  constructor(
    private readonly _id: string,
    private _name: string,
    private readonly _registrationNumber: string | null,
    private readonly _country: string,
    private _industryCodes: readonly string[],
    private _website: string | null,
    private _description: string | null,
    private _employeeCount: string | null,
    private _revenueEstimate: number | null,
    private _foundingYear: number | null,
    private _address: Address | null,
    private _contactInfo: ContactInfo | null,
    private _confidenceScore: number,
    private _sourceMetadata: SourceMetadata,
    private readonly _createdAt: Date = new Date(),
    private _updatedAt: Date = new Date()
  ) {
    this.validateConfidenceScore(_confidenceScore)
    this.validateName(_name)
    this.validateCountry(_country)
    
    // Raise domain event for new company creation
    if (this._createdAt.getTime() === this._updatedAt.getTime()) {
      this.addDomainEvent(new CompanyCreatedEvent(this))
    }
  }

  // Getters for immutable properties
  get id(): string { return this._id }
  get name(): string { return this._name }
  get registrationNumber(): string | null { return this._registrationNumber }
  get country(): string { return this._country }
  get industryCodes(): readonly string[] { return this._industryCodes }
  get website(): string | null { return this._website }
  get description(): string | null { return this._description }
  get employeeCount(): string | null { return this._employeeCount }
  get revenueEstimate(): number | null { return this._revenueEstimate }
  get foundingYear(): number | null { return this._foundingYear }
  get address(): Address | null { return this._address }
  get contactInfo(): ContactInfo | null { return this._contactInfo }
  get confidenceScore(): number { return this._confidenceScore }
  get sourceMetadata(): SourceMetadata { return this._sourceMetadata }
  get createdAt(): Date { return this._createdAt }
  get updatedAt(): Date { return this._updatedAt }
  get domainEvents(): readonly DomainEvent[] { return this._domainEvents }

  // Business methods
  updateConfidenceScore(newScore: number): void {
    this.validateConfidenceScore(newScore)
    
    if (this._confidenceScore !== newScore) {
      const oldScore = this._confidenceScore
      this._confidenceScore = newScore
      this._updatedAt = new Date()
      
      // Could add domain event for confidence score changes if needed
      // this.addDomainEvent(new CompanyConfidenceUpdatedEvent(this, oldScore, newScore))
    }
  }

  updateName(newName: string): void {
    this.validateName(newName)
    
    if (this._name !== newName) {
      this._name = newName
      this._updatedAt = new Date()
    }
  }

  updateIndustryCodes(newCodes: readonly string[]): void {
    if (newCodes.length === 0) {
      throw new Error('Company must have at least one industry code')
    }
    
    this._industryCodes = newCodes
    this._updatedAt = new Date()
  }

  updateContactInfo(contactInfo: ContactInfo | null): void {
    this._contactInfo = contactInfo
    this._updatedAt = new Date()
  }

  updateAddress(address: Address | null): void {
    this._address = address
    this._updatedAt = new Date()
  }

  updateRevenueEstimate(revenue: number | null): void {
    if (revenue !== null && revenue < 0) {
      throw new Error('Revenue estimate cannot be negative')
    }
    
    this._revenueEstimate = revenue
    this._updatedAt = new Date()
  }

  updateEmployeeCount(employeeCount: string | null): void {
    this._employeeCount = employeeCount
    this._updatedAt = new Date()
  }

  updateWebsite(website: string | null): void {
    if (website && !this.isValidUrl(website)) {
      throw new Error('Invalid website URL format')
    }
    
    this._website = website
    this._updatedAt = new Date()
  }

  updateDescription(description: string | null): void {
    this._description = description
    this._updatedAt = new Date()
  }

  // Business logic methods
  isHighConfidence(): boolean {
    return this._confidenceScore >= 0.8
  }

  isMediumConfidence(): boolean {
    return this._confidenceScore >= 0.5 && this._confidenceScore < 0.8
  }

  isLowConfidence(): boolean {
    return this._confidenceScore < 0.5
  }

  hasCompleteContactInfo(): boolean {
    return this._contactInfo !== null && 
           (this._contactInfo.email !== undefined || 
            this._contactInfo.phone !== undefined)
  }

  hasWebPresence(): boolean {
    return this._website !== null && this._website.length > 0
  }

  isEstablishedCompany(): boolean {
    if (!this._foundingYear) return false
    const currentYear = new Date().getFullYear()
    return (currentYear - this._foundingYear) >= 5
  }

  getCompanyAge(): number | null {
    if (!this._foundingYear) return null
    return new Date().getFullYear() - this._foundingYear
  }

  isInIndustry(sicCode: string): boolean {
    return this._industryCodes.includes(sicCode)
  }

  matchesIndustries(sicCodes: readonly string[]): boolean {
    return sicCodes.some(code => this.isInIndustry(code))
  }

  // Comparison and equality
  equals(other: CompanyEntity): boolean {
    return this._id === other._id
  }

  isSimilarTo(other: CompanyEntity, threshold: number = 0.8): boolean {
    // Simple similarity check based on name and registration number
    if (this._registrationNumber && other._registrationNumber) {
      return this._registrationNumber === other._registrationNumber
    }
    
    // Name-based similarity (simplified)
    const nameScore = this.calculateNameSimilarity(this._name, other._name)
    return nameScore >= threshold
  }

  // Validation methods
  private validateConfidenceScore(score: number): void {
    if (score < 0 || score > 1) {
      throw new Error('Confidence score must be between 0 and 1')
    }
  }

  private validateName(name: string): void {
    if (!name || name.trim().length === 0) {
      throw new Error('Company name cannot be empty')
    }
    
    if (name.length > 200) {
      throw new Error('Company name cannot exceed 200 characters')
    }
  }

  private validateCountry(country: string): void {
    if (!country || country.trim().length === 0) {
      throw new Error('Country cannot be empty')
    }
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url.startsWith('http') ? url : `https://${url}`)
      return true
    } catch {
      return false
    }
  }

  private calculateNameSimilarity(name1: string, name2: string): number {
    // Simple Jaccard similarity - in production would use more sophisticated algorithm
    const normalize = (str: string) => str.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/)
    
    const tokens1 = new Set(normalize(name1))
    const tokens2 = new Set(normalize(name2))
    
    const intersection = new Set([...tokens1].filter(x => tokens2.has(x)))
    const union = new Set([...tokens1, ...tokens2])
    
    return intersection.size / union.size
  }

  // Domain event management
  private addDomainEvent(event: DomainEvent): void {
    this._domainEvents.push(event)
  }

  markEventsAsHandled(): void {
    this._domainEvents.length = 0
  }

  // Factory methods
  static create(
    id: string,
    name: string,
    country: string,
    industryCodes: readonly string[],
    confidenceScore: number,
    sourceMetadata: SourceMetadata,
    registrationNumber?: string,
    website?: string,
    description?: string,
    employeeCount?: string,
    revenueEstimate?: number,
    foundingYear?: number,
    address?: Address,
    contactInfo?: ContactInfo
  ): CompanyEntity {
    return new CompanyEntity(
      id,
      name,
      registrationNumber ?? null,
      country,
      industryCodes,
      website ?? null,
      description ?? null,
      employeeCount ?? null,
      revenueEstimate ?? null,
      foundingYear ?? null,
      address ?? null,
      contactInfo ?? null,
      confidenceScore,
      sourceMetadata
    )
  }

  // Serialization
  toJSON(): Record<string, unknown> {
    return {
      id: this._id,
      name: this._name,
      registrationNumber: this._registrationNumber,
      country: this._country,
      industryCodes: this._industryCodes,
      website: this._website,
      description: this._description,
      employeeCount: this._employeeCount,
      revenueEstimate: this._revenueEstimate,
      foundingYear: this._foundingYear,
      address: this._address,
      contactInfo: this._contactInfo,
      confidenceScore: this._confidenceScore,
      sourceMetadata: this._sourceMetadata,
      createdAt: this._createdAt.toISOString(),
      updatedAt: this._updatedAt.toISOString()
    }
  }

  static fromJSON(data: Record<string, unknown>): CompanyEntity {
    return new CompanyEntity(
      data.id,
      data.name,
      data.registrationNumber,
      data.country,
      data.industryCodes || [],
      data.website,
      data.description,
      data.employeeCount,
      data.revenueEstimate,
      data.foundingYear,
      data.address,
      data.contactInfo,
      data.confidenceScore,
      data.sourceMetadata,
      // @ts-ignore - Supabase type inference issue
      new Date(data.createdAt),
      new Date(data.updatedAt)
    )
  }
}