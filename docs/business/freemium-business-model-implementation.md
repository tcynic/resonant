# Freemium Business Model Implementation Guide

This document outlines the comprehensive freemium business model implementation for Resonant, including tier management, feature restrictions, upgrade flows, and monetization strategies.

## Table of Contents

1. [Business Model Overview](#business-model-overview)
2. [Tier Structure and Features](#tier-structure-and-features)
3. [Database Schema Implementation](#database-schema-implementation)
4. [Backend Enforcement](#backend-enforcement)
5. [Frontend Implementation](#frontend-implementation)
6. [Upgrade Flow and Payment Integration](#upgrade-flow-and-payment-integration)
7. [Usage Analytics and Metrics](#usage-analytics-and-metrics)
8. [Feature Flag Management](#feature-flag-management)
9. [Onboarding and User Education](#onboarding-and-user-education)
10. [Pricing Strategy and Market Research](#pricing-strategy-and-market-research)
11. [Legal and Compliance](#legal-and-compliance)
12. [Growth and Retention Strategies](#growth-and-retention-strategies)

## Business Model Overview

### Core Philosophy

Resonant follows a **value-first freemium model** where:

- Free tier provides genuine value for relationship journaling
- Premium tier unlocks advanced insights and AI-powered features
- Upgrade triggers are based on value realization, not artificial limitations
- Progressive disclosure guides users toward premium features naturally

### Target Market Segments

1. **Free Tier Users (Target: 85-92% of user base initially, scaling to 80-85%)**
   - Casual relationship journalers
   - Users exploring the concept of relationship health tracking
   - Price-sensitive segments
   - Students and young professionals

2. **Premium Tier Users (Target: 8-10% conversion rate initially, scaling to 15%+)**
   - Serious relationship health enthusiasts
   - Users seeking deep insights and patterns
   - Professionals using relationship data for coaching/therapy
   - Users managing complex relationship networks

### Revenue Growth Timeline

#### Year 1: Foundation Building

**Q1: MVP Launch & Initial User Acquisition**

- MVP launch with core features
- Initial user acquisition: 100 free users
- Focus: Product-market fit validation

**Q2: $1K MRR Milestone**

- 100 paying subscribers
- $1,000 Monthly Recurring Revenue
- $12,000 Annual Run Rate

**Q3: $5K MRR Growth**

- 500 paying subscribers
- $5,000 Monthly Recurring Revenue
- $60,000 Annual Run Rate

**Q4: $100K ARR Achievement**

- 830 paying subscribers
- $8,300 Monthly Recurring Revenue
- $100,000 Annual Recurring Revenue

#### Year 2: Scaling Operations

**Q1: $125K ARR**

- 1,250 paying subscribers
- $12,500 Monthly Recurring Revenue
- $150,000 Annual Run Rate

**Q2: $200K ARR**

- 2,000 paying subscribers
- $20,000 Monthly Recurring Revenue
- $240,000 Annual Run Rate

**Q3: $350K ARR**

- 3,500 paying subscribers
- $35,000 Monthly Recurring Revenue
- $420,000 Annual Run Rate

**Q4: $500K ARR**

- 5,000 paying subscribers
- $50,000 Monthly Recurring Revenue
- $600,000 Annual Run Rate

### Operating Model

| Phase             | Timeline     | Monthly Burn | Team Size   | Key Focus           |
| ----------------- | ------------ | ------------ | ----------- | ------------------- |
| **Bootstrap**     | Months 1-12  | $2-5K        | 1 (Founder) | Product-market fit  |
| **Growth**        | Months 13-24 | $15K         | 3-4         | Scaling acquisition |
| **Profitability** | Month 18+    | Positive     | 5-7         | Market expansion    |

#### Bootstrap Phase (Months 1-12)

- **Timeline**: Year 1 foundation building
- **Monthly Burn Rate**: $2,000 - $5,000
- **Team Size**: 1 founder
- **Key Focus**: Product-market fit validation
- **Milestones**: MVP launch → $1K MRR → $5K MRR → $100K ARR
- **Funding**: Personal savings, pre-seed, or bootstrapped revenue

#### Growth Phase (Months 13-24)

- **Timeline**: Year 2 scaling operations
- **Monthly Burn Rate**: $15,000
- **Team Size**: 3-4 team members
- **Key Focus**: Scaling user acquisition and conversion
- **Milestones**: $125K ARR → $200K ARR → $350K ARR → $500K ARR
- **Funding**: Seed round or sustained revenue growth

#### Profitability Phase (Month 18+)

- **Timeline**: Overlapping with late growth phase
- **Monthly Burn Rate**: Positive cash flow
- **Team Size**: 5-7 team members
- **Key Focus**: Market expansion and feature development
- **Milestones**: Sustainable profitability and market leadership
- **Funding**: Revenue-driven growth, optional Series A

## Tier Structure and Features

### Free Tier Features

**Core Journaling (No Limits):**

- Unlimited journal entries
- Basic mood tracking (10 mood types)
- Manual relationship tagging
- Basic entry search and filtering
- Export entries (JSON format)

**Relationship Management:**

- Up to 3 active relationships
- Basic relationship profiles (name, type, photo/initials)
- Relationship status tracking

**Basic Insights:**

- Weekly insights
- 30-day history access
- Basic entry count statistics
- Simple relationship activity overview

**Data Management:**

- Basic privacy controls
- Manual data export
- Account deletion

### Premium Tier Features ($9.99/month)

**Advanced Relationship Management:**

- Unlimited relationships
- Advanced relationship profiles with custom fields
- Relationship timeline and milestones
- Relationship comparison tools

**AI-Powered Insights:**

- Daily AI analysis using Google Gemini
- Advanced sentiment analysis
- Pattern recognition across entries
- Personalized improvement suggestions
- Relationship health scoring (5-factor analysis)
- Predictive trend alerts
- Custom insight categories

**Enhanced Data Access:**

- Full history access (unlimited retention)
- Cross-relationship comparative insights
- Mood correlation analysis
- Communication pattern detection
- Conflict resolution tracking

**Enhanced Data Features:**

- Voice entry transcription and analysis
- Advanced search with AI-powered semantic search
- Automated tagging and categorization
- Smart reminder system with ML optimization

**Premium Data Management:**

- Advanced export formats (PDF reports, detailed analytics)
- Automated backup to cloud storage
- Data insights PDF reports

### Annual Tier Features ($79/year)

**All Premium Features Plus:**

- Premium features + priority support
- 33% discount compared to monthly billing
- Improved cash flow for sustained development
- Early access to new features
- Annual relationship insights report

### Feature Comparison Matrix

| Feature Category         | Free Tier       | Premium Tier                | Annual Tier                 |
| ------------------------ | --------------- | --------------------------- | --------------------------- |
| **Journal Entries**      | Unlimited       | Unlimited                   | Unlimited                   |
| **Relationships**        | 3 max           | Unlimited                   | Unlimited                   |
| **Intelligent Insights** | Weekly insights | Daily AI insights           | Daily AI insights           |
| **Health Scoring**       | ❌              | ✅ 5-factor analysis        | ✅ 5-factor analysis        |
| **Historical Data**      | 30 days         | Full history                | Full history                |
| **Voice Entries**        | ❌              | ✅ Transcription & analysis | ✅ Transcription & analysis |
| **Advanced Search**      | Basic text      | AI semantic search          | AI semantic search          |
| **Export Formats**       | JSON only       | JSON, PDF, detailed reports | JSON, PDF, detailed reports |
| **Support**              | Community       | Priority support            | Priority support            |
| **Price**                | $0              | $9.99/month                 | $79/year (33% discount)     |

## Database Schema Implementation

### User Tier Management

The user tier is stored in the `users` table and enforced across all database operations:

```typescript
// convex/schema.ts
export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    name: v.string(),
    email: v.optional(v.string()),
    tier: v.union(v.literal('free'), v.literal('premium'), v.literal('annual')), // Core tier field
    subscriptionId: v.optional(v.string()), // Stripe subscription ID
    subscriptionStatus: v.optional(
      v.union(
        v.literal('active'),
        v.literal('canceled'),
        v.literal('past_due'),
        v.literal('unpaid')
      )
    ),
    subscriptionPeriodEnd: v.optional(v.number()), // Unix timestamp
    trialEndDate: v.optional(v.number()), // For premium trials
    preferences: v.object({
      theme: v.union(v.literal('light'), v.literal('dark')),
      aiAnalysisEnabled: v.boolean(), // Premium feature flag
      reminderSettings: v.object({
        enabled: v.boolean(),
        frequency: v.union(
          v.literal('daily'),
          v.literal('weekly'),
          v.literal('monthly')
        ),
        timeOfDay: v.optional(v.string()),
      }),
    }),
    onboardingCompleted: v.boolean(),
    createdAt: v.number(),
    lastActiveAt: v.number(),
  })
    .index('by_clerk_id', ['clerkId'])
    .index('by_tier', ['tier'])
    .index('by_subscription_status', ['subscriptionStatus'])
    .index('by_trial_end', ['trialEndDate']),
})
```

### Feature Usage Tracking

Track feature usage for conversion analytics and fair usage:

```typescript
// convex/schema.ts
featureUsage: defineTable({
  userId: v.id("users"),
  feature: v.union(
    v.literal('intelligent_insights'),
    v.literal('voice_entry'),
    v.literal('advanced_search'),
    v.literal('health_score_calculation'),
    v.literal('export_pdf')
  ),
  usageCount: v.number(),
  lastUsed: v.number(),
  monthYear: v.string(), // "2024-01" for monthly tracking
})
  .index("by_user_month", ["userId", "monthYear"])
  .index("by_feature_month", ["feature", "monthYear"]),
```

## Backend Enforcement

### Tier Validation Functions

Create centralized tier checking utilities:

```typescript
// convex/lib/tierValidation.ts
import { Doc } from './_generated/dataModel'
import { ConvexError } from 'convex/values'

export class TierLimitError extends ConvexError<'TierLimitExceeded'> {
  constructor(message: string, feature: string) {
    super({ message, feature })
  }
}

export function requirePremium(user: Doc<'users'>) {
  if (user.tier !== 'premium' && user.tier !== 'annual') {
    throw new TierLimitError(
      'This feature requires a premium subscription',
      'premium_required'
    )
  }
}

export function checkRelationshipLimit(
  user: Doc<'users'>,
  currentCount: number
) {
  if (user.tier === 'free' && currentCount >= 3) {
    throw new TierLimitError(
      'Free tier is limited to 3 relationships. Upgrade to premium for unlimited relationships.',
      'relationship_limit'
    )
  }
}

export function checkAIAnalysisAccess(user: Doc<'users'>) {
  if (user.tier === 'free') {
    throw new TierLimitError(
      'AI analysis is a premium feature. Upgrade to unlock advanced insights.',
      'ai_analysis_premium'
    )
  }
}

export function checkHistoricalDataAccess(
  user: Doc<'users'>,
  requestedDays: number
) {
  if (user.tier === 'free' && requestedDays > 30) {
    throw new TierLimitError(
      'Free tier is limited to 30 days of historical data. Upgrade for unlimited history.',
      'historical_data_limit'
    )
  }
}
```

### Function-Level Enforcement

Apply tier restrictions in Convex functions:

```typescript
// convex/relationships.ts
export const create = mutation({
  args: {
    userId: v.id('users'),
    name: v.string(),
    type: v.union(
      v.literal('partner'),
      v.literal('family'),
      v.literal('friend')
    ),
    // ... other args
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId)
    if (!user) throw new ConvexError('User not found')

    // Check relationship limit for free tier
    const relationshipCount = await ctx.db
      .query('relationships')
      .withIndex('by_user_active', q =>
        q.eq('userId', args.userId).eq('isActive', true)
      )
      .collect()

    checkRelationshipLimit(user, relationshipCount.length)

    // Proceed with creation
    const relationshipId = await ctx.db.insert('relationships', {
      userId: args.userId,
      name: args.name.trim(),
      type: args.type,
      // ... other fields
    })

    return relationshipId
  },
})

// convex/aiAnalysis.ts
export const queueAnalysis = mutation({
  args: {
    entryId: v.id('journalEntries'),
    priority: v.optional(v.union(v.literal('high'), v.literal('normal'))),
  },
  handler: async (ctx, args) => {
    const entry = await ctx.db.get(args.entryId)
    if (!entry) throw new ConvexError('Entry not found')

    const user = await ctx.db.get(entry.userId)
    if (!user) throw new ConvexError('User not found')

    // Premium feature check
    checkAIAnalysisAccess(user)

    // Premium users get high priority
    const priority =
      args.priority ||
      (user.tier === 'premium' || user.tier === 'annual' ? 'high' : 'normal')

    // Queue the analysis
    await ctx.scheduler.runAfter(0, 'aiAnalysis:processEntry', {
      entryId: args.entryId,
      priority,
    })

    return { status: 'queued', priority }
  },
})
```

### Usage Tracking Implementation

Track feature usage for analytics:

```typescript
// convex/lib/usageTracking.ts
export const trackFeatureUsage = internalMutation({
  args: {
    userId: v.id('users'),
    feature: v.string(),
  },
  handler: async (ctx, args) => {
    const now = new Date()
    const monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

    const existing = await ctx.db
      .query('featureUsage')
      .withIndex('by_user_month', q =>
        q.eq('userId', args.userId).eq('monthYear', monthYear)
      )
      .filter(q => q.eq(q.field('feature'), args.feature))
      .first()

    if (existing) {
      await ctx.db.patch(existing._id, {
        usageCount: existing.usageCount + 1,
        lastUsed: Date.now(),
      })
    } else {
      await ctx.db.insert('featureUsage', {
        userId: args.userId,
        feature: args.feature as any,
        usageCount: 1,
        lastUsed: Date.now(),
        monthYear,
      })
    }
  },
})
```

## Frontend Implementation

### Tier-Aware Component Patterns

Create reusable components for premium feature gates:

```typescript
// src/components/ui/premium-gate.tsx
import React from 'react';
import { useUser } from '@/hooks/convex/use-users';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Crown, Sparkles } from 'lucide-react';

interface PremiumGateProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  feature: string;
  title?: string;
  description?: string;
  ctaText?: string;
  onUpgradeClick?: () => void;
}

export const PremiumGate: React.FC<PremiumGateProps> = ({
  children,
  fallback,
  feature,
  title = "Premium Feature",
  description = "Upgrade to premium to unlock this feature",
  ctaText = "Upgrade to Premium",
  onUpgradeClick,
}) => {
  const { user, isPremium } = useUser();

  if (isPremium) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50">
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
          <Crown className="h-6 w-6 text-amber-600" />
        </div>
        <CardTitle className="text-amber-900">{title}</CardTitle>
        <CardDescription className="text-amber-700">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent className="text-center">
        <Button
          onClick={onUpgradeClick}
          className="bg-amber-600 hover:bg-amber-700"
          data-analytics={`upgrade-cta-${feature}`}
        >
          <Sparkles className="mr-2 h-4 w-4" />
          {ctaText}
        </Button>
      </CardContent>
    </Card>
  );
};
```

### Feature-Specific Gates

```typescript
// src/components/features/ai-analysis/ai-insights-gate.tsx
import React from 'react';
import { PremiumGate } from '@/components/ui/premium-gate';
import { useAnalytics } from '@/hooks/use-analytics';

interface AIInsightsGateProps {
  children: React.ReactNode;
  entryId?: string;
}

export const AIInsightsGate: React.FC<AIInsightsGateProps> = ({
  children,
  entryId,
}) => {
  const analytics = useAnalytics();

  const handleUpgradeClick = () => {
    analytics.track('ai_insights_upgrade_clicked', {
      source: 'ai_insights_gate',
      entry_id: entryId,
    });
    // Navigate to upgrade flow
    window.location.href = '/upgrade';
  };

  return (
    <PremiumGate
      feature="ai_insights"
      title="AI-Powered Insights"
      description="Get personalized insights, pattern detection, and relationship health analysis with our advanced AI features."
      ctaText="Unlock AI Insights"
      onUpgradeClick={handleUpgradeClick}
    >
      {children}
    </PremiumGate>
  );
};
```

### Relationship Limit Enforcement

```typescript
// src/components/features/relationships/add-relationship-button.tsx
import React from 'react';
import { useRelationships, useUser } from '@/hooks/convex';
import { Button } from '@/components/ui/button';
import { PremiumGate } from '@/components/ui/premium-gate';
import { Plus } from 'lucide-react';

export const AddRelationshipButton: React.FC = () => {
  const { user, isPremium } = useUser();
  const { relationships, createRelationship } = useRelationships(user?._id);

  const isAtLimit = !isPremium && relationships.length >= 3;

  if (isAtLimit) {
    return (
      <PremiumGate
        feature="unlimited_relationships"
        title="Relationship Limit Reached"
        description="Free accounts are limited to 3 relationships. Upgrade to premium for unlimited relationships."
        ctaText="Upgrade for Unlimited"
      >
        <Button disabled className="w-full">
          <Plus className="mr-2 h-4 w-4" />
          Add Relationship (3/3 limit reached)
        </Button>
      </PremiumGate>
    );
  }

  return (
    <Button
      onClick={() => {/* Open add relationship modal */}}
      className="w-full"
    >
      <Plus className="mr-2 h-4 w-4" />
      Add Relationship
      {!isPremium && (
        <span className="ml-2 text-xs opacity-75">
          ({relationships.length}/3)
        </span>
      )}
    </Button>
  );
};
```

### Tier Indicator Components

```typescript
// src/components/ui/tier-badge.tsx
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Crown } from 'lucide-react';

interface TierBadgeProps {
  tier: 'free' | 'premium' | 'annual';
  className?: string;
}

export const TierBadge: React.FC<TierBadgeProps> = ({ tier, className }) => {
  if (tier === 'premium') {
    return (
      <Badge variant="secondary" className={`bg-amber-100 text-amber-800 ${className}`}>
        <Crown className="mr-1 h-3 w-3" />
        Premium
      </Badge>
    );
  }

  if (tier === 'annual') {
    return (
      <Badge variant="secondary" className={`bg-amber-100 text-amber-800 ${className}`}>
        <Crown className="mr-1 h-3 w-3" />
        Annual
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className={className}>
      Free
    </Badge>
  );
};
```

## Upgrade Flow and Payment Integration

### Stripe Integration Setup

```typescript
// src/lib/stripe.ts
import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
})

export const PREMIUM_PRICE_ID = process.env.STRIPE_PREMIUM_PRICE_ID!

// Price configurations
export const PRICING = {
  monthly: {
    id: 'price_monthly_premium',
    amount: 999, // $9.99 in cents
    interval: 'month',
  },
  yearly: {
    id: 'price_yearly_premium',
    amount: 7900, // $79.00 in cents (33% discount)
    interval: 'year',
  },
} as const
```

### Upgrade Page Implementation

```typescript
// src/app/upgrade/page.tsx
import React from 'react';
import { PricingCard } from '@/components/features/billing/pricing-card';
import { FeatureComparison } from '@/components/features/billing/feature-comparison';
import { TestimonialSection } from '@/components/features/billing/testimonials';

export default function UpgradePage() {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">
          Upgrade to Premium
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Unlock advanced AI insights, unlimited relationships, and powerful analytics
          to transform your relationship health journey.
        </p>
      </div>

      {/* Pricing Cards */}
      <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-16">
        <PricingCard
          plan="monthly"
          price="$9.99"
          interval="month"
          features={[
            "Unlimited relationships",
            "Daily AI analysis",
            "Full history access",
            "Voice entry transcription",
            "Advanced insights",
          ]}
        />
        <PricingCard
          plan="yearly"
          price="$79"
          interval="year"
          originalPrice="$119.88"
          savings="Save $40.88"
          popular
          features={[
            "Everything in monthly",
            "33% discount",
            "Priority support",
            "Annual insights report",
            "Early access to new features",
          ]}
        />
      </div>

      {/* Feature Comparison */}
      <FeatureComparison />

      {/* Social Proof */}
      <TestimonialSection />
    </div>
  );
}
```

### Checkout Flow

```typescript
// src/app/api/checkout/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { stripe, PRICING } from '@/lib/stripe'

export async function POST(req: NextRequest) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { priceId, successUrl, cancelUrl } = await req.json()

    // Validate price ID
    const validPriceIds = Object.values(PRICING).map(p => p.id)
    if (!validPriceIds.includes(priceId)) {
      return NextResponse.json({ error: 'Invalid price ID' }, { status: 400 })
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      metadata: {
        userId,
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
      allow_promotion_codes: true,
      billing_address_collection: 'required',
      customer_email: undefined, // Let user enter email
    })

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    })
  } catch (error) {
    console.error('Checkout error:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
```

### Webhook Handler

```typescript
// src/app/api/webhooks/stripe/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@/convex/_generated/api'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get('stripe-signature')!

  let event
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (error) {
    console.error('Webhook signature verification failed:', error)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object)
        break

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object)
        break

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object)
        break
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook handler error:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}

async function handleCheckoutCompleted(session: any) {
  const userId = session.metadata.userId
  const subscriptionId = session.subscription

  await convex.mutation(api.users.upgradeToPremium, {
    clerkId: userId,
    subscriptionId,
    subscriptionStatus: 'active',
  })
}
```

## Usage Analytics and Metrics

### Key Metrics Dashboard

Track these essential freemium metrics:

```typescript
// convex/analytics.ts
export const getFreemiumMetrics = query({
  args: {
    startDate: v.number(),
    endDate: v.number(),
  },
  handler: async (ctx, args) => {
    // User acquisition and conversion metrics
    const totalUsers = await ctx.db.query('users').collect()
    const freeUsers = totalUsers.filter(u => u.tier === 'free')
    const premiumUsers = totalUsers.filter(
      u => u.tier === 'premium' || u.tier === 'annual'
    )

    // Conversion rate
    const conversionRate = (premiumUsers.length / totalUsers.length) * 100

    // Feature usage analytics
    const featureUsage = await ctx.db
      .query('featureUsage')
      .filter(
        q =>
          q.gte(q.field('lastUsed'), args.startDate) &&
          q.lte(q.field('lastUsed'), args.endDate)
      )
      .collect()

    // Revenue metrics
    const monthlyRevenue = premiumUsers.length * 9.99 // $9.99/month
    const annualRevenue = monthlyRevenue * 12

    // User engagement metrics
    const activeUsers = totalUsers.filter(
      u => u.lastActiveAt >= args.startDate && u.lastActiveAt <= args.endDate
    )

    return {
      userMetrics: {
        totalUsers: totalUsers.length,
        freeUsers: freeUsers.length,
        premiumUsers: premiumUsers.length,
        conversionRate: Math.round(conversionRate * 100) / 100,
        activeUsers: activeUsers.length,
      },
      revenueMetrics: {
        monthlyRevenue,
        annualRevenue,
        averageRevenuePerUser: monthlyRevenue / premiumUsers.length || 0,
      },
      featureMetrics: {
        totalFeatureUsage: featureUsage.length,
        topFeatures: getTopFeatures(featureUsage),
        premiumFeatureAdoption: getPremiumFeatureAdoption(featureUsage),
      },
    }
  },
})

function getTopFeatures(usage: Doc<'featureUsage'>[]) {
  const featureCounts = usage.reduce(
    (acc, item) => {
      acc[item.feature] = (acc[item.feature] || 0) + item.usageCount
      return acc
    },
    {} as Record<string, number>
  )

  return Object.entries(featureCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([feature, count]) => ({ feature, count }))
}
```

### Conversion Funnel Tracking

```typescript
// src/lib/analytics.ts
export class ConversionFunnel {
  private static instance: ConversionFunnel

  static getInstance() {
    if (!ConversionFunnel.instance) {
      ConversionFunnel.instance = new ConversionFunnel()
    }
    return ConversionFunnel.instance
  }

  // Track key conversion events
  trackSignup(userId: string, source: string) {
    this.track('user_signup', { userId, source })
  }

  trackOnboardingComplete(userId: string) {
    this.track('onboarding_complete', { userId })
  }

  trackFeatureLimitHit(userId: string, feature: string) {
    this.track('feature_limit_hit', { userId, feature })
  }

  trackUpgradeViewIntent(userId: string, source: string) {
    this.track('upgrade_page_viewed', { userId, source })
  }

  trackUpgradeAttempt(userId: string, priceId: string) {
    this.track('upgrade_attempt', { userId, priceId })
  }

  trackUpgradeSuccess(userId: string, subscriptionId: string) {
    this.track('upgrade_success', { userId, subscriptionId })
  }

  trackChurn(userId: string, reason?: string) {
    this.track('user_churn', { userId, reason })
  }

  private track(event: string, properties: Record<string, any>) {
    // Send to analytics service (PostHog, Mixpanel, etc.)
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', event, properties)
    }
  }
}
```

## Feature Flag Management

### Dynamic Feature Flags

```typescript
// convex/featureFlags.ts
export default defineSchema({
  featureFlags: defineTable({
    flag: v.string(), // e.g., "ai_analysis_v2", "voice_entries_beta"
    enabled: v.boolean(),
    description: v.string(),
    targetTier: v.union(
      v.literal('free'),
      v.literal('premium'),
      v.literal('all')
    ),
    rolloutPercentage: v.number(), // 0-100 for gradual rollouts
    userGroups: v.optional(v.array(v.string())), // ["beta_testers", "power_users"]
    expiresAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_flag', ['flag'])
    .index('by_tier', ['targetTier']),
})

export const getFeatureFlag = query({
  args: {
    flag: v.string(),
    userId: v.id('users'),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId)
    if (!user) return false

    const flag = await ctx.db
      .query('featureFlags')
      .withIndex('by_flag', q => q.eq('flag', args.flag))
      .first()

    if (!flag || !flag.enabled) return false

    // Check tier requirements
    if (flag.targetTier !== 'all' && flag.targetTier !== user.tier) {
      return false
    }

    // Check rollout percentage
    if (flag.rolloutPercentage < 100) {
      const userHash = hashUserId(user.clerkId)
      if (userHash % 100 >= flag.rolloutPercentage) {
        return false
      }
    }

    return true
  },
})
```

## Onboarding and User Education

### Progressive Value Demonstration

```typescript
// src/components/features/onboarding/value-demonstration.tsx
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, TrendingUp, Users } from 'lucide-react';

const onboardingSteps = [
  {
    title: "Welcome to Resonant",
    description: "Track your relationship health with advanced insights",
    action: "Get Started",
    icon: <Users className="h-8 w-8" />,
  },
  {
    title: "Create Your First Entry",
    description: "Start journaling about your relationships",
    action: "Write Entry",
    icon: <TrendingUp className="h-8 w-8" />,
  },
  {
    title: "Unlock AI Insights",
    description: "See what patterns our AI can detect in your relationships",
    action: "Upgrade to Premium",
    icon: <Sparkles className="h-8 w-8" />,
    premium: true,
  },
];

export const ValueDemonstration: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);

  return (
    <div className="space-y-6">
      {onboardingSteps.map((step, index) => (
        <Card
          key={index}
          className={`${
            step.premium
              ? 'border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50'
              : ''
          }`}
        >
          <CardHeader>
            <div className="flex items-center space-x-4">
              <div className={`p-2 rounded-full ${
                step.premium ? 'bg-amber-100' : 'bg-blue-100'
              }`}>
                {step.icon}
              </div>
              <div>
                <CardTitle>{step.title}</CardTitle>
                <p className="text-gray-600">{step.description}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Button
              variant={step.premium ? 'default' : 'outline'}
              className={step.premium ? 'bg-amber-600 hover:bg-amber-700' : ''}
            >
              {step.action}
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
```

### Contextual Upgrade Prompts

```typescript
// src/hooks/use-contextual-prompts.ts
import { useEffect } from 'react'
import { useUser } from '@/hooks/convex/use-users'
import { ConversionFunnel } from '@/lib/analytics'

export function useContextualPrompts() {
  const { user, isPremium } = useUser()
  const funnel = ConversionFunnel.getInstance()

  useEffect(() => {
    if (!user || isPremium) return

    // Show contextual prompts based on usage patterns
    const checkUpgradeOpportunities = () => {
      // After 3 journal entries
      if (user.journalEntryCount >= 3) {
        showInsightsPreview()
      }

      // After hitting relationship limit
      if (user.relationshipCount >= 3) {
        showRelationshipLimitPrompt()
      }

      // After 7 days of usage
      const daysSinceSignup =
        (Date.now() - user.createdAt) / (1000 * 60 * 60 * 24)
      if (daysSinceSignup >= 7) {
        showWeeklyInsightsPrompt()
      }
    }

    checkUpgradeOpportunities()
  }, [user, isPremium])

  const showInsightsPreview = () => {
    // Show AI insights preview modal
    funnel.trackFeatureLimitHit(user!._id, 'ai_insights_preview')
  }

  const showRelationshipLimitPrompt = () => {
    // Show relationship limit modal
    funnel.trackFeatureLimitHit(user!._id, 'relationship_limit')
  }

  const showWeeklyInsightsPrompt = () => {
    // Show weekly insights email prompt
    funnel.trackFeatureLimitHit(user!._id, 'weekly_insights')
  }
}
```

## Pricing Strategy and Market Research

### Competitive Analysis

| Competitor             | Free Tier                         | Premium Price   | Key Features                          |
| ---------------------- | --------------------------------- | --------------- | ------------------------------------- |
| **Journey**            | Basic journaling                  | $4.99/month     | Simple journaling, basic analytics    |
| **Daylio**             | Limited entries                   | $5.99/month     | Mood tracking, basic insights         |
| **Relationship Hero**  | 1 free session                    | $99/session     | Coaching sessions, no self-service    |
| **Gottman Card Decks** | N/A                               | $29.99 one-time | Conversation prompts only             |
| **Resonant**           | Full journaling + 3 relationships | **$9.99/month** | AI insights + unlimited relationships |

### Value Proposition Differentiation

**Resonant's Unique Position:**

- **AI-Powered Relationship Health**: Only app using advanced AI for relationship pattern analysis
- **Multi-Relationship Management**: Track family, friends, and partners in one place
- **Predictive Insights**: Early warning system for relationship issues
- **Scientific Approach**: Based on relationship research and psychology

### Price Testing Strategy

```typescript
// A/B test different pricing strategies
const PRICING_EXPERIMENTS = {
  control: { monthly: 12, yearly: 120 },
  lowerPrice: { monthly: 8, yearly: 80 },
  higherValue: { monthly: 15, yearly: 150 },
  freemiumPlus: { monthly: 9.99, yearly: 99 }, // Psychology pricing
}
```

## Legal and Compliance

### Terms of Service Updates

Key sections for freemium model:

```markdown
## Subscription Terms

### Free Tier

- Limited to 3 active relationships
- Basic insights and analytics
- Community support
- Subject to fair usage policies

### Premium Tier

- Unlimited relationships
- Advanced AI-powered insights
- Priority customer support
- Additional export formats
- $9.99/month or $79/year billing

### Cancellation

- Cancel anytime through account settings
- Access continues until end of billing period
- Data retention for 90 days after cancellation
```

### Privacy Policy Considerations

```markdown
## Data Usage for AI Features

### Premium AI Analysis

- Journal entries processed by Google Gemini API
- Data is anonymized and encrypted in transit
- No data stored on Google servers
- Users can opt-out of AI analysis at any time

### Usage Analytics

- Feature usage tracked for product improvement
- Conversion metrics collected anonymously
- No personal content shared in analytics
```

## Growth and Retention Strategies

### Viral Growth Mechanisms

```typescript
// src/components/features/sharing/relationship-insights-share.tsx
export const ShareInsightCard: React.FC<{ insight: Insight }> = ({ insight }) => {
  const generateShareableCard = () => {
    return {
      title: "My Relationship Health Insights",
      description: "Track your relationship patterns with Resonant",
      image: generateInsightCard(insight), // Branded image
      url: "https://resonant.app?ref=shared-insight",
    };
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        Share your progress (anonymized) and invite friends to start their journey
      </p>
      <Button onClick={() => shareInsight(generateShareableCard())}>
        Share My Progress
      </Button>
    </div>
  );
};
```

### Retention Strategies

1. **Email Sequences:**
   - Day 1: Welcome and first entry prompt
   - Day 3: Relationship tips and insights
   - Day 7: Weekly summary with upgrade prompt
   - Day 30: Monthly insights report

2. **In-App Engagement:**
   - Streak tracking for consistent journaling
   - Relationship milestone celebrations
   - Personalized insights notifications

3. **Churn Prevention:**
   - Exit intent surveys
   - Win-back campaigns for churned users
   - Pause subscription option instead of cancellation

### Success Metrics

**Primary KPIs:**

- Monthly Recurring Revenue (MRR)
- Customer Acquisition Cost (CAC)
- Customer Lifetime Value (CLV)
- Free-to-paid conversion rate
- Monthly active users (MAU)

**Secondary KPIs:**

- Feature adoption rates
- Support ticket volume
- Net Promoter Score (NPS)
- Time to first value
- Churn rate by cohort

This freemium implementation provides a comprehensive foundation for sustainable revenue growth while delivering genuine value to both free and premium users.
