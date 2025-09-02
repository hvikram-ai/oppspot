'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  TrendingUp, 
  TrendingDown,
  BarChart3,
  ZoomIn,
  ZoomOut,
  RotateCcw
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
  }
}

interface SimilarityMatrixProps {
  matches: SimilarityMatch[]
  dimensions: string[]
  targetCompany: string
}

export function SimilarityMatrix({ matches, dimensions, targetCompany }: SimilarityMatrixProps) {
  const [selectedDimension, setSelectedDimension] = useState<string>('overall_score')
  const [zoomLevel, setZoomLevel] = useState(1)
  const [showLabels, setShowLabels] = useState(true)
  
  // Prepare matrix data
  const matrixData = useMemo(() => {
    const topMatches = matches.slice(0, 20) // Show top 20 for better visualization
    const dimensionMap: { [key: string]: keyof SimilarityMatch } = {
      'Financial': 'financial_score',
      'Strategic': 'strategic_score', 
      'Operational': 'operational_score',
      'Market': 'market_score',
      'Risk': 'risk_score',
      'Overall': 'overall_score'
    }

    return topMatches.map((match, index) => ({
      id: match.id,
      name: match.company_name,
      rank: match.rank,
      country: match.company_data?.country || 'Unknown',
      industry: match.company_data?.industry || 'Unknown',
      scores: dimensions.map(dim => ({
        dimension: dim,
        value: match[dimensionMap[dim]] as number,
        confidence: match.confidence
      }))
    }))
  }, [matches, dimensions])

  const getScoreColor = (score: number, opacity: number = 1) => {
    if (score >= 85) return `rgba(34, 197, 94, ${opacity})` // green-500
    if (score >= 70) return `rgba(59, 130, 246, ${opacity})` // blue-500
    if (score >= 55) return `rgba(245, 158, 11, ${opacity})` // yellow-500
    return `rgba(239, 68, 68, ${opacity})` // red-500
  }

  const getScoreIntensity = (score: number) => {
    return Math.max(0.2, score / 100) // Minimum 20% opacity
  }

  const getCellSize = () => {
    const baseSize = 40
    return baseSize * zoomLevel
  }

  const exportMatrix = () => {
    // Simple CSV export of matrix data
    const headers = ['Company', 'Rank', 'Country', ...dimensions]
    const rows = matrixData.map(item => [
      item.name,
      item.rank.toString(),
      item.country,
      ...item.scores.map(s => s.value.toFixed(1))
    ])
    
    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `similarity-matrix-${targetCompany}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Similarity Matrix
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Interactive heatmap showing dimensional scores across similar companies
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setZoomLevel(Math.max(0.5, zoomLevel - 0.25))}
            >
              <ZoomOut className="h-3 w-3" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setZoomLevel(Math.min(2, zoomLevel + 0.25))}
            >
              <ZoomIn className="h-3 w-3" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setZoomLevel(1)}
            >
              <RotateCcw className="h-3 w-3" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={exportMatrix}
            >
              Export
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Controls */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div>
              <label className="text-sm font-medium">Highlight Dimension:</label>
              <select
                value={selectedDimension}
                onChange={(e) => setSelectedDimension(e.target.value)}
                className="ml-2 text-sm border rounded px-2 py-1"
              >
                <option value="overall_score">Overall Score</option>
                <option value="financial_score">Financial</option>
                <option value="strategic_score">Strategic</option>
                <option value="operational_score">Operational</option>
                <option value="market_score">Market</option>
                <option value="risk_score">Risk</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="showLabels"
                checked={showLabels}
                onChange={(e) => setShowLabels(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="showLabels" className="text-sm">Show Labels</label>
            </div>
          </div>
          
          {/* Legend */}
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: getScoreColor(90) }} />
              <span>Excellent (85+)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: getScoreColor(75) }} />
              <span>Good (70-84)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: getScoreColor(60) }} />
              <span>Fair (55-69)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: getScoreColor(40) }} />
              <span>Poor (&lt;55)</span>
            </div>
          </div>
        </div>

        {/* Matrix Visualization */}
        <div className="relative overflow-auto max-h-96 border rounded-lg bg-white">
          <div className="inline-block min-w-full">
            {/* Header row */}
            <div className="flex sticky top-0 bg-gray-50 border-b z-10">
              <div className="w-48 p-2 text-xs font-medium text-gray-700 border-r bg-gray-50 sticky left-0 z-20">
                Company (Rank)
              </div>
              {dimensions.map((dim) => (
                <div
                  key={dim}
                  className="flex-shrink-0 p-2 text-center text-xs font-medium text-gray-700 border-r"
                  style={{ width: getCellSize() + 'px' }}
                >
                  {dim}
                </div>
              ))}
            </div>

            {/* Data rows */}
            {matrixData.map((company, rowIndex) => (
              <div key={company.id} className="flex hover:bg-gray-50">
                {/* Company name column */}
                <div className="w-48 p-2 text-xs border-r bg-white sticky left-0 z-10 flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate" title={company.name}>
                      {company.name}
                    </div>
                    <div className="text-gray-500 text-xs">
                      #{company.rank} • {company.country}
                    </div>
                  </div>
                </div>

                {/* Score cells */}
                {company.scores.map((score, colIndex) => {
                  const isHighlighted = selectedDimension.includes(score.dimension.toLowerCase())
                  const cellSize = getCellSize()
                  
                  return (
                    <div
                      key={`${company.id}-${score.dimension}`}
                      className="flex-shrink-0 border-r border-b relative group cursor-pointer transition-all duration-200 hover:scale-105 hover:z-30 hover:shadow-lg"
                      style={{
                        width: cellSize + 'px',
                        height: cellSize + 'px',
                        backgroundColor: getScoreColor(
                          score.value, 
                          isHighlighted ? 0.9 : getScoreIntensity(score.value)
                        ),
                        border: isHighlighted ? '2px solid #1f2937' : undefined
                      }}
                    >
                      {/* Score value */}
                      {(showLabels || cellSize > 35) && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span 
                            className={`text-xs font-semibold ${
                              score.value >= 55 ? 'text-white' : 'text-gray-900'
                            }`}
                          >
                            {score.value.toFixed(0)}
                          </span>
                        </div>
                      )}
                      
                      {/* Confidence indicator */}
                      <div 
                        className="absolute bottom-0 right-0 w-2 h-2 rounded-tl-md"
                        style={{
                          backgroundColor: score.confidence >= 0.8 ? '#10b981' : 
                                         score.confidence >= 0.6 ? '#f59e0b' : '#ef4444',
                          opacity: 0.8
                        }}
                      />

                      {/* Tooltip */}
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-50">
                        <div className="bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap">
                          <div className="font-medium">{company.name}</div>
                          <div>{score.dimension}: {score.value.toFixed(1)}</div>
                          <div>Confidence: {(score.confidence * 100).toFixed(0)}%</div>
                          <div className="absolute top-full left-1/2 transform -translate-x-1/2">
                            <div className="border-4 border-transparent border-t-gray-900"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Summary Statistics */}
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="text-center p-3 bg-muted rounded-md">
            <div className="font-semibold">{matrixData.length}</div>
            <div className="text-muted-foreground">Companies</div>
          </div>
          <div className="text-center p-3 bg-muted rounded-md">
            <div className="font-semibold">{dimensions.length}</div>
            <div className="text-muted-foreground">Dimensions</div>
          </div>
          <div className="text-center p-3 bg-muted rounded-md">
            <div className="font-semibold">
              {matrixData.length > 0 ? 
                (matrixData.reduce((sum, company) => 
                  sum + company.scores.reduce((dimSum, score) => dimSum + score.value, 0), 0
                ) / (matrixData.length * dimensions.length)).toFixed(1) : 
                '0.0'
              }
            </div>
            <div className="text-muted-foreground">Avg Score</div>
          </div>
          <div className="text-center p-3 bg-muted rounded-md">
            <div className="font-semibold">
              {matrixData.length > 0 ? 
                Math.max(...matrixData.flatMap(company => 
                  company.scores.map(score => score.value)
                )).toFixed(1) : 
                '0.0'
              }
            </div>
            <div className="text-muted-foreground">Top Score</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}