# Technical Architecture Overview

## Tech Stack

- **Frontend:** Next.js + TypeScript + Tailwind CSS
- **Database/Backend:** Convex (real-time, serverless)
- **Authentication:** Clerk (complete user management)
- **AI/ML:** DSPy + Google Gemini Flash
- **Deployment:** Vercel (with edge functions)

## Key Architecture Benefits

- **Serverless scaling:** Handle growth without infrastructure management
- **Real-time features:** Live relationship score updates, instant notifications
- **Simplified development:** Convex handles backend complexity
- **DSPy optimization:** Continuously improving AI performance
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

1. **Sentiment analysis** (DSPy + Gemini Flash integration)
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

## MVP Success Criteria

- Users can journal consistently
- AI provides meaningful relationship insights
- Basic privacy/security in place
- Users see value in relationship health tracking
