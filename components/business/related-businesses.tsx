'use client'

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Star, 
  MapPin, 
  CheckCircle,
  ArrowRight,
  Building2
} from 'lucide-react'

interface RelatedBusinessesProps {
  businesses: Array<{
    id: string
    name: string
    description?: string
    categories?: string[]
    rating?: number
    verified?: boolean
    address?: {
      city?: string
      state?: string
    }
  }>
  currentBusinessId: string
}

export function RelatedBusinesses({ businesses, currentBusinessId }: RelatedBusinessesProps) {
  if (!businesses || businesses.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Similar Businesses
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {businesses.map((business) => (
            <Link
              key={business.id}
              href={`/business/${business.id}`}
              className="group"
            >
              <div className="border rounded-lg p-4 hover:bg-accent transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="font-medium group-hover:underline flex items-center gap-2">
                      {business.name}
                      {business.verified && (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      )}
                    </h3>
                    {business.address && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                        <MapPin className="h-3 w-3" />
                        <span>
                          {[business.address.city, business.address.state]
                            .filter(Boolean)
                            .join(', ')}
                        </span>
                      </div>
                    )}
                  </div>
                  {business.rating && (
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                      <span className="text-sm font-medium">{business.rating}</span>
                    </div>
                  )}
                </div>

                {business.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                    {business.description}
                  </p>
                )}

                {business.categories && business.categories.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {business.categories.slice(0, 2).map((category) => (
                      <Badge key={category} variant="outline" className="text-xs">
                        {category}
                      </Badge>
                    ))}
                    {business.categories.length > 2 && (
                      <Badge variant="outline" className="text-xs">
                        +{business.categories.length - 2}
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-4 pt-4 border-t">
          <Button variant="outline" className="w-full" asChild>
            <Link href={`/search?related=${currentBusinessId}`}>
              View More Similar Businesses
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}