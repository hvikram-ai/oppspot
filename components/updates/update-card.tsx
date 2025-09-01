'use client'

import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { toast } from 'sonner'
import Link from 'next/link'
import Image from 'next/image'
import { 
  Heart, 
  MessageCircle, 
  Share2, 
  Bookmark,
  ExternalLink,
  TrendingUp,
  Award,
  Calendar,
  Users,
  DollarSign,
  Briefcase,
  Megaphone,
  Building2,
  CheckCircle
} from 'lucide-react'

interface BusinessUpdate {
  id: string
  business_id: string
  business?: {
    id: string
    name: string
    logo_url?: string
  }
  business_name?: string
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
  is_following?: boolean
}

interface UpdateCardProps {
  update: BusinessUpdate
  onInteraction?: (updateId: string, action: string) => void
  showBusinessInfo?: boolean
  compact?: boolean
}

export function UpdateCard({ 
  update, 
  onInteraction,
  showBusinessInfo = true,
  compact = false
}: UpdateCardProps) {
  const [isLiked, setIsLiked] = useState(update.has_liked || false)
  const [isSaved, setIsSaved] = useState(update.has_saved || false)
  const [likesCount, setLikesCount] = useState(update.likes_count)
  const [loading, setLoading] = useState<string | null>(null)

  const handleInteraction = async (action: string) => {
    setLoading(action)
    
    try {
      const response = await fetch('/api/updates/interact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          updateId: update.id,
          action
        })
      })

      const data = await response.json()

      if (response.ok) {
        switch (action) {
          case 'like':
            setIsLiked(data.liked)
            setLikesCount(prev => data.liked ? prev + 1 : Math.max(0, prev - 1))
            toast.success(data.message)
            break
          case 'save':
            setIsSaved(data.saved)
            toast.success(data.message)
            break
          case 'share':
            // Copy link to clipboard
            const url = `${window.location.origin}/updates/${update.id}`
            await navigator.clipboard.writeText(url)
            toast.success('Link copied to clipboard')
            break
        }
        
        if (onInteraction) {
          onInteraction(update.id, action)
        }
      } else {
        toast.error(data.error || 'Action failed')
      }
    } catch (error) {
      console.error('Interaction error:', error)
      toast.error('Failed to process action')
    } finally {
      setLoading(null)
    }
  }

  const getUpdateIcon = () => {
    switch (update.type) {
      case 'announcement':
        return <Megaphone className="h-4 w-4" />
      case 'product_launch':
        return <TrendingUp className="h-4 w-4" />
      case 'partnership':
        return <Users className="h-4 w-4" />
      case 'funding':
        return <DollarSign className="h-4 w-4" />
      case 'award':
        return <Award className="h-4 w-4" />
      case 'event':
        return <Calendar className="h-4 w-4" />
      case 'hiring':
        return <Briefcase className="h-4 w-4" />
      case 'expansion':
        return <Building2 className="h-4 w-4" />
      default:
        return <TrendingUp className="h-4 w-4" />
    }
  }

  const getUpdateTypeColor = () => {
    switch (update.type) {
      case 'funding':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
      case 'award':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
      case 'partnership':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
      case 'product_launch':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
      case 'hiring':
        return 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
    }
  }

  const businessName = update.business?.name || update.business_name || 'Unknown Business'
  const businessId = update.business?.id || update.business_id

  if (compact) {
    return (
      <div className="flex items-start space-x-3 p-3 hover:bg-accent rounded-lg transition-colors">
        <div className={`p-2 rounded-lg ${getUpdateTypeColor()}`}>
          {getUpdateIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <Link href={`/updates/${update.id}`} className="hover:underline">
            <h4 className="text-sm font-medium truncate">{update.title}</h4>
          </Link>
          {showBusinessInfo && (
            <Link href={`/business/${businessId}`} className="text-xs text-muted-foreground hover:underline">
              {businessName}
            </Link>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            {formatDistanceToNow(new Date(update.published_at), { addSuffix: true })}
          </p>
        </div>
        {update.is_featured && (
          <Badge variant="default" className="text-xs">Featured</Badge>
        )}
      </div>
    )
  }

  return (
    <Card className={update.is_featured ? 'border-primary' : ''}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1">
            {showBusinessInfo && (
              <Link href={`/business/${businessId}`}>
                <Avatar className="h-10 w-10">
                  <AvatarImage src={update.business?.logo_url} alt={businessName} />
                  <AvatarFallback>
                    {businessName.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </Link>
            )}
            <div className="flex-1">
              {showBusinessInfo && (
                <div className="flex items-center space-x-2 mb-1">
                  <Link 
                    href={`/business/${businessId}`}
                    className="font-medium hover:underline"
                  >
                    {businessName}
                  </Link>
                  {update.is_verified && (
                    <CheckCircle className="h-4 w-4 text-primary" />
                  )}
                  {update.is_following && (
                    <Badge variant="secondary" className="text-xs">Following</Badge>
                  )}
                </div>
              )}
              <p className="text-sm text-muted-foreground">
                {formatDistanceToNow(new Date(update.published_at), { addSuffix: true })}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge className={getUpdateTypeColor()}>
              <span className="flex items-center space-x-1">
                {getUpdateIcon()}
                <span>{update.type.replace('_', ' ')}</span>
              </span>
            </Badge>
            {update.is_featured && (
              <Badge variant="default">Featured</Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div>
          <h3 className="font-semibold text-lg mb-2">{update.title}</h3>
          {update.content && (
            <p className="text-muted-foreground line-clamp-3">{update.content}</p>
          )}
        </div>

        {update.image_url && (
          <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
            <Image
              src={update.image_url}
              alt={update.title}
              fill
              className="object-cover"
            />
          </div>
        )}

        {update.link_url && (
          <Link 
            href={update.link_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors"
          >
            <div className="flex-1">
              <p className="font-medium text-sm">
                {update.link_title || 'Read more'}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {new URL(update.link_url).hostname}
              </p>
            </div>
            <ExternalLink className="h-4 w-4 text-muted-foreground" />
          </Link>
        )}

        {update.tags && update.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {update.tags.map((tag, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                #{tag}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-3">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleInteraction('like')}
              disabled={loading === 'like'}
              className={isLiked ? 'text-red-500' : ''}
            >
              <Heart className={`h-4 w-4 mr-1 ${isLiked ? 'fill-current' : ''}`} />
              {likesCount > 0 && likesCount}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => toast.info('Comments coming soon!')}
            >
              <MessageCircle className="h-4 w-4 mr-1" />
              Comment
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleInteraction('share')}
              disabled={loading === 'share'}
            >
              <Share2 className="h-4 w-4 mr-1" />
              Share
            </Button>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleInteraction('save')}
            disabled={loading === 'save'}
            className={isSaved ? 'text-primary' : ''}
          >
            <Bookmark className={`h-4 w-4 ${isSaved ? 'fill-current' : ''}`} />
          </Button>
        </div>
      </CardFooter>
    </Card>
  )
}