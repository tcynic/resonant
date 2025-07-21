# Custom Domain Setup Guide for becomeresonant.app

## Current Status ✅

- **Vercel Project**: Linked and deployed
- **Custom Domain**: becomeresonant.app configured in Vercel
- **Convex Backend**: Production deployment ready (`https://modest-warbler-488.convex.cloud`)
- **Environment Variables**: Production environment configured

## Next Steps - Manual Configuration Required

### 1. Clerk Authentication Setup

You need to configure Clerk for your custom domain in the Clerk Dashboard:

1. **Go to Clerk Dashboard**: https://dashboard.clerk.com
2. **Navigate to your application** (helped-mastodon-80)
3. **Go to Domains section**
4. **Add Production Domain**:
   - Primary domain: `becomeresonant.app`
   - Satellite domains: `www.becomeresonant.app` (if needed)

5. **Update Authentication URLs**:
   - Sign-in URL: `https://becomeresonant.app/sign-in`
   - Sign-up URL: `https://becomeresonant.app/sign-up`
   - After sign-in: `https://becomeresonant.app/dashboard`
   - After sign-up: `https://becomeresonant.app/dashboard`

6. **Get Production Keys**:
   - Copy the **Production Publishable Key** (starts with `pk_live_`)
   - Copy the **Production Secret Key** (starts with `sk_live_`)

### 2. Update Vercel Environment Variables

Once you have the production Clerk keys, run these commands:

```bash
# Update Clerk publishable key
echo "pk_live_YOUR_ACTUAL_KEY" | vercel env add NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY production --force

# Update Clerk secret key
echo "sk_live_YOUR_ACTUAL_KEY" | vercel env add CLERK_SECRET_KEY production --force

# Add app URL
echo "https://becomeresonant.app" | vercel env add NEXT_PUBLIC_APP_URL production

# Add Gemini API key (optional for now)
echo "YOUR_ACTUAL_GEMINI_KEY" | vercel env add GOOGLE_GEMINI_API_KEY production
```

### 3. DNS Configuration (If Not Already Done)

Ensure your domain DNS is pointing to Vercel:

**A Records:**

```
@ -> 76.76.19.61
www -> 76.76.19.61
```

**Or CNAME (if using subdomain):**

```
www -> cname.vercel-dns.com
```

### 4. Deploy to Production

After updating environment variables:

```bash
# Redeploy with new environment variables
vercel --prod

# Verify Convex is using production deployment
npx convex deploy
```

### 5. Verification Steps

1. **Test Authentication**:
   - Visit `https://becomeresonant.app/sign-up`
   - Create a test account
   - Verify sign-in works at `https://becomeresonant.app/sign-in`

2. **Test Database Connection**:
   - Verify journal entries can be created
   - Check that data is stored in production Convex deployment

3. **Test Real-time Features**:
   - Open multiple browser tabs
   - Verify real-time updates work correctly

## Current Environment Status

### Development (.env.local)

- **Convex**: `https://youthful-squid-565.convex.cloud` (dev)
- **Clerk**: Test keys (helped-mastodon-80)
- **Domain**: `localhost:3000`

### Production (.env.production)

- **Convex**: `https://modest-warbler-488.convex.cloud` ✅
- **Clerk**: Needs production keys ⚠️
- **Domain**: `https://becomeresonant.app` ✅

## Security Checklist

- [ ] Production Clerk keys configured (not test keys)
- [ ] HTTPS enforced on custom domain
- [ ] Environment variables properly isolated
- [ ] Test data separate from production data
- [ ] Convex production deployment secured

## Troubleshooting

### Common Issues:

1. **Authentication not working**:
   - Verify Clerk domain configuration matches exactly
   - Check that production keys are being used

2. **Database connection issues**:
   - Ensure `NEXT_PUBLIC_CONVEX_URL` points to production deployment
   - Verify Convex functions are deployed

3. **Domain not loading**:
   - Check DNS propagation (can take up to 48 hours)
   - Verify Vercel domain configuration

### Support Links:

- [Vercel Custom Domains](https://vercel.com/docs/projects/domains)
- [Clerk Production Checklist](https://clerk.com/docs/deployments/production-checklist)
- [Convex Production Deployment](https://docs.convex.dev/production/hosting)

## Next Action Required

**You need to manually configure Clerk in the dashboard with your production domain before the authentication will work correctly.**

After completing the Clerk configuration, run the Vercel environment variable updates and redeploy.
