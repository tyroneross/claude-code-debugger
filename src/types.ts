/**
 * Debugging Memory System - Type Definitions
 *
 * Defines the structure of incidents, patterns, and memory operations.
 */

/**
 * Memory Configuration
 */
export interface MemoryConfig {
  storageMode: 'local' | 'shared';
  memoryPath: string;
  autoMine: boolean;
  defaultSimilarityThreshold: number;
  defaultMaxResults: number;
}

export interface Incident {
  // Identification
  incident_id: string;              // INC_YYYYMMDD_HHMMSS_random
  timestamp: number;                // Unix timestamp
  session_id?: string;              // Optional session reference

  // Symptom & Diagnosis
  symptom: string;                  // User-facing description
  symptom_type?: string;            // e.g., "search", "ui", "api"
  root_cause: RootCause;            // Detailed root cause

  // Fix & Resolution
  fix: Fix;                         // How it was fixed
  verification: Verification;       // How fix was verified

  // Context & Metadata
  tags: string[];                   // Categorization tags
  files_changed: string[];          // Files modified
  agent_used?: string;              // Which agent fixed it

  // Quality Indicators
  quality_gates: QualityGates;      // Validation status
  completeness: Completeness;       // Which fields are complete

  // Memory & Retrieval
  similarity_score?: number;        // When retrieved (0-1)
  pattern_id?: string;              // Associated pattern

  // Durability Tracking
  durability?: DurabilityTracking;  // 30-day stability
}

export interface RootCause {
  description: string;              // What caused the issue
  file?: string;                    // Primary file involved
  line_range?: [number, number];   // Line numbers
  code_snippet?: string;            // Relevant code
  category: string;                 // e.g., "logic", "config", "dependency"
  confidence: number;               // 0-1, how confident in diagnosis
}

export interface Fix {
  approach: string;                 // High-level approach
  changes: FileChange[];            // Specific changes made
  pattern_used?: string;            // Pattern ID if applicable
  time_to_fix?: number;             // Minutes
}

export interface FileChange {
  file: string;                     // File path
  lines_changed: number;            // Number of lines
  change_type: 'add' | 'modify' | 'delete' | 'refactor';
  summary: string;                  // What changed
}

export interface Verification {
  status: 'verified' | 'partial' | 'unverified';
  regression_tests_passed: boolean;
  user_journey_tested: boolean;
  tests_run?: string[];             // Test files executed
  success_criteria_met: boolean;
}

export interface QualityGates {
  guardian_validated: boolean;      // Security check passed
  tested_e2e: boolean;              // End-to-end tested
  tested_from_ui: boolean;          // UI tested
  security_reviewed: boolean;       // Manual security review
  architect_reviewed: boolean;      // Design review
}

export interface Completeness {
  symptom: boolean;
  root_cause: boolean;
  fix: boolean;
  verification: boolean;
  quality_score: number;            // 0-1, overall completeness
}

export interface DurabilityTracking {
  fixed_at: number;                 // Unix timestamp
  last_checked: number;             // Unix timestamp
  still_working: boolean;           // True if stable
  days_stable: number;              // Days since fix
  recurrence_count: number;         // How many times issue returned
}

/**
 * Fix Pattern - Reusable solution template
 */
export interface Pattern {
  // Identification
  pattern_id: string;               // PTN_CATEGORY_NAME
  name: string;                     // Human-readable name
  description: string;              // What this pattern solves

  // Detection
  detection_signature: string[];    // Keywords/symptoms that match
  applicable_to: string[];          // Which agents/contexts can use

  // Solution
  solution_template: string;        // How to implement
  code_example?: string;            // Example code
  before_after?: BeforeAfter;       // Code comparison

  // Metadata
  tags: string[];                   // Categorization
  related_patterns: string[];       // Similar patterns

  // Success Tracking
  usage_history: UsageHistory;      // How often used
  success_rate: number;             // 0-1, success percentage
  last_used: number;                // Unix timestamp

  // Warnings
  caveats?: string[];               // Known limitations
  requires_validation?: string[];   // What to check
}

export interface BeforeAfter {
  before: string;                   // Code before fix
  after: string;                    // Code after fix
  explanation: string;              // Why this works
}

export interface UsageHistory {
  total_uses: number;               // Times applied
  successful_uses: number;          // Times it worked
  by_agent: Record<string, number>; // Usage per agent
  recent_incidents: string[];       // Recent incident IDs
}

/**
 * Memory Retrieval Configuration
 */
export interface RetrievalConfig {
  similarity_threshold: number;     // Min similarity (0-1)
  max_results: number;              // Max incidents to return
  temporal_preference?: number;     // Prefer recent (days)
  tags_filter?: string[];           // Only these tags
  agent_filter?: string;            // Only this agent
  include_unvalidated?: boolean;    // Include unvalidated incidents
}

/**
 * Memory Retrieval Result
 */
export interface RetrievalResult {
  incidents: Incident[];            // Matched incidents
  patterns: Pattern[];              // Matched patterns
  confidence: number;               // Overall match confidence
  retrieval_method: 'pattern' | 'incident' | 'hybrid';
  tokens_used: number;              // Context size estimate
}

/**
 * Session State (temporary during debugging)
 */
export interface DebugSession {
  session_id: string;               // SESSION_timestamp
  started_at: number;               // Unix timestamp
  symptom: string;                  // Current issue
  retrieved_context: RetrievalResult; // Memory retrieved
  current_hypothesis?: string;      // Active hypothesis
  status: 'active' | 'completed' | 'abandoned';
}

/**
 * Storage Options
 */
export interface StorageOptions {
  validate_schema?: boolean;        // Validate before storing
  extract_pattern?: boolean;        // Try to extract pattern
  calculate_similarity?: boolean;   // Compute embeddings
  mark_for_review?: boolean;        // Flag for manual review
}

/**
 * Verification Result
 */
export interface VerificationResult {
  valid: boolean;                   // Overall validity
  errors: string[];                 // Validation errors
  warnings: string[];               // Warnings (non-blocking)
}
