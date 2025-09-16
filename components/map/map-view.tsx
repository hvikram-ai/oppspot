'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { Business } from '@/app/map/page'
import { Loader2 } from 'lucide-react'

const Map = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { 
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center bg-muted/20">
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

const MarkerClusterGroup = dynamic(
  () => import('react-leaflet-cluster'),
  { ssr: false }
)

interface MapViewProps {
  businesses: Business[]
  selectedBusiness: Business | null
  onBusinessSelect: (business: Business) => void
  onBoundsChange: (bounds: {
    north: number
    south: number
    east: number
    west: number
  }) => void
  center?: [number, number]
  zoom?: number
  className?: string
}

export function MapView({
  businesses,
  selectedBusiness,
  onBusinessSelect,
  onBoundsChange,
  center = [53.5, -2.5],
  zoom = 6,
  className
}: MapViewProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [map, setMap] = useState<unknown>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [L, setL] = useState<unknown>(null)

  useEffect(() => {
    import('leaflet').then((leaflet) => {
      setL(leaflet.default)
      
      // Fix Leaflet icon issue
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (leaflet.default.Icon.Default.prototype as any)._getIconUrl
      leaflet.default.Icon.Default.mergeOptions({
        iconRetinaUrl: '/leaflet/marker-icon-2x.png',
        iconUrl: '/leaflet/marker-icon.png',
        shadowUrl: '/leaflet/marker-shadow.png',
      })
    })
  }, [])

  useEffect(() => {
    if (map) {
      map.on('moveend', () => {
        const bounds = map.getBounds()
        onBoundsChange({
          north: bounds.getNorth(),
          south: bounds.getSouth(),
          east: bounds.getEast(),
          west: bounds.getWest()
        })
      })
      
      // Set initial bounds
      const bounds = map.getBounds()
      onBoundsChange({
        north: bounds.getNorth(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        west: bounds.getWest()
      })
    }
  }, [map, onBoundsChange])

  useEffect(() => {
    if (map && selectedBusiness && selectedBusiness.latitude && selectedBusiness.longitude) {
      map.setView([selectedBusiness.latitude, selectedBusiness.longitude], 14)
    }
  }, [map, selectedBusiness])

  useEffect(() => {
    if (map && center) {
      map.setView(center, zoom)
    }
  }, [map, center, zoom])

  if (!L) {
    return (
      <div className="flex h-full items-center justify-center bg-muted/20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const createCustomIcon = (business: Business) => {
    const isSelected = selectedBusiness?.id === business.id
    const color = '#6b7280' // Default color for all businesses
    
    return L.divIcon({
      html: `
        <div class="relative">
          <svg width="32" height="40" viewBox="0 0 32 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M16 0C7.16 0 0 7.16 0 16C0 24.84 16 40 16 40C16 40 32 24.84 32 16C32 7.16 24.84 0 16 0Z" 
              fill="${isSelected ? '#3b82f6' : color}" 
              fill-opacity="${isSelected ? '1' : '0.9'}"
              stroke="${isSelected ? '#1e40af' : 'white'}" 
              stroke-width="2"/>
            <circle cx="16" cy="16" r="6" fill="white"/>
          </svg>
        </div>
      `,
      className: 'custom-map-marker',
      iconSize: [32, 40],
      iconAnchor: [16, 40],
      popupAnchor: [0, -40]
    })
  }

  return (
    <Map
      center={center}
      zoom={zoom}
      className={className}
      ref={setMap}
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      
      <MarkerClusterGroup
        chunkedLoading
        showCoverageOnHover={false}
        maxClusterRadius={50}
        spiderfyOnMaxZoom
        disableClusteringAtZoom={16}
      >
        {businesses.map((business) => {
          if (!business.latitude || !business.longitude) return null
          
          return (
            <Marker
              key={business.id}
              position={[business.latitude, business.longitude]}
              icon={createCustomIcon(business)}
              eventHandlers={{
                click: () => onBusinessSelect(business)
              }}
            >
              <Popup>
                <div className="p-2">
                  <h3 className="font-semibold">{business.name}</h3>
                  {business.description && (
                    <p className="text-sm text-gray-600 mt-1">{business.description}</p>
                  )}
                  {business.address && (
                    <p className="text-xs text-gray-500 mt-2">
                      {business.address.street && `${business.address.street}, `}
                      {business.address.city}
                    </p>
                  )}
                  {business.categories && business.categories.length > 0 && (
                    <div className="flex items-center gap-1 mt-2">
                      <span className="text-xs text-gray-500">
                        {business.categories.slice(0, 2).join(', ')}
                      </span>
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          )
        })}
      </MarkerClusterGroup>
    </Map>
  )
}