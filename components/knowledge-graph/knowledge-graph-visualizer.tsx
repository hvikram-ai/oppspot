'use client'

/**
 * Knowledge Graph™ - Graph Visualization Component
 * Interactive network visualization of entities and relationships
 */

import { useEffect, useRef, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { GraphData, GraphNode, GraphEdge } from '@/lib/knowledge-graph/types'
import { Network, Eye, Maximize2, ZoomIn, ZoomOut } from 'lucide-react'

interface KnowledgeGraphVisualizerProps {
  data: GraphData
  onNodeClick?: (node: GraphNode) => void
  height?: number
}

export function KnowledgeGraphVisualizer({
  data,
  onNodeClick,
  height = 600
}: KnowledgeGraphVisualizerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null)

  useEffect(() => {
    if (!containerRef.current || !data.nodes.length) return

    // Render simple graph visualization
    // In production, use D3.js or similar library for interactive graphs
    renderGraph(data, containerRef.current)
  }, [data])

  const handleNodeClick = (node: GraphNode) => {
    setSelectedNode(node)
    onNodeClick?.(node)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Network className="h-5 w-5" />
              Knowledge Graph
            </CardTitle>
            <CardDescription>
              {data.nodes.length} entities • {data.edges.length} relationships
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm">
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm">
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Graph Visualization */}
        <div
          ref={containerRef}
          className="border rounded-lg bg-muted/20"
          style={{ height: `${height}px` }}
        >
          {data.nodes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <Network className="h-12 w-12 mb-3 opacity-20" />
              <p>No graph data available</p>
            </div>
          ) : (
            <div className="p-4 space-y-3">
              {/* Simple visualization - replace with D3.js in production */}
              <div className="text-sm font-medium">Entities:</div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {data.nodes.map((node) => (
                  <button
                    key={node.id}
                    onClick={() => handleNodeClick(node)}
                    className={`
                      text-left p-3 rounded-lg border transition-all
                      ${selectedNode?.id === node.id
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                        : 'border-border hover:border-blue-300 hover:bg-muted'
                      }
                    `}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">
                          {node.label}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {node.type}
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {node.confidence}
                      </Badge>
                    </div>
                    {node.relationship_count !== undefined && (
                      <div className="mt-2 text-xs text-muted-foreground">
                        {node.relationship_count} connections
                      </div>
                    )}
                  </button>
                ))}
              </div>

              {selectedNode && (
                <div className="mt-6 p-4 border rounded-lg bg-background">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold">{selectedNode.label}</h3>
                      <p className="text-sm text-muted-foreground">
                        {selectedNode.type}
                        {selectedNode.subtype && ` • ${selectedNode.subtype}`}
                      </p>
                    </div>
                    <Badge>{selectedNode.confidence}</Badge>
                  </div>

                  {/* Connections */}
                  <div className="mt-4">
                    <div className="text-sm font-medium mb-2">Connections:</div>
                    <div className="space-y-1">
                      {data.edges
                        .filter(
                          (e) => e.source === selectedNode.id || e.target === selectedNode.id
                        )
                        .map((edge) => {
                          const connectedNodeId =
                            edge.source === selectedNode.id ? edge.target : edge.source
                          const connectedNode = data.nodes.find((n) => n.id === connectedNodeId)
                          return (
                            <div
                              key={edge.id}
                              className="flex items-center gap-2 text-sm p-2 rounded bg-muted/50"
                            >
                              <Eye className="h-3 w-3 text-muted-foreground" />
                              <span className="text-muted-foreground">{edge.type}</span>
                              <span className="font-medium">{connectedNode?.label}</span>
                            </div>
                          )
                        })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Stats */}
        {data.metadata && (
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">Total Nodes</div>
              <div className="text-2xl font-bold">{data.metadata.total_nodes}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Total Edges</div>
              <div className="text-2xl font-bold">{data.metadata.total_edges}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Node Types</div>
              <div className="text-2xl font-bold">
                {Object.keys(data.metadata.node_types || {}).length}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Relationship Types</div>
              <div className="text-2xl font-bold">
                {Object.keys(data.metadata.relationship_types || {}).length}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Simple graph rendering function
// Replace with D3.js for production
function renderGraph(data: GraphData, container: HTMLElement) {
  // This is a placeholder for actual graph rendering
  // In production, use D3.js, Cytoscape.js, or similar library
  console.log('Rendering graph with', data.nodes.length, 'nodes and', data.edges.length, 'edges')
}
