/**
 * Peer Identification System
 * ML-based peer matching and similarity analysis
 */

import { createClient } from '@/lib/supabase/server'
import type { Row } from '@/lib/supabase/helpers'
import type {
  PeerGroup,
  PeerGroupMember,
  PeerSelectionCriteria,
  IdentifyPeersRequest,
  IdentifyPeersResponse,
  CompanyMetrics
} from '../types/benchmarking'

interface SimilarityFeatures {
  industry_match: number
  size_similarity: number
  growth_similarity: number
  geography_match: number
  business_model_match: number
  performance_similarity: number
  overall_similarity: number
}

interface CompanyFeatures {
  company_id: string
  company_name: string
  industry_codes: string[]
  revenue?: number
  employee_count?: number
  revenue_growth?: number
  location?: string
  business_model?: string
  incorporation_date?: string
  metrics?: CompanyMetrics
}

interface CompanyMetricsRow {
  revenue?: number
  employee_count?: number
  revenue_growth_yoy?: number
  profit_margin?: number
  return_on_equity?: number
  current_ratio?: number
  [key: string]: unknown
}

interface AccountsData {
  turnover?: number
  [key: string]: unknown
}

interface AddressData {
  city?: string
  [key: string]: unknown
}

interface RegisteredOfficeAddress {
  locality?: string
  [key: string]: unknown
}

export class PeerIdentifier {
  private supabase: Awaited<ReturnType<typeof createClient>> | null = null

  constructor() {
    this.initializeClient()
  }

  private async initializeClient() {
    this.supabase = await createClient()
  }

  /**
   * Identify peer companies using ML-based similarity matching
   */
  async identifyPeers(request: IdentifyPeersRequest): Promise<IdentifyPeersResponse> {
    try {
      console.log(`[PeerIdentifier] Identifying peers for company ${request.company_id}`)

      // Get target company features
      const targetCompany = await this.getCompanyFeatures(request.company_id)
      if (!targetCompany) {
        throw new Error('Target company not found')
      }

      // Get candidate companies based on criteria
      const candidates = await this.getCandidateCompanies(targetCompany, request.criteria)

      // Calculate similarity scores
      const peersWithScores = await this.calculateSimilarities(targetCompany, candidates)

      // Filter and rank peers
      const filteredPeers = this.filterAndRankPeers(
        peersWithScores,
        request.max_peers || 20,
        request.include_competitors || false,
        request.include_aspirational || false
      )

      // Enhance with additional metadata
      const enrichedPeers = await this.enrichPeerData(filteredPeers, targetCompany)

      return {
        success: true,
        peers: enrichedPeers,
        total_candidates: candidates.length,
        selection_method: 'ml_similarity_matching'
      }

    } catch (error) {
      console.error('[PeerIdentifier] Error:', error)
      return {
        success: false,
        peers: []
      }
    }
  }

  /**
   * Create or update a peer group
   */
  async createPeerGroup(
    name: string,
    description: string,
    companyIds: string[],
    criteria?: PeerSelectionCriteria
  ): Promise<PeerGroup> {
    try {
      // Create peer group
      const result = await this.supabase
        .from('peer_groups')
        // @ts-expect-error - Supabase type inference issue with insert() method
        .insert({
          name,
          description,
          selection_criteria: criteria || {},
          member_count: companyIds.length,
          created_at: new Date().toISOString()
        })
        .select()
        .single() as { data: Row<'peer_groups'> | null; error: any }

      const { data: peerGroup, error: groupError } = result

      if (groupError || !peerGroup) throw groupError || new Error('Failed to create peer group')

      // Type assertion for peer group
      const typedPeerGroup = peerGroup as Row<'peer_groups'>

      // Add members
      const members = companyIds.map(companyId => ({
        peer_group_id: typedPeerGroup.id,
        company_id: companyId,
        is_active: true
      }))

      const { error: memberError } = await this.supabase
        .from('peer_group_members')
        // @ts-expect-error - Supabase type inference issue with insert() method
        .insert(members)

      if (memberError) throw memberError

      return typedPeerGroup

    } catch (error) {
      console.error('[PeerIdentifier] Error creating peer group:', error)
      throw error
    }
  }

  /**
   * Get company features for similarity calculation
   */
  private async getCompanyFeatures(companyId: string): Promise<CompanyFeatures | null> {
    const { data: company } = await this.supabase
      .from('businesses')
      .select('*')
      .eq('id', companyId)
      .single() as { data: Row<'businesses'> | null; error: any }

    if (!company) return null

    // Get latest metrics - table may not exist, handle gracefully
    let metrics: CompanyMetricsRow | null = null
    try {
      const result = await this.supabase
        .from('company_metrics')
        .select('*')
        .eq('company_id', companyId)
        .order('metric_date', { ascending: false })
        .limit(1)
        .single()
      metrics = result.data as CompanyMetricsRow | null
    } catch {
      // Ignore error if table doesn't exist
    }

    const accounts = company.accounts as AccountsData | null
    const address = company.address as AddressData | null
    const registeredOffice = company.registered_office_address as RegisteredOfficeAddress | null

    return {
      company_id: company.id,
      company_name: company.name,
      industry_codes: company.sic_codes || [],
      revenue: metrics?.revenue || accounts?.turnover,
      employee_count: metrics?.employee_count, // businesses table doesn't have employee_count field
      revenue_growth: metrics?.revenue_growth_yoy,
      location: address?.city || registeredOffice?.locality,
      business_model: this.inferBusinessModel(company),
      incorporation_date: company.incorporation_date,
      metrics: metrics as any
    }
  }

  /**
   * Get candidate companies based on criteria
   */
  private async getCandidateCompanies(
    targetCompany: CompanyFeatures,
    criteria?: PeerSelectionCriteria
  ): Promise<CompanyFeatures[]> {
    let query = this.supabase.from('businesses').select('*')

    // Apply criteria filters
    if (criteria?.industry_codes && criteria.industry_codes.length > 0) {
      query = query.contains('sic_codes', criteria.industry_codes)
    } else if (targetCompany.industry_codes.length > 0) {
      // Use target company's industry as default
      const primaryIndustry = targetCompany.industry_codes[0].substring(0, 2)
      query = query.contains('sic_codes', [primaryIndustry])
    }

    // Size filter
    if (criteria?.size_range) {
      // Note: This would need actual revenue data in the database
      // For now, we'll get all and filter later
    }

    // Geography filter
    if (criteria?.geography && criteria.geography.length > 0) {
      // Would filter by location - simplified for now
    }

    // Exclude the target company
    query = query.neq('id', targetCompany.company_id)

    const { data: companies } = await query.limit(100) as { data: Row<'businesses'>[] | null; error: any }

    if (!companies) return []

    // Convert to features
    const features = await Promise.all(
      companies.map(async (company) => {
        // Note: company_metrics table may not exist, gracefully handle
        let metrics: CompanyMetricsRow | null = null
        try {
          const result = await this.supabase
            .from('company_metrics')
            .select('*')
            .eq('company_id', company.id)
            .order('metric_date', { ascending: false })
            .limit(1)
            .single()
          metrics = result.data as CompanyMetricsRow | null
        } catch {
          // Ignore error if table doesn't exist
        }

        const accounts = company.accounts as AccountsData | null
        const address = company.address as AddressData | null
        const registeredOffice = company.registered_office_address as RegisteredOfficeAddress | null

        return {
          company_id: company.id,
          company_name: company.name,
          industry_codes: company.sic_codes || [],
          revenue: metrics?.revenue || accounts?.turnover,
          employee_count: metrics?.employee_count, // businesses table doesn't have employee_count field
          revenue_growth: metrics?.revenue_growth_yoy,
          location: address?.city || registeredOffice?.locality,
          business_model: this.inferBusinessModel(company),
          incorporation_date: company.incorporation_date,
          metrics: metrics as any
        }
      })
    )

    // Apply size filters if specified
    let filtered = features
    if (criteria?.size_range) {
      filtered = features.filter(f => {
        if (criteria.size_range?.min_revenue && f.revenue) {
          if (f.revenue < criteria.size_range.min_revenue) return false
        }
        if (criteria.size_range?.max_revenue && f.revenue) {
          if (f.revenue > criteria.size_range.max_revenue) return false
        }
        if (criteria.size_range?.min_employees && f.employee_count) {
          if (f.employee_count < criteria.size_range.min_employees) return false
        }
        if (criteria.size_range?.max_employees && f.employee_count) {
          if (f.employee_count > criteria.size_range.max_employees) return false
        }
        return true
      })
    }

    return filtered
  }

  /**
   * Calculate similarity scores between target and candidates
   */
  private async calculateSimilarities(
    target: CompanyFeatures,
    candidates: CompanyFeatures[]
  ): Promise<Array<CompanyFeatures & { similarity_score: number, similarity_features: SimilarityFeatures }>> {
    return candidates.map(candidate => {
      const features = this.calculateSimilarityFeatures(target, candidate)
      return {
        ...candidate,
        similarity_score: features.overall_similarity,
        similarity_features: features
      }
    })
  }

  /**
   * Calculate similarity features between two companies
   */
  private calculateSimilarityFeatures(
    target: CompanyFeatures,
    candidate: CompanyFeatures
  ): SimilarityFeatures {
    // Industry similarity
    const industry_match = this.calculateIndustryMatch(
      target.industry_codes,
      candidate.industry_codes
    )

    // Size similarity (revenue and employees)
    const size_similarity = this.calculateSizeSimilarity(
      target.revenue,
      candidate.revenue,
      target.employee_count,
      candidate.employee_count
    )

    // Growth similarity
    const growth_similarity = this.calculateGrowthSimilarity(
      target.revenue_growth,
      candidate.revenue_growth
    )

    // Geographic similarity
    const geography_match = this.calculateGeographyMatch(
      target.location,
      candidate.location
    )

    // Business model similarity
    const business_model_match = this.calculateBusinessModelMatch(
      target.business_model,
      candidate.business_model
    )

    // Performance similarity (from metrics)
    const performance_similarity = this.calculatePerformanceSimilarity(
      target.metrics,
      candidate.metrics
    )

    // Calculate weighted overall similarity
    const overall_similarity = this.calculateOverallSimilarity({
      industry_match,
      size_similarity,
      growth_similarity,
      geography_match,
      business_model_match,
      performance_similarity
    })

    return {
      industry_match,
      size_similarity,
      growth_similarity,
      geography_match,
      business_model_match,
      performance_similarity,
      overall_similarity
    }
  }

  /**
   * Calculate industry match score
   */
  private calculateIndustryMatch(targetCodes: string[], candidateCodes: string[]): number {
    if (targetCodes.length === 0 || candidateCodes.length === 0) return 0.5

    // Check for exact matches
    const exactMatches = targetCodes.filter(code => candidateCodes.includes(code))
    if (exactMatches.length > 0) return 1.0

    // Check for same 2-digit division
    const targetDivisions = targetCodes.map(c => c.substring(0, 2))
    const candidateDivisions = candidateCodes.map(c => c.substring(0, 2))
    const divisionMatches = targetDivisions.filter(d => candidateDivisions.includes(d))
    if (divisionMatches.length > 0) return 0.8

    // Check for same section (first digit)
    const targetSections = targetCodes.map(c => c.substring(0, 1))
    const candidateSections = candidateCodes.map(c => c.substring(0, 1))
    const sectionMatches = targetSections.filter(s => candidateSections.includes(s))
    if (sectionMatches.length > 0) return 0.6

    return 0.2
  }

  /**
   * Calculate size similarity
   */
  private calculateSizeSimilarity(
    targetRevenue?: number,
    candidateRevenue?: number,
    targetEmployees?: number,
    candidateEmployees?: number
  ): number {
    const scores = []

    // Revenue similarity
    if (targetRevenue && candidateRevenue) {
      const ratio = Math.min(targetRevenue, candidateRevenue) / Math.max(targetRevenue, candidateRevenue)
      scores.push(ratio)
    }

    // Employee similarity
    if (targetEmployees && candidateEmployees) {
      const ratio = Math.min(targetEmployees, candidateEmployees) / Math.max(targetEmployees, candidateEmployees)
      scores.push(ratio)
    }

    if (scores.length === 0) return 0.5

    return scores.reduce((a, b) => a + b, 0) / scores.length
  }

  /**
   * Calculate growth similarity
   */
  private calculateGrowthSimilarity(
    targetGrowth?: number,
    candidateGrowth?: number
  ): number {
    if (!targetGrowth || !candidateGrowth) return 0.5

    // Similar growth rates (within 10 percentage points)
    const difference = Math.abs(targetGrowth - candidateGrowth)
    if (difference <= 10) return 1.0
    if (difference <= 20) return 0.8
    if (difference <= 30) return 0.6
    if (difference <= 50) return 0.4
    return 0.2
  }

  /**
   * Calculate geography match
   */
  private calculateGeographyMatch(
    targetLocation?: string,
    candidateLocation?: string
  ): number {
    if (!targetLocation || !candidateLocation) return 0.5

    // Simple string matching for now
    if (targetLocation === candidateLocation) return 1.0
    if (targetLocation.toLowerCase().includes(candidateLocation.toLowerCase()) ||
        candidateLocation.toLowerCase().includes(targetLocation.toLowerCase())) {
      return 0.7
    }

    return 0.3
  }

  /**
   * Calculate business model match
   */
  private calculateBusinessModelMatch(
    targetModel?: string,
    candidateModel?: string
  ): number {
    if (!targetModel || !candidateModel) return 0.5
    return targetModel === candidateModel ? 1.0 : 0.3
  }

  /**
   * Calculate performance similarity based on metrics
   */
  private calculatePerformanceSimilarity(
    targetMetrics?: CompanyMetrics,
    candidateMetrics?: CompanyMetrics
  ): number {
    if (!targetMetrics || !candidateMetrics) return 0.5

    const scores = []

    // Compare key performance metrics
    const metricsToCompare = [
      'profit_margin',
      'return_on_equity',
      'current_ratio',
      'revenue_growth_yoy'
    ]

    for (const metric of metricsToCompare) {
      const targetValue = (targetMetrics as Record<string, unknown>)[metric]
      const candidateValue = (candidateMetrics as Record<string, unknown>)[metric]

      if (targetValue !== undefined && candidateValue !== undefined && targetValue !== 0) {
        const ratio = Math.min(Math.abs(targetValue), Math.abs(candidateValue)) /
                     Math.max(Math.abs(targetValue), Math.abs(candidateValue))
        scores.push(ratio)
      }
    }

    if (scores.length === 0) return 0.5

    return scores.reduce((a, b) => a + b, 0) / scores.length
  }

  /**
   * Calculate overall similarity score
   */
  private calculateOverallSimilarity(features: Omit<SimilarityFeatures, 'overall_similarity'>): number {
    // Weights for different features
    const weights = {
      industry_match: 0.25,
      size_similarity: 0.20,
      growth_similarity: 0.15,
      geography_match: 0.10,
      business_model_match: 0.15,
      performance_similarity: 0.15
    }

    let weightedSum = 0
    let totalWeight = 0

    for (const [feature, weight] of Object.entries(weights)) {
      const value = (features as any)[feature]
      if (value !== undefined) {
        weightedSum += value * weight
        totalWeight += weight
      }
    }

    return totalWeight > 0 ? weightedSum / totalWeight : 0
  }

  /**
   * Filter and rank peers
   */
  private filterAndRankPeers(
    peers: Array<CompanyFeatures & { similarity_score: number, similarity_features: SimilarityFeatures }>,
    maxPeers: number,
    includeCompetitors: boolean,
    includeAspirational: boolean
  ): typeof peers {
    // Sort by similarity score
    let sorted = peers.sort((a, b) => b.similarity_score - a.similarity_score)

    // Filter by minimum similarity threshold
    sorted = sorted.filter(p => p.similarity_score >= 0.3)

    // Take top N peers
    let selected = sorted.slice(0, maxPeers)

    // Add competitors if requested (high industry match)
    if (includeCompetitors) {
      const competitors = sorted
        .filter(p => p.similarity_features.industry_match >= 0.8)
        .slice(0, Math.floor(maxPeers * 0.3))

      selected = this.mergePeers(selected, competitors)
    }

    // Add aspirational peers if requested (better performance)
    if (includeAspirational) {
      const aspirational = sorted
        .filter(p => p.similarity_features.performance_similarity >= 0.7 && p.revenue && p.revenue > 0)
        .sort((a, b) => (b.revenue || 0) - (a.revenue || 0))
        .slice(0, Math.floor(maxPeers * 0.2))

      selected = this.mergePeers(selected, aspirational)
    }

    return selected.slice(0, maxPeers)
  }

  /**
   * Merge peer lists without duplicates
   */
  private mergePeers<T extends { company_id: string }>(list1: T[], list2: T[]): T[] {
    const ids = new Set(list1.map(p => p.company_id))
    const toAdd = list2.filter(p => !ids.has(p.company_id))
    return [...list1, ...toAdd]
  }

  /**
   * Enrich peer data with additional metadata
   */
  private async enrichPeerData(
    peers: Array<CompanyFeatures & { similarity_score: number, similarity_features: SimilarityFeatures }>,
    targetCompany: CompanyFeatures
  ): Promise<Array<{
    company_id: string
    company_name: string
    similarity_score: number
    matching_criteria: string[]
    is_competitor?: boolean
    is_aspirational?: boolean
  }>> {
    return peers.map(peer => {
      const matching_criteria = []

      // Identify matching criteria
      if (peer.similarity_features.industry_match >= 0.8) {
        matching_criteria.push('Same industry')
      }
      if (peer.similarity_features.size_similarity >= 0.7) {
        matching_criteria.push('Similar size')
      }
      if (peer.similarity_features.growth_similarity >= 0.7) {
        matching_criteria.push('Similar growth rate')
      }
      if (peer.similarity_features.geography_match >= 0.7) {
        matching_criteria.push('Same region')
      }
      if (peer.similarity_features.performance_similarity >= 0.7) {
        matching_criteria.push('Similar performance')
      }

      // Determine if competitor or aspirational
      const is_competitor = peer.similarity_features.industry_match >= 0.8 &&
                           peer.similarity_features.geography_match >= 0.5

      const is_aspirational = peer.revenue && targetCompany.revenue &&
                             peer.revenue > targetCompany.revenue * 1.5 &&
                             peer.similarity_features.performance_similarity >= 0.6

      return {
        company_id: peer.company_id,
        company_name: peer.company_name,
        similarity_score: peer.similarity_score,
        matching_criteria,
        is_competitor,
        is_aspirational
      }
    })
  }

  /**
   * Infer business model from company data
   */
  private inferBusinessModel(company: any): string {
    const sicCode = company.sic_codes?.[0] || ''

    // Simple heuristic based on SIC code
    if (sicCode.startsWith('47')) return 'B2C Retail'
    if (sicCode.startsWith('46')) return 'B2B Wholesale'
    if (sicCode.startsWith('62') || sicCode.startsWith('63')) return 'B2B Services'
    if (sicCode.startsWith('10') || sicCode.startsWith('11')) return 'Manufacturing'
    if (sicCode.startsWith('64') || sicCode.startsWith('65')) return 'Financial Services'

    return 'General Business'
  }

  /**
   * Update peer group members
   */
  async updatePeerGroupMembers(
    peerGroupId: string,
    companyIds: string[]
  ): Promise<void> {
    try {
      // Deactivate existing members
      await this.supabase
        .from('peer_group_members')
        // @ts-ignore - Type inference issue
        .update({ is_active: false })
        .eq('peer_group_id', peerGroupId)

      // Add new members
      const members = companyIds.map(companyId => ({
        peer_group_id: peerGroupId,
        company_id: companyId,
        is_active: true,
        added_at: new Date().toISOString()
      }))

      await this.supabase
        .from('peer_group_members')
        // @ts-ignore - Supabase type inference issue
        .upsert(members, {
          onConflict: 'peer_group_id,company_id'
        })

      // Update peer group count
      await this.supabase
        .from('peer_groups')
        .update({
          member_count: companyIds.length,
          updated_at: new Date().toISOString()
        })
        .eq('id', peerGroupId)

    } catch (error) {
      console.error('[PeerIdentifier] Error updating peer group:', error)
      throw error
    }
  }

  /**
   * Get peer group details
   */
  async getPeerGroup(peerGroupId: string): Promise<PeerGroup | null> {
    const { data } = await this.supabase
      .from('peer_groups')
      .select('*')
      .eq('id', peerGroupId)
      .single() as { data: Row<'peer_groups'> | null; error: any }

    return data
  }

  /**
   * Get peer group members
   */
  async getPeerGroupMembers(peerGroupId: string): Promise<PeerGroupMember[]> {
    const { data } = await this.supabase
      .from('peer_group_members')
      .select('*')
      .eq('peer_group_id', peerGroupId)
      .eq('is_active', true) as { data: Row<'peer_group_members'>[] | null; error: any }

    return data || []
  }
}

// Export singleton instance
export const peerIdentifier = new PeerIdentifier()