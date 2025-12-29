/**
 * Debugging Memory System - Storage Layer
 *
 * Handles reading/writing incidents and patterns to filesystem.
 * File-based storage for simplicity and portability.
 * Now supports configurable paths (local or shared mode).
 */

import fs from 'fs/promises';
import path from 'path';
import type { Incident, Pattern, StorageOptions, VerificationResult, MemoryConfig } from './types';
import { getMemoryPaths } from './config';
import { buildIncidentInteractive, calculateQualityScore } from './interactive-verifier';

/**
 * Store an incident in memory
 */
export async function storeIncident(
  incident: Incident,
  options: StorageOptions & { config?: MemoryConfig; interactive?: boolean } = {}
): Promise<{ incident_id: string; file_path: string }> {

  let finalIncident = incident;

  // Use interactive mode if requested
  if (options.interactive) {
    finalIncident = await buildIncidentInteractive(incident);
  }

  // Calculate quality score if not already set
  if (!finalIncident.completeness?.quality_score) {
    const qualityScore = calculateQualityScore(finalIncident);

    if (!finalIncident.completeness) {
      finalIncident.completeness = {
        symptom: !!finalIncident.symptom && finalIncident.symptom.length >= 20,
        root_cause: !!finalIncident.root_cause?.description && finalIncident.root_cause.description.length >= 50,
        fix: !!finalIncident.fix?.approach && (finalIncident.fix.changes?.length || 0) > 0,
        verification: finalIncident.verification?.status === 'verified',
        quality_score: qualityScore
      };
    } else {
      finalIncident.completeness.quality_score = qualityScore;
    }
  }

  // Validate if requested
  if (options.validate_schema) {
    const validation = validateIncident(finalIncident);
    if (!validation.valid) {
      throw new Error(`Invalid incident: ${validation.errors.join(', ')}`);
    }
  }

  // Get paths from config
  const paths = getMemoryPaths(options.config);
  const INCIDENTS_DIR = paths.incidents;

  // Ensure directory exists
  await fs.mkdir(INCIDENTS_DIR, { recursive: true });

  // Generate filename
  const filename = `${finalIncident.incident_id}.json`;
  const filepath = path.join(INCIDENTS_DIR, filename);

  // Write to file
  await fs.writeFile(
    filepath,
    JSON.stringify(finalIncident, null, 2),
    'utf-8'
  );

  const qualityEmoji = (finalIncident.completeness.quality_score >= 0.75) ? '🌟' :
                       (finalIncident.completeness.quality_score >= 0.5) ? '✅' : '⚠️';

  console.log(`${qualityEmoji} Incident stored: ${finalIncident.incident_id} (quality: ${(finalIncident.completeness.quality_score * 100).toFixed(0)}%)`);

  return {
    incident_id: finalIncident.incident_id,
    file_path: filepath
  };
}

/**
 * Validate incident ID format to prevent path traversal attacks
 */
function isValidIncidentId(incident_id: string): boolean {
  // Only allow alphanumeric, underscores, and hyphens (INC_YYYYMMDD_HHMMSS_xxxx format)
  return /^INC_[\w\-]+$/.test(incident_id);
}

/**
 * Load an incident by ID
 */
export async function loadIncident(incident_id: string, config?: MemoryConfig): Promise<Incident | null> {
  // Validate incident ID to prevent path traversal
  if (!isValidIncidentId(incident_id)) {
    throw new Error(`Invalid incident ID format: ${incident_id}`);
  }

  const paths = getMemoryPaths(config);
  const filename = `${incident_id}.json`;
  const filepath = path.join(paths.incidents, filename);

  try {
    const content = await fs.readFile(filepath, 'utf-8');
    return JSON.parse(content) as Incident;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null; // File not found
    }
    throw error;
  }
}

/**
 * Load all incidents
 */
export async function loadAllIncidents(config?: MemoryConfig): Promise<Incident[]> {
  const paths = getMemoryPaths(config);
  const INCIDENTS_DIR = paths.incidents;

  try {
    const files = await fs.readdir(INCIDENTS_DIR);
    const incidents: Incident[] = [];

    for (const file of files) {
      if (!file.endsWith('.json')) continue;

      const filepath = path.join(INCIDENTS_DIR, file);
      const content = await fs.readFile(filepath, 'utf-8');
      incidents.push(JSON.parse(content) as Incident);
    }

    return incidents;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return []; // Directory doesn't exist yet
    }
    throw error;
  }
}

/**
 * Store a pattern
 */
export async function storePattern(pattern: Pattern, config?: MemoryConfig): Promise<string> {
  const paths = getMemoryPaths(config);
  await fs.mkdir(paths.patterns, { recursive: true });

  const filename = `${pattern.pattern_id}.json`;
  const filepath = path.join(paths.patterns, filename);

  await fs.writeFile(
    filepath,
    JSON.stringify(pattern, null, 2),
    'utf-8'
  );

  console.log(`✅ Pattern stored: ${pattern.pattern_id}`);

  return filepath;
}

/**
 * Validate pattern ID format to prevent path traversal attacks
 */
function isValidPatternId(pattern_id: string): boolean {
  // Only allow alphanumeric and underscores (PTN_CATEGORY_NAME format)
  return /^PTN_[\w]+$/.test(pattern_id);
}

/**
 * Load a pattern by ID
 */
export async function loadPattern(pattern_id: string, config?: MemoryConfig): Promise<Pattern | null> {
  // Validate pattern ID to prevent path traversal
  if (!isValidPatternId(pattern_id)) {
    throw new Error(`Invalid pattern ID format: ${pattern_id}`);
  }

  const paths = getMemoryPaths(config);
  const filename = `${pattern_id}.json`;
  const filepath = path.join(paths.patterns, filename);

  try {
    const content = await fs.readFile(filepath, 'utf-8');
    return JSON.parse(content) as Pattern;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

/**
 * Load all patterns
 */
export async function loadAllPatterns(config?: MemoryConfig): Promise<Pattern[]> {
  const paths = getMemoryPaths(config);
  const PATTERNS_DIR = paths.patterns;

  try {
    const files = await fs.readdir(PATTERNS_DIR);
    const patterns: Pattern[] = [];

    for (const file of files) {
      if (!file.endsWith('.json')) continue;

      const filepath = path.join(PATTERNS_DIR, file);
      const content = await fs.readFile(filepath, 'utf-8');
      patterns.push(JSON.parse(content) as Pattern);
    }

    return patterns;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

/**
 * Validate incident structure
 */
export function validateIncident(incident: Incident): VerificationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields
  if (!incident.incident_id) errors.push('Missing incident_id');
  if (!incident.timestamp) errors.push('Missing timestamp');
  if (!incident.symptom) errors.push('Missing symptom');
  if (!incident.root_cause) errors.push('Missing root_cause');
  if (!incident.fix) errors.push('Missing fix');

  // Check completeness
  if (incident.root_cause && !incident.root_cause.confidence) {
    warnings.push('Root cause missing confidence score');
  }

  if (incident.verification && incident.verification.status === 'unverified') {
    warnings.push('Incident not verified');
  }

  if (!incident.quality_gates || !incident.quality_gates.guardian_validated) {
    warnings.push('Not validated by guardian (expected in current system)');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Generate incident ID
 */
export function generateIncidentId(): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const timeStr = now.toISOString().slice(11, 19).replace(/:/g, '');
  const random = Math.random().toString(36).substring(2, 6);

  return `INC_${dateStr}_${timeStr}_${random}`;
}

/**
 * Generate pattern ID
 */
export function generatePatternId(category: string, name: string): string {
  const cleanCategory = category.toUpperCase().replace(/[^A-Z]/g, '_');
  const cleanName = name.toUpperCase().replace(/[^A-Z]/g, '_');

  return `PTN_${cleanCategory}_${cleanName}`;
}

/**
 * Get memory statistics
 */
export async function getMemoryStats(config?: MemoryConfig): Promise<{
  total_incidents: number;
  total_patterns: number;
  oldest_incident: number;
  newest_incident: number;
  disk_usage_kb: number;
}> {
  const incidents = await loadAllIncidents(config);
  const patterns = await loadAllPatterns(config);

  const timestamps = incidents.map(i => i.timestamp).filter(Boolean);
  const oldest = timestamps.length > 0 ? Math.min(...timestamps) : 0;
  const newest = timestamps.length > 0 ? Math.max(...timestamps) : 0;

  // Estimate disk usage (rough)
  const diskUsage =
    incidents.length * 1 + // ~1KB per incident
    patterns.length * 2;    // ~2KB per pattern

  return {
    total_incidents: incidents.length,
    total_patterns: patterns.length,
    oldest_incident: oldest,
    newest_incident: newest,
    disk_usage_kb: diskUsage
  };
}

// ============================================================================
// TOKEN OPTIMIZATION - Compact Serializers
// ============================================================================

import type {
  CompactIncident,
  CompactPattern,
  IncidentSummary,
} from './types';

/**
 * Truncate text to max length with ellipsis
 */
function truncate(text: string | undefined, maxLen: number): string {
  if (!text) return '';
  if (text.length <= maxLen) return text;
  return text.substring(0, maxLen - 3) + '...';
}

/**
 * Generate minimal incident summary (~100 tokens)
 */
export function generateIncidentSummary(incident: Incident): IncidentSummary {
  return {
    incident_id: incident.incident_id,
    symptom_preview: truncate(incident.symptom, 80),
    root_cause_preview: truncate(incident.root_cause?.description, 100),
    fix_preview: truncate(incident.fix?.approach, 80),
    category: incident.root_cause?.category || 'unknown',
    confidence: incident.root_cause?.confidence || 0,
    quality: incident.completeness?.quality_score || 0,
  };
}

/**
 * Convert full incident to compact format (~200 tokens)
 *
 * Uses short keys to minimize token usage in LLM context.
 * Preserves essential information for debugging assistance.
 */
export function toCompactIncident(incident: Incident): CompactIncident {
  return {
    id: incident.incident_id,
    ts: incident.timestamp,
    sym: truncate(incident.symptom, 80),
    rc: {
      d: truncate(incident.root_cause?.description, 100),
      cat: incident.root_cause?.category || 'unknown',
      conf: incident.root_cause?.confidence || 0,
    },
    fix: {
      a: truncate(incident.fix?.approach, 80),
      n: incident.fix?.changes?.length || 0,
    },
    v: incident.verification?.status === 'verified'
      ? 'V'
      : incident.verification?.status === 'partial'
      ? 'P'
      : 'U',
    t: (incident.tags || []).slice(0, 5),
    q: incident.completeness?.quality_score || 0,
    sim: incident.similarity_score,
  };
}

/**
 * Convert full pattern to compact format (~120 tokens)
 */
export function toCompactPattern(pattern: Pattern): CompactPattern {
  return {
    id: pattern.pattern_id,
    n: pattern.usage_history?.total_uses || 1,
    desc: truncate(pattern.description, 100),
    sig: pattern.detection_signature.slice(0, 5),
    fix: truncate(pattern.solution_template, 150),
    sr: pattern.success_rate,
    cat: pattern.tags[0] || 'general',
    t: pattern.tags.slice(0, 5),
    last: pattern.last_used || Date.now(),
  };
}

/**
 * Batch convert incidents to compact format
 */
export function toCompactIncidents(incidents: Incident[]): CompactIncident[] {
  return incidents.map(toCompactIncident);
}

/**
 * Batch convert patterns to compact format
 */
export function toCompactPatterns(patterns: Pattern[]): CompactPattern[] {
  return patterns.map(toCompactPattern);
}

/**
 * Estimate tokens for a compact incident
 */
export function estimateCompactIncidentTokens(incident: CompactIncident): number {
  // Rough estimate: JSON structure + field names + values
  const json = JSON.stringify(incident);
  return Math.ceil(json.length / 4);
}

/**
 * Estimate tokens for a compact pattern
 */
export function estimateCompactPatternTokens(pattern: CompactPattern): number {
  const json = JSON.stringify(pattern);
  return Math.ceil(json.length / 4);
}

/**
 * Enforce token budget on results
 *
 * Returns limited incidents and patterns that fit within budget.
 * Patterns get 30% budget, incidents get 60%, metadata gets 10%.
 */
export function enforceTokenBudget(
  incidents: CompactIncident[],
  patterns: CompactPattern[],
  budget: number = 2500
): {
  limitedIncidents: CompactIncident[];
  limitedPatterns: CompactPattern[];
  tokensUsed: number;
  truncated: { incidents: number; patterns: number };
} {
  const patternBudget = Math.floor(budget * 0.3);
  const incidentBudget = Math.floor(budget * 0.6);

  // Estimate tokens per item (using averages from DEFAULT_TOKEN_BUDGET)
  const tokensPerPattern = 120;
  const tokensPerIncident = 200;

  const maxPatterns = Math.floor(patternBudget / tokensPerPattern);
  const maxIncidents = Math.floor(incidentBudget / tokensPerIncident);

  const limitedPatterns = patterns.slice(0, maxPatterns);
  const limitedIncidents = incidents.slice(0, maxIncidents);

  const tokensUsed =
    limitedPatterns.length * tokensPerPattern +
    limitedIncidents.length * tokensPerIncident +
    Math.floor(budget * 0.1); // metadata overhead

  return {
    limitedPatterns,
    limitedIncidents,
    tokensUsed,
    truncated: {
      incidents: incidents.length - limitedIncidents.length,
      patterns: patterns.length - limitedPatterns.length,
    },
  };
}

/**
 * Load incidents and return compact versions
 */
export async function loadCompactIncidents(
  config?: MemoryConfig
): Promise<CompactIncident[]> {
  const incidents = await loadAllIncidents(config);
  return toCompactIncidents(incidents);
}

/**
 * Load patterns and return compact versions
 */
export async function loadCompactPatterns(
  config?: MemoryConfig
): Promise<CompactPattern[]> {
  const patterns = await loadAllPatterns(config);
  return toCompactPatterns(patterns);
}
