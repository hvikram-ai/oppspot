'use client'

/**
 * ChatSpot™ - Result Display Components
 * Display search results, research, and other data from ChatSpot
 */

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Building2,
  MapPin,
  Users,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Plus,
  Download
} from 'lucide-react'
import type { ChatResult } from '@/lib/chatspot/types'
import { CreateListDialog } from './create-list-dialog'

interface ResultDisplayProps {
  result: ChatResult
  onAction?: (action: string, data: Record<string, unknown>) => void
}

export function ResultDisplay({ result, onAction }: ResultDisplayProps) {
  switch (result.type) {
    case 'companies':
      return <CompanyResults result={result} onAction={onAction} />
    case 'research':
      return <ResearchResults result={result} onAction={onAction} />
    case 'summary':
      return <SummaryResults result={result} onAction={onAction} />
    case 'error':
      return <ErrorResults result={result} />
    default:
      return <GenericResults result={result} />
  }
}

/**
 * Company Search Results
 */
function CompanyResults({ result, onAction }: ResultDisplayProps) {
  const [expanded, setExpanded] = useState(false)
  const [showCreateListDialog, setShowCreateListDialog] = useState(false)
  const companies = Array.isArray(result.data) ? result.data : []
  const displayLimit = expanded ? companies.length : Math.min(5, companies.length)
  const hasMore = companies.length > 5

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-blue-600" />
          <span className="font-medium">{result.preview || 'Companies'}</span>
        </div>
        <Badge variant="secondary">{result.count || companies.length} results</Badge>
      </div>

      {/* Company List */}
      {companies.length > 0 ? (
        <div className="space-y-2">
          {companies.slice(0, displayLimit).map((company: any, idx: number) => (
            <Card key={company.id || idx} className="hover:bg-muted/50 transition-colors">
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Link
                        href={`/business/${company.id}`}
                        className="font-medium hover:underline text-sm truncate"
                        target="_blank"
                      >
                        {company.name}
                      </Link>
                      <ExternalLink className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      {company.industry && (
                        <Badge variant="outline" className="text-xs">
                          {company.industry}
                        </Badge>
                      )}
                      {company.city && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {company.city}
                        </span>
                      )}
                      {company.employee_count && (
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {company.employee_count} employees
                        </span>
                      )}
                      {company.funding_stage && (
                        <span className="flex items-center gap-1">
                          <TrendingUp className="h-3 w-3" />
                          {company.funding_stage}
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs flex-shrink-0"
                    onClick={() => onAction?.('add_to_list', company)}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Expand/Collapse */}
          {hasMore && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
              className="w-full text-xs"
            >
              {expanded ? (
                <>
                  <ChevronUp className="h-3 w-3 mr-1" />
                  Show Less
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3 mr-1" />
                  Show {companies.length - 5} More
                </>
              )}
            </Button>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No companies found.</p>
      )}

      {/* Actions */}
      {companies.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-2 border-t">
          <Button
            size="sm"
            variant="outline"
            className="text-xs"
            onClick={() => setShowCreateListDialog(true)}
          >
            <Plus className="h-3 w-3 mr-1" />
            Add All to List
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-xs"
            onClick={() => onAction?.('export', { data: companies, format: 'csv' })}
          >
            <Download className="h-3 w-3 mr-1" />
            Export CSV
          </Button>
        </div>
      )}

      {/* Create List Dialog */}
      <CreateListDialog
        open={showCreateListDialog}
        onOpenChange={setShowCreateListDialog}
        companies={companies}
        onListCreated={(listId, listName) => {
          console.log(`Created list: ${listName} (${listId})`)
          onAction?.('list_created', { listId, listName, companies })
        }}
      />
    </div>
  )
}

/**
 * Research Results
 */
function ResearchResults({ result, onAction }: ResultDisplayProps) {
  const research = result.data || {}

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Building2 className="h-4 w-4 text-purple-600" />
        <span className="font-medium">{result.preview || 'Research Report'}</span>
      </div>

      {research.company && (
        <Card>
          <CardContent className="p-3 space-y-2">
            <h4 className="font-medium text-sm">{research.company.name}</h4>

            {research.facts && research.facts.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Key Facts:</p>
                <ul className="text-xs space-y-1">
                  {research.facts.slice(0, 5).map((fact: any, idx: number) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-muted-foreground">•</span>
                      <span>{fact.fact || fact}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <Link href={`/business/${research.company.id}`} target="_blank">
              <Button size="sm" variant="outline" className="w-full text-xs mt-2">
                View Full Report
                <ExternalLink className="h-3 w-3 ml-1" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

/**
 * Summary Results
 */
function SummaryResults({ result }: ResultDisplayProps) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{result.preview}</p>
      {result.count !== undefined && (
        <Badge variant="secondary" className="text-xs">
          {result.count} items
        </Badge>
      )}
    </div>
  )
}

/**
 * Error Results
 */
function ErrorResults({ result }: ResultDisplayProps) {
  return (
    <div className="rounded-md bg-red-50 dark:bg-red-950/20 p-3">
      <p className="text-sm text-red-600 dark:text-red-400">
        {result.preview || 'An error occurred'}
      </p>
      {result.data?.error && (
        <p className="text-xs text-red-500 mt-1">{result.data.error}</p>
      )}
    </div>
  )
}

/**
 * Generic Results Fallback
 */
function GenericResults({ result }: ResultDisplayProps) {
  return (
    <div className="space-y-2">
      <p className="text-sm">{result.preview || 'Result'}</p>
      {result.count !== undefined && (
        <p className="text-xs text-muted-foreground">{result.count} results</p>
      )}
    </div>
  )
}
