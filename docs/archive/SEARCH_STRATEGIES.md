# Enhanced Search Strategies - Quick Reference

## Strategy Overview

| Strategy | Score | When Used | Example |
|----------|-------|-----------|---------|
| **EXACT** | 1.0 | Query substring in symptom | "logger not working" → "Sentry logger not working properly" |
| **TAG** | 0.9 | Query matches incident tags | "API error" → tags: [api, error-handling] |
| **FUZZY** | 0.7-0.85 | Similar strings (typos, variants) | "logr isnt workng" → "Logger throwing errors" |
| **CATEGORY** | 0.6 | Same category as top matches | After finding config issues → other config incidents |

## Algorithm: Jaro-Winkler Distance

Used for fuzzy matching. Measures similarity between two strings:
- **Range**: 0.0 (completely different) to 1.0 (identical)
- **Threshold**: 0.7 (70% similar minimum)
- **Advantages**:
  - Handles typos well
  - Favors strings with common prefixes
  - Good for short strings (symptoms, descriptions)

## Search Flow

```
Input: "logger not working"
  ↓
1. EXACT MATCH
   - Check: symptom.includes(query)
   - Found: "Sentry logger not working properly" ✓
   - Score: 1.0
  ↓
2. TAG MATCH
   - Check: tags overlap with query keywords
   - Found: tags = [logger, sentry, config]
   - Score: 0.9
  ↓
3. FUZZY MATCH
   - Check: JaroWinkler(query, symptom) >= 0.7
   - Check: JaroWinkler(query, root_cause) >= 0.7
   - Found: Similar descriptions
   - Score: 0.7-0.85
  ↓
4. CATEGORY MATCH
   - Extract categories from top 3 results
   - Find other incidents in same categories
   - Score: 0.6
  ↓
Output: Sorted by score, deduplicated
```

## Deduplication

Uses `Set<incident_id>` to prevent duplicates:
- Each strategy checks `seenIds` before adding
- First occurrence wins (higher score)
- Ensures each incident appears once

## Configuration

```typescript
interface SearchOptions {
  threshold?: number;     // Min score to include (default: 0.5)
  maxResults?: number;    // Max results to return (default: 10)
  memoryConfig?: MemoryConfig;  // Memory location config
}
```

## Score Interpretation

| Score Range | Meaning | Confidence |
|-------------|---------|------------|
| 1.0 | Exact match | Very High |
| 0.9 | Tag match | High |
| 0.7-0.85 | Fuzzy match | Medium-High |
| 0.6 | Category match | Medium |
| < 0.5 | Low relevance | Low (filtered out by default) |

## Use Cases

### High Precision (threshold: 0.8+)
```typescript
const results = await enhancedSearch('specific error', {
  threshold: 0.8,
  maxResults: 5
});
// Returns: Only exact and tag matches
```

### High Recall (threshold: 0.5)
```typescript
const results = await enhancedSearch('vague symptom', {
  threshold: 0.5,
  maxResults: 20
});
// Returns: All strategies, more results
```

### Category Discovery
```typescript
// First search establishes categories
const initial = await enhancedSearch('database timeout');
// Category matches reveal related DB issues
```

## Performance Tips

1. **Adjust threshold based on query specificity**
   - Specific queries (e.g., "React useEffect infinite loop"): threshold 0.7+
   - Vague queries (e.g., "not working"): threshold 0.5

2. **Limit results for speed**
   - For quick lookups: maxResults 5
   - For comprehensive search: maxResults 20

3. **Use tags effectively**
   - Tag matches are fast (O(n))
   - Good tags improve recall significantly

4. **Query length matters**
   - Short queries: Rely more on fuzzy matching
   - Long queries: Exact matching more reliable

## Future: Semantic Search

Not yet implemented, but planned:

```typescript
// Strategy 5: SEMANTIC (score: 0.8)
// Would use embeddings to understand meaning
// Example: "database slow" → "query performance issue"
// Requires: OpenAI API or local embedding model
```

## Integration Examples

### With checkMemory()
```typescript
// Old approach (keyword-based)
const { incidents } = await checkMemory('symptom');

// New approach (multi-strategy)
const results = await enhancedSearch('symptom');
const incidents = results.map(r => r.incident);
```

### With highlights
```typescript
const results = await enhancedSearch('query');

results.forEach(r => {
  console.log(`Match: ${r.matchType}`);
  console.log(`Why: ${r.highlights.join(', ')}`);
});
```

### Progressive precision
```typescript
// Start broad
let results = await enhancedSearch('error', { threshold: 0.5 });

if (results.length > 20) {
  // Too many, increase precision
  results = await enhancedSearch('error', { threshold: 0.8 });
}
```

---

**Version**: 1.2.0
**Algorithm**: Jaro-Winkler Distance (natural library)
**Performance**: O(n × m) where n = incidents, m = strategies
**Typical Speed**: <100ms for 1000 incidents
