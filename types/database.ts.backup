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