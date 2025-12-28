#!/usr/bin/env node
/**
 * Auto-Setup Script
 *
 * Runs automatically after npm install to set up debugging memory.
 * Zero user action required - just install and it works.
 */

import * as fs from 'fs';
import * as path from 'path';
import { createSlashCommands } from './create-slash-commands';
import { configureHooks } from './configure-hooks';
import { injectClaudeMd } from './inject-claude-md';

/**
 * Find the project root
 *
 * During npm postinstall, process.cwd() is the target project root.
 * We use that directly as it's the most reliable method.
 */
function findProjectRoot(): string {
  // npm sets INIT_CWD to the original working directory
  // This is the most reliable way to find the target project
  if (process.env.INIT_CWD) {
    return process.env.INIT_CWD;
  }

  // Fallback to cwd (which is usually correct during postinstall)
  return process.cwd();
}

/**
 * Check if we should skip auto-setup
 */
function shouldSkip(): boolean {
  // Skip in CI environments
  if (process.env.CI) {
    return true;
  }

  // Skip global installs
  if (process.env.npm_config_global === 'true') {
    return true;
  }

  // Skip if explicitly disabled
  if (process.env.CLAUDE_MEMORY_SKIP_SETUP === 'true') {
    return true;
  }

  return false;
}

/**
 * Main auto-setup function
 */
async function autoSetup(): Promise<void> {
  if (shouldSkip()) {
    return;
  }

  const projectRoot = findProjectRoot();

  // Verify we found a real project (not just our package during development)
  const projectPkg = path.join(projectRoot, 'package.json');
  if (!fs.existsSync(projectPkg)) {
    return;
  }

  // Skip if this is our own package (development mode)
  try {
    const pkg = JSON.parse(fs.readFileSync(projectPkg, 'utf-8'));
    if (pkg.name === '@tyroneross/claude-code-debugger') {
      return;
    }
  } catch {
    // Ignore parse errors
  }

  console.log('\n🧠 Setting up debugging memory...\n');

  try {
    // 1. Create memory directories in the target project
    const memoryPath = path.join(projectRoot, '.claude', 'memory');
    fs.mkdirSync(path.join(memoryPath, 'incidents'), { recursive: true });
    fs.mkdirSync(path.join(memoryPath, 'patterns'), { recursive: true });
    fs.mkdirSync(path.join(memoryPath, 'sessions'), { recursive: true });
    console.log('✓ Created .claude/memory/');

    // 2. Create slash commands
    try {
      const commandsCreated = await createSlashCommands(projectRoot);
      if (commandsCreated > 0) {
        console.log(`✓ Added ${commandsCreated} slash commands`);
      }
    } catch {
      // Silently skip if slash commands can't be created
    }

    // 3. Configure hooks
    try {
      const hooksConfigured = await configureHooks(projectRoot);
      if (hooksConfigured) {
        console.log('✓ Configured session hooks');
      }
    } catch {
      // Silently skip if hooks can't be configured
    }

    // 4. Inject into CLAUDE.md
    try {
      const claudeMdUpdated = await injectClaudeMd(projectRoot);
      if (claudeMdUpdated) {
        console.log('✓ Updated CLAUDE.md');
      }
    } catch {
      // Silently skip if CLAUDE.md can't be updated
    }

    console.log('\n✅ Debugging memory is now active!');
    console.log('   Claude will check past solutions automatically.');
    console.log('   Commands: /debugger "symptom" | /debugger-status | /update\n');

  } catch (error) {
    // Don't fail install, just warn
    console.warn('⚠️  Auto-setup skipped:', (error as Error).message);
  }
}

// Run setup
autoSetup().catch(() => {
  // Silently fail - never break npm install
});
