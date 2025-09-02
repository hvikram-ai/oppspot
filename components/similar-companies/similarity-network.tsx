'use client'

import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Network, 
  Zap,
  Download,
  Pause,
  Play,
  RotateCcw,
  Layers,
  Filter
} from 'lucide-react'

interface SimilarityMatch {
  id: string
  company_name: string
  overall_score: number
  confidence: number
  rank: number
  financial_score: number
  strategic_score: number
  operational_score: number
  market_score: number
  risk_score: number
  company_data?: {
    country?: string
    industry?: string
    revenue?: string
  }
}

interface NetworkNode {
  id: string
  name: string
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  color: string
  score: number
  rank: number
  country: string
  industry: string
  fixed: boolean
  originalMatch: SimilarityMatch
}

interface NetworkEdge {
  source: string
  target: string
  weight: number
  distance: number
}

interface SimilarityNetworkProps {
  matches: SimilarityMatch[]
  targetCompany: string
  maxNodes?: number
}

export function SimilarityNetwork({ 
  matches, 
  targetCompany, 
  maxNodes = 25 
}: SimilarityNetworkProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const animationRef = useRef<number>()
  
  const [isRunning, setIsRunning] = useState(true)
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)
  const [showEdges, setShowEdges] = useState(true)
  const [clusterBy, setClusterBy] = useState<'country' | 'industry' | 'score'>('industry')
  const [edgeThreshold, setEdgeThreshold] = useState(0.7)
  const [forceStrength, setForceStrength] = useState(0.3)

  // Chart dimensions
  const width = 600
  const height = 400
  const centerX = width / 2
  const centerY = height / 2

  // Prepare network data
  const networkData = useMemo(() => {
    const topMatches = matches.slice(0, maxNodes)
    
    // Create nodes
    const nodes: NetworkNode[] = topMatches.map((match, index) => {
      const angle = (index / topMatches.length) * 2 * Math.PI
      const distance = 100 + Math.random() * 50
      
      return {
        id: match.id,
        name: match.company_name,
        x: centerX + distance * Math.cos(angle),
        y: centerY + distance * Math.sin(angle),
        vx: 0,
        vy: 0,
        radius: 5 + (100 - match.rank) / 10, // Larger radius for higher ranked companies
        color: getNodeColor(match, clusterBy),
        score: match.overall_score,
        rank: match.rank,
        country: match.company_data?.country || 'Unknown',
        industry: match.company_data?.industry || 'Unknown',
        fixed: false,
        originalMatch: match
      }
    })

    // Create edges based on similarity
    const edges: NetworkEdge[] = []
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const similarity = calculateSimilarity(nodes[i].originalMatch, nodes[j].originalMatch)
        if (similarity >= edgeThreshold) {
          edges.push({
            source: nodes[i].id,
            target: nodes[j].id,
            weight: similarity,
            distance: 50 + (1 - similarity) * 100
          })
        }
      }
    }

    return { nodes, edges }
  }, [matches, maxNodes, clusterBy, edgeThreshold])

  // Calculate similarity between two companies
  const calculateSimilarity = (match1: SimilarityMatch, match2: SimilarityMatch): number => {
    const scores1 = [match1.financial_score, match1.strategic_score, match1.operational_score, match1.market_score, match1.risk_score]
    const scores2 = [match2.financial_score, match2.strategic_score, match2.operational_score, match2.market_score, match2.risk_score]
    
    // Calculate Euclidean similarity
    const squaredDiffs = scores1.map((score, i) => Math.pow(score - scores2[i], 2))
    const euclideanDistance = Math.sqrt(squaredDiffs.reduce((sum, diff) => sum + diff, 0))
    const maxDistance = Math.sqrt(5 * Math.pow(100, 2)) // Maximum possible distance
    
    return 1 - (euclideanDistance / maxDistance)
  }

  // Get node color based on clustering criteria
  function getNodeColor(match: SimilarityMatch, clusterBy: string): string {
    switch (clusterBy) {
      case 'country':
        const countryColors: { [key: string]: string } = {
          'United States': '#3b82f6',
          'China': '#ef4444',
          'Germany': '#10b981',
          'United Kingdom': '#f59e0b',
          'France': '#8b5cf6',
          'Japan': '#06b6d4',
          'Unknown': '#6b7280'
        }
        return countryColors[match.company_data?.country || 'Unknown'] || '#6b7280'
      
      case 'industry':
        const industryColors: { [key: string]: string } = {
          'Technology': '#3b82f6',
          'Healthcare': '#10b981',
          'Finance': '#f59e0b',
          'Manufacturing': '#ef4444',
          'Energy': '#8b5cf6',
          'Consumer': '#06b6d4',
          'Unknown': '#6b7280'
        }
        const industry = match.company_data?.industry || 'Unknown'
        return industryColors[Object.keys(industryColors).find(key => industry.toLowerCase().includes(key.toLowerCase())) || 'Unknown'] || '#6b7280'
      
      case 'score':
        if (match.overall_score >= 85) return '#10b981' // green
        if (match.overall_score >= 70) return '#3b82f6' // blue
        if (match.overall_score >= 55) return '#f59e0b' // yellow
        return '#ef4444' // red
      
      default:
        return '#6b7280'
    }
  }

  // Physics simulation step
  const simulationStep = useCallback(() => {
    if (!isRunning) return

    const { nodes, edges } = networkData
    const dt = 0.1
    const damping = 0.95

    // Apply forces
    nodes.forEach(node => {
      if (node.fixed) return

      // Center force
      const centerForceX = (centerX - node.x) * 0.001
      const centerForceY = (centerY - node.y) * 0.001
      node.vx += centerForceX
      node.vy += centerForceY

      // Repulsion force between nodes
      nodes.forEach(other => {
        if (other.id === node.id) return
        
        const dx = node.x - other.x
        const dy = node.y - other.y
        const distance = Math.sqrt(dx * dx + dy * dy) || 1
        const force = (node.radius + other.radius + 20) / (distance * distance) * forceStrength
        
        node.vx += (dx / distance) * force
        node.vy += (dy / distance) * force
      })
    })

    // Apply edge forces
    if (showEdges) {
      edges.forEach(edge => {
        const source = nodes.find(n => n.id === edge.source)
        const target = nodes.find(n => n.id === edge.target)
        
        if (!source || !target) return

        const dx = target.x - source.x
        const dy = target.y - source.y
        const distance = Math.sqrt(dx * dx + dy * dy) || 1
        const force = (distance - edge.distance) * edge.weight * 0.1

        if (!source.fixed) {
          source.vx += (dx / distance) * force * dt
          source.vy += (dy / distance) * force * dt
        }
        if (!target.fixed) {
          target.vx -= (dx / distance) * force * dt
          target.vy -= (dy / distance) * force * dt
        }
      })
    }

    // Update positions
    nodes.forEach(node => {
      if (node.fixed) return

      node.vx *= damping
      node.vy *= damping
      node.x += node.vx * dt
      node.y += node.vy * dt

      // Keep nodes within bounds
      const margin = node.radius + 10
      node.x = Math.max(margin, Math.min(width - margin, node.x))
      node.y = Math.max(margin, Math.min(height - margin, node.y))
    })

    // Continue animation
    if (isRunning) {
      animationRef.current = requestAnimationFrame(simulationStep)
    }
  }, [networkData, isRunning, showEdges, forceStrength])

  // Start/stop animation
  useEffect(() => {
    if (isRunning && !animationRef.current) {
      animationRef.current = requestAnimationFrame(simulationStep)
    } else if (!isRunning && animationRef.current) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = undefined
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isRunning, simulationStep])

  // Handle node interactions
  const handleNodeMouseDown = (nodeId: string, event: React.MouseEvent) => {
    const node = networkData.nodes.find(n => n.id === nodeId)
    if (node) {
      node.fixed = true
      setSelectedNode(nodeId)
    }
  }

  const handleNodeMouseUp = () => {
    networkData.nodes.forEach(node => {
      node.fixed = false
    })
    setSelectedNode(null)
  }

  const handleNodeMouseMove = (event: React.MouseEvent) => {
    if (selectedNode && svgRef.current) {
      const rect = svgRef.current.getBoundingClientRect()
      const node = networkData.nodes.find(n => n.id === selectedNode)
      if (node) {
        node.x = event.clientX - rect.left
        node.y = event.clientY - rect.top
        node.vx = 0
        node.vy = 0
      }
    }
  }

  const resetLayout = () => {
    networkData.nodes.forEach((node, index) => {
      const angle = (index / networkData.nodes.length) * 2 * Math.PI
      const distance = 100 + Math.random() * 50
      node.x = centerX + distance * Math.cos(angle)
      node.y = centerY + distance * Math.sin(angle)
      node.vx = 0
      node.vy = 0
      node.fixed = false
    })
  }

  const exportData = () => {
    const data = {
      nodes: networkData.nodes.map(node => ({
        id: node.id,
        name: node.name,
        rank: node.rank,
        score: node.score,
        country: node.country,
        industry: node.industry,
        x: node.x,
        y: node.y
      })),
      edges: networkData.edges,
      clustering: clusterBy,
      timestamp: new Date().toISOString()
    }
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `similarity-network-${targetCompany}.json`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  // Get unique values for clustering
  const getClusterCategories = () => {
    const categories = new Map<string, number>()
    
    networkData.nodes.forEach(node => {
      let category: string
      switch (clusterBy) {
        case 'country':
          category = node.country
          break
        case 'industry':
          category = node.industry
          break
        case 'score':
          if (node.score >= 85) category = 'Excellent (85+)'
          else if (node.score >= 70) category = 'Good (70-84)'
          else if (node.score >= 55) category = 'Fair (55-69)'
          else category = 'Poor (<55)'
          break
        default:
          category = 'Unknown'
      }
      
      categories.set(category, (categories.get(category) || 0) + 1)
    })
    
    return Array.from(categories.entries()).map(([name, count]) => ({ name, count }))
  }

  const clusterCategories = getClusterCategories()

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Network className="h-5 w-5" />
              Company Similarity Network
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Interactive network showing relationships between similar companies
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsRunning(!isRunning)}
            >
              {isRunning ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
              {isRunning ? 'Pause' : 'Play'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={resetLayout}
            >
              <RotateCcw className="h-3 w-3" />
              Reset
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={exportData}
            >
              <Download className="h-3 w-3" />
              Export
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Controls */}
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <div>
            <label className="text-sm font-medium">Cluster by:</label>
            <select
              value={clusterBy}
              onChange={(e) => setClusterBy(e.target.value as 'country' | 'industry' | 'score')}
              className="ml-2 text-sm border rounded px-2 py-1"
            >
              <option value="country">Country</option>
              <option value="industry">Industry</option>
              <option value="score">Score Range</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">Connection Threshold:</label>
            <input
              type="range"
              min="0.5"
              max="0.95"
              step="0.05"
              value={edgeThreshold}
              onChange={(e) => setEdgeThreshold(parseFloat(e.target.value))}
              className="ml-2 w-20"
            />
            <span className="ml-1 text-xs text-muted-foreground">
              {(edgeThreshold * 100).toFixed(0)}%
            </span>
          </div>

          <div>
            <label className="text-sm font-medium">Force Strength:</label>
            <input
              type="range"
              min="0.1"
              max="1.0"
              step="0.1"
              value={forceStrength}
              onChange={(e) => setForceStrength(parseFloat(e.target.value))}
              className="ml-2 w-20"
            />
            <span className="ml-1 text-xs text-muted-foreground">
              {forceStrength.toFixed(1)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="showEdges"
              checked={showEdges}
              onChange={(e) => setShowEdges(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="showEdges" className="text-sm">Show Connections</label>
          </div>
        </div>

        {/* Network Visualization */}
        <div className="flex justify-center mb-6">
          <svg
            ref={svgRef}
            width={width}
            height={height}
            className="border rounded-lg bg-white cursor-move"
            onMouseMove={handleNodeMouseMove}
            onMouseUp={handleNodeMouseUp}
          >
            {/* Edges */}
            {showEdges && (
              <g>
                {networkData.edges.map((edge, index) => {
                  const source = networkData.nodes.find(n => n.id === edge.source)
                  const target = networkData.nodes.find(n => n.id === edge.target)
                  
                  if (!source || !target) return null
                  
                  return (
                    <line
                      key={`${edge.source}-${edge.target}`}
                      x1={source.x}
                      y1={source.y}
                      x2={target.x}
                      y2={target.y}
                      stroke="#d1d5db"
                      strokeWidth={edge.weight * 2}
                      opacity={0.6}
                    />
                  )
                })}
              </g>
            )}

            {/* Nodes */}
            <g>
              {networkData.nodes.map(node => {
                const isHovered = hoveredNode === node.id
                const isSelected = selectedNode === node.id
                
                return (
                  <g key={node.id}>
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={isHovered || isSelected ? node.radius * 1.5 : node.radius}
                      fill={node.color}
                      stroke={isSelected ? '#1f2937' : '#ffffff'}
                      strokeWidth={isSelected ? 3 : 1}
                      className="cursor-pointer transition-all duration-200"
                      onMouseDown={(e) => handleNodeMouseDown(node.id, e)}
                      onMouseEnter={() => setHoveredNode(node.id)}
                      onMouseLeave={() => setHoveredNode(null)}
                    />
                    
                    {/* Node label */}
                    <text
                      x={node.x}
                      y={node.y + node.radius + 12}
                      textAnchor="middle"
                      fontSize="10"
                      fontWeight="500"
                      fill="#374151"
                      className="pointer-events-none"
                    >
                      {node.name.length > 15 ? node.name.substring(0, 12) + '...' : node.name}
                    </text>
                    
                    {/* Rank badge */}
                    <text
                      x={node.x}
                      y={node.y + 3}
                      textAnchor="middle"
                      fontSize="8"
                      fontWeight="600"
                      fill="white"
                      className="pointer-events-none"
                    >
                      #{node.rank}
                    </text>
                  </g>
                )
              })}
            </g>

            {/* Tooltip */}
            {hoveredNode && (
              (() => {
                const node = networkData.nodes.find(n => n.id === hoveredNode)
                if (!node) return null
                
                return (
                  <g className="pointer-events-none">
                    <rect
                      x={node.x + 15}
                      y={node.y - 25}
                      width="140"
                      height="45"
                      fill="#1f2937"
                      rx="4"
                      opacity="0.9"
                    />
                    <text
                      x={node.x + 20}
                      y={node.y - 12}
                      fontSize="10"
                      fontWeight="600"
                      fill="white"
                    >
                      {node.name}
                    </text>
                    <text
                      x={node.x + 20}
                      y={node.y - 2}
                      fontSize="9"
                      fill="#d1d5db"
                    >
                      Score: {node.score.toFixed(1)} • #{node.rank}
                    </text>
                    <text
                      x={node.x + 20}
                      y={node.y + 8}
                      fontSize="8"
                      fill="#9ca3af"
                    >
                      {node.country} • {node.industry}
                    </text>
                  </g>
                )
              })()
            )}
          </svg>
        </div>

        {/* Network Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="text-center p-3 bg-muted rounded-md">
            <div className="font-semibold">{networkData.nodes.length}</div>
            <div className="text-muted-foreground text-sm">Companies</div>
          </div>
          <div className="text-center p-3 bg-muted rounded-md">
            <div className="font-semibold">{networkData.edges.length}</div>
            <div className="text-muted-foreground text-sm">Connections</div>
          </div>
          <div className="text-center p-3 bg-muted rounded-md">
            <div className="font-semibold">
              {networkData.edges.length > 0 ? 
                (networkData.edges.reduce((sum, edge) => sum + edge.weight, 0) / networkData.edges.length).toFixed(2) : 
                '0.00'
              }
            </div>
            <div className="text-muted-foreground text-sm">Avg Similarity</div>
          </div>
          <div className="text-center p-3 bg-muted rounded-md">
            <div className="font-semibold">{clusterCategories.length}</div>
            <div className="text-muted-foreground text-sm">Clusters</div>
          </div>
        </div>

        {/* Cluster Legend */}
        <div className="mt-4">
          <h5 className="text-sm font-medium mb-2">
            Clusters by {clusterBy}:
          </h5>
          <div className="flex flex-wrap gap-2">
            {clusterCategories.map((category) => {
              const sampleNode = networkData.nodes.find(node => {
                switch (clusterBy) {
                  case 'country': return node.country === category.name
                  case 'industry': return node.industry === category.name
                  case 'score': 
                    const score = node.score
                    if (category.name.includes('Excellent')) return score >= 85
                    if (category.name.includes('Good')) return score >= 70 && score < 85
                    if (category.name.includes('Fair')) return score >= 55 && score < 70
                    if (category.name.includes('Poor')) return score < 55
                    return false
                  default: return false
                }
              })
              
              return (
                <Badge key={category.name} variant="outline" className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: sampleNode?.color || '#6b7280' }}
                  />
                  <span>{category.name} ({category.count})</span>
                </Badge>
              )
            })}
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-4 p-3 bg-gray-50 rounded-lg text-xs text-gray-600">
          <p>
            <strong>Interaction:</strong> Drag nodes to reposition them. Use controls to adjust clustering and connections. 
            Node size reflects company ranking, and connections show similarity above the threshold.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}