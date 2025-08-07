const providers = []

// Prefer explicit env if provided
if (process.env.CLERK_FRONTEND_API_URL) {
  providers.push({
    domain: process.env.CLERK_FRONTEND_API_URL,
    applicationID: 'convex',
  })
}

// Common production Clerk issuer (custom domain)
providers.push({
  domain: 'https://clerk.becomeresonant.app',
  applicationID: 'convex',
})

// Common development Clerk issuer (accounts.dev)
providers.push({
  domain: 'https://becomeresonant.clerk.accounts.dev',
  applicationID: 'convex',
})

export default {
  providers,
}
