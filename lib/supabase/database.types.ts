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
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          settings?: Json
          subscription_tier?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          settings?: Json
          subscription_tier?: string
          created_at?: string
          updated_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          org_id: string | null
          full_name: string | null
          email: string | null
          avatar_url: string | null
          role: string
          preferences: Json
          streak_count: number
          last_active: string | null
          email_verified_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          org_id?: string | null
          full_name?: string | null
          email?: string | null
          avatar_url?: string | null
          role?: string
          preferences?: Json
          streak_count?: number
          last_active?: string | null
          email_verified_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          org_id?: string | null
          full_name?: string | null
          email?: string | null
          avatar_url?: string | null
          role?: string
          preferences?: Json
          streak_count?: number
          last_active?: string | null
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
          address: Json | null
          location: unknown | null
          latitude: number | null
          longitude: number | null
          phone_numbers: Json
          emails: Json
          website: string | null
          social_links: Json
          categories: string[]
          ai_insights: Json
          embedding: unknown | null
          metadata: Json
          rating: number | null
          verified: boolean
          verified_at: string | null
          search_vector: unknown | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          google_place_id?: string | null
          name: string
          slug?: string | null
          description?: string | null
          address?: Json | null
          location?: unknown | null
          latitude?: number | null
          longitude?: number | null
          phone_numbers?: Json
          emails?: Json
          website?: string | null
          social_links?: Json
          categories?: string[]
          ai_insights?: Json
          embedding?: unknown | null
          metadata?: Json
          rating?: number | null
          verified?: boolean
          verified_at?: string | null
          search_vector?: unknown | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          google_place_id?: string | null
          name?: string
          slug?: string | null
          description?: string | null
          address?: Json | null
          location?: unknown | null
          latitude?: number | null
          longitude?: number | null
          phone_numbers?: Json
          emails?: Json
          website?: string | null
          social_links?: Json
          categories?: string[]
          ai_insights?: Json
          embedding?: unknown | null
          metadata?: Json
          rating?: number | null
          verified?: boolean
          verified_at?: string | null
          search_vector?: unknown | null
          created_at?: string
          updated_at?: string
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
      exports: {
        Row: {
          id: string
          user_id: string
          export_type: string
          filters: Json
          record_count: number | null
          file_url: string | null
          status: string
          created_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          export_type: string
          filters?: Json
          record_count?: number | null
          file_url?: string | null
          status?: string
          created_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          export_type?: string
          filters?: Json
          record_count?: number | null
          file_url?: string | null
          status?: string
          created_at?: string
          completed_at?: string | null
        }
      }
      events: {
        Row: {
          id: string
          user_id: string
          event_type: string
          event_data: Json
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          event_type: string
          event_data: Json
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          event_type?: string
          event_data?: Json
          created_at?: string
        }
      }
      saved_businesses: {
        Row: {
          id: string
          user_id: string
          business_id: string
          saved_at: string
          notes: string | null
          tags: string[]
        }
        Insert: {
          id?: string
          user_id: string
          business_id: string
          saved_at?: string
          notes?: string | null
          tags?: string[]
        }
        Update: {
          id?: string
          user_id?: string
          business_id?: string
          saved_at?: string
          notes?: string | null
          tags?: string[]
        }
      }
    }
    Views: {
      business_search_view: {
        Row: {
          id: string
          name: string
          description: string | null
          categories: string[]
          address: Json | null
          latitude: number | null
          longitude: number | null
          rating: number | null
          verified: boolean
          search_vector: unknown | null
        }
      }
    }
    Functions: {
      search_businesses: {
        Args: {
          search_query?: string | null
          filter_categories?: string[] | null
          filter_location?: string | null
          filter_min_rating?: number | null
          filter_verified?: boolean | null
          user_lat?: number | null
          user_lng?: number | null
          radius_km?: number | null
          sort_by?: string | null
          page_limit?: number
          page_offset?: number
        }
        Returns: {
          id: string
          name: string
          description: string | null
          address: Json | null
          latitude: number | null
          longitude: number | null
          phone_numbers: Json
          emails: Json
          website: string | null
          categories: string[]
          rating: number | null
          verified: boolean
          distance_km?: number | null
          total_count?: number
        }[]
      }
      search_businesses_by_location: {
        Args: {
          lat: number
          lng: number
          radius_km?: number
        }
        Returns: Database['public']['Tables']['businesses']['Row'][]
      }
      generate_search_vector: {
        Args: {
          name: string
          description?: string | null
          categories?: string[] | null
          address?: Json | null
        }
        Returns: unknown
      }
    }
    Enums: {
      subscription_tier: 'free' | 'starter' | 'professional' | 'enterprise'
      user_role: 'member' | 'admin' | 'owner'
      export_status: 'pending' | 'processing' | 'completed' | 'failed'
    }
  }
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type Inserts<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type Updates<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T]