# Implementation Specifications

## Overview

This document outlines the technical architecture, pipeline design, and implementation details for the Relationship Health Scoring system in the Resonant application.

## DSPy Pipeline Architecture

### Core Module Structure

```python
class RelationshipHealthScorer(dspy.Module):
    def __init__(self):
        self.sentiment_analyzer = SentimentAnalysis()
        self.stability_calculator = EmotionalStability()
        self.energy_detector = EnergyImpactDetector()
        self.conflict_analyzer = ConflictResolutionAnalyzer()
        self.gratitude_detector = GratitudeDetector()
        self.frequency_calculator = CommunicationFrequency()

    def forward(self, entries, relationship_data):
        # Process each component
        # Apply temporal weighting
        # Calculate final score
        # Return score with confidence and breakdown
```

### Component Module Specifications

#### Sentiment Analysis Module

```python
class SentimentAnalysis(dspy.Signature):
    journal_entry = dspy.InputField(desc="User's journal entry text")
    sentiment_score = dspy.OutputField(desc="Sentiment score 1-10, where 1=very negative, 10=very positive")
    emotions_detected = dspy.OutputField(desc="List of emotions found with individual scores")
    confidence = dspy.OutputField(desc="AI confidence in analysis 0-1")
```

#### Emotional Stability Module

```python
class EmotionalStability(dspy.Signature):
    sentiment_history = dspy.InputField(desc="Historical sentiment scores with timestamps")
    stability_score = dspy.OutputField(desc="Emotional stability score 0-100")
    recovery_patterns = dspy.OutputField(desc="Analysis of recovery from negative events")
    consistency_rating = dspy.OutputField(desc="Rating of emotional consistency")
```

#### Energy Impact Detector

```python
class EnergyImpactDetector(dspy.Signature):
    journal_entry = dspy.InputField(desc="User's journal entry text")
    energy_level = dspy.OutputField(desc="Energy impact score -50 to +50")
    energizing_factors = dspy.OutputField(desc="List of energizing elements detected")
    draining_factors = dspy.OutputField(desc="List of draining elements detected")
```

#### Conflict Resolution Analyzer

```python
class ConflictResolutionAnalyzer(dspy.Signature):
    entry_sequence = dspy.InputField(desc="Sequence of entries showing conflict progression")
    resolution_quality = dspy.OutputField(desc="Quality of conflict resolution 0-100")
    resolution_timeline = dspy.OutputField(desc="Time taken to resolve conflict")
    improvement_indicators = dspy.OutputField(desc="Evidence of relationship improvement")
```

#### Gratitude Detector

```python
class GratitudeDetector(dspy.Signature):
    journal_entry = dspy.InputField(desc="User's journal entry text")
    gratitude_frequency = dspy.OutputField(desc="Frequency of gratitude expressions")
    gratitude_depth = dspy.OutputField(desc="Depth and specificity of gratitude")
    appreciation_targets = dspy.OutputField(desc="What aspects are being appreciated")
```

## Caching Strategy

### Cache Layers

**Level 1: Real-time Processing**

- **Scope**: New journal entries
- **Duration**: Immediate processing
- **Components**: Sentiment analysis, crisis detection
- **Cache Key**: `entry_id`

**Level 2: Daily Aggregation**

- **Scope**: Daily recalculations
- **Duration**: 24 hours
- **Components**: Emotional stability, energy impact updates
- **Cache Key**: `user_id:relationship_id:date`

**Level 3: Weekly Full Calculation**

- **Scope**: Complete score recalculation
- **Duration**: 7 days
- **Components**: All components with updated weights
- **Cache Key**: `user_id:relationship_id:week`

**Level 4: Event-Triggered Refresh**

- **Scope**: Significant event detection
- **Duration**: Immediate invalidation
- **Components**: Full recalculation
- **Trigger**: Score changes >20 points, crisis detection

### Cache Implementation

```python
class HealthScoreCache:
    def __init__(self):
        self.redis_client = redis.Redis()
        self.cache_ttl = {
            'realtime': 3600,      # 1 hour
            'daily': 86400,        # 24 hours
            'weekly': 604800,      # 7 days
            'display': 300         # 5 minutes for UI
        }

    def get_cached_score(self, user_id, relationship_id, cache_level='display'):
        cache_key = f"health_score:{user_id}:{relationship_id}:{cache_level}"
        return self.redis_client.get(cache_key)

    def invalidate_on_event(self, user_id, relationship_id, event_type):
        if event_type == 'significant_change':
            # Invalidate all cache levels
            self.invalidate_all_levels(user_id, relationship_id)
```

## Processing Pipeline

### Entry Processing Workflow

```python
async def process_journal_entry(entry_data):
    # 1. Immediate crisis detection
    crisis_result = await crisis_detector.analyze(entry_data.text)
    if crisis_result.risk_level >= 'high':
        trigger_crisis_intervention(entry_data.user_id, crisis_result)

    # 2. Real-time sentiment analysis
    sentiment_result = await sentiment_analyzer.analyze(entry_data.text)

    # 3. Update relationship scores
    affected_relationships = extract_relationships(entry_data.text)
    for relationship_id in affected_relationships:
        await update_relationship_score(
            entry_data.user_id,
            relationship_id,
            sentiment_result,
            entry_data.timestamp
        )

    # 4. Schedule background processing
    schedule_daily_recalculation.delay(entry_data.user_id)

    return {
        'status': 'processed',
        'crisis_detected': crisis_result.risk_level,
        'relationships_updated': affected_relationships
    }
```

### Background Processing Jobs

```python
# Daily recalculation job
@celery.task
def daily_relationship_recalculation(user_id):
    relationships = get_user_relationships(user_id)
    for relationship in relationships:
        # Recalculate emotional stability
        stability_score = calculate_emotional_stability(
            user_id, relationship.id, days=30
        )

        # Update energy impact trends
        energy_score = calculate_energy_impact(
            user_id, relationship.id, days=7
        )

        # Update cached scores
        update_relationship_cache(user_id, relationship.id, {
            'stability': stability_score,
            'energy': energy_score,
            'last_updated': datetime.now()
        })

# Weekly full recalculation job
@celery.task
def weekly_full_recalculation(user_id):
    relationships = get_user_relationships(user_id)
    for relationship in relationships:
        # Full algorithm run with all components
        full_score = calculate_full_health_score(user_id, relationship.id)

        # Update confidence metrics
        confidence_score = calculate_confidence_metrics(user_id, relationship.id)

        # Store final scores
        store_health_score(user_id, relationship.id, full_score, confidence_score)
```

## API Endpoints

### Score Retrieval API

```python
@app.route('/api/relationships/<relationship_id>/health-score')
@auth_required
def get_health_score(relationship_id):
    user_id = get_current_user_id()

    # Check cache first
    cached_score = cache.get_cached_score(user_id, relationship_id)
    if cached_score and not is_stale(cached_score):
        return jsonify(cached_score)

    # Calculate if not cached
    score_data = calculate_relationship_health_score(user_id, relationship_id)

    # Cache result
    cache.store_score(user_id, relationship_id, score_data)

    return jsonify({
        'relationship_id': relationship_id,
        'health_score': score_data.score,
        'confidence': score_data.confidence,
        'components': score_data.component_breakdown,
        'last_updated': score_data.timestamp,
        'trend': score_data.trend_direction
    })
```

### Score History API

```python
@app.route('/api/relationships/<relationship_id>/health-history')
@auth_required
def get_health_history(relationship_id):
    user_id = get_current_user_id()
    days = request.args.get('days', 90, type=int)

    history = get_score_history(user_id, relationship_id, days)

    return jsonify({
        'relationship_id': relationship_id,
        'history': [
            {
                'date': entry.date,
                'score': entry.score,
                'components': entry.component_scores,
                'significant_events': entry.events
            }
            for entry in history
        ],
        'trends': calculate_trends(history)
    })
```

## Database Schema

### Core Tables

```sql
-- Relationship health scores
CREATE TABLE relationship_health_scores (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    relationship_id INTEGER NOT NULL,
    health_score DECIMAL(5,2) NOT NULL,
    confidence_score DECIMAL(4,3) NOT NULL,
    component_scores JSONB NOT NULL,
    calculated_at TIMESTAMP DEFAULT NOW(),
    data_version INTEGER DEFAULT 1,
    INDEX idx_user_relationship (user_id, relationship_id),
    INDEX idx_calculated_at (calculated_at)
);

-- Component calculations cache
CREATE TABLE health_score_components (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    relationship_id INTEGER NOT NULL,
    component_type VARCHAR(50) NOT NULL,
    component_score DECIMAL(5,2) NOT NULL,
    component_data JSONB,
    calculated_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP NOT NULL,
    UNIQUE KEY unique_component (user_id, relationship_id, component_type)
);

-- Crisis events (minimal data for safety)
CREATE TABLE crisis_events (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    risk_level VARCHAR(20) NOT NULL,
    intervention_shown BOOLEAN DEFAULT FALSE,
    user_response VARCHAR(50),
    follow_up_needed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    resolved_at TIMESTAMP NULL,
    INDEX idx_user_follow_up (user_id, follow_up_needed)
);
```

## Error Handling & Resilience

### AI Service Failures

```python
class AIServiceFallback:
    def __init__(self):
        self.fallback_strategies = {
            'sentiment': self.fallback_sentiment_analysis,
            'crisis': self.fallback_crisis_detection,
            'energy': self.fallback_energy_analysis
        }

    async def analyze_with_fallback(self, text, analysis_type):
        try:
            # Primary AI service call
            result = await primary_ai_service.analyze(text, analysis_type)
            return result
        except AIServiceException as e:
            # Log error and use fallback
            logger.warning(f"AI service failed for {analysis_type}: {e}")
            return self.fallback_strategies[analysis_type](text)

    def fallback_sentiment_analysis(self, text):
        # Simple keyword-based sentiment as fallback
        positive_words = set(['happy', 'joy', 'love', 'great', 'wonderful'])
        negative_words = set(['sad', 'angry', 'hate', 'terrible', 'awful'])

        words = text.lower().split()
        positive_count = sum(1 for word in words if word in positive_words)
        negative_count = sum(1 for word in words if word in negative_words)

        # Simple scoring
        if positive_count > negative_count:
            return {'sentiment_score': 7, 'confidence': 0.3}
        elif negative_count > positive_count:
            return {'sentiment_score': 4, 'confidence': 0.3}
        else:
            return {'sentiment_score': 5.5, 'confidence': 0.2}
```

### Database Resilience

```python
class DatabaseResilience:
    def __init__(self):
        self.connection_pool = create_connection_pool()
        self.retry_attempts = 3
        self.circuit_breaker = CircuitBreaker()

    @retry(attempts=3, delay=1, backoff=2)
    async def execute_with_retry(self, query, params=None):
        if self.circuit_breaker.is_open():
            raise DatabaseUnavailableException("Circuit breaker open")

        try:
            async with self.connection_pool.acquire() as conn:
                result = await conn.execute(query, params)
                self.circuit_breaker.record_success()
                return result
        except Exception as e:
            self.circuit_breaker.record_failure()
            raise e
```
