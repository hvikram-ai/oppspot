// Types for Weekly Updates feature

export interface WeeklyUpdate {
  id: string
  week_number: number
  year: number
  date_start: string
  date_end: string
  slug: string
  headline: string
  summary: string
  featured_image?: string
  featured_video?: string
  estimated_time_saved?: string
  roi_metric?: string
  view_count: number
  published_at?: string
  created_at: string
  updated_at: string
}

export type UpdateItemCategory = 'feature' | 'improvement' | 'fix' | 'coming-soon'

export interface UpdateItem {
  id: string
  update_id: string
  category: UpdateItemCategory
  title: string
  description: string
  impact_before?: string
  impact_after?: string
  improvement_pct?: number
  media_type?: 'image' | 'gif' | 'video'
  media_url?: string
  media_alt?: string
  cta_label?: string
  cta_href?: string
  badge?: string
  sort_order: number
  created_at: string
  updated_at: string
}

export interface UpdateMetric {
  id: string
  update_id: string
  metric_name: string
  metric_value: string
  metric_change?: string
  trend_data?: number[]
  created_at: string
}

export interface UpdateSpotlight {
  id: string
  update_id: string
  title: string
  quote: string
  attribution: string
  company_name?: string
  stats: Record<string, string | number>
  case_study_url?: string
  created_at: string
}

export interface UpdateSubscription {
  id: string
  user_id?: string
  email: string
  subscribed_at: string
  unsubscribed_at?: string
}

// API Response Types

export interface UpdatesListResponse {
  updates: Array<{
    id: string
    week_number: number
    year: number
    date_range: string
    slug: string
    headline: string
    summary: string
    featured_image?: string
    published_at: string
    view_count: number
  }>
  pagination: {
    total: number
    page: number
    per_page: number
    total_pages: number
  }
}

export interface UpdateDetailResponse {
  update: WeeklyUpdate
  items: UpdateItem[]
  metrics: UpdateMetric[]
  spotlight?: UpdateSpotlight
}

export interface SubscribeRequest {
  email: string
  user_id?: string
}

export interface SubscribeResponse {
  success: boolean
  message: string
  subscription_id?: string
}

// UI Component Props

export interface UpdateHeroProps {
  weekNumber: number
  year: number
  dateRange: string
  headline: string
  featuredImage?: string
  featuredVideo?: string
  stats: {
    features: number
    improvements: number
    fixes: number
  }
}

export interface ExecutiveSummaryProps {
  highlights: string[]
  estimatedTimeSaved?: string
  roiMetric?: string
}

export interface FeatureCardProps {
  title: string
  description: string
  category: UpdateItemCategory
  impact?: {
    before: string
    after: string
    improvement_pct?: number
  }
  media?: {
    type: 'image' | 'gif' | 'video'
    url: string
    alt: string
  }
  cta?: {
    label: string
    href: string
  }
  badge?: string
}

export interface ImprovementItemProps {
  icon: string
  category: string
  title: string
  description: string
  metrics?: Array<{
    label: string
    value: string
    change?: string
  }>
}

export interface MetricsDashboardProps {
  uptime: string
  avgResponseTime: string
  dataFreshness: Record<string, string>
  communityStats: Record<string, number>
}

export interface UserSpotlightProps {
  title: string
  quote: string
  attribution: string
  companyName?: string
  stats: Record<string, string | number>
  caseStudyUrl?: string
}

export interface UpdatesTimelineProps {
  updates: Array<{
    week: number
    year: number
    slug: string
    highlight: string
    published_at: string
  }>
  viewAllHref?: string
}
