'use client'

/**
 * AI Insights Sidebar Component
 * Display AI analysis results for documents + Structured Smart Summaries
 */

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Sparkles,
  AlertTriangle,
  TrendingUp,
  FileText,
  Calendar,
  DollarSign,
  Users,
  Shield,
  ChevronDown,
  ChevronUp,
  Loader2,
  CheckCircle2,
  ListCheck
} from 'lucide-react'
import { SummaryView } from './summary-view'
import { SummaryRunButton } from './summary-run-button'
import { SummaryExportControls } from './summary-export-controls'
import { toast } from 'sonner'
import type {
  Document,
  DocumentAnalysis,
  DocumentMetadata,
  ConfidenceLevel
} from '@/lib/data-room/types'
import type { SummaryTemplate } from '@/lib/data-room/summaries/types'

interface AIInsightsSidebarProps {
  document: Document
  analyses: DocumentAnalysis[]
  loading?: boolean
}

export function AIInsightsSidebar({ document, analyses, loading = false }: AIInsightsSidebarProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    classification: true,
    metadata: true,
    financial: false,
    contract: false,
    risks: false
  })

  // Smart Summary state
  const [summary, setSummary] = useState<any>(null)
  const [templates, setTemplates] = useState<SummaryTemplate[]>([])
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [pollInterval, setPollInterval] = useState<NodeJS.Timeout | null>(null)

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  // Fetch templates and existing summary
  useEffect(() => {
    fetchTemplates()
    fetchSummary()

    // Cleanup poll interval on unmount
    return () => {
      if (pollInterval) clearInterval(pollInterval)
    }
  }, [document.id])

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/data-room/templates')
      const data = await response.json()
      setTemplates(data.templates.map((t: any) => t.template))
    } catch (error) {
      console.error('Failed to fetch templates:', error)
    }
  }

  const fetchSummary = async () => {
    try {
      setSummaryLoading(true)
      // Try to get the latest summary for this document
      const response = await fetch(`/api/data-room/summaries?documentId=${document.id}`)

      if (response.ok) {
        const data = await response.json()
        if (data.summary) {
          setSummary(data)

          // If status is running, start polling
          if (data.summary?.run?.status === 'running') {
            startPolling(data.summary.run_id)
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch summary:', error)
    } finally {
      setSummaryLoading(false)
    }
  }

  const startPolling = (runId: string) => {
    // Clear existing interval
    if (pollInterval) clearInterval(pollInterval)

    // Poll every 3 seconds
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/data-room/summaries/${runId}`)
        const data = await response.json()

        if (data.summary) {
          setSummary(data)

          // Stop polling if completed
          if (data.summary.run.status !== 'running' && data.summary.run.status !== 'queued') {
            clearInterval(interval)
            setPollInterval(null)

            if (data.summary.run.status === 'success' || data.summary.run.status === 'partial') {
              toast.success('Summary extraction completed', {
                description: data.summary.quality_pass
                  ? 'Quality gates passed'
                  : 'Partial extraction - some fields missing'
              })
            } else if (data.summary.run.status === 'error') {
              toast.error('Summary extraction failed', {
                description: 'Please try again or contact support'
              })
            }
          }
        }
      } catch (error) {
        console.error('Polling error:', error)
      }
    }, 3000)

    setPollInterval(interval)
  }

  const handleSummaryStarted = (runId: string) => {
    toast.info('Summary extraction started', {
      description: 'This may take 15-45 seconds...'
    })
    startPolling(runId)
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600'
    if (confidence >= 0.6) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 0.8) return <Badge className="bg-green-100 text-green-800">High Confidence</Badge>
    if (confidence >= 0.6) return <Badge className="bg-yellow-100 text-yellow-800">Medium Confidence</Badge>
    return <Badge className="bg-red-100 text-red-800">Low Confidence</Badge>
  }

  const getDocumentTypeIcon = (type: string) => {
    switch (type) {
      case 'financial': return <TrendingUp className="h-4 w-4" />
      case 'contract': return <FileText className="h-4 w-4" />
      case 'legal': return <Shield className="h-4 w-4" />
      case 'hr': return <Users className="h-4 w-4" />
      default: return <FileText className="h-4 w-4" />
    }
  }

  const financialAnalysis = analyses.find(a => a.analysis_type === 'financial')
  const contractAnalysis = analyses.find(a => a.analysis_type === 'contract')
  const riskAnalysis = analyses.find(a => a.analysis_type === 'risk')

  if (loading) {
    return (
      <Card className="h-full">
        <CardContent className="flex flex-col items-center justify-center h-full p-8">
          <Loader2 className="h-12 w-12 animate-spin text-muted-foreground mb-4" />
          <p className="text-sm text-muted-foreground">Analyzing document...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-blue-600" />
              AI Analysis
            </CardTitle>
            <CardDescription className="mt-1">
              Automated document insights & extraction
            </CardDescription>
          </div>
          {document.processing_status === 'complete' && (
            <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
          )}
        </div>
      </CardHeader>

      <Tabs defaultValue="insights" className="flex-1 flex flex-col overflow-hidden">
        <div className="px-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="insights">
              <Sparkles className="h-4 w-4 mr-2" />
              Insights
            </TabsTrigger>
            <TabsTrigger value="summary">
              <ListCheck className="h-4 w-4 mr-2" />
              Smart Summary
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="insights" className="flex-1 overflow-y-auto mt-0 px-6 pt-4 space-y-4">
        {/* Classification */}
        <div className="space-y-3">
          <button
            onClick={() => toggleSection('classification')}
            className="w-full flex items-center justify-between text-left"
          >
            <h3 className="font-semibold flex items-center gap-2">
              {getDocumentTypeIcon(document.document_type)}
              Document Classification
            </h3>
            {expandedSections.classification ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>

          {expandedSections.classification && (
            <div className="space-y-3 pl-6">
              <div className="flex items-center justify-between">
                <Badge className="capitalize">
                  {document.document_type.replace('_', ' ')}
                </Badge>
                {getConfidenceBadge(document.confidence_score)}
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">Confidence Score</p>
                <div className="flex items-center gap-3">
                  <Progress value={document.confidence_score * 100} className="flex-1" />
                  <span className={`text-sm font-medium ${getConfidenceColor(document.confidence_score)}`}>
                    {Math.round(document.confidence_score * 100)}%
                  </span>
                </div>
              </div>
              {document.confidence_score < 0.7 && (
                <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-yellow-800 dark:text-yellow-200">
                    Low confidence score may require manual review
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <Separator />

        {/* Extracted Metadata */}
        {Object.keys(document.metadata || {}).length > 0 && (
          <>
            <div className="space-y-3">
              <button
                onClick={() => toggleSection('metadata')}
                className="w-full flex items-center justify-between text-left"
              >
                <h3 className="font-semibold flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Extracted Metadata
                </h3>
                {expandedSections.metadata ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>

              {expandedSections.metadata && (
                <div className="space-y-3 pl-6">
                  <MetadataDisplay metadata={document.metadata} />
                </div>
              )}
            </div>
            <Separator />
          </>
        )}

        {/* Financial Analysis */}
        {financialAnalysis && (
          <>
            <div className="space-y-3">
              <button
                onClick={() => toggleSection('financial')}
                className="w-full flex items-center justify-between text-left"
              >
                <h3 className="font-semibold flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Financial Analysis
                </h3>
                {expandedSections.financial ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>

              {expandedSections.financial && (
                <div className="space-y-3 pl-6">
                  <FinancialAnalysisDisplay analysis={financialAnalysis} />
                </div>
              )}
            </div>
            <Separator />
          </>
        )}

        {/* Contract Analysis */}
        {contractAnalysis && (
          <>
            <div className="space-y-3">
              <button
                onClick={() => toggleSection('contract')}
                className="w-full flex items-center justify-between text-left"
              >
                <h3 className="font-semibold flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Contract Analysis
                </h3>
                {expandedSections.contract ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>

              {expandedSections.contract && (
                <div className="space-y-3 pl-6">
                  <ContractAnalysisDisplay analysis={contractAnalysis} />
                </div>
              )}
            </div>
            <Separator />
          </>
        )}

        {/* Risk Assessment */}
        {riskAnalysis && (
          <div className="space-y-3">
            <button
              onClick={() => toggleSection('risks')}
              className="w-full flex items-center justify-between text-left"
            >
              <h3 className="font-semibold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Risk Assessment
              </h3>
              {expandedSections.risks ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>

            {expandedSections.risks && (
              <div className="space-y-3 pl-6">
                <RiskAnalysisDisplay analysis={riskAnalysis} />
              </div>
            )}
          </div>
        )}

        {/* Processing Info */}
        <div className="pt-4 border-t">
          <h4 className="text-xs font-semibold text-muted-foreground mb-2">ANALYSIS INFO</h4>
          <div className="space-y-2 text-xs text-muted-foreground">
            {analyses.map((analysis, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <span className="capitalize">{analysis.analysis_type}</span>
                <span>{analysis.processing_time_ms}ms</span>
              </div>
            ))}
          </div>
        </div>
        </TabsContent>

        {/* Smart Summary Tab */}
        <TabsContent value="summary" className="flex-1 overflow-y-auto mt-0 px-6 pt-4">
          {summaryLoading && !summary ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground">Loading summary...</p>
            </div>
          ) : summary ? (
            <div className="space-y-4">
              <SummaryView summary={summary} />
              <div className="sticky bottom-0 bg-background pt-4 border-t">
                <SummaryExportControls summaryId={summary.summary.id} />
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="text-center space-y-2 mb-6">
                <ListCheck className="h-12 w-12 text-muted-foreground mx-auto" />
                <h3 className="font-semibold">No Smart Summary Yet</h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Extract structured key points from this document using AI-powered field extraction.
                </p>
              </div>
              <SummaryRunButton
                documentId={document.id}
                templates={templates}
                onRunStarted={handleSummaryStarted}
                disabled={templates.length === 0}
              />
              {templates.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Loading templates...
                </p>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </Card>
  )
}

// Helper components for displaying different types of analysis

function MetadataDisplay({ metadata }: { metadata: DocumentMetadata }) {
  return (
    <div className="space-y-3">
      {metadata.dates && metadata.dates.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-1">KEY DATES</p>
          <div className="space-y-1">
            {metadata.dates.map((date, idx) => (
              <div key={idx} className="flex items-center gap-2 text-sm">
                <Calendar className="h-3 w-3 text-muted-foreground" />
                <span>{date}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {metadata.amounts && metadata.amounts.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-1">AMOUNTS</p>
          <div className="space-y-1">
            {metadata.amounts.map((amount, idx) => (
              <div key={idx} className="flex items-center gap-2 text-sm">
                <DollarSign className="h-3 w-3 text-muted-foreground" />
                <span>
                  {amount.currency} {amount.value.toLocaleString()}
                  {amount.context && <span className="text-muted-foreground ml-1">({amount.context})</span>}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {metadata.parties && metadata.parties.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-1">PARTIES</p>
          <div className="space-y-1">
            {metadata.parties.map((party, idx) => (
              <div key={idx} className="flex items-center gap-2 text-sm">
                <Users className="h-3 w-3 text-muted-foreground" />
                <span>
                  {party.name}
                  {party.role && <span className="text-muted-foreground ml-1">({party.role})</span>}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function FinancialAnalysisDisplay({ analysis }: { analysis: DocumentAnalysis }) {
  const findings = analysis.findings as any

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        {Object.entries(findings.metrics || {}).map(([key, value]) => (
          <div key={key} className="p-2 border rounded">
            <p className="text-xs text-muted-foreground capitalize">{key.replace('_', ' ')}</p>
            <p className="text-sm font-semibold">{value as any}</p>
          </div>
        ))}
      </div>

      {findings.anomalies && findings.anomalies.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2">ANOMALIES</p>
          <div className="space-y-2">
            {findings.anomalies.map((anomaly: any, idx: number) => (
              <div key={idx} className="p-2 border-l-2 border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20 rounded">
                <p className="text-sm font-medium">{anomaly.type}</p>
                <p className="text-xs text-muted-foreground">{anomaly.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function ContractAnalysisDisplay({ analysis }: { analysis: DocumentAnalysis }) {
  const findings = analysis.findings as any

  return (
    <div className="space-y-3">
      {findings.high_risk_clauses && findings.high_risk_clauses.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2">HIGH RISK CLAUSES</p>
          <div className="space-y-2">
            {findings.high_risk_clauses.map((clause: any, idx: number) => (
              <div key={idx} className="p-2 border-l-2 border-red-500 bg-red-50 dark:bg-red-950/20 rounded">
                <Badge variant="destructive" className="mb-1">{clause.clause_type}</Badge>
                <p className="text-xs mt-1">{clause.explanation}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {findings.obligations && findings.obligations.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2">OBLIGATIONS</p>
          <div className="space-y-2">
            {findings.obligations.map((obligation: any, idx: number) => (
              <div key={idx} className="text-sm">
                <span className="font-medium">{obligation.party}:</span> {obligation.obligation}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function RiskAnalysisDisplay({ analysis }: { analysis: DocumentAnalysis }) {
  const findings = analysis.findings as any

  const getRiskColor = (score: number) => {
    if (score >= 75) return 'text-red-600'
    if (score >= 50) return 'text-yellow-600'
    return 'text-green-600'
  }

  return (
    <div className="space-y-3">
      <div className="p-3 border rounded">
        <p className="text-xs text-muted-foreground mb-1">Overall Risk Score</p>
        <p className={`text-2xl font-bold ${getRiskColor(findings.overall_risk_score)}`}>
          {findings.overall_risk_score}/100
        </p>
      </div>

      {findings.top_risks && findings.top_risks.length > 0 && (
        <div className="space-y-2">
          {findings.top_risks.map((risk: any, idx: number) => (
            <div key={idx} className="p-3 border rounded">
              <div className="flex items-center justify-between mb-2">
                <p className="font-medium text-sm">{risk.title}</p>
                <Badge variant={risk.severity === 'critical' ? 'destructive' : 'secondary'}>
                  {risk.severity}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mb-2">{risk.description}</p>
              <p className="text-xs"><span className="font-medium">Mitigation:</span> {risk.mitigation}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
