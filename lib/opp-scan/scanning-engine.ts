import { createClient } from '@/lib/supabase/server'

// Types for the scanning engine
interface ScanConfig {
  scan_id: string
  selected_industries: any[]
  selected_regions: any[]
  data_sources: string[]
  scan_depth: 'basic' | 'detailed' | 'comprehensive'
  required_capabilities: any[]
}

interface DataSourceResult {
  source: string
  companies: CompanyData[]
  metadata: {
    total_results: number
    confidence: number
    cost: number
    processing_time: number
  }
}

interface CompanyData {
  name: string
  registration_number?: string
  country: string
  industry_codes: string[]
  website?: string
  description?: string
  employee_count?: string
  revenue_estimate?: number
  founding_year?: number
  address?: any
  phone?: string
  email?: string
  confidence_score: number
  source_metadata: any
}

class OppScanEngine {
  private supabase: any

  constructor() {
    this.supabase = createClient()
  }

  // Main scanning orchestrator
  async executeScan(scanId: string): Promise<void> {
    try {
      console.log(`Starting scan execution for scan ID: ${scanId}`)

      // Get scan configuration
      const { data: scan, error } = await this.supabase
        .from('acquisition_scans')
        .select('*')
        .eq('id', scanId)
        .single()

      if (error || !scan) {
        throw new Error(`Failed to load scan configuration: ${error?.message}`)
      }

      // Update scan status
      await this.updateScanStatus(scanId, 'scanning', 'data_collection', 5)

      // Execute data collection from all configured sources
      const results = await this.collectDataFromSources(scan)
      
      await this.updateScanStatus(scanId, 'scanning', 'data_processing', 25)

      // Process and deduplicate results
      const processedCompanies = await this.processAndDeduplicateResults(results, scan)
      
      await this.updateScanStatus(scanId, 'scanning', 'target_creation', 50)

      // Create target companies
      const targetIds = await this.createTargetCompanies(scanId, processedCompanies)
      
      await this.updateScanStatus(scanId, 'analyzing', 'financial_analysis', 60)

      // Run analysis on targets
      await this.analyzeTargets(scanId, targetIds, scan)
      
      await this.updateScanStatus(scanId, 'analyzing', 'risk_assessment', 80)

      // Generate market intelligence
      await this.generateMarketIntelligence(scanId, scan, processedCompanies)
      
      await this.updateScanStatus(scanId, 'completed', 'completed', 100)

      console.log(`Scan ${scanId} completed successfully`)
    } catch (error) {
      console.error(`Scan ${scanId} failed:`, error)
      await this.updateScanStatus(scanId, 'failed', 'error', null, error.message)
    }
  }

  // Collect data from all configured sources
  private async collectDataFromSources(scan: any): Promise<DataSourceResult[]> {
    const results: DataSourceResult[] = []

    for (const sourceId of scan.data_sources) {
      try {
        console.log(`Collecting data from source: ${sourceId}`)
        const sourceResult = await this.collectFromDataSource(sourceId, scan)
        results.push(sourceResult)
        
        // Add delay to respect rate limits
        await this.delay(1000)
      } catch (error) {
        console.error(`Failed to collect from source ${sourceId}:`, error)
        // Continue with other sources
      }
    }

    return results
  }

  // Collect data from a specific data source
  private async collectFromDataSource(sourceId: string, scan: any): Promise<DataSourceResult> {
    switch (sourceId) {
      case 'companies_house':
        return this.collectFromCompaniesHouse(scan)
      case 'irish_cro':
        return this.collectFromIrishCRO(scan)
      case 'financial_data':
        return this.collectFromFinancialData(scan)
      case 'digital_footprint':
        return this.collectFromDigitalFootprint(scan)
      case 'patents_ip':
        return this.collectFromPatentsIP(scan)
      default:
        return this.simulateDataCollection(sourceId, scan)
    }
  }

  // Companies House data collection (simplified simulation)
  private async collectFromCompaniesHouse(scan: any): Promise<DataSourceResult> {
    console.log('Collecting from Companies House...')
    
    // In a real implementation, this would make API calls to Companies House
    // For demo purposes, we'll simulate finding companies
    const companies: CompanyData[] = []
    
    for (const industry of scan.selected_industries) {
      // Simulate finding companies in each industry
      const industryCompanies = this.generateSimulatedCompanies(
        'companies_house',
        industry,
        scan.selected_regions.filter((r: any) => r.country === 'England' || r.country === 'Scotland' || r.country === 'Wales'),
        Math.floor(Math.random() * 50) + 10
      )
      companies.push(...industryCompanies)
    }

    return {
      source: 'companies_house',
      companies,
      metadata: {
        total_results: companies.length,
        confidence: 0.95,
        cost: 0, // Free source
        processing_time: Date.now()
      }
    }
  }

  // Irish CRO data collection (simplified simulation)
  private async collectFromIrishCRO(scan: any): Promise<DataSourceResult> {
    console.log('Collecting from Irish Companies Registration Office...')
    
    const companies: CompanyData[] = []
    
    const irishRegions = scan.selected_regions.filter((r: any) => r.country === 'Ireland')
    if (irishRegions.length > 0) {
      for (const industry of scan.selected_industries) {
        const industryCompanies = this.generateSimulatedCompanies(
          'irish_cro',
          industry,
          irishRegions,
          Math.floor(Math.random() * 30) + 5
        )
        companies.push(...industryCompanies)
      }
    }

    return {
      source: 'irish_cro',
      companies,
      metadata: {
        total_results: companies.length,
        confidence: 0.93,
        cost: companies.length * 2, // €2 per search
        processing_time: Date.now()
      }
    }
  }

  // Financial data collection (simulation)
  private async collectFromFinancialData(scan: any): Promise<DataSourceResult> {
    console.log('Collecting financial intelligence data...')
    
    // This would integrate with services like Experian, D&B, etc.
    // For demo, we'll enhance existing companies with financial data
    const companies = this.generateFinancialEnrichmentData(scan)

    return {
      source: 'financial_data',
      companies,
      metadata: {
        total_results: companies.length,
        confidence: 0.88,
        cost: companies.length * 25, // £25 per company
        processing_time: Date.now()
      }
    }
  }

  // Digital footprint analysis (simulation)
  private async collectFromDigitalFootprint(scan: any): Promise<DataSourceResult> {
    console.log('Analyzing digital footprint...')
    
    const companies = this.generateDigitalFootprintData(scan)

    return {
      source: 'digital_footprint',
      companies,
      metadata: {
        total_results: companies.length,
        confidence: 0.75,
        cost: companies.length * 10, // £10 per analysis
        processing_time: Date.now()
      }
    }
  }

  // Patents and IP data collection (simulation)
  private async collectFromPatentsIP(scan: any): Promise<DataSourceResult> {
    console.log('Collecting intellectual property data...')
    
    const companies = this.generateIPData(scan)

    return {
      source: 'patents_ip',
      companies,
      metadata: {
        total_results: companies.length,
        confidence: 0.92,
        cost: companies.length * 5, // £5 per search
        processing_time: Date.now()
      }
    }
  }

  // Simulate data collection for other sources
  private async simulateDataCollection(sourceId: string, scan: any): Promise<DataSourceResult> {
    console.log(`Simulating data collection from ${sourceId}...`)
    
    const companies = this.generateSimulatedCompanies(
      sourceId,
      scan.selected_industries[0] || { industry: 'Technology' },
      scan.selected_regions,
      Math.floor(Math.random() * 20) + 5
    )

    return {
      source: sourceId,
      companies,
      metadata: {
        total_results: companies.length,
        confidence: 0.70,
        cost: companies.length * 15,
        processing_time: Date.now()
      }
    }
  }

  // Generate simulated company data
  private generateSimulatedCompanies(
    source: string,
    industry: any,
    regions: any[],
    count: number
  ): CompanyData[] {
    const companies: CompanyData[] = []
    const businessTypes = ['Ltd', 'PLC', 'Limited', 'Technologies', 'Solutions', 'Services', 'Group']
    const domains = ['tech', 'finance', 'health', 'energy', 'retail', 'manufacturing']

    for (let i = 0; i < count; i++) {
      const region = regions[Math.floor(Math.random() * regions.length)]
      const businessType = businessTypes[Math.floor(Math.random() * businessTypes.length)]
      const domain = domains[Math.floor(Math.random() * domains.length)]
      
      const companyName = `${this.generateCompanyName(industry.industry || 'Technology')} ${businessType}`
      
      companies.push({
        name: companyName,
        registration_number: source === 'companies_house' ? 
          this.generateCompaniesHouseNumber() : 
          this.generateRegistrationNumber(region?.country || 'UK'),
        country: region?.country || 'UK',
        industry_codes: [industry.sic_code || '62020'],
        website: `https://www.${companyName.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '')}.co.uk`,
        description: this.generateBusinessDescription(industry.industry || 'Technology'),
        employee_count: this.generateEmployeeRange(),
        revenue_estimate: Math.floor(Math.random() * 10000000) + 100000,
        founding_year: 2000 + Math.floor(Math.random() * 24),
        address: this.generateAddress(region),
        confidence_score: 0.7 + (Math.random() * 0.3),
        source_metadata: {
          source,
          discovered_at: new Date().toISOString(),
          search_terms: [industry.industry],
          region: region?.name
        }
      })
    }

    return companies
  }

  // Process and deduplicate results
  private async processAndDeduplicateResults(
    results: DataSourceResult[],
    scan: any
  ): Promise<CompanyData[]> {
    console.log('Processing and deduplicating results...')
    
    const allCompanies = results.flatMap(result => result.companies)
    const deduplicatedCompanies: CompanyData[] = []
    const seenCompanies = new Set<string>()

    for (const company of allCompanies) {
      // Create a unique key for deduplication
      const key = `${company.name.toLowerCase()}-${company.country}-${company.registration_number || 'unknown'}`
      
      if (!seenCompanies.has(key)) {
        seenCompanies.add(key)
        
        // Apply strategic fit scoring based on scan requirements
        const strategicFitScore = this.calculateStrategicFit(company, scan)
        company.confidence_score = (company.confidence_score + strategicFitScore) / 2
        
        // Only include companies that meet minimum criteria
        if (company.confidence_score >= 0.4) {
          deduplicatedCompanies.push(company)
        }
      }
    }

    console.log(`Deduplicated ${allCompanies.length} companies to ${deduplicatedCompanies.length}`)
    return deduplicatedCompanies.sort((a, b) => b.confidence_score - a.confidence_score)
  }

  // Create target company records
  private async createTargetCompanies(scanId: string, companies: CompanyData[]): Promise<string[]> {
    console.log(`Creating ${companies.length} target company records...`)
    
    const targetIds: string[] = []
    
    for (const company of companies.slice(0, 100)) { // Limit to top 100 for demo
      try {
        const { data: target, error } = await this.supabase
          .from('target_companies')
          .insert({
            scan_id: scanId,
            company_name: company.name,
            companies_house_number: company.registration_number,
            registration_country: company.country,
            website: company.website,
            industry_codes: company.industry_codes,
            business_description: company.description,
            year_incorporated: company.founding_year,
            employee_count_range: company.employee_count,
            registered_address: company.address,
            phone: company.phone,
            email: company.email,
            discovery_source: company.source_metadata.source,
            discovery_method: 'automated_scan',
            discovery_confidence: company.confidence_score,
            overall_score: 0.0,
            strategic_fit_score: company.confidence_score,
            financial_health_score: 0.5,
            risk_score: 0.3,
            analysis_status: 'pending'
          })
          .select('id')
          .single()

        if (target) {
          targetIds.push(target.id)
        }
      } catch (error) {
        console.error('Failed to create target company:', error)
      }
    }

    // Update scan targets count
    await this.supabase.rpc('increment_scan_targets', { 
      scan_id: scanId, 
      increment: targetIds.length 
    })

    return targetIds
  }

  // Analyze target companies
  private async analyzeTargets(scanId: string, targetIds: string[], scan: any): Promise<void> {
    console.log(`Analyzing ${targetIds.length} target companies...`)
    
    let processedCount = 0
    
    for (const targetId of targetIds) {
      try {
        // Generate financial analysis
        await this.generateFinancialAnalysis(targetId)
        
        // Generate risk assessment
        await this.generateRiskAssessment(targetId)
        
        // Generate due diligence summary
        await this.generateDueDiligence(targetId)
        
        // Update target status
        await this.supabase
          .from('target_companies')
          .update({ 
            analysis_status: 'completed',
            analyzed_at: new Date().toISOString()
          })
          .eq('id', targetId)

        processedCount++
        
        // Update progress
        if (processedCount % 10 === 0) {
          const progressPercentage = 60 + Math.floor((processedCount / targetIds.length) * 20)
          await this.updateScanStatus(scanId, 'analyzing', 'financial_analysis', progressPercentage)
        }
        
        // Add delay to simulate processing time
        await this.delay(100)
      } catch (error) {
        console.error(`Failed to analyze target ${targetId}:`, error)
      }
    }

    // Update analyzed targets count
    await this.supabase.rpc('increment_analyzed_targets', { 
      scan_id: scanId, 
      increment: processedCount 
    })
  }

  // Generate market intelligence
  private async generateMarketIntelligence(scanId: string, scan: any, companies: CompanyData[]): Promise<void> {
    console.log('Generating market intelligence...')
    
    const industryAnalysis = this.analyzeIndustryTrends(companies, scan)
    const competitiveLandscape = this.analyzeCompetition(companies, scan)
    const marketOpportunities = this.identifyOpportunities(companies, scan)

    await this.supabase
      .from('market_intelligence')
      .update({
        total_competitors: companies.length,
        market_concentration: this.calculateMarketConcentration(companies),
        key_trends: industryAnalysis.trends,
        growth_drivers: industryAnalysis.drivers,
        challenges: industryAnalysis.challenges,
        ma_activity_level: this.assessMAActivity(companies),
        recent_transactions: competitiveLandscape.recent_deals,
        average_valuation_multiples: competitiveLandscape.valuations,
        analysis_date: new Date().toISOString().split('T')[0],
        confidence_level: 0.8
      })
      .eq('scan_id', scanId)
  }

  // Helper methods for analysis
  private calculateStrategicFit(company: CompanyData, scan: any): number {
    let fitScore = 0.5 // Base score
    
    // Industry alignment
    const industryMatch = scan.selected_industries.some((industry: any) =>
      company.industry_codes.some((code: string) => code.startsWith(industry.sic_code?.substring(0, 2)))
    )
    if (industryMatch) fitScore += 0.2
    
    // Regional preference
    const regionMatch = scan.selected_regions.some((region: any) => region.country === company.country)
    if (regionMatch) fitScore += 0.15
    
    // Capability alignment (simplified)
    if (scan.required_capabilities.length > 0) {
      const capabilityMatch = scan.required_capabilities.some((cap: any) =>
        company.description?.toLowerCase().includes(cap.name.toLowerCase().split(' ')[0])
      )
      if (capabilityMatch) fitScore += 0.15
    }
    
    return Math.min(1.0, fitScore)
  }

  // Update scan status and progress
  private async updateScanStatus(
    scanId: string,
    status: string,
    step: string,
    progress?: number | null,
    error?: string
  ): Promise<void> {
    const updateData: any = {
      status,
      current_step: step,
      updated_at: new Date().toISOString()
    }

    if (progress !== null && progress !== undefined) {
      updateData.progress_percentage = progress
    }

    if (status === 'completed') {
      updateData.completed_at = new Date().toISOString()
    }

    if (error) {
      updateData.error_message = error
    }

    await this.supabase
      .from('acquisition_scans')
      .update(updateData)
      .eq('id', scanId)
  }

  // Utility methods
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // Data generation helpers (for simulation)
  private generateCompanyName(industry: string): string {
    const prefixes = ['Advanced', 'Digital', 'Smart', 'Global', 'Premier', 'Innovative', 'Elite']
    const suffixes = ['Solutions', 'Systems', 'Technologies', 'Innovations', 'Dynamics', 'Ventures']
    
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)]
    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)]
    
    return `${prefix} ${industry} ${suffix}`
  }

  private generateCompaniesHouseNumber(): string {
    return Math.floor(Math.random() * 90000000 + 10000000).toString()
  }

  private generateRegistrationNumber(country: string): string {
    if (country === 'Ireland') {
      return Math.floor(Math.random() * 900000 + 100000).toString()
    }
    return this.generateCompaniesHouseNumber()
  }

  private generateBusinessDescription(industry: string): string {
    const descriptions = {
      'Technology': 'Provides innovative technology solutions and software development services',
      'Manufacturing': 'Specializes in manufacturing and production of industrial components',
      'Financial Services': 'Offers comprehensive financial services and advisory solutions',
      'Healthcare': 'Delivers healthcare services and medical technology solutions',
      'Energy': 'Develops and operates renewable energy and sustainability projects',
      'Retail': 'Operates retail channels and e-commerce platforms',
      'Real Estate': 'Provides property development and real estate investment services'
    }
    
    return descriptions[industry] || `Provides ${industry.toLowerCase()} services and solutions`
  }

  private generateEmployeeRange(): string {
    const ranges = ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+']
    return ranges[Math.floor(Math.random() * ranges.length)]
  }

  private generateAddress(region: any): any {
    return {
      street: `${Math.floor(Math.random() * 999) + 1} Business Park`,
      city: region?.name || 'London',
      country: region?.country || 'UK',
      postal_code: this.generatePostalCode(region?.country || 'UK')
    }
  }

  private generatePostalCode(country: string): string {
    if (country === 'Ireland') {
      return `D${Math.floor(Math.random() * 24) + 1}`
    }
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    const numbers = '0123456789'
    return `${letters[Math.floor(Math.random() * 26)]}${letters[Math.floor(Math.random() * 26)]}${numbers[Math.floor(Math.random() * 10)]} ${numbers[Math.floor(Math.random() * 10)]}${letters[Math.floor(Math.random() * 26)]}${letters[Math.floor(Math.random() * 26)]}`
  }

  // Financial analysis generation (simplified)
  private async generateFinancialAnalysis(targetId: string): Promise<void> {
    const revenue = Math.floor(Math.random() * 50000000) + 500000
    const grossMargin = 0.2 + (Math.random() * 0.6)
    const ebitdaMargin = 0.05 + (Math.random() * 0.3)
    
    await this.supabase
      .from('financial_analysis')
      .insert({
        target_company_id: targetId,
        analysis_year: 2024,
        revenue: revenue,
        gross_profit: revenue * grossMargin,
        ebitda: revenue * ebitdaMargin,
        gross_margin: grossMargin,
        ebitda_margin: ebitdaMargin,
        revenue_growth_3y: -0.1 + (Math.random() * 0.5),
        altman_z_score: 1 + (Math.random() * 4),
        data_quality_score: 0.6 + (Math.random() * 0.3),
        valuation_confidence: 'medium'
      })
  }

  // Risk assessment generation (simplified)
  private async generateRiskAssessment(targetId: string): Promise<void> {
    const riskCategories = ['low', 'moderate', 'high']
    const overallRisk = Math.random()
    const riskCategory = overallRisk < 0.3 ? 'low' : overallRisk < 0.7 ? 'moderate' : 'high'
    
    await this.supabase
      .from('risk_assessments')
      .insert({
        target_company_id: targetId,
        financial_risk_score: Math.random(),
        operational_risk_score: Math.random(),
        regulatory_risk_score: Math.random(),
        market_risk_score: Math.random(),
        technology_risk_score: Math.random(),
        esg_risk_score: Math.random(),
        overall_risk_score: overallRisk,
        risk_category: riskCategory,
        assessment_method: 'automated',
        confidence_level: 0.7 + (Math.random() * 0.2)
      })
  }

  // Due diligence generation (simplified)
  private async generateDueDiligence(targetId: string): Promise<void> {
    const recommendations = ['proceed', 'proceed_with_conditions', 'further_investigation', 'reject']
    const scores = [0.8, 0.65, 0.5, 0.3]
    const recIndex = Math.floor(Math.random() * recommendations.length)
    
    await this.supabase
      .from('due_diligence')
      .insert({
        target_company_id: targetId,
        document_completeness_score: 0.6 + (Math.random() * 0.3),
        due_diligence_score: scores[recIndex] + (Math.random() * 0.1),
        recommendation: recommendations[recIndex],
        analysis_depth: 'standard',
        automation_confidence: 0.7,
        manual_review_required: Math.random() > 0.7
      })
  }

  // Market analysis helpers (simplified)
  private analyzeIndustryTrends(companies: CompanyData[], scan: any) {
    return {
      trends: ['Digital transformation acceleration', 'Sustainability focus increasing', 'Remote work normalization'],
      drivers: ['Technology adoption', 'Regulatory changes', 'Consumer behavior shifts'],
      challenges: ['Economic uncertainty', 'Talent shortage', 'Supply chain disruption']
    }
  }

  private analyzeCompetition(companies: CompanyData[], scan: any) {
    return {
      recent_deals: [`Acquisition of ${companies[0]?.name} for £${Math.floor(Math.random() * 50)}M`],
      valuations: {
        revenue_multiple: 2 + (Math.random() * 4),
        ebitda_multiple: 8 + (Math.random() * 8)
      }
    }
  }

  private identifyOpportunities(companies: CompanyData[], scan: any) {
    return {
      market_gaps: ['Underserved SME segment', 'Rural market penetration'],
      consolidation_opportunities: companies.length > 50 ? 'high' : 'moderate'
    }
  }

  private calculateMarketConcentration(companies: CompanyData[]): string {
    return companies.length > 100 ? 'fragmented' : companies.length > 20 ? 'moderate' : 'concentrated'
  }

  private assessMAActivity(companies: CompanyData[]): string {
    return Math.random() > 0.5 ? 'high' : 'moderate'
  }

  // Additional data generation methods for different sources
  private generateFinancialEnrichmentData(scan: any): CompanyData[] {
    // This would enhance existing company data with financial metrics
    return []
  }

  private generateDigitalFootprintData(scan: any): CompanyData[] {
    // This would analyze web presence, SEO, social media
    return []
  }

  private generateIPData(scan: any): CompanyData[] {
    // This would analyze patent portfolios, trademarks
    return []
  }
}

export { OppScanEngine }
export type { ScanConfig, DataSourceResult, CompanyData }