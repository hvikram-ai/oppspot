import { notFound } from 'next/navigation'
import { UpdateHero, ExecutiveSummary, FeatureCard, ImprovementList, SubscribeForm } from '@/components/weekly-updates'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import type { UpdateItemCategory } from '@/types/updates'

async function getUpdate(slug: string) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  const response = await fetch(`${baseUrl}/api/weekly-updates/${slug}`, {
    next: { revalidate: 3600 } // Cache for 1 hour
  })

  if (!response.ok) {
    return null
  }

  return response.json()
}

export default async function WeeklyUpdatePage({
  params
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const data = await getUpdate(slug)

  if (!data) {
    notFound()
  }

  const { update, items, metrics, spotlight } = data

  // Calculate stats
  const stats = {
    features: items.filter((i: { category: UpdateItemCategory }) => i.category === 'feature').length,
    improvements: items.filter((i: { category: UpdateItemCategory }) => i.category === 'improvement').length,
    fixes: items.filter((i: { category: UpdateItemCategory }) => i.category === 'fix').length
  }

  // Format date range
  const dateRange = `${new Date(update.date_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${new Date(update.date_end).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`

  // Separate items by category
  const features = items.filter((i: { category: UpdateItemCategory }) => i.category === 'feature')
  const improvements = items.filter((i: { category: UpdateItemCategory }) => i.category === 'improvement')
  const fixes = items.filter((i: { category: UpdateItemCategory }) => i.category === 'fix')
  const comingSoon = items.filter((i: { category: UpdateItemCategory }) => i.category === 'coming-soon')

  // Create TL;DR highlights
  const highlights = [
    ...features.slice(0, 2).map((f: { title: string }) => f.title),
    ...improvements.slice(0, 2).map((i: { title: string }) => i.title)
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <UpdateHero
        weekNumber={update.week_number}
        year={update.year}
        dateRange={dateRange}
        headline={update.headline}
        featuredImage={update.featured_image}
        featuredVideo={update.featured_video}
        stats={stats}
      />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
        {/* TL;DR */}
        {highlights.length > 0 && (
          <ExecutiveSummary
            highlights={highlights}
            estimatedTimeSaved={update.estimated_time_saved}
            roiMetric={update.roi_metric}
          />
        )}

        {/* New Features */}
        {features.length > 0 && (
          <section>
            <div className="flex items-center gap-3 mb-6">
              <span className="text-3xl">✨</span>
              <h2 className="text-3xl font-bold">New Features</h2>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature: {
                id: string
                title: string
                description: string
                category: UpdateItemCategory
                impact_before?: string
                impact_after?: string
                improvement_pct?: number
                media_type?: 'image' | 'gif' | 'video'
                media_url?: string
                media_alt?: string
                cta_label?: string
                cta_href?: string
                badge?: string
              }) => (
                <FeatureCard
                  key={feature.id}
                  title={feature.title}
                  description={feature.description}
                  category={feature.category}
                  impact={
                    feature.impact_before && feature.impact_after
                      ? {
                          before: feature.impact_before,
                          after: feature.impact_after,
                          improvement_pct: feature.improvement_pct
                        }
                      : undefined
                  }
                  media={
                    feature.media_url && feature.media_type
                      ? {
                          type: feature.media_type,
                          url: feature.media_url,
                          alt: feature.media_alt || feature.title
                        }
                      : undefined
                  }
                  cta={
                    feature.cta_label && feature.cta_href
                      ? {
                          label: feature.cta_label,
                          href: feature.cta_href
                        }
                      : undefined
                  }
                  badge={feature.badge}
                />
              ))}
            </div>
          </section>
        )}

        {/* Improvements */}
        {improvements.length > 0 && (
          <section>
            <div className="flex items-center gap-3 mb-6">
              <span className="text-3xl">⚡</span>
              <h2 className="text-3xl font-bold">Improvements</h2>
            </div>
            <Card>
              <CardContent className="pt-6">
                <ImprovementList
                  items={improvements.map((item: {
                    title: string
                    description: string
                  }) => ({
                    icon: '⚡',
                    category: 'Performance',
                    title: item.title,
                    description: item.description
                  }))}
                />
              </CardContent>
            </Card>
          </section>
        )}

        {/* Bug Fixes */}
        {fixes.length > 0 && (
          <section>
            <div className="flex items-center gap-3 mb-6">
              <span className="text-3xl">🔧</span>
              <h2 className="text-3xl font-bold">Bug Fixes</h2>
            </div>
            <Card>
              <CardContent className="pt-6">
                <ul className="space-y-2">
                  {fixes.map((fix: { id: string; title: string }) => (
                    <li key={fix.id} className="flex items-start gap-2 text-muted-foreground">
                      <span className="text-green-600 mt-1">✅</span>
                      <span>{fix.title}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </section>
        )}

        {/* Coming Next */}
        {comingSoon.length > 0 && (
          <section>
            <div className="flex items-center gap-3 mb-6">
              <span className="text-3xl">🚀</span>
              <h2 className="text-3xl font-bold">Coming Next</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              {comingSoon.map((item: {
                id: string
                title: string
                description: string
                category: UpdateItemCategory
                badge?: string
              }) => (
                <FeatureCard
                  key={item.id}
                  title={item.title}
                  description={item.description}
                  category={item.category}
                  badge={item.badge}
                />
              ))}
            </div>
          </section>
        )}

        {/* Platform Metrics */}
        {metrics && metrics.length > 0 && (
          <section>
            <div className="flex items-center gap-3 mb-6">
              <span className="text-3xl">📊</span>
              <h2 className="text-3xl font-bold">Platform Health</h2>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {metrics.map((metric: {
                id: string
                metric_name: string
                metric_value: string
                metric_change?: string
              }) => (
                <Card key={metric.id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">
                      {metric.metric_name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{metric.metric_value}</p>
                    {metric.metric_change && (
                      <Badge
                        variant="secondary"
                        className={`mt-2 ${
                          metric.metric_change.startsWith('+')
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {metric.metric_change}
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* User Spotlight */}
        {spotlight && (
          <section>
            <div className="flex items-center gap-3 mb-6">
              <span className="text-3xl">⭐</span>
              <h2 className="text-3xl font-bold">User Spotlight</h2>
            </div>
            <Card className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 border-2">
              <CardContent className="pt-6">
                <h3 className="text-2xl font-bold mb-4">{spotlight.title}</h3>
                <blockquote className="text-lg italic text-gray-700 dark:text-gray-300 mb-4 pl-4 border-l-4 border-purple-500">
                  "{spotlight.quote}"
                </blockquote>
                <p className="text-sm text-muted-foreground mb-4">
                  — {spotlight.attribution}
                  {spotlight.company_name && `, ${spotlight.company_name}`}
                </p>
                {spotlight.stats && Object.keys(spotlight.stats).length > 0 && (
                  <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                    {Object.entries(spotlight.stats).map(([key, value]) => (
                      <div key={key} className="text-center">
                        <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                          {value as string}
                        </p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {key.replace(/_/g, ' ')}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </section>
        )}

        <Separator />

        {/* Subscribe CTA */}
        <section className="max-w-2xl mx-auto">
          <SubscribeForm />
        </section>
      </div>
    </div>
  )
}
