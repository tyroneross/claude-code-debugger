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
 * Load an incident by ID
 */
export async function loadIncident(incident_id: string, config?: MemoryConfig): Promise<Incident | null> {
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
 * Load a pattern by ID
 */
export async function loadPattern(pattern_id: string, config?: MemoryConfig): Promise<Pattern | null> {
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
