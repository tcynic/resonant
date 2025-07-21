#!/bin/bash

# Script to update Clerk production environment variables
# Run this after configuring your custom domain in Clerk dashboard

echo "🔧 Updating Clerk Production Environment Variables"
echo "================================================"

# Check if parameters are provided
if [ $# -ne 2 ]; then
    echo "Usage: $0 <PUBLISHABLE_KEY> <SECRET_KEY>"
    echo ""
    echo "Example:"
    echo "  $0 pk_live_your_key_here sk_live_your_key_here"
    echo ""
    echo "Get these keys from your Clerk Dashboard:"
    echo "  https://dashboard.clerk.com"
    exit 1
fi

PUBLISHABLE_KEY=$1
SECRET_KEY=$2

# Validate key formats
if [[ ! $PUBLISHABLE_KEY =~ ^pk_live_ ]]; then
    echo "❌ Error: Publishable key should start with 'pk_live_'"
    exit 1
fi

if [[ ! $SECRET_KEY =~ ^sk_live_ ]]; then
    echo "❌ Error: Secret key should start with 'sk_live_'"
    exit 1
fi

echo "📝 Updating NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY..."
echo "$PUBLISHABLE_KEY" | vercel env add NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY production --force

echo "📝 Updating CLERK_SECRET_KEY..."
echo "$SECRET_KEY" | vercel env add CLERK_SECRET_KEY production --force

echo ""
echo "✅ Clerk production environment variables updated!"
echo ""
echo "🚀 Next steps:"
echo "1. Deploy to production: vercel --prod"
echo "2. Test authentication at: https://becomeresonant.app/sign-in"
echo "3. Verify journal functionality at: https://becomeresonant.app/dashboard"