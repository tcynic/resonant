import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
        <div className="flex items-center justify-center w-12 h-12 mx-auto bg-blue-100 rounded-full">
          <svg
            className="w-6 h-6 text-blue-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.29-1.009-5.824-2.563M15 9.34c0-1.317-.732-2.524-1.901-3.097m0 0a15.942 15.942 0 00-4.58 0m4.58 0c1.73.576 2.919 2.216 2.919 4.1a6.06 6.06 0 01-1.875 4.37M9.344 3.17c1.398-.49 2.958-.49 4.356 0M15.197 3.97c1.049.647 1.875 1.693 1.875 2.93 0 1.237-.826 2.283-1.875 2.93M9.344 3.17A6.047 6.047 0 017.51 5.99m1.834-2.82C8.343 2.635 8 2.12 8 1.5S8.343.365 9.344.17"
            />
          </svg>
        </div>
        <div className="mt-4 text-center">
          <h1 className="text-2xl font-bold text-gray-900">404</h1>
          <h2 className="mt-2 text-lg font-medium text-gray-900">
            Page not found
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            The page you&apos;re looking for doesn&apos;t exist or has been
            moved.
          </p>
          <div className="mt-6 flex flex-col space-y-3">
            <Link
              href="/dashboard"
              className="w-full px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 text-center"
            >
              Go to Dashboard
            </Link>
            <Link
              href="/"
              className="w-full px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 text-center"
            >
              Go to Homepage
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
