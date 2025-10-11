/**
 * Companies House Import Types
 * Shared types for Companies House data import functionality
 */

export interface ImportProgress {
  status: 'idle' | 'downloading' | 'processing' | 'completed' | 'failed'
  totalRows: number
  processedRows: number
  importedRows: number
  skippedRows: number
  errorRows: number
  currentBatch: number
  estimatedTimeRemaining?: number
  startedAt?: Date | string
  completedAt?: Date | string
  error?: string
}

export interface ImportStats {
  totalRecords: number
  totalImported: number
  imported: number
  skipped: number
  failed: number
}
