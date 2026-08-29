# AGENTS.md

Codex-facing operating doc for `coding-debugger`. Read this on entry if you are a Codex
session working in this repo, or installing/loading this plugin into a Codex host.
(Claude Code sessions: see `CLAUDE.md` and `.claude-plugin/plugin.json` — those are the
Claude-facing equivalents; this file does not replace them.)

---

## What this plugin does

`coding-debugger` (npm package `@tyroneross/claude-code-debugger`) is a debugging memory
system. It stores past bugs and retrieves them by symptom similarity, so an agent never
diagnoses the same issue twice from scratch. Every search returns one of four verdicts —
`KNOWN_FIX`, `LIKELY_MATCH`, `WEAK_SIGNAL`, `NO_MATCH` — never a raw score.

It ships as three things at once:
- An **npm package** — programmatic API (`src/`, compiled to `dist/`).
- A **dual-host plugin** — Claude Code reads `.claude-plugin/plugin.json`; Codex reads
  `.codex-plugin/plugin.json`. Both manifests point at the same source files (`skills/`,
  `.mcp.json`) — nothing is duplicated per host.
- An **MCP server** (`dist/src/mcp/server.js`, JSON-RPC 2.0 over stdio) — 8 tools:
  `search`, `store`, `detail`, `status`, `list`, `patterns`, `outcome`, `read_logs`.

## What Codex actually loads (verified, not assumed)

This was checked by installing the plugin through a real `codex plugin add` (codex-cli
0.151.0) against a scratch marketplace and inspecting the materialized install cache —
not inferred from the manifest alone.

| Surface | Declared in `.codex-plugin/plugin.json`? | Codex behavior |
|---|---|---|
| **Skills** (`skills/`) | Yes — `"skills": "./skills"` | **Live.** Codex resolves this path relative to the directory that *contains* `.codex-plugin/` (repo root here), not relative to `plugin.json` itself. Confirmed: a real install materialized `skills/debug-loop/SKILL.md`, `skills/debugging-memory/SKILL.md`, `skills/logging-tracer/SKILL.md` into the plugin cache. |
| **MCP server** (`.mcp.json`) | Yes — `"mcpServers": "./.mcp.json"` | **Live.** Same resolution rule; `.mcp.json` was materialized into the cache and the 8 tools are reachable the same way on both hosts. |
| **Commands** (`commands/*.md`) | No — Codex's plugin.json schema has no `commands` key | **Inert on Codex.** A real install *copies* `commands/` into the cache (Codex's installer copies the whole source tree, not just declared paths) but nothing in the Codex runtime reads or registers them. There is no `/debugger`, `/assess`, etc. slash-command surface on Codex. |
| **Agents** (`agents/*.md`) | No — no `agents` key | **Inert on Codex,** same mechanism as commands: copied to disk, not wired up. No parallel-assessor subagent dispatch (`assessment-orchestrator`, `api-assessor`, etc.) on Codex. |
| **Hooks** (`hooks/hooks.json`) | No — no `hooks` key | **Not shipped by plugin install at all.** See `## Hooks` below — this is a genuine host-model gap, not a missing declaration. |

**Practical consequence:** on Codex, the debugging workflows this plugin describes in
`commands/*.md` and `agents/*.md` are not directly invocable. A Codex session gets there
through the **skills** (which document the same workflows in prose the model can follow
directly) and the **MCP tools** (which do the actual search/store/retrieve work). See
below.

## How a Codex session invokes the debug workflows

Codex has no slash-command registry, so there is no `/debugger "symptom"` equivalent.
Instead:

1. **Skill-first.** The three skills under `skills/` are the operating instructions,
   host-neutral:
   - `debugging-memory` — memory-first triage on any bug symptom; escalates to
     `debug-loop` unless the verdict is `KNOWN_FIX`.
   - `debug-loop` — iterative root-cause debugging (causal tree → hypothesize → fix →
     verify → score → critique, up to 5 iterations).
   - `logging-tracer` — reads and analyzes project log files.

   All three SKILL.md frontmatter carries `user-invocable: false` — on Claude Code this
   means auto-activation from the `description` field. **Whether Codex has an equivalent
   description-match auto-activation mechanism for skills is unverified** — Codex's
   skill-loading behavior beyond "the file is present and readable" was not exercised in
   this check (no live Codex session was driven end-to-end, only `codex plugin add`
   against the plugin cache). Until that's confirmed, the safe assumption for a Codex
   session is: **read `skills/debugging-memory/SKILL.md` explicitly at the start of any
   bug-fixing task**, rather than relying on auto-trigger.

2. **MCP tools do the work.** Once the coding-debugger MCP server is registered (see
   `.mcp.json`), call `search` with the symptom text to get a verdict + matching
   incidents/patterns, `store` to record a new incident, `outcome` to record whether a
   fix worked. These are the same tools Claude Code's commands call under the hood — the
   commands are just a thin Claude-only UX layer on top of them that Codex does not have.

3. **The orchestration agents are Claude-only.** `assess.md`'s parallel domain-assessor
   fan-out (`api-assessor`, `database-assessor`, `frontend-assessor`,
   `performance-assessor`, `assessment-orchestrator`) and the `debugger-agent` iterative
   loop (`root-cause-investigator`, `fix-critique`) are Claude Code subagent definitions.
   On Codex, a session doing the equivalent work should follow the `debug-loop` skill's
   own investigation guidance directly (it documents the causal-tree method in prose,
   not as an agent dispatch) rather than expecting agent fan-out.

## Memory paths (host-agnostic)

Storage is identical regardless of host — nothing here is Claude- or Codex-specific:

| Layer | File | Purpose |
|---|---|---|
| Index | `memory/index.json` | O(1) lookups by category, tag, file, quality tier |
| Log | `memory/incidents.jsonl` | Append-only; fast full-text search |
| Summary | `memory/MEMORY_SUMMARY.md` | Compressed context for cold starts (<150 lines) |
| Full | `memory/INC_*.json` | Individual incident files, loaded on-demand |
| Debug-loop state | `.claude-code-debugger/debug-loop/` | `state.json`, `scorecard.md` — path kept stable for backward compatibility across both hosts |

Whenever an incident is written, `index.json`, `incidents.jsonl`, and the individual
`INC_*.json` file must all update together (`src/storage.ts`).

## Hooks

`hooks/hooks.json` (Claude-owned; this lane does not edit it) declares one Claude Code
plugin hook: `Stop` → `npx @tyroneross/claude-code-debugger mine --days 1 --store`, mining
the session for missed incidents on every session end.

**Codex has a `Stop` event with the same semantics** (confirmed from a working
dual-host reference plugin's `.codex/hooks.json`), so the *event* has a Codex equivalent.
The gap is in the **distribution mechanism**: Codex's `plugin.json` schema has no `hooks`
key at all, and a real `codex plugin add` install does not wire up anything from
`hooks/hooks.json` even though the file is physically copied into the install cache — it
is simply never read. A Codex plugin cannot ship a hook that auto-activates on install
the way a Claude Code plugin can.

Codex hooks are **project-level config only**, read from `.codex/hooks.json` at the
consuming repo's git top-level — not from inside an installed plugin. `.codex-plugin/hooks/hooks.json`
in this repo is reference wiring in the same JSON shape, ready to merge. To activate it in
a project using this plugin on Codex:

```bash
# From the consuming project's repo root — merge, don't overwrite an existing
# .codex/hooks.json if one is already there.
mkdir -p .codex
cp .codex-plugin/hooks/hooks.json .codex/hooks.json   # or merge the "Stop" entry by hand
```

This is a manual, per-project step today. There is no automatic "install this plugin and
its hook activates" path on Codex — document this as a known limitation, don't paper over
it with a hook that silently never fires.

## Installing / verifying on Codex

```bash
# Register this repo as a Codex plugin marketplace (reads .agents/plugins/marketplace.json)
codex plugin marketplace add /path/to/claude-code-debugger

# Install the plugin from that marketplace
codex plugin add coding-debugger@coding-debugger

# Structural check — valid JSON, every declared path resolves, every skill has a SKILL.md
scripts/verify-codex-surface.sh
```

`.agents/plugins/marketplace.json` is the Codex marketplace descriptor (separate from
Claude's `.claude-plugin/marketplace.json`, which this repo does not currently have —
Claude Code installs this plugin directly from the git source, not through a marketplace
listing). Its `plugins[].name` must match `.codex-plugin/plugin.json`'s `name`, and its
`version` should track `package.json` — `scripts/verify-codex-surface.sh` checks the name
match but not the version (this repo has no automated version-parity gate across all three
manifests the way the dual-host reference implementation does; see "What was not built"
below).

## What was not built (scope boundary)

The dual-host reference this lane studied (`agent-rally-point`'s `.codex-plugin/` +
`plugins/codex/.codex-plugin/` + `scripts/build-codex-artifact.sh` +
`scripts/check-release-parity.sh`) maintains a **second, generated copy** of the Codex
plugin under `plugins/codex/.codex-plugin/` so a packaged release can be byte-verified
against its canonical source, plus a full release-parity CI gate across four manifests.
This plugin is one order of magnitude smaller (no multi-crate release pipeline, one
package version, one distribution channel), so that machinery was deliberately not
copied:

- No `plugins/codex/` mirror directory — `.agents/plugins/marketplace.json` points
  `source: "."` straight at the canonical `.codex-plugin/` so there is nothing to keep in
  sync.
- No `check-release-parity.sh` equivalent — `scripts/verify-codex-surface.sh` covers
  structural well-formedness only (valid JSON, paths resolve, skills present), not
  version-across-N-manifests parity or symlink/byte-identical-artifact checks, because
  there is no second artifact to drift from the first.

If this plugin later grows a packaged-release step distinct from "install from git
source," revisit that decision.

## Where to make changes

Same map as `CLAUDE.md` for the source code (`src/retrieval.ts` for verdict logic,
`src/storage.ts` for the tiered storage sync invariant, `src/mcp/tools.ts` for MCP tool
definitions). This file only adds the Codex-specific surface:

| What you want to change | Where to look |
|---|---|
| Codex plugin manifest | `.codex-plugin/plugin.json` |
| Codex marketplace listing | `.agents/plugins/marketplace.json` |
| Codex hook reference wiring | `.codex-plugin/hooks/hooks.json` |
| Codex surface structural checks | `scripts/verify-codex-surface.sh` |
| Skills (shared, both hosts) | `skills/*/SKILL.md` — single source of truth, do not fork per host |
| MCP server config (shared, both hosts) | `.mcp.json` |
