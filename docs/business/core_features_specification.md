# Core Features Specification

## Product Concept

A mindful relationship management web application that helps users track and improve their relationship health through AI-powered journal analysis.

**Core Problem:** It's hard to be consistent in judging how healthy our relationships are.

**Solution:** Use a standard set of metrics and an unbiased 3rd party (AI) to evaluate feelings about relationships over time through journal entries.

## Target Users

People who want to mindfully manage relationships and improve their emotional connections with others.

## Core Features

### 1. Journal Input & Experience

**Writing Experience:**

- Smart prompts: "How did you feel after talking with [relationship]?"
- Contextual triggers: "It's been 3 days since you wrote about [partner], how are things?"
- Emotional state selector: Pre-writing mood check-in
- Relationship picker: Tag entries with specific people
- Privacy levels: Mark entries as private/shareable with AI analysis
- Rich text formatting: Bold important moments, bullet points for lists

**Input Methods:**

- Voice journaling: Speak naturally, auto-transcribe
- Quick voice memos: 30-second relationship check-ins
- Template-based entries: "Gratitude," "Conflict," "Quality Time," "Communication"
- Stream-of-consciousness mode: Unstructured free writing
- Structured reflection: Guided questions about specific interactions

**Workflow Features:**

- Daily/weekly reminder notifications
- Entry scheduling: "Reflect on dinner conversation later tonight"
- Draft saving: Continue complex entries across sessions
- Entry linking: Reference previous entries about same person/situation
- Bulk emotion tagging: Select multiple feelings per entry

**User Experience:**

- Distraction-free writing environment
- Word count goals: Encourage deeper reflection
- Writing streaks: Gamify consistency
- Entry search: Find past reflections quickly

### 2. Reminder Notifications

**Smart Timing:**

- Adaptive scheduling: Learn user's natural journaling patterns
- Life event triggers: Remind after birthdays, anniversaries, conflicts
- Emotional state reminders: "You seemed stressed about [relationship] yesterday, how are you feeling now?"
- Conversation follow-ups: "How did that difficult conversation with [person] go?"
- Weekly relationship check-ins: Rotate focus between different relationships

**Contextual Reminders:**

- Gap detection: "It's been 2 weeks since you wrote about [friend]"
- Pattern-based: "You usually reflect on Sundays, want to journal?"
- Mood-sensitive timing: Avoid reminders during detected low periods
- Location-aware: Remind when arriving home (safe space for reflection)
- Calendar integration: Remind after events involving tracked relationships

**Personalized Prompts:**

- Relationship-specific questions: Tailored to each person's dynamics
- Growth-focused: "What's one thing [partner] did that made you smile?"
- Challenge-oriented: "Ready to reflect on that challenging conversation?"
- Gratitude triggers: "Share something you appreciate about [family member]"
- Goal-driven: Based on relationship improvement intentions

**Notification Types:**

- Gentle nudges: Soft browser notifications
- Email digests: Weekly relationship reflection summaries
- Progressive urgency: Escalate reminder frequency if user is disconnected
- Celebration alerts: "You've journaled 7 days straight!"

**User Control:**

- Snooze options: "Remind me in 2 hours/tomorrow/next week"
- Frequency settings: Daily/weekly/custom per relationship
- Quiet hours: No notifications during work/sleep
- Relationship prioritization: More frequent reminders for key relationships

### 3. AI Analysis & Insights

**Sentiment & Emotional Analysis:**

- Emotional trajectory mapping: Track mood changes over time per relationship
- Trigger pattern detection: Identify what causes stress/joy in each relationship
- Emotional vocabulary expansion: Help users identify nuanced feelings
- Comparative sentiment: How you feel about different relationships
- Seasonal/cyclical patterns: Holiday stress, anniversary effects
- Recovery time analysis: How long to bounce back from conflicts

**Communication Pattern Recognition:**

- Interaction frequency analysis: Quality vs quantity of contact
- Communication style shifts: Changes in how you discuss each person
- Topic clustering: What you most often discuss with each relationship
- Appreciation vs complaint ratios: Balance of positive/negative mentions
- Conflict resolution effectiveness: Track resolution patterns over time
- Unspoken concerns detection: Identify avoided topics or suppressed feelings

**Relationship Health Metrics:**

- Trust indicators: Language patterns showing confidence/doubt
- Boundary health scoring: Respect for personal limits
- Energy impact assessment: Energizing vs draining relationship patterns
- Growth trajectory: Is the relationship improving/declining/stable?
- Reciprocity balance: Giving vs receiving emotional support
- Authenticity levels: How genuine you feel in each relationship

**Predictive Insights:**

- Stress warning signals: Early detection of relationship strain
- Positive momentum identification: Recognize when things are improving
- Anniversary/milestone reminders: Important dates approaching
- Intervention suggestions: When to have important conversations

### 4. Relationship Dashboard

**Individual Relationship Views:**

- Health score cards: Color-coded overall relationship wellness (0-100)
- Relationship timelines: Interactive history of key moments/milestones
- Mood correlation charts: How this relationship affects your overall wellbeing
- Communication frequency graphs: Patterns of interaction over time
- Growth trajectory indicators: Visual arrows showing improvement/decline trends
- Energy impact meters: Energizing vs draining relationship visual

**Comparative Overview:**

- Relationship portfolio view: All relationships at a glance
- Health score ranking: Which relationships are thriving/struggling
- Time investment vs satisfaction scatter plots
- Balance indicators: Family vs friends vs romantic vs professional ratios
- Support network visualization: Who you rely on for different needs
- Relationship diversity metrics: Variety in your social connections

**Trend Analysis & Alerts:**

- Weekly/monthly/yearly trend lines: Long-term relationship patterns
- Declining relationship warnings: Early intervention alerts
- Positive momentum celebrations: Highlight improving relationships
- Seasonal pattern recognition: Holiday/anniversary impact visualization
- Milestone countdown timers: Important dates approaching
- Goal progress tracking: Relationship improvement objectives

**Interactive Features:**

- Drill-down capabilities: Click health scores to see detailed analysis
- Date range filtering: Focus on specific time periods
- Relationship comparison tool: Side-by-side analysis
- Export functionality: PDF reports for reflection/sharing
- Dashboard customization: Choose which metrics matter most to you

### 5. Actionable Guidance

**Personalized Relationship Improvement Suggestions:**

- Communication style recommendations: "Try asking more open-ended questions with [partner]"
- Timing-based advice: "Good time to reach out to [friend], they seem stressed lately"
- Appreciation reminders: "You haven't expressed gratitude to [family member] in 3 weeks"
- Boundary reinforcement prompts: "Consider setting limits around [specific behavior]"
- Quality time suggestions: Activities tailored to each relationship's interests
- Conflict resolution pathways: Step-by-step guides based on relationship patterns

**Conversation Starters & Scripts:**

- Check-in templates: "How are you feeling about..." conversation openers
- Difficult conversation frameworks: Structured approaches for sensitive topics
- Appreciation expressions: Specific ways to show gratitude to each person
- Boundary-setting scripts: Kind but firm language for setting limits
- Repair attempts: How to reconnect after conflicts or distance
- Deeper connection prompts: Questions to build intimacy and understanding

**Proactive Intervention Guidance:**

- Early warning responses: What to do when AI detects relationship strain
- Celebration suggestions: How to acknowledge relationship milestones
- Support offering prompts: When/how to offer help during their difficult times
- Self-care recommendations: When to step back and protect your energy
- Professional help indicators: When to suggest therapy/counseling

**Growth-Oriented Actions (Opt-In "Relationship Focus Mode"):**

- Activation Triggers: User-initiated, AI suggestion, dashboard action, crisis response
- 30/60/90-day improvement plans: Structured relationship enhancement programs
- Weekly challenges: Small, actionable steps toward better connection
- Progress tracking: Measure improvement against baseline metrics
- Milestone celebrations: Acknowledge relationship growth wins
- Graduated intensity: Light touch → moderate → intensive guidance levels
- Relationship-specific activation: Only for selected relationships
- Customizable intensity: Choose level of guidance/reminders
- Exit anytime: Return to passive monitoring mode
- Success graduation: Automatically suggest ending focus mode when goals met

## Relationship Creation Features

### Core Functionality

- **Add new relationship:** name, relationship type, optional photo
- **Relationship types:** family, friend, romantic, colleague, etc.
- **Basic relationship list:** view all tracked relationships
- **Edit/delete relationships**
- **Quick relationship picker** during journal entry

### Integration Points

- **Onboarding flow:** Set up key relationships first
- **Journal entry tagging:** Assign entries to existing relationships
- **Dashboard organization:** Group insights by relationship
- **AI analysis context:** Understand relationship dynamics better

## Privacy & Security

### Essential Data Protection

- **Automatic encryption at rest:** Data encrypted in cloud database automatically
- **HTTPS/TLS for data in transit:** Secure communication between browser and server
- **Database access controls:** Restrict who can access user data on backend
- **Regular automated backups:** Secure data recovery without user complexity

### User Control & Transparency

- **Data portability:** Export all journal entries and insights anytime
- **Selective AI analysis:** Mark specific entries as "private" (no AI processing)
- **Clear data usage policy:** Transparent about what Gemini Flash analyzes
- **Account deletion:** Complete data removal option
- **Data retention controls:** Simple settings for how long to keep old entries

### Trust & Compliance

- **Privacy-first design:** Collect only necessary data for functionality
- **GDPR/CCPA compliance:** Basic right to deletion and data export
- **Secure API integration:** Proper handling of Gemini Flash API calls
- **Session management:** Automatic logout after inactivity
- **Relationship pseudonymization:** Use initials/codes instead of full names in AI processing

### Simple Security

- **Strong password requirements:** Basic account security
- **Password reset flows:** Secure account recovery
- **Rate limiting:** Prevent brute force attacks
