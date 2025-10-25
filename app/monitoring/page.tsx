import { Suspense } from 'react'
import { LiveMonitoringDashboard } from '@/components/realtime/live-monitoring-dashboard'
import { Skeleton } from '@/components/ui/skeleton'

export const metadata = {
  title: 'Live Monitoring | oppSpot',
  description: 'Real-time monitoring dashboard for streams, scans, and system activity'
}

function MonitoringLoading() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-6 w-96" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
      <Skeleton className="h-[600px]" />
    </div>
  )
}

export default function MonitoringPage() {
  return (
    <div className="container mx-auto py-6">
      <Suspense fallback={<MonitoringLoading />}>
        <LiveMonitoringDashboard />
      </Suspense>
    </div>
  )
}
