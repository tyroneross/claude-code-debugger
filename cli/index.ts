#!/usr/bin/env node
/**
 * Claude Memory - CLI Interface
 *
 * Command-line tool for debugging memory system
 */

import { Command } from 'commander';
import { debugWithMemory, storeDebugIncident, getMemoryStatus } from '../src/debug-wrapper';
import { suggestPatterns, extractPatterns } from '../src/pattern-extractor';
import { previewAuditMining, mineAuditTrail } from '../src/audit-miner';
import { displayConfig } from '../src/config';
import { checkMemory } from '../src/retrieval';

const program = new Command();

program
  .name('claude-memory')
  .description('Debugging memory system - never solve the same bug twice')
  .version('1.0.0');

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
      console.log('\nAfter fixing, run: claude-memory store\n');

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
        console.log(`${i + 1}. ${inc.symptom.substring(0, 60)}...`);
        console.log(`   Match: ${(inc.similarity_score! * 100).toFixed(0)}%`);
        console.log(`   Fix: ${inc.fix.approach.substring(0, 60)}...\n`);
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

program.parse();
