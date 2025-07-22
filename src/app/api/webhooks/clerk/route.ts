import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { WebhookEvent } from '@clerk/nextjs/server'
import { api } from '../../../../../convex/_generated/api'
import { ConvexHttpClient } from 'convex/browser'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function POST(req: Request) {
  // You can find this in the Clerk Dashboard -> Webhooks -> choose the webhook
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET

  if (!WEBHOOK_SECRET) {
    throw new Error(
      'Please add CLERK_WEBHOOK_SECRET from Clerk Dashboard to .env or .env.local'
    )
  }

  // Get the headers
  const headerPayload = headers()
  const svix_id = headerPayload.get('svix-id')
  const svix_timestamp = headerPayload.get('svix-timestamp')
  const svix_signature = headerPayload.get('svix-signature')

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error occured -- no svix headers', {
      status: 400,
    })
  }

  // Get the body
  const payload = await req.text()

  // Create a new Svix instance with your secret.
  const wh = new Webhook(WEBHOOK_SECRET)

  let evt: WebhookEvent

  // Verify the payload with the headers
  try {
    evt = wh.verify(payload, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent
  } catch (err) {
    console.error('Error verifying webhook:', err)
    return new Response('Error occured', {
      status: 400,
    })
  }

  // Handle the webhook
  const eventType = evt.type

  try {
    switch (eventType) {
      case 'user.created': {
        console.log('User created webhook received:', evt.data.id)

        // Extract user data from Clerk webhook
        const userData = {
          clerkId: evt.data.id,
          name:
            `${evt.data.first_name || ''} ${evt.data.last_name || ''}`.trim() ||
            'Unknown User',
          email:
            evt.data.email_addresses?.[0]?.email_address ||
            `${evt.data.id}@unknown.com`,
        }

        // Create user in Convex using the public mutation
        await convex.mutation(api.users.createUser, userData)

        console.log('User created successfully in Convex:', userData.clerkId)
        break
      }

      case 'user.updated': {
        console.log('User updated webhook received:', evt.data.id)

        // Extract updated user data
        const userData = {
          clerkId: evt.data.id,
          name:
            `${evt.data.first_name || ''} ${evt.data.last_name || ''}`.trim() ||
            'Unknown User',
          email:
            evt.data.email_addresses?.[0]?.email_address ||
            `${evt.data.id}@unknown.com`,
        }

        // Update user in Convex using internal mutation
        await convex.mutation(api.users.updateUserFromClerk, userData)

        console.log('User updated successfully in Convex:', userData.clerkId)
        break
      }

      case 'user.deleted': {
        console.log('User deleted webhook received:', evt.data.id)

        // Delete user from Convex using internal mutation
        await convex.mutation(api.users.deleteUserByClerkId, {
          clerkId: evt.data.id!,
        })

        console.log('User deleted successfully from Convex:', evt.data.id)
        break
      }

      default: {
        console.log('Unhandled webhook event type:', eventType)
        break
      }
    }

    return new Response('Webhook processed successfully', { status: 200 })
  } catch (error) {
    console.error('Error processing webhook:', error)
    return new Response('Error processing webhook', { status: 500 })
  }
}
