---
description: "Search past bugs for similar issues before debugging"
allowedTools: ["Bash", "Read"]
---

{{#if ARGUMENTS}}
! npx @tyroneross/claude-code-debugger debug "$ARGUMENTS"

Checked debugging memory for similar past incidents.
If a match was found with >70% confidence, I'll try that solution first.
{{else}}
! npx @tyroneross/claude-code-debugger status

No symptom provided. Showing recent issues from memory.
Please describe what you're debugging, or pick from a recent issue above.
{{/if}}
