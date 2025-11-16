/**
 * Acquirer Profiler for M&A Predictions
 *
 * Identifies profiles of potential acquirers for High/Very High likelihood targets:
 * - Same industry (horizontal integration)
 * - Adjacent industries (vertical integration)
 * - Strategic fit analysis
 * - Size ratio matching (typically 3-10x larger)
 * - Geographic proximity
 *
 * Only generates for High+ likelihood predictions (score >= 51)
 *
 * Part of T020 implementation
 */

import { createClient } from '@/lib/supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/database.types';

type DbClient = SupabaseClient<Database>;

export interface AcquirerProfile {
  rank: number; // 1-10
  potential_acquirer_id: string | null; // UUID if specific company, null for generic profile
  industry_match: string;
  size_ratio_description: string;
  geographic_proximity: string;
  strategic_rationale: 'horizontal_integration' | 'vertical_integration' | 'technology_acquisition' | 'market_expansion' | 'talent_acquisition' | 'other';
  strategic_rationale_description: string;
  match_score: number; // 0-100
}

interface CompanyProfile {
  id: string;
  revenue?: number;
  employees?: number;
  sic_code?: string;
  industry?: string;
  region?: string;
  name?: string;
}

/**
 * Generate potential acquirer profiles
 *
 * Only generates for High+ likelihood (score >= 51)
 * Returns empty array for Medium/Low likelihood companies
 *
 * @param companyId - UUID of target company
 * @param predictionScore - M&A likelihood score (0-100)
 * @returns Array of up to 10 acquirer profiles, ranked by match score
 */
export async function generateAcquirerProfiles(
  companyId: string,
  predictionScore: number
): Promise<AcquirerProfile[]> {
  // Only generate for High+ likelihood
  if (predictionScore < 51) {
    return [];
  }

  const supabase = await createClient();

  // Fetch target company profile
  const { data: target, error } = await supabase
    .from('businesses')
    .select('id, revenue, employees, sic_code, industry, region, name')
    .eq('id', companyId)
    .single();

  if (error || !target) {
    throw new Error(`Failed to fetch company data: ${error?.message || 'Company not found'}`);
  }

  const targetProfile = target as CompanyProfile;

  // Generate profiles based on historical M&A patterns and logical matches
  const profiles: AcquirerProfile[] = [];

  // Profile 1: Horizontal Integration (same industry, larger competitor)
  const horizontalProfile = await generateHorizontalProfile(targetProfile, supabase);
  if (horizontalProfile) {
    profiles.push(horizontalProfile);
  }

  // Profile 2: Vertical Integration (supply chain)
  const verticalProfile = await generateVerticalProfile(targetProfile, supabase);
  if (verticalProfile) {
    profiles.push(verticalProfile);
  }

  // Profile 3: Strategic/Technology Acquisition
  const strategicProfile = await generateStrategicProfile(targetProfile, supabase);
  if (strategicProfile) {
    profiles.push(strategicProfile);
  }

  // Profile 4: Geographic Expansion
  const expansionProfile = await generateExpansionProfile(targetProfile, supabase);
  if (expansionProfile) {
    profiles.push(expansionProfile);
  }

  // Profile 5: Private Equity / Financial Buyer
  const financialProfile = generateFinancialBuyerProfile(targetProfile);
  if (financialProfile) {
    profiles.push(financialProfile);
  }

  // Sort by match score descending and assign ranks
  profiles.sort((a, b) => b.match_score - a.match_score);
  profiles.forEach((profile, index) => {
    profile.rank = index + 1;
  });

  return profiles.slice(0, 10); // Top 10 profiles
}

/**
 * Generate horizontal integration profile (same industry competitor)
 */
async function generateHorizontalProfile(
  target: CompanyProfile,
  supabase: DbClient
): Promise<AcquirerProfile | null> {
  if (!target.sic_code && !target.industry) {
    return null;
  }

  // Look for historical horizontal integration deals in same industry
  const { data: deals, error } = await supabase
    .from('ma_historical_deals')
    .select('acquirer_company_name, acquirer_industry_description, deal_rationale')
    .or(`target_sic_code.eq.${target.sic_code},target_industry_description.ilike.%${target.industry}%`)
    .eq('deal_rationale', 'horizontal_integration')
    .limit(5);

  const historicalCount = deals ? deals.length : 0;

  // Calculate match score
  let matchScore = 70; // Base score for horizontal integration
  if (historicalCount >= 3) matchScore += 20; // Strong historical precedent
  else if (historicalCount >= 1) matchScore += 10; // Some precedent

  const targetRevenue = target.revenue || 0;
  const sizeRatio = targetRevenue > 0 ? '5-10x larger by revenue' : 'Significantly larger';

  return {
    rank: 1, // Will be re-ranked
    potential_acquirer_id: null, // Generic profile
    industry_match: target.industry || `SIC ${target.sic_code}`,
    size_ratio_description: sizeRatio,
    geographic_proximity: target.region ? `Same region (${target.region})` : 'UK/Ireland',
    strategic_rationale: 'horizontal_integration',
    strategic_rationale_description: `Market consolidation - larger competitor in ${target.industry || 'same industry'} seeking to increase market share and eliminate competition`,
    match_score: matchScore
  };
}

/**
 * Generate vertical integration profile (supply chain)
 */
async function generateVerticalProfile(
  target: CompanyProfile,
  supabase: DbClient
): Promise<AcquirerProfile | null> {
  // Vertical integration is industry-specific
  const industryLower = (target.industry || '').toLowerCase();

  // Identify upstream/downstream industries
  let verticalIndustry = '';
  let rationale = '';

  if (industryLower.includes('manufacturing') || industryLower.includes('production')) {
    verticalIndustry = 'Retail or distribution companies';
    rationale = 'Downstream integration - retailers acquiring manufacturers to control supply chain';
  } else if (industryLower.includes('software') || industryLower.includes('technology')) {
    verticalIndustry = 'Enterprise customers in various sectors';
    rationale = 'Vertical integration - large enterprises acquiring technology suppliers';
  } else if (industryLower.includes('retail') || industryLower.includes('distribution')) {
    verticalIndustry = 'Manufacturing or wholesale companies';
    rationale = 'Upstream integration - retailers acquiring suppliers to reduce costs';
  } else {
    // No clear vertical integration opportunity
    return null;
  }

  return {
    rank: 2,
    potential_acquirer_id: null,
    industry_match: verticalIndustry,
    size_ratio_description: '10-20x larger (enterprise buyers)',
    geographic_proximity: 'UK/Ireland or multinational',
    strategic_rationale: 'vertical_integration',
    strategic_rationale_description: rationale,
    match_score: 55
  };
}

/**
 * Generate strategic/technology acquisition profile
 */
async function generateStrategicProfile(
  target: CompanyProfile,
  supabase: DbClient
): Promise<AcquirerProfile | null> {
  const industryLower = (target.industry || '').toLowerCase();

  // Technology companies are often strategic acquisition targets
  if (industryLower.includes('software') || industryLower.includes('technology') || industryLower.includes('saas')) {
    return {
      rank: 3,
      potential_acquirer_id: null,
      industry_match: 'Technology platforms and enterprise software companies',
      size_ratio_description: '20-100x larger (acquihire or product acquisition)',
      geographic_proximity: 'UK/Ireland or global tech companies',
      strategic_rationale: 'technology_acquisition',
      strategic_rationale_description: 'Technology/product acquisition - larger platform acquiring innovative technology or engineering talent',
      match_score: 65
    };
  }

  // Small teams in any industry = talent acquisition
  if (target.employees && target.employees <= 20) {
    return {
      rank: 3,
      potential_acquirer_id: null,
      industry_match: `${target.industry || 'Same'} or adjacent industries`,
      size_ratio_description: '10-50x larger',
      geographic_proximity: target.region || 'UK/Ireland',
      strategic_rationale: 'talent_acquisition',
      strategic_rationale_description: `Acquihire - larger company acquiring team of ${target.employees} for their expertise and client relationships`,
      match_score: 50
    };
  }

  return null;
}

/**
 * Generate market expansion profile
 */
async function generateExpansionProfile(
  target: CompanyProfile,
  supabase: DbClient
): Promise<AcquirerProfile | null> {
  if (!target.region) {
    return null;
  }

  // Companies in active regions are attractive for market expansion
  const regionLower = target.region.toLowerCase();
  const isHighValueRegion = regionLower.includes('london') || regionLower.includes('south east');

  if (isHighValueRegion) {
    return {
      rank: 4,
      potential_acquirer_id: null,
      industry_match: target.industry || 'Same industry',
      size_ratio_description: '5-15x larger',
      geographic_proximity: 'UK regions expanding into London/South East',
      strategic_rationale: 'market_expansion',
      strategic_rationale_description: `Geographic expansion - companies outside ${target.region} seeking to establish presence in high-value market`,
      match_score: 60
    };
  }

  return {
    rank: 4,
    potential_acquirer_id: null,
    industry_match: target.industry || 'Same industry',
    size_ratio_description: '5-15x larger',
    geographic_proximity: 'Adjacent UK regions or London-based companies',
    strategic_rationale: 'market_expansion',
    strategic_rationale_description: `Geographic expansion - larger companies seeking regional presence in ${target.region}`,
    match_score: 45
  };
}

/**
 * Generate private equity / financial buyer profile
 */
function generateFinancialBuyerProfile(
  target: CompanyProfile
): AcquirerProfile | null {
  const targetRevenue = target.revenue || 0;

  // PE firms typically target companies with £2M-£50M revenue
  if (targetRevenue < 2000000 || targetRevenue > 50000000) {
    return null;
  }

  return {
    rank: 5,
    potential_acquirer_id: null,
    industry_match: 'Private equity firms (sector-agnostic)',
    size_ratio_description: 'Financial buyer - not size-dependent',
    geographic_proximity: 'UK-based PE firms',
    strategic_rationale: 'other',
    strategic_rationale_description: `Private equity acquisition - ${target.industry || 'company'} with £${(targetRevenue / 1000000).toFixed(1)}M revenue fits PE investment criteria for buy-and-build or operational improvement`,
    match_score: 50
  };
}
