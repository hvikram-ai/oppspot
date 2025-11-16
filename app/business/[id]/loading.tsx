import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

export default function BusinessLoading() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Breadcrumbs Skeleton */}
      <Skeleton className="h-5 w-48" />

      {/* Business Header Skeleton */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1 space-y-3">
              <Skeleton className="h-8 w-3/4" /> {/* Business name */}
              <div className="flex gap-2">
                <Skeleton className="h-6 w-24" /> {/* Badge */}
                <Skeleton className="h-6 w-24" /> {/* Badge */}
              </div>
            </div>
            <Skeleton className="h-10 w-32" /> {/* Action button */}
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Business Info Card */}
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48" /> {/* Card title */}
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/6" />
            </CardContent>
          </Card>

          {/* Contact Info Card */}
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-2/3" />
            </CardContent>
          </Card>

          {/* Location Card */}
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-64 w-full" /> {/* Map placeholder */}
            </CardContent>
          </Card>

          {/* Updates Card */}
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-4/5" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Column */}
        <div className="space-y-6">
          {/* Actions Card */}
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>

          {/* BANT Score Card */}
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-40" />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-center">
                <Skeleton className="h-32 w-32 rounded-full" /> {/* Score circle */}
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </CardContent>
          </Card>

          {/* Benchmark Card */}
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex justify-between">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Social Presence Card */}
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-40" />
            </CardHeader>
            <CardContent className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-20" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Related Businesses */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="space-y-3 p-4 border rounded-lg">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
