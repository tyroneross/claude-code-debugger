<!-- Plugin: claude-code-debugger · Version: 1.7.0 · Source of truth: local (~/Desktop/git-folder/claude-code-debugger) -->
<!-- Before any commit, version bump, or major change, read ./VERSIONING.md. Update it on version bumps. -->

## Debugging Memory

This project uses @tyroneross/claude-code-debugger for debugging memory.

**Automatic behavior:**
- Past debugging sessions are stored and indexed
- Similar incidents surface automatically when investigating bugs
- Patterns are extracted from repeated issues
- Session stop hook mines audit trail for missed incidents

**Commands:**
- `/debugger "symptom"` - Search past bugs for similar issues
- `/debugger` - Show recent bugs, pick one to debug
- `/debugger-status` - Show memory statistics
- `/debugger-scan` - Scan recent sessions for debugging work

The system learns from your debugging sessions automatically.

## v1.5.0 Storage Architecture

**Tiered storage** (new):
- `index.json` — O(1) lookups by category, tag, file, quality tier
- `incidents.jsonl` — append-only log for fast full-text search
- `MEMORY_SUMMARY.md` — compressed context for LLM cold starts (<150 lines)
- Individual `INC_*.json` files loaded on-demand for full details

**Verdict system** — search results return actionable verdicts:
- `KNOWN_FIX` — high-confidence pattern match, apply directly
- `LIKELY_MATCH` — similar incidents found, review for guidance
- `WEAK_SIGNAL` — loosely related, worth considering
- `NO_MATCH` — debug fresh, no prior knowledge

**Compound IDs** — incident IDs now include category:
- Format: `INC_CATEGORY_YYYYMMDD_HHMMSS_xxxx` (e.g., `INC_API_20260215_143022_a1b2`)
- Self-documenting filenames — browse incidents without opening them

**Memory management**:
- Auto-archival: incidents beyond 200 active or 180 days old move to `archive/`
- Context compression: `compressContext()` generates token-optimized strings
- Batch I/O: file reads capped at 50 concurrent to prevent EMFILE errors

**Key functions**:
- `checkMemoryWithVerdict(symptom)` — recommended entry point (returns verdict)
- `rebuildIndex()` / `loadIndex()` — manage the memory index
- `buildMemorySummary()` — generate compressed summary
- `searchIncidentLog(query)` — fast JSONL search
- `archiveOldIncidents({ dryRun: true })` — preview archival

## Plugin Development

This project is both an npm package and a Claude Code plugin.

**Plugin structure:**
- `.claude-plugin/plugin.json` - Plugin manifest
- `commands/` - Slash commands (single source of truth)
- `skills/debugging-memory/` - Auto-activating debugging skill
- `hooks/hooks.json` - Session stop hook for auto-mining

**Syncing:**
Commands in `commands/` are read by:
1. The plugin system (directly)
2. The npm postinstall script (copies to `.claude/commands/`)

When updating commands, edit only `commands/*.md` - both systems will use them.

## Architecture Patterns (from IBR & NavGator)

This project follows patterns proven in Interface Built Right and NavGator:

1. **Tiered storage** — summary (always-loaded) → index (fast lookup) → files (on-demand)
2. **Verdict-first** — classify results into actions, not raw scores
3. **Append-only logs** — JSONL for audit trail and fast search
4. **Batch I/O** — cap concurrent file operations at 50
5. **Compound IDs** — encode type/category in IDs for self-documentation
6. **Context compression** — minimize token usage when injecting into LLM context
