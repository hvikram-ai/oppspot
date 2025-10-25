'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { UpdateCard } from '@/components/updates/update-card'
import { FollowButton } from '@/components/business/follow-button'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import Link from 'next/link'
import { 
  TrendingUp, 
  ArrowRight,
  Bell,
  Newspaper
} from 'lucide-react'

interface BusinessUpdate {
  id: string
  business_id: string
  business?: {
    id: string
    name: string
    logo_url?: string
  }
  title: string
  content?: string
  type: string
  category?: string
  tags?: string[]
  image_url?: string
  link_url?: string
  link_title?: string
  published_at: string
  is_featured?: boolean
  is_verified?: boolean
  views_count: number
  likes_count: number
  shares_count?: number
  has_liked?: boolean
  has_saved?: boolean
}

interface BusinessUpdatesProps {
  businessId: string
  businessName: string
}

export function BusinessUpdates({ businessId, businessName }: BusinessUpdatesProps) {
  const [updates, setUpdates] = useState<BusinessUpdate[]>([])
  const [loading, setLoading] = useState(true)
  const [isFollowing, setIsFollowing] = useState(false)

  const fetchUpdates = useCallback(async () => {
    try {
      const response = await fetch(`/api/updates?businessId=${businessId}&limit=3`)
      const data = await response.json()
      
      if (response.ok) {
        setUpdates(data.updates)
      }
    } catch (error) {
      console.error('Error fetching updates:', error)
    } finally {
      setLoading(false)
    }
  }, [businessId])

  useEffect(() => {
    fetchUpdates()
  }, [fetchUpdates])

  const handleInteraction = (updateId: string, action: string) => {
    // Update local state optimistically
    setUpdates(prev => prev.map(update => {
      if (update.id === updateId) {
        if (action === 'like') {
          return {
            ...update,
            has_liked: !update.has_liked,
            likes_count: update.has_liked ? update.likes_count - 1 : update.likes_count + 1
          }
        }
        if (action === 'save') {
          return {
            ...update,
            has_saved: !update.has_saved
          }
        }
      }
      return update
    }))
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Newspaper className="h-5 w-5" />
            Recent Updates
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-5/6" />
            </div>
          ))}
        </CardContent>
      </Card>
    )
  }

  if (updates.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Newspaper className="h-5 w-5" />
              Recent Updates
            </CardTitle>
            <FollowButton
              businessId={businessId}
              businessName={businessName}
              size="sm"
              variant="outline"
              onFollowChange={setIsFollowing}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground mb-4">
              No updates from this business yet
            </p>
            {!isFollowing && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Follow to get notified when they post updates
                </p>
                <FollowButton
                  businessId={businessId}
                  businessName={businessName}
                  onFollowChange={setIsFollowing}
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Newspaper className="h-5 w-5" />
            Recent Updates
          </CardTitle>
          <div className="flex items-center gap-2">
            <FollowButton
              businessId={businessId}
              businessName={businessName}
              size="sm"
              variant="outline"
              showDropdown={true}
              onFollowChange={setIsFollowing}
            />
            {updates.length > 3 && (
              <Link href={`/updates?businessId=${businessId}`}>
                <Button size="sm" variant="ghost">
                  View All
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {updates.map(update => (
          <UpdateCard
            key={update.id}
            update={update}
            onInteraction={handleInteraction}
            showBusinessInfo={false}
            compact={true}
          />
        ))}
        
        {updates.length >= 3 && (
          <div className="pt-2">
            <Link href={`/updates?businessId=${businessId}`}>
              <Button variant="outline" className="w-full">
                View All Updates
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  )
}