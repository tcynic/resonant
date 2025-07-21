export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Skeleton */}
        <div className="bg-white p-6 rounded-lg shadow-sm animate-pulse">
          <div className="flex items-center justify-between">
            <div>
              <div className="h-8 bg-gray-200 rounded w-64 mb-2" />
              <div className="h-4 bg-gray-200 rounded w-96" />
            </div>
            <div className="h-4 bg-gray-200 rounded w-32" />
          </div>
        </div>

        {/* Stats Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="bg-white p-6 rounded-lg shadow-sm animate-pulse"
            >
              <div className="flex items-center">
                <div className="w-8 h-8 bg-gray-200 rounded mr-4" />
                <div className="flex-1">
                  <div className="h-6 bg-gray-200 rounded w-12 mb-1" />
                  <div className="h-3 bg-gray-200 rounded w-16 mb-1" />
                  <div className="h-3 bg-gray-200 rounded w-20" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Main Content Grid Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Health Score Cards */}
          <div className="lg:col-span-2 space-y-6">
            {/* Section Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="h-6 bg-gray-200 rounded w-48" />
              <div className="h-4 bg-gray-200 rounded w-32" />
            </div>

            {/* Cards Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-white p-6 rounded-lg shadow-sm animate-pulse"
                >
                  {/* Card Header */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gray-200 rounded-full" />
                      <div>
                        <div className="h-4 bg-gray-200 rounded w-24 mb-1" />
                        <div className="h-3 bg-gray-200 rounded w-16" />
                      </div>
                    </div>
                    <div className="h-4 bg-gray-200 rounded w-12" />
                  </div>

                  {/* Score Circle */}
                  <div className="text-center mb-6">
                    <div className="w-20 h-20 bg-gray-200 rounded-full mx-auto mb-3" />
                    <div className="h-4 bg-gray-200 rounded w-20 mx-auto mb-1" />
                    <div className="h-3 bg-gray-200 rounded w-16 mx-auto" />
                  </div>

                  {/* Component Scores */}
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, j) => (
                      <div
                        key={j}
                        className="flex items-center justify-between"
                      >
                        <div className="h-3 bg-gray-200 rounded w-20" />
                        <div className="flex items-center space-x-2">
                          <div className="w-16 h-2 bg-gray-200 rounded-full" />
                          <div className="h-3 bg-gray-200 rounded w-6" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-lg shadow-sm animate-pulse">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <div className="h-6 bg-gray-200 rounded w-32 mb-1" />
                  <div className="h-4 bg-gray-200 rounded w-24" />
                </div>
                <div className="h-4 bg-gray-200 rounded w-16" />
              </div>
            </div>

            <div className="divide-y divide-gray-100">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="p-4 flex space-x-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-full flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <div className="h-4 bg-gray-200 rounded w-32" />
                      <div className="h-3 bg-gray-200 rounded w-16" />
                    </div>
                    <div className="h-3 bg-gray-200 rounded w-full mb-2" />
                    <div className="h-3 bg-gray-200 rounded w-3/4" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Trend Chart Skeleton */}
        <div className="bg-white p-6 rounded-lg shadow-sm animate-pulse">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="h-6 bg-gray-200 rounded w-48 mb-1" />
              <div className="h-4 bg-gray-200 rounded w-32" />
            </div>
            <div className="h-8 bg-gray-200 rounded w-32" />
          </div>
          <div className="h-80 bg-gray-200 rounded" />
        </div>

        {/* Quick Actions Skeleton */}
        <div className="bg-white p-6 rounded-lg shadow-sm animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-32 mb-6" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center p-4 bg-gray-50 rounded-lg"
              >
                <div className="w-8 h-8 bg-gray-200 rounded mr-3" />
                <div>
                  <div className="h-4 bg-gray-200 rounded w-24 mb-1" />
                  <div className="h-3 bg-gray-200 rounded w-32" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
