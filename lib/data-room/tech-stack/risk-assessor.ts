/**
 * Risk Assessor
 * Analyzes technologies and generates risk assessments
 */

import {
  TechStackTechnology,
  TechStackFinding,
  TechFindingType,
  TechFindingSeverity,
  TechRiskLevel,
  TechCategory,
} from '../types';
import { findTechnology, TechnologyDefinition } from './tech-database';

export interface RiskAssessment {
  overall_risk_level: TechRiskLevel;
  risk_score: number; // 0-100
  critical_risks: number;
  high_risks: number;
  medium_risks: number;
  low_risks: number;
  risk_factors: RiskFactor[];
  recommendations: string[];
}

export interface RiskFactor {
  category: string;
  severity: TechFindingSeverity;
  description: string;
  affected_technologies: string[];
  impact_score: number; // 0-100
}

export interface TechnologyRisk {
  technology_id: string;
  technology_name: string;
  risk_score: number; // 0-100
  risk_factors: string[];
  is_critical: boolean;
}

/**
 * RiskAssessor - Analyze technology stack for risks
 */
export class RiskAssessor {
  /**
   * Assess overall risk for a set of technologies
   */
  assessTechnologies(technologies: TechStackTechnology[]): RiskAssessment {
    const riskFactors: RiskFactor[] = [];
    const recommendations: string[] = [];

    // 1. Check for deprecated technologies
    const deprecatedFactors = this.checkDeprecatedTechnologies(technologies);
    riskFactors.push(...deprecatedFactors);

    // 2. Check for security issues
    const securityFactors = this.checkSecurityIssues(technologies);
    riskFactors.push(...securityFactors);

    // 3. Check for outdated technologies
    const outdatedFactors = this.checkOutdatedTechnologies(technologies);
    riskFactors.push(...outdatedFactors);

    // 4. Check for GPT wrappers (AI/ML only)
    const wrapperFactors = this.checkGPTWrappers(technologies);
    riskFactors.push(...wrapperFactors);

    // 5. Check for missing critical technologies
    const missingFactors = this.checkMissingCriticalTech(technologies);
    riskFactors.push(...missingFactors);

    // 6. Check for technology conflicts
    const conflictFactors = this.checkTechnologyConflicts(technologies);
    riskFactors.push(...conflictFactors);

    // Calculate risk distribution
    const critical_risks = riskFactors.filter((f) => f.severity === 'critical').length;
    const high_risks = riskFactors.filter((f) => f.severity === 'high').length;
    const medium_risks = riskFactors.filter((f) => f.severity === 'medium').length;
    const low_risks = riskFactors.filter((f) => f.severity === 'low').length;

    // Calculate overall risk score (weighted average of technology risk scores)
    const avgRiskScore =
      technologies.length > 0
        ? technologies.reduce((sum, t) => sum + (t.risk_score || 0), 0) / technologies.length
        : 0;

    // Determine overall risk level
    const overall_risk_level = this.determineOverallRiskLevel(
      critical_risks,
      high_risks,
      avgRiskScore
    );

    // Generate recommendations
    recommendations.push(...this.generateRecommendations(riskFactors, technologies));

    return {
      overall_risk_level,
      risk_score: Math.round(avgRiskScore),
      critical_risks,
      high_risks,
      medium_risks,
      low_risks,
      risk_factors: riskFactors,
      recommendations,
    };
  }

  /**
   * Assess risk for a single technology
   */
  assessTechnology(technology: TechStackTechnology): TechnologyRisk {
    const riskFactors: string[] = [];
    let risk_score = technology.risk_score || 0;

    // Check deprecation
    if (technology.is_deprecated) {
      riskFactors.push('Technology is deprecated');
      risk_score = Math.max(risk_score, 75);
    }

    // Check if outdated
    if (technology.is_outdated) {
      riskFactors.push('Technology version is outdated');
      risk_score = Math.max(risk_score, 60);
    }

    // Check security issues
    if (technology.has_security_issues) {
      riskFactors.push(`Security issues: ${technology.security_details}`);
      risk_score = Math.max(risk_score, 70);
    }

    // Check AI/ML wrapper
    if (technology.category === 'ml_ai' && technology.authenticity === 'wrapper') {
      riskFactors.push('AI technology is a GPT wrapper without proprietary models');
      risk_score = Math.max(risk_score, 60);
    }

    // Check confidence
    if (technology.confidence_score < 0.5) {
      riskFactors.push('Low confidence detection - requires manual verification');
      risk_score += 10;
    }

    // Check if manually verified
    if (!technology.manually_verified && technology.confidence_score < 0.8) {
      riskFactors.push('Not manually verified');
      risk_score += 5;
    }

    return {
      technology_id: technology.id,
      technology_name: technology.name,
      risk_score: Math.min(risk_score, 100),
      risk_factors: riskFactors,
      is_critical: risk_score >= 75,
    };
  }

  /**
   * Check for deprecated technologies
   */
  private checkDeprecatedTechnologies(
    technologies: TechStackTechnology[]
  ): RiskFactor[] {
    const deprecated = technologies.filter((t) => t.is_deprecated);

    if (deprecated.length === 0) return [];

    return [
      {
        category: 'Deprecated Technologies',
        severity: 'high',
        description: `${deprecated.length} deprecated ${
          deprecated.length === 1 ? 'technology' : 'technologies'
        } detected. These should be replaced with modern alternatives.`,
        affected_technologies: deprecated.map((t) => t.name),
        impact_score: Math.min(70 + deprecated.length * 5, 95),
      },
    ];
  }

  /**
   * Check for security issues
   */
  private checkSecurityIssues(technologies: TechStackTechnology[]): RiskFactor[] {
    const withSecurity = technologies.filter((t) => t.has_security_issues);

    if (withSecurity.length === 0) return [];

    return [
      {
        category: 'Security Vulnerabilities',
        severity: 'critical',
        description: `${withSecurity.length} ${
          withSecurity.length === 1 ? 'technology has' : 'technologies have'
        } known security vulnerabilities. Immediate action required.`,
        affected_technologies: withSecurity.map((t) => t.name),
        impact_score: Math.min(85 + withSecurity.length * 5, 100),
      },
    ];
  }

  /**
   * Check for outdated technologies
   */
  private checkOutdatedTechnologies(technologies: TechStackTechnology[]): RiskFactor[] {
    const outdated = technologies.filter((t) => t.is_outdated && !t.is_deprecated);

    if (outdated.length === 0) return [];

    return [
      {
        category: 'Outdated Technologies',
        severity: 'medium',
        description: `${outdated.length} ${
          outdated.length === 1 ? 'technology is' : 'technologies are'
        } using outdated versions. Updates recommended for security and performance.`,
        affected_technologies: outdated.map((t) => t.name),
        impact_score: Math.min(50 + outdated.length * 3, 70),
      },
    ];
  }

  /**
   * Check for GPT wrappers
   */
  private checkGPTWrappers(technologies: TechStackTechnology[]): RiskFactor[] {
    const wrappers = technologies.filter(
      (t) => t.category === 'ml_ai' && t.authenticity === 'wrapper'
    );

    if (wrappers.length === 0) return [];

    return [
      {
        category: 'AI Authenticity Concern',
        severity: 'high',
        description: `${wrappers.length} AI ${
          wrappers.length === 1 ? 'technology appears' : 'technologies appear'
        } to be GPT API wrappers without proprietary models. This indicates limited AI differentiation and high dependency on third-party providers.`,
        affected_technologies: wrappers.map((t) => t.name),
        impact_score: Math.min(65 + wrappers.length * 10, 90),
      },
    ];
  }

  /**
   * Check for missing critical technologies
   */
  private checkMissingCriticalTech(technologies: TechStackTechnology[]): RiskFactor[] {
    const factors: RiskFactor[] = [];
    const categories = new Set(technologies.map((t) => t.category));

    // Check for missing testing framework
    if (!categories.has('testing')) {
      factors.push({
        category: 'Missing Critical Technology',
        severity: 'high',
        description:
          'No testing framework detected. Lack of automated testing significantly increases technical risk and maintenance costs.',
        affected_technologies: [],
        impact_score: 75,
      });
    }

    // Check for missing monitoring
    if (!categories.has('monitoring') && technologies.length > 10) {
      factors.push({
        category: 'Missing Critical Technology',
        severity: 'medium',
        description:
          'No monitoring/observability tools detected. This makes it difficult to detect and diagnose production issues.',
        affected_technologies: [],
        impact_score: 60,
      });
    }

    // Check for missing security (for backend apps)
    if (categories.has('backend') && !categories.has('security')) {
      factors.push({
        category: 'Missing Critical Technology',
        severity: 'high',
        description:
          'No authentication/security framework detected for backend application. This is a critical security gap.',
        affected_technologies: [],
        impact_score: 80,
      });
    }

    return factors;
  }

  /**
   * Check for technology conflicts
   */
  private checkTechnologyConflicts(technologies: TechStackTechnology[]): RiskFactor[] {
    const factors: RiskFactor[] = [];

    // Check for multiple frontend frameworks (anti-pattern)
    const frontendFrameworks = technologies.filter(
      (t) =>
        t.category === 'frontend' &&
        ['React', 'Vue', 'Angular', 'Svelte'].includes(t.name)
    );

    if (frontendFrameworks.length > 1) {
      factors.push({
        category: 'Technology Conflict',
        severity: 'medium',
        description: `Multiple frontend frameworks detected (${frontendFrameworks
          .map((t) => t.name)
          .join(', ')}). This increases complexity and maintenance burden.`,
        affected_technologies: frontendFrameworks.map((t) => t.name),
        impact_score: 55,
      });
    }

    // Check for multiple databases (potential complexity)
    const databases = technologies.filter((t) => t.category === 'database');
    if (databases.length > 3) {
      factors.push({
        category: 'Technology Complexity',
        severity: 'low',
        description: `${databases.length} database technologies detected. Multiple databases increase operational complexity.`,
        affected_technologies: databases.map((t) => t.name),
        impact_score: 40,
      });
    }

    return factors;
  }

  /**
   * Determine overall risk level
   */
  private determineOverallRiskLevel(
    critical: number,
    high: number,
    avgRiskScore: number
  ): TechRiskLevel {
    if (critical > 0) return 'critical';
    if (high > 2 || avgRiskScore >= 70) return 'high';
    if (high > 0 || avgRiskScore >= 40) return 'medium';
    return 'low';
  }

  /**
   * Generate recommendations based on risk factors
   */
  private generateRecommendations(
    riskFactors: RiskFactor[],
    technologies: TechStackTechnology[]
  ): string[] {
    const recommendations: string[] = [];

    // Security vulnerabilities
    const securityRisks = riskFactors.filter((f) => f.category === 'Security Vulnerabilities');
    if (securityRisks.length > 0) {
      recommendations.push(
        'Priority 1: Address all security vulnerabilities immediately. Update affected technologies to latest secure versions.'
      );
    }

    // Deprecated technologies
    const deprecatedRisks = riskFactors.filter((f) => f.category === 'Deprecated Technologies');
    if (deprecatedRisks.length > 0) {
      const affected = deprecatedRisks.flatMap((f) => f.affected_technologies);
      recommendations.push(
        `Priority 2: Plan migration from deprecated technologies (${affected.join(', ')}) to supported alternatives.`
      );
    }

    // GPT wrappers
    const wrapperRisks = riskFactors.filter((f) => f.category === 'AI Authenticity Concern');
    if (wrapperRisks.length > 0) {
      recommendations.push(
        'Priority 2: Evaluate AI strategy. Consider developing proprietary models or fine-tuning to differentiate from competitors.'
      );
    }

    // Missing testing
    const missingTesting = riskFactors.find(
      (f) => f.category === 'Missing Critical Technology' && f.description.includes('testing')
    );
    if (missingTesting) {
      recommendations.push(
        'Priority 3: Implement automated testing framework (Jest, Playwright, pytest, etc.) to reduce technical debt.'
      );
    }

    // Missing monitoring
    const missingMonitoring = riskFactors.find(
      (f) => f.category === 'Missing Critical Technology' && f.description.includes('monitoring')
    );
    if (missingMonitoring) {
      recommendations.push(
        'Priority 3: Implement monitoring and observability (Sentry, Datadog, etc.) for production reliability.'
      );
    }

    // Outdated technologies
    const outdatedRisks = riskFactors.filter((f) => f.category === 'Outdated Technologies');
    if (outdatedRisks.length > 0) {
      recommendations.push(
        'Priority 4: Update outdated technologies to latest stable versions for security patches and performance improvements.'
      );
    }

    // Technology conflicts
    const conflictRisks = riskFactors.filter((f) => f.category === 'Technology Conflict');
    if (conflictRisks.length > 0) {
      recommendations.push(
        'Priority 4: Consolidate to single frontend framework to reduce complexity and improve maintainability.'
      );
    }

    // General modernization
    const avgRiskScore =
      technologies.length > 0
        ? technologies.reduce((sum, t) => sum + (t.risk_score || 0), 0) / technologies.length
        : 0;

    if (avgRiskScore > 50 && recommendations.length < 3) {
      recommendations.push(
        'Consider comprehensive technology modernization roadmap to reduce technical debt and improve long-term maintainability.'
      );
    }

    return recommendations;
  }

  /**
   * Calculate modernization score (0-100)
   * Higher = more modern stack
   */
  calculateModernizationScore(technologies: TechStackTechnology[]): number {
    if (technologies.length === 0) return 0;

    const deprecatedCount = technologies.filter((t) => t.is_deprecated).length;
    const outdatedCount = technologies.filter((t) => t.is_outdated).length;
    const securityCount = technologies.filter((t) => t.has_security_issues).length;

    // Calculate penalty for each issue type
    const deprecatedPenalty = (deprecatedCount / technologies.length) * 40;
    const outdatedPenalty = (outdatedCount / technologies.length) * 30;
    const securityPenalty = (securityCount / technologies.length) * 30;

    const score = 100 - deprecatedPenalty - outdatedPenalty - securityPenalty;

    return Math.max(0, Math.round(score));
  }

  /**
   * Calculate technical debt score (0-100)
   * Higher = more technical debt
   */
  calculateTechnicalDebtScore(
    technologies: TechStackTechnology[],
    riskAssessment: RiskAssessment
  ): number {
    if (technologies.length === 0) return 0;

    // Weight factors
    const avgRiskWeight = 0.6;
    const outdatedWeight = 0.4;

    // Average risk score (already 0-100)
    const avgRisk = riskAssessment.risk_score;

    // Outdated percentage
    const outdatedCount = technologies.filter((t) => t.is_outdated || t.is_deprecated).length;
    const outdatedPercent = (outdatedCount / technologies.length) * 100;

    const technicalDebt = avgRiskWeight * avgRisk + outdatedWeight * outdatedPercent;

    return Math.round(technicalDebt);
  }
}
