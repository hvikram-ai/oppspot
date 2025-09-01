'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import { 
  Bell, 
  BellOff, 
  UserPlus, 
  UserMinus,
  ChevronDown,
  Loader2
} from 'lucide-react'

interface FollowButtonProps {
  businessId: string
  businessName?: string
  size?: 'sm' | 'default' | 'lg'
  variant?: 'default' | 'outline' | 'ghost'
  showDropdown?: boolean
  onFollowChange?: (following: boolean) => void
  className?: string
}

export function FollowButton({
  businessId,
  businessName = 'this business',
  size = 'default',
  variant = 'default',
  showDropdown = true,
  onFollowChange,
  className
}: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(false)
  const [notificationPreference, setNotificationPreference] = useState<'all' | 'important' | 'none'>('all')
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)

  // Check if user is following this business
  useEffect(() => {
    const checkFollowStatus = async () => {
      try {
        const response = await fetch(`/api/businesses/follow?businessId=${businessId}`)
        if (response.ok) {
          const data = await response.json()
          setIsFollowing(data.following)
          if (data.notification_preference) {
            setNotificationPreference(data.notification_preference)
          }
        }
      } catch (error) {
        console.error('Error checking follow status:', error)
      } finally {
        setChecking(false)
      }
    }

    checkFollowStatus()
  }, [businessId])

  const handleFollow = async () => {
    setLoading(true)
    
    try {
      const response = await fetch('/api/businesses/follow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          action: isFollowing ? 'unfollow' : 'follow',
          notificationPreference
        })
      })

      const data = await response.json()

      if (response.ok) {
        setIsFollowing(data.following)
        toast.success(data.message)
        if (onFollowChange) {
          onFollowChange(data.following)
        }
      } else if (response.status === 401) {
        toast.error('Please sign in to follow businesses')
      } else {
        toast.error(data.error || 'Failed to update follow status')
      }
    } catch (error) {
      console.error('Follow error:', error)
      toast.error('Failed to update follow status')
    } finally {
      setLoading(false)
    }
  }

  const updateNotifications = async (preference: 'all' | 'important' | 'none') => {
    try {
      const response = await fetch('/api/businesses/follow', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          notificationPreference: preference
        })
      })

      const data = await response.json()

      if (response.ok) {
        setNotificationPreference(preference)
        toast.success('Notification preferences updated')
      } else {
        toast.error(data.error || 'Failed to update preferences')
      }
    } catch (error) {
      console.error('Update preferences error:', error)
      toast.error('Failed to update preferences')
    }
  }

  if (checking) {
    return (
      <Button size={size} variant={variant} disabled className={className}>
        <Loader2 className="h-4 w-4 animate-spin" />
      </Button>
    )
  }

  if (!showDropdown || !isFollowing) {
    return (
      <Button
        size={size}
        variant={isFollowing ? 'outline' : variant}
        onClick={handleFollow}
        disabled={loading}
        className={className}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isFollowing ? (
          <>
            <UserMinus className="h-4 w-4 mr-2" />
            Following
          </>
        ) : (
          <>
            <UserPlus className="h-4 w-4 mr-2" />
            Follow
          </>
        )}
      </Button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size={size}
          variant="outline"
          disabled={loading}
          className={className}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Bell className="h-4 w-4 mr-2" />
              Following
              <ChevronDown className="h-4 w-4 ml-2" />
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Notification Settings</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => updateNotifications('all')}
          className="cursor-pointer"
        >
          <Bell className="h-4 w-4 mr-2" />
          <div className="flex-1">
            <div className="font-medium">All Updates</div>
            <div className="text-xs text-muted-foreground">
              Get notified about everything
            </div>
          </div>
          {notificationPreference === 'all' && (
            <div className="h-2 w-2 rounded-full bg-primary" />
          )}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => updateNotifications('important')}
          className="cursor-pointer"
        >
          <Bell className="h-4 w-4 mr-2" />
          <div className="flex-1">
            <div className="font-medium">Important Only</div>
            <div className="text-xs text-muted-foreground">
              Major announcements only
            </div>
          </div>
          {notificationPreference === 'important' && (
            <div className="h-2 w-2 rounded-full bg-primary" />
          )}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => updateNotifications('none')}
          className="cursor-pointer"
        >
          <BellOff className="h-4 w-4 mr-2" />
          <div className="flex-1">
            <div className="font-medium">No Notifications</div>
            <div className="text-xs text-muted-foreground">
              Follow without notifications
            </div>
          </div>
          {notificationPreference === 'none' && (
            <div className="h-2 w-2 rounded-full bg-primary" />
          )}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleFollow}
          className="cursor-pointer text-destructive"
        >
          <UserMinus className="h-4 w-4 mr-2" />
          Unfollow {businessName}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}