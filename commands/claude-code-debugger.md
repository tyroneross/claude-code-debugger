---
name: claude-code-debugger
description: Main claude-code-debugger entry. Dispatches to a subcommand based on your request, or lists options if unclear. Use `claude-code-debugger:<subcommand>` to target a specific action directly.
argument-hint: "[what you want to do]"
---

# /claude-code-debugger — Router

Route this request to the appropriate claude-code-debugger subcommand or skill based on the user's intent.

**Raw user input**: $ARGUMENTS

## Routing logic

1. If `$ARGUMENTS` is empty or only whitespace: list the available subcommands below and ask the user what they want to do.
2. Otherwise: match the user's natural-language request against the subcommand intents below and invoke the best match.
3. If the request clearly doesn't fit any subcommand but matches a `claude-code-debugger` skill (listed in your available skills), load the skill and follow its guidance instead.
4. If nothing fits, say so and list the subcommands. Do NOT guess.

## Available subcommands

- **`/claude-code-debugger:assess`** — Run parallel domain assessment for complex debugging symptoms
- **`/claude-code-debugger:debug-loop`** — Deep iterative debugging: investigate root cause with causal tree analysis, fix,
- **`/claude-code-debugger:debugger-detail`**
- **`/claude-code-debugger:debugger-scan`** — Scan recent sessions for debugging incidents
- **`/claude-code-debugger:debugger-status`** — Show debugging memory statistics
- **`/claude-code-debugger:debugger`** — Search past bugs for similar issues before debugging
- **`/claude-code-debugger:feedback`** — Submit feedback or report issues
- **`/claude-code-debugger:update`** — Update claude-code-debugger to the latest version


## Examples

- User types `/claude-code-debugger` alone → list subcommands, ask for direction
- User types `/claude-code-debugger <free-form request>` → match intent, invoke subcommand
- User types `/claude-code-debugger:<specific>` → bypass this router entirely (direct invocation)

## Rules

- Prefer the most specific subcommand match. If two could fit, ask which.
- Never invent a new subcommand. Only route to ones listed above.
- If the user is describing a workflow that spans multiple subcommands, outline the sequence and ask whether to proceed.
