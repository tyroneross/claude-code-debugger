# Claude Memory

> Never solve the same bug twice

A debugging memory system for Claude Code that automatically learns from past incidents and suggests solutions based on similar problems you've already solved.

## Features

- **Incident Tracking**: Store complete debugging incidents with symptoms, root causes, fixes, and verification
- **Pattern Recognition**: Automatically detect recurring problems and extract reusable patterns
- **Smart Retrieval**: Find similar incidents using keyword-based similarity matching
- **Audit Trail Mining**: Recover incidents from `.claude/audit` files when manual storage is missed
- **Dual Storage Modes**:
  - **Local mode**: Each project has its own `.claude/memory/`
  - **Shared mode**: All projects share `~/.claude-memory/` for cross-project learning
- **CLI Access**: Command-line interface for quick memory operations
- **Programmatic API**: Import and use in your TypeScript/JavaScript code

## Installation

### From GitHub Packages

First, configure npm to use GitHub Packages for this scope. Create or edit `~/.npmrc`:

```bash
@YOUR_GITHUB_USERNAME:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=YOUR_GITHUB_TOKEN
```

Then install:

```bash
# Project-specific installation
npm install @YOUR_GITHUB_USERNAME/claude-memory

# Global installation for CLI access anywhere
npm install -g @YOUR_GITHUB_USERNAME/claude-memory
```

### Get a GitHub Token

1. Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Generate new token with `read:packages` scope
3. Add to `~/.npmrc` as shown above

## Quick Start

### CLI Usage

```bash
# Check current configuration
claude-memory config

# Show memory statistics
claude-memory status

# Search memory before debugging
claude-memory debug "Search filters not working"

# Search for specific incidents
claude-memory search "react hooks"

# Suggest patterns to extract
claude-memory patterns

# Extract and store patterns
claude-memory patterns --extract

# Mine audit trail for missed incidents
claude-memory mine --days 30

# Store mined incidents
claude-memory mine --days 30 --store
```

### Programmatic Usage

```typescript
import {
  debugWithMemory,
  storeDebugIncident,
  checkMemory,
  extractPatterns,
  mineAuditTrail
} from '@YOUR_GITHUB_USERNAME/claude-memory';

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

## Configuration

### Storage Modes

**Local Mode (default)**
- Each project has its own `.claude/memory/` directory
- Incidents and patterns are project-specific
- Best for: Project-specific debugging context

**Shared Mode**
- All projects share `~/.claude-memory/` globally
- Learn across all your projects
- Best for: Common patterns that appear in multiple projects

### Switch Modes

```bash
# Use shared mode for this command
claude-memory status --shared

# Set shared mode via environment variable
export CLAUDE_MEMORY_MODE=shared
claude-memory status

# In code
import { getConfig } from '@YOUR_GITHUB_USERNAME/claude-memory';

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
claude-memory debug "Search filters not working"
claude-memory debug "API timeout" --threshold 0.6
claude-memory debug "Infinite render loop" --shared
```

**Options:**
- `--shared`: Use shared memory mode
- `--threshold <number>`: Similarity threshold (0-1, default: 0.5)

### `status`

Show memory system statistics.

```bash
claude-memory status
claude-memory status --shared
```

### `config`

Display current configuration.

```bash
claude-memory config
```

### `search <query>`

Search memory for incidents matching a query.

```bash
claude-memory search "react hooks"
claude-memory search "API error" --threshold 0.6
```

**Options:**
- `--shared`: Use shared memory mode
- `--threshold <number>`: Similarity threshold (default: 0.5)

### `patterns`

Suggest or extract patterns from incidents.

```bash
# Preview patterns that could be extracted
claude-memory patterns

# Extract and store patterns
claude-memory patterns --extract
```

**Options:**
- `--extract`: Extract and store patterns (vs just preview)
- `--shared`: Use shared memory mode

### `mine`

Mine audit trail for incidents not manually stored.

```bash
# Preview what would be mined
claude-memory mine --days 30

# Mine and store incidents
claude-memory mine --days 30 --store
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
} from '@YOUR_GITHUB_USERNAME/claude-memory';
```

### Configuration

```typescript
import { getConfig, getMemoryPaths } from '@YOUR_GITHUB_USERNAME/claude-memory';

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
} from '@YOUR_GITHUB_USERNAME/claude-memory';
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
~/.claude-memory/
├── incidents/    # All incidents from all projects
├── patterns/     # All patterns from all projects
└── sessions/     # Temporary session files
```

## Integration with Claude Code

### Prompt for Agents

Include in your agent prompts:

```markdown
Before debugging, check memory:
- Run: `npx claude-memory debug "symptom description"`
- Review similar incidents and patterns
- Apply known solutions if confidence is high

After fixing:
- Store incident with: `npx claude-memory store`
- Or use programmatic API from TypeScript
```

### Automated Mining

Set up periodic audit mining:

```bash
# Weekly cron job to mine audit trail
0 0 * * 0 cd /path/to/project && npx claude-memory mine --days 7 --store
```

## Best Practices

### 1. Always Check Before Debugging
```bash
claude-memory debug "symptom" --threshold 0.7
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
claude-memory patterns --extract
```

### 4. Mine Audit Trail
```bash
# Monthly audit mining
claude-memory mine --days 30 --store
```

### 5. Use Shared Mode for Common Issues
```bash
export CLAUDE_MEMORY_MODE=shared
```

## Development

### Build from Source

```bash
git clone https://github.com/YOUR_GITHUB_USERNAME/claude-memory.git
cd claude-memory
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
- Ensure package is installed: `npm list @YOUR_GITHUB_USERNAME/claude-memory`
- Check import paths match package exports

### "No incidents found"
- Verify memory directory exists
- Check storage mode (local vs shared)
- Run `claude-memory status` to see statistics

### "Permission denied"
- Ensure directory permissions for `.claude/memory/`
- For shared mode: Check `~/.claude-memory/` permissions

### "Invalid token" when installing
- Verify GitHub token has `read:packages` scope
- Check `.npmrc` configuration
- Ensure token is not expired

## Publishing

See [PUBLISHING-GUIDE.md](./PUBLISHING-GUIDE.md) for detailed instructions on:
- Setting up GitHub repository
- Generating access tokens
- Publishing to GitHub Packages
- Version management
- Updating the package

## Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Add tests for new features
4. Submit a pull request

## License

MIT

## Support

- Issues: https://github.com/YOUR_GITHUB_USERNAME/claude-memory/issues
- Discussions: https://github.com/YOUR_GITHUB_USERNAME/claude-memory/discussions

---

**Never solve the same bug twice.** 🧠
