# Database Schema Optimization Recommendations

## Current Issues

### 1. Schema File Size

- **Issue**: `convex/schema.ts` is 1,557 lines, making it difficult to maintain
- **Impact**:
  - Hard to navigate and find specific schemas
  - Increased cognitive load for developers
  - Potential merge conflicts in large teams
  - Slower IDE performance

### 2. Deeply Nested LangExtract Structures

- **Issue**: Lines 294-340 contain deeply nested object definitions
- **Impact**:
  - Complex type inference
  - Difficult to reuse schema components
  - Potential performance implications for large datasets
  - Hard to validate and test

### 3. Schema Organization

- **Issue**: 35+ tables defined in a single file without clear grouping
- **Current table count**: 35 tables identified
- **Complexity**: 77+ nested object definitions

## Recommended Solutions

### 1. Schema Modularization

```typescript
// Split schema into logical modules:
convex/
├── schema/
│   ├── index.ts              // Main schema exports
│   ├── user-schemas.ts       // User, relationships, profiles
│   ├── journal-schemas.ts    // Journal entries, AI analysis
│   ├── langextract-types.ts  // LangExtract structures (created)
│   ├── monitoring-schemas.ts // Health checks, metrics, alerts
│   ├── analytics-schemas.ts  // Usage, performance data
│   └── system-schemas.ts     // Logs, configurations
```

### 2. LangExtract Schema Normalization

#### Current Structure (Problematic)

```typescript
langExtractData: v.optional(v.object({
  structuredData: v.object({
    emotions: v.array(v.object({...})),    // Deeply nested
    themes: v.array(v.object({...})),      // Repeated patterns
    triggers: v.array(v.object({...})),    // No reusability
    communication: v.array(v.object({...})),
    relationships: v.array(v.object({...})),
  })
}))
```

#### Recommended Structure

```typescript
// Option A: Normalized (separate tables)
langExtractExtractions: defineTable({
  entryId: v.id('journalEntries'),
  extractionType: v.union(
    v.literal('emotion'),
    v.literal('theme'),
    v.literal('trigger'),
    v.literal('communication'),
    v.literal('relationship')
  ),
  text: v.string(),
  category: v.string(),
  attributes: v.optional(
    v.object({
      intensity: v.optional(v.string()),
      severity: v.optional(v.string()),
      tone: v.optional(v.string()),
      context: v.optional(v.string()),
    })
  ),
  confidence: v.optional(v.number()),
  createdAt: v.number(),
})
  .index('by_entry', ['entryId'])
  .index('by_type', ['extractionType'])

// Option B: Modular (current structure but organized)
// Using the created langextract-types.ts module
```

### 3. Implementation Strategy

#### Phase 1: Immediate Improvements (Low Risk)

1. ✅ **Create `langextract-types.ts`** - Extract LangExtract schemas
2. **Update main schema** - Import from module instead of inline definitions
3. **Add confidence scoring** - Enhance extraction quality tracking

#### Phase 2: Schema Organization (Medium Risk)

1. **Split core schemas** - Separate user, journal, system schemas
2. **Create schema index** - Central exports file
3. **Update imports** - Adjust all mutation/query files

#### Phase 3: Normalization (High Risk - requires migration)

1. **Evaluate normalization benefits** - Query patterns vs. storage efficiency
2. **Create migration scripts** - Data transformation utilities
3. **Implement normalized schema** - If benefits outweigh complexity

## Benefits of Proposed Changes

### Immediate Benefits (Phase 1)

- ✅ **Reduced file size**: Main schema becomes more manageable
- ✅ **Better type reuse**: Shared extraction schemas
- ✅ **Enhanced metadata**: Confidence scoring, retry tracking
- ✅ **Improved maintainability**: Clear separation of concerns

### Long-term Benefits (Phase 2-3)

- **Faster development**: Easier to find and modify schemas
- **Better testing**: Isolated schema components
- **Performance**: Potential query optimization with normalization
- **Scalability**: Easier to add new extraction types

## Risk Assessment

| Change             | Risk Level | Migration Required | Developer Impact |
| ------------------ | ---------- | ------------------ | ---------------- |
| LangExtract module | Low        | No                 | Minimal          |
| Schema splitting   | Medium     | No                 | Import updates   |
| Normalization      | High       | Yes                | Query rewrites   |

## Next Steps

1. **Start with Phase 1** - Use the created `langextract-types.ts`
2. **Measure impact** - Monitor schema compilation time
3. **Gather feedback** - Team review of modular approach
4. **Plan Phase 2** - If Phase 1 shows benefits
5. **Consider Phase 3** - Only if query patterns support normalization

## Code Examples

See `convex/schema/langextract-types.ts` for the implemented modular approach.
