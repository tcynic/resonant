import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

export default async function SettingsPage() {
  const { userId } = await auth()

  if (!userId) {
    redirect('/sign-in')
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Settings</h1>
      <p className="text-gray-600">
        Configure your account and application preferences.
      </p>
    </div>
  )
}
