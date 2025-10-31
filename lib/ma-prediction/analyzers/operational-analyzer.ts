/**
 * Operational Analyzer for M&A Target Prediction
 *
 * Analyzes company operational metrics to identify acquisition signals:
 * - Employee count trends
 * - Director changes (governance instability)
 * - Filing punctuality (compliance issues)
 * - Registered office relocations (operational changes)
 *
 * Part of T014 implementation
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

interface OperationalData {
  employees?: number;
  incorporation_date?: string;
  company_status?: string;
  registered_office_address?: string;
  last_accounts_date?: string;
}

/**
 * Analyze operational metrics for M&A target likelihood
 *
 * Scoring methodology:
 * - Very small team (<10 employees): 15 points - acquihire candidate
 * - Declining employee count: 12 points - downsizing signal
 * - Stale accounts (>18 months): 10 points - operational issues
 * - Active company status: -5 points (healthy signal)
 *
 * @param companyId - UUID of company to analyze
 * @returns Operational analysis result with score and factors
 */
export async function analyzeOperations(companyId: string): Promise<AnalysisResult> {
  const supabase = await createClient();

  // Fetch company operational data
  const { data: company, error } = await supabase
    .from('businesses')
    .select('employees, incorporation_date, company_status, registered_office_address, last_accounts_date')
    .eq('id', companyId)
    .single();

  if (error || !company) {
    throw new Error(`Failed to fetch company data: ${error?.message || 'Company not found'}`);
  }

  const operationalData = company as OperationalData;

  // Calculate data completeness
  const requiredFields = ['employees', 'company_status', 'last_accounts_date'];
  const presentFields = requiredFields.filter(field => operationalData[field as keyof OperationalData] !== null && operationalData[field as keyof OperationalData] !== undefined);
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
        name: 'insufficient_operational_data',
        description: 'Insufficient operational data to generate reliable analysis',
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

  // Factor 1: Employee Count Analysis
  if (operationalData.employees !== null && operationalData.employees !== undefined) {
    const employeeScore = analyzeEmployeeCount(operationalData.employees);
    totalScore += employeeScore.score;
    if (employeeScore.factor) {
      factors.push(employeeScore.factor);
    }
  }

  // Factor 2: Company Status
  if (operationalData.company_status) {
    const statusScore = analyzeCompanyStatus(operationalData.company_status);
    totalScore += statusScore.score;
    if (statusScore.factor) {
      factors.push(statusScore.factor);
    }
  }

  // Factor 3: Filing Punctuality (based on account recency)
  if (operationalData.last_accounts_date) {
    const filingScore = analyzeFilingPunctuality(operationalData.last_accounts_date);
    totalScore += filingScore.score;
    if (filingScore.factor) {
      factors.push(filingScore.factor);
    }
  }

  // Normalize score to 0-100 (max possible: 37 points)
  const normalizedScore = Math.min(100, Math.round((totalScore / 37) * 100));

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
 * Analyze employee count
 * Small teams = acquihire candidates or distressed companies
 */
function analyzeEmployeeCount(employees: number): { score: number; factor?: AnalysisFactor } {
  // Micro team (1-5 employees) = very high M&A likelihood (acquihire or asset purchase)
  if (employees <= 5) {
    return {
      score: 15,
      factor: {
        name: 'micro_team',
        description: `Team of ${employees} employee${employees === 1 ? '' : 's'} indicates micro-business, high acquihire likelihood`,
        impact_weight: 15,
        impact_direction: 'positive',
        supporting_value: { employees, category: 'micro' }
      }
    };
  }

  // Small team (6-20 employees) = typical SME acquisition target
  if (employees <= 20) {
    return {
      score: 12,
      factor: {
        name: 'small_team',
        description: `${employees} employees positions company as typical SME acquisition target`,
        impact_weight: 12,
        impact_direction: 'positive',
        supporting_value: { employees, category: 'small' }
      }
    };
  }

  // Medium team (21-50 employees) = mid-market M&A candidate
  if (employees <= 50) {
    return {
      score: 10,
      factor: {
        name: 'medium_team',
        description: `${employees} employees indicates mid-market company suitable for strategic acquisition`,
        impact_weight: 10,
        impact_direction: 'positive',
        supporting_value: { employees, category: 'medium' }
      }
    };
  }

  // Growing team (51-100 employees) = growth-stage acquisition
  if (employees <= 100) {
    return {
      score: 8,
      factor: {
        name: 'growing_team',
        description: `${employees} employees suggests growth-stage company, attractive for expansion-focused acquirers`,
        impact_weight: 8,
        impact_direction: 'positive',
        supporting_value: { employees, category: 'growing' }
      }
    };
  }

  // Large team (>100 employees) = lower M&A likelihood (unless distressed or strategic)
  return {
    score: 5,
    factor: {
      name: 'large_team',
      description: `${employees} employees indicates larger organization, lower acquisition likelihood unless strategic fit`,
      impact_weight: 5,
      impact_direction: 'neutral',
      supporting_value: { employees, category: 'large' }
    }
  };
}

/**
 * Analyze company status
 * Active = healthy, other statuses = distress signals
 */
function analyzeCompanyStatus(status: string): { score: number; factor?: AnalysisFactor } {
  const statusLower = status.toLowerCase();

  // Active status = healthy company
  if (statusLower === 'active' || statusLower === 'live') {
    return {
      score: 0, // No positive M&A signal, but not negative
      factor: {
        name: 'active_status',
        description: 'Company status is Active, indicating normal operations',
        impact_weight: 0,
        impact_direction: 'neutral',
        supporting_value: { status }
      }
    };
  }

  // Dormant status = inactive, possible liquidation candidate
  if (statusLower === 'dormant') {
    return {
      score: 12,
      factor: {
        name: 'dormant_status',
        description: 'Dormant status indicates inactive operations, potential distressed acquisition',
        impact_weight: 12,
        impact_direction: 'positive',
        supporting_value: { status }
      }
    };
  }

  // Administration/liquidation = extreme distress
  if (statusLower.includes('administration') || statusLower.includes('liquidation')) {
    return {
      score: 20,
      factor: {
        name: 'distressed_status',
        description: `${status} status indicates severe financial distress, imminent asset sale likely`,
        impact_weight: 20,
        impact_direction: 'positive',
        supporting_value: { status }
      }
    };
  }

  // Other non-active statuses
  return {
    score: 8,
    factor: {
      name: 'unusual_status',
      description: `Company status '${status}' may indicate operational issues`,
      impact_weight: 8,
      impact_direction: 'positive',
      supporting_value: { status }
    }
  };
}

/**
 * Analyze filing punctuality
 * Late filings = compliance issues, governance problems
 */
function analyzeFilingPunctuality(lastAccountsDate: string): { score: number; factor?: AnalysisFactor } {
  const lastDate = new Date(lastAccountsDate);
  const now = new Date();
  const monthsOld = (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24 * 30);

  // Severely late (>24 months) = major red flag
  if (monthsOld > 24) {
    return {
      score: 15,
      factor: {
        name: 'severely_late_filing',
        description: `Accounts ${Math.round(monthsOld)} months overdue, severe governance issues, high distress likelihood`,
        impact_weight: 15,
        impact_direction: 'positive',
        supporting_value: { months_overdue: Math.round(monthsOld - 12), last_accounts_date: lastAccountsDate }
      }
    };
  }

  // Late (18-24 months) = compliance issues
  if (monthsOld > 18) {
    return {
      score: 10,
      factor: {
        name: 'late_filing',
        description: `Accounts ${Math.round(monthsOld)} months old, filing delays suggest operational or financial stress`,
        impact_weight: 10,
        impact_direction: 'positive',
        supporting_value: { months_overdue: Math.round(monthsOld - 12), last_accounts_date: lastAccountsDate }
      }
    };
  }

  // Approaching deadline (12-18 months) = minor concern
  if (monthsOld > 12) {
    return {
      score: 5,
      factor: {
        name: 'approaching_filing_deadline',
        description: `Accounts from ${Math.round(monthsOld)} months ago, nearing typical filing deadline`,
        impact_weight: 5,
        impact_direction: 'neutral',
        supporting_value: { months_old: Math.round(monthsOld), last_accounts_date: lastAccountsDate }
      }
    };
  }

  // Recent filing (<12 months) = good compliance
  return { score: 0 };
}

/**
 * Note: Director changes and registered office relocations require Companies House API
 * These are not implemented in this version but would add:
 * - Frequent director changes (10 points): Governance instability
 * - Recent office relocation (5 points): Operational restructuring
 *
 * Future enhancement: Integrate Companies House API in separate service
 */
