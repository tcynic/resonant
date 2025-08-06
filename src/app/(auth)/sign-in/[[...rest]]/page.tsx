import { SignIn } from '@clerk/nextjs'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sign In - Resonant',
  description:
    'Sign in to your Resonant account to access your relationship health journal.',
}

// Client-side debug component for testing
function DebugInfo() {
  if (typeof window === 'undefined') return null

  return (
    <div className="fixed bottom-4 right-4 bg-black text-white text-xs p-2 rounded max-w-xs z-50">
      <div>Env: {process.env.NODE_ENV}</div>
      <div>CI: {process.env.CI || 'false'}</div>
      <div>Public CI: {process.env.NEXT_PUBLIC_CI || 'false'}</div>
      <div>
        Clerk Key:{' '}
        {process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ? 'Present' : 'Missing'}
      </div>
      <div>DOM Ready: {document.readyState}</div>
    </div>
  )
}

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <SignIn />
      {(process.env.NODE_ENV !== 'production' ||
        process.env.CI ||
        process.env.NEXT_PUBLIC_CI) && <DebugInfo />}
    </div>
  )
}
