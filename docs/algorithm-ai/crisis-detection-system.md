# Crisis Detection & Safety System

## Overview

The Crisis Detection & Safety System is designed to identify concerning patterns in user journal entries that may indicate mental health crises, relationship abuse, or self-harm risk. This system provides immediate intervention resources while maintaining user privacy and avoiding false positives.

## Crisis Pattern Detection Algorithm

### Primary Detection Method

Real-time AI analysis of journal entries using dedicated DSPy signature:

```python
class CrisisDetection(dspy.Signature):
    journal_entry = dspy.InputField(desc="User's journal entry text")
    crisis_risk_level = dspy.OutputField(desc="Risk level: none, low, moderate, high, critical")
    risk_factors = dspy.OutputField(desc="List of specific risk factors detected")
    confidence = dspy.OutputField(desc="AI confidence in risk assessment 0-1")
    recommended_action = dspy.OutputField(desc="Suggested intervention level")
```

## Crisis Indicators & Thresholds

### 1. Self-Harm Language Detection

**Keywords/Phrases** (High Priority):

- Direct: "kill myself", "end it all", "not worth living", "want to die"
- Indirect: "everyone would be better off", "can't go on", "no way out"
- Methods: "pills", "bridge", "rope", specific methods

**Threshold**: Any detection = Immediate Crisis Alert

### 2. Abuse Pattern Detection

**Physical Abuse Indicators**:

- Violence: "hit me", "pushed me", "hurt me", "bruises", "afraid"
- Escalation: "getting worse", "more violent", "scared for safety"

**Emotional/Control Abuse Indicators**:

- Isolation: "won't let me see", "controls who I talk to"
- Threats: "threatened to", "said he would", "if I leave"
- Control: "checks my phone", "won't let me work", "controls money"

**Threshold**: 2+ indicators in single entry OR pattern across 3 entries = Crisis Alert

### 3. Hopelessness & Depression Escalation

**Severe Depression Language**:

- "no point", "nothing matters", "empty inside", "completely alone"
- "can't feel anything", "numb", "worthless", "burden"

**Threshold**: 3+ severe indicators + health score <15 = Crisis Alert

### 4. Relationship Health Score Crisis

**Score-Based Triggers**:

- ALL relationship scores below 20 for 2+ weeks
- Primary relationship (most-written-about) below 10 for 1+ week
- Sudden score drop >30 points with concerning language

## Technical Implementation

### Real-Time Processing Pipeline

```python
class CrisisDetectionPipeline(dspy.Module):
    def __init__(self):
        self.crisis_detector = CrisisDetection()
        self.risk_assessor = RiskLevelAssessment()
        self.intervention_router = InterventionRouter()

    def process_entry(self, entry_text, user_context):
        # 1. Immediate crisis language scan
        crisis_analysis = self.crisis_detector(entry_text)

        # 2. Historical pattern analysis
        pattern_risk = self.assess_patterns(user_context)

        # 3. Combined risk assessment
        final_risk = self.calculate_combined_risk(crisis_analysis, pattern_risk)

        # 4. Trigger intervention if needed
        if final_risk >= CRISIS_THRESHOLD:
            return self.intervention_router(final_risk, crisis_analysis)
```

### Processing Timeline

- **Real-time**: Crisis language detection (<2 seconds)
- **Background**: Pattern analysis within 30 seconds
- **Intervention**: Pop-up triggered immediately upon detection

### Data Storage & Privacy

```python
# Crisis event logging (for safety, minimal data)
crisis_event = {
    "user_id": user_id,
    "timestamp": datetime.now(),
    "risk_level": "high",
    "intervention_shown": True,
    "user_response": "acknowledged_safety", # or "declined_help"
    "entry_id": None,  # NO content stored for privacy
    "follow_up_needed": True
}
```

## Intervention Response System

### Crisis Alert Levels

**CRITICAL (Immediate Pop-up)**:

- Self-harm language detected
- Abuse with immediate danger
- Score <10 + hopelessness language

**HIGH (Enhanced Safety Check)**:

- Multiple abuse indicators
- Severe depression + isolation
- All scores <20 for 2+ weeks

**MODERATE (Contextual Resources)**:

- Single concerning indicator
- Declining score trends
- Stress escalation patterns

### Pop-up Safety Check Implementation

```javascript
// Crisis intervention modal (cannot be dismissed easily)
const CrisisInterventionModal = {
  trigger: 'immediate', // on detection
  dismissible: false, // requires user action
  content: {
    title: "🚨 We're Concerned About You",
    emergency: {
      display: "If you're in immediate danger: Call 911",
      action: 'tel:911',
    },
    crisis_line: {
      display: '📞 988 Suicide & Crisis Lifeline',
      action: 'tel:988',
    },
    text_line: {
      display: '💬 Text HELLO to 741741',
      action: 'sms:741741',
    },
    chat_option: {
      display: '🌐 Chat with crisis counselor',
      action: 'https://suicidepreventionlifeline.org/chat/',
    },
  },
  required_actions: [
    'acknowledge_safety',
    'contact_professional',
    'emergency_services',
  ],
}
```

## Quality Assurance & Validation

### False Positive Management

- **Manual Review**: Sample crisis detections for accuracy
- **User Feedback**: "Was this helpful?" after interventions
- **Adjustment Learning**: Reduce sensitivity for creative writing, song lyrics

### Testing Strategy

- **Test Set**: Known crisis vs non-crisis journal entries
- **Sensitivity Target**: 95% detection of genuine crisis language
- **Specificity Target**: <5% false positive rate
- **Response Time**: <2 seconds for crisis detection

### Monitoring & Alerts

- **Daily Reports**: Number of crisis interventions triggered
- **Pattern Analysis**: Common false positives to address
- **Effectiveness Tracking**: User engagement with safety resources

## Legal & Ethical Framework

### Disclaimer Integration

```
Crisis Detection Notice:
"Our AI attempts to identify concerning patterns but is not a substitute
for professional assessment. False positives and missed signals can occur.
Always trust your judgment and seek immediate help if you're in crisis."
```

### Data Handling

- **Minimal Logging**: Crisis events logged without content
- **No Profiling**: Crisis detection doesn't affect product recommendations
- **Deletion Rights**: Users can request crisis event history deletion
- **Professional Boundaries**: Clear messaging about AI limitations

### Staff Training Requirements

- Customer support trained on crisis intervention basics
- Escalation procedures for crisis-related user contacts
- Regular updates on crisis detection system performance
