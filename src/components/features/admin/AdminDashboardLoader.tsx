import { Suspense } from 'react'
import { Card } from '@/components/ui/card'

interface AdminDashboardLoaderProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

const DefaultFallback = () => (
  <Card className="p-6">
    <div className="animate-pulse space-y-4">
      <div className="h-4 bg-gray-200 rounded w-1/4"></div>
      <div className="space-y-2">
        <div className="h-4 bg-gray-200 rounded"></div>
        <div className="h-4 bg-gray-200 rounded w-5/6"></div>
        <div className="h-4 bg-gray-200 rounded w-4/6"></div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="h-32 bg-gray-200 rounded"></div>
        <div className="h-32 bg-gray-200 rounded"></div>
      </div>
    </div>
  </Card>
)

export default function AdminDashboardLoader({
  children,
  fallback = <DefaultFallback />,
}: AdminDashboardLoaderProps) {
  return <Suspense fallback={fallback}>{children}</Suspense>
}
