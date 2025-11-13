/**
 * Claude Memory - Main Entry Point
 *
 * Debugging memory system for Claude Code.
 * Never solve the same bug twice.
 */

// Configuration
export { getConfig, getMemoryPaths, displayConfig } from './config';
export type { MemoryConfig } from './types';

// Core Types
export type {
  Incident,
  Pattern,
  RootCause,
  Fix,
  FileChange,
  Verification,
  QualityGates,
  Completeness,
  DurabilityTracking,
  RetrievalConfig,
  RetrievalResult,
  StorageOptions,
  VerificationResult
} from './types';

// Storage Operations
export {
  storeIncident,
  loadIncident,
  loadAllIncidents,
  storePattern,
  loadPattern,
  loadAllPatterns,
  validateIncident,
  generateIncidentId,
  generatePatternId,
  getMemoryStats
} from './storage';

// Interactive Verification
export {
  buildIncidentInteractive,
  calculateQualityScore,
  generateQualityFeedback
} from './interactive-verifier';

// Retrieval Operations
export {
  checkMemory,
  getFullIncident,
  searchByTags,
  getRecentIncidents,
  enhancedSearch
} from './retrieval';
export type { SearchResult } from './retrieval';

// Main Debugging Wrapper
// Note: These will be added when we copy debug-with-memory.ts
export { debugWithMemory, storeDebugIncident, getMemoryStatus } from './debug-wrapper';

// Pattern Extraction
export { extractPatterns, suggestPatterns, autoExtractPatternIfReady } from './pattern-extractor';

// Audit Trail Mining
export { mineAuditTrail, previewAuditMining } from './audit-miner';
