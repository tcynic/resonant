# Build Environment Variable Verification Guide

## Issue Summary

The production deployment is failing because `NEXT_PUBLIC_CONVEX_URL` is not available at build time, even though it may be set in the Vercel dashboard.

## Root Cause Analysis

Your `convex.ts` file has this logic:

```typescript
const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL

// Validate that the environment variable is properly set for runtime
if (!convexUrl && typeof window !== 'undefined') {
  throw new Error(
    'Missing NEXT_PUBLIC_CONVEX_URL environment variable. Please check your .env.local file.'
  )
}
```

This error is being thrown at **runtime** (client-side), which means:

1. The build completed successfully (the variable isn't required at build time)
2. The browser is trying to initialize the Convex client
3. The environment variable is not available in the browser

## Verification Steps

### Step 1: Test Local Environment

```bash
npm run test:build-env
```

### Step 2: Verify Vercel Dashboard Settings

1. **Go to Vercel Dashboard**
   - Navigate to your project: https://vercel.com/dashboard
   - Click on your `resonant` project

2. **Check Environment Variables**
   - Go to **Settings** → **Environment Variables**
   - Look for `NEXT_PUBLIC_CONVEX_URL`
   - Verify it's set for **Production** environment
   - Ensure the value is correct (should be like `https://modest-warbler-488.convex.cloud`)

3. **Common Issues to Check:**
   - ❌ Variable set for "Preview" but not "Production"
   - ❌ Variable name has typos (case-sensitive)
   - ❌ Variable value has extra spaces or quotes
   - ❌ Variable was added after the last deployment

### Step 3: Verify Build Logs

1. **Access Build Logs**
   - In Vercel Dashboard → Your Project → Deployments
   - Click on the latest deployment
   - Go to "Functions" or "Build Logs" tab

2. **Look for Environment Variable Output**
   - The updated build script now runs `verify-build-env.js`
   - Check if you see: "✅ All critical environment variables are properly configured!"
   - Or error: "❌ CRITICAL ERROR: NEXT_PUBLIC_CONVEX_URL is not set!"

## Fix Steps

### Option 1: Re-add Environment Variable

1. Delete the existing `NEXT_PUBLIC_CONVEX_URL` variable in Vercel
2. Add it again with the correct value: `https://modest-warbler-488.convex.cloud`
3. Ensure it's checked for **Production** environment
4. Trigger a new deployment

### Option 2: Manual Deployment Trigger

1. Go to Vercel Dashboard → Your Project → Deployments
2. Click "..." menu on latest deployment
3. Click "Redeploy"
4. Select "Use existing Build Cache" = **NO** (important!)

### Option 3: Force Deployment via CLI

```bash
# Install Vercel CLI if not already installed
npm i -g vercel

# Force a fresh deployment
vercel --prod --force
```

## Testing the Fix

### After redeployment, verify:

1. **Check build logs** for the environment verification output
2. **Test the live site** with Playwright MCP:

   ```bash
   # In Claude Code, run:
   await mcp__playwright__browser_navigate({ url: 'https://becomeresonant.app' })
   await mcp__playwright__browser_snapshot()
   ```

3. **Expected result**: Should see your app's landing page, not the error page

## Environment Variable Checklist

- [ ] `NEXT_PUBLIC_CONVEX_URL` exists in Vercel Dashboard
- [ ] Value is exactly: `https://modest-warbler-488.convex.cloud`
- [ ] Environment is set to "Production" (not just Preview/Development)
- [ ] No extra spaces or quotes around the value
- [ ] Fresh deployment triggered after adding/updating the variable

## Debug Commands

```bash
# Test local environment simulation
npm run test:build-env

# Verify all environment variables
npm run verify:build-env

# Check if the variable would be available at build time
node -e "console.log('CONVEX_URL:', process.env.NEXT_PUBLIC_CONVEX_URL)"
```

## Next Steps

1. **Immediate**: Follow Fix Steps above to set the environment variable properly
2. **Verification**: Use the debug commands and Playwright MCP to verify the fix
3. **Monitoring**: The updated build process will now catch this issue early in future deployments
