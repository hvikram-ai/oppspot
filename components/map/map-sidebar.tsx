'use client'

import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Business } from '@/app/map/page'
import { 
  MapPin, 
  Star, 
  Phone, 
  Globe, 
  Mail, 
  X, 
  CheckCircle,
  Building2,
  Navigation
} from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'

interface MapSidebarProps {
  businesses: Business[]
  selectedBusiness: Business | null
  onBusinessSelect: (business: Business) => void
  onClose: () => void
  loading?: boolean
}

export function MapSidebar({
  businesses,
  selectedBusiness,
  onBusinessSelect,
  onClose,
  loading
}: MapSidebarProps) {
  if (selectedBusiness) {
    return (
      <div className="w-96 border-r bg-card flex flex-col">
        <div className="p-4 border-b">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold">{selectedBusiness.name}</h2>
                {selectedBusiness.verified && (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                )}
              </div>
              {selectedBusiness.categories && selectedBusiness.categories.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {selectedBusiness.categories.map((category) => (
                    <Badge key={category} variant="secondary" className="text-xs">
                      {category}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4">
            {selectedBusiness.description && (
              <div>
                <h3 className="text-sm font-medium mb-2">About</h3>
                <p className="text-sm text-muted-foreground">
                  {selectedBusiness.description}
                </p>
              </div>
            )}

            {selectedBusiness.rating && (
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                <span className="text-sm font-medium">{selectedBusiness.rating}</span>
                <span className="text-sm text-muted-foreground">/ 5.0</span>
              </div>
            )}

            <Separator />

            <div className="space-y-3">
              {selectedBusiness.address && (
                <div className="flex gap-3">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="flex-1 text-sm">
                    {selectedBusiness.address.street && (
                      <div>{selectedBusiness.address.street}</div>
                    )}
                    <div>
                      {selectedBusiness.address.city}
                      {selectedBusiness.address.state && `, ${selectedBusiness.address.state}`}
                    </div>
                    {selectedBusiness.address.postal_code && (
                      <div>{selectedBusiness.address.postal_code}</div>
                    )}
                    {selectedBusiness.address.country && (
                      <div>{selectedBusiness.address.country}</div>
                    )}
                  </div>
                </div>
              )}

              {selectedBusiness.phone && (
                <div className="flex gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <a 
                    href={`tel:${selectedBusiness.phone}`}
                    className="text-sm hover:underline"
                  >
                    {selectedBusiness.phone}
                  </a>
                </div>
              )}

              {selectedBusiness.email && (
                <div className="flex gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <a 
                    href={`mailto:${selectedBusiness.email}`}
                    className="text-sm hover:underline"
                  >
                    {selectedBusiness.email}
                  </a>
                </div>
              )}

              {selectedBusiness.website && (
                <div className="flex gap-3">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <a 
                    href={selectedBusiness.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm hover:underline"
                  >
                    {selectedBusiness.website}
                  </a>
                </div>
              )}
            </div>

            <Separator />

            <div className="space-y-2">
              <Button className="w-full" size="sm">
                <Navigation className="h-4 w-4 mr-2" />
                Get Directions
              </Button>
              <Button variant="outline" className="w-full" size="sm">
                <Building2 className="h-4 w-4 mr-2" />
                View Full Profile
              </Button>
            </div>
          </div>
        </ScrollArea>
      </div>
    )
  }

  return (
    <div className="w-96 border-r bg-card flex flex-col">
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold">Businesses in View</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {loading ? 'Loading...' : `${businesses.length} results`}
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="divide-y">
          {businesses.map((business) => (
            <button
              key={business.id}
              onClick={() => onBusinessSelect(business)}
              className="w-full p-4 text-left hover:bg-accent transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{business.name}</h3>
                    {business.verified && (
                      <CheckCircle className="h-3 w-3 text-green-500" />
                    )}
                  </div>
                  {business.categories && business.categories.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {business.categories.slice(0, 2).map((category) => (
                        <Badge key={category} variant="outline" className="text-xs">
                          {category}
                        </Badge>
                      ))}
                      {business.categories.length > 2 && (
                        <span className="text-xs text-muted-foreground">
                          +{business.categories.length - 2}
                        </span>
                      )}
                    </div>
                  )}
                  {business.address && (
                    <p className="text-sm text-muted-foreground mt-2">
                      {business.address.city}
                      {business.address.state && `, ${business.address.state}`}
                    </p>
                  )}
                </div>
                {business.rating && (
                  <div className="flex items-center gap-1">
                    <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                    <span className="text-sm">{business.rating}</span>
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}