'use client'

import { useState, useMemo, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Radar, 
  Layers,
  Download,
  Plus,
  Minus,
  RefreshCcw,
  Eye
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

interface MultiDimensionalRadarProps {
  matches: SimilarityMatch[]
  targetCompany: string
  maxCompanies?: number
}

export function MultiDimensionalRadar({ 
  matches, 
  targetCompany, 
  maxCompanies = 5 
}: MultiDimensionalRadarProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [selectedCompanies, setSelectedCompanies] = useState<Set<string>>(
    new Set(matches.slice(0, 3).map(m => m.id))
  )
  const [showAverage, setShowAverage] = useState(true)
  const [animationSpeed, setAnimationSpeed] = useState(1)

  // Chart configuration
  const size = 400
  const center = size / 2
  const maxRadius = center - 60
  const dimensions = useMemo(() => [
    { key: 'financial_score', label: 'Financial', angle: 0 },
    { key: 'strategic_score', label: 'Strategic', angle: Math.PI * 2 / 5 },
    { key: 'operational_score', label: 'Operational', angle: Math.PI * 4 / 5 },
    { key: 'market_score', label: 'Market', angle: Math.PI * 6 / 5 },
    { key: 'risk_score', label: 'Risk', angle: Math.PI * 8 / 5 }
  ], [])

  // Color palette for companies
  const companyColors = useMemo(() => [
    '#3b82f6', // blue-500
    '#10b981', // green-500
    '#f59e0b', // yellow-500
    '#ef4444', // red-500
    '#8b5cf6', // violet-500
    '#06b6d4', // cyan-500
    '#f97316', // orange-500
    '#ec4899'  // pink-500
  ], [])

  // Prepare radar data
  const radarData = useMemo(() => {
    const selectedMatches = matches.filter(m => selectedCompanies.has(m.id))
    
    const companyData = selectedMatches.map((match, index) => ({
      id: match.id,
      name: match.company_name,
      color: companyColors[index % companyColors.length],
      rank: match.rank,
      country: match.company_data?.country || 'Unknown',
      points: dimensions.map(dim => ({
        dimension: dim.label,
        value: match[dim.key as keyof SimilarityMatch] as number,
        angle: dim.angle,
        x: center + (maxRadius * (match[dim.key as keyof SimilarityMatch] as number / 100)) * Math.cos(dim.angle - Math.PI/2),
        y: center + (maxRadius * (match[dim.key as keyof SimilarityMatch] as number / 100)) * Math.sin(dim.angle - Math.PI/2)
      })),
      originalMatch: match
    }))

    // Calculate average if requested
    let averageData = null
    if (showAverage && selectedMatches.length > 1) {
      averageData = {
        id: 'average',
        name: 'Average',
        color: '#6b7280', // gray-500
        rank: 0,
        country: 'Average',
        points: dimensions.map(dim => {
          const avgValue = selectedMatches.reduce((sum, match) => 
            sum + (match[dim.key as keyof SimilarityMatch] as number), 0
          ) / selectedMatches.length
          
          return {
            dimension: dim.label,
            value: avgValue,
            angle: dim.angle,
            x: center + (maxRadius * (avgValue / 100)) * Math.cos(dim.angle - Math.PI/2),
            y: center + (maxRadius * (avgValue / 100)) * Math.sin(dim.angle - Math.PI/2)
          }
        }),
        originalMatch: null
      }
    }

    return { companies: companyData, average: averageData }
  }, [matches, selectedCompanies, showAverage, maxRadius, center, companyColors, dimensions])

  // Get radar axis points
  const getAxisPoints = () => {
    return dimensions.map(dim => ({
      ...dim,
      x: center + maxRadius * Math.cos(dim.angle - Math.PI/2),
      y: center + maxRadius * Math.sin(dim.angle - Math.PI/2),
      labelX: center + (maxRadius + 30) * Math.cos(dim.angle - Math.PI/2),
      labelY: center + (maxRadius + 30) * Math.sin(dim.angle - Math.PI/2)
    }))
  }

  // Get concentric circle levels
  const getCircleLevels = () => {
    return [20, 40, 60, 80, 100].map(level => ({
      level,
      radius: (level / 100) * maxRadius,
      label: level.toString()
    }))
  }

  const handleCompanyToggle = (companyId: string) => {
    const newSelected = new Set(selectedCompanies)
    if (newSelected.has(companyId)) {
      if (newSelected.size > 1) { // Keep at least one company
        newSelected.delete(companyId)
      }
    } else {
      if (newSelected.size < maxCompanies) {
        newSelected.add(companyId)
      }
    }
    setSelectedCompanies(newSelected)
  }

  const addTopCompany = () => {
    const unselectedMatches = matches.filter(m => !selectedCompanies.has(m.id))
    if (unselectedMatches.length > 0 && selectedCompanies.size < maxCompanies) {
      const newSelected = new Set(selectedCompanies)
      newSelected.add(unselectedMatches[0].id)
      setSelectedCompanies(newSelected)
    }
  }

  const clearSelection = () => {
    if (matches.length > 0) {
      setSelectedCompanies(new Set([matches[0].id]))
    }
  }

  const exportData = () => {
    const { companies, average } = radarData
    const dataToExport = [...companies, ...(average ? [average] : [])]
    
    const headers = ['Company', 'Rank', 'Country', ...dimensions.map(d => d.label)]
    const rows = dataToExport.map(company => [
      company.name,
      company.rank.toString(),
      company.country,
      ...company.points.map(p => p.value.toFixed(1))
    ])
    
    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `radar-comparison-${targetCompany}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const axisPoints = getAxisPoints()
  const circleLevels = getCircleLevels()

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Radar className="h-5 w-5" />
              Multi-Dimensional Comparison
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Compare companies across all M&A evaluation dimensions
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAverage(!showAverage)}
              disabled={selectedCompanies.size < 2}
            >
              <Layers className="h-3 w-3 mr-1" />
              {showAverage ? 'Hide' : 'Show'} Average
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
        {/* Company Selection */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium">Selected Companies ({selectedCompanies.size}/{maxCompanies})</h4>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={addTopCompany}
                disabled={selectedCompanies.size >= maxCompanies}
              >
                <Plus className="h-3 w-3 mr-1" />
                Add Top
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={clearSelection}
              >
                <RefreshCcw className="h-3 w-3 mr-1" />
                Reset
              </Button>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2 mb-4">
            {Array.from(selectedCompanies).map((companyId, index) => {
              const company = matches.find(m => m.id === companyId)
              if (!company) return null
              
              return (
                <Badge
                  key={companyId}
                  variant="secondary"
                  className="flex items-center gap-2 py-1 px-3"
                  style={{ borderColor: companyColors[index % companyColors.length] }}
                >
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: companyColors[index % companyColors.length] }}
                  />
                  <span>{company.company_name}</span>
                  <button
                    onClick={() => handleCompanyToggle(companyId)}
                    className="ml-1 text-gray-500 hover:text-gray-700"
                    disabled={selectedCompanies.size <= 1}
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                </Badge>
              )
            })}
          </div>

          {/* Available Companies */}
          <div className="max-h-32 overflow-y-auto">
            <div className="text-xs font-medium text-muted-foreground mb-2">
              Available Companies (click to add):
            </div>
            <div className="flex flex-wrap gap-2">
              {matches
                .filter(m => !selectedCompanies.has(m.id))
                .slice(0, 10)
                .map((match) => (
                  <button
                    key={match.id}
                    onClick={() => handleCompanyToggle(match.id)}
                    disabled={selectedCompanies.size >= maxCompanies}
                    className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    #{match.rank} {match.company_name}
                  </button>
                ))}
            </div>
          </div>
        </div>

        {/* Radar Chart */}
        <div className="flex justify-center">
          <svg
            ref={svgRef}
            width={size}
            height={size}
            className="border rounded-lg bg-white"
            viewBox={`0 0 ${size} ${size}`}
          >
            {/* Background circles */}
            <g className="text-gray-400" fontSize="10">
              {circleLevels.map(level => (
                <g key={level.level}>
                  <circle
                    cx={center}
                    cy={center}
                    r={level.radius}
                    fill="none"
                    stroke="#e5e7eb"
                    strokeWidth="1"
                  />
                  <text
                    x={center + level.radius * Math.cos(-Math.PI/2) + 5}
                    y={center + level.radius * Math.sin(-Math.PI/2) + 3}
                    fill="#9ca3af"
                  >
                    {level.label}
                  </text>
                </g>
              ))}
            </g>

            {/* Radar axes */}
            <g>
              {axisPoints.map((axis, index) => (
                <g key={axis.label}>
                  <line
                    x1={center}
                    y1={center}
                    x2={axis.x}
                    y2={axis.y}
                    stroke="#d1d5db"
                    strokeWidth="1"
                  />
                  <text
                    x={axis.labelX}
                    y={axis.labelY}
                    textAnchor="middle"
                    alignmentBaseline="middle"
                    fontSize="12"
                    fontWeight="600"
                    fill="#374151"
                  >
                    {axis.label}
                  </text>
                </g>
              ))}
            </g>

            {/* Average polygon (if shown) */}
            {showAverage && radarData.average && (
              <g>
                <polygon
                  points={radarData.average.points.map(p => `${p.x},${p.y}`).join(' ')}
                  fill={radarData.average.color}
                  fillOpacity={0.1}
                  stroke={radarData.average.color}
                  strokeWidth="2"
                  strokeDasharray="4,4"
                />
                {radarData.average.points.map((point, index) => (
                  <circle
                    key={index}
                    cx={point.x}
                    cy={point.y}
                    r="3"
                    fill={radarData.average?.color}
                  />
                ))}
              </g>
            )}

            {/* Company polygons */}
            {radarData.companies.map((company, companyIndex) => (
              <g key={company.id}>
                {/* Polygon area */}
                <polygon
                  points={company.points.map(p => `${p.x},${p.y}`).join(' ')}
                  fill={company.color}
                  fillOpacity={0.15}
                  stroke={company.color}
                  strokeWidth="2"
                />
                
                {/* Data points */}
                {company.points.map((point, pointIndex) => (
                  <g key={pointIndex}>
                    <circle
                      cx={point.x}
                      cy={point.y}
                      r="4"
                      fill={company.color}
                      className="cursor-pointer"
                    />
                    
                    {/* Value labels */}
                    <text
                      x={point.x}
                      y={point.y - 10}
                      textAnchor="middle"
                      fontSize="10"
                      fontWeight="600"
                      fill={company.color}
                    >
                      {point.value.toFixed(0)}
                    </text>
                  </g>
                ))}
              </g>
            ))}
          </svg>
        </div>

        {/* Company Stats Table */}
        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Company</th>
                <th className="text-center py-2">Rank</th>
                {dimensions.map(dim => (
                  <th key={dim.key} className="text-center py-2">{dim.label}</th>
                ))}
                <th className="text-center py-2">Average</th>
              </tr>
            </thead>
            <tbody>
              {radarData.companies.map((company, index) => (
                <tr key={company.id} className="border-b hover:bg-gray-50">
                  <td className="py-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: company.color }}
                      />
                      <div>
                        <div className="font-medium">{company.name}</div>
                        <div className="text-xs text-gray-500">{company.country}</div>
                      </div>
                    </div>
                  </td>
                  <td className="text-center py-2">#{company.rank}</td>
                  {company.points.map((point, pointIndex) => (
                    <td key={pointIndex} className="text-center py-2">
                      <span className={`font-medium ${
                        point.value >= 80 ? 'text-green-600' :
                        point.value >= 60 ? 'text-blue-600' :
                        point.value >= 40 ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        {point.value.toFixed(1)}
                      </span>
                    </td>
                  ))}
                  <td className="text-center py-2">
                    <span className="font-semibold">
                      {(company.points.reduce((sum, p) => sum + p.value, 0) / company.points.length).toFixed(1)}
                    </span>
                  </td>
                </tr>
              ))}
              
              {showAverage && radarData.average && (
                <tr className="border-b bg-gray-50 font-medium">
                  <td className="py-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full border-2 border-dashed"
                        style={{ borderColor: radarData.average.color }}
                      />
                      <span>{radarData.average.name}</span>
                    </div>
                  </td>
                  <td className="text-center py-2">-</td>
                  {radarData.average?.points.map((point, pointIndex) => (
                    <td key={pointIndex} className="text-center py-2">
                      <span style={{ color: radarData.average?.color }}>
                        {point.value.toFixed(1)}
                      </span>
                    </td>
                  ))}
                  <td className="text-center py-2">
                    <span style={{ color: radarData.average?.color }}>
                      {((radarData.average?.points.reduce((sum, p) => sum + p.value, 0) ?? 0) / (radarData.average?.points.length ?? 1)).toFixed(1)}
                    </span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Insights */}
        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
          <h5 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Key Insights
          </h5>
          <div className="text-sm text-blue-800 space-y-1">
            {selectedCompanies.size > 1 && (
              <div>
                • Comparing {selectedCompanies.size} companies across {dimensions.length} M&A evaluation dimensions
              </div>
            )}
            {radarData.companies.length > 0 && (
              <div>
                • Strongest performer: {radarData.companies.reduce((best, current) => {
                  const bestAvg = best.points.reduce((sum, p) => sum + p.value, 0) / best.points.length
                  const currentAvg = current.points.reduce((sum, p) => sum + p.value, 0) / current.points.length
                  return currentAvg > bestAvg ? current : best
                }).name}
              </div>
            )}
            {dimensions.map(dim => {
              const bestInDimension = radarData.companies.reduce((best, current) => {
                const bestValue = best.points.find(p => p.dimension === dim.label)?.value || 0
                const currentValue = current.points.find(p => p.dimension === dim.label)?.value || 0
                return currentValue > bestValue ? current : best
              })
              return (
                <div key={dim.key}>
                  • Best in {dim.label}: {bestInDimension.name}
                </div>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}