'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Target, 
  Zap,
  Download,
  Filter,
  Eye,
  EyeOff
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

interface ScoreConfidenceScatterProps {
  matches: SimilarityMatch[]
  targetCompany: string
}

export function ScoreConfidenceScatter({ matches, targetCompany }: ScoreConfidenceScatterProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [selectedDimension, setSelectedDimension] = useState<keyof SimilarityMatch>('overall_score')
  const [hoveredPoint, setHoveredPoint] = useState<string | null>(null)
  const [selectedPoints, setSelectedPoints] = useState<Set<string>>(new Set())
  const [showQuadrants, setShowQuadrants] = useState(true)
  const [filterByRank, setFilterByRank] = useState<number | null>(null)

  // Chart dimensions
  const width = 600
  const height = 400
  const margin = { top: 20, right: 20, bottom: 60, left: 80 }
  const chartWidth = width - margin.left - margin.right
  const chartHeight = height - margin.top - margin.bottom

  // Prepare scatter plot data
  const scatterData = useMemo(() => {
    let filteredMatches = matches
    if (filterByRank) {
      filteredMatches = matches.filter(m => m.rank <= filterByRank)
    }

    return filteredMatches.map(match => ({
      id: match.id,
      name: match.company_name,
      x: match[selectedDimension] as number, // Score
      y: match.confidence * 100, // Confidence as percentage
      rank: match.rank,
      country: match.company_data?.country || 'Unknown',
      industry: match.company_data?.industry || 'Unknown',
      revenue: match.company_data?.revenue || 'N/A',
      overall_score: match.overall_score,
      originalMatch: match
    }))
  }, [matches, selectedDimension, filterByRank])

  // Scale functions
  const getScaleX = (value: number) => (value / 100) * chartWidth
  const getScaleY = (value: number) => chartHeight - (value / 100) * chartHeight

  // Color mapping
  const getPointColor = (point: typeof scatterData[0]) => {
    const score = point.x
    const confidence = point.y
    
    if (score >= 85 && confidence >= 80) return '#10b981' // green-500 - High Score, High Confidence
    if (score >= 70 && confidence >= 60) return '#3b82f6' // blue-500 - Good Score, Medium+ Confidence
    if (score >= 55) return '#f59e0b' // yellow-500 - Fair Score
    return '#ef4444' // red-500 - Poor Score
  }

  const getPointSize = (point: typeof scatterData[0]) => {
    // Size based on rank (lower rank = larger circle)
    const maxRank = Math.max(...scatterData.map(d => d.rank))
    const normalizedRank = 1 - ((point.rank - 1) / (maxRank - 1))
    return 4 + normalizedRank * 8 // 4-12px radius
  }

  // Quadrant labels
  const quadrants = [
    { label: 'High Score\nHigh Confidence', x: chartWidth * 0.75, y: chartHeight * 0.25, color: '#10b981' },
    { label: 'High Score\nLow Confidence', x: chartWidth * 0.75, y: chartHeight * 0.75, color: '#f59e0b' },
    { label: 'Low Score\nHigh Confidence', x: chartWidth * 0.25, y: chartHeight * 0.25, color: '#3b82f6' },
    { label: 'Low Score\nLow Confidence', x: chartWidth * 0.25, y: chartHeight * 0.75, color: '#ef4444' }
  ]

  const handlePointClick = (pointId: string) => {
    const newSelected = new Set(selectedPoints)
    if (newSelected.has(pointId)) {
      newSelected.delete(pointId)
    } else {
      newSelected.add(pointId)
    }
    setSelectedPoints(newSelected)
  }

  const exportData = () => {
    const dataToExport = selectedPoints.size > 0 
      ? scatterData.filter(d => selectedPoints.has(d.id))
      : scatterData

    const headers = ['Company', 'Rank', 'Score', 'Confidence %', 'Country', 'Industry']
    const rows = dataToExport.map(point => [
      point.name,
      point.rank.toString(),
      point.x.toFixed(1),
      point.y.toFixed(1),
      point.country,
      point.industry
    ])
    
    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `score-confidence-analysis-${targetCompany}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const dimensionLabels: { [key: string]: string } = {
    'overall_score': 'Overall Score',
    'financial_score': 'Financial Score',
    'strategic_score': 'Strategic Score',
    'operational_score': 'Operational Score',
    'market_score': 'Market Score',
    'risk_score': 'Risk Score'
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Score vs Confidence Analysis
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Explore the relationship between similarity scores and analysis confidence
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowQuadrants(!showQuadrants)}
            >
              {showQuadrants ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              Quadrants
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={exportData}
            >
              <Download className="h-3 w-3 mr-1" />
              Export
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Controls */}
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <div>
            <label className="text-sm font-medium">Score Dimension:</label>
            <select
              value={selectedDimension}
              onChange={(e) => setSelectedDimension(e.target.value as keyof SimilarityMatch)}
              className="ml-2 text-sm border rounded px-2 py-1"
            >
              <option value="overall_score">Overall Score</option>
              <option value="financial_score">Financial Score</option>
              <option value="strategic_score">Strategic Score</option>
              <option value="operational_score">Operational Score</option>
              <option value="market_score">Market Score</option>
              <option value="risk_score">Risk Score</option>
            </select>
          </div>
          
          <div>
            <label className="text-sm font-medium">Filter by Rank:</label>
            <select
              value={filterByRank || ''}
              onChange={(e) => setFilterByRank(e.target.value ? parseInt(e.target.value) : null)}
              className="ml-2 text-sm border rounded px-2 py-1"
            >
              <option value="">All Companies</option>
              <option value="10">Top 10</option>
              <option value="20">Top 20</option>
              <option value="50">Top 50</option>
            </select>
          </div>

          {selectedPoints.size > 0 && (
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                {selectedPoints.size} selected
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedPoints(new Set())}
              >
                Clear
              </Button>
            </div>
          )}
        </div>

        {/* Chart */}
        <div className="relative">
          <svg
            ref={svgRef}
            width={width}
            height={height}
            className="border rounded-lg bg-white overflow-visible"
          >
            {/* Background quadrants */}
            {showQuadrants && (
              <g>
                <rect
                  x={margin.left + chartWidth/2}
                  y={margin.top}
                  width={chartWidth/2}
                  height={chartHeight/2}
                  fill="#10b981"
                  fillOpacity={0.05}
                />
                <rect
                  x={margin.left + chartWidth/2}
                  y={margin.top + chartHeight/2}
                  width={chartWidth/2}
                  height={chartHeight/2}
                  fill="#f59e0b"
                  fillOpacity={0.05}
                />
                <rect
                  x={margin.left}
                  y={margin.top}
                  width={chartWidth/2}
                  height={chartHeight/2}
                  fill="#3b82f6"
                  fillOpacity={0.05}
                />
                <rect
                  x={margin.left}
                  y={margin.top + chartHeight/2}
                  width={chartWidth/2}
                  height={chartHeight/2}
                  fill="#ef4444"
                  fillOpacity={0.05}
                />
              </g>
            )}

            {/* Grid lines */}
            <g className="text-gray-400" fontSize="10">
              {[0, 25, 50, 75, 100].map(value => (
                <g key={`x-${value}`}>
                  <line
                    x1={margin.left + getScaleX(value)}
                    y1={margin.top}
                    x2={margin.left + getScaleX(value)}
                    y2={margin.top + chartHeight}
                    stroke="#e5e7eb"
                    strokeDasharray="2,2"
                  />
                  <text
                    x={margin.left + getScaleX(value)}
                    y={margin.top + chartHeight + 15}
                    textAnchor="middle"
                  >
                    {value}
                  </text>
                </g>
              ))}
              {[0, 25, 50, 75, 100].map(value => (
                <g key={`y-${value}`}>
                  <line
                    x1={margin.left}
                    y1={margin.top + getScaleY(value)}
                    x2={margin.left + chartWidth}
                    y2={margin.top + getScaleY(value)}
                    stroke="#e5e7eb"
                    strokeDasharray="2,2"
                  />
                  <text
                    x={margin.left - 10}
                    y={margin.top + getScaleY(value) + 3}
                    textAnchor="end"
                  >
                    {value}%
                  </text>
                </g>
              ))}
            </g>

            {/* Quadrant labels */}
            {showQuadrants && (
              <g className="text-gray-600" fontSize="11" fontWeight="600">
                {quadrants.map((quad, index) => (
                  <text
                    key={index}
                    x={margin.left + quad.x}
                    y={margin.top + quad.y}
                    textAnchor="middle"
                    fill={quad.color}
                    fillOpacity={0.7}
                  >
                    {quad.label.split('\n').map((line, lineIndex) => (
                      <tspan key={lineIndex} x={margin.left + quad.x} dy={lineIndex * 12}>
                        {line}
                      </tspan>
                    ))}
                  </text>
                ))}
              </g>
            )}

            {/* Data points */}
            <g>
              {scatterData.map(point => {
                const isHovered = hoveredPoint === point.id
                const isSelected = selectedPoints.has(point.id)
                const size = getPointSize(point)
                
                return (
                  <circle
                    key={point.id}
                    cx={margin.left + getScaleX(point.x)}
                    cy={margin.top + getScaleY(point.y)}
                    r={isHovered || isSelected ? size * 1.5 : size}
                    fill={getPointColor(point)}
                    fillOpacity={isSelected ? 1 : 0.7}
                    stroke={isSelected ? '#1f2937' : 'white'}
                    strokeWidth={isSelected ? 2 : 1}
                    className="cursor-pointer transition-all duration-200"
                    onMouseEnter={() => setHoveredPoint(point.id)}
                    onMouseLeave={() => setHoveredPoint(null)}
                    onClick={() => handlePointClick(point.id)}
                  />
                )
              })}
            </g>

            {/* Axis labels */}
            <g className="text-gray-700" fontSize="12" fontWeight="500">
              <text
                x={margin.left + chartWidth/2}
                y={margin.top + chartHeight + 45}
                textAnchor="middle"
              >
                {dimensionLabels[selectedDimension]}
              </text>
              <text
                x={20}
                y={margin.top + chartHeight/2}
                textAnchor="middle"
                transform={`rotate(-90, 20, ${margin.top + chartHeight/2})`}
              >
                Analysis Confidence (%)
              </text>
            </g>
          </svg>

          {/* Tooltip */}
          {hoveredPoint && (
            <div className="absolute pointer-events-none z-10">
              {(() => {
                const point = scatterData.find(d => d.id === hoveredPoint)
                if (!point) return null
                
                const svgRect = svgRef.current?.getBoundingClientRect()
                if (!svgRect) return null
                
                const tooltipX = getScaleX(point.x) + margin.left + 10
                const tooltipY = getScaleY(point.y) + margin.top - 10
                
                return (
                  <div
                    className="bg-gray-900 text-white text-xs rounded-lg p-3 shadow-lg max-w-xs"
                    style={{
                      left: `${tooltipX}px`,
                      top: `${tooltipY}px`
                    }}
                  >
                    <div className="font-semibold mb-1">{point.name}</div>
                    <div className="space-y-1 text-gray-300">
                      <div>Rank: #{point.rank}</div>
                      <div>Score: {point.x.toFixed(1)}</div>
                      <div>Confidence: {point.y.toFixed(1)}%</div>
                      <div>Country: {point.country}</div>
                      <div>Industry: {point.industry}</div>
                      {point.revenue !== 'N/A' && <div>Revenue: {point.revenue}</div>}
                    </div>
                  </div>
                )
              })()}
            </div>
          )}
        </div>

        {/* Statistics */}
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="text-center p-3 bg-muted rounded-md">
            <div className="font-semibold">{scatterData.length}</div>
            <div className="text-muted-foreground">Companies</div>
          </div>
          <div className="text-center p-3 bg-muted rounded-md">
            <div className="font-semibold">
              {scatterData.filter(d => d.x >= 70 && d.y >= 70).length}
            </div>
            <div className="text-muted-foreground">High Quality</div>
          </div>
          <div className="text-center p-3 bg-muted rounded-md">
            <div className="font-semibold">
              {scatterData.length > 0 ? 
                (scatterData.reduce((sum, d) => sum + d.x, 0) / scatterData.length).toFixed(1) : 
                '0.0'
              }
            </div>
            <div className="text-muted-foreground">Avg Score</div>
          </div>
          <div className="text-center p-3 bg-muted rounded-md">
            <div className="font-semibold">
              {scatterData.length > 0 ? 
                (scatterData.reduce((sum, d) => sum + d.y, 0) / scatterData.length).toFixed(1) : 
                '0.0'
              }%
            </div>
            <div className="text-muted-foreground">Avg Confidence</div>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span>High Score & Confidence</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span>Good Quality</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <span>Fair Score</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span>Poor Score</span>
          </div>
          <div className="text-muted-foreground">• Circle size = Company ranking</div>
        </div>
      </CardContent>
    </Card>
  )
}