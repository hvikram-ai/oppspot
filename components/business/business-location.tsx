'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MapPin, Loader2 } from 'lucide-react'

const Map = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { 
    ssr: false,
    loading: () => (
      <div className="flex h-[400px] items-center justify-center bg-muted/20 rounded-lg">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }
)

const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
)

const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false }
)

const Popup = dynamic(
  () => import('react-leaflet').then((mod) => mod.Popup),
  { ssr: false }
)

interface BusinessLocationProps {
  business: {
    id: string
    name: string
    latitude?: number | null
    longitude?: number | null
    address?: {
      street?: string
      city?: string
      state?: string
      country?: string
      postal_code?: string
      [key: string]: unknown
    } | null
    [key: string]: unknown
  }
}

export function BusinessLocation({ business }: BusinessLocationProps) {
   
  const [L, setL] = useState<unknown>(null)

  useEffect(() => {
    import('leaflet').then((leaflet) => {
      setL(leaflet.default)
      
      // Fix Leaflet icon issue

      delete (leaflet.default.Icon.Default.prototype as any)._getIconUrl
      leaflet.default.Icon.Default.mergeOptions({
        iconRetinaUrl: '/leaflet/marker-icon-2x.png',
        iconUrl: '/leaflet/marker-icon.png',
        shadowUrl: '/leaflet/marker-shadow.png',
      })
    })
  }, [])

  if (!business.latitude || !business.longitude) {
    return null
  }

  const position: [number, number] = [business.latitude, business.longitude]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Location
        </CardTitle>
      </CardHeader>
      <CardContent>
        {L ? (
          <Map
            center={position}
            zoom={15}
            className="h-[400px] w-full rounded-lg"
            style={{ height: '400px', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Marker position={position}>
              <Popup>
                <div className="p-2">
                  <h3 className="font-semibold">{business.name}</h3>
                  {business.address && (
                    <div className="text-sm text-gray-600 mt-1">
                      {business.address.street && <p>{business.address.street}</p>}
                      <p>
                        {[
                          business.address.city,
                          business.address.state,
                          business.address.postal_code
                        ].filter(Boolean).join(', ')}
                      </p>
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          </Map>
        ) : (
          <div className="flex h-[400px] items-center justify-center bg-muted/20 rounded-lg">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}
      </CardContent>
    </Card>
  )
}