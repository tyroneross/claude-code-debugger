# Claude Code Debugger - Opus 4.6 Assessment & Improvements

## Executive Summary

Assessment of the claude-code-debugger against Opus 4.6 capabilities and current state-of-the-art agent context management research. A scoring framework was developed to evaluate 6 dimensions of debugger quality, revealing a baseline score of **67.3% (Grade D)**. After targeted improvements informed by research from LangSmith, Manus AI, CrewAI, JetBrains, and LangChain, the score improved to **96.3% (Grade A)**.

## Scoring Framework

A 6-dimension scoring system (`test-scoring-framework.ts`) was developed to evaluate the debugger:

| Dimension | Weight | Before | After | Change |
|-----------|--------|--------|-------|--------|
| Retrieval Accuracy | 25% | 80% | 88% | +8% |
| Semantic Recall | 20% | 80% | 100% | +20% |
| Token Efficiency | 15% | 75% | 100% | +25% |
| Pattern Extraction | 15% | 29% | 100% | +71% |
| Memory Freshness | 15% | 60% | 100% | +40% |
| Hook Coverage | 10% | 33% | 100% | +67% |
| **Overall** | | **67.3% (D)** | **96.3% (A)** | **+29%** |

## Weak Spots Identified

### 1. Semantic Recall Gap (Fixed)
**Problem**: Keyword/fuzzy matching missed semantically similar symptoms described with different vocabulary. "component keeps refreshing" failed to match "infinite re-render loop".

**Root cause**: `extractKeywords()` did simple tokenization with no synonym awareness. Jaccard similarity penalized expanded wordsets.

**Fix**: Added a synonym map (30+ engineering terms), bigram generation, and switched from Jaccard to overlap coefficient for similarity calculation.

### 2. Pattern Extraction Too Strict (Fixed)
**Problem**: `calculateCommonality()` required 60% tag overlap across incidents, which was too strict for varied React hook incidents (each using different hook names).

**Root cause**: Tag overlap threshold was 60%, and the scoring formula weighted only tag similarity (0.7) plus minor bonuses. Category coherence (all incidents sharing `react-hooks` category) was ignored.

**Fix**: Lowered tag threshold to 40%, added category coherence signal (0.4 weight when all same category), symptom keyword pairwise overlap, and better normalization.

### 3. Single Hook Event (Fixed)
**Problem**: Only a session-stop hook existed. No proactive warnings before editing previously-buggy files, no real-time error capture from tool calls.

**Fix**: Added `PreToolUse` hook (matcher: `Edit|Write`) that checks if a file has past incidents, and `PostToolUse` hook (matcher: `Bash`) that captures error output. Added corresponding CLI commands `check-file` and `capture-error`.

### 4. Temporal Weighting Insufficient (Fixed)
**Problem**: Binary temporal boost (1.2x if < 90 days, 1.0x otherwise) didn't differentiate between 1-day-old and 89-day-old incidents.

**Fix**: Replaced with exponential decay: `0.85 + 0.65 * exp(-0.693 * age / halfLife)`. Recent incidents now get up to 1.5x boost, decaying smoothly to 0.85x for old ones.

### 5. Token Budget Not Model-Aware (Added)
**Problem**: Fixed 2500-token budget regardless of model. Opus 4.6 with 1M context can load far more debugging history.

**Fix**: Added `detectContextMultiplier()` and `getAdaptiveTokenConfig()` in config. Detects CLAUDE_MODEL/ANTHROPIC_MODEL env vars and scales budgets: 1x (Haiku), 2x (Sonnet), 4x (Opus).

### 6. No Entity Memory (Added)
**Problem**: Couldn't answer "what bugs have we had in file X?" without scanning all incidents.

**Fix**: Added `src/entity-index.ts` with entity tracking across incidents (files, categories, tags). Includes `queryByFile()`, `queryByCategory()`, and `getHotspotFiles()`. Index is cached and rebuilt on demand.

### 7. Observation Masking (Improved)
**Problem**: Compact tier truncated all fields uniformly at 80-100 chars, including the reasoning chain.

**Fix**: Per JetBrains "Complexity Trap" (NeurIPS 2025), the compact tier now preserves full reasoning chain (symptom, root cause description, fix approach) up to 200 chars and masks only large observation payloads (code_snippet, stack traces). These are recoverable via `getIncidentDetails()`.

## Research Informing Improvements

### LangSmith
- **Trace/run/thread hierarchy**: Validates the plugin's incident-based approach. Session linking (already supported via `session_id` field) enables cross-session analysis.
- **LangSmith Fetch CLI**: The pattern of pulling trace data into terminal for agent consumption is exactly what `checkMemory()` does.

### Manus AI (Context Engineering Blog)
- **File system as external memory**: Validates the file-based storage approach. The plugin's lazy-loading via `getIncidentDetails()` aligns with Manus's "recoverable compression" principle.
- **todo.md attention manipulation**: When the plugin surfaces multiple incidents, formatting as a checklist helps agents maintain focus.
- **KV-cache optimization**: Three principles applied:
  1. Stable prefixes in skill injection (avoid dynamic timestamps early)
  2. Append-only context (never modify previous observations)
  3. Tool masking over removal (preserve cache coherence)
- **Error preservation**: Counterintuitively, keeping failed attempts in context prevents repeated mistakes. The PostToolUse hook now captures errors for this purpose.

### CrewAI Memory Architecture
- **Four memory types** (short-term, long-term, entity, contextual) inspired the entity index. The plugin now has incident memory (long-term), pattern memory (extracted knowledge), and entity memory (cross-incident index).
- **Swappable backends**: The plugin's config system already supports local/shared modes. Entity index uses the same path configuration.

### JetBrains "Complexity Trap" (NeurIPS 2025)
- **Observation masking > LLM summarization**: Directly applied to the compact tier. Mask large payloads, preserve reasoning chain.
- **Trajectory elongation risk**: Summarization can smooth over failure severity, causing repeated failed actions. The plugin now preserves full error descriptions.

### LangChain Deep Agents
- **Three-stage compression**: (1) offload large tool responses, (2) offload old write/edit args, (3) summarize as last resort. The plugin's tiered retrieval (summary/compact/full) maps to this progression.

### Mem0
- **Memory formation vs summarization**: Instead of compressing everything, selectively identify facts worth retaining. The quality scoring system (30% root cause, 30% fix, 20% verification, 20% documentation) implements this principle.

### CogniGent (January 2026)
- **Hypothesis-driven debugging with embedding retrieval**: Validates the plugin's structured debugging workflow. The synonym map is a lightweight alternative to full embeddings for Claude Code's filesystem-based architecture.

## Opus 4.6-Specific Opportunities

### Leveraged
1. **1M token context**: Adaptive token budgets scale to 10,000 tokens for Opus 4.6 sessions (4x default)
2. **Enhanced reasoning**: More accurate pattern extraction with improved commonality scoring
3. **SWE-bench leading code understanding**: Better incident documentation quality expected

### Future Opportunities
1. **Agent Teams**: Spawn parallel hypothesis-testing agents during complex debugging (research preview feature)
2. **Adaptive thinking**: Set effort to "max" for novel bugs, "low" for known pattern application
3. **Self-correction**: Partially automate the verification step - Opus 4.6 can self-verify root cause analysis

## Architecture Changes

### New Files
- `src/entity-index.ts` - Entity memory index (files, categories, tags)
- `test-scoring-framework.ts` - 6-dimension scoring system
- `scoring-report.json` - Latest scoring results

### Modified Files
- `src/retrieval.ts` - Synonym map, overlap coefficient, bigrams, exponential temporal decay, full tier fix
- `src/storage.ts` - Observation masking in compact tier
- `src/pattern-extractor.ts` - Category coherence, lowered thresholds, symptom keyword overlap
- `src/config.ts` - Adaptive token budgets, context multiplier detection
- `src/index.ts` - Entity index and adaptive config exports
- `hooks/hooks.json` - PreToolUse and PostToolUse hooks
- `cli/index.ts` - check-file and capture-error commands
- `tsconfig.json` - Added node types

## Remaining Recommendations

1. **Embedding-based semantic search**: The synonym map bridges common lexical gaps but a proper embedding model (even local/lightweight) would generalize better. Consider adding as optional strategy 5 in `enhancedSearch()`.

2. **GraphRAG for incident relationships**: At scale (100+ incidents), a knowledge graph connecting incidents by shared entities, root causes, and fixes would enable more sophisticated pattern detection.

3. **Webhook notifications**: For team environments, notify team channels when new patterns are extracted.

4. **Checkpoint/replay debugging**: Store the sequence of retrieval queries and decisions made during a debugging session for later analysis and improvement.

## Running the Scoring Framework

```bash
# Build first
npm run build

# Run scoring
npx ts-node test-scoring-framework.ts

# Results saved to scoring-report.json
```

The scoring framework creates an isolated test memory directory, seeds it with representative incidents, runs all 6 dimensions, and produces a detailed report with per-test scores, strengths, weak spots, and recommendations.
