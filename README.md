# Claude Code Debugger

> Never solve the same bug twice

A debugging memory system for Claude Code that automatically learns from past incidents and suggests solutions based on similar problems you've already solved.

## Features

- **Incident Tracking**: Store complete debugging incidents with symptoms, root causes, fixes, and verification
- **Interactive Verification** ✨ NEW: Guided prompts to ensure high-quality incident documentation
- **Quality Scoring**: Automatic calculation of incident completeness (0-100%)
- **Auto-Pattern Extraction** ✨ NEW: Automatically extracts patterns after storing 3+ similar incidents
- **Enhanced Search** ✨ NEW: Multi-strategy search (exact → tag → fuzzy → semantic)
- **Batch Operations** ✨ NEW: Review incomplete incidents, extract patterns, cleanup old data
- **Smart Retrieval**: Find similar incidents using keyword-based similarity matching
- **Audit Trail Mining**: Recover incidents from `.claude/audit` files when manual storage is missed
- **Dual Storage Modes**:
  - **Local mode**: Each project has its own `.claude/memory/`
  - **Shared mode**: All projects share `~/.claude-code-debugger/` for cross-project learning
- **CLI Access**: Command-line interface for quick memory operations
- **Programmatic API**: Import and use in your TypeScript/JavaScript code

## Installation

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
| `/debugger-status` | Show memory statistics |
| `/debugger-mine` | Mine audit trail for recent debugging sessions |

**Examples:**
```
/debugger "API returns 500 on login"
→ Searches memory, shows similar past incidents and how you fixed them

/debugger
→ Shows recent bugs from memory, asks which one you're working on

/debugger-status
→ "4 incidents stored, 0 patterns, 4 KB used"

/debugger-mine
→ Extracts debugging sessions from last 7 days into memory
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

# Suggest patterns to extract
claude-code-debugger patterns

# Extract and store patterns
claude-code-debugger patterns --extract

# Mine audit trail for missed incidents
claude-code-debugger mine --days 30

# Store mined incidents
claude-code-debugger mine --days 30 --store

# Batch operations (v1.2.0) ✨ NEW
claude-code-debugger batch --incomplete              # Review incomplete incidents
claude-code-debugger batch --extract-patterns        # Extract patterns from existing data
claude-code-debugger batch --cleanup --older-than 90 # Clean up old sessions
```

### Programmatic Usage

```typescript
import {
  debugWithMemory,
  storeDebugIncident,
  checkMemory,
  extractPatterns,
  mineAuditTrail
} from '@tyroneross/claude-code-debugger';

// Before debugging: Check for similar incidents
const result = await debugWithMemory("Search filters not working", {
  min_confidence: 0.7
});

console.log('Session ID:', result.context_used.session_id);

// After fixing: Store the incident
await storeDebugIncident(sessionId, {
  root_cause: {
    description: "Missing useMemo dependency caused infinite re-renders",
    category: "react-hooks",
    confidence: 0.9
  },
  fix: {
    approach: "Added missing dependency to useMemo array",
    changes: ["components/SearchBar.tsx"],
    time_to_fix: 15
  },
  verification: {
    status: 'verified',
    regression_tests_passed: true,
    user_journey_tested: true,
    success_criteria_met: true
  }
});

// Search memory directly
const memory = await checkMemory("infinite render loop", {
  similarity_threshold: 0.5,
  max_results: 5
});

// Extract patterns from incidents
const patterns = await extractPatterns({
  min_incidents: 3,
  min_similarity: 0.7,
  auto_store: true
});

// Mine audit trail
const incidents = await mineAuditTrail({
  days_back: 30,
  auto_store: true,
  min_confidence: 0.7
});
```

### Interactive Verification (New in v1.2.0)

Use interactive prompts to ensure high-quality incident documentation:

```typescript
import { storeIncident, generateIncidentId } from '@tyroneross/claude-code-debugger';

// Create a minimal incident
const incident = {
  incident_id: generateIncidentId(),
  timestamp: Date.now(),
  symptom: 'Search results not displaying',
  root_cause: {
    description: 'React component issue',
    category: 'react',
    confidence: 0.7
  },
  // ... minimal details
};

// Store with interactive mode - system will prompt for missing details
const result = await storeIncident(incident, {
  interactive: true,  // Enable guided prompts
  validate_schema: true
});

// The system will:
// 1. Check root cause quality (min 50 chars)
// 2. Ask about verification status
// 3. Suggest tags based on symptom
// 4. Calculate quality score
// 5. Show feedback and confirm storage
```

**Quality Scoring:**
- Root Cause Analysis: 30%
- Fix Details: 30%
- Verification: 20%
- Documentation (tags, etc): 20%

**Quality Targets:**
- 🌟 Excellent: ≥75%
- ✅ Good: ≥50%
- ⚠️ Fair: <50%

See [Interactive Verification Guide](./docs/INTERACTIVE_VERIFICATION.md) for details.

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

**Pattern-First Approach:**
1. Try to match against known patterns (90% confidence)
2. If no pattern matches, search incidents (70% confidence)
3. Use keyword-based Jaccard similarity
4. Prefer recent incidents (90-day window)

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
  getMemoryStats
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
  MemoryConfig
} from '@tyroneross/claude-code-debugger';
```

## Directory Structure

### Local Mode
```
your-project/
└── .claude/
    └── memory/
        ├── incidents/     # Individual incident JSON files
        ├── patterns/      # Extracted pattern JSON files
        └── sessions/      # Temporary debug session files
```

### Shared Mode
```
~/.claude-code-debugger/
├── incidents/    # All incidents from all projects
├── patterns/     # All patterns from all projects
└── sessions/     # Temporary session files
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
