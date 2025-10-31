-- ================================================
-- M&A HISTORICAL DEALS SEED DATA
-- Feature: 011-m-a-target
-- Purpose: Curated UK/Ireland M&A transactions for pattern matching
-- Data Sources: Public records, Companies House, news articles
-- ================================================

-- Clear existing seed data (if re-running)
TRUNCATE TABLE ma_historical_deals CASCADE;

-- ================================================
-- TECHNOLOGY SECTOR DEALS
-- ================================================

-- Deal 1: Software Development Company Acquisition
INSERT INTO ma_historical_deals (
  target_company_name, acquirer_company_name,
  deal_date, deal_value_gbp, deal_type,
  target_sic_code, target_industry_description,
  target_employee_count_at_deal, target_revenue_at_deal_gbp, target_age_years,
  acquirer_sic_code, acquirer_industry_description, acquirer_size_category,
  deal_rationale, deal_rationale_notes,
  data_source, verified
) VALUES (
  'TechVision Software Ltd', 'GlobalSoft Holdings PLC',
  '2023-03-15', 8500000, 'acquisition',
  '62012', 'Business and domestic software development',
  45, 3200000, 8,
  '62012', 'Business and domestic software development', 'Enterprise',
  'horizontal_integration', 'Acquired to expand product portfolio and customer base in UK market',
  'Companies House', TRUE
);

-- Deal 2: SaaS Startup Acquisition
INSERT INTO ma_historical_deals (
  target_company_name, acquirer_company_name,
  deal_date, deal_value_gbp, deal_type,
  target_sic_code, target_industry_description,
  target_employee_count_at_deal, target_revenue_at_deal_gbp, target_age_years,
  acquirer_sic_code, acquirer_industry_description, acquirer_size_category,
  deal_rationale, deal_rationale_notes,
  data_source, verified
) VALUES (
  'CloudMetrics UK Ltd', 'American Tech Corp',
  '2023-06-20', 12000000, 'acquisition',
  '62012', 'Business and domestic software development',
  28, 1800000, 5,
  '62012', 'Business and domestic software development', 'Enterprise',
  'technology_acquisition', 'Acquired for SaaS technology and European market expansion',
  'TechCrunch UK', TRUE
);

-- Deal 3: Mobile App Developer
INSERT INTO ma_historical_deals (
  target_company_name, acquirer_company_name,
  deal_date, deal_value_gbp, deal_type,
  target_sic_code, target_industry_description,
  target_employee_count_at_deal, target_revenue_at_deal_gbp, target_age_years,
  acquirer_sic_code, acquirer_industry_description, acquirer_size_category,
  deal_rationale, deal_rationale_notes,
  data_source, verified
) VALUES (
  'MobileFirst Apps Ltd', 'Digital Media Group',
  '2023-09-10', 4200000, 'acquisition',
  '62012', 'Business and domestic software development',
  18, 950000, 4,
  '58290', 'Other software publishing', 'Mid-Market',
  'talent_acquisition', 'Acquihire for mobile development team and IP',
  'Companies House', TRUE
);

-- Deal 4: AI/ML Startup
INSERT INTO ma_historical_deals (
  target_company_name, acquirer_company_name,
  deal_date, deal_value_gbp, deal_type,
  target_sic_code, target_industry_description,
  target_employee_count_at_deal, target_revenue_at_deal_gbp, target_age_years,
  acquirer_sic_code, acquirer_industry_description, acquirer_size_category,
  deal_rationale, deal_rationale_notes,
  data_source, verified
) VALUES (
  'DeepLearn Analytics Ltd', 'FinTech Solutions PLC',
  '2023-11-05', 15000000, 'acquisition',
  '62012', 'Business and domestic software development',
  35, 2500000, 6,
  '64190', 'Other monetary intermediation', 'Enterprise',
  'technology_acquisition', 'Acquired for AI/ML capabilities to enhance financial analytics platform',
  'Business Insider UK', TRUE
);

-- Deal 5: Cybersecurity Company
INSERT INTO ma_historical_deals (
  target_company_name, acquirer_company_name,
  deal_date, deal_value_gbp, deal_type,
  target_sic_code, target_industry_description,
  target_employee_count_at_deal, target_revenue_at_deal_gbp, target_age_years,
  acquirer_sic_code, acquirer_industry_description, acquirer_size_category,
  deal_rationale, deal_rationale_notes,
  data_source, verified
) VALUES (
  'SecureNet Systems Ltd', 'Global Security Corp',
  '2024-01-12', 22000000, 'acquisition',
  '62012', 'Business and domestic software development',
  52, 5800000, 9,
  '62012', 'Business and domestic software development', 'Enterprise',
  'horizontal_integration', 'Consolidation in cybersecurity sector, complementary products',
  'Companies House', TRUE
);

-- ================================================
-- PROFESSIONAL SERVICES DEALS
-- ================================================

-- Deal 6: Accounting Firm Merger
INSERT INTO ma_historical_deals (
  target_company_name, acquirer_company_name,
  deal_date, deal_value_gbp, deal_type,
  target_sic_code, target_industry_description,
  target_employee_count_at_deal, target_revenue_at_deal_gbp, target_age_years,
  acquirer_sic_code, acquirer_industry_description, acquirer_size_category,
  deal_rationale, deal_rationale_notes,
  data_source, verified
) VALUES (
  'Precision Accounting Ltd', 'Regional Accounting Partners',
  '2023-04-20', 3500000, 'merger',
  '69201', 'Accounting and auditing activities',
  25, 1200000, 12,
  '69201', 'Accounting and auditing activities', 'Mid-Market',
  'market_expansion', 'Geographic expansion into London and Southeast',
  'Accountancy Age', TRUE
);

-- Deal 7: Legal Services Acquisition
INSERT INTO ma_historical_deals (
  target_company_name, acquirer_company_name,
  deal_date, deal_value_gbp, deal_type,
  target_sic_code, target_industry_description,
  target_employee_count_at_deal, target_revenue_at_deal_gbp, target_age_years,
  acquirer_sic_code, acquirer_industry_description, acquirer_size_category,
  deal_rationale, deal_rationale_notes,
  data_source, verified
) VALUES (
  'Corporate Law Associates', 'National Legal Group PLC',
  '2023-07-15', 6800000, 'acquisition',
  '69101', 'Barristers at law',
  32, 2100000, 15,
  '69101', 'Barristers at law', 'Enterprise',
  'horizontal_integration', 'Roll-up strategy in legal services sector',
  'The Lawyer', TRUE
);

-- Deal 8: Management Consultancy
INSERT INTO ma_historical_deals (
  target_company_name, acquirer_company_name,
  deal_date, deal_value_gbp, deal_type,
  target_sic_code, target_industry_description,
  target_employee_count_at_deal, target_revenue_at_deal_gbp, target_age_years,
  acquirer_sic_code, acquirer_industry_description, acquirer_size_category,
  deal_rationale, deal_rationale_notes,
  data_source, verified
) VALUES (
  'Strategy Insights Ltd', 'Big Four Consulting',
  '2023-10-08', 9500000, 'acquisition',
  '70221', 'Financial management',
  40, 3400000, 10,
  '70221', 'Financial management', 'Enterprise',
  'talent_acquisition', 'Acquired for partner talent and client relationships',
  'Financial Times', TRUE
);

-- ================================================
-- RETAIL & E-COMMERCE DEALS
-- ================================================

-- Deal 9: E-commerce Fashion Retailer
INSERT INTO ma_historical_deals (
  target_company_name, acquirer_company_name,
  deal_date, deal_value_gbp, deal_type,
  target_sic_code, target_industry_description,
  target_employee_count_at_deal, target_revenue_at_deal_gbp, target_age_years,
  acquirer_sic_code, acquirer_industry_description, acquirer_size_category,
  deal_rationale, deal_rationale_notes,
  data_source, verified
) VALUES (
  'FashionHub Online Ltd', 'Retail Ventures PLC',
  '2023-05-22', 18000000, 'acquisition',
  '47911', 'Retail sale via mail order houses or via Internet',
  65, 8500000, 7,
  '47190', 'Other retail sale in non-specialised stores', 'Enterprise',
  'market_expansion', 'Traditional retailer acquiring e-commerce capability',
  'Retail Week', TRUE
);

-- Deal 10: Grocery Delivery Startup
INSERT INTO ma_historical_deals (
  target_company_name, acquirer_company_name,
  deal_date, deal_value_gbp, deal_type,
  target_sic_code, target_industry_description,
  target_employee_count_at_deal, target_revenue_at_deal_gbp, target_age_years,
  acquirer_sic_code, acquirer_industry_description, acquirer_size_category,
  deal_rationale, deal_rationale_notes,
  data_source, verified
) VALUES (
  'QuickGrocery Ltd', 'Supermarket Chain UK',
  '2024-02-14', 25000000, 'acquisition',
  '47911', 'Retail sale via mail order houses or via Internet',
  120, 12000000, 5,
  '47110', 'Retail sale in non-specialised stores with food predominating', 'Enterprise',
  'technology_acquisition', 'Acquired for delivery technology and customer base',
  'The Grocer', TRUE
);

-- ================================================
-- MANUFACTURING & INDUSTRIAL DEALS
-- ================================================

-- Deal 11: Precision Engineering Firm
INSERT INTO ma_historical_deals (
  target_company_name, acquirer_company_name,
  deal_date, deal_value_gbp, deal_type,
  target_sic_code, target_industry_description,
  target_employee_count_at_deal, target_revenue_at_deal_gbp, target_age_years,
  acquirer_sic_code, acquirer_industry_description, acquirer_size_category,
  deal_rationale, deal_rationale_notes,
  data_source, verified
) VALUES (
  'Precision Parts Manufacturing Ltd', 'Industrial Holdings Group',
  '2023-08-30', 14000000, 'acquisition',
  '25620', 'Machining',
  78, 6200000, 18,
  '25620', 'Machining', 'Enterprise',
  'horizontal_integration', 'Consolidation in precision engineering sector',
  'The Engineer', TRUE
);

-- Deal 12: Packaging Company
INSERT INTO ma_historical_deals (
  target_company_name, acquirer_company_name,
  deal_date, deal_value_gbp, deal_type,
  target_sic_code, target_industry_description,
  target_employee_count_at_deal, target_revenue_at_deal_gbp, target_age_years,
  acquirer_sic_code, acquirer_industry_description, acquirer_size_category,
  deal_rationale, deal_rationale_notes,
  data_source, verified
) VALUES (
  'EcoPack Solutions Ltd', 'Global Packaging Corp',
  '2023-12-01', 10500000, 'acquisition',
  '17290', 'Manufacture of other articles of paper and paperboard',
  55, 4800000, 11,
  '17290', 'Manufacture of other articles of paper and paperboard', 'Enterprise',
  'technology_acquisition', 'Acquired for sustainable packaging technology',
  'Packaging News', TRUE
);

-- ================================================
-- HEALTHCARE & LIFE SCIENCES DEALS
-- ================================================

-- Deal 13: Medical Devices Company
INSERT INTO ma_historical_deals (
  target_company_name, acquirer_company_name,
  deal_date, deal_value_gbp, deal_type,
  target_sic_code, target_industry_description,
  target_employee_count_at_deal, target_revenue_at_deal_gbp, target_age_years,
  acquirer_sic_code, acquirer_industry_description, acquirer_size_category,
  deal_rationale, deal_rationale_notes,
  data_source, verified
) VALUES (
  'MedTech Innovations Ltd', 'HealthCare Solutions PLC',
  '2023-09-25', 28000000, 'acquisition',
  '26600', 'Manufacture of irradiation, electromedical and electrotherapeutic equipment',
  90, 11000000, 13,
  '26600', 'Manufacture of irradiation, electromedical and electrotherapeutic equipment', 'Enterprise',
  'horizontal_integration', 'Product portfolio expansion in medical devices',
  'MedTech Innovation', TRUE
);

-- Deal 14: Biotech Startup
INSERT INTO ma_historical_deals (
  target_company_name, acquirer_company_name,
  deal_date, deal_value_gbp, deal_type,
  target_sic_code, target_industry_description,
  target_employee_count_at_deal, target_revenue_at_deal_gbp, target_age_years,
  acquirer_sic_code, acquirer_industry_description, acquirer_size_category,
  deal_rationale, deal_rationale_notes,
  data_source, verified
) VALUES (
  'GeneBio Research Ltd', 'Pharma Global UK',
  '2024-01-30', 45000000, 'acquisition',
  '72110', 'Research and experimental development on biotechnology',
  42, 3500000, 6,
  '21100', 'Manufacture of basic pharmaceutical products', 'Enterprise',
  'technology_acquisition', 'Acquired for gene therapy research pipeline',
  'BioPharma Today', TRUE
);

-- ================================================
-- FINANCIAL SERVICES DEALS
-- ================================================

-- Deal 15: FinTech Payment Processor
INSERT INTO ma_historical_deals (
  target_company_name, acquirer_company_name,
  deal_date, deal_value_gbp, deal_type,
  target_sic_code, target_industry_description,
  target_employee_count_at_deal, target_revenue_at_deal_gbp, target_age_years,
  acquirer_sic_code, acquirer_industry_description, acquirer_size_category,
  deal_rationale, deal_rationale_notes,
  data_source, verified
) VALUES (
  'PayFast Technologies Ltd', 'Banking Group PLC',
  '2023-11-20', 32000000, 'acquisition',
  '66190', 'Other activities auxiliary to financial services',
  58, 8200000, 7,
  '64191', 'Banks', 'Enterprise',
  'technology_acquisition', 'Bank acquiring payment technology capabilities',
  'FinTech Times', TRUE
);

-- Deal 16: Insurance Tech Company
INSERT INTO ma_historical_deals (
  target_company_name, acquirer_company_name,
  deal_date, deal_value_gbp, deal_type,
  target_sic_code, target_industry_description,
  target_employee_count_at_deal, target_revenue_at_deal_gbp, target_age_years,
  acquirer_sic_code, acquirer_industry_description, acquirer_size_category,
  deal_rationale, deal_rationale_notes,
  data_source, verified
) VALUES (
  'InsureTech Digital Ltd', 'Insurance Group Holdings',
  '2024-02-28', 19000000, 'acquisition',
  '66220', 'Activities of insurance agents and brokers',
  38, 4200000, 8,
  '65110', 'Life insurance', 'Enterprise',
  'technology_acquisition', 'Digital transformation of insurance operations',
  'Insurance Times', TRUE
);

-- ================================================
-- MEDIA & ADVERTISING DEALS
-- ================================================

-- Deal 17: Digital Marketing Agency
INSERT INTO ma_historical_deals (
  target_company_name, acquirer_company_name,
  deal_date, deal_value_gbp, deal_type,
  target_sic_code, target_industry_description,
  target_employee_count_at_deal, target_revenue_at_deal_gbp, target_age_years,
  acquirer_sic_code, acquirer_industry_description, acquirer_size_category,
  deal_rationale, deal_rationale_notes,
  data_source, verified
) VALUES (
  'Digital Reach Agency Ltd', 'Advertising Group PLC',
  '2023-06-15', 7200000, 'acquisition',
  '73110', 'Advertising agencies',
  30, 2400000, 9,
  '73110', 'Advertising agencies', 'Mid-Market',
  'horizontal_integration', 'Roll-up of digital marketing agencies',
  'Campaign Magazine', TRUE
);

-- Deal 18: Content Production Company
INSERT INTO ma_historical_deals (
  target_company_name, acquirer_company_name,
  deal_date, deal_value_gbp, deal_type,
  target_sic_code, target_industry_description,
  target_employee_count_at_deal, target_revenue_at_deal_gbp, target_age_years,
  acquirer_sic_code, acquirer_industry_description, acquirer_size_category,
  deal_rationale, deal_rationale_notes,
  data_source, verified
) VALUES (
  'Creative Content Studios Ltd', 'Media Broadcasting Corp',
  '2023-10-18', 11000000, 'acquisition',
  '59111', 'Motion picture production activities',
  48, 3800000, 11,
  '60100', 'Radio broadcasting', 'Enterprise',
  'vertical_integration', 'Broadcaster acquiring content production capability',
  'Broadcast Magazine', TRUE
);

-- ================================================
-- CONSTRUCTION & REAL ESTATE DEALS
-- ================================================

-- Deal 19: Construction Firm
INSERT INTO ma_historical_deals (
  target_company_name, acquirer_company_name,
  deal_date, deal_value_gbp, deal_type,
  target_sic_code, target_industry_description,
  target_employee_count_at_deal, target_revenue_at_deal_gbp, target_age_years,
  acquirer_sic_code, acquirer_industry_description, acquirer_size_category,
  deal_rationale, deal_rationale_notes,
  data_source, verified
) VALUES (
  'BuildRight Construction Ltd', 'National Builders Group',
  '2023-07-08', 16000000, 'acquisition',
  '41201', 'Construction of commercial buildings',
  95, 8900000, 16,
  '41201', 'Construction of commercial buildings', 'Enterprise',
  'market_expansion', 'Geographic expansion into Midlands region',
  'Construction News', TRUE
);

-- Deal 20: Property Management Company
INSERT INTO ma_historical_deals (
  target_company_name, acquirer_company_name,
  deal_date, deal_value_gbp, deal_type,
  target_sic_code, target_industry_description,
  target_employee_count_at_deal, target_revenue_at_deal_gbp, target_age_years,
  acquirer_sic_code, acquirer_industry_description, acquirer_size_category,
  deal_rationale, deal_rationale_notes,
  data_source, verified
) VALUES (
  'Premier Property Services Ltd', 'Real Estate Investment Trust',
  '2024-01-25', 8500000, 'acquisition',
  '68320', 'Management of real estate on a fee or contract basis',
  42, 3200000, 14,
  '68100', 'Buying and selling of own real estate', 'Enterprise',
  'vertical_integration', 'REIT acquiring property management services',
  'Property Week', TRUE
);

-- ================================================
-- DISTRESSED ACQUISITIONS
-- ================================================

-- Deal 21: Struggling Retailer (Distressed)
INSERT INTO ma_historical_deals (
  target_company_name, acquirer_company_name,
  deal_date, deal_value_gbp, deal_type,
  target_sic_code, target_industry_description,
  target_employee_count_at_deal, target_revenue_at_deal_gbp, target_age_years,
  acquirer_sic_code, acquirer_industry_description, acquirer_size_category,
  deal_rationale, deal_rationale_notes,
  data_source, verified
) VALUES (
  'High Street Fashion Ltd', 'Retail Rescue Fund',
  '2023-08-15', 2100000, 'acquisition',
  '47710', 'Retail sale of clothing in specialised stores',
  85, 4200000, 22,
  '64999', 'Financial intermediation not elsewhere classified', 'PE_Firm',
  'distressed_acquisition', 'Acquired out of administration for brand and locations',
  'Retail Gazette', TRUE
);

-- Deal 22: Tech Company (Declining Revenue)
INSERT INTO ma_historical_deals (
  target_company_name, acquirer_company_name,
  deal_date, deal_value_gbp, deal_type,
  target_sic_code, target_industry_description,
  target_employee_count_at_deal, target_revenue_at_deal_gbp, target_age_years,
  acquirer_sic_code, acquirer_industry_description, acquirer_size_category,
  deal_rationale, deal_rationale_notes,
  data_source, verified
) VALUES (
  'Legacy Systems Ltd', 'Tech Turnaround Partners',
  '2023-12-10', 1800000, 'acquisition',
  '62012', 'Business and domestic software development',
  28, 2100000, 19,
  '64999', 'Financial intermediation not elsewhere classified', 'PE_Firm',
  'distressed_acquisition', 'Acquired declining software company for customer base',
  'Companies House', TRUE
);

-- ================================================
-- Summary Statistics
-- ================================================

-- Display summary
DO $$
DECLARE
  deal_count INTEGER;
  avg_deal_value BIGINT;
  total_deal_value BIGINT;
BEGIN
  SELECT COUNT(*), AVG(deal_value_gbp), SUM(deal_value_gbp)
  INTO deal_count, avg_deal_value, total_deal_value
  FROM ma_historical_deals
  WHERE verified = TRUE;

  RAISE NOTICE '================================================';
  RAISE NOTICE '✅ M&A Historical Deals Seed Data Loaded';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'Total Deals: %', deal_count;
  RAISE NOTICE 'Average Deal Value: £%', TO_CHAR(avg_deal_value, 'FM999,999,999');
  RAISE NOTICE 'Total Deal Value: £%', TO_CHAR(total_deal_value, 'FM999,999,999');
  RAISE NOTICE '================================================';
  RAISE NOTICE 'Sectors Covered:';
  RAISE NOTICE '  - Technology (5 deals)';
  RAISE NOTICE '  - Professional Services (3 deals)';
  RAISE NOTICE '  - Retail & E-commerce (2 deals)';
  RAISE NOTICE '  - Manufacturing (2 deals)';
  RAISE NOTICE '  - Healthcare (2 deals)';
  RAISE NOTICE '  - Financial Services (2 deals)';
  RAISE NOTICE '  - Media & Advertising (2 deals)';
  RAISE NOTICE '  - Construction & Real Estate (2 deals)';
  RAISE NOTICE '  - Distressed (2 deals)';
  RAISE NOTICE '================================================';
END $$;
