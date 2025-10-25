'use client'

/**
 * Live Notifications Component
 * Real-time toast notifications for team events
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Flame, FileText, TrendingUp, CheckCircle } from 'lucide-react'

interface TeamNotification {
  id: string
  type: 'research_complete' | 'signal_detected' | 'hot_lead' | 'deal_stage_change' | 'agent_complete'
  title: string
  description: string
  companyId?: string
  companyName?: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  action_url?: string
  metadata?: Record<string, unknown>
  timestamp: string
}

export function LiveNotifications() {
  const router = useRouter()
  const [orgId, setOrgId] = useState<string | null>(null)
  const supabase = createClient()

  // Get user's org ID
  useEffect(() => {
    const fetchOrgId = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('org_id')
        .eq('id', user.id)
        .single<{ org_id: string | null }>()

      if (profile?.org_id) {
        setOrgId(profile.org_id)
      }
    }

    fetchOrgId()
  }, [supabase])

  // Subscribe to team notifications
  useEffect(() => {
    if (!orgId) return

    const channelName = `team-notifications:${orgId}`
    const channel = supabase.channel(channelName)

    channel
      .on('broadcast', { event: 'team-notification' }, (payload) => {
        const notification = payload.payload as TeamNotification
        showNotification(notification)
      })
      .subscribe((status) => {
        console.log('[LiveNotifications] Subscription status:', status)
      })

    return () => {
      channel.unsubscribe()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, supabase])

  const showNotification = (notification: TeamNotification) => {
    const icon = getNotificationIcon(notification.type)
    const duration = notification.priority === 'urgent' ? 10000 : 5000

    toast(notification.title, {
      description: notification.description,
      icon,
      duration,
      action: notification.action_url ? {
        label: getActionLabel(notification.type),
        onClick: () => {
          if (notification.action_url) {
            router.push(notification.action_url)
          }
        }
      } : undefined,
      className: notification.priority === 'urgent' ? 'bg-orange-50 border-orange-200' : ''
    })

    // Play sound for high/urgent notifications
    if (notification.priority === 'high' || notification.priority === 'urgent') {
      playNotificationSound()
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'signal_detected':
      case 'hot_lead':
        return <Flame className="w-5 h-5 text-orange-500" />
      case 'research_complete':
        return <FileText className="w-5 h-5 text-blue-500" />
      case 'deal_stage_change':
        return <TrendingUp className="w-5 h-5 text-green-500" />
      case 'agent_complete':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      default:
        return null
    }
  }

  const getActionLabel = (type: string): string => {
    switch (type) {
      case 'research_complete':
        return 'View Report'
      case 'signal_detected':
      case 'hot_lead':
        return 'View Company'
      case 'agent_complete':
        return 'View Results'
      default:
        return 'View'
    }
  }

  const playNotificationSound = () => {
    try {
      // Only play if user has interacted with page (browser requirement)
      const audio = new Audio('/sounds/notification.mp3')
      audio.volume = 0.3
      audio.play().catch(() => {
        // Silently fail if audio blocked
      })
    } catch (error) {
      // Silently fail
    }
  }

  return null // This component doesn't render anything visible
}
