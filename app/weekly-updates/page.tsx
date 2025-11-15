import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowRight, Sparkles, Zap, Bug } from 'lucide-react'
import { SubscribeForm } from '@/components/weekly-updates'

async function getUpdates() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  const response = await fetch(`${baseUrl}/api/weekly-updates?per_page=20`, {
    next: { revalidate: 1800 } // Cache for 30 minutes
  })

  if (!response.ok) {
    return { updates: [], pagination: { total: 0, page: 1, per_page: 20, total_pages: 0 } }
  }

  return response.json()
}

export default async function WeeklyUpdatesPage() {
  const data = await getUpdates()
  const { updates } = data

  const latestUpdate = updates[0]

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-blue-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center space-y-4">
            <h1 className="text-5xl sm:text-6xl font-bold">Deal Intel Weekly</h1>
            <p className="text-xl text-blue-100 max-w-2xl mx-auto">
              Your weekly edge in M&A intelligence. Stay ahead with the latest features,
              improvements, and insights from the oppSpot team.
            </p>
            {latestUpdate && (
              <Button asChild size="lg" className="bg-white text-blue-600 hover:bg-blue-50 mt-6">
                <Link href={`/weekly-updates/${latestUpdate.slug}`}>
                  Read Latest Update →
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
        {/* Subscribe Form */}
        <div className="max-w-2xl mx-auto">
          <SubscribeForm />
        </div>

        {/* Updates Archive */}
        <section>
          <h2 className="text-3xl font-bold mb-6">All Updates</h2>
          <div className="space-y-6">
            {updates.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center text-muted-foreground">
                  <p>No updates published yet. Check back soon!</p>
                </CardContent>
              </Card>
            ) : (
              updates.map((update: {
                id: string
                week_number: number
                year: number
                slug: string
                headline: string
                summary: string
                date_range: string
                published_at: string
                view_count: number
                featured_image?: string
              }) => (
                <Card
                  key={update.id}
                  className="hover:shadow-lg transition-shadow duration-300"
                >
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Badge variant="outline">
                            Week {update.week_number}, {update.year}
                          </Badge>
                          <span>•</span>
                          <span>{update.date_range}</span>
                        </div>
                        <CardTitle className="text-2xl hover:text-blue-600 transition-colors">
                          <Link href={`/weekly-updates/${update.slug}`}>
                            {update.headline}
                          </Link>
                        </CardTitle>
                        <CardDescription className="text-base">
                          {update.summary}
                        </CardDescription>
                      </div>
                      {update.featured_image && (
                        <div className="hidden md:block w-32 h-32 relative rounded-lg overflow-hidden flex-shrink-0">
                          <img
                            src={update.featured_image}
                            alt={update.headline}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>👁️ {update.view_count} views</span>
                        <span>
                          {new Date(update.published_at).toLocaleDateString('en-US', {
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </span>
                      </div>
                      <Button asChild variant="ghost" size="sm" className="group">
                        <Link href={`/weekly-updates/${update.slug}`}>
                          Read Update
                          <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </section>

        {/* Legend */}
        <section className="border-t pt-12">
          <h3 className="text-xl font-semibold mb-4">Update Categories</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
              <Sparkles className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-semibold text-green-900 dark:text-green-100">New Features</p>
                <p className="text-sm text-green-700 dark:text-green-400">Brand new capabilities</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-800">
              <Zap className="h-5 w-5 text-orange-600" />
              <div>
                <p className="font-semibold text-orange-900 dark:text-orange-100">Improvements</p>
                <p className="text-sm text-orange-700 dark:text-orange-400">Performance & UX enhancements</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <Bug className="h-5 w-5 text-blue-600" />
              <div>
                <p className="font-semibold text-blue-900 dark:text-blue-100">Bug Fixes</p>
                <p className="text-sm text-blue-700 dark:text-blue-400">Issues resolved</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
