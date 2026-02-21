---
description: "Update claude-code-debugger to the latest version"
allowed-tools: Bash, Read, Write
---

Update the debugging memory system using npx.

## Step 1: Check versions

```bash
CURRENT=$(npx @tyroneross/claude-code-debugger --version 2>/dev/null || echo "not installed")
LATEST=$(npm view @tyroneross/claude-code-debugger version 2>/dev/null || echo "unknown")
echo "Current: $CURRENT"
echo "Latest:  $LATEST"
```

If versions match, inform the user they are up to date and stop.

## Step 2: Show what's new

If an update is available, check the changelog:

```bash
npm view @tyroneross/claude-code-debugger description 2>/dev/null
```

Tell the user what version is available and ask if they want to update.

## Step 3: Install via npx

Run the update using npx to fetch and execute the latest version directly:

```bash
npx @tyroneross/claude-code-debugger@latest update -y
```

This uses npx to always pull the latest package from the registry, then runs the built-in update command which handles installation and setup.

## Step 4: Re-run setup

After installation, re-run the auto-setup to sync commands, hooks, and CLAUDE.md:

```bash
npx @tyroneross/claude-code-debugger@latest setup 2>/dev/null || true
```

## Step 5: Verify

Confirm the update succeeded:

```bash
npx @tyroneross/claude-code-debugger --version
```

Report the new version to the user.
