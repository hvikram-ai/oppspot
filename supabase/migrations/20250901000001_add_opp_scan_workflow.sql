-- Opp Scan: Enterprise Acquisition Intelligence Workflow
-- Database Schema for £50,000 Premium Feature

-- ==========================================
-- WORKFLOW MANAGEMENT
-- ==========================================

-- Main workflow instances
CREATE TABLE acquisition_scans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Workflow metadata
    name TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL CHECK (status IN (
        'configuring',      -- Setting up scan parameters
        'scanning',         -- Active data collection
        'analyzing',        -- AI analysis in progress
        'completed',        -- Scan finished successfully
        'failed',          -- Scan encountered errors
        'paused'           -- Scan temporarily stopped
    )) DEFAULT 'configuring',
    
    -- Workflow configuration
    config JSONB NOT NULL DEFAULT '{}',
    
    -- Industry selection (Step 1)
    selected_industries JSONB, -- Array of industry codes and sub-sectors
    market_maturity TEXT[], -- emerging, scaling, mature, consolidating
    
    -- Geographic scope (Step 2)
    selected_regions JSONB, -- UK/Ireland regions with regulatory zones
    regulatory_requirements JSONB, -- Compliance requirements
    cross_border_considerations JSONB,
    
    -- Service/capability mapping (Step 3)
    required_capabilities JSONB, -- Capability matrix
    strategic_objectives JSONB, -- What they're looking to acquire
    synergy_requirements JSONB, -- Must-have synergies
    
    -- Scanning parameters (Step 4)
    data_sources TEXT[] DEFAULT ARRAY[
        'companies_house',
        'financial_data',
        'digital_footprint',
        'patents_ip',
        'news_media',
        'employee_data',
        'customer_reviews',
        'competitive_intelligence',
        'regulatory_filings',
        'market_data'
    ],
    scan_depth TEXT DEFAULT 'comprehensive' CHECK (scan_depth IN ('basic', 'detailed', 'comprehensive')),
    
    -- Progress tracking
    progress_percentage INTEGER DEFAULT 0,
    current_step TEXT DEFAULT 'industry_selection',
    targets_identified INTEGER DEFAULT 0,
    targets_analyzed INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

-- Index for performance
CREATE INDEX idx_acquisition_scans_user_id ON acquisition_scans(user_id);
CREATE INDEX idx_acquisition_scans_org_id ON acquisition_scans(org_id);
CREATE INDEX idx_acquisition_scans_status ON acquisition_scans(status);

-- ==========================================
-- TARGET COMPANY MANAGEMENT
-- ==========================================

-- Identified acquisition targets
CREATE TABLE target_companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scan_id UUID REFERENCES acquisition_scans(id) ON DELETE CASCADE,
    business_id UUID REFERENCES businesses(id) ON DELETE SET NULL,
    
    -- Company identification
    company_name TEXT NOT NULL,
    companies_house_number TEXT,
    registration_country TEXT DEFAULT 'UK',
    
    -- Basic company info
    website TEXT,
    industry_codes TEXT[],
    business_description TEXT,
    year_incorporated INTEGER,
    employee_count_range TEXT,
    
    -- Contact information
    registered_address JSONB,
    trading_address JSONB,
    phone TEXT,
    email TEXT,
    
    -- Discovery metadata
    discovery_source TEXT NOT NULL, -- which data source found this target
    discovery_method TEXT, -- search query, recommendation, etc.
    discovery_confidence DECIMAL(3,2) DEFAULT 0.0, -- 0-1 confidence score
    
    -- Scoring and ranking
    overall_score DECIMAL(5,2) DEFAULT 0.0, -- 0-100 composite score
    strategic_fit_score DECIMAL(3,2) DEFAULT 0.0, -- 0-1 strategic alignment
    financial_health_score DECIMAL(3,2) DEFAULT 0.0, -- 0-1 financial strength
    risk_score DECIMAL(3,2) DEFAULT 0.0, -- 0-1 risk level (lower is better)
    
    -- Status tracking
    analysis_status TEXT DEFAULT 'pending' CHECK (analysis_status IN (
        'pending',      -- Not yet analyzed
        'analyzing',    -- Analysis in progress
        'completed',    -- Analysis finished
        'excluded',     -- Manually excluded
        'shortlisted'   -- Added to shortlist
    )),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    analyzed_at TIMESTAMPTZ
);

-- Indexes for performance
CREATE INDEX idx_target_companies_scan_id ON target_companies(scan_id);
CREATE INDEX idx_target_companies_overall_score ON target_companies(overall_score DESC);
CREATE INDEX idx_target_companies_analysis_status ON target_companies(analysis_status);

-- ==========================================
-- FINANCIAL ANALYSIS
-- ==========================================

-- Detailed financial metrics and analysis
CREATE TABLE financial_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    target_company_id UUID REFERENCES target_companies(id) ON DELETE CASCADE,
    
    -- Financial metrics (latest available year)
    analysis_year INTEGER,
    revenue DECIMAL(15,2),
    gross_profit DECIMAL(15,2),
    ebitda DECIMAL(15,2),
    net_income DECIMAL(15,2),
    total_assets DECIMAL(15,2),
    total_liabilities DECIMAL(15,2),
    shareholders_equity DECIMAL(15,2),
    cash_and_equivalents DECIMAL(15,2),
    total_debt DECIMAL(15,2),
    
    -- Financial ratios
    gross_margin DECIMAL(5,4),
    ebitda_margin DECIMAL(5,4),
    net_margin DECIMAL(5,4),
    roe DECIMAL(5,4), -- Return on Equity
    roa DECIMAL(5,4), -- Return on Assets
    debt_to_equity DECIMAL(5,4),
    current_ratio DECIMAL(5,4),
    quick_ratio DECIMAL(5,4),
    
    -- Growth metrics (3-year CAGR where available)
    revenue_growth_3y DECIMAL(5,4),
    profit_growth_3y DECIMAL(5,4),
    employee_growth_3y DECIMAL(5,4),
    
    -- Financial health indicators
    altman_z_score DECIMAL(5,2), -- Bankruptcy prediction
    credit_rating TEXT,
    financial_distress_signals JSONB, -- Array of warning signs
    
    -- Valuation metrics
    estimated_revenue_multiple DECIMAL(5,2),
    estimated_ebitda_multiple DECIMAL(5,2),
    estimated_enterprise_value DECIMAL(15,2),
    valuation_method TEXT,
    valuation_confidence TEXT CHECK (valuation_confidence IN ('low', 'medium', 'high')),
    
    -- Data source and quality
    data_sources JSONB, -- Which sources provided the data
    data_quality_score DECIMAL(3,2) DEFAULT 0.0, -- 0-1 data reliability
    last_financial_update DATE,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_financial_analysis_target_id ON financial_analysis(target_company_id);

-- ==========================================
-- RISK ASSESSMENT
-- ==========================================

-- Multi-dimensional risk evaluation
CREATE TABLE risk_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    target_company_id UUID REFERENCES target_companies(id) ON DELETE CASCADE,
    
    -- Financial risks
    financial_risk_score DECIMAL(3,2) DEFAULT 0.0,
    financial_risk_factors JSONB, -- Specific risk items and descriptions
    
    -- Operational risks
    operational_risk_score DECIMAL(3,2) DEFAULT 0.0,
    key_person_dependency BOOLEAN DEFAULT FALSE,
    customer_concentration_risk DECIMAL(3,2), -- Top 5 customers as % of revenue
    supplier_concentration_risk DECIMAL(3,2), -- Top 5 suppliers dependency
    operational_risk_factors JSONB,
    
    -- Regulatory and compliance risks
    regulatory_risk_score DECIMAL(3,2) DEFAULT 0.0,
    compliance_status JSONB, -- Industry certifications, licenses
    pending_investigations JSONB, -- Any regulatory issues
    regulatory_risk_factors JSONB,
    
    -- Market and competitive risks
    market_risk_score DECIMAL(3,2) DEFAULT 0.0,
    competitive_position TEXT CHECK (competitive_position IN ('leader', 'strong', 'moderate', 'weak', 'unknown')),
    market_share_estimate DECIMAL(5,4),
    competitive_threats JSONB,
    market_risk_factors JSONB,
    
    -- Technology and IP risks
    technology_risk_score DECIMAL(3,2) DEFAULT 0.0,
    ip_portfolio_strength TEXT CHECK (ip_portfolio_strength IN ('strong', 'moderate', 'weak', 'none', 'unknown')),
    technology_obsolescence_risk DECIMAL(3,2),
    cybersecurity_assessment JSONB,
    technology_risk_factors JSONB,
    
    -- ESG (Environmental, Social, Governance) risks
    esg_risk_score DECIMAL(3,2) DEFAULT 0.0,
    environmental_compliance JSONB,
    social_responsibility_issues JSONB,
    governance_concerns JSONB,
    esg_risk_factors JSONB,
    
    -- Overall risk assessment
    overall_risk_score DECIMAL(3,2) DEFAULT 0.0,
    risk_category TEXT CHECK (risk_category IN ('low', 'moderate', 'high', 'critical')),
    risk_mitigation_strategies JSONB,
    red_flags JSONB, -- Critical issues that could kill the deal
    
    -- Assessment metadata
    assessment_method TEXT DEFAULT 'automated',
    confidence_level DECIMAL(3,2) DEFAULT 0.0,
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_risk_assessments_target_id ON risk_assessments(target_company_id);
CREATE INDEX idx_risk_assessments_overall_score ON risk_assessments(overall_risk_score);

-- ==========================================
-- MARKET INTELLIGENCE
-- ==========================================

-- Industry and competitive landscape data
CREATE TABLE market_intelligence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scan_id UUID REFERENCES acquisition_scans(id) ON DELETE CASCADE,
    
    -- Market definition
    industry_sector TEXT NOT NULL,
    geographic_scope JSONB, -- Regions/countries covered
    
    -- Market size and growth
    market_size_gbp DECIMAL(15,2), -- Total addressable market
    market_growth_rate DECIMAL(5,4), -- Annual growth rate
    market_maturity TEXT CHECK (market_maturity IN ('emerging', 'growth', 'mature', 'declining')),
    
    -- Competitive landscape
    total_competitors INTEGER,
    market_concentration TEXT CHECK (market_concentration IN ('fragmented', 'moderate', 'concentrated', 'monopolistic')),
    top_competitors JSONB, -- Array of leading companies
    barriers_to_entry TEXT CHECK (barriers_to_entry IN ('low', 'moderate', 'high', 'very_high')),
    
    -- Market trends
    key_trends JSONB, -- Important market developments
    growth_drivers JSONB, -- Factors driving market growth
    challenges JSONB, -- Market challenges and threats
    
    -- Consolidation activity
    ma_activity_level TEXT CHECK (ma_activity_level IN ('low', 'moderate', 'high', 'very_high')),
    recent_transactions JSONB, -- Notable recent deals
    average_valuation_multiples JSONB, -- Industry benchmarks
    
    -- Regulatory environment
    regulatory_environment TEXT CHECK (regulatory_environment IN ('favorable', 'stable', 'changing', 'restrictive')),
    upcoming_regulations JSONB, -- Future regulatory changes
    
    -- Data metadata
    data_sources JSONB,
    analysis_date DATE DEFAULT CURRENT_DATE,
    confidence_level DECIMAL(3,2) DEFAULT 0.0,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_market_intelligence_scan_id ON market_intelligence(scan_id);
CREATE INDEX idx_market_intelligence_sector ON market_intelligence(industry_sector);

-- ==========================================
-- DUE DILIGENCE AUTOMATION
-- ==========================================

-- Document analysis and verification results
CREATE TABLE due_diligence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    target_company_id UUID REFERENCES target_companies(id) ON DELETE CASCADE,
    
    -- Document verification
    documents_analyzed JSONB, -- List of analyzed documents
    document_completeness_score DECIMAL(3,2) DEFAULT 0.0,
    missing_documents JSONB, -- Required docs not found
    
    -- Legal structure
    corporate_structure JSONB, -- Ownership hierarchy
    subsidiary_companies JSONB, -- Related entities
    legal_entity_type TEXT,
    jurisdiction TEXT,
    
    -- Contracts and agreements
    key_contracts JSONB, -- Major customer/supplier contracts
    contract_risk_assessment JSONB,
    intellectual_property JSONB, -- Patents, trademarks, copyrights
    
    -- Employment and HR
    employee_structure JSONB, -- Org chart, key personnel
    employment_contracts_review JSONB,
    pension_obligations DECIMAL(15,2),
    hr_compliance_status JSONB,
    
    -- Operations
    operational_metrics JSONB, -- KPIs, performance indicators
    it_infrastructure_assessment JSONB,
    supply_chain_analysis JSONB,
    customer_analysis JSONB,
    
    -- Environmental and sustainability
    environmental_assessments JSONB,
    sustainability_metrics JSONB,
    esg_compliance JSONB,
    
    -- Red flags and concerns
    legal_issues JSONB, -- Litigation, disputes
    compliance_violations JSONB,
    financial_irregularities JSONB,
    operational_concerns JSONB,
    
    -- Overall assessment
    due_diligence_score DECIMAL(3,2) DEFAULT 0.0,
    recommendation TEXT CHECK (recommendation IN (
        'proceed',      -- Green light
        'proceed_with_conditions', -- Proceed but address issues
        'further_investigation', -- Need more information
        'reject'        -- Do not proceed
    )),
    key_findings JSONB,
    next_steps JSONB,
    
    -- Analysis metadata
    analysis_depth TEXT CHECK (analysis_depth IN ('preliminary', 'standard', 'comprehensive')),
    automation_confidence DECIMAL(3,2) DEFAULT 0.0,
    manual_review_required BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_verification_date TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_due_diligence_target_id ON due_diligence(target_company_id);
CREATE INDEX idx_due_diligence_recommendation ON due_diligence(recommendation);

-- ==========================================
-- VALUATION MODELS
-- ==========================================

-- Financial modeling and scenario analysis
CREATE TABLE valuation_models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    target_company_id UUID REFERENCES target_companies(id) ON DELETE CASCADE,
    
    -- Valuation approach
    valuation_method TEXT NOT NULL CHECK (valuation_method IN (
        'dcf',              -- Discounted Cash Flow
        'comparable_company', -- Public company multiples
        'precedent_transaction', -- M&A transaction multiples
        'asset_based',      -- Net asset value
        'hybrid'            -- Combination of methods
    )),
    
    -- DCF Model inputs
    revenue_projections JSONB, -- 5-year revenue forecast
    expense_projections JSONB, -- Operating expense forecast
    capex_projections JSONB, -- Capital expenditure forecast
    working_capital_projections JSONB,
    terminal_growth_rate DECIMAL(5,4),
    discount_rate DECIMAL(5,4), -- WACC
    
    -- Multiple-based valuation
    revenue_multiple_range JSONB, -- Min, max, median multiples
    ebitda_multiple_range JSONB,
    comparable_companies JSONB, -- Public company benchmarks
    precedent_transactions JSONB, -- Recent M&A deals
    
    -- Valuation outputs
    base_case_value DECIMAL(15,2),
    bull_case_value DECIMAL(15,2),
    bear_case_value DECIMAL(15,2),
    probability_weighted_value DECIMAL(15,2),
    
    -- Value breakdown
    enterprise_value DECIMAL(15,2),
    equity_value DECIMAL(15,2),
    net_debt_adjustment DECIMAL(15,2),
    
    -- Scenario analysis
    scenarios JSONB, -- Different growth/performance scenarios
    sensitivity_analysis JSONB, -- Key variable sensitivity
    monte_carlo_results JSONB, -- Statistical analysis results
    
    -- Synergy assumptions
    revenue_synergies DECIMAL(15,2),
    cost_synergies DECIMAL(15,2),
    one_time_costs DECIMAL(15,2), -- Integration costs
    synergy_realization_timeline JSONB,
    
    -- Model metadata
    model_version INTEGER DEFAULT 1,
    assumptions JSONB, -- Key model assumptions
    confidence_interval JSONB, -- Statistical confidence bounds
    model_quality_score DECIMAL(3,2) DEFAULT 0.0,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    model_date DATE DEFAULT CURRENT_DATE
);

CREATE INDEX idx_valuation_models_target_id ON valuation_models(target_company_id);
CREATE INDEX idx_valuation_models_method ON valuation_models(valuation_method);

-- ==========================================
-- SCAN REPORTS AND EXPORTS
-- ==========================================

-- Generated reports and exports
CREATE TABLE scan_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scan_id UUID REFERENCES acquisition_scans(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Report details
    report_type TEXT NOT NULL CHECK (report_type IN (
        'executive_summary',
        'detailed_analysis',
        'target_comparison',
        'market_overview',
        'due_diligence_summary',
        'valuation_analysis',
        'risk_assessment',
        'compliance_report'
    )),
    
    report_title TEXT NOT NULL,
    report_description TEXT,
    
    -- Content and formatting
    report_content JSONB, -- Structured report data
    report_format TEXT DEFAULT 'pdf' CHECK (report_format IN ('pdf', 'excel', 'powerpoint', 'json', 'csv')),
    template_used TEXT,
    
    -- File information
    file_path TEXT, -- Path to generated file
    file_size BIGINT, -- File size in bytes
    download_count INTEGER DEFAULT 0,
    
    -- Access control
    is_confidential BOOLEAN DEFAULT TRUE,
    shared_with JSONB, -- Array of user IDs who can access
    access_level TEXT DEFAULT 'private' CHECK (access_level IN ('private', 'team', 'organization', 'public')),
    
    -- Status
    generation_status TEXT DEFAULT 'pending' CHECK (generation_status IN (
        'pending',
        'generating',
        'completed',
        'failed'
    )),
    generation_error TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    generated_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '90 days')
);

CREATE INDEX idx_scan_reports_scan_id ON scan_reports(scan_id);
CREATE INDEX idx_scan_reports_user_id ON scan_reports(user_id);
CREATE INDEX idx_scan_reports_type ON scan_reports(report_type);

-- ==========================================
-- SYSTEM CONFIGURATION
-- ==========================================

-- Industry taxonomy and categories
CREATE TABLE industry_taxonomy (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Hierarchy
    parent_id UUID REFERENCES industry_taxonomy(id),
    level INTEGER NOT NULL CHECK (level >= 0), -- 0=sector, 1=industry, 2=sub-industry
    
    -- Identification codes
    sic_code TEXT,
    naics_code TEXT,
    custom_code TEXT,
    
    -- Names and descriptions
    name TEXT NOT NULL,
    description TEXT,
    keywords TEXT[], -- Search keywords
    
    -- Market data
    typical_business_size TEXT CHECK (typical_business_size IN ('micro', 'small', 'medium', 'large', 'enterprise')),
    consolidation_opportunity TEXT CHECK (consolidation_opportunity IN ('low', 'moderate', 'high', 'very_high')),
    regulatory_complexity TEXT CHECK (regulatory_complexity IN ('low', 'moderate', 'high', 'very_high')),
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_industry_taxonomy_parent ON industry_taxonomy(parent_id);
CREATE INDEX idx_industry_taxonomy_level ON industry_taxonomy(level);
CREATE INDEX idx_industry_taxonomy_sic ON industry_taxonomy(sic_code);

-- ==========================================
-- DATA SOURCE CONFIGURATIONS
-- ==========================================

-- Configuration for external data sources
CREATE TABLE data_source_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Source identification
    source_name TEXT NOT NULL UNIQUE,
    source_type TEXT NOT NULL CHECK (source_type IN (
        'api',          -- REST/GraphQL API
        'database',     -- Direct database connection
        'file_feed',    -- Regular file uploads/FTP
        'web_scraping', -- Web scraping
        'manual'        -- Manual data entry
    )),
    
    -- Connection details
    endpoint_url TEXT,
    authentication JSONB, -- API keys, credentials (encrypted)
    rate_limits JSONB, -- Request limits and timing
    
    -- Data mapping
    field_mappings JSONB, -- How source fields map to our schema
    data_transformations JSONB, -- Data processing rules
    
    -- Quality and reliability
    reliability_score DECIMAL(3,2) DEFAULT 1.0, -- 0-1 reliability rating
    update_frequency TEXT, -- How often data is refreshed
    last_successful_sync TIMESTAMPTZ,
    sync_error_count INTEGER DEFAULT 0,
    
    -- Usage tracking
    total_requests INTEGER DEFAULT 0,
    successful_requests INTEGER DEFAULT 0,
    cost_per_request DECIMAL(10,4), -- Cost in GBP per API call
    monthly_budget DECIMAL(10,2), -- Monthly spending limit
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    is_premium BOOLEAN DEFAULT FALSE, -- Requires premium subscription
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_data_source_configs_name ON data_source_configs(source_name);
CREATE INDEX idx_data_source_configs_active ON data_source_configs(is_active);

-- ==========================================
-- AUDIT AND COMPLIANCE
-- ==========================================

-- Audit trail for all scan activities
CREATE TABLE scan_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Context
    scan_id UUID REFERENCES acquisition_scans(id) ON DELETE CASCADE,
    target_company_id UUID REFERENCES target_companies(id) ON DELETE SET NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Action details
    action_type TEXT NOT NULL,
    action_description TEXT,
    
    -- Before and after state
    before_state JSONB,
    after_state JSONB,
    
    -- Request metadata
    ip_address INET,
    user_agent TEXT,
    session_id TEXT,
    
    -- Compliance
    data_accessed JSONB, -- What data was accessed
    legal_basis TEXT, -- GDPR legal basis for processing
    retention_period INTEGER, -- Days to retain this data
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_scan_audit_log_scan_id ON scan_audit_log(scan_id);
CREATE INDEX idx_scan_audit_log_user_id ON scan_audit_log(user_id);
CREATE INDEX idx_scan_audit_log_created_at ON scan_audit_log(created_at);

-- ==========================================
-- TRIGGERS AND FUNCTIONS
-- ==========================================

-- Update timestamp function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update triggers to relevant tables
CREATE TRIGGER update_acquisition_scans_updated_at BEFORE UPDATE ON acquisition_scans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_target_companies_updated_at BEFORE UPDATE ON target_companies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_financial_analysis_updated_at BEFORE UPDATE ON financial_analysis FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_risk_assessments_updated_at BEFORE UPDATE ON risk_assessments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_market_intelligence_updated_at BEFORE UPDATE ON market_intelligence FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_due_diligence_updated_at BEFORE UPDATE ON due_diligence FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_valuation_models_updated_at BEFORE UPDATE ON valuation_models FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_scan_reports_updated_at BEFORE UPDATE ON scan_reports FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_industry_taxonomy_updated_at BEFORE UPDATE ON industry_taxonomy FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_data_source_configs_updated_at BEFORE UPDATE ON data_source_configs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate overall target score
CREATE OR REPLACE FUNCTION calculate_target_score(
    target_id UUID
) RETURNS DECIMAL AS $$
DECLARE
    financial_score DECIMAL := 0.0;
    strategic_score DECIMAL := 0.0;
    risk_score DECIMAL := 0.0;
    overall_score DECIMAL := 0.0;
BEGIN
    -- Get financial health score
    SELECT COALESCE(
        CASE 
            WHEN revenue > 0 AND ebitda > 0 THEN 
                LEAST(100, GREATEST(0, (
                    (revenue_growth_3y * 25) + 
                    (ebitda_margin * 50) + 
                    (CASE WHEN altman_z_score > 2.99 THEN 25 ELSE altman_z_score * 8.33 END)
                )))
            ELSE 50.0
        END, 50.0
    ) INTO financial_score
    FROM financial_analysis 
    WHERE target_company_id = target_id;
    
    -- Get strategic fit score from target_companies
    SELECT COALESCE(strategic_fit_score * 100, 50.0) INTO strategic_score
    FROM target_companies 
    WHERE id = target_id;
    
    -- Get inverse risk score (lower risk = higher score)
    SELECT COALESCE((1.0 - overall_risk_score) * 100, 50.0) INTO risk_score
    FROM risk_assessments 
    WHERE target_company_id = target_id;
    
    -- Calculate weighted overall score
    overall_score := (financial_score * 0.4) + (strategic_score * 0.35) + (risk_score * 0.25);
    
    RETURN GREATEST(0, LEAST(100, overall_score));
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- INITIAL DATA
-- ==========================================

-- Insert basic industry taxonomy
INSERT INTO industry_taxonomy (parent_id, level, sic_code, name, description) VALUES
(NULL, 0, '01-03', 'Agriculture, Forestry and Fishing', 'Primary sector activities including farming, forestry, and fishing'),
(NULL, 0, '05-09', 'Mining and Quarrying', 'Extraction of minerals and energy resources'),
(NULL, 0, '10-33', 'Manufacturing', 'Production and processing of goods'),
(NULL, 0, '35', 'Electricity, Gas, Steam and Air Conditioning Supply', 'Utilities and energy supply'),
(NULL, 0, '36-39', 'Water Supply; Sewerage, Waste Management', 'Water and waste management services'),
(NULL, 0, '41-43', 'Construction', 'Building and construction activities'),
(NULL, 0, '45-47', 'Wholesale and Retail Trade', 'Trading and distribution of goods'),
(NULL, 0, '49-53', 'Transportation and Storage', 'Movement of goods and people'),
(NULL, 0, '55-56', 'Accommodation and Food Service Activities', 'Hotels, restaurants, and catering'),
(NULL, 0, '58-63', 'Information and Communication', 'IT, telecommunications, and media'),
(NULL, 0, '64-66', 'Financial and Insurance Activities', 'Banking, insurance, and financial services'),
(NULL, 0, '68', 'Real Estate Activities', 'Property development and management'),
(NULL, 0, '69-75', 'Professional, Scientific and Technical Activities', 'Consulting, legal, and technical services'),
(NULL, 0, '77-82', 'Administrative and Support Service Activities', 'Business support and administrative services'),
(NULL, 0, '84', 'Public Administration and Defence', 'Government and public sector'),
(NULL, 0, '85', 'Education', 'Educational services and institutions'),
(NULL, 0, '86-88', 'Human Health and Social Work Activities', 'Healthcare and social services'),
(NULL, 0, '90-93', 'Arts, Entertainment and Recreation', 'Creative industries and entertainment'),
(NULL, 0, '94-96', 'Other Service Activities', 'Personal and household services'),
(NULL, 0, '97-98', 'Activities of Households', 'Household activities and employment');

-- Insert basic data source configurations
INSERT INTO data_source_configs (source_name, source_type, reliability_score, is_active, is_premium) VALUES
('companies_house', 'api', 0.95, TRUE, FALSE),
('financial_data', 'api', 0.85, TRUE, TRUE),
('digital_footprint', 'api', 0.75, TRUE, TRUE),
('patents_ip', 'api', 0.90, TRUE, TRUE),
('news_media', 'api', 0.80, TRUE, TRUE),
('employee_data', 'api', 0.70, TRUE, TRUE),
('customer_reviews', 'api', 0.65, TRUE, FALSE),
('competitive_intelligence', 'api', 0.85, TRUE, TRUE),
('regulatory_filings', 'api', 0.90, TRUE, TRUE),
('market_data', 'api', 0.85, TRUE, TRUE);

COMMENT ON TABLE acquisition_scans IS 'Main workflow instances for the Opp Scan acquisition intelligence system';
COMMENT ON TABLE target_companies IS 'Identified acquisition targets with scoring and analysis status';
COMMENT ON TABLE financial_analysis IS 'Detailed financial metrics and health assessment for targets';
COMMENT ON TABLE risk_assessments IS 'Multi-dimensional risk evaluation covering financial, operational, regulatory, and market risks';
COMMENT ON TABLE market_intelligence IS 'Industry and competitive landscape analysis for each scan';
COMMENT ON TABLE due_diligence IS 'Automated document analysis and verification results';
COMMENT ON TABLE valuation_models IS 'Financial modeling and scenario analysis for target valuation';
COMMENT ON TABLE scan_reports IS 'Generated reports and exports from scan results';
COMMENT ON TABLE industry_taxonomy IS 'Hierarchical industry classification system';
COMMENT ON TABLE data_source_configs IS 'Configuration for external data source integrations';
COMMENT ON TABLE scan_audit_log IS 'Audit trail for compliance and activity tracking';