/**
 * Industry Alignment Scorer
 * Evaluates industry/vertical alignment for business fit
 */

export interface IndustryScore {
  score: number
  factors: Array<{
    name: string
    value: number
    impact: 'positive' | 'negative' | 'neutral'
    explanation: string
  }>
  data_quality: number
  missing_data: string[]
}

export class IndustryAlignmentScorer {
  // Target industries for high scoring (can be customized per org)
  private targetIndustries = {
    'technology': ['62', '63'], // IT and communication
    'financial': ['64', '65', '66'], // Financial services
    'manufacturing': ['10', '11', '12', '13', '14', '15'], // Manufacturing
    'retail': ['47'], // Retail trade
    'professional': ['69', '70', '71', '72', '73', '74'], // Professional services
  }

  async calculateScore(company: any): Promise<IndustryScore> {
    console.log(`[IndustryScorer] Calculating score for ${company.name}`)

    const factors = []
    const missingData = []
    let score = 50 // Base score

    // Check SIC codes
    if (company.sic_codes && Array.isArray(company.sic_codes) && company.sic_codes.length > 0) {
      const industryMatch = this.evaluateIndustryMatch(company.sic_codes)

      factors.push({
        name: 'Industry Match',
        value: industryMatch.score,
        impact: industryMatch.score > 60 ? 'positive' : industryMatch.score < 40 ? 'negative' : 'neutral',
        explanation: industryMatch.explanation
      })

      score = industryMatch.score
    } else {
      missingData.push('SIC codes')
      factors.push({
        name: 'Industry Classification',
        value: 0,
        impact: 'negative' as const,
        explanation: 'No industry classification available'
      })
      score = 30
    }

    // Check company type for B2B alignment
    if (company.company_type) {
      const b2bScore = this.evaluateB2BAlignment(company.company_type)
      factors.push({
        name: 'B2B Alignment',
        value: b2bScore,
        impact: b2bScore > 60 ? 'positive' : 'neutral',
        explanation: this.explainB2BAlignment(company.company_type)
      })
      score = (score + b2bScore) / 2
    }

    // Check company size/maturity
    if (company.date_of_creation || company.incorporation_date) {
      const maturityScore = this.evaluateCompanyMaturity(
        company.date_of_creation || company.incorporation_date
      )
      factors.push({
        name: 'Company Maturity',
        value: maturityScore,
        impact: maturityScore > 60 ? 'positive' : 'neutral',
        explanation: this.explainMaturity(maturityScore)
      })
      score = (score * 0.8) + (maturityScore * 0.2)
    }

    const dataQuality = 100 - (missingData.length * 25)

    return {
      score: Math.min(100, Math.max(0, Math.round(score))),
      factors,
      data_quality: Math.max(0, dataQuality),
      missing_data: missingData
    }
  }

  private evaluateIndustryMatch(sicCodes: string[]): { score: number; explanation: string } {
    let bestMatch = 0
    let matchedIndustry = ''

    for (const [industry, codes] of Object.entries(this.targetIndustries)) {
      const hasMatch = sicCodes.some(sic =>
        codes.some(target => sic.startsWith(target))
      )

      if (hasMatch) {
        bestMatch = 85
        matchedIndustry = industry
        break
      }
    }

    if (bestMatch > 0) {
      return {
        score: bestMatch,
        explanation: `Strong alignment with ${matchedIndustry} sector`
      }
    }

    // Check for generally favorable industries
    const firstTwo = sicCodes[0]?.substring(0, 2)
    if (firstTwo) {
      const num = parseInt(firstTwo)
      if (num >= 45 && num <= 82) {
        return {
          score: 60,
          explanation: 'Service sector company with potential fit'
        }
      }
    }

    return {
      score: 40,
      explanation: 'Industry sector requires further evaluation'
    }
  }

  private evaluateB2BAlignment(companyType: string): number {
    const b2bTypes = ['ltd', 'plc', 'llp', 'private-limited', 'public-limited']
    const b2cTypes = ['sole-trader', 'partnership']

    if (b2bTypes.some(type => companyType.toLowerCase().includes(type))) {
      return 75
    } else if (b2cTypes.some(type => companyType.toLowerCase().includes(type))) {
      return 40
    }

    return 50
  }

  private explainB2BAlignment(companyType: string): string {
    if (companyType.toLowerCase().includes('ltd') || companyType.toLowerCase().includes('plc')) {
      return 'Limited company structure indicates B2B focus'
    }
    return `${companyType} structure - evaluate B2B potential`
  }

  private evaluateCompanyMaturity(dateCreated: string): number {
    const created = new Date(dateCreated)
    const now = new Date()
    const years = (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24 * 365)

    if (years > 10) return 85 // Well-established
    if (years > 5) return 75 // Established
    if (years > 3) return 65 // Growing
    if (years > 1) return 55 // Early stage
    return 45 // Startup
  }

  private explainMaturity(score: number): string {
    if (score >= 85) return 'Well-established company with proven track record'
    if (score >= 75) return 'Established company with solid market presence'
    if (score >= 65) return 'Growing company with emerging market position'
    if (score >= 55) return 'Early-stage company with growth potential'
    return 'Startup phase - higher risk but potential opportunity'
  }
}