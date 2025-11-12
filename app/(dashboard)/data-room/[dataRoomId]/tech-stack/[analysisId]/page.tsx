'use client'

/**
 * Tech Stack Analysis Detail Page
 * View detailed analysis results with technologies, findings, and risk scores
 */

import React from 'react'
import { use } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ArrowLeft, Loader2, RefreshCcw, FileDown, ChevronDown } from 'lucide-react'
import { RiskScoreCard } from '@/components/data-room/tech-stack/risk-score-card'
import { TechnologyBreakdown } from '@/components/data-room/tech-stack/technology-breakdown'
import { FindingsDashboard } from '@/components/data-room/tech-stack/findings-dashboard'
import { TechnologiesList } from '@/components/data-room/tech-stack/technologies-list'
import {
  useTechStackAnalysis,
  useTechStackFindings,
  useTriggerTechStackAnalysis,
} from '@/lib/hooks/use-tech-stack'
import { useToast } from '@/hooks/use-toast'

export default function AnalysisDetailPage({
  params,
}: {
  params: Promise<{ dataRoomId: string; analysisId: string }>
}) {
  const resolvedParams = use(params)
  const { dataRoomId, analysisId } = resolvedParams
  const router = useRouter()
  const { toast } = useToast()

  // Fetch data
  const { analysis, isLoading, error, mutate } = useTechStackAnalysis(analysisId)
  const { findings, isLoading: findingsLoading } = useTechStackFindings(analysisId)
  const { triggerAnalysis, isAnalyzing } = useTriggerTechStackAnalysis()

  const [isExporting, setIsExporting] = React.useState(false)

  const handleExport = async (format: 'pdf' | 'xlsx') => {
    setIsExporting(true)
    try {
      const response = await fetch(
        `/api/tech-stack/analyses/${analysisId}/export?format=${format}`
      )

      if (!response.ok) {
        throw new Error(`Failed to export ${format.toUpperCase()}`)
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${analysis?.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${new Date().toISOString().split('T')[0]}.${format}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast({
        title: 'Success',
        description: `${format.toUpperCase()} exported successfully`,
      })
    } catch (error) {
      toast({
        title: 'Error',
        description:
          error instanceof Error ? error.message : `Failed to export ${format.toUpperCase()}`,
        variant: 'destructive',
      })
    } finally {
      setIsExporting(false)
    }
  }

  const handleReanalyze = async () => {
    if (
      !confirm(
        'This will re-analyze all documents and may take several minutes. Continue?'
      )
    ) {
      return
    }

    try {
      await triggerAnalysis(analysisId, { force_reanalysis: true })

      toast({
        title: 'Analysis Complete',
        description: 'Tech stack re-analysis completed successfully',
      })

      // Refresh data
      mutate()
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to re-analyze',
        variant: 'destructive',
      })
    }
  }

  if (error) {
    return (
      <div className="container mx-auto py-8 max-w-7xl">
        <div className="text-center text-red-600">
          <p>Error loading analysis: {error.message}</p>
          <Button
            onClick={() => router.push(`/data-room/${dataRoomId}/tech-stack`)}
            className="mt-4"
          >
            Back to Analyses
          </Button>
        </div>
      </div>
    )
  }

  if (isLoading || !analysis) {
    return (
      <div className="container mx-auto py-8 max-w-7xl">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/data-room/${dataRoomId}/tech-stack`)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{analysis.title}</h1>
            {analysis.description && (
              <p className="text-gray-600 dark:text-gray-400 mt-1">{analysis.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {analysis.status === 'completed' && (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" disabled={isExporting}>
                    {isExporting ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <FileDown className="h-4 w-4 mr-2" />
                    )}
                    Export
                    <ChevronDown className="h-4 w-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleExport('pdf')}>
                    <FileDown className="h-4 w-4 mr-2" />
                    Export as PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport('xlsx')}>
                    <FileDown className="h-4 w-4 mr-2" />
                    Export as Excel
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                variant="outline"
                onClick={handleReanalyze}
                disabled={isAnalyzing}
              >
                {isAnalyzing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCcw className="h-4 w-4 mr-2" />
                )}
                Re-analyze
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Status Banner */}
      {analysis.status === 'analyzing' && (
        <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
            <div>
              <h3 className="font-semibold text-blue-900 dark:text-blue-100">
                Analysis in Progress
              </h3>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Analyzing documents... This may take a few minutes.
              </p>
            </div>
          </div>
        </div>
      )}

      {analysis.status === 'failed' && (
        <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
          <div>
            <h3 className="font-semibold text-red-900 dark:text-red-100">Analysis Failed</h3>
            <p className="text-sm text-red-700 dark:text-red-300 mt-1">
              {analysis.error_message || 'An error occurred during analysis'}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleReanalyze}
              disabled={isAnalyzing}
              className="mt-2"
            >
              {isAnalyzing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCcw className="h-4 w-4 mr-2" />
              )}
              Retry Analysis
            </Button>
          </div>
        </div>
      )}

      {/* Content */}
      {analysis.status === 'completed' && (
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="technologies">Technologies</TabsTrigger>
            <TabsTrigger value="findings">Findings</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <RiskScoreCard analysis={analysis} />
            <TechnologyBreakdown analysis={analysis} />
          </TabsContent>

          <TabsContent value="technologies" className="space-y-6">
            <TechnologiesList technologies={analysis.technologies} />
          </TabsContent>

          <TabsContent value="findings" className="space-y-6">
            {findingsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : (
              <FindingsDashboard findings={findings} />
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* Pending State */}
      {analysis.status === 'pending' && (
        <div className="text-center py-12">
          <h3 className="text-lg font-semibold mb-2">Analysis Not Started</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Click &ldquo;Start Analysis&rdquo; from the list page to begin analyzing documents.
          </p>
          <Button onClick={() => router.push(`/data-room/${dataRoomId}/tech-stack`)}>
            Back to List
          </Button>
        </div>
      )}
    </div>
  )
}
