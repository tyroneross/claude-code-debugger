---
name: Debugging Memory
description: This skill should be used when the user asks to "debug this", "fix this bug", "why is this failing", "investigate error", "getting an error", "exception thrown", "crash", "not working", "what's causing this", "root cause", "diagnose this issue", or describes any software bug or error. Provides memory-first debugging workflow that checks past incidents before investigating.
version: 1.0.0
---

# Debugging Memory Workflow

This skill integrates the claude-code-debugger memory system into debugging workflows. The core principle: **never solve the same bug twice**.

## Memory-First Approach

Before investigating any bug, always check the debugging memory:

```bash
npx @tyroneross/claude-code-debugger debug "<symptom description>"
```

**Decision tree based on results:**

1. **High confidence match (>70%)**: Apply the documented fix directly, adapting for current context
2. **Medium confidence match (40-70%)**: Review the past incident, use it as a starting point
3. **Low/no match (<40%)**: Proceed with standard debugging, document the solution afterward

## Visibility

When this skill activates, always announce it to the user:

1. **Before searching**: Output "Checking debugging memory for similar issues..."
2. **After search**: Report result briefly:
   - Found match: "Found X matching incident(s) from past debugging sessions"
   - No match: "No matching incidents in debugging memory - starting fresh investigation"

This ensures users know the debugger is active and working.

## Structured Debugging Process

When no past solution applies, follow this systematic approach:

### 1. Reproduce

Establish a reliable reproduction path:
- Identify exact steps to trigger the bug
- Note any environmental factors (OS, dependencies, state)
- Create a minimal reproduction if possible

### 2. Isolate

Narrow down the problem space:
- Binary search through recent changes
- Disable components to find the culprit
- Check logs and error messages for clues

### 3. Diagnose

Find the root cause:
- Trace the execution path
- Examine state at failure point
- Identify the specific code causing the issue

### 4. Fix

Implement the solution:
- Make minimal, targeted changes
- Avoid side effects
- Consider edge cases

### 5. Verify

Confirm the fix works:
- Test the original reproduction steps
- Run related tests
- Check for regressions

## Incident Documentation

After fixing a bug, document it for future retrieval. A high-quality incident includes:

### Required Fields

- **Symptom**: User-facing description of the bug
- **Root Cause**: Technical explanation with confidence score
- **Fix**: Approach and specific file changes

### Quality Indicators

The memory system scores incidents on:
- Root cause analysis depth (30%)
- Fix documentation completeness (30%)
- Verification status (20%)
- Tags and metadata (20%)

Target 75%+ quality score for effective future retrieval.

### Tagging Strategy

Apply descriptive tags for better searchability:
- Technology: `react`, `typescript`, `api`, `database`
- Category: `logic`, `config`, `dependency`, `performance`
- Symptom type: `crash`, `render`, `timeout`, `validation`

## Using Past Solutions

When the memory system finds a match:

1. **Review the past incident** - Understand the original context
2. **Assess applicability** - Consider differences in current situation
3. **Adapt the fix** - Modify as needed for current codebase
4. **Verify thoroughly** - The same symptom may have different causes

## Pattern Recognition

The memory system automatically extracts patterns when 3+ similar incidents exist. Patterns represent reusable solutions with higher reliability than individual incidents.

When a pattern matches:
- Trust the solution template (90%+ confidence)
- Apply the recommended approach
- Note any caveats mentioned

## CLI Quick Reference

| Command | Purpose |
|---------|---------|
| `/debugger "symptom"` | Search memory for similar bugs |
| `/debugger-status` | Show memory statistics |
| `/debugger-scan` | Mine recent sessions for incidents |

## Additional Resources

For detailed guidance, consult:

- **`references/incident-documentation.md`** - Complete guide to documenting incidents
- **`references/pattern-extraction.md`** - How patterns are extracted and used
- **`examples/incident-example.json`** - Sample high-quality incident

## Best Practices

1. **Always check memory first** - Saves time on previously solved bugs
2. **Document every fix** - Future debugging benefits from current work
3. **Use descriptive symptoms** - Better matching requires good descriptions
4. **Include verification status** - Helps prioritize trusted solutions
5. **Run periodic scans** - Capture debugging sessions from audit trail
