/**
 * SimilarCompanyUseCase: Orchestration service for Similar Company analysis
 * Coordinates the complete workflow from company input to similarity analysis
 * Built for enterprise MnA decision making with comprehensive error handling
 */

import { createClient } from '@/lib/supabase/server'
import { WebSearchService } from './web-search-service'
import { SimilarityScoringService } from './similarity-scoring-service'
import { SimilarityExplanationService } from './similarity-explanation-service'

import {
  SimilarityEntity,
  SimilarCompanyMatch,
  SimilarityConfiguration,
  SimilarityAnalysisStatus,
  MnAInsights,
  MnABenchmarkEntity,
  CompanySearchQuery,
  EnrichedCompanyData,
  ConfidenceLevel
} from '../core/similarity-interfaces'
import { CompanyEntity } from '../core/interfaces'

interface AnalysisRequest {
  targetCompanyName: string
  userId: string
  orgId?: string
  configuration: SimilarityConfiguration
  analysisId?: string
}

interface AnalysisProgress {
  stage: 'validation' | 'search' | 'enrichment' | 'scoring' | 'explanation' | 'storage' | 'completed'
  progress: number
  message: string
  currentTask?: string
}

interface AnalysisMetrics {
  totalProcessingTime: number
  apiCallsMade: number
  llmTokensUsed: number
  totalCost: number
  companiesAnalyzed: number
  cacheHitRate: number
  errorCount: number
}

interface AnalysisResult {
  similarityAnalysis: SimilarityEntity
  metrics: AnalysisMetrics
  success: boolean
  errors: string[]
  warnings: string[]
}

export class SimilarCompanyUseCase {
  private supabase: any
  private webSearchService: WebSearchService
  private scoringService: SimilarityScoringService
  private explanationService: SimilarityExplanationService
  private progressCallbacks = new Map<string, (progress: AnalysisProgress) => void>()

  constructor() {
    // Don't initialize in constructor to avoid cookies error
    this.supabase = null
    this.webSearchService = new WebSearchService()
    this.scoringService = new SimilarityScoringService()
    this.explanationService = new SimilarityExplanationService()
  }
  
  private async getSupabase() {
    if (!this.supabase) {
      this.supabase = await createClient()
    }
    return this.supabase
  }

  /**
   * Execute complete similar company analysis workflow
   */
  async executeSimilarityAnalysis(
    request: AnalysisRequest,
    progressCallback?: (progress: AnalysisProgress) => void
  ): Promise<AnalysisResult> {
    const startTime = Date.now()
    const analysisId = request.analysisId || this.generateAnalysisId()
    const metrics: AnalysisMetrics = {
      totalProcessingTime: 0,
      apiCallsMade: 0,
      llmTokensUsed: 0,
      totalCost: 0,
      companiesAnalyzed: 0,
      cacheHitRate: 0,
      errorCount: 0
    }
    const errors: string[] = []
    const warnings: string[] = []

    try {
      // Register progress callback
      if (progressCallback) {
        this.progressCallbacks.set(analysisId, progressCallback)
      }

      // Create analysis record in database
      const analysisRecord = await this.createAnalysisRecord(request, analysisId)
      
      // Stage 1: Validate target company
      await this.updateProgress(analysisId, {
        stage: 'validation',
        progress: 5,
        message: 'Validating target company',
        currentTask: `Searching for "${request.targetCompanyName}"`
      })

      const targetCompany = await this.validateAndEnrichTargetCompany(request.targetCompanyName)
      if (!targetCompany) {
        throw new Error(`Target company "${request.targetCompanyName}" could not be validated or found`)
      }

      // Stage 2: Search for similar companies
      await this.updateProgress(analysisId, {
        stage: 'search',
        progress: 15,
        message: 'Searching for similar companies',
        currentTask: 'Executing multi-source search'
      })

      const searchQuery: CompanySearchQuery = {
        query: this.buildSearchQuery(targetCompany, request.configuration),
        industry: targetCompany.industryCodes[0],
        region: targetCompany.country,
        maxResults: request.configuration.maxResults
      }

      let searchResults: CompanySearchResult[] = []
      
      try {
        searchResults = await this.webSearchService.searchCompanies(searchQuery)
        metrics.apiCallsMade += this.webSearchService.getProviderStats()?.totalRequests || 0
        metrics.totalCost += this.webSearchService.getTotalCost()
        
        console.log(`[SimilarCompanyUseCase] Search returned ${searchResults.length} results for "${request.targetCompanyName}"`)
        
        if (searchResults.length === 0) {
          console.warn(`[SimilarCompanyUseCase] No results found. Possible causes:
            1. No external API keys configured (check GET /api/diagnostics)
            2. Database has no matching businesses
            3. Target company name doesn't match any records
            Run diagnostics: curl http://localhost:3001/api/diagnostics`)
          
          warnings.push('No similar companies found. This may be due to missing API configurations or limited data.')
          
          // Try a more relaxed search
          console.log('[SimilarCompanyUseCase] Attempting fallback search with relaxed criteria...')
          const fallbackQuery: CompanySearchQuery = {
            query: request.targetCompanyName.split(' ')[0], // Use first word only
            maxResults: request.configuration.maxResults * 2
          }
          
          searchResults = await this.webSearchService.searchCompanies(fallbackQuery)
          
          if (searchResults.length > 0) {
            console.log(`[SimilarCompanyUseCase] Fallback search found ${searchResults.length} results`)
            warnings.push('Used relaxed search criteria to find potential matches.')
          }
        }
      } catch (searchError: any) {
        console.error('[SimilarCompanyUseCase] Search service failed:', searchError)
        errors.push(`Search service error: ${searchError.message}`)
        warnings.push('Search service encountered an error. Using limited results.')
        
        // Continue with empty results rather than failing entirely
        searchResults = []
      }
      
      if (searchResults.length === 0) {
        console.error('[SimilarCompanyUseCase] No search results available. Analysis will be limited.')
        warnings.push('No similar companies found in any data source.')
      }

      // Stage 3: Enrich company data
      await this.updateProgress(analysisId, {
        stage: 'enrichment',
        progress: 35,
        message: 'Enriching company data',
        currentTask: `Processing ${searchResults.length} candidate companies`
      })

      const enrichedCandidates = await this.enrichCandidateCompanies(
        searchResults.map(result => result.company),
        metrics
      )

      // Create MnA benchmark profiles for scoring
      const targetBenchmark = await this.createOrGetBenchmarkProfile(targetCompany)
      const candidateBenchmarks = await this.createBenchmarkProfiles(enrichedCandidates)

      // Stage 4: Calculate similarity scores
      await this.updateProgress(analysisId, {
        stage: 'scoring',
        progress: 55,
        message: 'Calculating similarity scores',
        currentTask: 'Running MnA-specific algorithms'
      })

      const scoredMatches: SimilarCompanyMatch[] = []
      for (let i = 0; i < enrichedCandidates.length; i++) {
        const candidate = enrichedCandidates[i]
        const candidateBenchmark = candidateBenchmarks[i]

        if (!candidateBenchmark) continue

        try {
          const scoringContext = {
            targetCompany,
            candidateCompany: candidate.company,
            targetBenchmark,
            candidateBenchmark,
            configuration: request.configuration
          }

          const scoringResult = await this.scoringService.calculateSimilarityScores(scoringContext)
          
          const match: SimilarCompanyMatch = {
            company: candidate.company,
            overallScore: scoringResult.overallScore,
            confidence: this.mapConfidenceToNumber(scoringResult.confidence),
            benchmarkScores: scoringResult.scores,
            explanation: {
              summary: '',
              keyReasons: [],
              financialRationale: '',
              strategicRationale: '',
              riskConsiderations: '',
              confidenceLevel: scoringResult.confidence
            },
            riskFactors: [],
            opportunities: [],
            rank: i + 1,
            marketPosition: this.determineMarketPosition(candidate.company, scoringResult.scores)
          }

          scoredMatches.push(match)
          metrics.companiesAnalyzed++
        } catch (error) {
          console.error(`Error scoring candidate ${candidate.company.name}:`, error)
          errors.push(`Scoring failed for ${candidate.company.name}: ${error.message}`)
          metrics.errorCount++
        }
      }

      // Sort by similarity score and update ranks
      scoredMatches.sort((a, b) => b.overallScore - a.overallScore)
      scoredMatches.forEach((match, index) => {
        match.rank = index + 1
      })

      // Stage 5: Generate explanations
      if (request.configuration.includeExplanations) {
        await this.updateProgress(analysisId, {
          stage: 'explanation',
          progress: 75,
          message: 'Generating AI explanations',
          currentTask: 'Creating MnA-focused insights'
        })

        await this.generateExplanationsForMatches(
          targetCompany,
          scoredMatches.slice(0, 10), // Generate explanations for top 10 matches
          metrics
        )

        // Generate overall MnA insights
        const mnaInsights = await this.generateMnAInsights(
          targetCompany,
          scoredMatches,
          request.configuration,
          metrics
        )
      }

      // Stage 6: Store results
      await this.updateProgress(analysisId, {
        stage: 'storage',
        progress: 90,
        message: 'Storing analysis results',
        currentTask: 'Saving to database'
      })

      const similarityAnalysis = await this.storeAnalysisResults(
        analysisRecord,
        targetCompany,
        scoredMatches,
        request.configuration,
        metrics
      )

      // Stage 7: Complete
      await this.updateProgress(analysisId, {
        stage: 'completed',
        progress: 100,
        message: 'Analysis completed successfully',
        currentTask: `Found ${scoredMatches.length} similar companies`
      })

      // Calculate final metrics
      metrics.totalProcessingTime = Date.now() - startTime
      metrics.cacheHitRate = this.calculateCacheHitRate(metrics)

      // Record usage tracking
      await this.recordFeatureUsage(request, analysisRecord.id, metrics)

      return {
        similarityAnalysis,
        metrics,
        success: true,
        errors,
        warnings
      }

    } catch (error) {
      console.error('Similarity analysis failed:', error)
      metrics.errorCount++
      errors.push(error.message)

      // Update analysis record with error status
      await this.updateAnalysisStatus(analysisId, 'failed', error.message)

      return {
        similarityAnalysis: null as unknown,
        metrics: {
          ...metrics,
          totalProcessingTime: Date.now() - startTime
        },
        success: false,
        errors,
        warnings
      }
    } finally {
      // Clean up progress callback
      this.progressCallbacks.delete(analysisId)
    }
  }

  /**
   * Get cached analysis results if available
   */
  async getCachedAnalysis(
    targetCompanyName: string,
    userId: string,
    configuration: SimilarityConfiguration
  ): Promise<SimilarityEntity | null> {
    try {
      const cacheKey = this.generateCacheKey(targetCompanyName, configuration)
      
      const supabase = await this.getSupabase()
      const { data: analysis, error } = await supabase
        .from('similarity_analyses')
        .select(`
          *,
          similar_company_matches (
            *,
            similarity_explanations (*)
          )
        `)
        .eq('user_id', userId)
        .eq('target_company_name', targetCompanyName)
        .eq('cache_key', cacheKey)
        .eq('status', 'completed')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (error || !analysis) {
        return null
      }

      return this.mapDatabaseToSimilarityEntity(analysis)
    } catch (error) {
      console.error('Error retrieving cached analysis:', error)
      return null
    }
  }

  /**
   * Cancel ongoing analysis
   */
  async cancelAnalysis(analysisId: string, userId: string): Promise<boolean> {
    try {
      const supabase = await this.getSupabase()
      const { error } = await supabase
        .from('similarity_analyses')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', analysisId)
        .eq('user_id', userId)

      return !error
    } catch (error) {
      console.error('Error cancelling analysis:', error)
      return false
    }
  }

  // Private helper methods

  private async createAnalysisRecord(
    request: AnalysisRequest,
    analysisId: string
  ): Promise<unknown> {
    const cacheKey = this.generateCacheKey(request.targetCompanyName, request.configuration)
    const supabase = await this.getSupabase()
    
    const { data: analysis, error } = await supabase
      .from('similarity_analyses')
      .insert({
        id: analysisId,
        user_id: request.userId,
        org_id: request.orgId,
        target_company_name: request.targetCompanyName,
        analysis_configuration: request.configuration,
        filter_criteria: request.configuration.filterCriteria || {},
        status: 'searching',
        cache_key: cacheKey,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create analysis record: ${error.message}`)
    }

    return analysis
  }

  private async validateAndEnrichTargetCompany(companyName: string): Promise<CompanyEntity | null> {
    try {
      // First check if company exists through validation
      const validation = await this.webSearchService.validateCompanyExists(companyName)
      
      if (!validation.exists) {
        return null
      }

      // If we have suggested matches, use the best one
      if (validation.suggestedMatches && validation.suggestedMatches.length > 0) {
        const bestMatch = validation.suggestedMatches[0]
        
        // Enrich the company data
        const enrichedData = await this.webSearchService.enrichCompanyData(bestMatch)
        return enrichedData.company
      }

      // Create basic company entity from the name
      return {
        id: this.generateCompanyId(companyName),
        name: companyName,
        country: 'Unknown',
        industryCodes: [],
        confidenceScore: 0.5,
        sourceMetadata: {
          source: 'user_input',
          discoveredAt: new Date(),
          confidence: 0.5
        },
        createdAt: new Date(),
        updatedAt: new Date()
      }
    } catch (error) {
      console.error('Error validating target company:', error)
      return null
    }
  }

  private buildSearchQuery(
    targetCompany: CompanyEntity,
    configuration: SimilarityConfiguration
  ): string {
    let query = targetCompany.name

    // Add industry context
    if (targetCompany.industryCodes.length > 0) {
      query += ` ${targetCompany.industryCodes[0]} industry`
    }

    // Add location context
    if (targetCompany.country && targetCompany.country !== 'Unknown') {
      query += ` ${targetCompany.country}`
    }

    // Add similar companies search terms
    query += ' similar companies competitors alternative'

    return query
  }

  private async enrichCandidateCompanies(
    candidates: CompanyEntity[],
    metrics: AnalysisMetrics
  ): Promise<EnrichedCompanyData[]> {
    const enrichedCandidates: EnrichedCompanyData[] = []

    for (const candidate of candidates) {
      try {
        const enrichedData = await this.webSearchService.enrichCompanyData(candidate)
        enrichedCandidates.push(enrichedData)
        metrics.apiCallsMade += 1
      } catch (error) {
        console.error(`Error enriching candidate ${candidate.name}:`, error)
        // Use basic data if enrichment fails
        enrichedCandidates.push({ company: candidate })
        metrics.errorCount++
      }
    }

    return enrichedCandidates
  }

  private async createOrGetBenchmarkProfile(company: CompanyEntity): Promise<MnABenchmarkEntity> {
    // Check if benchmark profile already exists
    const supabase = await this.getSupabase()
    const { data: existing } = await supabase
      .from('mna_benchmark_profiles')
      .select('*')
      .eq('company_id', company.id)
      .single()

    if (existing) {
      return this.mapDatabaseToBenchmark(existing)
    }

    // Create new benchmark profile
    const benchmarkProfile: Partial<MnABenchmarkEntity> = {
      companyId: company.id,
      // Add default/estimated values based on available data
      dataQualityScore: 0.5,
      dataCompleteness: 0.3,
      sourceReliability: 0.7,
      lastFinancialUpdate: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    }

    const { data: created, error } = await supabase
      .from('mna_benchmark_profiles')
      .insert(benchmarkProfile)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create benchmark profile: ${error.message}`)
    }

    return this.mapDatabaseToBenchmark(created)
  }

  private async createBenchmarkProfiles(
    enrichedCandidates: EnrichedCompanyData[]
  ): Promise<MnABenchmarkEntity[]> {
    const benchmarks: MnABenchmarkEntity[] = []

    for (const enrichedCandidate of enrichedCandidates) {
      try {
        const benchmark = await this.createOrGetBenchmarkProfile(enrichedCandidate.company)
        benchmarks.push(benchmark)
      } catch (error) {
        console.error(`Error creating benchmark for ${enrichedCandidate.company.name}:`, error)
        benchmarks.push(null as unknown) // Push null to maintain array alignment
      }
    }

    return benchmarks
  }

  private async generateExplanationsForMatches(
    targetCompany: CompanyEntity,
    matches: SimilarCompanyMatch[],
    metrics: AnalysisMetrics
  ): Promise<void> {
    for (const match of matches) {
      try {
        const explanationContext = {
          targetCompany,
          similarCompany: match.company,
          benchmarkScores: match.benchmarkScores
        }

        const explanationResult = await this.explanationService.generateSimilarityExplanation(explanationContext)
        
        match.explanation = explanationResult.explanation
        metrics.llmTokensUsed += explanationResult.metrics.tokensUsed
        metrics.totalCost += explanationResult.metrics.cost
      } catch (error) {
        console.error(`Error generating explanation for ${match.company.name}:`, error)
        metrics.errorCount++
      }
    }
  }

  private async generateMnAInsights(
    targetCompany: CompanyEntity,
    matches: SimilarCompanyMatch[],
    configuration: SimilarityConfiguration,
    metrics: AnalysisMetrics
  ): Promise<MnAInsights> {
    try {
      const insightsContext = {
        targetCompany,
        matches,
        analysisConfiguration: configuration
      }

      const insightsResult = await this.explanationService.generateMnAInsights(insightsContext)
      
      metrics.llmTokensUsed += insightsResult.metrics.tokensUsed
      metrics.totalCost += insightsResult.metrics.cost

      return insightsResult.insights
    } catch (error) {
      console.error('Error generating MnA insights:', error)
      metrics.errorCount++
      
      // Return basic insights
      return {
        executiveSummary: `Analysis of ${matches.length} similar companies to ${targetCompany.name}`,
        keyOpportunities: [],
        riskHighlights: [],
        strategicRecommendations: [],
        valuationConsiderations: [],
        integrationConsiderations: []
      }
    }
  }

  private async storeAnalysisResults(
    analysisRecord: any,
    targetCompany: CompanyEntity,
    matches: SimilarCompanyMatch[],
    configuration: SimilarityConfiguration,
    metrics: AnalysisMetrics
  ): Promise<SimilarityEntity> {
    // Update analysis record with results
    const supabase = await this.getSupabase()
    const { data: updatedAnalysis, error: updateError } = await supabase
      .from('similarity_analyses')
      .update({
        target_company_data: targetCompany,
        total_companies_analyzed: matches.length,
        average_similarity_score: matches.length > 0 ? 
          matches.reduce((sum, match) => sum + match.overallScore, 0) / matches.length : 0,
        top_similarity_score: matches.length > 0 ? Math.max(...matches.map(m => m.overallScore)) : 0,
        distribution_by_industry: this.calculateIndustryDistribution(matches),
        distribution_by_region: this.calculateRegionDistribution(matches),
        analysis_completeness: this.calculateCompleteness(metrics),
        data_quality_score: this.calculateDataQuality(matches),
        processing_time_seconds: Math.round(metrics.totalProcessingTime / 1000),
        api_calls_made: metrics.apiCallsMade,
        estimated_cost: metrics.totalCost,
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', analysisRecord.id)
      .select()
      .single()

    if (updateError) {
      throw new Error(`Failed to update analysis record: ${updateError.message}`)
    }

    // Store similar company matches
    if (matches.length > 0) {
      const matchRecords = matches.map((match, index) => ({
        similarity_analysis_id: analysisRecord.id,
        company_id: match.company.id,
        company_name: match.company.name,
        company_data: match.company,
        overall_score: match.overallScore,
        confidence: match.confidence,
        rank: index + 1,
        financial_score: match.benchmarkScores.financial.score,
        strategic_score: match.benchmarkScores.strategic.score,
        operational_score: match.benchmarkScores.operational.score,
        market_score: match.benchmarkScores.market.score,
        risk_score: match.benchmarkScores.risk.score,
        financial_confidence: match.benchmarkScores.financial.confidence,
        strategic_confidence: match.benchmarkScores.strategic.confidence,
        operational_confidence: match.benchmarkScores.operational.confidence,
        market_confidence: match.benchmarkScores.market.confidence,
        risk_confidence: match.benchmarkScores.risk.confidence,
        financial_factors: match.benchmarkScores.financial.contributingFactors,
        strategic_factors: match.benchmarkScores.strategic.contributingFactors,
        operational_factors: match.benchmarkScores.operational.contributingFactors,
        market_factors: match.benchmarkScores.market.contributingFactors,
        risk_factors: match.benchmarkScores.risk.contributingFactors,
        market_position: match.marketPosition,
        risk_factors_identified: match.riskFactors,
        opportunity_areas: match.opportunities,
        data_points_used: match.benchmarkScores.financial.dataPoints +
                         match.benchmarkScores.strategic.dataPoints +
                         match.benchmarkScores.operational.dataPoints +
                         match.benchmarkScores.market.dataPoints +
                         match.benchmarkScores.risk.dataPoints
      }))

      const supabase = await this.getSupabase()
      const { error: matchError } = await supabase
        .from('similar_company_matches')
        .insert(matchRecords)

      if (matchError) {
        console.error('Error storing similarity matches:', matchError)
        // Don't throw error here as main analysis is saved
      }

      // Store explanations for matches that have them
      const explanationRecords = matches
        .filter(match => match.explanation && match.explanation.summary)
        .map(match => {
          const matchRecord = matchRecords.find(r => r.company_name === match.company.name)
          return {
            similar_company_match_id: matchRecord?.id, // Will be populated after insert
            summary: match.explanation.summary,
            key_reasons: match.explanation.keyReasons,
            financial_rationale: match.explanation.financialRationale,
            strategic_rationale: match.explanation.strategicRationale,
            risk_considerations: match.explanation.riskConsiderations,
            confidence_level: match.explanation.confidenceLevel,
            data_quality_note: match.explanation.dataQualityNote,
            llm_model_used: 'anthropic/claude-3.5-sonnet',
            generation_time_seconds: 5, // Approximate
            tokens_used: 1000, // Approximate
            generation_cost: 0.015 // Approximate
          }
        })

      // Note: In a real implementation, you'd need to handle the match_id relationship properly
      // This would require a two-step process or using RETURNING clause
    }

    return this.mapDatabaseToSimilarityEntity(updatedAnalysis)
  }

  private async updateAnalysisStatus(
    analysisId: string,
    status: SimilarityAnalysisStatus,
    errorMessage?: string
  ): Promise<void> {
    const updateData: any = {
      status,
      updated_at: new Date().toISOString()
    }

    if (errorMessage) {
      updateData.error_message = errorMessage
    }

    const supabase = await this.getSupabase()
    await supabase
      .from('similarity_analyses')
      .update(updateData)
      .eq('id', analysisId)
  }

  private async recordFeatureUsage(
    request: AnalysisRequest,
    analysisId: string,
    metrics: AnalysisMetrics
  ): Promise<void> {
    try {
      const supabase = await this.getSupabase()
      await supabase
        .from('similarity_feature_usage')
        .insert({
          user_id: request.userId,
          org_id: request.orgId,
          event_type: 'analysis_completed',
          similarity_analysis_id: analysisId,
          target_company_name: request.targetCompanyName,
          companies_analyzed: metrics.companiesAnalyzed,
          api_calls_made: metrics.apiCallsMade,
          llm_tokens_used: metrics.llmTokensUsed,
          processing_time_seconds: Math.round(metrics.totalProcessingTime / 1000),
          estimated_cost: metrics.totalCost,
          response_time_ms: metrics.totalProcessingTime,
          data_quality_score: this.calculateDataQuality([]),
          feature_version: 'v1.0'
        })
    } catch (error) {
      console.error('Error recording feature usage:', error)
      // Don't throw error as this is just telemetry
    }
  }

  // Utility methods

  private async updateProgress(analysisId: string, progress: AnalysisProgress): Promise<void> {
    const callback = this.progressCallbacks.get(analysisId)
    if (callback) {
      callback(progress)
    }
  }

  private generateAnalysisId(): string {
    return `sim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private generateCompanyId(name: string): string {
    return `comp_${name.toLowerCase().replace(/[^a-z0-9]/g, '')}_${Date.now()}`
  }

  private generateCacheKey(companyName: string, configuration: SimilarityConfiguration): string {
    const keyData = {
      name: companyName.toLowerCase(),
      depth: configuration.analysisDepth,
      weights: configuration.parameterWeights,
      maxResults: configuration.maxResults,
      filters: configuration.filterCriteria
    }
    return Buffer.from(JSON.stringify(keyData)).toString('base64')
  }

  private mapConfidenceToNumber(confidence: ConfidenceLevel): number {
    const mapping = {
      'very_high': 0.95,
      'high': 0.8,
      'medium': 0.65,
      'low': 0.4
    }
    return mapping[confidence] || 0.5
  }

  private determineMarketPosition(
    company: CompanyEntity,
    scores: any
  ): 'leader' | 'challenger' | 'follower' | 'niche' {
    const overallScore = scores.overall || 0
    
    if (overallScore >= 80) return 'leader'
    if (overallScore >= 65) return 'challenger'
    if (overallScore >= 50) return 'follower'
    return 'niche'
  }

  private calculateIndustryDistribution(matches: SimilarCompanyMatch[]): Record<string, number> {
    const distribution: Record<string, number> = {}
    
    matches.forEach(match => {
      match.company.industryCodes.forEach(code => {
        distribution[code] = (distribution[code] || 0) + 1
      })
    })
    
    return distribution
  }

  private calculateRegionDistribution(matches: SimilarCompanyMatch[]): Record<string, number> {
    const distribution: Record<string, number> = {}
    
    matches.forEach(match => {
      const region = match.company.country || 'Unknown'
      distribution[region] = (distribution[region] || 0) + 1
    })
    
    return distribution
  }

  private calculateCompleteness(metrics: AnalysisMetrics): number {
    // Calculate completeness based on successful operations vs total attempts
    const totalOperations = metrics.apiCallsMade + metrics.companiesAnalyzed
    const successfulOperations = totalOperations - metrics.errorCount
    
    return totalOperations > 0 ? successfulOperations / totalOperations : 0
  }

  private calculateDataQuality(matches: SimilarCompanyMatch[]): number {
    if (matches.length === 0) return 0.5
    
    const avgConfidence = matches.reduce((sum, match) => sum + match.confidence, 0) / matches.length
    return avgConfidence
  }

  private calculateCacheHitRate(metrics: AnalysisMetrics): number {
    // This would be calculated based on actual cache hits vs misses
    // For now, return a placeholder
    return 0.2 // 20% cache hit rate
  }

  private mapDatabaseToBenchmark(dbRecord: any): MnABenchmarkEntity {
    // Map database record to MnABenchmarkEntity
    return {
      id: dbRecord.id,
      companyId: dbRecord.company_id,
      benchmarkScores: {
        financial: { score: 0, confidence: 0.5, contributingFactors: [], dataPoints: 0 },
        strategic: { score: 0, confidence: 0.5, contributingFactors: [], dataPoints: 0 },
        operational: { score: 0, confidence: 0.5, contributingFactors: [], dataPoints: 0 },
        market: { score: 0, confidence: 0.5, contributingFactors: [], dataPoints: 0 },
        risk: { score: 0, confidence: 0.5, contributingFactors: [], dataPoints: 0 },
        overall: 0
      },
      dataQuality: {
        completeness: dbRecord.data_completeness || 0,
        accuracy: 0.7,
        freshness: 0.8,
        overall: dbRecord.data_quality_score || 0.5
      },
      lastUpdated: new Date(dbRecord.updated_at),
      sourceReliability: dbRecord.source_reliability || 0.7
    } as MnABenchmarkEntity
  }

  private mapDatabaseToSimilarityEntity(dbRecord: any): SimilarityEntity {
    return {
      id: dbRecord.id,
      targetCompany: dbRecord.target_company_data,
      similarCompanies: dbRecord.similar_company_matches || [],
      analysisConfiguration: dbRecord.analysis_configuration,
      overallSummary: {
        totalCompaniesAnalyzed: dbRecord.total_companies_analyzed || 0,
        averageSimilarityScore: dbRecord.average_similarity_score || 0,
        topSimilarityScore: dbRecord.top_similarity_score || 0,
        distributionByIndustry: dbRecord.distribution_by_industry || {},
        distributionByRegion: dbRecord.distribution_by_region || {},
        analysisCompleteness: dbRecord.analysis_completeness || 0,
        dataQualityScore: dbRecord.data_quality_score || 0
      },
      mnaInsights: {
        executiveSummary: dbRecord.executive_summary || '',
        keyOpportunities: dbRecord.key_opportunities || [],
        riskHighlights: dbRecord.risk_highlights || [],
        strategicRecommendations: dbRecord.strategic_recommendations || [],
        valuationConsiderations: [],
        integrationConsiderations: []
      },
      generatedAt: new Date(dbRecord.created_at),
      userId: dbRecord.user_id,
      orgId: dbRecord.org_id,
      status: dbRecord.status,
      cached: dbRecord.cached || false,
      expiresAt: dbRecord.expires_at ? new Date(dbRecord.expires_at) : undefined
    }
  }

  // Public utility methods

  /**
   * Get analysis status
   */
  async getAnalysisStatus(analysisId: string, userId: string): Promise<unknown> {
    const supabase = await this.getSupabase()
    const { data, error } = await supabase
      .from('similarity_analyses')
      .select('id, status, progress_percentage, current_step, error_message')
      .eq('id', analysisId)
      .eq('user_id', userId)
      .single()

    if (error) return null
    return data
  }

  /**
   * List user's recent analyses
   */
  async getUserAnalyses(userId: string, limit = 10): Promise<SimilarityEntity[]> {
    const supabase = await this.getSupabase()
    const { data, error } = await supabase
      .from('similarity_analyses')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error || !data) return []
    
    return data.map(record => this.mapDatabaseToSimilarityEntity(record))
  }

  /**
   * Get service health status
   */
  async getServiceHealth(): Promise<Record<string, unknown>> {
    const health = {
      webSearch: await this.webSearchService.validateAPIAccess?.() || false,
      llmService: await this.explanationService.validateAPIAccess() || false,
      database: true, // Would check DB connection
      overall: 'healthy'
    }

    if (!health.webSearch || !health.llmService) {
      health.overall = 'degraded'
    }

    return health
  }
}