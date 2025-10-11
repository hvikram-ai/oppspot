export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string
          name: string
          slug: string
          settings: Json
          subscription_tier: string
          onboarding_step: number | null
          industry: string | null
          company_size: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          settings?: Json
          subscription_tier?: string
          onboarding_step?: number | null
          industry?: string | null
          company_size?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          settings?: Json
          subscription_tier?: string
          onboarding_step?: number | null
          industry?: string | null
          company_size?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          org_id: string | null
          full_name: string | null
          avatar_url: string | null
          role: string
          preferences: Json
          streak_count: number
          last_active: string | null
          trial_ends_at: string | null
          onboarding_completed: boolean
          email_verified_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          org_id?: string | null
          full_name?: string | null
          avatar_url?: string | null
          role?: string
          preferences?: Json
          streak_count?: number
          last_active?: string | null
          trial_ends_at?: string | null
          onboarding_completed?: boolean
          email_verified_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          org_id?: string | null
          full_name?: string | null
          avatar_url?: string | null
          role?: string
          preferences?: Json
          streak_count?: number
          last_active?: string | null
          trial_ends_at?: string | null
          onboarding_completed?: boolean
          email_verified_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      businesses: {
        Row: {
          id: string
          google_place_id: string | null
          name: string
          slug: string | null
          description: string | null
          address: Json
          latitude: number | null
          longitude: number | null
          phone_numbers: Json
          emails: Json
          website: string | null
          social_links: Json
          categories: string[]
          ai_insights: Json
          metadata: Json
          verified_at: string | null
          created_at: string
          updated_at: string
          // Companies House fields
          company_number: string | null
          company_status: string | null
          incorporation_date: string | null
          company_type: string | null
          sic_codes: string[] | null
          registered_office_address: Json | null
          officers: Json | null
          filing_history: Json | null
          accounts: Json | null
          charges: Json | null
          companies_house_data: Json | null
          companies_house_last_updated: string | undefined
          data_sources: Json | null
          cache_expires_at: string | null
        }
        Insert: {
          id?: string
          google_place_id?: string | null
          name: string
          slug?: string | null
          description?: string | null
          address?: Json
          latitude?: number | null
          longitude?: number | null
          phone_numbers?: Json
          emails?: Json
          website?: string | null
          social_links?: Json
          categories?: string[]
          ai_insights?: Json
          metadata?: Json
          verified_at?: string | null
          created_at?: string
          updated_at?: string
          // Companies House fields
          company_number?: string | null
          company_status?: string | null
          incorporation_date?: string | null
          company_type?: string | null
          sic_codes?: string[] | null
          registered_office_address?: Json | null
          officers?: Json | null
          filing_history?: Json | null
          accounts?: Json | null
          charges?: Json | null
          companies_house_data?: Json | null
          companies_house_last_updated?: string | null
          data_sources?: Json | null
          cache_expires_at?: string | null
        }
        Update: {
          id?: string
          google_place_id?: string | null
          name?: string
          slug?: string | null
          description?: string | null
          address?: Json
          latitude?: number | null
          longitude?: number | null
          phone_numbers?: Json
          emails?: Json
          website?: string | null
          social_links?: Json
          categories?: string[]
          ai_insights?: Json
          metadata?: Json
          verified_at?: string | null
          created_at?: string
          updated_at?: string
          // Companies House fields
          company_number?: string | null
          company_status?: string | null
          incorporation_date?: string | null
          company_type?: string | null
          sic_codes?: string[] | null
          registered_office_address?: Json | null
          officers?: Json | null
          filing_history?: Json | null
          accounts?: Json | null
          charges?: Json | null
          companies_house_data?: Json | null
          companies_house_last_updated?: string | null
          data_sources?: Json | null
          cache_expires_at?: string | null
        }
      }
      searches: {
        Row: {
          id: string
          user_id: string
          query: string
          filters: Json
          results_count: number | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          query: string
          filters?: Json
          results_count?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          query?: string
          filters?: Json
          results_count?: number | null
          created_at?: string
        }
      }
      lists: {
        Row: {
          id: string
          org_id: string
          created_by: string
          name: string
          description: string | null
          is_public: boolean
          business_ids: string[]
          collaborators: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          org_id: string
          created_by: string
          name: string
          description?: string | null
          is_public?: boolean
          business_ids?: string[]
          collaborators?: string[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          created_by?: string
          name?: string
          description?: string | null
          is_public?: boolean
          business_ids?: string[]
          collaborators?: string[]
          created_at?: string
          updated_at?: string
        }
      }
      events: {
        Row: {
          id: string
          user_id: string
          event_type: string
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          event_type: string
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          event_type?: string
          metadata?: Json
          created_at?: string
        }
      }
      acquisition_scans: {
        Row: {
          id: string
          user_id: string | null
          org_id: string | null
          name: string
          description: string | null
          status: 'configuring' | 'scanning' | 'analyzing' | 'completed' | 'failed' | 'paused'
          config: Json
          selected_industries: Json | null
          market_maturity: string[] | null
          selected_regions: Json | null
          regulatory_requirements: Json | null
          cross_border_considerations: Json | null
          required_capabilities: Json | null
          strategic_objectives: Json | null
          synergy_requirements: Json | null
          data_sources: string[] | null
          scan_depth: 'basic' | 'detailed' | 'comprehensive'
          progress_percentage: number
          current_step: string
          targets_identified: number
          targets_analyzed: number
          created_at: string
          updated_at: string
          started_at: string | null
          completed_at: string | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          org_id?: string | null
          name: string
          description?: string | null
          status?: 'configuring' | 'scanning' | 'analyzing' | 'completed' | 'failed' | 'paused'
          config?: Json
          selected_industries?: Json | null
          market_maturity?: string[] | null
          selected_regions?: Json | null
          regulatory_requirements?: Json | null
          cross_border_considerations?: Json | null
          required_capabilities?: Json | null
          strategic_objectives?: Json | null
          synergy_requirements?: Json | null
          data_sources?: string[] | null
          scan_depth?: 'basic' | 'detailed' | 'comprehensive'
          progress_percentage?: number
          current_step?: string
          targets_identified?: number
          targets_analyzed?: number
          created_at?: string
          updated_at?: string
          started_at?: string | null
          completed_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string | null
          org_id?: string | null
          name?: string
          description?: string | null
          status?: 'configuring' | 'scanning' | 'analyzing' | 'completed' | 'failed' | 'paused'
          config?: Json
          selected_industries?: Json | null
          market_maturity?: string[] | null
          selected_regions?: Json | null
          regulatory_requirements?: Json | null
          cross_border_considerations?: Json | null
          required_capabilities?: Json | null
          strategic_objectives?: Json | null
          synergy_requirements?: Json | null
          data_sources?: string[] | null
          scan_depth?: 'basic' | 'detailed' | 'comprehensive'
          progress_percentage?: number
          current_step?: string
          targets_identified?: number
          targets_analyzed?: number
          created_at?: string
          updated_at?: string
          started_at?: string | null
          completed_at?: string | null
        }
      }
      scan_audit_log: {
        Row: {
          id: string
          scan_id: string | null
          target_company_id: string | null
          user_id: string | null
          action_type: string
          action_description: string | null
          before_state: Json | null
          after_state: Json | null
          ip_address: string | null
          user_agent: string | null
          session_id: string | null
          data_accessed: Json | null
          legal_basis: string | null
          retention_period: number | null
          created_at: string
        }
        Insert: {
          id?: string
          scan_id?: string | null
          target_company_id?: string | null
          user_id?: string | null
          action_type: string
          action_description?: string | null
          before_state?: Json | null
          after_state?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          session_id?: string | null
          data_accessed?: Json | null
          legal_basis?: string | null
          retention_period?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          scan_id?: string | null
          target_company_id?: string | null
          user_id?: string | null
          action_type?: string
          action_description?: string | null
          before_state?: Json | null
          after_state?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          session_id?: string | null
          data_accessed?: Json | null
          legal_basis?: string | null
          retention_period?: number | null
          created_at?: string
        }
      }
      market_intelligence: {
        Row: {
          id: string
          scan_id: string | null
          industry_sector: string
          geographic_scope: Json | null
          market_size_gbp: number | null
          market_growth_rate: number | null
          market_maturity: 'emerging' | 'growth' | 'mature' | 'declining' | null
          total_competitors: number | null
          market_concentration: 'fragmented' | 'moderate' | 'concentrated' | 'monopolistic' | null
          top_competitors: Json | null
          barriers_to_entry: 'low' | 'moderate' | 'high' | 'very_high' | null
          key_trends: Json | null
          growth_drivers: Json | null
          challenges: Json | null
          ma_activity_level: 'low' | 'moderate' | 'high' | 'very_high' | null
          recent_transactions: Json | null
          average_valuation_multiples: Json | null
          regulatory_environment: 'favorable' | 'stable' | 'changing' | 'restrictive' | null
          upcoming_regulations: Json | null
          data_sources: Json | null
          analysis_date: string | null
          confidence_level: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          scan_id?: string | null
          industry_sector: string
          geographic_scope?: Json | null
          market_size_gbp?: number | null
          market_growth_rate?: number | null
          market_maturity?: 'emerging' | 'growth' | 'mature' | 'declining' | null
          total_competitors?: number | null
          market_concentration?: 'fragmented' | 'moderate' | 'concentrated' | 'monopolistic' | null
          top_competitors?: Json | null
          barriers_to_entry?: 'low' | 'moderate' | 'high' | 'very_high' | null
          key_trends?: Json | null
          growth_drivers?: Json | null
          challenges?: Json | null
          ma_activity_level?: 'low' | 'moderate' | 'high' | 'very_high' | null
          recent_transactions?: Json | null
          average_valuation_multiples?: Json | null
          regulatory_environment?: 'favorable' | 'stable' | 'changing' | 'restrictive' | null
          upcoming_regulations?: Json | null
          data_sources?: Json | null
          analysis_date?: string | null
          confidence_level?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          scan_id?: string | null
          industry_sector?: string
          geographic_scope?: Json | null
          market_size_gbp?: number | null
          market_growth_rate?: number | null
          market_maturity?: 'emerging' | 'growth' | 'mature' | 'declining' | null
          total_competitors?: number | null
          market_concentration?: 'fragmented' | 'moderate' | 'concentrated' | 'monopolistic' | null
          top_competitors?: Json | null
          barriers_to_entry?: 'low' | 'moderate' | 'high' | 'very_high' | null
          key_trends?: Json | null
          growth_drivers?: Json | null
          challenges?: Json | null
          ma_activity_level?: 'low' | 'moderate' | 'high' | 'very_high' | null
          recent_transactions?: Json | null
          average_valuation_multiples?: Json | null
          regulatory_environment?: 'favorable' | 'stable' | 'changing' | 'restrictive' | null
          upcoming_regulations?: Json | null
          data_sources?: Json | null
          analysis_date?: string | null
          confidence_level?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      scan_reports: {
        Row: {
          id: string
          scan_id: string | null
          user_id: string | null
          report_type: 'executive_summary' | 'detailed_analysis' | 'target_comparison' | 'market_overview' | 'due_diligence_summary' | 'valuation_analysis' | 'risk_assessment' | 'compliance_report'
          report_title: string
          report_description: string | null
          report_content: Json | null
          report_format: 'pdf' | 'excel' | 'powerpoint' | 'json' | 'csv'
          template_used: string | null
          file_path: string | null
          file_size: number | null
          download_count: number
          generation_status: string
          is_confidential: boolean
          access_level: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          scan_id?: string | null
          user_id?: string | null
          report_type: 'executive_summary' | 'detailed_analysis' | 'target_comparison' | 'market_overview' | 'due_diligence_summary' | 'valuation_analysis' | 'risk_assessment' | 'compliance_report'
          report_title: string
          report_description?: string | null
          report_content?: Json | null
          report_format?: 'pdf' | 'excel' | 'powerpoint' | 'json' | 'csv'
          template_used?: string | null
          file_path?: string | null
          file_size?: number | null
          download_count?: number
          generation_status?: string
          is_confidential?: boolean
          access_level?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          scan_id?: string | null
          user_id?: string | null
          report_type?: 'executive_summary' | 'detailed_analysis' | 'target_comparison' | 'market_overview' | 'due_diligence_summary' | 'valuation_analysis' | 'risk_assessment' | 'compliance_report'
          report_title?: string
          report_description?: string | null
          report_content?: Json | null
          report_format?: 'pdf' | 'excel' | 'powerpoint' | 'json' | 'csv'
          template_used?: string | null
          file_path?: string | null
          file_size?: number | null
          download_count?: number
          generation_status?: string
          is_confidential?: boolean
          access_level?: string
          created_at?: string
          updated_at?: string
        }
      }
      target_companies: {
        Row: {
          id: string
          scan_id: string | null
          business_id: string | null
          company_name: string
          companies_house_number: string | null
          registration_country: string
          website: string | null
          industry_codes: string[] | null
          business_description: string | null
          year_incorporated: number | null
          employee_count_range: string | null
          registered_address: Json | null
          trading_address: Json | null
          phone: string | null
          email: string | null
          discovery_source: string
          discovery_method: string | null
          discovery_confidence: number
          overall_score: number
          strategic_fit_score: number
          financial_health_score: number
          risk_score: number
          analysis_status: 'pending' | 'analyzing' | 'completed' | 'excluded' | 'shortlisted'
          created_at: string
          updated_at: string
          analyzed_at: string | null
        }
        Insert: {
          id?: string
          scan_id?: string | null
          business_id?: string | null
          company_name: string
          companies_house_number?: string | null
          registration_country?: string
          website?: string | null
          industry_codes?: string[] | null
          business_description?: string | null
          year_incorporated?: number | null
          employee_count_range?: string | null
          registered_address?: Json | null
          trading_address?: Json | null
          phone?: string | null
          email?: string | null
          discovery_source: string
          discovery_method?: string | null
          discovery_confidence?: number
          overall_score?: number
          strategic_fit_score?: number
          financial_health_score?: number
          risk_score?: number
          analysis_status?: 'pending' | 'analyzing' | 'completed' | 'excluded' | 'shortlisted'
          created_at?: string
          updated_at?: string
          analyzed_at?: string | null
        }
        Update: {
          id?: string
          scan_id?: string | null
          business_id?: string | null
          company_name?: string
          companies_house_number?: string | null
          registration_country?: string
          website?: string | null
          industry_codes?: string[] | null
          business_description?: string | null
          year_incorporated?: number | null
          employee_count_range?: string | null
          registered_address?: Json | null
          trading_address?: Json | null
          phone?: string | null
          email?: string | null
          discovery_source?: string
          discovery_method?: string | null
          discovery_confidence?: number
          overall_score?: number
          strategic_fit_score?: number
          financial_health_score?: number
          risk_score?: number
          analysis_status?: 'pending' | 'analyzing' | 'completed' | 'excluded' | 'shortlisted'
          created_at?: string
          updated_at?: string
          analyzed_at?: string | null
        }
      }
      risk_assessments: {
        Row: {
          id: string
          target_company_id: string | null
          financial_risk_score: number
          financial_risk_factors: Json | null
          operational_risk_score: number
          key_person_dependency: boolean
          customer_concentration_risk: number | null
          supplier_concentration_risk: number | null
          operational_risk_factors: Json | null
          regulatory_risk_score: number
          compliance_status: Json | null
          pending_investigations: Json | null
          regulatory_risk_factors: Json | null
          market_risk_score: number
          competitive_position: 'leader' | 'strong' | 'moderate' | 'weak' | 'unknown' | null
          market_share_estimate: number | null
          competitive_threats: Json | null
          market_risk_factors: Json | null
          technology_risk_score: number
          ip_portfolio_strength: 'strong' | 'moderate' | 'weak' | 'none' | 'unknown' | null
          technology_obsolescence_risk: number | null
          cybersecurity_assessment: Json | null
          technology_risk_factors: Json | null
          esg_risk_score: number
          environmental_compliance: Json | null
          social_responsibility_issues: Json | null
          governance_concerns: Json | null
          esg_risk_factors: Json | null
          overall_risk_score: number
          risk_category: 'low' | 'moderate' | 'high' | 'critical' | null
          risk_mitigation_strategies: Json | null
          red_flags: Json | null
          assessment_method: string
          confidence_level: number
          last_updated: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          target_company_id?: string | null
          financial_risk_score?: number
          financial_risk_factors?: Json | null
          operational_risk_score?: number
          key_person_dependency?: boolean
          customer_concentration_risk?: number | null
          supplier_concentration_risk?: number | null
          operational_risk_factors?: Json | null
          regulatory_risk_score?: number
          compliance_status?: Json | null
          pending_investigations?: Json | null
          regulatory_risk_factors?: Json | null
          market_risk_score?: number
          competitive_position?: 'leader' | 'strong' | 'moderate' | 'weak' | 'unknown' | null
          market_share_estimate?: number | null
          competitive_threats?: Json | null
          market_risk_factors?: Json | null
          technology_risk_score?: number
          ip_portfolio_strength?: 'strong' | 'moderate' | 'weak' | 'none' | 'unknown' | null
          technology_obsolescence_risk?: number | null
          cybersecurity_assessment?: Json | null
          technology_risk_factors?: Json | null
          esg_risk_score?: number
          environmental_compliance?: Json | null
          social_responsibility_issues?: Json | null
          governance_concerns?: Json | null
          esg_risk_factors?: Json | null
          overall_risk_score?: number
          risk_category?: 'low' | 'moderate' | 'high' | 'critical' | null
          risk_mitigation_strategies?: Json | null
          red_flags?: Json | null
          assessment_method?: string
          confidence_level?: number
          last_updated?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          target_company_id?: string | null
          financial_risk_score?: number
          financial_risk_factors?: Json | null
          operational_risk_score?: number
          key_person_dependency?: boolean
          customer_concentration_risk?: number | null
          supplier_concentration_risk?: number | null
          operational_risk_factors?: Json | null
          regulatory_risk_score?: number
          compliance_status?: Json | null
          pending_investigations?: Json | null
          regulatory_risk_factors?: Json | null
          market_risk_score?: number
          competitive_position?: 'leader' | 'strong' | 'moderate' | 'weak' | 'unknown' | null
          market_share_estimate?: number | null
          competitive_threats?: Json | null
          market_risk_factors?: Json | null
          technology_risk_score?: number
          ip_portfolio_strength?: 'strong' | 'moderate' | 'weak' | 'none' | 'unknown' | null
          technology_obsolescence_risk?: number | null
          cybersecurity_assessment?: Json | null
          technology_risk_factors?: Json | null
          esg_risk_score?: number
          environmental_compliance?: Json | null
          social_responsibility_issues?: Json | null
          governance_concerns?: Json | null
          esg_risk_factors?: Json | null
          overall_risk_score?: number
          risk_category?: 'low' | 'moderate' | 'high' | 'critical' | null
          risk_mitigation_strategies?: Json | null
          red_flags?: Json | null
          assessment_method?: string
          confidence_level?: number
          last_updated?: string
          created_at?: string
          updated_at?: string
        }
      }
      financial_analysis: {
        Row: {
          id: string
          target_company_id: string | null
          analysis_year: number | null
          revenue: number | null
          gross_profit: number | null
          ebitda: number | null
          net_income: number | null
          total_assets: number | null
          total_liabilities: number | null
          shareholders_equity: number | null
          cash_and_equivalents: number | null
          total_debt: number | null
          gross_margin: number | null
          ebitda_margin: number | null
          net_margin: number | null
          roe: number | null
          roa: number | null
          debt_to_equity: number | null
          current_ratio: number | null
          quick_ratio: number | null
          revenue_growth_3y: number | null
          profit_growth_3y: number | null
          employee_growth_3y: number | null
          altman_z_score: number | null
          credit_rating: string | null
          financial_distress_signals: Json | null
          estimated_revenue_multiple: number | null
          estimated_ebitda_multiple: number | null
          estimated_enterprise_value: number | null
          valuation_method: string | null
          valuation_confidence: 'low' | 'medium' | 'high' | null
          data_sources: Json | null
          data_quality_score: number
          last_financial_update: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          target_company_id?: string | null
          analysis_year?: number | null
          revenue?: number | null
          gross_profit?: number | null
          ebitda?: number | null
          net_income?: number | null
          total_assets?: number | null
          total_liabilities?: number | null
          shareholders_equity?: number | null
          cash_and_equivalents?: number | null
          total_debt?: number | null
          gross_margin?: number | null
          ebitda_margin?: number | null
          net_margin?: number | null
          roe?: number | null
          roa?: number | null
          debt_to_equity?: number | null
          current_ratio?: number | null
          quick_ratio?: number | null
          revenue_growth_3y?: number | null
          profit_growth_3y?: number | null
          employee_growth_3y?: number | null
          altman_z_score?: number | null
          credit_rating?: string | null
          financial_distress_signals?: Json | null
          estimated_revenue_multiple?: number | null
          estimated_ebitda_multiple?: number | null
          estimated_enterprise_value?: number | null
          valuation_method?: string | null
          valuation_confidence?: 'low' | 'medium' | 'high' | null
          data_sources?: Json | null
          data_quality_score?: number
          last_financial_update?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          target_company_id?: string | null
          analysis_year?: number | null
          revenue?: number | null
          gross_profit?: number | null
          ebitda?: number | null
          net_income?: number | null
          total_assets?: number | null
          total_liabilities?: number | null
          shareholders_equity?: number | null
          cash_and_equivalents?: number | null
          total_debt?: number | null
          gross_margin?: number | null
          ebitda_margin?: number | null
          net_margin?: number | null
          roe?: number | null
          roa?: number | null
          debt_to_equity?: number | null
          current_ratio?: number | null
          quick_ratio?: number | null
          revenue_growth_3y?: number | null
          profit_growth_3y?: number | null
          employee_growth_3y?: number | null
          altman_z_score?: number | null
          credit_rating?: string | null
          financial_distress_signals?: Json | null
          estimated_revenue_multiple?: number | null
          estimated_ebitda_multiple?: number | null
          estimated_enterprise_value?: number | null
          valuation_method?: string | null
          valuation_confidence?: 'low' | 'medium' | 'high' | null
          data_sources?: Json | null
          data_quality_score?: number
          last_financial_update?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      due_diligence: {
        Row: {
          id: string
          target_company_id: string | null
          documents_analyzed: Json | null
          document_completeness_score: number
          missing_documents: Json | null
          corporate_structure: Json | null
          subsidiary_companies: Json | null
          legal_entity_type: string | null
          jurisdiction: string | null
          key_contracts: Json | null
          contract_risk_assessment: Json | null
          intellectual_property: Json | null
          employee_structure: Json | null
          employment_contracts_review: Json | null
          pension_obligations: number | null
          hr_compliance_status: Json | null
          operational_metrics: Json | null
          it_infrastructure_assessment: Json | null
          supply_chain_analysis: Json | null
          customer_analysis: Json | null
          environmental_assessments: Json | null
          sustainability_metrics: Json | null
          esg_compliance: Json | null
          legal_issues: Json | null
          compliance_violations: Json | null
          financial_irregularities: Json | null
          operational_concerns: Json | null
          due_diligence_score: number
          recommendation: 'proceed' | 'proceed_with_conditions' | 'further_investigation' | 'reject' | null
          key_findings: Json | null
          next_steps: Json | null
          analysis_depth: 'preliminary' | 'standard' | 'comprehensive' | null
          automation_confidence: number
          manual_review_required: boolean
          created_at: string
          updated_at: string
          last_verification_date: string
        }
        Insert: {
          id?: string
          target_company_id?: string | null
          documents_analyzed?: Json | null
          document_completeness_score?: number
          missing_documents?: Json | null
          corporate_structure?: Json | null
          subsidiary_companies?: Json | null
          legal_entity_type?: string | null
          jurisdiction?: string | null
          key_contracts?: Json | null
          contract_risk_assessment?: Json | null
          intellectual_property?: Json | null
          employee_structure?: Json | null
          employment_contracts_review?: Json | null
          pension_obligations?: number | null
          hr_compliance_status?: Json | null
          operational_metrics?: Json | null
          it_infrastructure_assessment?: Json | null
          supply_chain_analysis?: Json | null
          customer_analysis?: Json | null
          environmental_assessments?: Json | null
          sustainability_metrics?: Json | null
          esg_compliance?: Json | null
          legal_issues?: Json | null
          compliance_violations?: Json | null
          financial_irregularities?: Json | null
          operational_concerns?: Json | null
          due_diligence_score?: number
          recommendation?: 'proceed' | 'proceed_with_conditions' | 'further_investigation' | 'reject' | null
          key_findings?: Json | null
          next_steps?: Json | null
          analysis_depth?: 'preliminary' | 'standard' | 'comprehensive' | null
          automation_confidence?: number
          manual_review_required?: boolean
          created_at?: string
          updated_at?: string
          last_verification_date?: string
        }
        Update: {
          id?: string
          target_company_id?: string | null
          documents_analyzed?: Json | null
          document_completeness_score?: number
          missing_documents?: Json | null
          corporate_structure?: Json | null
          subsidiary_companies?: Json | null
          legal_entity_type?: string | null
          jurisdiction?: string | null
          key_contracts?: Json | null
          contract_risk_assessment?: Json | null
          intellectual_property?: Json | null
          employee_structure?: Json | null
          employment_contracts_review?: Json | null
          pension_obligations?: number | null
          hr_compliance_status?: Json | null
          operational_metrics?: Json | null
          it_infrastructure_assessment?: Json | null
          supply_chain_analysis?: Json | null
          customer_analysis?: Json | null
          environmental_assessments?: Json | null
          sustainability_metrics?: Json | null
          esg_compliance?: Json | null
          legal_issues?: Json | null
          compliance_violations?: Json | null
          financial_irregularities?: Json | null
          operational_concerns?: Json | null
          due_diligence_score?: number
          recommendation?: 'proceed' | 'proceed_with_conditions' | 'further_investigation' | 'reject' | null
          key_findings?: Json | null
          next_steps?: Json | null
          analysis_depth?: 'preliminary' | 'standard' | 'comprehensive' | null
          automation_confidence?: number
          manual_review_required?: boolean
          created_at?: string
          updated_at?: string
          last_verification_date?: string
        }
      }
      valuation_models: {
        Row: {
          id: string
          target_company_id: string | null
          valuation_method: 'dcf' | 'comparable_company' | 'precedent_transaction' | 'asset_based' | 'hybrid'
          revenue_projections: Json | null
          expense_projections: Json | null
          capex_projections: Json | null
          working_capital_projections: Json | null
          terminal_growth_rate: number | null
          discount_rate: number | null
          revenue_multiple_range: Json | null
          ebitda_multiple_range: Json | null
          comparable_companies: Json | null
          precedent_transactions: Json | null
          base_case_value: number | null
          bull_case_value: number | null
          bear_case_value: number | null
          probability_weighted_value: number | null
          enterprise_value: number | null
          equity_value: number | null
          net_debt_adjustment: number | null
          scenarios: Json | null
          sensitivity_analysis: Json | null
          monte_carlo_results: Json | null
          revenue_synergies: number | null
          cost_synergies: number | null
          one_time_costs: number | null
          synergy_realization_timeline: Json | null
          model_version: number
          assumptions: Json | null
          confidence_interval: Json | null
          model_quality_score: number
          created_at: string
          updated_at: string
          model_date: string
        }
        Insert: {
          id?: string
          target_company_id?: string | null
          valuation_method: 'dcf' | 'comparable_company' | 'precedent_transaction' | 'asset_based' | 'hybrid'
          revenue_projections?: Json | null
          expense_projections?: Json | null
          capex_projections?: Json | null
          working_capital_projections?: Json | null
          terminal_growth_rate?: number | null
          discount_rate?: number | null
          revenue_multiple_range?: Json | null
          ebitda_multiple_range?: Json | null
          comparable_companies?: Json | null
          precedent_transactions?: Json | null
          base_case_value?: number | null
          bull_case_value?: number | null
          bear_case_value?: number | null
          probability_weighted_value?: number | null
          enterprise_value?: number | null
          equity_value?: number | null
          net_debt_adjustment?: number | null
          scenarios?: Json | null
          sensitivity_analysis?: Json | null
          monte_carlo_results?: Json | null
          revenue_synergies?: number | null
          cost_synergies?: number | null
          one_time_costs?: number | null
          synergy_realization_timeline?: Json | null
          model_version?: number
          assumptions?: Json | null
          confidence_interval?: Json | null
          model_quality_score?: number
          created_at?: string
          updated_at?: string
          model_date?: string
        }
        Update: {
          id?: string
          target_company_id?: string | null
          valuation_method?: 'dcf' | 'comparable_company' | 'precedent_transaction' | 'asset_based' | 'hybrid'
          revenue_projections?: Json | null
          expense_projections?: Json | null
          capex_projections?: Json | null
          working_capital_projections?: Json | null
          terminal_growth_rate?: number | null
          discount_rate?: number | null
          revenue_multiple_range?: Json | null
          ebitda_multiple_range?: Json | null
          comparable_companies?: Json | null
          precedent_transactions?: Json | null
          base_case_value?: number | null
          bull_case_value?: number | null
          bear_case_value?: number | null
          probability_weighted_value?: number | null
          enterprise_value?: number | null
          equity_value?: number | null
          net_debt_adjustment?: number | null
          scenarios?: Json | null
          sensitivity_analysis?: Json | null
          monte_carlo_results?: Json | null
          revenue_synergies?: number | null
          cost_synergies?: number | null
          one_time_costs?: number | null
          synergy_realization_timeline?: Json | null
          model_version?: number
          assumptions?: Json | null
          confidence_interval?: Json | null
          model_quality_score?: number
          created_at?: string
          updated_at?: string
          model_date?: string
        }
      }
      data_source_configs: {
        Row: {
          id: string
          source_name: string
          source_type: 'api' | 'database' | 'file_feed' | 'web_scraping' | 'manual'
          endpoint_url: string | null
          authentication: Json | null
          rate_limits: Json | null
          field_mappings: Json | null
          data_transformations: Json | null
          reliability_score: number
          update_frequency: string | null
          last_successful_sync: string | null
          sync_error_count: number
          total_requests: number
          successful_requests: number
          cost_per_request: number | null
          monthly_budget: number | null
          is_active: boolean
          is_premium: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          source_name: string
          source_type: 'api' | 'database' | 'file_feed' | 'web_scraping' | 'manual'
          endpoint_url?: string | null
          authentication?: Json | null
          rate_limits?: Json | null
          field_mappings?: Json | null
          data_transformations?: Json | null
          reliability_score?: number
          update_frequency?: string | null
          last_successful_sync?: string | null
          sync_error_count?: number
          total_requests?: number
          successful_requests?: number
          cost_per_request?: number | null
          monthly_budget?: number | null
          is_active?: boolean
          is_premium?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          source_name?: string
          source_type?: 'api' | 'database' | 'file_feed' | 'web_scraping' | 'manual'
          endpoint_url?: string | null
          authentication?: Json | null
          rate_limits?: Json | null
          field_mappings?: Json | null
          data_transformations?: Json | null
          reliability_score?: number
          update_frequency?: string | null
          last_successful_sync?: string | null
          sync_error_count?: number
          total_requests?: number
          successful_requests?: number
          cost_per_request?: number | null
          monthly_budget?: number | null
          is_active?: boolean
          is_premium?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      industry_taxonomy: {
        Row: {
          id: string
          parent_id: string | null
          level: number
          sic_code: string | null
          naics_code: string | null
          custom_code: string | null
          name: string
          description: string | null
          keywords: string[] | null
          typical_business_size: 'micro' | 'small' | 'medium' | 'large' | 'enterprise' | null
          consolidation_opportunity: 'low' | 'moderate' | 'high' | 'very_high' | null
          regulatory_complexity: 'low' | 'moderate' | 'high' | 'very_high' | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          parent_id?: string | null
          level: number
          sic_code?: string | null
          naics_code?: string | null
          custom_code?: string | null
          name: string
          description?: string | null
          keywords?: string[] | null
          typical_business_size?: 'micro' | 'small' | 'medium' | 'large' | 'enterprise' | null
          consolidation_opportunity?: 'low' | 'moderate' | 'high' | 'very_high' | null
          regulatory_complexity?: 'low' | 'moderate' | 'high' | 'very_high' | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          parent_id?: string | null
          level?: number
          sic_code?: string | null
          naics_code?: string | null
          custom_code?: string | null
          name?: string
          description?: string | null
          keywords?: string[] | null
          typical_business_size?: 'micro' | 'small' | 'medium' | 'large' | 'enterprise' | null
          consolidation_opportunity?: 'low' | 'moderate' | 'high' | 'very_high' | null
          regulatory_complexity?: 'low' | 'moderate' | 'high' | 'very_high' | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      ai_agents: {
        Row: {
          id: string
          org_id: string | null
          agent_type: 'opportunity_bot' | 'research_gpt' | 'scout_agent' | 'scoring_agent' | 'writer_agent' | 'relationship_agent' | 'linkedin_scraper_agent' | 'website_analyzer_agent'
          name: string
          description: string | null
          configuration: Json
          is_active: boolean
          schedule_cron: string | null
          last_run_at: string | null
          next_run_at: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          org_id?: string | null
          agent_type: 'opportunity_bot' | 'research_gpt' | 'scout_agent' | 'scoring_agent' | 'writer_agent' | 'relationship_agent' | 'linkedin_scraper_agent' | 'website_analyzer_agent'
          name: string
          description?: string | null
          configuration?: Json
          is_active?: boolean
          schedule_cron?: string | null
          last_run_at?: string | null
          next_run_at?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          org_id?: string | null
          agent_type?: 'opportunity_bot' | 'research_gpt' | 'scout_agent' | 'scoring_agent' | 'writer_agent' | 'relationship_agent' | 'linkedin_scraper_agent' | 'website_analyzer_agent'
          name?: string
          description?: string | null
          configuration?: Json
          is_active?: boolean
          schedule_cron?: string | null
          last_run_at?: string | null
          next_run_at?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      agent_executions: {
        Row: {
          id: string
          agent_id: string
          org_id: string | null
          status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled'
          started_at: string | null
          completed_at: string | null
          duration_ms: number | null
          input_data: Json | null
          output_data: Json | null
          error_message: string | null
          error_stack: string | null
          metrics: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          agent_id: string
          org_id?: string | null
          status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled'
          started_at?: string | null
          completed_at?: string | null
          duration_ms?: number | null
          input_data?: Json | null
          output_data?: Json | null
          error_message?: string | null
          error_stack?: string | null
          metrics?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          agent_id?: string
          org_id?: string | null
          status?: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled'
          started_at?: string | null
          completed_at?: string | null
          duration_ms?: number | null
          input_data?: Json | null
          output_data?: Json | null
          error_message?: string | null
          error_stack?: string | null
          metrics?: Json | null
          created_at?: string
        }
      }
      agent_tasks: {
        Row: {
          id: string
          agent_id: string | null
          org_id: string | null
          task_type: string
          priority: number
          payload: Json
          status: 'pending' | 'processing' | 'completed' | 'failed'
          retry_count: number
          max_retries: number
          scheduled_for: string | null
          started_at: string | null
          completed_at: string | null
          error_message: string | null
          created_at: string
        }
        Insert: {
          id?: string
          agent_id?: string | null
          org_id?: string | null
          task_type: string
          priority?: number
          payload?: Json
          status?: 'pending' | 'processing' | 'completed' | 'failed'
          retry_count?: number
          max_retries?: number
          scheduled_for?: string | null
          started_at?: string | null
          completed_at?: string | null
          error_message?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          agent_id?: string | null
          org_id?: string | null
          task_type?: string
          priority?: number
          payload?: Json
          status?: 'pending' | 'processing' | 'completed' | 'failed'
          retry_count?: number
          max_retries?: number
          scheduled_for?: string | null
          started_at?: string | null
          completed_at?: string | null
          error_message?: string | null
          created_at?: string
        }
      }
      buying_signals: {
        Row: {
          id: string
          company_id: string
          org_id: string | null
          signal_type: 'funding_round' | 'executive_change' | 'job_posting' | 'technology_adoption' | 'expansion' | 'website_activity' | 'competitor_mention' | 'companies_house_filing' | 'news_mention' | 'social_media_activity'
          signal_strength: 'very_strong' | 'strong' | 'moderate' | 'weak'
          confidence_score: number
          signal_data: Json
          detected_at: string
          detected_by: string
          status: 'active' | 'acted_upon' | 'expired' | 'false_positive'
          acted_upon_at: string | null
          acted_upon_by: string | null
          expires_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          company_id: string
          org_id?: string | null
          signal_type: 'funding_round' | 'executive_change' | 'job_posting' | 'technology_adoption' | 'expansion' | 'website_activity' | 'competitor_mention' | 'companies_house_filing' | 'news_mention' | 'social_media_activity'
          signal_strength: 'very_strong' | 'strong' | 'moderate' | 'weak'
          confidence_score: number
          signal_data: Json
          detected_at?: string
          detected_by: string
          status?: 'active' | 'acted_upon' | 'expired' | 'false_positive'
          acted_upon_at?: string | null
          acted_upon_by?: string | null
          expires_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          org_id?: string | null
          signal_type?: 'funding_round' | 'executive_change' | 'job_posting' | 'technology_adoption' | 'expansion' | 'website_activity' | 'competitor_mention' | 'companies_house_filing' | 'news_mention' | 'social_media_activity'
          signal_strength?: 'very_strong' | 'strong' | 'moderate' | 'weak'
          confidence_score?: number
          signal_data?: Json
          detected_at?: string
          detected_by?: string
          status?: 'active' | 'acted_upon' | 'expired' | 'false_positive'
          acted_upon_at?: string | null
          acted_upon_by?: string | null
          expires_at?: string | null
          created_at?: string
        }
      }
      streams: {
        Row: {
          id: string
          org_id: string
          name: string
          description: string | null
          emoji: string | null
          color: string | null
          stream_type: 'project' | 'deal' | 'campaign' | 'research' | 'territory'
          stages: Json | null
          metadata: Json | null
          status: 'active' | 'archived' | 'completed'
          archived_at: string | null
          created_by: string
          updated_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          org_id: string
          name: string
          description?: string | null
          emoji?: string | null
          color?: string | null
          stream_type?: 'project' | 'deal' | 'campaign' | 'research' | 'territory'
          stages?: Json | null
          metadata?: Json | null
          status?: 'active' | 'archived' | 'completed'
          archived_at?: string | null
          created_by: string
          updated_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          name?: string
          description?: string | null
          emoji?: string | null
          color?: string | null
          stream_type?: 'project' | 'deal' | 'campaign' | 'research' | 'territory'
          stages?: Json | null
          metadata?: Json | null
          status?: 'active' | 'archived' | 'completed'
          archived_at?: string | null
          created_by?: string
          updated_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      stream_members: {
        Row: {
          id: string
          stream_id: string
          user_id: string
          role: 'owner' | 'editor' | 'viewer' | 'guest'
          notification_settings: Json | null
          invited_by: string | null
          invitation_accepted_at: string | null
          joined_at: string
          last_accessed_at: string | null
        }
        Insert: {
          id?: string
          stream_id: string
          user_id: string
          role?: 'owner' | 'editor' | 'viewer' | 'guest'
          notification_settings?: Json | null
          invited_by?: string | null
          invitation_accepted_at?: string | null
          joined_at?: string
          last_accessed_at?: string | null
        }
        Update: {
          id?: string
          stream_id?: string
          user_id?: string
          role?: 'owner' | 'editor' | 'viewer' | 'guest'
          notification_settings?: Json | null
          invited_by?: string | null
          invitation_accepted_at?: string | null
          joined_at?: string
          last_accessed_at?: string | null
        }
      }
      stream_items: {
        Row: {
          id: string
          stream_id: string
          item_type: string
          item_id: string | null
          position: number
          stage_id: string | null
          metadata: Json | null
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          stream_id: string
          item_type: string
          item_id?: string | null
          position?: number
          stage_id?: string | null
          metadata?: Json | null
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          stream_id?: string
          item_type?: string
          item_id?: string | null
          position?: number
          stage_id?: string | null
          metadata?: Json | null
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      api_audit_log: {
        Row: {
          id: string
          api_name: string
          endpoint: string
          method?: string
          request_params: Json | null
          response_status: number
          response_data?: Json | null
          error_message?: string | null
          user_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          api_name: string
          endpoint: string
          method?: string
          request_params?: Json | null
          response_status: number
          response_data?: Json | null
          error_message?: string | null
          user_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          api_name?: string
          endpoint?: string
          method?: string
          request_params?: Json | null
          response_status?: number
          response_data?: Json | null
          error_message?: string | null
          user_id?: string | null
          created_at?: string
        }
      }
      opportunities: {
        Row: {
          id: string
          company_id: string
          type: string
          category: string
          status: string
          potential_value: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          type: string
          category: string
          status?: string
          potential_value?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          type?: string
          category?: string
          status?: string
          potential_value?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      business_followers: {
        Row: {
          id: string
          business_id: string
          user_id: string
          notification_preference: string | null
          created_at: string
        }
        Insert: {
          id?: string
          business_id: string
          user_id: string
          notification_preference?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          business_id?: string
          user_id?: string
          notification_preference?: string | null
          created_at?: string
        }
      }
      website_data: {
        Row: {
          id: string
          business_id: string
          platform: string
          profile_url: string
          username: string | null
          bio: string | null
          profile_image_url: string | null
          is_active: boolean
          last_scraped_at: string
          scrape_status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          business_id: string
          platform: string
          profile_url: string
          username?: string | null
          bio?: string | null
          profile_image_url?: string | null
          is_active?: boolean
          last_scraped_at?: string
          scrape_status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          business_id?: string
          platform?: string
          profile_url?: string
          username?: string | null
          bio?: string | null
          profile_image_url?: string | null
          is_active?: boolean
          last_scraped_at?: string
          scrape_status?: string
          created_at?: string
          updated_at?: string
        }
      }
      social_presence_scores: {
        Row: {
          id: string
          business_id: string
          overall_score: number
          reach_score: number
          engagement_score: number
          activity_score: number
          growth_score: number
          strengths: string[]
          weaknesses: string[]
          recommendations: string[]
          calculated_at: string
          created_at: string
        }
        Insert: {
          id?: string
          business_id: string
          overall_score: number
          reach_score: number
          engagement_score: number
          activity_score: number
          growth_score: number
          strengths?: string[]
          weaknesses?: string[]
          recommendations?: string[]
          calculated_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          business_id?: string
          overall_score?: number
          reach_score?: number
          engagement_score?: number
          activity_score?: number
          growth_score?: number
          strengths?: string[]
          weaknesses?: string[]
          recommendations?: string[]
          calculated_at?: string
          created_at?: string
        }
      }
      bant_qualifications: {
        Row: {
          id: string
          company_id: string
          user_id: string
          budget_score: number
          authority_score: number
          need_score: number
          timing_score: number
          overall_score: number
          metadata: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          user_id: string
          budget_score: number
          authority_score: number
          need_score: number
          timing_score: number
          overall_score: number
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          user_id?: string
          budget_score?: number
          authority_score?: number
          need_score?: number
          timing_score?: number
          overall_score?: number
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      business_lists: {
        Row: {
          id: string
          name: string
          description: string | null
          created_by: string
          is_public: boolean
          business_ids: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          created_by: string
          is_public?: boolean
          business_ids?: string[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          created_by?: string
          is_public?: boolean
          business_ids?: string[]
          created_at?: string
          updated_at?: string
        }
      }
      saved_businesses: {
        Row: {
          id: string
          user_id: string
          business_id: string
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          business_id: string
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          business_id?: string
          notes?: string | null
          created_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          title: string
          message: string
          type: string
          status: string
          metadata: Json | null
          created_at: string
          read_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          message: string
          type: string
          status?: string
          metadata?: Json | null
          created_at?: string
          read_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          message?: string
          type?: string
          status?: string
          metadata?: Json | null
          created_at?: string
          read_at?: string | null
        }
      }
      research_reports: {
        Row: {
          id: string
          user_id: string
          company_id: string
          company_name: string
          company_number: string | null
          status: string
          confidence_score: number | null
          sections_complete: number
          total_sources: number
          generated_at: string | null
          cached_until: string | null
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          company_id: string
          company_name: string
          company_number?: string | null
          status?: string
          confidence_score?: number | null
          sections_complete?: number
          total_sources?: number
          generated_at?: string | null
          cached_until?: string | null
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          company_id?: string
          company_name?: string
          company_number?: string | null
          status?: string
          confidence_score?: number | null
          sections_complete?: number
          total_sources?: number
          generated_at?: string | null
          cached_until?: string | null
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
      }
      research_sections: {
        Row: {
          id: string
          report_id: string
          section_type: string
          content: Json
          confidence: string
          sources_count: number
          cached_at: string
          expires_at: string
          generation_time_ms: number | null
          error_message: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          report_id: string
          section_type: string
          content: Json
          confidence?: string
          sources_count?: number
          cached_at?: string
          expires_at?: string
          generation_time_ms?: number | null
          error_message?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          report_id?: string
          section_type?: string
          content?: Json
          confidence?: string
          sources_count?: number
          cached_at?: string
          expires_at?: string
          generation_time_ms?: number | null
          error_message?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      research_sources: {
        Row: {
          id: string
          report_id: string
          section_type: string | null
          url: string
          title: string
          published_date: string | null
          accessed_date: string
          source_type: string
          reliability_score: number
          domain: string | null
          content_snippet: string | null
          created_at: string
        }
        Insert: {
          id?: string
          report_id: string
          section_type?: string | null
          url: string
          title: string
          published_date?: string | null
          accessed_date?: string
          source_type: string
          reliability_score?: number
          domain?: string | null
          content_snippet?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          report_id?: string
          section_type?: string | null
          url?: string
          title?: string
          published_date?: string | null
          accessed_date?: string
          source_type?: string
          reliability_score?: number
          domain?: string | null
          content_snippet?: string | null
          created_at?: string
        }
      }
      user_research_quotas: {
        Row: {
          user_id: string
          period_start: string
          period_end: string
          researches_used: number
          researches_limit: number
          tier: string
          notification_90_percent_sent: boolean
          notification_100_percent_sent: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          period_start?: string
          period_end?: string
          researches_used?: number
          researches_limit?: number
          tier?: string
          notification_90_percent_sent?: boolean
          notification_100_percent_sent?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          period_start?: string
          period_end?: string
          researches_used?: number
          researches_limit?: number
          tier?: string
          notification_90_percent_sent?: boolean
          notification_100_percent_sent?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      stakeholders: {
        Row: {
          id: string
          company_id: string
          name: string
          job_title: string
          department: string | null
          linkedin_url: string | null
          business_email: string | null
          metadata: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          name: string
          job_title: string
          department?: string | null
          linkedin_url?: string | null
          business_email?: string | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          name?: string
          job_title?: string
          department?: string | null
          linkedin_url?: string | null
          business_email?: string | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      stakeholder_engagement: {
        Row: {
          id: string
          stakeholder_id: string
          user_id: string
          engagement_type: string
          engagement_score: number
          last_contact: string | null
          metadata: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          stakeholder_id: string
          user_id: string
          engagement_type: string
          engagement_score?: number
          last_contact?: string | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          stakeholder_id?: string
          user_id?: string
          engagement_type?: string
          engagement_score?: number
          last_contact?: string | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      lead_scores: {
        Row: {
          id: string
          company_id: string
          user_id: string
          overall_score: number
          metadata: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          user_id: string
          overall_score: number
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          user_id?: string
          overall_score?: number
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      meddic_qualifications: {
        Row: {
          id: string
          company_id: string
          user_id: string
          metrics_score: number
          economic_buyer_score: number
          decision_criteria_score: number
          decision_process_score: number
          identify_pain_score: number
          champion_score: number
          overall_score: number
          metadata: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          user_id: string
          metrics_score: number
          economic_buyer_score: number
          decision_criteria_score: number
          decision_process_score: number
          identify_pain_score: number
          champion_score: number
          overall_score: number
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          user_id?: string
          metrics_score?: number
          economic_buyer_score?: number
          decision_criteria_score?: number
          decision_process_score?: number
          identify_pain_score?: number
          champion_score?: number
          overall_score?: number
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}