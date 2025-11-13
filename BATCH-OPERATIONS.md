# Batch Operations (v1.2.0)

Maintenance commands for managing your debugging memory system.

## Available Operations

### 1. Review Incomplete Incidents

Review and complete incidents that were partially captured or mined from audit trails.

```bash
claude-code-debugger batch --incomplete
```

**Interactive Flow:**
- Shows all incidents with `incomplete` tag or low quality scores
- For each incident, choose:
  - **Skip** - Review later
  - **Complete** - Fill in missing details interactively
  - **Delete** - Remove invalid incidents
  - **Stop** - Exit batch review

**Filters:**
- Incidents tagged with `incomplete`
- Quality score < 70%
- Unverified incidents

### 2. Extract Patterns

Automatically extract reusable patterns from similar incidents.

```bash
# Extract all patterns (min 3 similar incidents)
claude-code-debugger batch --extract-patterns

# Filter by category
claude-code-debugger batch --extract-patterns --category react-hooks

# Adjust minimum threshold
claude-code-debugger batch --extract-patterns --min-incidents 5
```

**How it Works:**
- Groups incidents by root cause category
- Calculates commonality (shared tags, files, approaches)
- Creates pattern templates for reuse
- Stores patterns automatically

### 3. Cleanup Old Data

Remove old sessions and low-quality incidents.

```bash
# Dry run (preview only)
claude-code-debugger batch --cleanup --dry-run

# Actually delete files
claude-code-debugger batch --cleanup --older-than 90

# Clean up sessions older than 30 days
claude-code-debugger batch --cleanup --older-than 30
```

**What Gets Cleaned:**
- Sessions older than threshold (default: 90 days)
- Incidents with quality score < 40% AND older than threshold
- Incidents with no tags AND older than threshold

## Combined Operations

Run multiple operations in one command:

```bash
# Review incomplete, then extract patterns
claude-code-debugger batch --incomplete --extract-patterns

# Cleanup and pattern extraction
claude-code-debugger batch --cleanup --dry-run --extract-patterns
```

## Memory Modes

All batch operations support both local and shared memory:

```bash
# Local mode (per-project)
claude-code-debugger batch --incomplete

# Shared mode (global across projects)
claude-code-debugger batch --incomplete --shared
```

## Examples

**Monthly Maintenance:**
```bash
# Review incomplete incidents
claude-code-debugger batch --incomplete

# Extract patterns from new incidents
claude-code-debugger batch --extract-patterns

# Clean up old data (dry run first)
claude-code-debugger batch --cleanup --older-than 90 --dry-run
claude-code-debugger batch --cleanup --older-than 90
```

**Category-Specific Pattern Mining:**
```bash
# Extract React-specific patterns
claude-code-debugger batch --extract-patterns --category react-hooks

# Extract API error patterns
claude-code-debugger batch --extract-patterns --category api
```

## Quality Indicators

### Incident Quality Score (0-1)
- **0.9-1.0**: Complete - All fields filled, verified fix
- **0.7-0.9**: Good - Most fields filled, may need verification
- **0.4-0.7**: Incomplete - Missing important details
- **0.0-0.4**: Poor - Minimal information, candidate for deletion

**Calculated from:**
- Symptom description (20%)
- Root cause analysis (20%)
- Root cause confidence (10%)
- Fix approach (20%)
- File changes (10%)
- Verification status (20%)

### Pattern Quality
- **Success rate**: % of incidents where fix was verified
- **Usage count**: Number of similar incidents
- **Commonality score**: How similar the incidents are (60%+ = good pattern)

## Troubleshooting

### "No incomplete incidents found"
All incidents are complete! You can still run pattern extraction:
```bash
claude-code-debugger batch --extract-patterns
```

### "No patterns extracted"
Need at least 3 similar incidents in the same category. Keep debugging and storing incidents.

### Permission errors during cleanup
Make sure you have write access to `.claude/memory/` directory.

## Best Practices

1. **Weekly Review**: Run `--incomplete` to keep memory clean
2. **Monthly Patterns**: Extract patterns once you have 10+ incidents
3. **Quarterly Cleanup**: Remove old data with `--cleanup --older-than 90`
4. **Always Dry Run**: Use `--dry-run` before actual cleanup
5. **Category Tags**: Tag incidents consistently for better pattern extraction

## Technical Details

### Incomplete Detection
An incident is considered incomplete if:
- Tagged with `incomplete` (usually from audit mining)
- Completeness score < 0.7
- Verification status = `unverified`

### Pattern Extraction Algorithm
1. Group incidents by root cause category
2. Calculate tag overlap (must share 60%+ tags)
3. Calculate file overlap (bonus if same files modified)
4. Generate detection signature from keywords
5. Create solution template from best approach
6. Store pattern with usage history

### Cleanup Safety
- Requires interactive confirmation before deletion
- Preserves verified incidents regardless of age
- Preserves incidents with quality score ≥ 0.4
- Sessions must be older than threshold
- Uses `--dry-run` for safe preview

## See Also

- [README.md](./README.md) - Main documentation
- [SETUP-COMPLETE.md](./SETUP-COMPLETE.md) - Setup guide
- [PACKAGE-SUMMARY.md](./PACKAGE-SUMMARY.md) - API reference
