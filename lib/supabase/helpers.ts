/**
 * Supabase Type Helpers
 * Utility functions to ensure proper type inference for Supabase queries
 */

import type { Database } from '@/types/database'

// Table names
export type TableName = keyof Database['public']['Tables']

// Row types for each table
export type Tables<T extends TableName> = Database['public']['Tables'][T]
export type Row<T extends TableName> = Tables<T>['Row']
export type Insert<T extends TableName> = Tables<T>['Insert']
export type Update<T extends TableName> = Tables<T>['Update']

// Helper to ensure typed table access
export function table<T extends TableName>(name: T) {
  return name
}

// Type-safe query result helpers
export type QueryResult<T extends TableName> = Row<T>
export type QueryResultArray<T extends TableName> = Row<T>[]
