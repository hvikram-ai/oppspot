'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Star, 
  CheckCircle, 
  MapPin, 
  Globe, 
  ExternalLink,
  Building2,
  TrendingUp
} from 'lucide-react'

interface BusinessHeaderProps {
  business: {
    id: string
    name: string
    description?: string | null
    categories?: string[] | null
    rating?: number | null
    verified?: boolean | null
    website?: string | null
    address?: {
      city?: string
      state?: string
      country?: string
      [key: string]: unknown
    } | null
    [key: string]: unknown
  }
}

export function BusinessHeader({ business }: BusinessHeaderProps) {
  const location = [
    business.address?.city,
    business.address?.state,
    business.address?.country
  ].filter(Boolean).join(', ')

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {/* Business Name and Verification */}
            <div className="flex items-start gap-3 mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-2xl">
                {business.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold">{business.name}</h1>
                  {business.verified && (
                    <div className="flex items-center gap-1 text-green-600">
                      <CheckCircle className="h-5 w-5" />
                      <span className="text-sm font-medium">Verified</span>
                    </div>
                  )}
                </div>
                
                {/* Location */}
                {location && (
                  <div className="flex items-center gap-1 text-muted-foreground mt-1">
                    <MapPin className="h-4 w-4" />
                    <span className="text-sm">{location}</span>
                  </div>
                )}

                {/* Rating */}
                {business.rating && (
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${
                            i < Math.floor(business.rating || 0)
                              ? 'fill-yellow-500 text-yellow-500'
                              : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-sm font-medium">{business.rating}</span>
                    <span className="text-sm text-muted-foreground">(Based on reviews)</span>
                  </div>
                )}
              </div>
            </div>

            {/* Categories */}
            {business.categories && business.categories.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {business.categories.map((category) => (
                  <Badge key={category} variant="secondary">
                    {category}
                  </Badge>
                ))}
              </div>
            )}

            {/* Description */}
            {business.description && (
              <p className="text-muted-foreground mb-4">
                {business.description}
              </p>
            )}

            {/* Quick Actions */}
            <div className="flex flex-wrap gap-2">
              {business.website && (
                <Button variant="outline" size="sm" asChild>
                  <a 
                    href={business.website} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2"
                  >
                    <Globe className="h-4 w-4" />
                    Visit Website
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </Button>
              )}
              <Button variant="outline" size="sm">
                <Building2 className="h-4 w-4 mr-2" />
                Claim Business
              </Button>
              <Button variant="outline" size="sm">
                <TrendingUp className="h-4 w-4 mr-2" />
                View Analytics
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}