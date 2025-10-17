/**
 * Configuration System
 *
 * Supports two modes:
 * - local: Each project has its own .claude/memory/ directory
 * - shared: All projects share ~/.claude-memory/ directory
 */

import * as path from 'path';
import * as os from 'os';

export interface MemoryConfig {
  /** Storage mode: local (per-project) or shared (global) */
  storageMode: 'local' | 'shared';

  /** Path to memory directory */
  memoryPath: string;

  /** Whether to automatically mine audit trail on startup */
  autoMine: boolean;

  /** Similarity threshold for retrieval (0-1) */
  defaultSimilarityThreshold: number;

  /** Maximum results to return */
  defaultMaxResults: number;
}

/**
 * Get configuration from environment variables and defaults
 */
export function getConfig(overrides?: Partial<MemoryConfig>): MemoryConfig {
  // Check environment variable for mode
  const mode = (process.env.CLAUDE_MEMORY_MODE as 'local' | 'shared') || 'local';

  // Determine memory path based on mode
  let memoryPath: string;

  if (mode === 'shared') {
    // Shared mode: Use home directory
    const customPath = process.env.CLAUDE_MEMORY_PATH;
    memoryPath = customPath || path.join(os.homedir(), '.claude-memory');
  } else {
    // Local mode: Use current working directory
    const customPath = process.env.CLAUDE_MEMORY_PATH;
    memoryPath = customPath || path.join(process.cwd(), '.claude/memory');
  }

  const config: MemoryConfig = {
    storageMode: mode,
    memoryPath,
    autoMine: process.env.CLAUDE_MEMORY_AUTO_MINE === 'true',
    defaultSimilarityThreshold: parseFloat(process.env.CLAUDE_MEMORY_THRESHOLD || '0.5'),
    defaultMaxResults: parseInt(process.env.CLAUDE_MEMORY_MAX_RESULTS || '5', 10),
    ...overrides
  };

  return config;
}

/**
 * Get paths for different memory components
 */
export function getMemoryPaths(config?: MemoryConfig) {
  const cfg = config || getConfig();

  return {
    incidents: path.join(cfg.memoryPath, 'incidents'),
    patterns: path.join(cfg.memoryPath, 'patterns'),
    sessions: path.join(cfg.memoryPath, 'sessions'),
    root: cfg.memoryPath
  };
}

/**
 * Display current configuration
 */
export function displayConfig(config?: MemoryConfig): void {
  const cfg = config || getConfig();

  console.log('📊 Memory Configuration:\n');
  console.log(`   Mode: ${cfg.storageMode}`);
  console.log(`   Path: ${cfg.memoryPath}`);
  console.log(`   Auto-mine: ${cfg.autoMine ? 'enabled' : 'disabled'}`);
  console.log(`   Similarity threshold: ${(cfg.defaultSimilarityThreshold * 100).toFixed(0)}%`);
  console.log(`   Max results: ${cfg.defaultMaxResults}\n`);
}
