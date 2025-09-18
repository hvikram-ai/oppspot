'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { CompanyStatusBadge } from './company-status-badge'
import {
  Building2,
  MapPin,
  Calendar,
  Hash,
  RefreshCw,
  ExternalLink,
  CheckCircle,
  Clock,
  AlertCircle,
  ArrowRight,
  TrendingUp,
  Zap
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'
import { toast } from 'sonner'

interface Company {
  id: string
  name: string
  company_number?: string
  company_status?: string
  company_type?: string
  incorporation_date?: string
  sic_codes?: string[]
  registered_office_address?: {
    address_line_1?: string
    address_line_2?: string
    locality?: string
    postal_code?: string
    country?: string
  }
  address?: {
    city?: string
    postal_code?: string
  }
  companies_house_last_updated?: string | null
  cache_expires_at?: string | null
  source?: string
  cache_age?: number
}

interface CompanyCardProps {
  company: Company
  onRefresh?: (companyId: string) => void
  onClick?: (company: Company) => void
  showCacheStatus?: boolean
  showScore?: boolean
}

export function CompanyCard({
  company,
  onRefresh,
  onClick,
  showCacheStatus = true,
  showScore = false
}: CompanyCardProps) {
  const [leadScore, setLeadScore] = useState<number | null>(null)
  const [scoreLoading, setScoreLoading] = useState(false)

  useEffect(() => {
    if (showScore && company.company_number) {
      fetchLeadScore()
    }
  }, [showScore, company.company_number])

  const fetchLeadScore = async () => {
    if (!company.company_number) return

    setScoreLoading(true)
    try {
      const response = await fetch(`/api/scoring/calculate?company_number=${company.company_number}`)
      if (response.ok) {
        const data = await response.json()
        if (data.score) {
          setLeadScore(data.score.overall_score)
        }
      }
    } catch (error) {
      console.error('Failed to fetch lead score:', error)
    } finally {
      setScoreLoading(false)
    }
  }

  const calculateScore = async () => {
    if (!company.company_number) return

    setScoreLoading(true)
    try {
      const response = await fetch('/api/scoring/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_number: company.company_number,
          company_name: company.name
        })
      })

      if (response.ok) {
        const data = await response.json()
        setLeadScore(data.score.overall_score)
        toast.success(`Lead score calculated: ${data.score.overall_score}/100`)
      } else {
        toast.error('Failed to calculate lead score')
      }
    } catch (error) {
      console.error('Error calculating score:', error)
      toast.error('Error calculating lead score')
    } finally {
      setScoreLoading(false)
    }
  }

  const getScoreColor = (score: number): string => {
    if (score >= 80) return 'bg-green-100 text-green-800'
    if (score >= 60) return 'bg-blue-100 text-blue-800'
    if (score >= 40) return 'bg-yellow-100 text-yellow-800'
    return 'bg-red-100 text-red-800'
  }
  
  const getCacheStatus = () => {
    if (!showCacheStatus || !company.companies_house_last_updated) return null
    
    const lastUpdated = new Date(company.companies_house_last_updated)
    const cacheExpiry = company.cache_expires_at ? new Date(company.cache_expires_at) : null
    const now = new Date()
    
    const isExpired = cacheExpiry && cacheExpiry < now
    const age = formatDistanceToNow(lastUpdated, { addSuffix: true })
    
    if (isExpired) {
      return (
        <div className="flex items-center text-xs text-orange-600">
          <AlertCircle className="w-3 h-3 mr-1" />
          Cache expired {age}
        </div>
      )
    }
    
    if (company.source === 'cache') {
      return (
        <div className="flex items-center text-xs text-green-600">
          <CheckCircle className="w-3 h-3 mr-1" />
          Cached {age}
        </div>
      )
    }
    
    return (
      <div className="flex items-center text-xs text-blue-600">
        <Clock className="w-3 h-3 mr-1" />
        Updated {age}
      </div>
    )
  }

  const handleCardClick = () => {
    if (onClick) {
      onClick(company)
    }
  }

  const handleRefreshClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onRefresh) {
      onRefresh(company.id)
    }
  }

  return (
    <Card 
      className="hover:shadow-lg transition-all cursor-pointer group"
      onClick={handleCardClick}
    >
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg flex items-center gap-2">
              <Building2 className="w-5 h-5 flex-shrink-0 text-muted-foreground" />
              <span className="truncate">{company.name}</span>
            </CardTitle>
            {company.company_number && (
              <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
                <Hash className="w-3 h-3" />
                {company.company_number}
              </div>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            {company.company_status && (
              <CompanyStatusBadge status={company.company_status} />
            )}
            {showScore && leadScore !== null && (
              <Badge className={getScoreColor(leadScore)}>
                <TrendingUp className="w-3 h-3 mr-1" />
                Score: {leadScore}
              </Badge>
            )}
            {showScore && scoreLoading && (
              <Badge variant="outline" className="animate-pulse">
                <Zap className="w-3 h-3 mr-1" />
                Scoring...
              </Badge>
            )}
            {showScore && !scoreLoading && leadScore === null && company.company_number && (
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation()
                  calculateScore()
                }}
                className="h-7 text-xs"
              >
                <Zap className="w-3 h-3 mr-1" />
                Calculate Score
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* Company Type and Incorporation */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          {company.company_type && (
            <div>
              <span className="text-muted-foreground">Type:</span>
              <span className="ml-1 font-medium">{company.company_type.toUpperCase()}</span>
            </div>
          )}
          {company.incorporation_date && (
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3 text-muted-foreground" />
              <span className="text-muted-foreground">Inc:</span>
              <span className="ml-1 font-medium">
                {new Date(company.incorporation_date).getFullYear()}
              </span>
            </div>
          )}
        </div>

        {/* Location */}
        {(company.registered_office_address || company.address) && (
          <div className="flex items-start gap-1 text-sm">
            <MapPin className="w-3 h-3 text-muted-foreground mt-0.5" />
            <span className="text-muted-foreground line-clamp-2">
              {company.registered_office_address?.locality || 
               company.registered_office_address?.postal_code ||
               company.address?.city ||
               company.address?.postal_code ||
               'Location not specified'}
            </span>
          </div>
        )}

        {/* SIC Codes */}
        {company.sic_codes && company.sic_codes.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {company.sic_codes.slice(0, 3).map((code: string) => (
              <span 
                key={code}
                className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-secondary text-secondary-foreground"
              >
                {code}
              </span>
            ))}
            {company.sic_codes.length > 3 && (
              <span className="text-xs text-muted-foreground">
                +{company.sic_codes.length - 3} more
              </span>
            )}
          </div>
        )}

        {/* Footer with cache status and actions */}
        <div className="flex justify-between items-center pt-2 border-t">
          {getCacheStatus()}
          
          <div className="flex gap-1">
            <Link href={`/business/${company.id}`} onClick={(e) => e.stopPropagation()}>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 flex items-center gap-1"
                title="View Details"
              >
                <span className="text-xs">Details</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
            {onRefresh && !company.id?.startsWith('mock-') && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0"
                onClick={handleRefreshClick}
                title="Refresh from Companies House"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </Button>
            )}
            {company.company_number && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation()
                  window.open(
                    `https://find-and-update.company-information.service.gov.uk/company/${company.company_number}`,
                    '_blank'
                  )
                }}
                title="View on Companies House"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}