

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
