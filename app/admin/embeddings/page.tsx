'use client'

/**
 * Admin: Embeddings Management Page
 * Generate and monitor company embeddings
 */

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'

interface EmbeddingStats {
  total: number
  withEmbeddings: number
  withoutEmbeddings: number
  percentage: number
  totalTokens: number
  estimatedCost: number
}

interface GenerationResult {
  success: boolean
  processed: number
  failed: number
  total: number
  durationMs: number
  durationSeconds: number
  companiesPerSecond: number
  stats: EmbeddingStats
  errors?: string[]
}

export default function EmbeddingsAdminPage() {
  const [stats, setStats] = useState<EmbeddingStats | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [result, setResult] = useState<GenerationResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Load stats on mount
  const loadStats = useCallback(async () => {
    try {
      const response = await fetch('/api/embeddings/generate')
      const data = await response.json()

      if (data.success) {
        setStats(data.stats)
      }
    } catch (err) {
      console.error('Failed to load stats:', err)
    }
  }, [])

  useEffect(() => {
    loadStats()
  }, [loadStats])

  const generateEmbeddings = async (limit?: number) => {
    setIsGenerating(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch('/api/embeddings/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          generateAll: true,
          batchSize: 50,
          limit: limit || undefined
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Generation failed')
      }

      setResult(data)

      // Reload stats
      await loadStats()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to generate embeddings')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Embeddings Management</h1>
        <p className="text-muted-foreground">
          Generate and monitor vector embeddings for semantic search
        </p>
      </div>

      {/* Stats Card */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle>Current Status</CardTitle>
            <CardDescription>
              Embedding coverage across all companies
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Coverage</span>
              <span className="text-2xl font-bold">{stats.percentage.toFixed(1)}%</span>
            </div>

            <Progress value={stats.percentage} className="h-2" />

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground">Total Companies</div>
                <div className="text-2xl font-bold">{stats.total.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-muted-foreground">With Embeddings</div>
                <div className="text-2xl font-bold text-green-600">
                  {stats.withEmbeddings.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Without Embeddings</div>
                <div className="text-2xl font-bold text-orange-600">
                  {stats.withoutEmbeddings.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Estimated Cost</div>
                <div className="text-2xl font-bold">
                  ${stats.estimatedCost.toFixed(4)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions Card */}
      <Card>
        <CardHeader>
          <CardTitle>Generate Embeddings</CardTitle>
          <CardDescription>
            Generate vector embeddings for companies that don&apos;t have them yet
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <Button
              onClick={() => generateEmbeddings(100)}
              disabled={isGenerating}
              variant="outline"
            >
              Generate 100
            </Button>
            <Button
              onClick={() => generateEmbeddings(500)}
              disabled={isGenerating}
              variant="outline"
            >
              Generate 500
            </Button>
            <Button
              onClick={() => generateEmbeddings()}
              disabled={isGenerating}
            >
              {isGenerating ? 'Generating...' : 'Generate All'}
            </Button>
          </div>

          {isGenerating && (
            <Alert>
              <AlertDescription>
                Generating embeddings... This may take a few minutes depending on the number of companies.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Result Card */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle>Generation Complete</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Badge variant={result.success ? 'default' : 'destructive'}>
                {result.success ? 'Success' : 'Failed'}
              </Badge>
              <Badge variant="outline">
                {result.durationSeconds}s
              </Badge>
              <Badge variant="outline">
                {result.companiesPerSecond} companies/sec
              </Badge>
            </div>

            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground">Processed</div>
                <div className="text-2xl font-bold text-green-600">
                  {result.processed}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Failed</div>
                <div className="text-2xl font-bold text-red-600">
                  {result.failed}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Total</div>
                <div className="text-2xl font-bold">
                  {result.total}
                </div>
              </div>
            </div>

            {result.errors && result.errors.length > 0 && (
              <div className="mt-4">
                <h4 className="font-semibold mb-2">Errors:</h4>
                <div className="bg-red-50 p-3 rounded text-sm">
                  {result.errors.map((err, i) => (
                    <div key={i} className="text-red-700">{err}</div>
                  ))}
                </div>
              </div>
            )}

            {result.stats && (
              <div className="mt-4 p-4 bg-muted rounded">
                <h4 className="font-semibold mb-2">Updated Stats:</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>Coverage: {result.stats.percentage.toFixed(1)}%</div>
                  <div>With Embeddings: {result.stats.withEmbeddings}</div>
                  <div>Cost: ${result.stats.estimatedCost.toFixed(4)}</div>
                  <div>Tokens: {result.stats.totalTokens.toLocaleString()}</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            • Embeddings are generated using OpenAI&apos;s text-embedding-3-small model (1536 dimensions)
          </p>
          <p>
            • Cost: $0.02 per 1 million tokens (~$0.00002 per company)
          </p>
          <p>
            • Batch size: 50 companies at a time for optimal performance
          </p>
          <p>
            • Enables: Semantic search, similar company discovery, AI-powered features
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
