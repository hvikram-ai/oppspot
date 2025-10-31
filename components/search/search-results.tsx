'use client'

import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import {
  MapPin,
  Phone,
  Globe,
  Mail,
  Star,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Building2,
  CheckCircle,
  Search
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import PredictionScoreBadge from '@/components/ma-prediction/prediction-score-badge'

interface Business {
  id: string
  name: string
  description?: string
  address?: {
    street?: string
    city?: string
    state?: string
    country?: string
    postal_code?: string
  }
  phone?: string
  email?: string
  website?: string
  categories?: string[]
  rating?: number
  distance?: number
  relevance_score?: number
  verified?: boolean
  ma_prediction?: {
    prediction_score: number
    likelihood_category: string
  }
}

interface SearchResultsProps {
  results: Business[]
  loading: boolean
  selectedResults: Set<string>
  onSelectionChange: (selected: Set<string>) => void
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
}

export function SearchResults({
  results,
  loading,
  selectedResults,
  onSelectionChange,
  currentPage,
  totalPages,
  onPageChange
}: SearchResultsProps) {
  const handleSelectAll = () => {
    if (selectedResults.size === results.length) {
      onSelectionChange(new Set())
    } else {
      onSelectionChange(new Set(results.map(r => r.id)))
    }
  }

  const handleSelectOne = (id: string) => {
    const newSelected = new Set(selectedResults)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    onSelectionChange(newSelected)
  }

  const formatAddress = (address?: Business['address']) => {
    if (!address) return null
    const parts = [
      address.street,
      address.city,
      address.state,
      address.postal_code
    ].filter(Boolean)
    return parts.join(', ')
  }

  if (loading && results.length === 0) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-2/3" />
              <Skeleton className="h-4 w-1/3 mt-2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4 mt-2" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (!loading && results.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Search className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No results found</h3>
          <p className="text-sm text-muted-foreground text-center max-w-md">
            Try adjusting your search query or filters to find what you&apos;re looking for.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Select All Bar */}
      {results.length > 0 && (
        <div className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={selectedResults.size === results.length && results.length > 0}
              onCheckedChange={handleSelectAll}
            />
            <span className="text-sm">
              {selectedResults.size > 0
                ? `${selectedResults.size} selected`
                : 'Select all'}
            </span>
          </div>
          <span className="text-sm text-muted-foreground">
            Showing {results.length} results
          </span>
        </div>
      )}

      {/* Results List */}
      <div className="space-y-4">
        {results.map((business) => (
          <Card
            key={business.id}
            className={cn(
              'transition-all hover:shadow-md',
              selectedResults.has(business.id) && 'ring-2 ring-primary/20'
            )}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <Checkbox
                    checked={selectedResults.has(business.id)}
                    onCheckedChange={() => handleSelectOne(business.id)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-lg flex items-center gap-2">
                          {business.name}
                          {business.verified && (
                            <CheckCircle className="h-4 w-4 text-blue-500" />
                          )}
                        </h3>
                        {business.categories && business.categories.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {business.categories.slice(0, 3).map((category) => (
                              <Badge key={category} variant="secondary" className="text-xs">
                                {category}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      {business.rating && (
                        <div className="flex items-center gap-1 text-sm">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span>{business.rating.toFixed(1)}</span>
                        </div>
                      )}
                      {business.ma_prediction && (
                        <div className="ml-2">
                          <PredictionScoreBadge
                            score={business.ma_prediction.prediction_score}
                            size="sm"
                          />
                        </div>
                      )}
                    </div>

                    {business.description && (
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                        {business.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                {formatAddress(business.address) && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span className="truncate">{formatAddress(business.address)}</span>
                    {business.distance && (
                      <Badge variant="outline" className="text-xs ml-auto">
                        {business.distance.toFixed(1)} mi
                      </Badge>
                    )}
                  </div>
                )}
                
                {business.phone && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    <a href={`tel:${business.phone}`} className="hover:text-foreground">
                      {business.phone}
                    </a>
                  </div>
                )}
                
                {business.email && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    <a href={`mailto:${business.email}`} className="hover:text-foreground truncate">
                      {business.email}
                    </a>
                  </div>
                )}
                
                {business.website && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Globe className="h-4 w-4" />
                    <a
                      href={business.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-foreground truncate flex items-center gap-1"
                    >
                      {business.website.replace(/^https?:\/\//, '')}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
              </div>
              
              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center gap-2">
                  {business.relevance_score && (
                    <Badge variant="outline" className="text-xs">
                      {Math.round(business.relevance_score * 100)}% match
                    </Badge>
                  )}
                </div>
                <Button size="sm" variant="ghost" asChild>
                  <Link href={`/business/${business.id}`}>
                    View Details
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          
          <div className="flex items-center gap-1">
            {[...Array(Math.min(5, totalPages))].map((_, i) => {
              const page = i + 1
              return (
                <Button
                  key={page}
                  variant={currentPage === page ? 'default' : 'outline'}
                  size="sm"
                  className="w-8 h-8 p-0"
                  onClick={() => onPageChange(page)}
                >
                  {page}
                </Button>
              )
            })}
            {totalPages > 5 && (
              <>
                <span className="px-2">...</span>
                <Button
                  variant={currentPage === totalPages ? 'default' : 'outline'}
                  size="sm"
                  className="w-8 h-8 p-0"
                  onClick={() => onPageChange(totalPages)}
                >
                  {totalPages}
                </Button>
              </>
            )}
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}