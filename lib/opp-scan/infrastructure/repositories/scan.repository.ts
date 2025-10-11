/**
 * Scan Repository Implementation
 * Handles persistence of scan entities with proper domain event handling
 */

import { ScanEntity } from '../../domain/entities/scan.entity'
import { IScanRepository, ScanStatus, ScanStage } from '../../core/interfaces'

// Database row type
interface ScanRow {
  id: string
  configuration: any
  status: ScanStatus
  progress: number
  current_stage: ScanStage
  companies_discovered: number
  companies_analyzed: number
  errors: any[]
  costs: any
  created_at: string
  updated_at: string
  started_at?: string
  completed_at?: string
  estimated_completion?: string
}

  // @ts-ignore - Interface implementation mismatch
export class ScanRepository implements IScanRepository {
  constructor(
    private readonly db: { query: (sql: string, params: unknown[]) => Promise<{ rows: Array<Record<string, unknown>> }> }
  ) {}

  async findById(id: string): Promise<ScanEntity | null> {
    try {
      const result = await this.db.query(
        'SELECT * FROM scans WHERE id = $1',
        [id as any]
      )

      if (result.rows.length === 0) {
        return null
      }

      const row = result.rows[0] as unknown as ScanRow
      return ScanEntity.fromSnapshot(
        row.id,
        row.configuration,
        row.status,
        row.progress,
        row.current_stage,
        row.companies_discovered,
        row.companies_analyzed,
        row.errors || [],
        row.costs || { totalCost: 0, currency: 'GBP', costBySource: {}, requestCounts: {} },
        new Date(row.created_at),
        new Date(row.updated_at),
        row.started_at ? new Date(row.started_at) : undefined,
        row.completed_at ? new Date(row.completed_at) : undefined,
        row.estimated_completion ? new Date(row.estimated_completion) : undefined
      )
    } catch (error) {
      console.error('Error finding scan by ID:', error)
      throw new Error(`Failed to find scan with ID ${id}`)
    }
  }

  async findByUserId(userId: string): Promise<ScanEntity[]> {
    try {
      const result = await this.db.query(
        'SELECT * FROM scans WHERE configuration->\'userId\' = $1 ORDER BY created_at DESC',
        [userId]
      )

      return result.rows.map((row) => {
        const scanRow = row as unknown as ScanRow
        return ScanEntity.fromSnapshot(
          scanRow.id,
          scanRow.configuration,
          scanRow.status,
          scanRow.progress,
          scanRow.current_stage,
          scanRow.companies_discovered,
          scanRow.companies_analyzed,
          scanRow.errors || [],
          scanRow.costs || { totalCost: 0, currency: 'GBP', costBySource: {}, requestCounts: {} },
          new Date(scanRow.created_at),
          new Date(scanRow.updated_at),
          scanRow.started_at ? new Date(scanRow.started_at) : undefined,
          scanRow.completed_at ? new Date(scanRow.completed_at) : undefined,
          scanRow.estimated_completion ? new Date(scanRow.estimated_completion) : undefined
        )
      })
    } catch (error) {
      console.error('Error finding scans by user ID:', error)
      throw new Error(`Failed to find scans for user ${userId}`)
    }
  }

  async findByStatus(status: ScanStatus): Promise<ScanEntity[]> {
    try {
      const result = await this.db.query(
        'SELECT * FROM scans WHERE status = $1 ORDER BY created_at DESC',
        [status]
      )

      return result.rows.map((row: unknown) => 
        ScanEntity.fromSnapshot(
          (row as any).id,
          (row as any).configuration,
          (row as any).status,
          (row as any).progress,
          (row as any).current_stage,
          (row as any).companies_discovered,
          (row as any).companies_analyzed,
          (row as any).errors || [],
          (row as any).costs || { totalCost: 0, currency: 'GBP', costBySource: {}, requestCounts: {} },
          new Date((row as any).created_at),
          new Date((row as any).updated_at),
          (row as any).started_at ? new Date((row as any).started_at) : undefined,
          (row as any).completed_at ? new Date((row as any).completed_at) : undefined,
          (row as any).estimated_completion ? new Date((row as any).estimated_completion) : undefined
        )
      )
    } catch (error) {
      console.error('Error finding scans by status:', error)
      throw new Error(`Failed to find scans with status ${status}`)
    }
  }

  async save(scan: ScanEntity): Promise<void> {
    const scanData = scan.toJSON()

    try {
      await this.db.query('BEGIN', [])
      
      // Check if scan exists
      const existingResult = await this.db.query(
        'SELECT id FROM scans WHERE id = $1',
        [scan.id]
      )

      if (existingResult.rows.length > 0) {
        // Update existing scan
        await this.db.query(`
          UPDATE scans SET
            configuration = $2,
            status = $3,
            progress = $4,
            current_stage = $5,
            companies_discovered = $6,
            companies_analyzed = $7,
            errors = $8,
            costs = $9,
            updated_at = $10,
            started_at = $11,
            completed_at = $12,
            estimated_completion = $13
          WHERE id = $1
        `, [
          scan.id,
          JSON.stringify(scanData.configuration),
          scanData.status,
          scanData.progress,
          scanData.currentStage,
          scanData.companiesDiscovered,
          scanData.companiesAnalyzed,
          JSON.stringify(scanData.errors),
          JSON.stringify(scanData.costs),
          scanData.updatedAt,
          scanData.startedAt,
          scanData.completedAt,
          scanData.estimatedCompletion
        ])
      } else {
        // Insert new scan
        await this.db.query(`
          INSERT INTO scans (
            id, configuration, status, progress, current_stage, 
            companies_discovered, companies_analyzed, errors, costs,
            created_at, updated_at, started_at, completed_at, estimated_completion
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        `, [
          scan.id,
          JSON.stringify(scanData.configuration),
          scanData.status,
          scanData.progress,
          scanData.currentStage,
          scanData.companiesDiscovered,
          scanData.companiesAnalyzed,
          JSON.stringify(scanData.errors),
          JSON.stringify(scanData.costs),
          scanData.createdAt,
          scanData.updatedAt,
          scanData.startedAt,
          scanData.completedAt,
          scanData.estimatedCompletion
        ])
      }

      await this.db.query('COMMIT', [])
    } catch (error) {
      await this.db.query('ROLLBACK', [])
      console.error('Error saving scan:', error)
      throw new Error(`Failed to save scan ${scan.id}`)
    }
  }

  async delete(id: string): Promise<void> {
    try {
      const result = await this.db.query(
        'DELETE FROM scans WHERE id = $1',
        [id]
      ) as { rows: Record<string, unknown>[]; rowCount?: number }

      if ((result.rowCount || 0) === 0) {
        throw new Error(`Scan with ID ${id} not found`)
      }
    } catch (error) {
      console.error('Error deleting scan:', error)
      throw new Error(`Failed to delete scan ${id}`)
    }
  }

  async findActiveScans(): Promise<ScanEntity[]> {
    return this.findByStatus('scanning')
  }

  async findRecentScans(limit: number = 50): Promise<ScanEntity[]> {
    try {
      const result = await this.db.query(
        'SELECT * FROM scans ORDER BY created_at DESC LIMIT $1',
        [limit]
      )

      return result.rows.map((row: unknown) => 
        ScanEntity.fromSnapshot(
          (row as any).id,
          (row as any).configuration,
          (row as any).status,
          (row as any).progress,
          (row as any).current_stage,
          (row as any).companies_discovered,
          (row as any).companies_analyzed,
          (row as any).errors || [],
          (row as any).costs || { totalCost: 0, currency: 'GBP', costBySource: {}, requestCounts: {} },
          new Date((row as any).created_at),
          new Date((row as any).updated_at),
          (row as any).started_at ? new Date((row as any).started_at) : undefined,
          (row as any).completed_at ? new Date((row as any).completed_at) : undefined,
          (row as any).estimated_completion ? new Date((row as any).estimated_completion) : undefined
        )
      )
    } catch (error) {
      console.error('Error finding recent scans:', error)
      throw new Error('Failed to find recent scans')
    }
  }

  async countByStatus(status: ScanStatus): Promise<number> {
    try {
      const result = await this.db.query(
        'SELECT COUNT(*) as count FROM scans WHERE status = $1',
        [status]
      )

      return parseInt((result.rows[0].count as string) || '0')
    } catch (error) {
      console.error('Error counting scans by status:', error)
      throw new Error(`Failed to count scans with status ${status}`)
    }
  }

  async findByDateRange(startDate: Date, endDate: Date): Promise<ScanEntity[]> {
    try {
      const result = await this.db.query(
        'SELECT * FROM scans WHERE created_at >= $1 AND created_at <= $2 ORDER BY created_at DESC',
        [startDate.toISOString(), endDate.toISOString()]
      )

      return result.rows.map((row: unknown) => 
        ScanEntity.fromSnapshot(
          (row as any).id,
          (row as any).configuration,
          (row as any).status,
          (row as any).progress,
          (row as any).current_stage,
          (row as any).companies_discovered,
          (row as any).companies_analyzed,
          (row as any).errors || [],
          (row as any).costs || { totalCost: 0, currency: 'GBP', costBySource: {}, requestCounts: {} },
          new Date((row as any).created_at),
          new Date((row as any).updated_at),
          (row as any).started_at ? new Date((row as any).started_at) : undefined,
          (row as any).completed_at ? new Date((row as any).completed_at) : undefined,
          (row as any).estimated_completion ? new Date((row as any).estimated_completion) : undefined
        )
      )
    } catch (error) {
      console.error('Error finding scans by date range:', error)
      throw new Error('Failed to find scans in date range')
    }
  }
}