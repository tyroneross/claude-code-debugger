---
description: "Run parallel domain assessment for complex debugging symptoms"
allowed-tools: Bash, Read, Task
argument-hint: "<symptom>"
---

Run parallel domain-specific assessments (database, frontend, API, performance) for comprehensive debugging diagnosis.

{{#if ARGUMENTS}}

## Parallel Assessment Mode

The symptom "{{ARGUMENTS}}" will be analyzed across multiple domains simultaneously.

### Step 1: Analyze Symptom for Domain Indicators

First, detect which domains are likely involved:

**Domain Keywords:**
- **Database**: query, schema, migration, prisma, sql, connection, constraint, index, timeout
- **Frontend**: react, hook, useEffect, render, component, state, hydration, browser
- **API**: endpoint, route, request, response, auth, 500, 404, cors, jwt, middleware
- **Performance**: slow, latency, timeout, memory, leak, cpu, bottleneck, optimization

### Step 2: Launch Parallel Assessments

Based on detected domains, spawn the appropriate assessor agents **in parallel** using the Task tool:

For database issues, use `database-assessor` agent.
For frontend issues, use `frontend-assessor` agent.
For API issues, use `api-assessor` agent.
For performance issues, use `performance-assessor` agent.

If multiple domains are detected (recommended for complex issues), launch all relevant assessors simultaneously in a single message with multiple Task tool calls.

Pass this symptom to each assessor: "{{ARGUMENTS}}"

### Step 3: Aggregate Results

After all assessments complete:
1. Rank by confidence score (highest first)
2. Consider evidence count (more related incidents = higher priority)
3. Generate priority ranking of actions

### Step 4: Present Unified Report

Create output in this format:

```
## Parallel Assessment Results

**Symptom:** {{ARGUMENTS}}

### Assessment Summary
[List each domain assessment with confidence bar]

### Priority Ranking
1. [Highest confidence domain]: [Recommended action]
2. [Next domain]: [Action]
...

### Recommended Sequence
1. [First action to take]
2. [Second action]
3. [Third action]
```

### Memory Search

Also search debugging memory for any existing similar incidents:

```bash
npx @tyroneross/claude-code-debugger debug "{{ARGUMENTS}}"
```

Integrate memory results with assessment findings for comprehensive diagnosis.

{{else}}

No symptom provided for assessment.

To use parallel assessment, provide a description of the issue:

```
/assess <your symptom description>
```

**Examples:**
- `/assess search is slow and returns wrong results`
- `/assess 500 error on user registration API`
- `/assess react component re-renders infinitely`
- `/assess database connection timeout during peak hours`

For single-domain issues, use `/debugger` instead for simpler memory search.

{{/if}}
