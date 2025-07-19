import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

export default async function RelationshipsPage() {
  const { userId } = await auth()

  if (!userId) {
    redirect('/sign-in')
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Relationships</h1>
      <p className="text-gray-600">
        Manage your relationships and track their health.
      </p>
    </div>
  )
}
