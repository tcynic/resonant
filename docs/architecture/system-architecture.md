# Relationship Health Journal - System Architecture

## High-Level System Architecture

```mermaid
graph TB
    subgraph Browser["USER BROWSER"]
        subgraph Frontend["Next.js Frontend"]
            JP["Journal Pages"]
            DB["Dashboard"]
            RM["Relationship Management"]
            AI["AI Insights"]
            NO["Notifications"]
            DE["Data Export"]
        end
    end

    subgraph Vercel["VERCEL PLATFORM"]
        subgraph AppRouter["Next.js App Router"]
            AR["API Routes"]
            SA["Server Actions"]
            EF["Edge Functions"]
        end
    end

    subgraph ClerkAuth["CLERK AUTH"]
        UA["User Auth"]
        SE["Sessions"]
        PR["Profiles"]
    end

    subgraph ConvexDB["CONVEX DATABASE"]
        US["Users"]
        RE["Relationships"]
        EN["Entries"]
        AIR["AI Results"]
        SF["Scheduled Functions"]
    end

    subgraph GeminiAI["GOOGLE GEMINI FLASH"]
        AIA["AI Analysis"]
        SEN["Sentiment"]
        PAT["Patterns"]
        SUG["Suggestions"]
    end

    Browser -.->|HTTPS/WebSocket| Vercel
    Vercel --> ClerkAuth
    Vercel --> ConvexDB
    Vercel --> GeminiAI
```

## Data Flow Architecture

```mermaid
sequenceDiagram
    participant U as USER
    participant F as FRONTEND<br/>(Next.js)
    participant B as BACKEND<br/>(Convex)
    participant G as GOOGLE GEMINI<br/>FLASH

    U->>F: 1. Write Journal
    F->>B: 2. Store Entry
    F->>B: 3. Trigger AI Analysis
    B->>G: 4. Call Gemini
    B->>B: 5. Process Results
    G->>F: 6. Return Analysis
    B->>F: 7. Update UI
    F->>U: 8. Display Insights
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

```mermaid
erDiagram
    users {
        string _id PK
        string clerkId
        string email
        date createdAt
        object preferences
    }

    relationships {
        string _id PK
        string userId FK
        string name
        string type
        string photo
        date createdAt
        date updatedAt
    }

    journalEntries {
        string _id PK
        string userId FK
        string relationshipId FK
        string content
        string mood
        boolean isPrivate
        date createdAt
        date updatedAt
    }

    aiAnalysis {
        string _id PK
        string entryId FK
        string userId FK
        string sentiment
        array emotions
        array patterns
        number confidence
        date processedAt
    }

    healthScores {
        string _id PK
        string userId FK
        string relationshipId FK
        number score
        array factors
        string trend
        date lastUpdated
    }

    users ||--o{ relationships : "has"
    users ||--o{ journalEntries : "writes"
    relationships ||--o{ journalEntries : "relates to"
    journalEntries ||--|| aiAnalysis : "analyzed by"
    relationships ||--|| healthScores : "scored by"
    users ||--o{ healthScores : "owns"
```

## AI Processing Pipeline

```mermaid
flowchart TD
    JE["JOURNAL ENTRY"] --> DP["DSPY PROCESSOR"]
    DP --> |"2. Format Prompt"| GF["GEMINI FLASH"]
    GF --> |"3. AI Analysis"| DP
    DP --> |"4. Structured Results"| JE

    JE --> SR["STORE RESULTS IN CONVEX"]
    DP --> UU["UPDATE UI REAL-TIME"]
    GF --> CHS["CALCULATE HEALTH SCORE"]
```

## DSPy Integration Architecture

```mermaid
graph TB
    subgraph DSPy["DSPY FRAMEWORK"]
        subgraph Signatures["Signatures"]
            SA["SentimentAnalysis"]
            ED["EmotionDetection"]
            PR["PatternRecognition"]
            SG["SuggestionGeneration"]
        end

        subgraph Modules["Modules"]
            RA["RelationshipAnalyzer"]
            PD["PatternDetector"]
            SGM["SuggestionGenerator"]
            HSC["HealthScoreCalculator"]
        end

        subgraph Optimizers["Optimizers"]
            BFS["BootstrapFewShot"]
            MI["MIPRO"]
            AT["Automatic Tuning"]
        end

        subgraph Evaluators["Evaluators"]
            AM["Accuracy Metrics"]
            UF["User Feedback"]
            AB["A/B Testing"]
        end
    end

    Signatures --> Modules
    Modules --> Optimizers
    Optimizers --> Evaluators
```

## Security & Privacy Architecture

```mermaid
graph TB
    subgraph Security["SECURITY LAYERS"]
        subgraph ClientSide["CLIENT-SIDE SECURITY"]
            IV["Input Validation"]
            XSS["XSS Protection"]
            CSRF["CSRF Protection"]
            CSP["Content Security Policy"]
        end

        subgraph Transport["TRANSPORT SECURITY"]
            HTTPS["HTTPS/TLS 1.3"]
            WSS["WSS WebSockets"]
            CP["Certificate Pinning"]
        end

        subgraph ServerSide["SERVER-SIDE SECURITY"]
            AUTH["Authentication"]
            AUTHZ["Authorization"]
            RL["Rate Limiting"]
            IS["Input Sanitization"]
            SQL["SQL Injection Prevention"]
        end

        subgraph DataRest["DATA-AT-REST ENCRYPTION"]
            AES["AES-256"]
            DB["Database Encryption"]
            FE["File Encryption"]
        end

        subgraph DataTransit["DATA-IN-TRANSIT ENCRYPTION"]
            TLS["TLS 1.3"]
            E2E["End-to-End"]
            WS["WebSocket Security"]
        end

        subgraph Privacy["PRIVACY CONTROLS"]
            DM["Data Minimization"]
            PL["Purpose Limitation"]
            UC["User Consent"]
            RD["Right to Delete"]
            DP["Data Portability"]
        end
    end
```

## Deployment Architecture

```mermaid
graph TB
    subgraph VercelEdge["VERCEL EDGE NETWORK"]
        subgraph USEast["US-EAST-1 (Primary)"]
            USA_App["Next.js App"]
            USA_Edge["Edge Functions"]
            USA_Static["Static Assets"]
        end

        subgraph EUWest["EU-WEST-1 (Secondary)"]
            EU_App["Next.js App"]
            EU_Edge["Edge Functions"]
            EU_Static["Static Assets"]
        end

        subgraph AsiaPac["ASIA-PAC-1 (Secondary)"]
            ASIA_App["Next.js App"]
            ASIA_Edge["Edge Functions"]
            ASIA_Static["Static Assets"]
        end
    end

    subgraph GlobalServices["GLOBAL SERVICES"]
        subgraph ConvexService["CONVEX DATABASE"]
            MR["Multi-Region Replication"]
        end

        subgraph ClerkService["CLERK AUTHENTICATION"]
            GIP["Global Identity Provider"]
        end

        subgraph GeminiService["GOOGLE GEMINI AI"]
            AG["API Gateway"]
            RateL["Rate Limits"]
        end

        subgraph MonitoringService["MONITORING & ANALYTICS"]
            VA["Vercel Analytics"]
            ET["Error Tracking"]
        end
    end

    USEast --> GlobalServices
    EUWest --> GlobalServices
    AsiaPac --> GlobalServices
```

## Performance Optimization Architecture

```mermaid
graph TB
    subgraph Performance["PERFORMANCE STRATEGIES"]
        subgraph Frontend["FRONTEND OPTIMIZATION"]
            CS["Code Splitting"]
            LL["Lazy Loading"]
            IO["Image Optimization"]
            BA["Bundle Analysis"]
            TS["Tree Shaking"]
            PF["Prefetching"]
        end

        subgraph Backend["BACKEND OPTIMIZATION"]
            DI["Database Indexing"]
            QO["Query Optimization"]
            CP["Connection Pooling"]
            BC["Caching"]
        end

        subgraph AI["AI OPTIMIZATION"]
            PC["Prompt Caching"]
            BP["Batch Processing"]
            RC["Result Caching"]
            RL["Rate Limiting"]
            AP["Async Processing"]
            PQ["Priority Queue"]
        end

        subgraph Caching["CACHING STRATEGY"]
            BrC["Browser Cache"]
            CDNC["CDN Cache"]
            AC["API Cache"]
            DC["Database Cache"]
            MC["Memory Cache"]
            DiC["Disk Cache"]
        end

        subgraph Monitoring["MONITORING & ALERTING"]
            PM["Performance Metrics"]
            ET["Error Tracking"]
            UA["User Analytics"]
            UM["Uptime Monitoring"]
        end

        subgraph Scalability["SCALABILITY PLANNING"]
            AS["Auto Scaling"]
            LB["Load Balancing"]
            DS["Database Sharding"]
            HS["Horizontal Scaling"]
        end
    end
```
