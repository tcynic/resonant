# Technical Architecture Overview

## Tech Stack

- **Frontend:** Next.js + TypeScript + Tailwind CSS
- **Database/Backend:** Convex (real-time, serverless)
- **Authentication:** Clerk (complete user management)
- **AI/ML:** Convex HTTP Actions + Google Gemini Flash (queue-based processing)
- **Deployment:** Vercel (with edge functions)

## Key Architecture Benefits

- **Serverless scaling:** Handle growth without infrastructure management
- **Real-time features:** Live relationship score updates, instant notifications
- **Simplified development:** Convex handles backend complexity
- **Reliable AI processing:** HTTP Actions eliminate 25% client-side failure rate
- **Queue-based processing:** Convex Scheduler ensures reliable AI analysis
- **Real-time status tracking:** Database subscriptions provide instant processing updates
- **Circuit breaker resilience:** Graceful fallback when external APIs fail
- **Fast global delivery:** Vercel edge network + Convex edge functions

## MVP Development Roadmap

### Phase 1 - Core Foundation (Weeks 1-4)

1. **User authentication** (Clerk setup)
2. **Relationship creation/management** (add people first)
3. **Basic journal entry** (simple text editor)
4. **Relationship tagging** (assign entries to existing relationships)
5. **Data persistence** (Convex setup)
6. **Basic entry list/search**

### Phase 2 - AI Analysis (Weeks 5-8)

1. **Sentiment analysis** (Convex HTTP Actions + Gemini Flash with queue processing)
2. **Basic relationship health scores** (simple 0-100 rating)
3. **Simple dashboard** (show scores per relationship)
4. **Entry history view** (chronological per relationship)

### Phase 3 - Insights & Guidance (Weeks 9-12)

1. **Trend visualizations** (basic charts)
2. **Simple actionable suggestions** (based on sentiment patterns)
3. **Basic reminder notifications** (weekly check-ins)
4. **Data export** (privacy compliance)

### Phase 4+ - Advanced Features

- Voice journaling
- Complex AI analysis patterns
- Advanced dashboard features
- Focus mode for relationship improvement
- Sophisticated guidance system

## HTTP Actions Architecture

### AI Processing Workflow

1. **Journal Entry Submission:** User creates/updates journal entry
2. **Queue Processing:** Convex Scheduler queues AI analysis task
3. **HTTP Action Execution:** Serverless function calls Gemini Flash API
4. **Database Update:** Results stored with real-time subscription updates
5. **UI Reflection:** Frontend receives instant updates via Convex subscriptions

### Error Handling & Reliability

- **Circuit breaker pattern:** Automatic fallback when API limits exceeded
- **Retry mechanism:** Exponential backoff for transient failures
- **Fallback analysis:** Basic sentiment scoring when external APIs unavailable
- **Status tracking:** Real-time processing status visible to users
- **Queue persistence:** Failed jobs automatically retry with backoff

### Technical Implementation Details

```typescript
// HTTP Action for AI analysis
export const analyzeJournalEntry = httpAction(async (ctx, request) => {
  // Reliable external API call from Convex serverless function
  const analysis = await callGeminiAPI(entryContent)

  // Update database with real-time subscriptions
  await ctx.runMutation(internal.journalEntries.updateAnalysis, {
    entryId,
    sentiment: analysis.sentiment,
    healthScore: analysis.healthScore,
  })
})
```

## MVP Success Criteria

- Users can journal consistently
- AI provides meaningful relationship insights with 99%+ reliability
- Basic privacy/security in place
- Users see value in relationship health tracking
- Real-time processing status provides transparent user experience
