/**
 * Findings Generator
 * Auto-generate findings (red flags, risks, opportunities, recommendations) from analysis
 */

import {
  TechStackTechnology,
  TechStackFinding,
  TechFindingType,
  TechFindingSeverity,
  CreateFindingRequest,
} from '../types';
import { RiskAssessor, RiskAssessment } from './risk-assessor';

export interface GeneratedFinding {
  finding_type: TechFindingType;
  severity: TechFindingSeverity;
  title: string;
  description: string;
  technology_ids: string[];
  impact_score: number;
  recommendation: string;
  metadata: Record<string, unknown>;
}

/**
 * FindingsGenerator - Auto-generate findings from technology analysis
 */
export class FindingsGenerator {
  private riskAssessor: RiskAssessor;

  constructor() {
    this.riskAssessor = new RiskAssessor();
  }

  /**
   * Generate all findings for an analysis
   */
  generateFindings(
    technologies: TechStackTechnology[],
    riskAssessment: RiskAssessment
  ): GeneratedFinding[] {
    const findings: GeneratedFinding[] = [];

    // 1. Red flags (critical issues)
    findings.push(...this.generateRedFlags(technologies));

    // 2. Risks (potential issues)
    findings.push(...this.generateRisks(technologies, riskAssessment));

    // 3. Opportunities (positive findings)
    findings.push(...this.generateOpportunities(technologies));

    // 4. Strengths (what's good)
    findings.push(...this.generateStrengths(technologies));

    // 5. Recommendations (actionable improvements)
    findings.push(...this.generateRecommendations(technologies, riskAssessment));

    return findings;
  }

  /**
   * Generate red flags (critical issues that must be addressed)
   */
  private generateRedFlags(technologies: TechStackTechnology[]): GeneratedFinding[] {
    const findings: GeneratedFinding[] = [];

    // Red Flag: Security vulnerabilities
    const securityIssues = technologies.filter((t) => t.has_security_issues);
    if (securityIssues.length > 0) {
      findings.push({
        finding_type: 'red_flag',
        severity: 'critical',
        title: `${securityIssues.length} ${
          securityIssues.length === 1 ? 'Technology Has' : 'Technologies Have'
        } Security Vulnerabilities`,
        description: `Critical security vulnerabilities detected in: ${securityIssues
          .map((t) => t.name)
          .join(', ')}. ${securityIssues
          .map((t) => `${t.name}: ${t.security_details}`)
          .join('; ')}`,
        technology_ids: securityIssues.map((t) => t.id),
        impact_score: 95,
        recommendation:
          'Immediately update to patched versions or implement security mitigations. This is a critical blocker for acquisition.',
        metadata: {
          category: 'security',
          affected_count: securityIssues.length,
        },
      });
    }

    // Red Flag: Deprecated technologies
    const deprecated = technologies.filter((t) => t.is_deprecated);
    if (deprecated.length > 0) {
      findings.push({
        finding_type: 'red_flag',
        severity: 'high',
        title: `${deprecated.length} Deprecated ${
          deprecated.length === 1 ? 'Technology' : 'Technologies'
        } in Use`,
        description: `The following deprecated technologies are in active use: ${deprecated
          .map((t) => t.name)
          .join(', ')}. These technologies are no longer maintained and pose security and compatibility risks.`,
        technology_ids: deprecated.map((t) => t.id),
        impact_score: 80,
        recommendation:
          'Create migration roadmap to replace deprecated technologies with modern alternatives. Factor migration costs into valuation.',
        metadata: {
          category: 'technical_debt',
          affected_count: deprecated.length,
        },
      });
    }

    // Red Flag: Pure GPT wrapper (no proprietary AI)
    const aiTechs = technologies.filter((t) => t.category === 'ml_ai');
    const wrappers = aiTechs.filter((t) => t.authenticity === 'wrapper');
    const proprietary = aiTechs.filter((t) => t.authenticity === 'proprietary');

    if (wrappers.length > 0 && proprietary.length === 0) {
      findings.push({
        finding_type: 'red_flag',
        severity: 'high',
        title: 'AI Product is Pure GPT Wrapper - No Proprietary Technology',
        description: `The AI capabilities appear to be entirely based on third-party API calls (${wrappers
          .map((t) => t.name)
          .join(', ')}) without proprietary models or fine-tuning. This indicates limited defensibility and high dependency on external providers with no differentiation.`,
        technology_ids: wrappers.map((t) => t.id),
        impact_score: 85,
        recommendation:
          'Significant concern for AI valuations. Company has no proprietary AI moat and could be easily replicated. Consider substantial valuation discount or require AI development roadmap.',
        metadata: {
          category: 'ai_authenticity',
          wrapper_count: wrappers.length,
          proprietary_count: 0,
        },
      });
    }

    // Red Flag: No testing framework (for significant codebases)
    const hasBackend = technologies.some((t) => t.category === 'backend');
    const hasTesting = technologies.some((t) => t.category === 'testing');

    if (hasBackend && !hasTesting && technologies.length > 5) {
      findings.push({
        finding_type: 'red_flag',
        severity: 'high',
        title: 'No Automated Testing Framework Detected',
        description:
          'No testing framework detected despite having a backend application. Lack of automated tests significantly increases maintenance costs, bug risk, and development velocity concerns.',
        technology_ids: [],
        impact_score: 75,
        recommendation:
          'Implement comprehensive testing strategy (unit, integration, E2E tests). Factor testing debt into integration costs and timelines.',
        metadata: {
          category: 'quality_assurance',
          has_backend: true,
          has_testing: false,
        },
      });
    }

    return findings;
  }

  /**
   * Generate risks (potential issues to monitor)
   */
  private generateRisks(
    technologies: TechStackTechnology[],
    riskAssessment: RiskAssessment
  ): GeneratedFinding[] {
    const findings: GeneratedFinding[] = [];

    // Risk: Outdated technologies
    const outdated = technologies.filter((t) => t.is_outdated && !t.is_deprecated);
    if (outdated.length > 0) {
      findings.push({
        finding_type: 'risk',
        severity: 'medium',
        title: `${outdated.length} ${
          outdated.length === 1 ? 'Technology is' : 'Technologies Are'
        } Using Outdated Versions`,
        description: `The following technologies are using outdated versions: ${outdated
          .map((t) => `${t.name}${t.version ? ` (${t.version})` : ''}`)
          .join(', ')}. While not deprecated, these versions may have performance and security limitations.`,
        technology_ids: outdated.map((t) => t.id),
        impact_score: 55,
        recommendation:
          'Schedule updates to latest stable versions as part of post-acquisition integration. Budget 2-4 weeks for update testing and deployment.',
        metadata: {
          category: 'maintenance',
          affected_count: outdated.length,
        },
      });
    }

    // Risk: Hybrid AI approach
    const aiTechs = technologies.filter((t) => t.category === 'ml_ai');
    const hybrid = aiTechs.filter((t) => t.authenticity === 'hybrid');

    if (hybrid.length > 0) {
      findings.push({
        finding_type: 'risk',
        severity: 'medium',
        title: 'Hybrid AI Approach - Mixed Proprietary and Wrapper Components',
        description:
          'The AI stack includes both proprietary elements and third-party API calls. This creates dependency risk while also having custom development costs.',
        technology_ids: hybrid.map((t) => t.id),
        impact_score: 50,
        recommendation:
          'Evaluate AI roadmap to determine strategic direction: fully proprietary or managed third-party. Mixed approaches often lack clear differentiation.',
        metadata: {
          category: 'ai_strategy',
          hybrid_count: hybrid.length,
        },
      });
    }

    // Risk: Multiple frontend frameworks
    const frontendFrameworks = technologies.filter(
      (t) =>
        t.category === 'frontend' &&
        ['React', 'Vue', 'Angular', 'Svelte', 'Next.js'].includes(t.name)
    );

    if (frontendFrameworks.length > 1) {
      findings.push({
        finding_type: 'risk',
        severity: 'medium',
        title: 'Multiple Frontend Frameworks Increase Complexity',
        description: `Multiple frontend frameworks detected: ${frontendFrameworks
          .map((t) => t.name)
          .join(', ')}. This increases hiring difficulty, context switching costs, and maintenance burden.`,
        technology_ids: frontendFrameworks.map((t) => t.id),
        impact_score: 45,
        recommendation:
          'Consider consolidating to single framework during post-acquisition integration to reduce complexity and improve developer productivity.',
        metadata: {
          category: 'architecture',
          framework_count: frontendFrameworks.length,
          frameworks: frontendFrameworks.map((t) => t.name),
        },
      });
    }

    // Risk: No monitoring (for production apps)
    const hasBackend = technologies.some((t) => t.category === 'backend');
    const hasMonitoring = technologies.some((t) => t.category === 'monitoring');

    if (hasBackend && !hasMonitoring && technologies.length > 10) {
      findings.push({
        finding_type: 'risk',
        severity: 'medium',
        title: 'No Monitoring/Observability Tools Detected',
        description:
          'No monitoring or observability platform detected for production application. This makes it difficult to detect issues, track performance, and maintain SLAs.',
        technology_ids: [],
        impact_score: 60,
        recommendation:
          'Implement monitoring solution (Sentry, Datadog, New Relic) post-acquisition. Budget $500-2000/month for monitoring tools.',
        metadata: {
          category: 'operations',
          has_backend: true,
          has_monitoring: false,
        },
      });
    }

    // Risk: Low confidence detections
    const lowConfidence = technologies.filter(
      (t) => t.confidence_score < 0.7 && !t.manually_verified
    );

    if (lowConfidence.length > 3) {
      findings.push({
        finding_type: 'risk',
        severity: 'low',
        title: `${lowConfidence.length} Technologies Detected with Low Confidence`,
        description: `${lowConfidence.length} technologies were detected with low confidence scores and have not been manually verified. The actual tech stack may differ from this analysis.`,
        technology_ids: lowConfidence.map((t) => t.id),
        impact_score: 30,
        recommendation:
          'Conduct technical interview with engineering team to verify detected technologies and identify any missing components.',
        metadata: {
          category: 'data_quality',
          low_confidence_count: lowConfidence.length,
        },
      });
    }

    return findings;
  }

  /**
   * Generate opportunities (positive findings to leverage)
   */
  private generateOpportunities(technologies: TechStackTechnology[]): GeneratedFinding[] {
    const findings: GeneratedFinding[] = [];

    // Opportunity: Modern frontend framework
    const modernFrontend = technologies.filter(
      (t) =>
        t.category === 'frontend' &&
        ['React', 'Next.js', 'Vue', 'Svelte'].includes(t.name) &&
        !t.is_outdated
    );

    if (modernFrontend.length > 0) {
      findings.push({
        finding_type: 'opportunity',
        severity: 'info',
        title: 'Modern Frontend Stack Enables Fast Development',
        description: `Using ${modernFrontend.map((t) => t.name).join(' + ')}, a modern and widely-adopted frontend stack. This enables fast hiring and rapid feature development.`,
        technology_ids: modernFrontend.map((t) => t.id),
        impact_score: 70,
        recommendation:
          'Leverage modern frontend stack for rapid integration of new features post-acquisition. Large talent pool available.',
        metadata: {
          category: 'modernization',
          frameworks: modernFrontend.map((t) => t.name),
        },
      });
    }

    // Opportunity: Proprietary AI
    const proprietaryAI = technologies.filter(
      (t) => t.category === 'ml_ai' && t.authenticity === 'proprietary'
    );

    if (proprietaryAI.length > 0) {
      findings.push({
        finding_type: 'opportunity',
        severity: 'info',
        title: 'Proprietary AI Technology Provides Competitive Moat',
        description: `Company has developed proprietary AI capabilities (${proprietaryAI
          .map((t) => t.name)
          .join(', ')}), indicating genuine technical differentiation beyond GPT wrappers.`,
        technology_ids: proprietaryAI.map((t) => t.id),
        impact_score: 85,
        recommendation:
          'Significant value driver for AI acquisitions. Verify through technical deep dive with ML team. Proprietary models justify premium valuation.',
        metadata: {
          category: 'ai_value',
          proprietary_count: proprietaryAI.length,
        },
      });
    }

    // Opportunity: Cloud-native infrastructure
    const cloudInfra = technologies.filter(
      (t) =>
        t.category === 'infrastructure' &&
        ['AWS', 'Google Cloud', 'Azure', 'Vercel', 'Docker', 'Kubernetes'].includes(t.name)
    );

    if (cloudInfra.length >= 2) {
      findings.push({
        finding_type: 'opportunity',
        severity: 'info',
        title: 'Cloud-Native Infrastructure Enables Scalability',
        description: `Modern cloud infrastructure (${cloudInfra
          .map((t) => t.name)
          .join(', ')}) enables rapid scaling and reduces operational overhead.`,
        technology_ids: cloudInfra.map((t) => t.id),
        impact_score: 65,
        recommendation:
          'Cloud-native architecture facilitates integration and scaling post-acquisition. Lower infrastructure migration costs.',
        metadata: {
          category: 'scalability',
          cloud_providers: cloudInfra.map((t) => t.name),
        },
      });
    }

    // Opportunity: Automated testing in place
    const testingFrameworks = technologies.filter((t) => t.category === 'testing');

    if (testingFrameworks.length > 0) {
      findings.push({
        finding_type: 'opportunity',
        severity: 'info',
        title: 'Automated Testing Reduces Integration Risk',
        description: `Testing frameworks in place (${testingFrameworks
          .map((t) => t.name)
          .join(', ')}), indicating quality engineering practices. This reduces post-acquisition integration risk.`,
        technology_ids: testingFrameworks.map((t) => t.id),
        impact_score: 60,
        recommendation:
          'Existing test coverage reduces integration risk and enables confident refactoring. Verify test coverage metrics.',
        metadata: {
          category: 'quality',
          testing_frameworks: testingFrameworks.map((t) => t.name),
        },
      });
    }

    return findings;
  }

  /**
   * Generate strengths (what's working well)
   */
  private generateStrengths(technologies: TechStackTechnology[]): GeneratedFinding[] {
    const findings: GeneratedFinding[] = [];

    // Strength: Low overall risk
    const avgRiskScore =
      technologies.length > 0
        ? technologies.reduce((sum, t) => sum + (t.risk_score || 0), 0) / technologies.length
        : 0;

    if (avgRiskScore < 30 && technologies.length > 5) {
      findings.push({
        finding_type: 'strength',
        severity: 'info',
        title: 'Low Technical Risk Profile',
        description: `Technology stack shows low average risk score (${Math.round(
          avgRiskScore
        )}/100), indicating good technology choices and maintenance practices.`,
        technology_ids: [],
        impact_score: 70,
        recommendation:
          'Low technical risk supports smooth integration and reduces post-acquisition remediation costs.',
        metadata: {
          category: 'overall_quality',
          avg_risk_score: Math.round(avgRiskScore),
        },
      });
    }

    // Strength: Modern database
    const modernDB = technologies.filter(
      (t) =>
        t.category === 'database' &&
        ['PostgreSQL', 'Supabase', 'MongoDB'].includes(t.name) &&
        !t.is_outdated
    );

    if (modernDB.length > 0) {
      findings.push({
        finding_type: 'strength',
        severity: 'info',
        title: 'Modern Database Technology',
        description: `Using ${modernDB.map((t) => t.name).join(', ')}, modern database${
          modernDB.length > 1 ? 's' : ''
        } with strong community support and performance characteristics.`,
        technology_ids: modernDB.map((t) => t.id),
        impact_score: 55,
        recommendation:
          'Modern database technology reduces migration complexity and supports future scaling needs.',
        metadata: {
          category: 'data_architecture',
          databases: modernDB.map((t) => t.name),
        },
      });
    }

    // Strength: DevOps automation
    const devops = technologies.filter((t) => t.category === 'devops');

    if (devops.length > 0) {
      findings.push({
        finding_type: 'strength',
        severity: 'info',
        title: 'DevOps Automation in Place',
        description: `CI/CD and DevOps automation (${devops
          .map((t) => t.name)
          .join(', ')}) indicates mature engineering practices and deployment processes.`,
        technology_ids: devops.map((t) => t.id),
        impact_score: 65,
        recommendation:
          'Automated deployment pipelines reduce operational risk and enable faster feature delivery post-acquisition.',
        metadata: {
          category: 'engineering_practices',
          devops_tools: devops.map((t) => t.name),
        },
      });
    }

    return findings;
  }

  /**
   * Generate recommendations (actionable improvements)
   */
  private generateRecommendations(
    technologies: TechStackTechnology[],
    riskAssessment: RiskAssessment
  ): GeneratedFinding[] {
    const findings: GeneratedFinding[] = [];

    // Recommendation: Security audit
    const hasSecurityIssues = technologies.some((t) => t.has_security_issues);
    const outdatedCount = technologies.filter((t) => t.is_outdated).length;

    if (hasSecurityIssues || outdatedCount > technologies.length * 0.3) {
      findings.push({
        finding_type: 'recommendation',
        severity: 'high',
        title: 'Conduct Comprehensive Security Audit',
        description:
          'Given security vulnerabilities and/or outdated technologies, recommend comprehensive security audit before closing acquisition.',
        technology_ids: [],
        impact_score: 80,
        recommendation:
          'Engage third-party security firm for penetration testing and code audit. Budget $20-50K and 2-3 weeks for security assessment.',
        metadata: {
          category: 'security_audit',
          has_security_issues: hasSecurityIssues,
          outdated_percentage: Math.round((outdatedCount / technologies.length) * 100),
        },
      });
    }

    // Recommendation: Technical due diligence session
    const lowConfidence = technologies.filter((t) => t.confidence_score < 0.8).length;

    if (lowConfidence > technologies.length * 0.2) {
      findings.push({
        finding_type: 'recommendation',
        severity: 'medium',
        title: 'Schedule Technical Deep Dive with Engineering Team',
        description: `${lowConfidence} technologies detected with less than 80% confidence. Recommend technical interview with CTO/engineering team to verify stack and identify gaps.`,
        technology_ids: [],
        impact_score: 60,
        recommendation:
          'Schedule 2-3 hour technical session covering architecture, deployment, testing, and monitoring. Prepare specific questions about low-confidence detections.',
        metadata: {
          category: 'verification',
          low_confidence_count: lowConfidence,
        },
      });
    }

    // Recommendation: Modernization roadmap
    if (riskAssessment.risk_score > 60) {
      findings.push({
        finding_type: 'recommendation',
        severity: 'medium',
        title: 'Develop Technology Modernization Roadmap',
        description: `Overall risk score of ${riskAssessment.risk_score}/100 indicates significant technical debt. Recommend 12-18 month modernization roadmap.`,
        technology_ids: [],
        impact_score: 70,
        recommendation:
          'Create phased modernization plan: (1) Security fixes, (2) Critical deprecations, (3) Testing infrastructure, (4) General updates. Budget $200-500K for execution.',
        metadata: {
          category: 'roadmap',
          risk_score: riskAssessment.risk_score,
          critical_risks: riskAssessment.critical_risks,
          high_risks: riskAssessment.high_risks,
        },
      });
    }

    // Recommendation: AI strategy clarification (if AI present)
    const aiTechs = technologies.filter((t) => t.category === 'ml_ai');

    if (aiTechs.length > 0) {
      findings.push({
        finding_type: 'recommendation',
        severity: 'medium',
        title: 'Clarify AI Development Roadmap and Differentiation Strategy',
        description:
          'AI technologies detected. Recommend detailed session on AI roadmap, proprietary vs third-party strategy, and competitive differentiation.',
        technology_ids: aiTechs.map((t) => t.id),
        impact_score: 75,
        recommendation:
          'Request: (1) AI architecture diagrams, (2) Model training pipeline documentation, (3) API cost analysis, (4) Roadmap for proprietary model development.',
        metadata: {
          category: 'ai_strategy',
          ai_tech_count: aiTechs.length,
        },
      });
    }

    return findings;
  }

  /**
   * Convert generated finding to CreateFindingRequest
   */
  toCreateRequest(finding: GeneratedFinding, analysisId: string): CreateFindingRequest {
    return {
      analysis_id: analysisId,
      finding_type: finding.finding_type,
      severity: finding.severity,
      title: finding.title,
      description: finding.description,
      technology_ids: finding.technology_ids,
      impact_score: finding.impact_score,
      recommendation: finding.recommendation,
      metadata: finding.metadata,
    };
  }
}
