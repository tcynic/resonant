export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <div className="text-center">
          <h2 className="text-lg font-medium text-gray-900">Loading...</h2>
          <p className="text-sm text-gray-600">
            Please wait while we load your content
          </p>
        </div>
      </div>
    </div>
  )
}
