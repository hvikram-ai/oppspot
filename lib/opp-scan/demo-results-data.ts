import { 
  ScanResultsData, 
  ScanData, 
  TargetCompany, 
  FinancialAnalysis, 
  RiskAssessment, 
  MarketIntelligence,
  DueDiligence,
  ValuationModel,
  ScanReport,
  ScanSummary
} from './scan-results-data'

/**
 * Generates comprehensive demo data for scan results dashboard
 * This creates realistic, enterprise-grade sample data to showcase the full capabilities
 */
export class DemoResultsDataGenerator {
  
  generateDemoScanResults(scanId: string, scanName: string): ScanResultsData {
    const scan = this.generateDemoScan(scanId, scanName)
    const targets = this.generateDemoTargets(scanId, 18)
    const financialData = this.generateDemoFinancialData(targets)
    const riskData = this.generateDemoRiskData(targets)
    const marketIntelligence = this.generateDemoMarketIntelligence(scanId)
    const dueDiligence = this.generateDemoDueDiligence(targets)
    const valuationModels = this.generateDemoValuationModels(targets)
    const scanReports = this.generateDemoScanReports(scanId)
    const summary = this.generateDemoSummary(targets, financialData, riskData)

    return {
      scan,
      targets,
      financialData,
      riskData,
      marketIntelligence,
      dueDiligence,
      valuationModels,
      scanReports,
      summary
    }
  }

  private generateDemoScan(scanId: string, scanName: string): ScanData {
    return {
      id: scanId,
      user_id: 'demo-user',
      name: scanName,
      description: 'Comprehensive market scan for strategic acquisition opportunities',
      status: 'completed',
      progress_percentage: 100,
      current_step: 'completed',
      targets_identified: 18,
      targets_analyzed: 18,
      selected_industries: [
        { code: 'technology:fintech', name: 'Technology - FinTech' },
        { code: 'technology:healthtech', name: 'Technology - HealthTech' }
      ] as any,
      selected_regions: [
        { id: 'london', name: 'Greater London', country: 'England' },
        { id: 'manchester', name: 'Manchester', country: 'England' },
        { id: 'dublin', name: 'Dublin', country: 'Ireland' }
      ],
      market_maturity: ['scaling', 'mature'],
      required_capabilities: [
        'AI/ML Technology',
        'Customer Base',
        'Regulatory Compliance',
        'Technical Team'
      ],
      strategic_objectives: {
        primary: 'Market expansion',
        secondary: 'Technology acquisition',
        synergies: ['Cross-selling opportunities', 'Operational efficiencies']
      },
      data_sources: [
        'companies_house',
        'financial_data',
        'digital_footprint',
        'patents_ip',
        'news_media',
        'employee_data'
      ],
      scan_depth: 'comprehensive',
      created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      started_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
      completed_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
    }
  }

  private generateDemoTargets(scanId: string, count: number): TargetCompany[] {
    const targets: TargetCompany[] = []
    
    const finTechCompanies = [
      { name: 'PayFlow Solutions Ltd', website: 'payflow.com', description: 'Digital payment processing platform for SMEs' },
      { name: 'CryptoSecure Holdings', website: 'cryptosecure.co.uk', description: 'Blockchain security and custody services' },
      { name: 'LendingBridge UK', website: 'lendingbridge.co.uk', description: 'P2P lending platform for small businesses' },
      { name: 'InvestIQ Analytics', website: 'investiq.com', description: 'AI-powered investment research platform' },
      { name: 'RegTech Innovations', website: 'regtech.co.uk', description: 'Compliance automation for financial services' },
      { name: 'InsurTech Dynamics', website: 'insurtech.com', description: 'Digital insurance products and distribution' },
      { name: 'WealthMax Advisors', website: 'wealthmax.co.uk', description: 'Robo-advisory and wealth management platform' },
      { name: 'TradeTech Systems', website: 'tradetech.co.uk', description: 'Algorithmic trading infrastructure' },
      { name: 'FinDataPro Ltd', website: 'findatapro.com', description: 'Financial data aggregation and analytics' }
    ]

    const healthTechCompanies = [
      { name: 'HealthAI Diagnostics', website: 'healthai.co.uk', description: 'AI-powered medical diagnostic tools' },
      { name: 'TeleMed Connect', website: 'telemed.co.uk', description: 'Telemedicine platform and remote monitoring' },
      { name: 'BioData Systems', website: 'biodata.com', description: 'Clinical trial data management platform' },
      { name: 'MedSecure Solutions', website: 'medsecure.co.uk', description: 'Healthcare cybersecurity and compliance' },
      { name: 'PharmaTech Analytics', website: 'pharmatech.com', description: 'Drug discovery and development analytics' },
      { name: 'CareCoordinator Ltd', website: 'carecoordinator.co.uk', description: 'Patient care management system' },
      { name: 'DigitalHealth Hub', website: 'digitalhealthhub.com', description: 'Digital health platform for primary care' },
      { name: 'MedDevice Innovations', website: 'meddevice.co.uk', description: 'Smart medical device development' },
      { name: 'HealthData Insights', website: 'healthdata.co.uk', description: 'Healthcare analytics and population health' }
    ]

    const allCompanies = [...finTechCompanies, ...healthTechCompanies]

    for (let i = 0; i < Math.min(count, allCompanies.length); i++) {
      const company = allCompanies[i]
      const baseScore = 95 - (i * 4) // Start high and gradually decrease
      const randomVariation = (Math.random() - 0.5) * 10 // ±5 points
      const overallScore = Math.max(45, Math.min(98, baseScore + randomVariation))

      targets.push({
        id: `demo-target-${i + 1}`,
        scan_id: scanId,
        company_name: company.name,
        companies_house_number: `0${(12345678 + i).toString()}`,
        registration_country: Math.random() > 0.8 ? 'Ireland' : 'UK',
        website: `https://www.${company.website}`,
        industry_codes: i < finTechCompanies.length ? 
          ['K64', 'K66', 'J62'] : ['M70', 'M72', 'Q86'],
        business_description: company.description,
        year_incorporated: 2015 + Math.floor(Math.random() * 8),
        employee_count_range: this.getRandomEmployeeRange(),
        registered_address: {
          street: `${Math.floor(Math.random() * 999) + 1} ${this.getRandomStreetName()}`,
          city: this.getRandomCity(),
          postal_code: this.generateRandomPostcode(),
          country: 'UK'
        } as any,
        phone: `+44 ${Math.floor(Math.random() * 9000000000) + 1000000000}`,
        email: `contact@${company.website}`,
        discovery_source: this.getRandomDiscoverySource(),
        discovery_method: 'automated_search',
        discovery_confidence: Math.random() * 0.3 + 0.7, // 0.7-1.0
        overall_score: overallScore,
        strategic_fit_score: Math.random() * 0.3 + 0.7, // 0.7-1.0
        financial_health_score: Math.random() * 0.4 + 0.5, // 0.5-0.9
        risk_score: Math.random() * 0.4 + 0.1, // 0.1-0.5 (lower is better)
        analysis_status: Math.random() > 0.1 ? 'completed' : 'analyzing',
        created_at: new Date(Date.now() - Math.random() * 5 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - Math.random() * 1 * 24 * 60 * 60 * 1000).toISOString(),
        analyzed_at: new Date(Date.now() - Math.random() * 2 * 24 * 60 * 60 * 1000).toISOString()
      })
    }

    return targets.sort((a, b) => b.overall_score - a.overall_score)
  }

  private generateDemoFinancialData(targets: TargetCompany[]): FinancialAnalysis[] {
    return targets.map((target, index) => {
      const revenue = this.generateRevenueBySize(target.employee_count_range || '11-50')
      const grossProfit = revenue * (Math.random() * 0.4 + 0.3) // 30-70% gross margin
      const ebitda = revenue * (Math.random() * 0.25 + 0.05) // 5-30% EBITDA margin
      const netIncome = ebitda * (Math.random() * 0.4 + 0.4) // 40-80% of EBITDA
      
      return {
        id: `demo-financial-${index + 1}`,
        target_company_id: target.id,
        analysis_year: 2023,
        revenue,
        gross_profit: grossProfit,
        ebitda,
        net_income: netIncome,
        total_assets: revenue * (Math.random() * 1.5 + 0.5), // 0.5-2.0x revenue
        total_liabilities: revenue * (Math.random() * 0.8 + 0.2), // 0.2-1.0x revenue
        shareholders_equity: revenue * (Math.random() * 0.7 + 0.3), // 0.3-1.0x revenue
        cash_and_equivalents: revenue * (Math.random() * 0.3 + 0.1), // 0.1-0.4x revenue
        total_debt: revenue * (Math.random() * 0.5 + 0.1), // 0.1-0.6x revenue
        gross_margin: grossProfit / revenue,
        ebitda_margin: ebitda / revenue,
        net_margin: netIncome / revenue,
        roe: Math.random() * 0.25 + 0.05, // 5-30% ROE
        roa: Math.random() * 0.15 + 0.03, // 3-18% ROA
        debt_to_equity: Math.random() * 1.0 + 0.2, // 0.2-1.2
        current_ratio: Math.random() * 2.0 + 1.0, // 1.0-3.0
        quick_ratio: Math.random() * 1.5 + 0.5, // 0.5-2.0
        revenue_growth_3y: Math.random() * 0.6 + 0.05, // 5-65% CAGR
        profit_growth_3y: Math.random() * 0.8 + 0.1, // 10-90% CAGR
        employee_growth_3y: Math.random() * 0.4 + 0.05, // 5-45% CAGR
        altman_z_score: Math.random() * 3.0 + 1.0, // 1.0-4.0 (>2.99 is safe)
        credit_rating: this.getRandomCreditRating(),
        financial_distress_signals: Math.random() > 0.8 ? ['declining_margins'] : [],
        estimated_revenue_multiple: Math.random() * 6.0 + 2.0, // 2-8x revenue
        estimated_ebitda_multiple: Math.random() * 15.0 + 8.0, // 8-23x EBITDA
        estimated_enterprise_value: revenue * (Math.random() * 6.0 + 2.0),
        valuation_method: this.getRandomValuationMethod(),
        valuation_confidence: this.getRandomConfidence(),
        data_sources: {
          companies_house: true,
          credit_agencies: true,
          public_filings: true
        },
        data_quality_score: Math.random() * 0.3 + 0.7, // 0.7-1.0
        last_financial_update: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    })
  }

  private generateDemoRiskData(targets: TargetCompany[]): RiskAssessment[] {
    return targets.map((target, index) => {
      const overallRisk = Math.random() * 0.6 + 0.1 // 0.1-0.7
      const hasRedFlags = Math.random() > 0.85 // 15% chance of red flags
      
      return {
        id: `demo-risk-${index + 1}`,
        target_company_id: target.id,
        financial_risk_score: Math.random() * 0.5 + 0.1,
        financial_risk_factors: this.getRandomRiskFactors('financial'),
        operational_risk_score: Math.random() * 0.4 + 0.1,
        key_person_dependency: Math.random() > 0.7,
        customer_concentration_risk: Math.random() * 0.6 + 0.1, // 10-70%
        supplier_concentration_risk: Math.random() * 0.4 + 0.1, // 10-50%
        operational_risk_factors: this.getRandomRiskFactors('operational'),
        regulatory_risk_score: Math.random() * 0.3 + 0.1,
        compliance_status: {
          iso_27001: Math.random() > 0.4,
          gdpr_compliant: Math.random() > 0.2,
          pci_dss: target.company_name.toLowerCase().includes('pay') ? Math.random() > 0.3 : false
        },
        pending_investigations: hasRedFlags ? ['regulatory_inquiry'] : [],
        regulatory_risk_factors: this.getRandomRiskFactors('regulatory'),
        market_risk_score: Math.random() * 0.4 + 0.2,
        competitive_position: this.getRandomCompetitivePosition(),
        market_share_estimate: Math.random() * 0.15 + 0.01, // 1-16%
        competitive_threats: ['new_entrants', 'technology_disruption'],
        market_risk_factors: this.getRandomRiskFactors('market'),
        technology_risk_score: Math.random() * 0.4 + 0.1,
        ip_portfolio_strength: this.getRandomIPStrength(),
        technology_obsolescence_risk: Math.random() * 0.3 + 0.1,
        cybersecurity_assessment: {
          security_score: Math.random() * 40 + 60, // 60-100
          vulnerabilities_found: Math.floor(Math.random() * 5),
          last_assessment: new Date(Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        },
        technology_risk_factors: this.getRandomRiskFactors('technology'),
        esg_risk_score: Math.random() * 0.3 + 0.1,
        environmental_compliance: {
          carbon_neutral_target: Math.random() > 0.6,
          environmental_certifications: Math.random() > 0.7
        },
        social_responsibility_issues: [],
        governance_concerns: hasRedFlags ? ['board_composition'] : [],
        esg_risk_factors: this.getRandomRiskFactors('esg'),
        overall_risk_score: overallRisk,
        risk_category: this.getRiskCategory(overallRisk),
        risk_mitigation_strategies: this.getRandomMitigationStrategies(),
        red_flags: hasRedFlags ? this.getRandomRedFlags() : [],
        assessment_method: 'automated',
        confidence_level: Math.random() * 0.3 + 0.7,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    })
  }

  private generateDemoMarketIntelligence(scanId: string): MarketIntelligence[] {
    return [
      {
        id: 'demo-market-1',
        scan_id: scanId,
        industry_sector: 'Financial Technology',
        geographic_scope: { regions: ['UK', 'Ireland'], focus: 'B2B FinTech' },
        market_size_gbp: 12500000000, // £12.5B
        market_growth_rate: 0.185, // 18.5% CAGR
        market_maturity: 'growth',
        total_competitors: 450,
        market_concentration: 'moderate',
        top_competitors: [
          { name: 'Stripe', market_share: 0.15, type: 'international' },
          { name: 'GoCardless', market_share: 0.08, type: 'domestic' },
          { name: 'Wise', market_share: 0.06, type: 'domestic' }
        ] as any,
        barriers_to_entry: 'high',
        key_trends: [
          'Open banking adoption',
          'Embedded finance growth',
          'AI-powered risk assessment',
          'Regulatory standardization'
        ],
        growth_drivers: [
          'Digital transformation of SMEs',
          'Regulatory support (FCA sandbox)',
          'COVID-19 acceleration of digital payments'
        ],
        challenges: [
          'Increasing regulatory compliance costs',
          'Market saturation in payments',
          'Cybersecurity threats'
        ],
        ma_activity_level: 'high',
        recent_transactions: [
          { acquirer: 'JPMorgan', target: 'Nutmeg', value: 700000000, date: '2021-06' },
          { acquirer: 'Visa', target: 'Currencycloud', value: 963000000, date: '2021-12' }
        ] as any,
        average_valuation_multiples: {
          revenue_multiple: { median: 4.5, range: [2.2, 12.8] },
          ebitda_multiple: { median: 18.5, range: [8.2, 45.2] }
        },
        regulatory_environment: 'stable',
        upcoming_regulations: ['PSD3', 'Digital Services Act'],
        data_sources: { sources: ['PwC FinTech Survey', 'KPMG MnA Data', 'FCA Statistics'] },
        analysis_date: new Date().toISOString().split('T')[0],
        confidence_level: 0.87,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ]
  }

  private generateDemoDueDiligence(targets: TargetCompany[]): DueDiligence[] {
    return targets.slice(0, 8).map((target, index) => ({
      id: `demo-dd-${index + 1}`,
      target_company_id: target.id,
      documents_analyzed: [
        'Articles of Association',
        'Annual Returns',
        'Financial Statements (3 years)',
        'Key Customer Contracts',
        'Employment Agreements'
      ],
      document_completeness_score: Math.random() * 0.3 + 0.7, // 70-100%
      missing_documents: Math.random() > 0.8 ? ['Audit Reports', 'Tax Returns'] : [],
      corporate_structure: {
        entity_type: 'Private Limited Company',
        shareholders: [
          { name: 'Founder Holdings Ltd', percentage: 65 },
          { name: 'Employee Share Scheme', percentage: 15 },
          { name: 'Angel Investors', percentage: 20 }
        ]
      },
      subsidiary_companies: Math.random() > 0.7 ? [`${target.company_name} Services Ltd`] : [],
      legal_entity_type: 'Private Limited Company',
      jurisdiction: 'England and Wales',
      key_contracts: [
        { type: 'Customer', value: Math.random() * 2000000 + 500000, duration: '3 years' },
        { type: 'Supplier', value: Math.random() * 500000 + 100000, duration: '2 years' }
      ],
      contract_risk_assessment: {
        high_value_contracts: Math.floor(Math.random() * 3) + 1,
        termination_clauses: 'standard',
        penalty_provisions: 'moderate'
      },
      intellectual_property: [
        { type: 'Trademark', count: Math.floor(Math.random() * 3) + 1 },
        { type: 'Patent Applications', count: Math.floor(Math.random() * 5) },
        { type: 'Copyright', count: Math.floor(Math.random() * 10) + 5 }
      ],
      employee_structure: {
        total_employees: this.getEmployeeCountFromRange(target.employee_count_range || '11-50'),
        key_roles: ['CEO', 'CTO', 'Head of Sales', 'Head of Product'],
        retention_rate: Math.random() * 0.2 + 0.8 // 80-100%
      },
      employment_contracts_review: {
        standard_terms: true,
        non_compete_clauses: Math.random() > 0.4,
        notice_periods: '1-3 months'
      },
      pension_obligations: Math.random() * 200000 + 50000,
      hr_compliance_status: {
        employment_law: 'compliant',
        health_safety: 'compliant',
        data_protection: Math.random() > 0.2 ? 'compliant' : 'minor_issues'
      },
      operational_metrics: {
        customer_satisfaction: Math.random() * 20 + 80, // 80-100%
        employee_satisfaction: Math.random() * 25 + 75, // 75-100%
        system_uptime: Math.random() * 5 + 95 // 95-100%
      },
      it_infrastructure_assessment: {
        cloud_adoption: Math.random() > 0.3 ? 'high' : 'medium',
        security_posture: Math.random() > 0.2 ? 'good' : 'needs_improvement',
        scalability: Math.random() > 0.4 ? 'high' : 'medium'
      },
      supply_chain_analysis: {
        key_suppliers: Math.floor(Math.random() * 5) + 3,
        geographic_concentration: 'UK/EU focused',
        supply_risk: 'low'
      },
      customer_analysis: {
        top_10_concentration: Math.random() * 0.3 + 0.4, // 40-70%
        churn_rate: Math.random() * 0.1 + 0.05, // 5-15% annually
        customer_segments: ['SME', 'Enterprise', 'Individual']
      },
      environmental_assessments: [],
      sustainability_metrics: {
        carbon_footprint: 'measured',
        renewable_energy: Math.random() > 0.6
      },
      esg_compliance: {
        environmental: 'basic',
        social: 'good',
        governance: 'strong'
      },
      legal_issues: Math.random() > 0.9 ? ['minor_commercial_dispute'] : [],
      compliance_violations: [],
      financial_irregularities: [],
      operational_concerns: Math.random() > 0.8 ? ['key_person_dependency'] : [],
      due_diligence_score: Math.random() * 0.3 + 0.7, // 70-100%
      recommendation: this.getRandomRecommendation(),
      key_findings: [
        'Strong management team with relevant experience',
        'Robust customer base with low churn',
        'Scalable technology platform',
        'Clean legal and regulatory status'
      ],
      next_steps: [
        'Detailed financial audit',
        'Technical due diligence',
        'Management presentations',
        'Reference calls with key customers'
      ],
      analysis_depth: 'standard',
      automation_confidence: Math.random() * 0.3 + 0.7,
      manual_review_required: Math.random() > 0.7,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_verification_date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
    })) as unknown as DueDiligence[]
  }

  private generateDemoValuationModels(targets: TargetCompany[]): ValuationModel[] {
    return targets.slice(0, 10).map((target, index) => {
      const baseValuation = Math.random() * 20000000 + 5000000 // £5M - £25M
      
      return {
        id: `demo-valuation-${index + 1}`,
        target_company_id: target.id,
        model_type: this.getRandomValuationModelType(),
        base_case_valuation: baseValuation,
        bull_case_valuation: baseValuation * (Math.random() * 0.5 + 1.2), // 20-70% higher
        bear_case_valuation: baseValuation * (Math.random() * 0.3 + 0.6), // 40-90% of base
        key_assumptions: {
          revenue_growth: `${(Math.random() * 30 + 15).toFixed(1)}% CAGR`,
          ebitda_margin_improvement: `${(Math.random() * 5 + 2).toFixed(1)}% over 3 years`,
          market_multiple: `${(Math.random() * 8 + 4).toFixed(1)}x revenue`,
          discount_rate: `${(Math.random() * 5 + 8).toFixed(1)}%`
        },
        sensitivity_analysis: {
          revenue_growth: { '-10%': baseValuation * 0.85, '+10%': baseValuation * 1.15 },
          multiple: { '-1x': baseValuation * 0.9, '+1x': baseValuation * 1.1 }
        },
        valuation_date: new Date().toISOString().split('T')[0],
        model_confidence: this.getRandomConfidence(),
        created_by: 'AI Valuation Engine',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    })
  }

  private generateDemoScanReports(scanId: string): ScanReport[] {
    const reportTypes = [
      'executive_summary',
      'detailed_analysis',
      'target_comparison',
      'risk_assessment',
      'market_overview'
    ] as const

    return reportTypes.map((type, index) => ({
      id: `demo-report-${index + 1}`,
      scan_id: scanId,
      user_id: 'demo-user',
      report_type: type,
      report_title: this.getReportTitle(type),
      report_description: this.getReportDescription(type),
      content: { pages: Math.floor(Math.random() * 20) + 10 },
      format: 'pdf' as const,
      file_size: Math.floor(Math.random() * 5000000) + 1000000, // 1-6MB
      download_url: `/api/reports/demo-report-${index + 1}.pdf`,
      created_at: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString(),
      generated_at: new Date(Date.now() - Math.random() * 12 * 60 * 60 * 1000).toISOString(),
      expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
    }))
  }

  private generateDemoSummary(
    targets: TargetCompany[],
    financialData: FinancialAnalysis[],
    riskData: RiskAssessment[]
  ): ScanSummary {
    const totalTargets = targets.length
    const analyzedTargets = targets.filter(t => t.analysis_status === 'completed').length
    
    return {
      totalTargets,
      analyzedTargets,
      completionPercentage: (analyzedTargets / totalTargets) * 100,
      avgOverallScore: targets.reduce((sum, t) => sum + t.overall_score, 0) / totalTargets,
      avgStrategicFitScore: targets.reduce((sum, t) => sum + t.strategic_fit_score, 0) / totalTargets,
      avgFinancialHealthScore: targets.reduce((sum, t) => sum + t.financial_health_score, 0) / totalTargets,
      avgRiskScore: targets.reduce((sum, t) => sum + t.risk_score, 0) / totalTargets,
      highQualityTargets: targets.filter(t => t.overall_score > 80).length,
      mediumQualityTargets: targets.filter(t => t.overall_score >= 60 && t.overall_score <= 80).length,
      lowQualityTargets: targets.filter(t => t.overall_score < 60).length,
      lowRiskTargets: riskData.filter(r => r.risk_category === 'low').length,
      moderateRiskTargets: riskData.filter(r => r.risk_category === 'moderate').length,
      highRiskTargets: riskData.filter(r => r.risk_category === 'high').length,
      criticalRiskTargets: riskData.filter(r => r.risk_category === 'critical').length,
      totalEstimatedValue: financialData.reduce((sum, f) => sum + (f.estimated_enterprise_value || 0), 0),
      industryBreakdown: {
        'Financial Technology': 9,
        'Health Technology': 9
      },
      regionBreakdown: {
        'Greater London': 8,
        'Manchester': 4,
        'Dublin': 4,
        'Other': 2
      },
      sizeBreakdown: {
        '1-10': 3,
        '11-50': 8,
        '51-200': 5,
        '201-500': 2
      },
      topOpportunities: targets.slice(0, 5),
      riskAlerts: riskData
        .filter(r => r.red_flags && r.red_flags.length > 0)
        .slice(0, 3)
        .map(risk => ({
          target: targets.find(t => t.id === risk.target_company_id)!,
          risks: risk.red_flags || []
        })),
      keyInsights: [
        '78% of targets show strong strategic alignment with acquisition criteria',
        'Average revenue growth of 32% CAGR across portfolio companies',
        'Low regulatory risk profile with 94% compliance across key areas',
        'Total addressable market opportunity of £12.5B with 18.5% growth rate',
        'Strong management teams with relevant industry experience'
      ],
      nextActions: [
        'Initiate detailed due diligence for top 5 targets (score > 85)',
        'Complete technical assessment for 3 high-priority opportunities',
        'Address minor compliance gaps in 2 companies before proceeding',
        'Schedule management presentations with shortlisted targets',
        'Prepare initial offer structures for priority acquisitions'
      ]
    }
  }

  // Helper methods for realistic data generation
  private getRandomEmployeeRange(): string {
    const ranges = ['1-10', '11-50', '51-200', '201-500']
    return ranges[Math.floor(Math.random() * ranges.length)]
  }

  private generateRevenueBySize(employeeRange: string): number {
    const baseSizes = {
      '1-10': [200000, 1000000],     // £200K - £1M
      '11-50': [1000000, 8000000],   // £1M - £8M
      '51-200': [5000000, 25000000], // £5M - £25M
      '201-500': [15000000, 75000000] // £15M - £75M
    }
    
    const [min, max] = baseSizes[employeeRange as keyof typeof baseSizes] || [500000, 5000000]
    return Math.random() * (max - min) + min
  }

  private getEmployeeCountFromRange(range: string): number {
    const ranges = {
      '1-10': 5,
      '11-50': 25,
      '51-200': 100,
      '201-500': 300
    }
    return ranges[range as keyof typeof ranges] || 25
  }

  private getRandomStreetName(): string {
    const streets = [
      'High Street', 'King Street', 'Queen Street', 'Church Lane', 'Mill Road',
      'Victoria Road', 'Albert Street', 'George Street', 'Park Lane', 'The Green'
    ]
    return streets[Math.floor(Math.random() * streets.length)]
  }

  private getRandomCity(): string {
    const cities = [
      'London', 'Manchester', 'Birmingham', 'Leeds', 'Glasgow', 
      'Liverpool', 'Newcastle', 'Sheffield', 'Bristol', 'Edinburgh'
    ]
    return cities[Math.floor(Math.random() * cities.length)]
  }

  private generateRandomPostcode(): string {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    const numbers = '0123456789'
    return `${letters[Math.floor(Math.random() * letters.length)]}${letters[Math.floor(Math.random() * letters.length)]}${numbers[Math.floor(Math.random() * 10)]} ${numbers[Math.floor(Math.random() * 10)]}${letters[Math.floor(Math.random() * letters.length)]}${letters[Math.floor(Math.random() * letters.length)]}`
  }

  private getRandomDiscoverySource(): string {
    const sources = ['companies_house', 'digital_footprint', 'news_media', 'patent_filings', 'employee_data']
    return sources[Math.floor(Math.random() * sources.length)]
  }

  private getRandomCreditRating(): string {
    const ratings = ['AAA', 'AA', 'A', 'BBB', 'BB', 'B']
    return ratings[Math.floor(Math.random() * ratings.length)]
  }

  private getRandomValuationMethod(): string {
    const methods = ['comparable_company', 'dcf_model', 'precedent_transaction']
    return methods[Math.floor(Math.random() * methods.length)]
  }

  private getRandomConfidence(): 'low' | 'medium' | 'high' {
    const confidences: ('low' | 'medium' | 'high')[] = ['high', 'medium', 'medium', 'low']
    return confidences[Math.floor(Math.random() * confidences.length)]
  }

  private getRandomRiskFactors(type: string): string[] {
    const factors: { [key: string]: string[] } = {
      financial: ['declining_margins', 'high_debt_levels', 'cash_flow_volatility'],
      operational: ['key_person_dependency', 'technology_debt', 'supply_chain_risks'],
      regulatory: ['changing_regulations', 'compliance_gaps', 'licensing_requirements'],
      market: ['competitive_pressure', 'market_saturation', 'customer_concentration'],
      technology: ['legacy_systems', 'cybersecurity_gaps', 'ip_vulnerabilities'],
      esg: ['carbon_footprint', 'diversity_gaps', 'governance_weaknesses']
    }
    
    const available = factors[type] || []
    return available.slice(0, Math.floor(Math.random() * 2) + 1)
  }

  private getRandomCompetitivePosition(): 'leader' | 'strong' | 'moderate' | 'weak' | 'unknown' {
    const positions: ('leader' | 'strong' | 'moderate' | 'weak' | 'unknown')[] = 
      ['strong', 'moderate', 'moderate', 'weak', 'unknown']
    return positions[Math.floor(Math.random() * positions.length)]
  }

  private getRandomIPStrength(): 'strong' | 'moderate' | 'weak' | 'none' | 'unknown' {
    const strengths: ('strong' | 'moderate' | 'weak' | 'none' | 'unknown')[] = 
      ['moderate', 'moderate', 'weak', 'strong', 'unknown']
    return strengths[Math.floor(Math.random() * strengths.length)]
  }

  private getRiskCategory(riskScore: number): 'low' | 'moderate' | 'high' | 'critical' {
    if (riskScore < 0.25) return 'low'
    if (riskScore < 0.5) return 'moderate'
    if (riskScore < 0.75) return 'high'
    return 'critical'
  }

  private getRandomMitigationStrategies(): string[] {
    const strategies = [
      'diversify_customer_base',
      'strengthen_compliance_framework',
      'invest_in_technology_upgrades',
      'expand_management_team',
      'implement_risk_management_systems'
    ]
    return strategies.slice(0, Math.floor(Math.random() * 3) + 1)
  }

  private getRandomRedFlags(): string[] {
    const flags = [
      'pending_litigation',
      'regulatory_investigation',
      'key_customer_loss',
      'financial_irregularities',
      'management_turnover'
    ]
    return flags.slice(0, Math.floor(Math.random() * 2) + 1)
  }

  private getRandomRecommendation(): 'proceed' | 'proceed_with_conditions' | 'further_investigation' | 'reject' {
    const recommendations: ('proceed' | 'proceed_with_conditions' | 'further_investigation' | 'reject')[] = 
      ['proceed', 'proceed_with_conditions', 'proceed_with_conditions', 'further_investigation']
    return recommendations[Math.floor(Math.random() * recommendations.length)]
  }

  private getRandomValuationModelType(): 'dcf' | 'comparable_company' | 'precedent_transaction' | 'asset_based' | 'sum_of_parts' {
    const types: ('dcf' | 'comparable_company' | 'precedent_transaction' | 'asset_based' | 'sum_of_parts')[] = 
      ['comparable_company', 'dcf', 'precedent_transaction']
    return types[Math.floor(Math.random() * types.length)]
  }

  private getReportTitle(type: string): string {
    const titles: { [key: string]: string } = {
      executive_summary: 'Executive Summary - Strategic Acquisition Opportunities',
      detailed_analysis: 'Detailed Target Analysis & Financial Review',
      target_comparison: 'Comparative Target Analysis Matrix',
      risk_assessment: 'Comprehensive Risk Assessment Report',
      market_overview: 'Market Intelligence & Competitive Landscape'
    }
    return titles[type] || 'Scan Analysis Report'
  }

  private getReportDescription(type: string): string {
    const descriptions: { [key: string]: string } = {
      executive_summary: 'High-level overview of scan results with key recommendations',
      detailed_analysis: 'In-depth financial and operational analysis of identified targets',
      target_comparison: 'Side-by-side comparison of top acquisition candidates',
      risk_assessment: 'Multi-dimensional risk analysis across all target companies',
      market_overview: 'Industry trends, competitive dynamics, and market opportunities'
    }
    return descriptions[type] || 'Comprehensive analysis report'
  }
}

export const demoResultsDataGenerator = new DemoResultsDataGenerator()