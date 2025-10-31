/**
 * Market Analyzer for M&A Target Prediction
 *
 * Analyzes market and industry factors to identify acquisition signals:
 * - Industry consolidation rate (M&A activity in SIC code)
 * - Company age (lifecycle stage)
 * - Geographic clustering (regional M&A patterns)
 * - Sector maturity
 *
 * Part of T015 implementation
 */

import { createClient } from '@/lib/supabase/server';

export interface AnalysisResult {
  score: number; // 0-100
  factors: AnalysisFactor[];
  confidence: 'High' | 'Medium' | 'Low';
  dataCompleteness: number; // 0-1
}

export interface AnalysisFactor {
  name: string;
  description: string;
  impact_weight: number; // 0-100
  impact_direction: 'positive' | 'negative' | 'neutral';
  supporting_value?: Record<string, unknown>;
}

interface MarketData {
  sic_code?: string;
  industry?: string;
  incorporation_date?: string;
  registered_office_address?: string;
  region?: string;
}

/**
 * Analyze market and industry factors for M&A target likelihood
 *
 * Scoring methodology:
 * - High industry consolidation (10+ deals in last 2 years): 20 points
 * - Mature sector (established industry): 15 points
 * - Geographic M&A cluster (active region): 10 points
 * - Company in acquisition sweet spot age (7-15 years): 15 points
 *
 * @param companyId - UUID of company to analyze
 * @returns Market analysis result with score and factors
 */
export async function analyzeMarket(companyId: string): Promise<AnalysisResult> {
  const supabase = await createClient();

  // Fetch company market data
  const { data: company, error } = await supabase
    .from('businesses')
    .select('sic_code, industry, incorporation_date, registered_office_address, region')
    .eq('id', companyId)
    .single();

  if (error || !company) {
    throw new Error(`Failed to fetch company data: ${error?.message || 'Company not found'}`);
  }

  const marketData = company as MarketData;

  // Calculate data completeness
  const requiredFields = ['sic_code', 'industry', 'incorporation_date'];
  const presentFields = requiredFields.filter(field => marketData[field as keyof MarketData] !== null && marketData[field as keyof MarketData] !== undefined);
  const dataCompleteness = presentFields.length / requiredFields.length;

  // Determine confidence
  let confidence: 'High' | 'Medium' | 'Low';
  if (dataCompleteness >= 0.8) {
    confidence = 'High';
  } else if (dataCompleteness >= 0.5) {
    confidence = 'Medium';
  } else {
    confidence = 'Low';
  }

  // Insufficient data
  if (dataCompleteness < 0.3) {
    return {
      score: 0,
      factors: [{
        name: 'insufficient_market_data',
        description: 'Insufficient market data to generate reliable analysis',
        impact_weight: 0,
        impact_direction: 'neutral',
        supporting_value: { data_completeness: dataCompleteness }
      }],
      confidence: 'Low',
      dataCompleteness
    };
  }

  const factors: AnalysisFactor[] = [];
  let totalScore = 0;

  // Factor 1: Industry Consolidation Analysis
  if (marketData.sic_code || marketData.industry) {
    const consolidationScore = await analyzeIndustryConsolidation(marketData.sic_code, marketData.industry, supabase);
    totalScore += consolidationScore.score;
    if (consolidationScore.factor) {
      factors.push(consolidationScore.factor);
    }
  }

  // Factor 2: Sector Maturity
  if (marketData.sic_code || marketData.industry) {
    const maturityScore = analyzeSectorMaturity(marketData.sic_code, marketData.industry);
    totalScore += maturityScore.score;
    if (maturityScore.factor) {
      factors.push(maturityScore.factor);
    }
  }

  // Factor 3: Geographic Clustering
  if (marketData.region || marketData.registered_office_address) {
    const geographicScore = await analyzeGeographicClustering(marketData.region, supabase);
    totalScore += geographicScore.score;
    if (geographicScore.factor) {
      factors.push(geographicScore.factor);
    }
  }

  // Normalize score to 0-100 (max possible: 45 points)
  const normalizedScore = Math.min(100, Math.round((totalScore / 45) * 100));

  // Sort factors by impact weight descending
  factors.sort((a, b) => b.impact_weight - a.impact_weight);

  return {
    score: normalizedScore,
    factors: factors.slice(0, 5), // Top 5 factors
    confidence,
    dataCompleteness
  };
}

/**
 * Analyze industry consolidation by checking historical M&A deals in same SIC code
 * High M&A activity in sector = higher likelihood for this company
 */
async function analyzeIndustryConsolidation(
  sicCode?: string,
  industry?: string,
  supabase?: any
): Promise<{ score: number; factor?: AnalysisFactor }> {
  if (!sicCode && !industry) {
    return { score: 0 };
  }

  if (!supabase) {
    return { score: 0 };
  }

  // Query historical M&A deals in same industry (last 2 years)
  const twoYearsAgo = new Date();
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

  const { data: historicalDeals, error } = await supabase
    .from('ma_historical_deals')
    .select('target_company_name, deal_date, deal_value_gbp')
    .or(`target_sic_code.eq.${sicCode},target_industry_description.ilike.%${industry}%`)
    .gte('deal_date', twoYearsAgo.toISOString().split('T')[0])
    .order('deal_date', { ascending: false });

  if (error || !historicalDeals) {
    // No historical data available, return neutral
    return { score: 0 };
  }

  const dealCount = historicalDeals.length;

  // Very high consolidation (10+ deals in 2 years)
  if (dealCount >= 10) {
    return {
      score: 20,
      factor: {
        name: 'very_high_industry_consolidation',
        description: `${dealCount} M&A deals in ${industry || sicCode} sector over last 2 years indicates very active consolidation`,
        impact_weight: 20,
        impact_direction: 'positive',
        supporting_value: { deal_count: dealCount, sector: industry || sicCode, period_years: 2 }
      }
    };
  }

  // High consolidation (5-9 deals)
  if (dealCount >= 5) {
    return {
      score: 15,
      factor: {
        name: 'high_industry_consolidation',
        description: `${dealCount} M&A transactions in ${industry || sicCode} sector suggests active consolidation trend`,
        impact_weight: 15,
        impact_direction: 'positive',
        supporting_value: { deal_count: dealCount, sector: industry || sicCode, period_years: 2 }
      }
    };
  }

  // Moderate consolidation (2-4 deals)
  if (dealCount >= 2) {
    return {
      score: 10,
      factor: {
        name: 'moderate_industry_consolidation',
        description: `${dealCount} recent M&A deals in ${industry || sicCode} sector indicates some consolidation activity`,
        impact_weight: 10,
        impact_direction: 'positive',
        supporting_value: { deal_count: dealCount, sector: industry || sicCode, period_years: 2 }
      }
    };
  }

  // Low consolidation (0-1 deals)
  return {
    score: 0,
    factor: {
      name: 'low_industry_consolidation',
      description: `Only ${dealCount} M&A deal(s) in ${industry || sicCode} sector in last 2 years, limited consolidation activity`,
      impact_weight: 0,
      impact_direction: 'negative',
      supporting_value: { deal_count: dealCount, sector: industry || sicCode, period_years: 2 }
    }
  };
}

/**
 * Analyze sector maturity
 * Mature sectors (finance, retail, manufacturing) see more consolidation than emerging sectors
 */
function analyzeSectorMaturity(sicCode?: string, industry?: string): { score: number; factor?: AnalysisFactor } {
  if (!sicCode && !industry) {
    return { score: 0 };
  }

  const industryLower = (industry || '').toLowerCase();
  const sic = sicCode || '';

  // Mature sectors (high consolidation likelihood)
  const matureSectors = [
    { keywords: ['retail', 'shop', 'store'], sic_prefixes: ['47'], name: 'Retail' },
    { keywords: ['manufacturing', 'production', 'factory'], sic_prefixes: ['25', '26', '27', '28'], name: 'Manufacturing' },
    { keywords: ['construction', 'building', 'contractor'], sic_prefixes: ['41', '42', '43'], name: 'Construction' },
    { keywords: ['professional services', 'consulting', 'legal', 'accounting'], sic_prefixes: ['69', '70'], name: 'Professional Services' },
    { keywords: ['hospitality', 'hotel', 'restaurant', 'catering'], sic_prefixes: ['55', '56'], name: 'Hospitality' }
  ];

  for (const sector of matureSectors) {
    const keywordMatch = sector.keywords.some(kw => industryLower.includes(kw));
    const sicMatch = sector.sic_prefixes.some(prefix => sic.startsWith(prefix));

    if (keywordMatch || sicMatch) {
      return {
        score: 15,
        factor: {
          name: 'mature_sector',
          description: `${sector.name} sector is mature with high consolidation activity`,
          impact_weight: 15,
          impact_direction: 'positive',
          supporting_value: { sector: sector.name, sic_code: sic, industry }
        }
      };
    }
  }

  // Growth sectors (moderate consolidation)
  const growthSectors = [
    { keywords: ['technology', 'software', 'saas', 'tech'], sic_prefixes: ['62', '63'], name: 'Technology' },
    { keywords: ['healthcare', 'medical', 'health'], sic_prefixes: ['86', '87'], name: 'Healthcare' },
    { keywords: ['renewable', 'green energy', 'solar'], sic_prefixes: ['35'], name: 'Renewable Energy' }
  ];

  for (const sector of growthSectors) {
    const keywordMatch = sector.keywords.some(kw => industryLower.includes(kw));
    const sicMatch = sector.sic_prefixes.some(prefix => sic.startsWith(prefix));

    if (keywordMatch || sicMatch) {
      return {
        score: 10,
        factor: {
          name: 'growth_sector',
          description: `${sector.name} is a growth sector with strategic acquisition activity`,
          impact_weight: 10,
          impact_direction: 'positive',
          supporting_value: { sector: sector.name, sic_code: sic, industry }
        }
      };
    }
  }

  // Unknown/emerging sector
  return {
    score: 5,
    factor: {
      name: 'emerging_sector',
      description: `${industry || sic} sector classification unclear, limited historical M&A patterns`,
      impact_weight: 5,
      impact_direction: 'neutral',
      supporting_value: { sic_code: sic, industry }
    }
  };
}

/**
 * Analyze geographic clustering
 * Certain regions (London, South East) have higher M&A activity
 */
async function analyzeGeographicClustering(
  region?: string,
  supabase?: any
): Promise<{ score: number; factor?: AnalysisFactor }> {
  if (!region) {
    return { score: 0 };
  }

  // High M&A activity regions
  const highActivityRegions = ['london', 'south east', 'south-east', 'greater london'];
  const regionLower = region.toLowerCase();

  if (highActivityRegions.some(r => regionLower.includes(r))) {
    return {
      score: 10,
      factor: {
        name: 'high_activity_region',
        description: `${region} is a high M&A activity region with strong acquirer presence`,
        impact_weight: 10,
        impact_direction: 'positive',
        supporting_value: { region }
      }
    };
  }

  // Moderate activity regions
  const moderateActivityRegions = ['north west', 'west midlands', 'scotland', 'yorkshire'];

  if (moderateActivityRegions.some(r => regionLower.includes(r))) {
    return {
      score: 5,
      factor: {
        name: 'moderate_activity_region',
        description: `${region} shows moderate M&A activity`,
        impact_weight: 5,
        impact_direction: 'neutral',
        supporting_value: { region }
      }
    };
  }

  // Lower activity regions
  return {
    score: 0,
    factor: {
      name: 'lower_activity_region',
      description: `${region} has limited M&A transaction history`,
      impact_weight: 0,
      impact_direction: 'neutral',
      supporting_value: { region }
    }
  };
}
