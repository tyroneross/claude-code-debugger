#!/usr/bin/env node
/**
 * Claude Code Debugger - CLI Interface
 *
 * Command-line tool for debugging memory system
 */

import { Command } from 'commander';
import { version } from '../package.json';
import { debugWithMemory, storeDebugIncident, getMemoryStatus } from '../src/debug-wrapper';
import { suggestPatterns, extractPatterns } from '../src/pattern-extractor';
import { previewAuditMining, mineAuditTrail } from '../src/audit-miner';
import { displayConfig } from '../src/config';
import { checkMemory } from '../src/retrieval';
import {
  batchReviewIncomplete,
  batchExtractPatterns,
  batchCleanup
} from '../src/batch-operations';

const program = new Command();

program
  .name('claude-code-debugger')
  .description('Debugging memory system - never solve the same bug twice')
  .version(version);

// Debug command
program
  .command('debug <symptom>')
  .description('Check memory for similar incidents before debugging')
  .option('--shared', 'Use shared memory mode')
  .option('--threshold <number>', 'Similarity threshold (0-1)', '0.5')
  .action(async (symptom: string, options: { shared?: boolean; threshold?: string }) => {
    try {
      if (options.shared) {
        process.env.CLAUDE_MEMORY_MODE = 'shared';
      }

      const result = await debugWithMemory(symptom, {
        min_confidence: parseFloat(options.threshold || '0.5')
      });

      console.log('\n📝 Session ID:', result.context_used.session_id);
      console.log('\nAfter fixing, run: claude-code-debugger store\n');

    } catch (error: any) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  });

// Status command
program
  .command('status')
  .description('Show memory statistics')
  .option('--shared', 'Use shared memory mode')
  .action(async (options: { shared?: boolean }) => {
    try {
      if (options.shared) {
        process.env.CLAUDE_MEMORY_MODE = 'shared';
      }

      await getMemoryStatus();
    } catch (error: any) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  });

// Config command
program
  .command('config')
  .description('Show current configuration')
  .action(() => {
    displayConfig();
  });

// Search command
program
  .command('search <query>')
  .description('Search memory for incidents')
  .option('--shared', 'Use shared memory mode')
  .option('--threshold <number>', 'Similarity threshold', '0.5')
  .action(async (query: string, options: { shared?: boolean; threshold?: string }) => {
    try {
      if (options.shared) {
        process.env.CLAUDE_MEMORY_MODE = 'shared';
      }

      const result = await checkMemory(query, {
        similarity_threshold: parseFloat(options.threshold || '0.5')
      });

      console.log(`\n📊 Found ${result.incidents.length} incidents:\n`);

      result.incidents.forEach((inc, i) => {
        console.log(`${i + 1}. ${inc.symptom?.substring(0, 60) ?? 'Unknown'}...`);
        console.log(`   Match: ${((inc.similarity_score ?? 0) * 100).toFixed(0)}%`);
        console.log(`   Fix: ${inc.fix?.approach?.substring(0, 60) ?? 'Unknown'}...\n`);
      });

    } catch (error: any) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  });

// Pattern commands
program
  .command('patterns')
  .description('Suggest patterns to extract')
  .option('--shared', 'Use shared memory mode')
  .option('--extract', 'Extract and store patterns')
  .action(async (options: { shared?: boolean; extract?: boolean }) => {
    try {
      if (options.shared) {
        process.env.CLAUDE_MEMORY_MODE = 'shared';
      }

      if (options.extract) {
        await extractPatterns({
          min_incidents: 3,
          min_similarity: 0.5,
          auto_store: true
        });
      } else {
        await suggestPatterns();
      }

    } catch (error: any) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  });

// Mine command
program
  .command('mine')
  .description('Mine audit trail for incidents')
  .option('--shared', 'Use shared memory mode')
  .option('--days <number>', 'Days to look back', '30')
  .option('--store', 'Store mined incidents')
  .action(async (options: { shared?: boolean; days?: string; store?: boolean }) => {
    try {
      if (options.shared) {
        process.env.CLAUDE_MEMORY_MODE = 'shared';
      }

      const days = parseInt(options.days || '30', 10);

      if (options.store) {
        await mineAuditTrail({
          days_back: days,
          auto_store: true,
          min_confidence: 0.7
        });
      } else {
        await previewAuditMining(days);
      }

    } catch (error: any) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  });

// Batch operations command
program
  .command('batch')
  .description('Batch operations for maintenance')
  .option('--incomplete', 'Review incomplete incidents interactively')
  .option('--extract-patterns', 'Extract patterns from existing incidents')
  .option('--cleanup', 'Clean up old sessions and low-quality incidents')
  .option('--category <category>', 'Filter by category (for pattern extraction)')
  .option('--min-incidents <number>', 'Minimum incidents for pattern (default: 3)', '3')
  .option('--older-than <days>', 'Age threshold for cleanup (default: 90)', '90')
  .option('--dry-run', 'Preview cleanup without making changes')
  .option('--shared', 'Use shared memory mode')
  .action(async (options: {
    incomplete?: boolean;
    extractPatterns?: boolean;
    cleanup?: boolean;
    category?: string;
    minIncidents?: string;
    olderThan?: string;
    dryRun?: boolean;
    shared?: boolean;
  }) => {
    try {
      if (options.shared) {
        process.env.CLAUDE_MEMORY_MODE = 'shared';
      }

      // Determine config
      const config = undefined; // Will use default from env

      // Run requested batch operations
      if (options.incomplete) {
        await batchReviewIncomplete(config);
      }

      if (options.extractPatterns) {
        const patterns = await batchExtractPatterns({
          category: options.category,
          minIncidents: parseInt(options.minIncidents || '3', 10),
          config
        });
        console.log(`✨ Extracted ${patterns.length} patterns`);
      }

      if (options.cleanup) {
        await batchCleanup({
          olderThanDays: parseInt(options.olderThan || '90', 10),
          dryRun: options.dryRun,
          config
        });
      }

      // If no options specified, show help
      if (!options.incomplete && !options.extractPatterns && !options.cleanup) {
        console.log('\n💡 Batch Operations');
        console.log('═══════════════════════════════════════════════\n');
        console.log('Available batch operations:\n');
        console.log('  --incomplete         Review incomplete incidents interactively');
        console.log('  --extract-patterns   Extract patterns from similar incidents');
        console.log('  --cleanup            Clean up old sessions and low-quality incidents\n');
        console.log('Examples:\n');
        console.log('  claude-code-debugger batch --incomplete');
        console.log('  claude-code-debugger batch --extract-patterns --category react-hooks');
        console.log('  claude-code-debugger batch --cleanup --older-than 90 --dry-run\n');
      }

    } catch (error: any) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  });

// Check-file command (PreToolUse hook)
program
  .command('check-file [filepath]')
  .description('Check if a file has been involved in past incidents (used by PreToolUse hook)')
  .action(async (filepath?: string) => {
    if (!filepath) {
      // No file path provided (hook may not have file context)
      process.exit(0);
    }
    try {
      const { loadAllIncidents } = await import('../src/storage');
      const incidents = await loadAllIncidents();

      // Check if this file appears in any past incidents
      const relatedIncidents = incidents.filter(inc =>
        (inc.files_changed ?? []).some(f => filepath.includes(f) || f.includes(filepath)) ||
        inc.root_cause?.file === filepath
      );

      if (relatedIncidents.length > 0) {
        console.log(`\n⚠️  DEBUGGING MEMORY WARNING: ${filepath}`);
        console.log(`   This file has been involved in ${relatedIncidents.length} past incident(s):\n`);
        for (const inc of relatedIncidents.slice(0, 3)) {
          const symptomPreview = (inc.symptom || '').substring(0, 60);
          console.log(`   - ${symptomPreview}... (${inc.root_cause?.category || 'unknown'})`);
        }
        console.log('');
      }
    } catch {
      // Silently ignore errors in hook - must not block editing
    }
  });

// Capture-error command (PostToolUse hook)
program
  .command('capture-error')
  .description('Capture error output from tool execution (used by PostToolUse hook)')
  .action(async () => {
    try {
      // Read last tool output from stdin if available
      const { getConfig } = await import('../src/config');
      const { getMemoryPaths } = await import('../src/config');
      const fs = await import('fs/promises');
      const path = await import('path');

      const config = getConfig();
      const paths = getMemoryPaths(config);
      const errorsDir = path.join(paths.root, 'captured-errors');
      await fs.mkdir(errorsDir, { recursive: true });

      // Check if there's stdin data (piped error output)
      const stdin = process.stdin;
      if (!stdin.isTTY) {
        let data = '';
        stdin.setEncoding('utf-8');
        for await (const chunk of stdin) {
          data += chunk;
          if (data.length > 5000) break; // Cap capture size
        }

        if (data && (data.includes('Error') || data.includes('error') || data.includes('FAIL') || data.includes('Exception'))) {
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          await fs.writeFile(
            path.join(errorsDir, `err_${timestamp}.txt`),
            data.substring(0, 5000),
            'utf-8'
          );
        }
      }
    } catch {
      // Silently ignore - must not interfere with session
    }
  });

// Feedback command
program
  .command('feedback')
  .description('Submit feedback or report issues')
  .option('--bug', 'Report a bug')
  .option('--feature', 'Request a feature')
  .action(async (options: { bug?: boolean; feature?: boolean }) => {
    const { exec } = await import('child_process');

    console.log('\n💬 Claude Code Debugger - Feedback');
    console.log('═══════════════════════════════════════════════\n');

    // Determine issue type
    let issueType = 'feedback';
    let labels = 'feedback';
    let title = '';
    let body = '';

    if (options.bug) {
      issueType = 'bug';
      labels = 'bug';
      title = encodeURIComponent('[Bug] ');
      body = encodeURIComponent(`## Description
Describe the bug...

## Steps to Reproduce
1.
2.
3.

## Expected Behavior


## Actual Behavior


## Environment
- Version: ${version}
- Node: ${process.version}
- OS: ${process.platform}
`);
    } else if (options.feature) {
      issueType = 'feature';
      labels = 'enhancement';
      title = encodeURIComponent('[Feature] ');
      body = encodeURIComponent(`## Feature Request
Describe the feature...

## Use Case
Why is this needed?

## Proposed Solution

`);
    } else {
      body = encodeURIComponent(`## Feedback
Your feedback here...

---
Version: ${version}
`);
    }

    const url = `https://github.com/tyroneross/claude-code-debugger/issues/new?labels=${labels}&title=${title}&body=${body}`;

    console.log(`   Opening GitHub to submit ${issueType}...\n`);

    // Open browser (cross-platform)
    const openCommand = process.platform === 'darwin' ? 'open' :
                        process.platform === 'win32' ? 'start' : 'xdg-open';

    exec(`${openCommand} "${url}"`, (error) => {
      if (error) {
        console.log('   Could not open browser automatically.');
        console.log(`   Please visit: ${url}\n`);
      } else {
        console.log('   ✅ Browser opened! Create your issue on GitHub.\n');
      }
    });
  });

// Update command
program
  .command('update')
  .description('Check for updates and optionally install the latest version')
  .option('-y, --yes', 'Skip confirmation prompt and install immediately')
  .action(async (options: { yes?: boolean }) => {
    const { execSync } = await import('child_process');
    const prompts = await import('prompts');

    console.log('\n🔄 Claude Code Debugger - Update Check');
    console.log('═══════════════════════════════════════════════\n');

    try {
      // Get current version
      console.log(`   Current version: ${version}`);

      // Check latest version and changelog from npm
      const pkgInfoRaw = execSync('npm view @tyroneross/claude-code-debugger --json 2>/dev/null', {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe']
      }).trim();

      const pkgInfo = JSON.parse(pkgInfoRaw);
      const latestVersion = pkgInfo.version;

      console.log(`   Latest version:  ${latestVersion}`);

      if (version === latestVersion) {
        console.log('\n✅ Already up to date!\n');
        return;
      }

      console.log(`\n📦 Update available: ${version} → ${latestVersion}\n`);

      // Fetch changelog from GitHub releases
      let changelog = '';
      try {
        const https = await import('https');
        changelog = await new Promise<string>((resolve) => {
          https.get('https://api.github.com/repos/tyroneross/claude-code-debugger/releases/latest', {
            headers: { 'User-Agent': 'claude-code-debugger' }
          }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
              try {
                const release = JSON.parse(data);
                resolve(release.body || '');
              } catch {
                resolve('');
              }
            });
          }).on('error', () => resolve(''));
        });
      } catch {
        // Ignore fetch errors
      }

      // Display what's new
      console.log('📋 What\'s new:');
      if (changelog) {
        const lines = changelog.split('\n').slice(0, 5);
        lines.forEach((line: string) => {
          const trimmed = line.substring(0, 70);
          if (trimmed) console.log(`   ${trimmed}${line.length > 70 ? '...' : ''}`);
        });
      } else {
        console.log('   See: https://github.com/tyroneross/claude-code-debugger/releases');
      }
      console.log('');

      // Prompt user for confirmation unless --yes flag is passed
      let shouldInstall = options.yes;

      if (!shouldInstall) {
        const response = await prompts.default({
          type: 'confirm',
          name: 'confirm',
          message: 'Would you like to install this update?',
          initial: true
        });

        shouldInstall = response.confirm;
      }

      if (!shouldInstall) {
        console.log('\n⏭️  Update skipped.\n');
        return;
      }

      // Perform update
      console.log('\n📥 Installing update...\n');

      execSync('npm install @tyroneross/claude-code-debugger@latest', {
        stdio: 'inherit',
        cwd: process.cwd()
      });

      console.log('\n✅ Update complete!');
      console.log('   Restart your terminal or run: npx @tyroneross/claude-code-debugger status\n');

    } catch (error: any) {
      if (error.message?.includes('npm view')) {
        console.error('❌ Could not check npm registry. Are you online?');
      } else {
        console.error('❌ Update failed:', error.message);
      }
      process.exit(1);
    }
  });

program.parse();
