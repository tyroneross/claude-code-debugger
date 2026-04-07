# AGENTS.md

Universal AI agent guidance for claude-code-debugger. Applies to Claude Code, Codex, Cursor, Copilot, Gemini CLI, and any other AI coding agent working with this codebase.

---

## What This Project Is

`@tyroneross/claude-code-debugger` is a debugging memory system for Claude Code. It stores past bugs and retrieves them by symptom similarity, so Claude never diagnoses the same issue twice from scratch.

It is simultaneously:
- An **npm package** — installable as a dependency, provides a programmatic API
- A **Claude Code plugin** — installs commands, skills, hooks, and agents into Claude's environment
- An **MCP server** — exposes debugging memory tools over JSON-RPC 2.0 via stdio

**Package:** `@tyroneross/claude-code-debugger` v1.8.0  
**Runtime:** Node.js >= 18, TypeScript  
**License:** MIT

---

## Project Layout

```
claude-code-debugger/
├── src/                        # TypeScript source
│   ├── mcp/
│   │   ├── server.ts           # MCP server entry point (JSON-RPC 2.0 over stdio)
│   │   └── tools.ts            # 8 MCP tool definitions + handlers
│   ├── types.ts                # All shared types (Incident, Pattern, Verdict, etc.)
│   ├── storage.ts              # Tiered storage: index, JSONL, individual files
│   ├── retrieval.ts            # Search + verdict logic (core algorithm)
│   ├── parallel-retrieval.ts   # Multi-strategy parallel search
│   ├── pattern-extractor.ts    # Extracts reusable fix patterns from incidents
│   ├── audit-miner.ts          # Mines Claude session audit trail for incidents
│   ├── context-engine.ts       # Token-budgeted context compression
│   ├── result-aggregator.ts    # Merges multi-domain assessment results
│   ├── assessment-orchestrator.ts
│   ├── logger.ts               # Console logging (no OTel — simple/standard tier)
│   └── ...
├── dist/                       # Compiled output (do not edit)
│   └── src/mcp/server.js       # MCP server entry point (compiled)
├── agents/                     # 7 Claude agent definitions (Markdown)
│   ├── assessment-orchestrator.md
│   ├── api-assessor.md
│   ├── database-assessor.md
│   ├── fix-critique.md
│   ├── frontend-assessor.md
│   ├── performance-assessor.md
│   └── root-cause-investigator.md
├── commands/                   # 8 slash commands (Markdown, single source of truth)
│   ├── assess.md
│   ├── debug-loop.md
│   ├── debugger.md
│   ├── debugger-detail.md
│   ├── debugger-scan.md
│   ├── debugger-status.md
│   ├── feedback.md
│   └── update.md
├── skills/                     # 3 Claude Code skills
│   ├── debug-loop/             # Iterative root cause debugging (causal tree, critique, scorecard)
│   ├── debugging-memory/       # Auto-activates on bug symptoms
│   └── logging-tracer/         # Trace log reading and analysis
├── hooks/
│   └── hooks.json              # 1 Stop hook — mines audit trail on session end
├── .claude-plugin/
│   └── plugin.json             # Plugin manifest (name, version, MCP server ref)
├── .mcp.json                   # MCP server configuration (referenced by plugin.json)
├── memory/                     # Runtime storage (created on first use, not committed)
│   ├── index.json              # O(1) lookup index by category/tag/file/quality
│   ├── incidents.jsonl         # Append-only log for fast full-text search
│   ├── MEMORY_SUMMARY.md       # Compressed context for LLM cold starts (<150 lines)
│   ├── INC_*.json              # Individual incident files (loaded on-demand)
│   └── archive/                # Evicted incidents (beyond 200 active or 180 days)
├── package.json
├── tsconfig.json
└── CLAUDE.md                   # Project-specific Claude instructions
```

---

## Development Commands

```bash
npm install       # Install dependencies
npm run build     # Compile TypeScript → dist/
npm test          # Run E2E validation (test-v1.4.0-e2e.js + test-v1.5.0-e2e.js)
npm run mcp       # Start MCP server (dist/src/mcp/server.js)
npm run benchmark # Run scoring benchmark (benchmark-scoring.js)
```

Build output goes to `dist/`. The MCP server entry point after build is `dist/src/mcp/server.js`.

---

## Core Architecture

### Verdict System

Every search returns one of four verdicts — never raw scores alone:

| Verdict | Meaning | Recommended Action |
|---|---|---|
| `KNOWN_FIX` | High-confidence pattern match | Apply fix directly |
| `LIKELY_MATCH` | Similar incidents found | Review for guidance |
| `WEAK_SIGNAL` | Loosely related, worth considering | Check before discarding |
| `NO_MATCH` | No prior knowledge | Debug fresh, then store result |

Entry point: `checkMemoryWithVerdict(symptom)` in `src/retrieval.ts`.

### Tiered Storage

Four layers kept in sync at all times:

| Layer | File | Purpose |
|---|---|---|
| Index | `memory/index.json` | O(1) lookups by category, tag, file, quality tier |
| Log | `memory/incidents.jsonl` | Append-only; fast full-text search across all incidents |
| Summary | `memory/MEMORY_SUMMARY.md` | Compressed context injected on LLM cold start (<150 lines) |
| Full | `memory/INC_*.json` | Individual incident files, loaded on-demand |

When any incident is written or updated, all four layers must be updated together. See `src/storage.ts`.

### Token-Budgeted Retrieval

Results are returned at one of three fidelity levels based on available token budget:

| Tier | Tokens per item | Type |
|---|---|---|
| Summary | ~100 | `IncidentSummary` |
| Compact | ~200 | `CompactIncident` / `CompactPattern` |
| Full | ~550 | `Incident` / `Pattern` |

Total default budget: 2500 tokens (30% patterns, 60% incidents, 10% metadata). Defined in `DEFAULT_TOKEN_BUDGET` in `src/types.ts`.

### Compound Incident IDs

Format: `INC_CATEGORY_YYYYMMDD_HHMMSS_xxxx`  
Example: `INC_API_20260215_143022_a1b2`

IDs encode category and timestamp so incidents are self-documenting when browsed as files without opening them.

### Auto-Archival

Incidents are moved to `memory/archive/` when:
- Active count exceeds 200, or
- Incident is older than 180 days

Use `archiveOldIncidents({ dryRun: true })` from `src/storage.ts` to preview what would be evicted.

---

## Commands (8 total)

All command definitions live in `commands/*.md`. This is the single source of truth — the plugin system reads them directly, and `postinstall` copies them to `.claude/commands/`. Edit only the source files, never the copies.

| Command | Purpose |
|---|---|
| `/assess <symptom>` | Parallel domain assessment — spawns multiple assessor agents simultaneously |
| `/debug-loop <symptom>` | Deep iterative debugging — causal tree root cause investigation, fix-verify-score-critique loop (up to 5x) |
| `/debugger <symptom>` | Search past bugs by symptom; show recent if no argument |
| `/debugger-detail <id>` | Load full incident or pattern by ID (INC_* or PTN_*) |
| `/debugger-scan` | Scan recent Claude sessions for debugging work, mine and store |
| `/debugger-status` | Show memory statistics (incident count, categories, quality distribution) |
| `/feedback <id> <worked\|failed\|modified>` | Record whether a suggested fix actually resolved the issue |
| `/update <id>` | Update an existing incident with new information |

---

## Agents (7 total)

Defined in `agents/*.md`. Domain assessors are invoked in parallel by `/assess`. Investigation and critique agents are used by the debug-loop skill.

| Agent | File | Domain |
|---|---|---|
| `assessment-orchestrator` | `agents/assessment-orchestrator.md` | Coordinates parallel assessment, aggregates results, produces ranked action plan |
| `api-assessor` | `agents/api-assessor.md` | Endpoints, auth, middleware, HTTP errors |
| `database-assessor` | `agents/database-assessor.md` | Queries, schema, migrations, connection issues |
| `fix-critique` | `agents/fix-critique.md` | Pressure-tests proposed fixes — challenges root cause vs symptom, regression risk, evidence gaps |
| `frontend-assessor` | `agents/frontend-assessor.md` | React, hooks, rendering, hydration, state |
| `performance-assessor` | `agents/performance-assessor.md` | Latency, memory leaks, CPU, bottlenecks |
| `root-cause-investigator` | `agents/root-cause-investigator.md` | Deep causal analysis via causal tree — explores multiple branches to find true root cause |

The assessment orchestrator uses domain keyword detection to decide which assessors to spawn. All spawned assessors run simultaneously, not sequentially.

The root-cause-investigator and fix-critique agents are used by the `debug-loop` skill for iterative debugging. The investigator builds causal trees (branching exploration, not linear chains); the critique agent challenges fixes before they're declared done.

---

## Skills (3 total)

| Skill | Directory | Behavior |
|---|---|---|
| `debug-loop` | `skills/debug-loop/` | Iterative root cause debugging: causal tree investigation, hypothesis testing, fix-verify-score-critique loop (up to 5x), transparent reporting |
| `debugging-memory` | `skills/debugging-memory/` | Auto-activates when bug symptoms are detected; injects relevant memory context. Escalates to debug-loop for non-trivial issues |
| `logging-tracer` | `skills/logging-tracer/` | Reads and analyzes project log files for error traces |

---

## Hooks (1 total)

Defined in `hooks/hooks.json`.

| Event | Action |
|---|---|
| `Stop` | Runs `npx @tyroneross/claude-code-debugger mine --days 1 --store` — mines the session audit trail for debugging work and stores any discovered incidents automatically |

The hook runs silently on every session end (errors suppressed with `|| true` so it never blocks shutdown).

---

## MCP Server

Transport: JSON-RPC 2.0 over stdio  
Entry point: `dist/src/mcp/server.js`  
Protocol version: `2025-11-25`

The server exposes 8 tools:

| Tool | Description |
|---|---|
| `search` | Search memory by symptom, returns verdict + matching incidents/patterns |
| `store` | Store a new debugging incident |
| `detail` | Load full incident (INC_*) or pattern (PTN_*) by ID |
| `status` | Memory statistics |
| `list` | List recent incidents |
| `patterns` | List all extracted fix patterns |
| `outcome` | Record whether a suggested fix worked, failed, or was modified |
| `read_logs` | Read project log files for error context |

Note: `console.log` is redirected to stderr inside tool handlers. The MCP protocol uses stdout as its transport channel — any stray stdout corrupts the JSON-RPC stream.

---

## Where to Make Changes

| What you want to change | Where to look |
|---|---|
| Verdict logic or search algorithm | `src/retrieval.ts` — this is the core; `checkMemoryWithVerdict()` is the entry point |
| Storage format | `src/storage.ts` — keep `index.json`, `incidents.jsonl`, and `INC_*.json` files in sync |
| MCP tool definitions or responses | `src/mcp/tools.ts` |
| MCP transport or protocol | `src/mcp/server.ts` |
| Assessor agent behavior | `agents/*.md` — each file is the full agent definition |
| Assessment orchestration logic | `agents/assessment-orchestrator.md` |
| Slash command behavior | `commands/*.md` — single source of truth, edit here only |
| Hook behavior | `hooks/hooks.json` |
| Token budget configuration | `DEFAULT_TOKEN_BUDGET` in `src/types.ts` |
| Pattern extraction | `src/pattern-extractor.ts` |
| Parallel search strategies | `src/parallel-retrieval.ts` |
| Context compression | `src/context-engine.ts` |
| Shared types | `src/types.ts` — types for Incident, Pattern, Verdict, Storage, Assessment |

---

## Key Invariants

These must hold after any change:

1. **Storage sync** — whenever an incident is written, `index.json`, `incidents.jsonl`, and the individual `INC_*.json` file are all updated in the same operation.
2. **stdout cleanliness** — nothing writes to stdout except the MCP JSON-RPC server. All internal logging goes to stderr or to log files.
3. **Command single source of truth** — `commands/*.md` is the only place to edit command definitions. Do not edit copies in `.claude/commands/` directly.
4. **Verdict completeness** — every search result returns a verdict. The four values (`KNOWN_FIX`, `LIKELY_MATCH`, `WEAK_SIGNAL`, `NO_MATCH`) are exhaustive; do not add a fifth without updating all consumers.
5. **Build before test** — `npm run build` must succeed before `npm test`. Tests run against compiled output in `dist/`, not source.

---

## Plugin Manifest

`.claude-plugin/plugin.json` declares the plugin identity and points to `.mcp.json` for MCP server configuration. Version must match `package.json`. Do not edit `plugin.json` version manually — it should track the package version.
