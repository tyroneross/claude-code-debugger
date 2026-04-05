# claude-code-debugger — Versioning & Source of Truth

## Current

- **Version:** 1.7.0
- **Source of truth:** Local dev (`~/Desktop/git-folder/claude-code-debugger`)
- **Also available at:**
  - GitHub: https://github.com/tyroneross/claude-code-debugger
  - npm: `@tyroneross/claude-code-debugger`
- **Claude Code cache mirror:** `~/.claude/plugins/cache/RossLabs-claude-plugins/claude-code-debugger/1.7.0/`

## Key changes in 1.7.0

- Tiered storage: `index.json` (O(1) lookups) + `incidents.jsonl` (append-only log) + `MEMORY_SUMMARY.md` (<150 lines cold-start context) + on-demand `INC_*.json` per-incident files
- Verdict-first retrieval: `KNOWN_FIX`, `LIKELY_MATCH`, `WEAK_SIGNAL`, `NO_MATCH` — results return actions, not raw scores
- Compound incident IDs: `INC_CATEGORY_YYYYMMDD_HHMMSS_xxxx` — self-documenting filenames
- Auto-archival: incidents beyond 200 active or 180 days old move to `archive/`
- Context compression via `compressContext()` to minimize tokens on memory injection
- Batch I/O: file reads capped at 50 concurrent to prevent EMFILE errors

## Where to look for the latest version

| Source | Location | Notes |
|---|---|---|
| **Authoritative** | `~/Desktop/git-folder/claude-code-debugger/.claude-plugin/plugin.json` | Local dev — canonical, always newest |
| GitHub | github.com/tyroneross/claude-code-debugger | Public mirror, tracks local |
| npm | `@tyroneross/claude-code-debugger` | Published releases (may lag) |
| Cache mirror | `~/.claude/plugins/cache/RossLabs-claude-plugins/claude-code-debugger/<version>/` | What Claude Code actually loads at runtime — cross-check against registry |

When "latest" is ambiguous, trust **local dev** first, then cross-check the registry at `~/.claude/plugins/installed_plugins.json`.

## Release discipline (enforce before committing a version bump)

1. Bump `version` in `.claude-plugin/plugin.json`
2. Update the version stamp in `CLAUDE.md` (line 1 HTML comment)
3. Update this file's `Current` section + add an entry to `Version history` below
4. Delete older cache entries: `rm -rf ~/.claude/plugins/cache/RossLabs-claude-plugins/claude-code-debugger/<old-version>/`
5. Back up, then update `~/.claude/plugins/installed_plugins.json` → `installPath` + `version` for every entry of this plugin
6. Run `/reload-plugins` in Claude Code
7. Commit `plugin.json`, `CLAUDE.md`, `VERSIONING.md` together in a single commit

**Never leave two cached versions side-by-side** — Claude Code's resolver is not guaranteed to pick the newest. This bit us on 2026-04-04 when cached `1.3.0` and `1.7.0` existed together with the registry pointing at `1.3.0` but the loader picking `1.7.0`'s (noisier) prompt hooks.

## Version history

- **1.7.0** (current): Tiered storage, verdict-first retrieval, compound IDs, auto-archival, context compression. Prompt hooks stripped 2026-04-04 (hint script removed; Stop `mine --days 1 --store` command retained).
- **1.3.0** (prior): Single-file incident store, basic retrieval. Cached directory deleted 2026-04-04 during drift cleanup.
