'use client'

/**
 * Knowledge Graph™ - Team Intelligence Dashboard
 * Explore and query your team's collective knowledge
 */

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { KnowledgeGraphVisualizer } from '@/components/knowledge-graph/knowledge-graph-visualizer'
import {
  Brain,
  Search,
  Sparkles,
  Network,
  FileText,
  AlertCircle,
  TrendingUp,
  Lightbulb
} from 'lucide-react'
import type { GraphData, KnowledgeInsight } from '@/lib/knowledge-graph/types'
import { ProtectedLayout } from '@/components/layout/protected-layout'

export default function KnowledgeGraphPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], edges: [] })
  const [insights, setInsights] = useState<KnowledgeInsight[]>([])
  const [stats, setStats] = useState({
    total_entities: 0,
    total_relationships: 0,
    total_facts: 0,
    entities_by_type: {} as Record<string, number>
  })

  const loadDashboard = useCallback(async () => {
    // In production, load real data from API
    setStats({
      total_entities: 0,
      total_relationships: 0,
      total_facts: 0,
      entities_by_type: {}
    })
  }, [])

  useEffect(() => {
    loadDashboard()
  }, [loadDashboard])

  const handleSearch = async () => {
    if (!searchQuery.trim()) return

    setLoading(true)
    try {
      // Call semantic search API
      const response = await fetch(
        `/api/knowledge-graph/search?q=${encodeURIComponent(searchQuery)}`
      )
      const data = await response.json()

      if (data.success) {
        // Convert search results to graph data
        const nodes = data.results.map((r: any) => ({
          id: r.entity.id,
          label: r.entity.entity_name,
          type: r.entity.entity_type,
          confidence: r.entity.confidence,
          metadata: {
            similarity: r.similarity,
            description: r.entity.description
          }
        }))

        setGraphData({ nodes, edges: [] })
      }
    } catch (error) {
      console.error('Search error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (


    <ProtectedLayout>
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Brain className="h-8 w-8 text-purple-600" />
          Knowledge Graph™
        </h1>
        <p className="text-muted-foreground mt-1">
          Your team&apos;s collective intelligence, searchable and connected
        </p>
      </div>

      {/* Search Bar */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Ask anything... &apos;Find fintech companies we researched&apos; or &apos;Who knows someone at Revolut?&apos;"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-10"
              />
            </div>
            <Button onClick={handleSearch} disabled={loading}>
              {loading ? (
                'Searching...'
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Search
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">
            <TrendingUp className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="graph">
            <Network className="h-4 w-4 mr-2" />
            Graph
          </TabsTrigger>
          <TabsTrigger value="insights">
            <Lightbulb className="h-4 w-4 mr-2" />
            Insights
          </TabsTrigger>
          <TabsTrigger value="extract">
            <FileText className="h-4 w-4 mr-2" />
            Extract Knowledge
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Total Entities</CardDescription>
                <CardTitle className="text-3xl">{stats.total_entities}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Companies, people, signals, insights
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Relationships</CardDescription>
                <CardTitle className="text-3xl">{stats.total_relationships}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Connections between entities
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Facts Captured</CardDescription>
                <CardTitle className="text-3xl">{stats.total_facts}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Atomic pieces of knowledge
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Knowledge Score</CardDescription>
                <CardTitle className="text-3xl">--</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Team intelligence completeness
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Getting Started */}
          <Card>
            <CardHeader>
              <CardTitle>Welcome to Knowledge Graph™</CardTitle>
              <CardDescription>
                Your team&apos;s living memory - capturing everything you learn about companies, stakeholders, and opportunities
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">How it works:</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <div className="h-5 w-5 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">
                      1
                    </div>
                    <span>
                      <strong>Automatic Capture:</strong> We extract entities, relationships, and facts from
                      every research report, meeting note, and conversation
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="h-5 w-5 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">
                      2
                    </div>
                    <span>
                      <strong>Smart Connections:</strong> AI builds a graph connecting companies → people →
                      signals → insights → actions
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="h-5 w-5 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">
                      3
                    </div>
                    <span>
                      <strong>Instant Recall:</strong> Search using natural language - &quot;What do we know about
                      companies using AWS?&quot; gets answered in seconds
                    </span>
                  </li>
                </ul>
              </div>

              <div className="flex gap-2 pt-2">
                <Button>
                  <FileText className="h-4 w-4 mr-2" />
                  Extract from Document
                </Button>
                <Button variant="outline">
                  <Search className="h-4 w-4 mr-2" />
                  Try Example Query
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Graph Tab */}
        <TabsContent value="graph">
          <KnowledgeGraphVisualizer
            data={graphData}
            onNodeClick={(node) => console.log('Clicked:', node)}
          />
        </TabsContent>

        {/* Insights Tab */}
        <TabsContent value="insights" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>AI-Generated Insights</CardTitle>
              <CardDescription>
                Patterns, opportunities, and risks discovered in your knowledge graph
              </CardDescription>
            </CardHeader>
            <CardContent>
              {insights.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Lightbulb className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p>No insights yet</p>
                  <p className="text-sm mt-1">
                    Add more knowledge to generate AI insights
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {insights.map((insight) => (
                    <div
                      key={insight.id}
                      className="p-4 border rounded-lg hover:bg-muted/50 transition"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold">{insight.title}</h3>
                        <Badge variant={
                          insight.severity === 'critical' ? 'destructive' :
                          insight.severity === 'high' ? 'default' :
                          'secondary'
                        }>
                          {insight.severity}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {insight.description}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Extract Tab */}
        <TabsContent value="extract">
          <Card>
            <CardHeader>
              <CardTitle>Extract Knowledge from Content</CardTitle>
              <CardDescription>
                Paste any text (research report, meeting notes, email) and we&apos;ll extract entities, relationships, and facts
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Content to extract from:
                </label>
                <textarea
                  className="w-full min-h-[200px] p-3 border rounded-lg resize-y"
                  placeholder="Paste your content here... (research reports, meeting notes, emails, documents)"
                />
              </div>
              <Button>
                <Sparkles className="h-4 w-4 mr-2" />
                Extract Knowledge
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  </ProtectedLayout>

  )
}
