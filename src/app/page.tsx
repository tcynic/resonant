import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function Home() {
  const { userId } = await auth()

  if (userId) {
    redirect('/dashboard')
  }

  return (
    <div className="font-sans flex flex-col items-center justify-center min-h-screen p-8">
      <main className="text-center max-w-2xl">
        <h1 className="text-4xl font-bold mb-6">Resonant</h1>
        <p className="text-xl text-gray-600 mb-8">
          Your personal companion for tracking and improving relationship
          wellness
        </p>
        <p className="text-gray-500 mb-8">
          Journal your relationships, track their health, and get AI-powered
          insights to build stronger, more meaningful connections.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/sign-up"
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Get Started
          </Link>
          <Link
            href="/sign-in"
            className="border border-gray-300 px-6 py-3 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Sign In
          </Link>
        </div>
      </main>
    </div>
  )
}
