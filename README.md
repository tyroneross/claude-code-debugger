# Claude Code Debugger

> Never solve the same bug twice

A debugging memory system for Claude Code that automatically learns from past incidents and suggests solutions based on similar problems you've already solved.

## Features

### Core
- **Incident Tracking** — Store debugging incidents with symptoms, root causes, fixes, and verification
- **Verdict System** — Results classified as KNOWN_FIX, LIKELY_MATCH, WEAK_SIGNAL, or NO_MATCH
- **Progressive Depth** — One-liner results (~40 tokens each), drill into full details on demand
- **Keyword Indexing** — Inverted index for O(log n) retrieval instead of scanning every file
- **Context Engine** — Auto-injects memory stats into sessions, file-aware editing hints
- **Outcome Tracking** — Records whether suggested fixes actually worked
- **Quality Scoring** — Automatic completeness scoring (0-100%)
- **Pattern Extraction** — Auto-extracts reusable patterns after 3+ similar incidents
- **Enhanced Search** — Multi-strategy: exact, tag, fuzzy (Jaro-Winkler), category
- **Audit Trail Mining** — Recovers incidents from `.claude/audit` files
- **Benchmark Suite** — 6-dimension scoring system to measure system quality

### Integrations
- **Parallel Assessment** — Multi-domain analysis (database, frontend, API, performance)
- **Trace Ingestion** — OpenTelemetry, Sentry, LangChain, Browser adapters
- **Parallel Retrieval** — Concurrent memory search for faster results
- **Plugin Marketplace** — Install directly via Claude Code plugin system

### Storage
- **Dual Modes** — Local (`.claude/memory/` per project) or Shared (`~/.claude-code-debugger/` global)
- **Tiered Storage** — Index (O(1) lookup), JSONL (fast search), individual files (on-demand)
- **Auto-archival** — Old incidents archived after 200 active or 180 days
- **Context Compression** — Token-optimized output for LLM injection

## Installation

### Via Plugin Marketplace

```bash
# Add the marketplace
/plugin marketplace add tyroneross/claude-code-debugger

# Install the plugin
/plugin install claude-code-debugger@claude-code-debugger
```

### Via npm (includes CLI and automatic slash command setup)

```bash
# npm
npm install @tyroneross/claude-code-debugger

# pnpm
pnpm add @tyroneross/claude-code-debugger

# yarn
yarn add @tyroneross/claude-code-debugger
```

### Global Installation (for CLI access anywhere)

```bash
# npm
npm install -g @tyroneross/claude-code-debugger

# pnpm
pnpm add -g @tyroneross/claude-code-debugger

# yarn
yarn global add @tyroneross/claude-code-debugger
```

### Troubleshooting Installation

**pnpm store mismatch error:**
If you see `ERR_PNPM_UNEXPECTED_STORE`, your project has a local `.pnpm-store` directory. Fix with:
```bash
rm -rf .pnpm-store node_modules
pnpm install
```

**npm/pnpm conflict:**
If your project uses pnpm (has `pnpm-lock.yaml`), always use `pnpm add` instead of `npm install`.

## Quick Start

### Slash Commands (Claude Code)

After installation, these slash commands are automatically available in Claude Code:

| Command | Description |
|---------|-------------|
| `/debugger "symptom"` | Search past bugs for similar issues before debugging |
| `/debugger` | Show recent bugs and pick one to debug |
| `/debugger-detail <ID>` | Drill into a specific incident or pattern |
| `/debugger-status` | Show memory statistics |
| `/debugger-scan` | Scan recent sessions for debugging incidents |
| `/assess "symptom"` | Run parallel domain assessment (database, frontend, API, performance) |

**Examples:**
```
/debugger "API returns 500 on login"
→ One-liner matches with verdicts (KNOWN_FIX, LIKELY_MATCH, etc.)
→ Use /debugger-detail <ID> to drill into any match

/debugger-detail INC_API_20260215_143022_a1b2
→ Full incident details: root cause, fix, verification, files changed

/debugger-status
→ "5 incidents stored, 2 patterns, 12 KB used"

/debugger-scan
→ Scans recent sessions for debugging incidents
```

### CLI Usage

```bash
# Check current configuration
claude-code-debugger config

# Show memory statistics
claude-code-debugger status

# Search memory before debugging
claude-code-debugger debug "Search filters not working"

# Search for specific incidents
claude-code-debugger search "react hooks"

# Drill into a specific incident or pattern
claude-code-debugger detail INC_REACT_20260215_001

# Record whether a suggested fix worked
claude-code-debugger outcome INC_REACT_20260215_001 worked

# Suggest patterns to extract
claude-code-debugger patterns

# Extract and store patterns
claude-code-debugger patterns --extract

# Mine audit trail for missed incidents
claude-code-debugger mine --days 30

# Store mined incidents
claude-code-debugger mine --days 30 --store

# Rebuild keyword index (after manual edits)
claude-code-debugger rebuild-index

# Batch operations
claude-code-debugger batch --incomplete              # Review incomplete incidents
claude-code-debugger batch --extract-patterns        # Extract patterns from existing data
claude-code-debugger batch --cleanup --older-than 90 # Clean up old sessions

# Remove debugger from this project
claude-code-debugger uninstall
claude-code-debugger uninstall --remove-data  # Also delete memory data
```

### Programmatic Usage

```typescript
import {
  // Retrieval (v1.6 — recommended)
  checkMemoryProgressive,
  checkMemoryScaled,
  checkMemoryWithVerdict,
  // Retrieval (classic)
  checkMemory,
  debugWithMemory,
  // Storage
  storeDebugIncident,
  storeIncident,
  // Context engine
  generateSessionContext,
  checkFileContext,
  // Outcome tracking
  recordOutcome,
  // Indexing
  rebuildKeywordIndex,
  // Pattern & mining
  extractPatterns,
  mineAuditTrail
} from '@tyroneross/claude-code-debugger';

// Progressive search — one-liner results, drill into details on demand
const progressive = await checkMemoryProgressive("API returns 500 on login");
// progressive.verdict: "KNOWN_FIX" | "LIKELY_MATCH" | "WEAK_SIGNAL" | "NO_MATCH"
// progressive.matches: [{ id, one_liner, verdict, detail_command }]
// progressive.tokens_used: ~200 (vs ~2000 for full results)

// Scaled search — uses keyword index for large memory stores
const scaled = await checkMemoryScaled("infinite render loop");

// Verdict-based search (v1.5)
const verdict = await checkMemoryWithVerdict("search filters broken");
// verdict.verdict, verdict.context, verdict.action

// Check if a file has past incidents before editing
const fileCtx = await checkFileContext("src/api/users.ts");
if (fileCtx.has_incidents) {
  console.log('Past incidents:', fileCtx.incident_ids);
}

// Record whether a suggested fix actually worked
await recordOutcome({
  incident_id: 'INC_API_20260215_001',
  verdict_given: 'KNOWN_FIX',
  outcome: 'worked',  // 'worked' | 'failed' | 'modified'
  recorded_at: Date.now()
});
```

## Configuration

### Storage Modes

**Local Mode (default)**
- Each project has its own `.claude/memory/` directory
- Incidents and patterns are project-specific
- Best for: Project-specific debugging context

**Shared Mode**
- All projects share `~/.claude-code-debugger/` globally
- Learn across all your projects
- Best for: Common patterns that appear in multiple projects

### Switch Modes

```bash
# Use shared mode for this command
claude-code-debugger status --shared

# Set shared mode via environment variable
export CLAUDE_MEMORY_MODE=shared
claude-code-debugger status

# In code
import { getConfig } from '@tyroneross/claude-code-debugger';

const config = getConfig({
  storageMode: 'shared'
});
```

### Environment Variables

```bash
# Storage mode: 'local' or 'shared'
CLAUDE_MEMORY_MODE=shared

# Custom memory path (overrides mode defaults)
CLAUDE_MEMORY_PATH=/custom/path/to/memory
```

## How It Works

### 1. Incident Structure

Each incident captures:
- **Symptom**: What the bug looked like
- **Root Cause**: Why it happened (with confidence score)
- **Fix**: How it was resolved (approach + file changes)
- **Verification**: Testing status
- **Quality Gates**: Security and review status
- **Tags**: For categorization and search

### 2. Pattern Extraction

When 3+ similar incidents are detected:
- Automatically extract common characteristics
- Create reusable pattern with solution template
- Track success rate and usage history
- Include caveats for edge cases

### 3. Retrieval Strategy

**Progressive, Pattern-First Approach:**
1. Extract keywords from symptom
2. Keyword index lookup (O(log n) — no full file scan)
3. Match against known patterns first (90% confidence)
4. Then search incidents (70% confidence)
5. Classify verdict: KNOWN_FIX → LIKELY_MATCH → WEAK_SIGNAL → NO_MATCH
6. Return one-liner summaries (~40 tokens each), drill into details on demand
7. Falls back to full scan for stores with <10 incidents

### 4. Audit Trail Mining

Recover incidents from `.claude/audit/` files:
- Parses root cause analysis documents
- Extracts error tracking logs
- Converts fix reports into incidents
- Filters duplicates and low-confidence entries

## CLI Commands Reference

### `debug <symptom>`

Check memory for similar incidents before debugging.

```bash
claude-code-debugger debug "Search filters not working"
claude-code-debugger debug "API timeout" --threshold 0.6
claude-code-debugger debug "Infinite render loop" --shared
```

**Options:**
- `--shared`: Use shared memory mode
- `--threshold <number>`: Similarity threshold (0-1, default: 0.5)

### `status`

Show memory system statistics.

```bash
claude-code-debugger status
claude-code-debugger status --shared
```

### `config`

Display current configuration.

```bash
claude-code-debugger config
```

### `search <query>`

Search memory for incidents matching a query.

```bash
claude-code-debugger search "react hooks"
claude-code-debugger search "API error" --threshold 0.6
```

**Options:**
- `--shared`: Use shared memory mode
- `--threshold <number>`: Similarity threshold (default: 0.5)

### `patterns`

Suggest or extract patterns from incidents.

```bash
# Preview patterns that could be extracted
claude-code-debugger patterns

# Extract and store patterns
claude-code-debugger patterns --extract
```

**Options:**
- `--extract`: Extract and store patterns (vs just preview)
- `--shared`: Use shared memory mode

### `mine`

Mine audit trail for incidents not manually stored.

```bash
# Preview what would be mined
claude-code-debugger mine --days 30

# Mine and store incidents
claude-code-debugger mine --days 30 --store
```

**Options:**
- `--days <number>`: Days to look back (default: 30)
- `--store`: Store mined incidents (vs just preview)
- `--shared`: Use shared memory mode

### `detail <id>`

Load full details for a specific incident or pattern.

```bash
claude-code-debugger detail INC_REACT_20260215_001
claude-code-debugger detail PTN_API_ERROR
```

### `outcome <incident_id> <result>`

Record whether a suggested fix worked.

```bash
claude-code-debugger outcome INC_API_20260215_001 worked
claude-code-debugger outcome INC_API_20260215_001 failed
claude-code-debugger outcome INC_API_20260215_001 modified
```

### `session-context`

Output compact JSON context for hooks. Used by the SessionStart hook to inject memory state at the beginning of each Claude session.

```bash
claude-code-debugger session-context
```

### `check-file <filepath>`

Check if a file has past incidents. Used by the PreToolUse hook to surface relevant history when editing files.

```bash
claude-code-debugger check-file src/api/users.ts
```

### `rebuild-index`

Rebuild the keyword index from all incidents. Run after manual edits to incident files.

```bash
claude-code-debugger rebuild-index
```

### `uninstall`

Remove debugger integration from the current project.

```bash
# Interactive — confirms before removing
claude-code-debugger uninstall

# Skip confirmation
claude-code-debugger uninstall -y

# Also delete all memory data (incidents, patterns, sessions)
claude-code-debugger uninstall --remove-data
```

Removes: hooks from `.claude/settings.json`, slash commands from `.claude/commands/`, debugging section from `CLAUDE.md`. Memory data is kept by default so you can reinstall later without losing history.

## API Reference

### Core Functions

#### `debugWithMemory(symptom, options)`

Check memory before debugging and prepare for storage.

```typescript
const result = await debugWithMemory("symptom description", {
  agent: 'coder',
  auto_store: true,
  min_confidence: 0.7
});
```

**Returns:** `DebugResult` with session ID and memory context

#### `storeDebugIncident(sessionId, incidentData)`

Store incident after debugging is complete.

```typescript
await storeDebugIncident(sessionId, {
  root_cause: { ... },
  fix: { ... },
  verification: { ... }
});
```

#### `checkMemory(symptom, config)`

Search memory for similar incidents.

```typescript
const memory = await checkMemory("symptom", {
  similarity_threshold: 0.5,
  max_results: 5,
  temporal_preference: 90,
  memoryConfig: { storageMode: 'shared' }
});
```

**Returns:** `RetrievalResult` with patterns and/or incidents

#### `extractPatterns(options)`

Extract reusable patterns from incidents.

```typescript
const patterns = await extractPatterns({
  min_incidents: 3,
  min_similarity: 0.7,
  auto_store: true,
  config: { storageMode: 'shared' }
});
```

#### `mineAuditTrail(options)`

Recover incidents from audit trail.

```typescript
const incidents = await mineAuditTrail({
  days_back: 30,
  auto_store: true,
  min_confidence: 0.7,
  config: { storageMode: 'shared' }
});
```

### Storage Operations

```typescript
import {
  storeIncident,
  loadIncident,
  loadAllIncidents,
  storePattern,
  loadPattern,
  loadAllPatterns,
  getMemoryStats,
  // v1.6 additions
  updateKeywordIndex,
  loadKeywordIndex,
  findCandidatesByKeyword,
  rebuildKeywordIndex,
  recordOutcome,
  loadOutcomes,
  getOutcomeStats
} from '@tyroneross/claude-code-debugger';
```

### Configuration

```typescript
import { getConfig, getMemoryPaths } from '@tyroneross/claude-code-debugger';

const config = getConfig({
  storageMode: 'shared',
  autoMine: false,
  defaultSimilarityThreshold: 0.7
});

const paths = getMemoryPaths(config);
// paths.incidents, paths.patterns, paths.sessions
```

## TypeScript Types

All TypeScript types are exported:

```typescript
import type {
  Incident,
  Pattern,
  RootCause,
  Fix,
  Verification,
  QualityGates,
  RetrievalResult,
  MemoryConfig,
  SearchVerdict,
  // v1.6 additions
  ProgressiveResult,
  ProgressiveMatch,
  KeywordIndex,
  VerdictOutcome
} from '@tyroneross/claude-code-debugger';
```

## Directory Structure

### Local Mode
```
your-project/
└── .claude/
    └── memory/
        ├── incidents/          # Individual incident JSON files
        ├── patterns/           # Extracted pattern JSON files
        ├── sessions/           # Temporary debug session files
        ├── index.json          # Stats, categories, quality tiers (O(1) lookup)
        ├── keyword-index.json  # Inverted keyword → incident ID map
        ├── incidents.jsonl     # Append-only log for fast full-text search
        ├── outcomes.jsonl      # Verdict outcome tracking (worked/failed/modified)
        └── MEMORY_SUMMARY.md   # Compressed context for LLM cold starts
```

### Shared Mode
```
~/.claude-code-debugger/
├── incidents/          # All incidents from all projects
├── patterns/           # All patterns from all projects
├── sessions/           # Temporary session files
├── index.json
├── keyword-index.json
├── incidents.jsonl
├── outcomes.jsonl
└── MEMORY_SUMMARY.md
```

## Integration with Claude Code

### Prompt for Agents

Include in your agent prompts:

```markdown
Before debugging, check memory:
- Run: `npx claude-code-debugger debug "symptom description"`
- Review similar incidents and patterns
- Apply known solutions if confidence is high

After fixing:
- Store incident with: `npx claude-code-debugger store`
- Or use programmatic API from TypeScript
```

### Automated Mining

Set up periodic audit mining:

```bash
# Weekly cron job to mine audit trail
0 0 * * 0 cd /path/to/project && npx claude-code-debugger mine --days 7 --store
```

## Best Practices

### 1. Always Check Before Debugging
```bash
claude-code-debugger debug "symptom" --threshold 0.7
```

### 2. Store Complete Incidents
Include all fields for maximum reuse:
- Root cause with confidence score
- Complete fix description
- Verification status
- Quality gates

### 3. Extract Patterns Regularly
```bash
# Weekly pattern extraction
claude-code-debugger patterns --extract
```

### 4. Mine Audit Trail
```bash
# Monthly audit mining
claude-code-debugger mine --days 30 --store
```

### 5. Use Shared Mode for Common Issues
```bash
export CLAUDE_MEMORY_MODE=shared
```

## Context Engine

The context engine automatically surfaces relevant debugging memory without manual `/debugger` calls.

### Layer 1: CLAUDE.md Dynamic Section

On install, a dynamic section is injected into your project's `CLAUDE.md` with:
- Current memory stats (incident count, pattern count, categories)
- Hot files — which files have the most past incidents
- Trigger instructions — when Claude should call `/debugger`

This section updates on each `rebuild-index` or session start.

### Layer 2: Session Start Hook

A command-type hook runs `claude-code-debugger session-context` at the start of each Claude session, outputting compact JSON with memory stats and trigger instructions (~150 tokens).

### Layer 3: File-Aware Editing

A PreToolUse hook checks `claude-code-debugger check-file <path>` when files are edited. If the file has past incidents, relevant IDs and a message are surfaced. Otherwise, zero noise — just `{"ok": true}`.

### Outcome Tracking

After a `/debugger` search suggests a fix, you can record whether it actually worked:

```bash
claude-code-debugger outcome INC_API_20260215_001 worked
claude-code-debugger outcome INC_API_20260215_001 failed
claude-code-debugger outcome INC_API_20260215_001 modified
```

This feeds back into pattern success rates, so the system learns which fixes are reliable over time.

## Uninstall

Remove the debugger from your project cleanly:

```bash
claude-code-debugger uninstall
```

This removes:
- Session hooks from `.claude/settings.json`
- Slash commands from `.claude/commands/`
- Debugging Memory section from `CLAUDE.md`

Your memory data (incidents, patterns, sessions) is **kept by default** so you can reinstall later without losing history. To also remove data:

```bash
claude-code-debugger uninstall --remove-data
```

To skip the confirmation prompt:

```bash
claude-code-debugger uninstall -y
```

## Benchmark

Run the 6-dimension benchmark to measure system quality:

```bash
npm run benchmark
```

This creates synthetic incident data and scores the system across:

| Dimension | Weight | What it measures |
|---|---|---|
| Retrieval Accuracy | 25 | Precision and recall for known-bug search |
| Verdict Precision | 20 | Do verdicts match expected classifications? |
| Context Efficiency | 15 | Compression ratio and budget enforcement |
| Pattern Quality | 15 | Do patterns match their source incidents? |
| Scalability | 15 | Performance at various incident counts |
| Cold Start Quality | 10 | MEMORY_SUMMARY.md usefulness |

## Development

### Build from Source

```bash
git clone https://github.com/tyroneross/claude-code-debugger.git
cd claude-code-debugger
npm install
npm run build
```

### Run Tests

```bash
npm test
```

### Run Benchmark

```bash
npm run benchmark
```

### Watch Mode

```bash
npm run watch
```

## Publishing

### Prepare Release

```bash
# Update version in package.json
npm version patch|minor|major

# Build
npm run build

# Publish to GitHub Packages
npm publish
```

### Version Management

This package uses semantic versioning:
- **Patch** (1.0.x): Bug fixes
- **Minor** (1.x.0): New features, backward compatible
- **Major** (x.0.0): Breaking changes

## Troubleshooting

### "Cannot find module"
- Ensure package is installed: `npm list @tyroneross/claude-code-debugger`
- Check import paths match package exports

### "No incidents found"
- Verify memory directory exists
- Check storage mode (local vs shared)
- Run `claude-code-debugger status` to see statistics

### "Permission denied"
- Ensure directory permissions for `.claude/memory/`
- For shared mode: Check `~/.claude-code-debugger/` permissions

## Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Add tests for new features
4. Submit a pull request

## License

MIT

## Support

- Issues: https://github.com/tyroneross/claude-code-debugger/issues
- Discussions: https://github.com/tyroneross/claude-code-debugger/discussions

---

**Never solve the same bug twice.** 🧠
