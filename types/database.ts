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
          companies_house_last_updated: string | null
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