# Core Algorithm Methodology - Relationship Health Scoring

## Executive Summary

This document defines the precise methodology for calculating relationship health scores in the Resonant application. The algorithm combines sentiment analysis, emotional stability, energy impact, conflict resolution, gratitude, and communication frequency to generate a 0-100 health score with adaptive weighting based on data availability.

## Core Algorithm Framework

### Health Score Scale & Interpretation

| Score Range | Color Code | Interpretation    | User Action Guidance         |
| ----------- | ---------- | ----------------- | ---------------------------- |
| 0-30        | Red        | Crisis/Concerning | Immediate attention needed   |
| 31-60       | Yellow     | Needs Attention   | Consider improvement actions |
| 61-80       | Green      | Healthy           | Maintain current patterns    |
| 81-100      | Blue       | Thriving          | Continue and celebrate       |

### Component Weights & Priority

| Component                  | Ideal Weight | Priority | Minimum Data Required |
| -------------------------- | ------------ | -------- | --------------------- |
| 1. Sentiment Analysis      | 35%          | Critical | 3 entries             |
| 2. Emotional Stability     | 25%          | High     | 5 entries             |
| 3. Energy Impact           | 20%          | High     | 3 entries             |
| 4. Conflict Resolution     | 10%          | Medium   | 2 conflict events     |
| 5. Appreciation/Gratitude  | 7%           | Medium   | 3 entries             |
| 6. Communication Frequency | 3%           | Low      | 1 week of data        |

## Detailed Component Specifications

### 1. Sentiment Analysis (35% weight)

**Scale**: 1-10 (1=most negative, 10=most positive)
**Neutral Range**: 4, 5, 6

**Calculation Process**:

1. AI analyzes full journal entry text using Gemini Flash
2. Detects multiple emotions within single entry
3. Calculates average sentiment score across all detected emotions
4. Applies recency weighting (recent entries have higher impact)
5. Applies significant event multiplier for major sentiment swings

**DSPy Signature Example**:

```python
class SentimentAnalysis(dspy.Signature):
    journal_entry = dspy.InputField(desc="User's journal entry text")
    sentiment_score = dspy.OutputField(desc="Sentiment score 1-10, where 1=very negative, 10=very positive")
    emotions_detected = dspy.OutputField(desc="List of emotions found with individual scores")
    confidence = dspy.OutputField(desc="AI confidence in analysis 0-1")
```

**Scoring Formula**:

```
Sentiment_Component = (Weighted_Average_Sentiment - 5.5) / 4.5 * 100
Where:
- Weighted_Average_Sentiment accounts for recency and significant events
- Normalization converts 1-10 scale to contribute to 0-100 health score
```

### 2. Emotional Stability (25% weight)

**Definition**: Measures consistency of emotional experiences and recovery time from negative events.

**Calculation Components**:

- **Base Stability**: Standard deviation of sentiment scores (lower deviation = higher stability)
- **Recovery Factor**: Time-based decay of negative event impact
- **Consistency Bonus**: Reward for sustained positive patterns

**Formula**:

```
Emotional_Stability = (Base_Stability_Score * 0.6) + (Recovery_Score * 0.4)

Base_Stability_Score = max(0, 100 - (StdDev_Sentiment * 20))
Recovery_Score = average(recovery_time_scores_for_negative_events)
```

**Recovery Time Calculation**:

- Track sentiment improvement after scores below 4
- Measure days to return to baseline (5+)
- Apply exponential decay: impact reduces by 50% every 30 days

### 3. Energy Impact (20% weight)

**Definition**: Measures whether the relationship energizes or drains the user based on language patterns and emotional outcomes.

**AI Detection Criteria**:

- **Energizing Indicators**:
  - Words: "inspired", "motivated", "uplifted", "recharged", "excited"
  - Patterns: Increased activity/mood after interactions
  - Future orientation: Plans, goals, positive anticipation
- **Draining Indicators**:
  - Words: "exhausted", "drained", "stressed", "overwhelmed", "burden"
  - Patterns: Decreased mood, avoidance behavior
  - Past/problem orientation: Complaints, regrets, anxiety

**Calculation**:

```
Energy_Impact = (Energizing_Score - Draining_Score + 50)
Where both scores are 0-50 scale, normalized to 0-100
```

### 4. Conflict Resolution Patterns (10% weight)

**Definition**: Evaluates how effectively conflicts and disagreements are handled over time.

**AI Detection of Conflicts**:

- Keywords: "argument", "disagreement", "fight", "conflict", "upset"
- Emotional indicators: Sudden sentiment drops, anger, frustration
- Resolution tracking: Follow-up entries showing improvement

**Resolution Quality Scoring**:

- **Poor Resolution (0-40)**: Ongoing negativity, avoidance, unresolved issues
- **Moderate Resolution (41-70)**: Some improvement but lingering tension
- **Good Resolution (71-100)**: Clear improvement, understanding, stronger bond

**Formula**:

```
Conflict_Resolution = average(resolution_quality_scores) * time_decay_factor
```

### 5. Appreciation/Gratitude Mentions (7% weight)

**Definition**: Frequency and depth of expressing gratitude or appreciation for the relationship.

**AI Detection**:

- Direct expressions: "grateful", "thankful", "appreciate", "blessed"
- Specific appreciations: Actions, qualities, support provided
- Comparative gratitude: "lucky to have", "couldn't do without"

**Scoring**:

```
Gratitude_Score = (Frequency_Score * 0.4) + (Depth_Score * 0.6)
Frequency_Score = min(100, gratitude_mentions_per_month * 10)
Depth_Score = average(specificity_and_emotional_intensity_scores)
```

### 6. Communication Frequency (3% weight)

**Definition**: How often the user writes about this relationship relative to their overall journaling patterns.

**Calculation**:

```
Frequency_Score = min(100, (relationship_entries / total_entries) * optimal_ratio * 100)
Where optimal_ratio = 0.15 (15% of entries about any single relationship is ideal)
```

## Temporal Weighting System

### Recency Weighting Formula

```
Recency_Weight = e^(-days_ago / decay_constant)
Where decay_constant = 45 (entries lose 50% weight after ~31 days)
```

### Significant Event Detection & Weighting

**Detection Criteria**:

- Score changes >10 points from recent baseline (recent = last 7 entries)
- Major life events detected in text (death, marriage, job loss, etc.)
- Relationship status changes (friend to romantic, breakup, etc.)

**Significant Event Multiplier**:

```
If significant_event_detected:
    event_weight = base_recency_weight * 2.5
    event_decay = slower_decay_rate (decay_constant = 90)
```

## Data Quality Adaptive Weighting

### Minimum Data Requirements

| Data Maturity Level           | Adjustment Strategy                                       |
| ----------------------------- | --------------------------------------------------------- |
| New Relationship (<3 entries) | Show "Insufficient Data" instead of score                 |
| Limited Data (3-10 entries)   | Increase Sentiment weight to 50%, reduce Stability to 15% |
| Moderate Data (11-25 entries) | Use standard weights with confidence indicators           |
| Rich Data (25+ entries)       | Full algorithm with all components                        |

### Confidence Scoring

```
Overall_Confidence = (Data_Volume_Confidence * 0.4) +
                    (AI_Analysis_Confidence * 0.3) +
                    (Temporal_Coverage_Confidence * 0.3)
```
