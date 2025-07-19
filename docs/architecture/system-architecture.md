# Relationship Health Journal - System Architecture

## High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER BROWSER                            │
├─────────────────────────────────────────────────────────────────┤
│                     Next.js Frontend                           │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐   │
│  │  Journal Pages  │ │   Dashboard     │ │  Relationship   │   │
│  │                 │ │                 │ │   Management    │   │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘   │
│                                                                 │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐   │
│  │   AI Insights   │ │  Notifications  │ │   Data Export   │   │
│  │                 │ │                 │ │                 │   │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                                │
                                │ HTTPS/WebSocket
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      VERCEL PLATFORM                           │
├─────────────────────────────────────────────────────────────────┤
│                    Next.js App Router                          │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐   │
│  │   API Routes    │ │  Server Actions │ │  Edge Functions │   │
│  │                 │ │                 │ │                 │   │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                │                           │                │
                │                           │                │
                ▼                           ▼                ▼
┌─────────────────┐           ┌─────────────────┐ ┌─────────────────┐
│   CLERK AUTH    │           │     CONVEX      │ │  GOOGLE GEMINI  │
│                 │           │    DATABASE     │ │      FLASH      │
│  ┌───────────┐  │           │                 │ │                 │
│  │ User Auth │  │           │ ┌─────────────┐ │ │ ┌─────────────┐ │
│  │           │  │           │ │    Users    │ │ │ │ AI Analysis │ │
│  │ Sessions  │  │           │ │             │ │ │ │             │ │
│  │           │  │           │ │Relationships│ │ │ │  Sentiment  │ │
│  │ Profiles  │  │           │ │             │ │ │ │             │ │
│  │           │  │           │ │  Entries    │ │ │ │  Patterns   │ │
│  └───────────┘  │           │ │             │ │ │ │             │ │
│                 │           │ │ AI Results │ │ │ │Suggestions  │ │
└─────────────────┘           │ │             │ │ │ └─────────────┘ │
                              │ └─────────────┘ │ │                 │
                              │                 │ └─────────────────┘
                              │ ┌─────────────┐ │
                              │ │ Scheduled   │ │
                              │ │ Functions   │ │
                              │ └─────────────┘ │
                              └─────────────────┘
```

## Data Flow Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│     USER        │    │    FRONTEND     │    │    BACKEND      │
│                 │    │   (Next.js)     │    │    (Convex)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │ 1. Write Journal      │                       │
         │ ─────────────────────▶│                       │
         │                       │ 2. Store Entry        │
         │                       │ ─────────────────────▶│
         │                       │                       │
         │                       │ 3. Trigger AI         │
         │                       │    Analysis           │
         │                       │ ─────────────────────▶│
         │                       │                       │
┌─────────────────┐              │                       │ 4. Call Gemini
│  GOOGLE GEMINI  │              │                       │ ◀─────────────────
│     FLASH       │              │                       │
└─────────────────┘              │                       │ 5. Process Results
         │                       │                       │ ─────────────────▶
         │ 6. Return Analysis    │                       │
         │ ─────────────────────▶│                       │
         │                       │ 7. Update UI          │
         │                       │ ◀─────────────────────│
         │                       │                       │
         │ 8. Display Insights   │                       │
         │ ◀─────────────────────│                       │
         │                       │                       │
```

## Component Architecture

```
src/
├── app/                        # Next.js App Router
│   ├── (auth)/                 # Authentication routes
│   │   ├── sign-in/
│   │   └── sign-up/
│   ├── dashboard/              # Main dashboard
│   ├── journal/                # Journal entry pages
│   ├── relationships/          # Relationship management
│   ├── insights/               # AI insights and trends
│   └── settings/               # User settings
│
├── components/                 # Reusable UI components
│   ├── ui/                     # Base UI components
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Chart.tsx
│   │   └── ...
│   ├── features/               # Feature-specific components
│   │   ├── journal/
│   │   │   ├── EntryEditor.tsx
│   │   │   ├── EntryList.tsx
│   │   │   └── RelationshipPicker.tsx
│   │   ├── dashboard/
│   │   │   ├── HealthScoreCard.tsx
│   │   │   ├── TrendChart.tsx
│   │   │   └── InsightsSummary.tsx
│   │   └── relationships/
│   │       ├── RelationshipForm.tsx
│   │       ├── RelationshipCard.tsx
│   │       └── RelationshipsList.tsx
│   └── layout/                 # Layout components
│       ├── Navbar.tsx
│       ├── Sidebar.tsx
│       └── Footer.tsx
│
├── lib/                        # Utility libraries
│   ├── utils.ts                # General utilities
│   ├── validations.ts          # Form validation schemas
│   ├── constants.ts            # App constants
│   └── types.ts                # TypeScript type definitions
│
├── hooks/                      # Custom React hooks
│   ├── useConvex.ts           # Convex data hooks
│   ├── useAuth.ts             # Authentication hooks
│   └── useAI.ts               # AI analysis hooks
│
└── styles/                     # Styling
    └── globals.css             # Global Tailwind styles
```

## Database Schema (Convex)

```
┌─────────────────────────────────────────────────────────────────┐
│                        CONVEX DATABASE                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐    ┌─────────────────┐                    │
│  │     users       │    │  relationships  │                    │
│  │─────────────────│    │─────────────────│                    │
│  │ _id             │    │ _id             │                    │
│  │ clerkId         │    │ userId          │──┐                 │
│  │ email           │    │ name            │  │                 │
│  │ createdAt       │    │ type            │  │                 │
│  │ preferences     │    │ photo           │  │                 │
│  └─────────────────┘    │ createdAt       │  │                 │
│           │              │ updatedAt       │  │                 │
│           │              └─────────────────┘  │                 │
│           │                       │           │                 │
│           │                       │           │                 │
│  ┌────────▼───────┐    ┌──────────▼───────┐  │                 │
│  │  journalEntries │    │   aiAnalysis     │  │                 │
│  │─────────────────│    │─────────────────│  │                 │
│  │ _id             │    │ _id             │  │                 │
│  │ userId          │    │ entryId         │──┘                 │
│  │ relationshipId  │────│ userId          │                    │
│  │ content         │    │ sentiment       │                    │
│  │ mood            │    │ emotions        │                    │
│  │ isPrivate       │    │ patterns        │                    │
│  │ createdAt       │    │ confidence      │                    │
│  │ updatedAt       │    │ processedAt     │                    │
│  └─────────────────┘    └─────────────────┘                    │
│           │                       │                            │
│           │              ┌────────▼───────┐                    │
│           │              │ healthScores   │                    │
│           │              │─────────────────│                    │
│           │              │ _id             │                    │
│           │              │ userId          │                    │
│           └──────────────│ relationshipId  │                    │
│                          │ score           │                    │
│                          │ factors         │                    │
│                          │ trend           │                    │
│                          │ lastUpdated     │                    │
│                          └─────────────────┘                    │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                     SCHEDULED FUNCTIONS                        │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐   │
│  │  processAI      │ │ calculateScores │ │ sendReminders   │   │
│  │   Analysis      │ │                 │ │                 │   │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## AI Processing Pipeline

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   JOURNAL       │    │      DSPY       │    │    GEMINI       │
│    ENTRY        │    │   PROCESSOR     │    │     FLASH       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │ 1. New Entry          │                       │
         │ ─────────────────────▶│                       │
         │                       │                       │
         │                       │ 2. Format Prompt     │
         │                       │ ─────────────────────▶│
         │                       │                       │
         │                       │ 3. AI Analysis       │
         │                       │ ◀─────────────────────│
         │                       │                       │
         │ 4. Structured Results │                       │
         │ ◀─────────────────────│                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  STORE RESULTS  │    │   UPDATE UI     │    │   CALCULATE     │
│   IN CONVEX     │    │   REAL-TIME     │    │  HEALTH SCORE   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## DSPy Integration Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        DSPY FRAMEWORK                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐    ┌─────────────────┐                    │
│  │   Signatures    │    │    Modules      │                    │
│  │─────────────────│    │─────────────────│                    │
│  │ SentimentAnalysis│   │ RelationshipAnalyzer                │
│  │ EmotionDetection│    │ PatternDetector │                    │
│  │ PatternRecognition   │ SuggestionGenerator                 │
│  │ SuggestionGeneration │ HealthScoreCalculator               │
│  └─────────────────┘    └─────────────────┘                    │
│           │                       │                            │
│           │              ┌────────▼───────┐                    │
│           │              │   Optimizers   │                    │
│           │              │─────────────────│                    │
│           │              │ BootstrapFewShot│                   │
│           └──────────────│ MIPRO           │                    │
│                          │ Automatic Tuning│                    │
│                          └─────────────────┘                    │
│                                   │                             │
│                          ┌────────▼───────┐                    │
│                          │   Evaluators   │                    │
│                          │─────────────────│                    │
│                          │ Accuracy Metrics│                    │
│                          │ User Feedback   │                    │
│                          │ A/B Testing     │                    │
│                          └─────────────────┘                    │
└─────────────────────────────────────────────────────────────────┘
```

## Security & Privacy Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     SECURITY LAYERS                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐   │
│  │   CLIENT-SIDE   │ │   TRANSPORT     │ │   SERVER-SIDE   │   │
│  │   SECURITY      │ │    SECURITY     │ │    SECURITY     │   │
│  │─────────────────│ │─────────────────│ │─────────────────│   │
│  │ Input Validation│ │ HTTPS/TLS 1.3   │ │ Authentication  │   │
│  │ XSS Protection  │ │ WSS WebSockets  │ │ Authorization   │   │
│  │ CSRF Protection │ │ Certificate     │ │ Rate Limiting   │   │
│  │ Content Security│ │ Pinning         │ │ Input Sanitization  │
│  │ Policy (CSP)    │ │                 │ │ SQL Injection   │   │
│  └─────────────────┘ └─────────────────┘ │ Prevention      │   │
│                                          └─────────────────┘   │
│                                                                 │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐   │
│  │   DATA-AT-REST  │ │  DATA-IN-TRANSIT│ │   PRIVACY       │   │
│  │   ENCRYPTION    │ │   ENCRYPTION    │ │   CONTROLS      │   │
│  │─────────────────│ │─────────────────│ │─────────────────│   │
│  │ AES-256         │ │ TLS 1.3         │ │ Data Minimization│  │
│  │ Database        │ │ End-to-End      │ │ Purpose Limitation│ │
│  │ Encryption      │ │ WebSocket       │ │ User Consent    │   │
│  │ File Encryption │ │ Security        │ │ Right to Delete │   │
│  │                 │ │                 │ │ Data Portability│   │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      VERCEL EDGE NETWORK                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐   │
│  │   US-EAST-1     │ │    EU-WEST-1    │ │   ASIA-PAC-1    │   │
│  │   (Primary)     │ │   (Secondary)   │ │   (Secondary)   │   │
│  │─────────────────│ │─────────────────│ │─────────────────│   │
│  │ Next.js App     │ │ Next.js App     │ │ Next.js App     │   │
│  │ Edge Functions  │ │ Edge Functions  │ │ Edge Functions  │   │
│  │ Static Assets   │ │ Static Assets   │ │ Static Assets   │   │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                │                   │                   │
                └───────────────────┼───────────────────┘
                                    │
                ┌───────────────────────────────────────┐
                │          GLOBAL SERVICES              │
                ├───────────────────────────────────────┤
                │                                       │
                │ ┌─────────────┐ ┌─────────────────┐   │
                │ │   CONVEX    │ │     CLERK       │   │
                │ │  DATABASE   │ │ AUTHENTICATION  │   │
                │ │             │ │                 │   │
                │ │ Multi-Region│ │ Global Identity │   │
                │ │ Replication │ │ Provider        │   │
                │ └─────────────┘ └─────────────────┘   │
                │                                       │
                │ ┌─────────────┐ ┌─────────────────┐   │
                │ │   GOOGLE    │ │   MONITORING    │   │
                │ │  GEMINI AI  │ │   & ANALYTICS   │   │
                │ │             │ │                 │   │
                │ │ API Gateway │ │ Vercel Analytics│   │
                │ │ Rate Limits │ │ Error Tracking  │   │
                │ └─────────────┘ └─────────────────┘   │
                └───────────────────────────────────────┘
```

## Performance Optimization Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                   PERFORMANCE STRATEGIES                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐    │
│ │   FRONTEND      │ │    BACKEND      │ │      AI         │    │
│ │  OPTIMIZATION   │ │  OPTIMIZATION   │ │  OPTIMIZATION   │    │
│ │─────────────────│ │─────────────────│ │─────────────────│    │
│ │ Code Splitting  │ │ Database        │ │ Prompt Caching  │    │
│ │ Lazy Loading    │ │ Indexing        │ │ Batch Processing│    │
│ │ Image           │ │ Query           │ │ Result Caching  │    │
│ │ Optimization    │ │ Optimization    │ │ Rate Limiting   │    │
│ │ Bundle Analysis │ │ Connection      │ │ Async Processing│    │
│ │ Tree Shaking    │ │ Pooling         │ │ Priority Queue  │    │
│ │ Prefetching     │ │ Caching         │ │                 │    │
│ └─────────────────┘ └─────────────────┘ └─────────────────┘    │
│                                                                 │
│ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐    │
│ │     CACHING     │ │    MONITORING   │ │   SCALABILITY   │    │
│ │   STRATEGY      │ │   & ALERTING    │ │   PLANNING      │    │
│ │─────────────────│ │─────────────────│ │─────────────────│    │
│ │ Browser Cache   │ │ Performance     │ │ Auto Scaling    │    │
│ │ CDN Cache       │ │ Metrics         │ │ Load Balancing  │    │
│ │ API Cache       │ │ Error Tracking  │ │ Database        │    │
│ │ Database Cache  │ │ User Analytics  │ │ Sharding        │    │
│ │ Memory Cache    │ │ Uptime          │ │ Horizontal      │    │
│ │ Disk Cache      │ │ Monitoring      │ │ Scaling         │    │
│ └─────────────────┘ └─────────────────┘ └─────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```
