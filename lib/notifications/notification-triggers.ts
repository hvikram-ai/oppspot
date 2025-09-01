import { createClient } from '@/lib/supabase/server'
import { NotificationService } from './notification-service'

interface TriggerContext {
  userId?: string
  businessId?: string
  competitorSetId?: string
  data?: Record<string, any>
}

export class NotificationTriggers {
  private notificationService: NotificationService
  private supabase: any

  constructor() {
    this.notificationService = new NotificationService()
    this.initSupabase()
  }

  private async initSupabase() {
    this.supabase = await createClient()
  }

  // Trigger: New competitor detected
  async triggerNewCompetitor(context: TriggerContext) {
    if (!context.competitorSetId || !context.data?.competitorName) return

    // Get users subscribed to this competitor set
    const { data: subscriptions } = await this.supabase
      .from('notification_subscriptions')
      .select('user_id')
      .eq('entity_type', 'competitor_set')
      .eq('entity_id', context.competitorSetId)
      .eq('is_active', true)

    if (!subscriptions || subscriptions.length === 0) return

    // Send notifications to all subscribed users
    for (const sub of subscriptions) {
      await this.notificationService.sendNotification({
        userId: sub.user_id,
        type: 'new_competitor',
        title: 'New Competitor Detected',
        body: `A new competitor "${context.data.competitorName}" has been detected in your market`,
        data: {
          competitor_set_id: context.competitorSetId,
          competitor_name: context.data.competitorName,
          competitor_id: context.data.competitorId
        },
        priority: 'high',
        actionUrl: `/competitive?setId=${context.competitorSetId}`
      })
    }
  }

  // Trigger: Rating change
  async triggerRatingChange(context: TriggerContext) {
    if (!context.businessId || !context.data?.oldRating || !context.data?.newRating) return

    const ratingDiff = context.data.newRating - context.data.oldRating
    const isSignificant = Math.abs(ratingDiff) >= 0.5

    if (!isSignificant) return

    // Get users subscribed to this business
    const { data: subscriptions } = await this.supabase
      .from('notification_subscriptions')
      .select('user_id, alert_conditions')
      .eq('entity_type', 'business')
      .eq('entity_id', context.businessId)
      .eq('is_active', true)

    if (!subscriptions || subscriptions.length === 0) return

    // Get business details
    const { data: business } = await this.supabase
      .from('businesses')
      .select('name')
      .eq('id', context.businessId)
      .single()

    const direction = ratingDiff > 0 ? 'increased' : 'decreased'
    const emoji = ratingDiff > 0 ? '📈' : '📉'

    for (const sub of subscriptions) {
      // Check if user wants rating change notifications
      const conditions = sub.alert_conditions || {}
      if (conditions.rating_change === false) continue

      await this.notificationService.sendNotification({
        userId: sub.user_id,
        type: 'rating_change',
        title: `Rating Change Alert ${emoji}`,
        body: `${business?.name || 'Business'} rating ${direction} from ${context.data.oldRating} to ${context.data.newRating}`,
        data: {
          business_id: context.businessId,
          business_name: business?.name,
          old_rating: context.data.oldRating,
          new_rating: context.data.newRating,
          change: ratingDiff
        },
        priority: Math.abs(ratingDiff) >= 1 ? 'high' : 'medium',
        actionUrl: `/business/${context.businessId}`
      })
    }
  }

  // Trigger: New review
  async triggerNewReview(context: TriggerContext) {
    if (!context.businessId || !context.data?.reviewRating) return

    // Get business owner
    const { data: business } = await this.supabase
      .from('businesses')
      .select('name, metadata')
      .eq('id', context.businessId)
      .single()

    if (!business?.metadata?.claimed_by) return

    const stars = '⭐'.repeat(Math.floor(context.data.reviewRating))

    await this.notificationService.sendNotification({
      userId: business.metadata.claimed_by,
      type: 'new_review',
      title: 'New Review Received',
      body: `${business.name} received a new ${context.data.reviewRating}-star review ${stars}`,
      data: {
        business_id: context.businessId,
        business_name: business.name,
        review_rating: context.data.reviewRating,
        review_text: context.data.reviewText
      },
      priority: context.data.reviewRating <= 2 ? 'high' : 'medium',
      actionUrl: `/business/${context.businessId}#reviews`
    })

    // If low rating, suggest response
    if (context.data.reviewRating <= 2) {
      await this.notificationService.sendNotification({
        userId: business.metadata.claimed_by,
        type: 'review_response_needed',
        title: 'Response Recommended',
        body: 'A low rating review needs your attention',
        data: {
          business_id: context.businessId,
          review_rating: context.data.reviewRating
        },
        priority: 'high',
        actionUrl: `/business/${context.businessId}#reviews`
      })
    }
  }

  // Trigger: Social media mention
  async triggerSocialMention(context: TriggerContext) {
    if (!context.businessId || !context.data?.platform) return

    // Get users subscribed to this business
    const { data: subscriptions } = await this.supabase
      .from('notification_subscriptions')
      .select('user_id')
      .eq('entity_type', 'business')
      .eq('entity_id', context.businessId)
      .eq('is_active', true)

    if (!subscriptions || subscriptions.length === 0) return

    // Get business details
    const { data: business } = await this.supabase
      .from('businesses')
      .select('name')
      .eq('id', context.businessId)
      .single()

    for (const sub of subscriptions) {
      await this.notificationService.sendNotification({
        userId: sub.user_id,
        type: 'social_mention',
        title: 'Social Media Mention',
        body: `${business?.name || 'Business'} was mentioned on ${context.data.platform}`,
        data: {
          business_id: context.businessId,
          business_name: business?.name,
          platform: context.data.platform,
          mention_url: context.data.mentionUrl,
          sentiment: context.data.sentiment
        },
        priority: 'low',
        actionUrl: context.data.mentionUrl
      })
    }
  }

  // Trigger: Market shift detected
  async triggerMarketShift(context: TriggerContext) {
    if (!context.data?.category || !context.data?.shiftType) return

    // Get users subscribed to this market/category
    const { data: subscriptions } = await this.supabase
      .from('notification_subscriptions')
      .select('user_id')
      .eq('entity_type', 'category')
      .eq('entity_id', context.data.category)
      .eq('is_active', true)

    if (!subscriptions || subscriptions.length === 0) return

    const shiftEmoji = {
      growth: '📈',
      decline: '📉',
      disruption: '⚡',
      saturation: '🔴'
    }[context.data.shiftType] || '📊'

    for (const sub of subscriptions) {
      await this.notificationService.sendNotification({
        userId: sub.user_id,
        type: 'market_shift',
        title: `Market Alert ${shiftEmoji}`,
        body: `${context.data.shiftType} detected in ${context.data.category} market`,
        data: {
          category: context.data.category,
          shift_type: context.data.shiftType,
          details: context.data.details
        },
        priority: 'high',
        actionUrl: `/competitive?category=${context.data.category}`
      })
    }
  }

  // Trigger: Business followed
  async triggerBusinessFollowed(context: TriggerContext) {
    if (!context.businessId || !context.data?.followerName) return

    // Get business owner
    const { data: business } = await this.supabase
      .from('businesses')
      .select('name, metadata')
      .eq('id', context.businessId)
      .single()

    if (!business?.metadata?.claimed_by) return

    await this.notificationService.sendNotification({
      userId: business.metadata.claimed_by,
      type: 'business_followed',
      title: 'New Follower',
      body: `${context.data.followerName} is now following ${business.name}`,
      data: {
        business_id: context.businessId,
        business_name: business.name,
        follower_id: context.data.followerId,
        follower_name: context.data.followerName
      },
      priority: 'low',
      actionUrl: `/business/${context.businessId}`
    })
  }

  // Trigger: Milestone reached
  async triggerMilestone(context: TriggerContext) {
    if (!context.businessId || !context.data?.milestone) return

    // Get business owner
    const { data: business } = await this.supabase
      .from('businesses')
      .select('name, metadata')
      .eq('id', context.businessId)
      .single()

    if (!business?.metadata?.claimed_by) return

    const milestoneEmoji = {
      reviews_100: '💯',
      reviews_500: '🎯',
      reviews_1000: '🏆',
      rating_45: '⭐',
      followers_100: '👥',
      followers_1000: '🚀'
    }[context.data.milestone] || '🎉'

    await this.notificationService.sendNotification({
      userId: business.metadata.claimed_by,
      type: 'milestone',
      title: `Milestone Reached ${milestoneEmoji}`,
      body: context.data.milestoneText || `${business.name} reached a new milestone!`,
      data: {
        business_id: context.businessId,
        business_name: business.name,
        milestone: context.data.milestone,
        value: context.data.value
      },
      priority: 'medium',
      actionUrl: `/business/${context.businessId}`
    })
  }

  // Trigger: Weekly digest
  async triggerWeeklyDigest(userId: string) {
    // Get user's followed businesses
    const { data: follows } = await this.supabase
      .from('business_followers')
      .select('business_id')
      .eq('user_id', userId)

    if (!follows || follows.length === 0) return

    // Get recent updates from followed businesses
    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

    const { data: updates } = await this.supabase
      .from('business_updates')
      .select('*')
      .in('business_id', follows.map(f => f.business_id))
      .gte('published_at', oneWeekAgo.toISOString())
      .order('published_at', { ascending: false })
      .limit(10)

    // Get competitive insights
    const { data: metrics } = await this.supabase
      .from('competitive_metrics')
      .select('*')
      .in('business_id', follows.map(f => f.business_id))
      .gte('metric_date', oneWeekAgo.toISOString())
      .order('metric_date', { ascending: false })

    const digestData = {
      updates_count: updates?.length || 0,
      metrics_summary: this.summarizeMetrics(metrics),
      top_updates: updates?.slice(0, 3).map(u => ({
        title: u.title,
        business_id: u.business_id
      }))
    }

    await this.notificationService.sendNotification({
      userId,
      type: 'weekly_digest',
      title: 'Your Weekly Business Intelligence Digest',
      body: `${digestData.updates_count} updates from businesses you follow, plus market insights`,
      data: digestData,
      priority: 'low',
      actionUrl: '/dashboard'
    })
  }

  // Helper: Summarize metrics
  private summarizeMetrics(metrics: any[]) {
    if (!metrics || metrics.length === 0) return null

    const avgRatingChange = metrics.reduce((sum, m) => {
      return sum + (m.rating_trend === 'improving' ? 1 : m.rating_trend === 'declining' ? -1 : 0)
    }, 0) / metrics.length

    return {
      trend: avgRatingChange > 0 ? 'improving' : avgRatingChange < 0 ? 'declining' : 'stable',
      changes: metrics.length
    }
  }

  // Check all triggers (called by cron job)
  async checkAllTriggers() {
    try {
      // Get all active subscriptions
      const { data: subscriptions } = await this.supabase
        .from('notification_subscriptions')
        .select('*')
        .eq('is_active', true)
        .or('frequency.eq.instant,frequency.eq.hourly')

      if (!subscriptions) return

      for (const sub of subscriptions) {
        await this.checkSubscriptionTriggers(sub)
      }
    } catch (error) {
      console.error('Error checking triggers:', error)
    }
  }

  // Check triggers for a specific subscription
  private async checkSubscriptionTriggers(subscription: any) {
    const now = new Date()
    const lastCheck = new Date(subscription.last_checked_at)
    
    // Skip if checked recently (within frequency period)
    if (subscription.frequency === 'hourly' && 
        (now.getTime() - lastCheck.getTime()) < 60 * 60 * 1000) {
      return
    }

    switch (subscription.entity_type) {
      case 'business':
        await this.checkBusinessTriggers(subscription)
        break
      case 'competitor_set':
        await this.checkCompetitorSetTriggers(subscription)
        break
      case 'category':
        await this.checkCategoryTriggers(subscription)
        break
    }

    // Update last checked time
    await this.supabase
      .from('notification_subscriptions')
      .update({ last_checked_at: now.toISOString() })
      .eq('id', subscription.id)
  }

  private async checkBusinessTriggers(subscription: any) {
    // Implementation for business-specific triggers
    // Check for rating changes, new reviews, etc.
  }

  private async checkCompetitorSetTriggers(subscription: any) {
    // Implementation for competitor set triggers
    // Check for new competitors, competitive changes, etc.
  }

  private async checkCategoryTriggers(subscription: any) {
    // Implementation for category/market triggers
    // Check for market shifts, new entrants, etc.
  }
}