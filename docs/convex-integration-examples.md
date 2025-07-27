# Convex Integration Examples

This document provides practical examples of how to use the React hooks with your Convex backend functions in Resonant components.

## Table of Contents

1. [Basic Component Usage](#basic-component-usage)
2. [Dashboard Components](#dashboard-components)
3. [Form Components](#form-components)
4. [Error Handling Patterns](#error-handling-patterns)
5. [Performance Optimization](#performance-optimization)
6. [Real-time Updates](#real-time-updates)

## Basic Component Usage

### User Profile Component

```tsx
import React from 'react'
import { useUser } from '@/hooks/convex'

export const UserProfile = () => {
  const { user, isLoading, isPremium, updatePreferences } = useUser()

  if (isLoading) return <div>Loading...</div>
  if (!user) return <div>Please sign in</div>

  const handleThemeChange = async (theme: 'light' | 'dark') => {
    const result = await updatePreferences({
      userId: user._id,
      preferences: { theme },
    })

    if (result.success) {
      console.log('Theme updated successfully')
    } else {
      console.error('Failed to update theme:', result.error)
    }
  }

  return (
    <div className="user-profile">
      <h2>Welcome, {user.name}!</h2>
      <p>Tier: {isPremium ? 'Premium' : 'Free'}</p>

      <button onClick={() => handleThemeChange('dark')}>
        Switch to Dark Mode
      </button>
    </div>
  )
}
```

### Relationships List Component

```tsx
import React from 'react'
import { useRelationships } from '@/hooks/convex'

export const RelationshipsList = ({ userId }: { userId: string }) => {
  const {
    relationships,
    isLoading,
    isEmpty,
    byType,
    createRelationship,
    deleteRelationship,
  } = useRelationships(userId)

  const handleCreateRelationship = async () => {
    const result = await createRelationship({
      userId,
      name: 'New Relationship',
      type: 'friend',
    })

    if (result.success) {
      console.log('Relationship created:', result.relationshipId)
    }
  }

  if (isLoading) return <div>Loading relationships...</div>
  if (isEmpty)
    return (
      <div>
        <p>No relationships yet.</p>
        <button onClick={handleCreateRelationship}>
          Add Your First Relationship
        </button>
      </div>
    )

  return (
    <div className="relationships-list">
      <h3>Your Relationships ({relationships.length})</h3>

      {/* Filter by type */}
      <div className="relationship-types">
        <div>Partners: {byType('partner').length}</div>
        <div>Family: {byType('family').length}</div>
        <div>Friends: {byType('friend').length}</div>
      </div>

      {/* List all relationships */}
      {relationships.map(relationship => (
        <div key={relationship._id} className="relationship-card">
          <h4>{relationship.name}</h4>
          <p>Type: {relationship.type}</p>
          <p>Initials: {relationship.initials}</p>

          <button
            onClick={() => deleteRelationship(relationship._id, userId)}
            className="delete-btn"
          >
            Delete
          </button>
        </div>
      ))}
    </div>
  )
}
```

## Dashboard Components

### Main Dashboard

```tsx
import React from 'react'
import { useResonantApp } from '@/hooks/convex'

export const Dashboard = () => {
  const { isLoading, appMetrics, appStatus, dashboardData, quickActions } =
    useResonantApp()

  if (isLoading) return <div>Loading dashboard...</div>

  return (
    <div className="dashboard">
      {/* User Overview */}
      <section className="user-overview">
        <h2>Welcome back, {dashboardData.user.name}!</h2>
        <div className="user-stats">
          <div>Tier: {dashboardData.user.tier}</div>
          <div>Member since: {dashboardData.user.memberSince}</div>
        </div>
      </section>

      {/* Quick Stats */}
      <section className="quick-stats">
        <div className="stat-card">
          <h3>Relationships</h3>
          <div className="stat-value">{appMetrics.totalRelationships}</div>
          <div className="stat-detail">
            {dashboardData.relationships.healthyCount} healthy,
            {dashboardData.relationships.needsAttentionCount} need attention
          </div>
        </div>

        <div className="stat-card">
          <h3>Journal Entries</h3>
          <div className="stat-value">{appMetrics.totalJournalEntries}</div>
          <div className="stat-detail">
            Current streak: {appMetrics.journalStreak} days
          </div>
        </div>

        <div className="stat-card">
          <h3>Health Score</h3>
          <div className="stat-value">
            {Math.round(appMetrics.averageHealthScore)}
          </div>
          <div className="stat-detail">
            {appStatus.isHealthy ? 'Looking good!' : 'Needs attention'}
          </div>
        </div>

        <div className="stat-card">
          <h3>Insights</h3>
          <div className="stat-value">{appMetrics.totalInsights}</div>
          <div className="stat-detail">{appMetrics.urgentInsights} urgent</div>
        </div>
      </section>

      {/* Action Items */}
      {appStatus.needsAttention && (
        <section className="action-items">
          <h3>⚠️ Needs Your Attention</h3>

          {appMetrics.relationshipsNeedingAttention > 0 && (
            <div className="alert">
              {appMetrics.relationshipsNeedingAttention} relationships need
              attention
            </div>
          )}

          {appMetrics.urgentInsights > 0 && (
            <div className="alert">
              {appMetrics.urgentInsights} urgent insights waiting
            </div>
          )}
        </section>
      )}

      {/* Quick Actions */}
      <section className="quick-actions">
        <button onClick={() => quickActions.createJournalEntry}>
          New Journal Entry
        </button>

        <button onClick={() => quickActions.createRelationship}>
          Add Relationship
        </button>

        {appMetrics.pendingAnalyses > 0 && (
          <button onClick={() => quickActions.queueAnalysis}>
            Process Pending Analysis
          </button>
        )}
      </section>
    </div>
  )
}
```

### Health Scores Dashboard

```tsx
import React from 'react'
import { useHealthScores } from '@/hooks/convex'

export const HealthScoresDashboard = ({ userId }: { userId: string }) => {
  const {
    summary,
    healthScores,
    getScoreLabel,
    getScoreColor,
    getTrendIcon,
    forceRecalculate,
  } = useHealthScores(userId)

  const handleRecalculate = async () => {
    const result = await forceRecalculate({ userId })
    if (result.success) {
      console.log('Health scores recalculated')
    }
  }

  return (
    <div className="health-scores-dashboard">
      <div className="dashboard-header">
        <h2>Relationship Health</h2>
        <button onClick={handleRecalculate}>Recalculate Scores</button>
      </div>

      {/* Summary Stats */}
      <div className="summary-stats">
        <div className="summary-card">
          <h3>Overall Average</h3>
          <div
            className="score-value"
            style={{ color: getScoreColor(summary?.averageScore || 0) }}
          >
            {summary?.averageScore || 0}
          </div>
          <div className="score-label">
            {getScoreLabel(summary?.averageScore || 0)}
          </div>
        </div>

        <div className="summary-card">
          <h3>Distribution</h3>
          <div className="distribution">
            <div>Excellent: {summary?.scoreDistribution.excellent}</div>
            <div>Good: {summary?.scoreDistribution.good}</div>
            <div>Fair: {summary?.scoreDistribution.fair}</div>
            <div>Poor: {summary?.scoreDistribution.poor}</div>
          </div>
        </div>

        <div className="summary-card">
          <h3>Trends</h3>
          <div className="trends">
            <div>↗️ Improving: {summary?.improving}</div>
            <div>→ Stable: {summary?.stable}</div>
            <div>↘️ Declining: {summary?.declining}</div>
          </div>
        </div>
      </div>

      {/* Individual Scores */}
      <div className="individual-scores">
        {healthScores.map(score => (
          <div key={score._id} className="score-card">
            <div className="score-header">
              <h4>{score.relationship?.name}</h4>
              <span className="trend-icon">
                {getTrendIcon(score.trendDirection)}
              </span>
            </div>

            <div
              className="score-value"
              style={{ color: getScoreColor(score.score) }}
            >
              {score.score}
            </div>

            <div className="score-details">
              <div>Confidence: {Math.round(score.confidence * 100)}%</div>
              <div>Trend: {score.trendDirection}</div>
              {score.isStale && (
                <div className="stale-warning">
                  ⚠️ Score is {score.daysOld} days old
                </div>
              )}
            </div>

            {/* Factor Breakdown */}
            <div className="factor-breakdown">
              <div>Communication: {score.factorBreakdown.communication}</div>
              <div>Support: {score.factorBreakdown.emotional_support}</div>
              <div>Conflict: {score.factorBreakdown.conflict_resolution}</div>
              <div>Trust: {score.factorBreakdown.trust_intimacy}</div>
              <div>Growth: {score.factorBreakdown.shared_growth}</div>
            </div>

            {/* Recommendations */}
            {score.recommendations?.length > 0 && (
              <div className="recommendations">
                <h5>Recommendations:</h5>
                <ul>
                  {score.recommendations.slice(0, 2).map((rec, idx) => (
                    <li key={idx}>{rec}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
```

## Form Components

### Journal Entry Form

```tsx
import React, { useState } from 'react'
import { useCreateJournalEntry, useRelationships } from '@/hooks/convex'
import { CreateJournalEntrySchema } from '@/lib/validations/convex-schemas'

export const JournalEntryForm = ({ userId }: { userId: string }) => {
  const [content, setContent] = useState('')
  const [mood, setMood] = useState<string>('')
  const [selectedRelationship, setSelectedRelationship] = useState<string>('')
  const [tags, setTags] = useState<string[]>([])
  const [allowAIAnalysis, setAllowAIAnalysis] = useState(true)

  const { createEntry } = useCreateJournalEntry()
  const { relationshipOptions } = useRelationships(userId)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate with Zod schema
    try {
      const validatedData = CreateJournalEntrySchema.parse({
        userId,
        content,
        mood: mood || undefined,
        relationshipId: selectedRelationship || undefined,
        tags,
        allowAIAnalysis,
      })

      const result = await createEntry(validatedData)

      if (result.success) {
        console.log('Journal entry created:', result.entryId)
        // Reset form
        setContent('')
        setMood('')
        setSelectedRelationship('')
        setTags([])
      } else {
        console.error('Failed to create entry:', result.error)
      }
    } catch (error) {
      console.error('Validation error:', error)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="journal-entry-form">
      <div className="form-group">
        <label htmlFor="content">Journal Entry</label>
        <textarea
          id="content"
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="What's on your mind?"
          rows={6}
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="mood">Mood (optional)</label>
        <select id="mood" value={mood} onChange={e => setMood(e.target.value)}>
          <option value="">Select mood...</option>
          <option value="ecstatic">😄 Ecstatic</option>
          <option value="joyful">😊 Joyful</option>
          <option value="happy">🙂 Happy</option>
          <option value="content">😌 Content</option>
          <option value="calm">😐 Calm</option>
          <option value="neutral">😑 Neutral</option>
          <option value="concerned">😟 Concerned</option>
          <option value="sad">😢 Sad</option>
          <option value="frustrated">😤 Frustrated</option>
          <option value="angry">😠 Angry</option>
          <option value="devastated">😭 Devastated</option>
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="relationship">Related to (optional)</label>
        <select
          id="relationship"
          value={selectedRelationship}
          onChange={e => setSelectedRelationship(e.target.value)}
        >
          <option value="">Select relationship...</option>
          {relationshipOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label} ({option.type})
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={allowAIAnalysis}
            onChange={e => setAllowAIAnalysis(e.target.checked)}
          />
          Allow AI analysis
        </label>
      </div>

      <button type="submit" disabled={content.length < 10}>
        Save Entry
      </button>
    </form>
  )
}
```

## Error Handling Patterns

### Error Boundary Hook

```tsx
import React, { useState } from 'react'
import { useUser } from '@/hooks/convex'

export const UserProfileWithErrorHandling = () => {
  const [error, setError] = useState<string | null>(null)
  const { user, isLoading, updatePreferences } = useUser()

  const handleSafeUpdate = async (preferences: any) => {
    setError(null)

    try {
      const result = await updatePreferences({
        userId: user!._id,
        preferences,
      })

      if (!result.success) {
        setError(result.error || 'Unknown error occurred')
        return
      }

      console.log('Update successful')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error')
    }
  }

  if (isLoading) return <div>Loading...</div>
  if (!user) return <div>Please sign in</div>

  return (
    <div className="user-profile">
      {error && (
        <div className="error-message">
          <strong>Error:</strong> {error}
          <button onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}

      <h2>{user.name}</h2>

      <button onClick={() => handleSafeUpdate({ theme: 'dark' })}>
        Update Theme
      </button>
    </div>
  )
}
```

## Performance Optimization

### Conditional Data Loading

```tsx
import React, { useState } from 'react'
import { useHealthScoresByUser, useHealthScoreHistory } from '@/hooks/convex'

export const OptimizedHealthScores = ({ userId }: { userId: string }) => {
  const [selectedRelationshipId, setSelectedRelationshipId] = useState<
    string | null
  >(null)

  // Always load user's health scores
  const { healthScores, isLoading } = useHealthScoresByUser(userId)

  // Only load detailed history when a relationship is selected
  const { history, chartData } = useHealthScoreHistory(
    selectedRelationshipId || undefined,
    90
  )

  return (
    <div className="health-scores">
      {/* Summary view - always loaded */}
      <div className="scores-list">
        {healthScores.map(score => (
          <div
            key={score._id}
            className="score-item"
            onClick={() => setSelectedRelationshipId(score.relationshipId)}
          >
            <h4>{score.relationship?.name}</h4>
            <div>Score: {score.score}</div>
          </div>
        ))}
      </div>

      {/* Detailed view - only loaded when selected */}
      {selectedRelationshipId && (
        <div className="score-details">
          <h3>Historical Trends</h3>
          {chartData.length > 0 ? (
            <div>
              {/* Render chart with chartData */}
              <p>Chart would go here with {chartData.length} data points</p>
            </div>
          ) : (
            <div>Loading historical data...</div>
          )}
        </div>
      )}
    </div>
  )
}
```

### Memoized Components

```tsx
import React, { memo, useMemo } from 'react'
import { useInsights } from '@/hooks/convex'

export const InsightsPanel = memo(({ userId }: { userId: string }) => {
  const { insights, isLoading, byPriority } = useInsights(userId)

  // Memoize expensive calculations
  const prioritizedInsights = useMemo(() => {
    return {
      urgent: byPriority('urgent'),
      high: byPriority('high'),
      medium: byPriority('medium'),
      low: byPriority('low'),
    }
  }, [byPriority])

  if (isLoading) return <div>Loading insights...</div>

  return (
    <div className="insights-panel">
      {prioritizedInsights.urgent.length > 0 && (
        <section className="urgent-insights">
          <h3>🚨 Urgent</h3>
          {prioritizedInsights.urgent.map(insight => (
            <div key={insight._id} className="insight-card urgent">
              {insight.title}
            </div>
          ))}
        </section>
      )}

      {/* Render other priority levels... */}
    </div>
  )
})

InsightsPanel.displayName = 'InsightsPanel'
```

## Real-time Updates

### Live Health Score Monitoring

```tsx
import React, { useEffect } from 'react'
import { useHealthScoreByRelationship } from '@/hooks/convex'

export const LiveHealthScore = ({
  relationshipId,
}: {
  relationshipId: string
}) => {
  const { healthScore, isLoading, score, isStale } =
    useHealthScoreByRelationship(relationshipId)

  // Automatically refresh stale scores
  useEffect(() => {
    if (isStale) {
      console.log('Health score is stale, should trigger refresh')
      // You could trigger a recalculation here
    }
  }, [isStale])

  return (
    <div className="live-health-score">
      {isLoading && <div>Loading score...</div>}

      {healthScore && (
        <div className="score-display">
          <div className="score-value">{score}</div>
          {isStale && (
            <div className="stale-indicator">
              Score is {healthScore.daysOld} days old
            </div>
          )}
        </div>
      )}
    </div>
  )
}
```

### Real-time Insights

```tsx
import React, { useEffect, useState } from 'react'
import { useInsights } from '@/hooks/convex'

export const LiveInsights = ({ userId }: { userId: string }) => {
  const { insights, unviewedCount, markViewed } = useInsights(userId)
  const [lastViewedTime, setLastViewedTime] = useState(Date.now())

  // Automatically mark new insights as viewed when they appear
  useEffect(() => {
    const newInsights = insights.filter(
      insight =>
        insight.createdAt > lastViewedTime && !insight.userInteraction?.viewedAt
    )

    newInsights.forEach(insight => {
      markViewed(insight._id)
    })

    if (newInsights.length > 0) {
      setLastViewedTime(Date.now())
    }
  }, [insights, lastViewedTime, markViewed])

  return (
    <div className="live-insights">
      <h3>
        Insights
        {unviewedCount > 0 && <span className="badge">{unviewedCount}</span>}
      </h3>

      {insights.map(insight => (
        <div key={insight._id} className="insight-item">
          {insight.title}
        </div>
      ))}
    </div>
  )
}
```

## Usage Tips

### 1. Hook Composition

```tsx
// ✅ Good: Use specific hooks for focused components
const JournalStats = ({ userId }) => {
  const { stats } = useJournalEntryStats(userId)
  return <div>Total entries: {stats.total}</div>
}

// ✅ Good: Use comprehensive hook for dashboard-style components
const Dashboard = () => {
  const { dashboardData, appMetrics } = useResonantApp()
  return <div>{/* Rich dashboard UI */}</div>
}
```

### 2. Error Handling

```tsx
// ✅ Always handle hook errors gracefully
const SafeComponent = () => {
  const { user, isLoading } = useUser()

  if (isLoading) return <LoadingSpinner />
  if (!user) return <SignInPrompt />

  return <UserContent user={user} />
}
```

### 3. Performance

```tsx
// ✅ Use conditional loading for expensive operations
const AnalysisPanel = ({ userId, relationshipId }) => {
  // Only load analysis when relationship is selected
  const { analyses } = useAnalysesByRelationship(
    relationshipId ? relationshipId : undefined
  )

  return relationshipId ? <AnalysisView /> : <SelectRelationshipPrompt />
}
```
