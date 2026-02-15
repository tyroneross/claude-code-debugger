/**
 * Interactive Onboarding - `claude-code-debugger init`
 *
 * Streamlined terminal setup flow:
 * 1. Welcome
 * 2. Memory mode selection
 * 3. Directory setup
 * 4. Hook + command configuration
 * 5. Self-test verification
 * 6. Next steps
 */

import * as fs from 'fs';
import * as path from 'path';
import prompts from 'prompts';
import { getConfig, getMemoryPaths } from '../src/config';
import { getMemoryStats } from '../src/storage';

// ─── Terminal formatting ────────────────────────────────────────────────────

const DIM = '\x1b[2m';
const BOLD = '\x1b[1m';
const GREEN = '\x1b[32m';
const CYAN = '\x1b[36m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

function line(text = '') { console.log(text); }
function dim(text: string) { return `${DIM}${text}${RESET}`; }
function bold(text: string) { return `${BOLD}${text}${RESET}`; }
function green(text: string) { return `${GREEN}${text}${RESET}`; }
function cyan(text: string) { return `${CYAN}${text}${RESET}`; }
function red(text: string) { return `${RED}${text}${RESET}`; }
function yellow(text: string) { return `${YELLOW}${text}${RESET}`; }

function banner() {
  line();
  line(`  ${bold('Claude Code Debugger')}`);
  line(`  ${dim('Never solve the same bug twice')}`);
  line();
  line(`  ${dim('─'.repeat(44))}`);
  line();
}

function stepHeader(step: number, total: number, label: string) {
  line(`  ${dim(`[${step}/${total}]`)} ${bold(label)}`);
}

// ─── Setup steps ────────────────────────────────────────────────────────────

interface SetupResult {
  mode: 'local' | 'shared';
  memoryPath: string;
  dirsCreated: boolean;
  hooksConfigured: boolean;
  commandsCreated: boolean;
  claudeMdUpdated: boolean;
  selfTestPassed: boolean;
}

export async function runInit(): Promise<void> {
  banner();

  const projectRoot = process.cwd();
  const result: SetupResult = {
    mode: 'local',
    memoryPath: '',
    dirsCreated: false,
    hooksConfigured: false,
    commandsCreated: false,
    claudeMdUpdated: false,
    selfTestPassed: false,
  };

  // ── Check for existing setup ────────────────────────────────────────────
  const existingMemory = path.join(projectRoot, '.claude', 'memory');
  if (fs.existsSync(existingMemory)) {
    line(`  ${yellow('!')} Existing setup detected at ${dim('.claude/memory/')}`);
    line();

    const { action } = await prompts({
      type: 'select',
      name: 'action',
      message: 'What would you like to do?',
      choices: [
        { title: 'Verify setup', description: 'Run self-test on existing config', value: 'verify' },
        { title: 'Reconfigure', description: 'Start fresh setup', value: 'reconfigure' },
        { title: 'Exit', value: 'exit' },
      ],
    });

    if (action === 'exit' || action === undefined) {
      line(`\n  ${dim('Setup cancelled.')}\n`);
      return;
    }

    if (action === 'verify') {
      await runSelfTest(result);
      printSummary(result);
      return;
    }
  }

  const TOTAL_STEPS = 4;

  // ── Step 1: Memory mode ─────────────────────────────────────────────────
  stepHeader(1, TOTAL_STEPS, 'Memory mode');
  line();

  const { mode } = await prompts({
    type: 'select',
    name: 'mode',
    message: 'Where should debugging memory be stored?',
    choices: [
      {
        title: 'Project',
        description: 'Store in .claude/memory/ (per-project, committed to git)',
        value: 'local',
      },
      {
        title: 'Shared',
        description: 'Store in ~/.claude-memory/ (shared across all projects)',
        value: 'shared',
      },
    ],
    initial: 0,
  });

  if (mode === undefined) {
    line(`\n  ${dim('Setup cancelled.')}\n`);
    return;
  }

  result.mode = mode;

  if (mode === 'shared') {
    process.env.CLAUDE_MEMORY_MODE = 'shared';
  }

  const config = getConfig({ storageMode: mode });
  const paths = getMemoryPaths(config);
  result.memoryPath = paths.root;

  line();

  // ── Step 2: Create directories ──────────────────────────────────────────
  stepHeader(2, TOTAL_STEPS, 'Create memory directories');
  line();

  try {
    fs.mkdirSync(paths.incidents, { recursive: true });
    fs.mkdirSync(paths.patterns, { recursive: true });
    fs.mkdirSync(paths.sessions, { recursive: true });
    result.dirsCreated = true;
    line(`  ${green('+')} ${dim(paths.root)}`);
    line(`  ${green('+')} ${dim('incidents/')}`);
    line(`  ${green('+')} ${dim('patterns/')}`);
    line(`  ${green('+')} ${dim('sessions/')}`);
  } catch (err) {
    line(`  ${red('x')} Failed to create directories: ${(err as Error).message}`);
  }

  line();

  // ── Step 3: Configure hooks + commands ──────────────────────────────────
  stepHeader(3, TOTAL_STEPS, 'Configure hooks and commands');
  line();

  // Hooks
  try {
    const { configureHooks } = await import('../src/setup/configure-hooks');
    const hooksOk = await configureHooks(projectRoot);
    result.hooksConfigured = !!hooksOk;
    line(`  ${hooksOk ? green('+') : dim('-')} Session hooks`);
  } catch {
    line(`  ${dim('-')} Session hooks (skipped)`);
  }

  // Slash commands
  try {
    const { createSlashCommands } = await import('../src/setup/create-slash-commands');
    const count = await createSlashCommands(projectRoot);
    result.commandsCreated = count > 0;
    line(`  ${count > 0 ? green('+') : dim('-')} ${count} slash commands`);
  } catch {
    line(`  ${dim('-')} Slash commands (skipped)`);
  }

  // CLAUDE.md
  try {
    const { injectClaudeMd } = await import('../src/setup/inject-claude-md');
    const updated = await injectClaudeMd(projectRoot);
    result.claudeMdUpdated = !!updated;
    line(`  ${updated ? green('+') : dim('-')} CLAUDE.md`);
  } catch {
    line(`  ${dim('-')} CLAUDE.md (skipped)`);
  }

  line();

  // ── Step 4: Self-test ───────────────────────────────────────────────────
  stepHeader(4, TOTAL_STEPS, 'Verify installation');
  line();

  await runSelfTest(result);

  // ── Summary ─────────────────────────────────────────────────────────────
  printSummary(result);
}

async function runSelfTest(result: SetupResult): Promise<void> {
  const checks: { label: string; ok: boolean }[] = [];

  // Check 1: Memory directories exist
  const config = getConfig();
  const paths = getMemoryPaths(config);
  checks.push({
    label: 'Memory directories',
    ok: fs.existsSync(paths.incidents) && fs.existsSync(paths.patterns),
  });

  // Check 2: Can write and read
  let canWrite = false;
  const testFile = path.join(paths.root, '.selftest');
  try {
    fs.writeFileSync(testFile, 'ok');
    canWrite = fs.readFileSync(testFile, 'utf-8') === 'ok';
    fs.unlinkSync(testFile);
  } catch { /* skip */ }
  checks.push({ label: 'Read/write access', ok: canWrite });

  // Check 3: Module loads
  let moduleOk = false;
  try {
    const lib = require('../dist/src/index.js');
    moduleOk = typeof lib.checkMemory === 'function';
  } catch { /* skip */ }
  checks.push({ label: 'Core module', ok: moduleOk });

  // Check 4: Memory stats
  let statsOk = false;
  try {
    const stats = await getMemoryStats();
    statsOk = stats !== null && stats !== undefined;
  } catch { /* skip */ }
  checks.push({ label: 'Memory stats', ok: statsOk });

  for (const check of checks) {
    line(`  ${check.ok ? green('+') : red('x')} ${check.label}`);
  }

  result.selfTestPassed = checks.every(c => c.ok);
  line();
}

function printSummary(result: SetupResult): void {
  line(`  ${dim('─'.repeat(44))}`);
  line();

  if (result.selfTestPassed) {
    line(`  ${green('Ready.')} Debugging memory is active.`);
  } else {
    line(`  ${yellow('Partial setup.')} Some checks failed — see above.`);
  }

  line();
  line(`  ${bold('Quick start:')}`);
  line(`    ${cyan('/debugger "error message"')}  Search past bugs`);
  line(`    ${cyan('/debugger-status')}           Memory stats`);
  line(`    ${cyan('claude-code-debugger status')} CLI status`);
  line();
  line(`  ${dim('Memory learns from your debugging sessions automatically.')}`);
  line();
}
