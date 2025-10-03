'use client'

/**
 * Milestone Toast Notifications
 * Show celebratory toasts when milestones are achieved
 */

import { useEffect } from 'react'
import { useToast } from '@/hooks/use-toast'
import { createClient } from '@/lib/supabase/client'
import { Trophy, Target, CheckCircle2, Zap, Star, TrendingUp } from 'lucide-react'

interface MilestoneToastProps {
  streamId: string
}

export function MilestoneToast({ streamId }: MilestoneToastProps) {
  const { toast } = useToast()

  useEffect(() => {
    const supabase = createClient()

    // Subscribe to milestone broadcasts
    const channel = supabase.channel(`stream-progress:${streamId}`)

    channel
      .on('broadcast', { event: 'milestone' }, (payload) => {
        const milestone = payload.payload as any

        // Show celebratory toast
        showMilestoneToast(milestone)
      })
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [streamId])

  const showMilestoneToast = (milestone: any) => {
    const { type, title, description, data } = milestone

    // Select icon and color based on milestone type
    let Icon = Trophy
    let colorClass = 'text-yellow-500'

    switch (type) {
      case 'target_reached':
        Icon = Target
        colorClass = 'text-green-500'
        break
      case 'quality_milestone':
        Icon = Star
        colorClass = 'text-blue-500'
        break
      case 'speed_milestone':
        Icon = Zap
        colorClass = 'text-purple-500'
        break
      case 'completion':
        Icon = CheckCircle2
        colorClass = 'text-emerald-500'
        break
      case 'growth_milestone':
        Icon = TrendingUp
        colorClass = 'text-orange-500'
        break
    }

    // Show toast with celebration
    toast({
      title: (
        <div className="flex items-center gap-2">
          <Icon className={`h-5 w-5 ${colorClass}`} />
          <span>{title}</span>
        </div>
      ) as any,
      description: description,
      duration: 5000,
    })

    // Play celebration sound (optional)
    playMilestoneSound()
  }

  const playMilestoneSound = () => {
    // Optional: Add celebration sound effect
    // const audio = new Audio('/sounds/celebration.mp3')
    // audio.play().catch(() => {})
  }

  return null
}
