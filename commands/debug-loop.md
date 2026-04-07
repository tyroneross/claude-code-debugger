---
description: "Deep iterative debugging: investigate root cause with causal tree analysis, fix, verify, score, critique — up to 5 iterations"
allowed-tools: Bash, Read, Task, Agent
argument-hint: "<symptom>"
---

{{#if ARGUMENTS}}

Start the debug loop for: "{{ARGUMENTS}}"

Load the `debug-loop` skill and follow its 7-phase process:

1. **INVESTIGATE** — Search memory, reproduce, deploy root-cause-investigator for causal tree analysis
2. **HYPOTHESIZE** — State root cause with confidence, predict verification test
3. **FIX** — Implement targeted minimal fix
4. **VERIFY** — Run tests, reproduction steps, check regressions
5. **SCORE** — Pass/fail scorecard with evidence
6. **CRITIQUE** — Deploy fix-critique agent to pressure-test
7. **REPORT** — Transparent status with ✅/⚠️/❓ markers

Iterate up to 5x if criteria fail or critique challenges the fix.

{{else}}

Provide a symptom to investigate deeply: `/debug-loop <description>`

Examples:
- `/debug-loop tests pass locally but fail in CI`
- `/debug-loop login works once then breaks on refresh`
- `/debug-loop this error keeps coming back after fixing it`
- `/debug-loop API returns wrong data intermittently`

For quick memory lookup, use `/debugger` instead.
For multi-domain assessment, use `/assess` instead.
This command is for deep investigation when surface-level diagnosis isn't enough.

{{/if}}
