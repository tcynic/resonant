import { UserProfile } from '@clerk/nextjs'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Profile - Resonant',
  description: 'Manage your Resonant account profile and preferences.',
}

export default function ProfilePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Profile Settings</h1>
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <UserProfile
            appearance={{
              elements: {
                rootBox: 'w-full',
                card: 'shadow-none border-0',
              },
            }}
          />
        </div>
      </div>
    </div>
  )
}
