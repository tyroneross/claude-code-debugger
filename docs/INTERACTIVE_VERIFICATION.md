# Interactive Verification System

**Feature Version:** 1.2.0
**Status:** Implemented ✅

## Overview

The Interactive Verification System guides users through completing incident details using interactive CLI prompts. This ensures all critical fields are filled with sufficient detail, improving incident quality and future reusability.

## Key Features

1. **Smart Prompts** - Contextual questions based on existing data
2. **Quality Scoring** - Real-time feedback on incident completeness
3. **Tag Suggestions** - Automatic tag recommendations from symptom analysis
4. **Validation** - Ensures minimum quality thresholds are met
5. **User Control** - Users can cancel or skip optional fields

## Quality Scoring System

The quality score is calculated based on four dimensions:

### Root Cause Analysis (30%)
- Description length (50+ chars): 10%
- Description length (100+ chars): +5%
- Confidence score (≥0.7): 10%
- Confidence score (≥0.9): +5%

### Fix Details (30%)
- Approach documented (20+ chars): 15%
- Changes documented (≥1): 10%
- Changes documented (≥3): +5%

### Verification (20%)
- Fully verified: 15%
- Partially verified: 8%
- Regression tests passed: 2.5%
- User journey tested: 2.5%

### Documentation (20%)
- Tags (≥2): 5%
- Tags (≥3): +5%
- Tags (≥5): +5%
- Prevention advice: 5%

## Usage

### Programmatic API

```typescript
import { storeIncident, generateIncidentId } from '@tyroneross/claude-code-debugger';

const incident = {
  incident_id: generateIncidentId(),
  timestamp: Date.now(),
  symptom: 'Search results not displaying',
  root_cause: {
    description: 'React useEffect missing dependency',
    category: 'react-hooks',
    confidence: 0.8
  },
  fix: {
    approach: 'Added missing dependency',
    changes: []
  },
  verification: {
    status: 'partial',
    regression_tests_passed: false,
    user_journey_tested: false,
    success_criteria_met: false
  },
  tags: ['react'],
  files_changed: [],
  quality_gates: { /* ... */ },
  completeness: { /* ... */ }
};

// Store with interactive mode
const result = await storeIncident(incident, {
  interactive: true,
  validate_schema: true
});
```

### What Gets Asked

The interactive system checks and prompts for:

1. **Root Cause Quality**
   - Description length (minimum 50 characters)
   - Confidence score (0-1)
   - Category selection from predefined list

2. **Fix Details**
   - High-level approach explanation
   - Specific file changes (optional but recommended)
   - Change types (add/modify/delete/refactor)

3. **Verification Status**
   - Overall verification status (verified/partial/unverified)
   - Regression test results
   - User journey testing
   - Success criteria met

4. **Tags & Metadata**
   - Auto-suggested tags from symptom analysis
   - Additional custom tags
   - Files changed

## Tag Suggestions

The system automatically suggests tags based on keywords in the symptom:

### Technology Tags
- `react` - React components, hooks
- `typescript` - Type errors
- `api` - API endpoints, integrations
- `database` - Queries, schema
- `cache` - Caching issues
- `auth` - Authentication/authorization

### Issue Type Tags
- `error` - Crashes, failures
- `performance` - Slow, timeouts
- `infinite-loop` - Hanging, loops
- `memory` - Memory leaks
- `security` - Vulnerabilities

## Quality Feedback

After interactive completion, users see:

```
📊 Quality Report:
   Overall Score: 85%
   Root Cause: ✅
   Fix Details: ✅
   Verification: ⚠️
   Tags: ✅ (4)

Store this incident? (Y/n)
```

On storage, the system displays:

```
🌟 Incident stored: INC_20250112_143022_abc3 (quality: 85%)
```

Quality indicators:
- 🌟 Excellent (≥75%)
- ✅ Good (≥50%)
- ⚠️ Fair (<50%)

## Quality Targets

### By Complexity Level

**TRIVIAL (0-20)**
- Minimum score: 40%
- Unverified acceptable
- Auto-suggested tags sufficient

**SIMPLE (21-40)**
- Minimum score: 50%
- Partial verification required
- At least 2 tags

**STANDARD (41-70)**
- Minimum score: 70%
- Full verification required
- At least 3 tags
- File changes documented

**COMPLEX (70+)**
- Minimum score: 80%
- Full verification mandatory
- At least 5 tags
- Complete fix details
- Prevention advice

## Examples

### Minimal to Excellent Transformation

**Before (Score: 0%)**
```json
{
  "symptom": "Error",
  "root_cause": {
    "description": "Bug",
    "category": "unknown",
    "confidence": 0.3
  },
  "fix": {
    "approach": "Fixed it",
    "changes": []
  },
  "tags": []
}
```

**After Interactive (Score: 85%)**
```json
{
  "symptom": "Search results display 'No results' despite API returning data",
  "root_cause": {
    "description": "React component useEffect missing dependency array item. The 'data' prop was not in the dependency array, causing the effect to only run on mount instead of when search results changed. This prevented re-processing of new search data.",
    "category": "react-hooks",
    "confidence": 0.90,
    "file": "components/SearchResults.tsx",
    "line_range": [45, 52]
  },
  "fix": {
    "approach": "Added the 'data' prop to useEffect dependency array and included null check for edge cases",
    "changes": [
      {
        "file": "components/SearchResults.tsx",
        "lines_changed": 5,
        "change_type": "modify",
        "summary": "Added data to deps array with null guard"
      }
    ],
    "time_to_fix": 15
  },
  "verification": {
    "status": "verified",
    "regression_tests_passed": true,
    "user_journey_tested": true,
    "success_criteria_met": true
  },
  "tags": ["react", "hooks", "useEffect", "rendering", "search"]
}
```

## Integration with CLI

Future CLI enhancement (v1.3.0):

```bash
# Auto-trigger interactive mode for incomplete incidents
npx @tyroneross/claude-code-debugger store --interactive

# Audit existing incidents and prompt for improvements
npx @tyroneross/claude-code-debugger audit --improve
```

## Best Practices

### When to Use Interactive Mode

**Use for:**
- STANDARD+ complexity (41+)
- Incidents you plan to reference
- Team shared memory
- Production issues

**Skip for:**
- Trivial issues (<20 complexity)
- Quick experiments
- Personal debugging notes
- Time-sensitive fixes (capture details later)

### Quality Goals

Target quality scores by use case:
- **Personal learning:** 50%+
- **Team knowledge:** 70%+
- **Production postmortems:** 85%+
- **Pattern extraction:** 90%+

### Improving Low-Quality Incidents

Run quality audit and re-prompt:

```typescript
import { loadIncident, calculateQualityScore, buildIncidentInteractive } from '@tyroneross/claude-code-debugger';

const incident = await loadIncident('INC_xxx');
const score = calculateQualityScore(incident);

if (score < 0.5) {
  const improved = await buildIncidentInteractive(incident);
  await storeIncident(improved);
}
```

## Related Features

- **Pattern Extraction** (v1.1.0) - Requires high-quality incidents (≥0.75)
- **Audit Mining** (v1.1.0) - Can suggest incomplete incidents for improvement
- **Memory Search** (v1.0.0) - Better quality improves retrieval relevance

## Future Enhancements

**Planned for v1.3.0:**
- CLI command for interactive storage
- Bulk audit and improvement of existing incidents
- Quality score history tracking
- Team quality benchmarks

**Planned for v1.4.0:**
- AI-assisted description expansion
- Automatic tag extraction from code changes
- Linked incident detection
- Quality trend analytics

## Testing

Run the test suite:

```bash
# Quality score validation
npx ts-node test-quality-score.ts

# Interactive flow (requires user input)
npx ts-node test-interactive.ts
```

## Performance

- Interactive prompts: ~30-90 seconds user time
- Quality calculation: <1ms
- No network calls required
- Tag suggestion: <5ms

## Accessibility

- Keyboard navigation
- Clear validation messages
- Optional fields clearly marked
- Cancellation allowed at any time
- Progress indicators

## References

- Quality rubric inspired by incident management best practices
- Tag taxonomy based on common debugging categories
- Scoring weights optimized for pattern extraction success
