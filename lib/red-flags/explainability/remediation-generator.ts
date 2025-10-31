/**
 * Remediation Suggestion Generator
 *
 * Generates actionable remediation plans for red flags based on:
 * - Flag category (financial, legal, operational, cyber, esg)
 * - Severity level (critical, high, medium, low)
 * - Specific flag title and description
 *
 * Provides board-ready language with:
 * - Clear remediation plan
 * - Suggested timeframe
 * - Key stakeholders to involve
 */

import { RedFlag, FlagCategory, FlagSeverity, RemediationSuggestion } from '../types';

/**
 * Timeframe recommendations by severity
 */
const TIMEFRAMES: Record<FlagSeverity, string> = {
  critical: 'Immediate action required (within 24 hours)',
  high: 'Urgent attention required (within 7 days)',
  medium: 'Address within current quarter (30-90 days)',
  low: 'Monitor and address in next planning cycle (90+ days)',
};

/**
 * Generate remediation suggestions for a red flag
 *
 * @param flag The red flag requiring remediation
 * @returns Remediation suggestion with plan, timeframe, and stakeholders
 */
export async function generateRemediation(flag: RedFlag): Promise<RemediationSuggestion> {
  const plan = generateRemediationPlan(flag);
  const timeframe = TIMEFRAMES[flag.severity];
  const stakeholders = identifyStakeholders(flag.category, flag.severity);

  return {
    plan,
    timeframe,
    stakeholders,
  };
}

/**
 * Generate a remediation plan based on category and specific flag details
 */
function generateRemediationPlan(flag: RedFlag): string {
  // Get category-specific template
  const template = getCategoryTemplate(flag.category, flag.title, flag.description);

  // Enhance with severity-specific urgency language
  const urgencyPrefix = getUrgencyPrefix(flag.severity);

  return `${urgencyPrefix}${template}`;
}

/**
 * Get urgency prefix based on severity
 */
function getUrgencyPrefix(severity: FlagSeverity): string {
  switch (severity) {
    case 'critical':
      return '🚨 CRITICAL: ';
    case 'high':
      return '⚠️ HIGH PRIORITY: ';
    case 'medium':
      return '⚡ ATTENTION NEEDED: ';
    case 'low':
      return '📋 MONITOR: ';
  }
}

/**
 * Get remediation template for specific category
 */
function getCategoryTemplate(
  category: FlagCategory,
  title: string,
  description: string | null
): string {
  switch (category) {
    case 'financial':
      return getFinancialRemediation(title, description);
    case 'legal':
      return getLegalRemediation(title, description);
    case 'operational':
      return getOperationalRemediation(title, description);
    case 'cyber':
      return getCyberRemediation(title, description);
    case 'esg':
      return getESGRemediation(title, description);
  }
}

/**
 * Financial remediation templates
 */
function getFinancialRemediation(title: string, description: string | null): string {
  const lowerTitle = title.toLowerCase();

  if (lowerTitle.includes('revenue concentration') || lowerTitle.includes('customer concentration')) {
    return 'Diversify customer base to reduce concentration risk. Initiate business development efforts to acquire new customers in different sectors. Set target of reducing top 3 customer dependency to below 60% of revenue within 12 months.';
  }

  if (lowerTitle.includes('negative nrr') || lowerTitle.includes('net retention')) {
    return 'Address customer churn immediately. Conduct customer success review to identify at-risk accounts. Implement retention program with dedicated account management for top customers. Target NRR above 100% within 2 quarters.';
  }

  if (lowerTitle.includes('ar aging') || lowerTitle.includes('receivable')) {
    return 'Accelerate collections process. Review payment terms with customers showing overdue balances. Consider incentives for early payment or penalties for late payment. Implement stricter credit controls for new contracts.';
  }

  if (lowerTitle.includes('dso') || lowerTitle.includes('days sales')) {
    return 'Optimize billing and collections cycle. Review and streamline invoicing process. Consider implementing automated payment reminders. Set target to reduce DSO by 15% within 60 days.';
  }

  if (lowerTitle.includes('burn rate') || lowerTitle.includes('runway')) {
    return 'Review and reduce operating expenses. Prioritize revenue-generating activities. Consider fundraising or bridge financing if runway is critically low. Implement weekly cash flow monitoring.';
  }

  return `Review financial controls and processes related to this issue. Engage CFO and finance team to develop action plan. Consider external financial advisory if needed.`;
}

/**
 * Legal remediation templates
 */
function getLegalRemediation(title: string, description: string | null): string {
  const lowerTitle = title.toLowerCase();

  if (lowerTitle.includes('change of control') || lowerTitle.includes('termination for convenience')) {
    return 'Engage legal counsel to review contract terms and assess termination risk. Develop contingency plans for key at-risk contracts. Consider negotiating amendments to reduce termination rights or extend notice periods. Brief board on potential revenue impact.';
  }

  if (lowerTitle.includes('mfn') || lowerTitle.includes('most favored')) {
    return 'Review all contracts with MFN clauses to assess pricing constraints. Analyze pricing flexibility and potential exposure. Consider grandfather existing contracts while negotiating removal of MFN terms in renewals. Develop pricing strategy that accounts for MFN obligations.';
  }

  if (lowerTitle.includes('liability') || lowerTitle.includes('indemnity')) {
    return 'Review insurance coverage to ensure adequate protection. Consult with legal counsel on risk mitigation strategies. Consider negotiating liability caps in future contracts. Assess need for additional D&O or professional indemnity insurance.';
  }

  if (lowerTitle.includes('data protection') || lowerTitle.includes('gdpr') || lowerTitle.includes('privacy')) {
    return 'Conduct immediate data protection compliance review. Engage privacy counsel to assess regulatory risk. Implement necessary technical and organizational measures to ensure compliance. Consider DPO appointment if not already in place.';
  }

  return 'Engage legal counsel to review this issue and provide recommendation. Assess potential legal, financial, and reputational risks. Develop action plan with legal team oversight.';
}

/**
 * Operational remediation templates
 */
function getOperationalRemediation(title: string, description: string | null): string {
  const lowerTitle = title.toLowerCase();

  if (lowerTitle.includes('sla breach') || lowerTitle.includes('service level')) {
    return 'Conduct root cause analysis of SLA breaches. Review resource allocation and capacity planning. Implement process improvements and monitoring alerts. Consider temporary surge capacity if needed. Communicate proactively with affected customers.';
  }

  if (lowerTitle.includes('backlog') || lowerTitle.includes('aging')) {
    return 'Prioritize backlog items by business impact. Allocate additional resources to critical items. Review and optimize workflow processes. Consider bringing in temporary resources or contractors to clear backlog. Implement better capacity planning.';
  }

  if (lowerTitle.includes('supplier') || lowerTitle.includes('vendor') || lowerTitle.includes('dependency')) {
    return 'Diversify supplier base to reduce single-point-of-failure risk. Identify and qualify alternative vendors. Negotiate improved contract terms with critical suppliers. Develop contingency plans for supplier disruption.';
  }

  if (lowerTitle.includes('quality') || lowerTitle.includes('defect')) {
    return 'Implement quality improvement program. Conduct defect analysis to identify root causes. Enhance testing and QA processes. Consider additional quality audits or certifications. Set measurable quality targets.';
  }

  return 'Review operational processes and identify improvement opportunities. Engage operations leadership to develop action plan. Implement metrics and monitoring to track progress.';
}

/**
 * Cyber security remediation templates
 */
function getCyberRemediation(title: string, description: string | null): string {
  const lowerTitle = title.toLowerCase();

  if (lowerTitle.includes('incident') || lowerTitle.includes('breach')) {
    return 'Activate incident response plan immediately. Contain affected systems. Engage forensic experts if needed. Notify affected parties per regulatory requirements. Conduct post-incident review and implement preventive measures. Consider cyber insurance claim if applicable.';
  }

  if (lowerTitle.includes('policy') || lowerTitle.includes('missing') || lowerTitle.includes('gap')) {
    return 'Develop and implement missing security policies. Engage CISO or security consultant to draft comprehensive policy framework. Ensure policies align with industry standards (ISO 27001, SOC 2). Implement policy awareness training for all staff.';
  }

  if (lowerTitle.includes('vulnerability') || lowerTitle.includes('patch')) {
    return 'Implement immediate patching for critical vulnerabilities. Conduct vulnerability assessment across all systems. Establish regular patch management schedule. Consider vulnerability scanning tools for continuous monitoring.';
  }

  if (lowerTitle.includes('access control') || lowerTitle.includes('authentication')) {
    return 'Review and tighten access controls. Implement principle of least privilege. Enable multi-factor authentication for all critical systems. Conduct access review and revoke unnecessary permissions. Implement identity and access management (IAM) solution.';
  }

  return 'Engage cyber security team to assess and remediate this issue. Consider external security audit or penetration testing. Implement security controls per industry best practices.';
}

/**
 * ESG remediation templates
 */
function getESGRemediation(title: string, description: string | null): string {
  const lowerTitle = title.toLowerCase();

  if (lowerTitle.includes('disclosure') || lowerTitle.includes('reporting') || lowerTitle.includes('gap')) {
    return 'Develop comprehensive ESG reporting framework aligned with GRI, SASB, or TCFD standards. Engage ESG consultant to assess current state and identify gaps. Implement data collection processes for material ESG metrics. Plan phased disclosure improvement over 12-18 months.';
  }

  if (lowerTitle.includes('emissions') || lowerTitle.includes('carbon') || lowerTitle.includes('climate')) {
    return 'Conduct greenhouse gas emissions inventory (Scope 1, 2, and 3). Set science-based emissions reduction targets. Develop decarbonization roadmap. Consider carbon offset programs for near-term mitigation. Engage employees in sustainability initiatives.';
  }

  if (lowerTitle.includes('labor') || lowerTitle.includes('working conditions') || lowerTitle.includes('human rights')) {
    return 'Review labor practices and working conditions across operations and supply chain. Conduct human rights due diligence. Implement grievance mechanisms. Consider third-party social audits. Develop supplier code of conduct.';
  }

  if (lowerTitle.includes('governance') || lowerTitle.includes('board') || lowerTitle.includes('diversity')) {
    return 'Review board composition and diversity. Develop board recruitment strategy to address gaps. Implement governance best practices per local corporate governance code. Consider shareholder engagement on governance matters.';
  }

  if (lowerTitle.includes('negative news') || lowerTitle.includes('controversy')) {
    return 'Assess reputational impact and develop response strategy. Engage PR and communications team. Address underlying issues giving rise to negative coverage. Consider proactive stakeholder engagement and transparency measures. Monitor ongoing media sentiment.';
  }

  return 'Engage ESG team or consultant to assess and address this issue. Align remediation with company sustainability strategy. Consider materiality to stakeholders when prioritizing actions.';
}

/**
 * Identify key stakeholders who should be involved in remediation
 */
function identifyStakeholders(category: FlagCategory, severity: FlagSeverity): string[] {
  const stakeholders: string[] = [];

  // Critical flags always involve board/executive
  if (severity === 'critical' || severity === 'high') {
    stakeholders.push('Board of Directors', 'CEO');
  }

  // Category-specific stakeholders
  switch (category) {
    case 'financial':
      stakeholders.push('CFO', 'Finance Team', 'Audit Committee');
      if (severity === 'critical') {
        stakeholders.push('Investors', 'External Auditors');
      }
      break;

    case 'legal':
      stakeholders.push('General Counsel', 'Legal Team');
      if (severity === 'critical' || severity === 'high') {
        stakeholders.push('External Legal Counsel', 'Compliance Officer');
      }
      break;

    case 'operational':
      stakeholders.push('COO', 'Operations Team', 'Product/Engineering Leaders');
      if (severity === 'critical') {
        stakeholders.push('Customer Success', 'Key Customers');
      }
      break;

    case 'cyber':
      stakeholders.push('CISO', 'IT Security Team', 'CTO');
      if (severity === 'critical' || severity === 'high') {
        stakeholders.push('External Security Consultants', 'Legal (for breach notification)', 'PR Team');
      }
      break;

    case 'esg':
      stakeholders.push('Head of Sustainability', 'Corporate Affairs', 'Investor Relations');
      if (severity === 'critical' || severity === 'high') {
        stakeholders.push('ESG Consultants', 'Communications Team');
      }
      break;
  }

  // Remove duplicates and return
  return Array.from(new Set(stakeholders));
}
