/**
 * Entity Memory Index
 *
 * Tracks entities (files, functions, error types) across incidents.
 * Enables queries like "what bugs have we had in UserAuth.ts?" without
 * scanning all incidents.
 *
 * Inspired by CrewAI's entity memory system.
 *
 * The index is rebuilt on demand from stored incidents and cached to disk.
 */

import fs from 'fs/promises';
import path from 'path';
import type { Incident, MemoryConfig } from './types';
import { loadAllIncidents } from './storage';
import { getMemoryPaths } from './config';

export interface EntityEntry {
  entity: string;
  type: 'file' | 'category' | 'tag' | 'error_type';
  incident_ids: string[];
  last_seen: number;
  occurrence_count: number;
}

export interface EntityIndex {
  version: number;
  built_at: number;
  entities: Record<string, EntityEntry>;
  stats: {
    total_entities: number;
    total_files: number;
    total_categories: number;
    total_tags: number;
  };
}

/**
 * Build entity index from all incidents
 */
export async function buildEntityIndex(config?: MemoryConfig): Promise<EntityIndex> {
  const incidents = await loadAllIncidents(config);
  const entities: Record<string, EntityEntry> = {};

  for (const incident of incidents) {
    // Index files
    for (const file of (incident.files_changed ?? [])) {
      const key = `file:${file}`;
      if (!entities[key]) {
        entities[key] = {
          entity: file,
          type: 'file',
          incident_ids: [],
          last_seen: 0,
          occurrence_count: 0,
        };
      }
      entities[key].incident_ids.push(incident.incident_id);
      entities[key].last_seen = Math.max(entities[key].last_seen, incident.timestamp);
      entities[key].occurrence_count++;
    }

    // Index root_cause file
    if (incident.root_cause?.file) {
      const key = `file:${incident.root_cause.file}`;
      if (!entities[key]) {
        entities[key] = {
          entity: incident.root_cause.file,
          type: 'file',
          incident_ids: [],
          last_seen: 0,
          occurrence_count: 0,
        };
      }
      if (!entities[key].incident_ids.includes(incident.incident_id)) {
        entities[key].incident_ids.push(incident.incident_id);
        entities[key].occurrence_count++;
      }
      entities[key].last_seen = Math.max(entities[key].last_seen, incident.timestamp);
    }

    // Index category
    if (incident.root_cause?.category) {
      const key = `category:${incident.root_cause.category}`;
      if (!entities[key]) {
        entities[key] = {
          entity: incident.root_cause.category,
          type: 'category',
          incident_ids: [],
          last_seen: 0,
          occurrence_count: 0,
        };
      }
      entities[key].incident_ids.push(incident.incident_id);
      entities[key].last_seen = Math.max(entities[key].last_seen, incident.timestamp);
      entities[key].occurrence_count++;
    }

    // Index tags
    for (const tag of (incident.tags ?? [])) {
      const key = `tag:${tag}`;
      if (!entities[key]) {
        entities[key] = {
          entity: tag,
          type: 'tag',
          incident_ids: [],
          last_seen: 0,
          occurrence_count: 0,
        };
      }
      entities[key].incident_ids.push(incident.incident_id);
      entities[key].last_seen = Math.max(entities[key].last_seen, incident.timestamp);
      entities[key].occurrence_count++;
    }
  }

  const fileCount = Object.values(entities).filter(e => e.type === 'file').length;
  const categoryCount = Object.values(entities).filter(e => e.type === 'category').length;
  const tagCount = Object.values(entities).filter(e => e.type === 'tag').length;

  const index: EntityIndex = {
    version: 1,
    built_at: Date.now(),
    entities,
    stats: {
      total_entities: Object.keys(entities).length,
      total_files: fileCount,
      total_categories: categoryCount,
      total_tags: tagCount,
    },
  };

  // Cache to disk
  const paths = getMemoryPaths(config);
  const indexPath = path.join(paths.root, 'entity-index.json');
  await fs.mkdir(path.dirname(indexPath), { recursive: true });
  await fs.writeFile(indexPath, JSON.stringify(index, null, 2), 'utf-8');

  return index;
}

/**
 * Load cached entity index, rebuilding if stale (>1 hour old)
 */
export async function loadEntityIndex(config?: MemoryConfig): Promise<EntityIndex> {
  const paths = getMemoryPaths(config);
  const indexPath = path.join(paths.root, 'entity-index.json');

  try {
    const content = await fs.readFile(indexPath, 'utf-8');
    const index = JSON.parse(content) as EntityIndex;

    // Rebuild if older than 1 hour
    const age = Date.now() - index.built_at;
    if (age > 60 * 60 * 1000) {
      return buildEntityIndex(config);
    }

    return index;
  } catch {
    return buildEntityIndex(config);
  }
}

/**
 * Query entities by file path
 *
 * Returns incidents that touched this file.
 */
export async function queryByFile(
  filePath: string,
  config?: MemoryConfig
): Promise<{ entity: EntityEntry | null; incidents: Incident[] }> {
  const index = await loadEntityIndex(config);
  const key = `file:${filePath}`;
  const entry = index.entities[key] || null;

  if (!entry) {
    // Try partial match
    const partialMatches = Object.entries(index.entities)
      .filter(([k, e]) => e.type === 'file' && (k.includes(filePath) || filePath.includes(e.entity)));

    if (partialMatches.length > 0) {
      const [, bestMatch] = partialMatches[0];
      const incidents = await loadIncidentsById(bestMatch.incident_ids, config);
      return { entity: bestMatch, incidents };
    }

    return { entity: null, incidents: [] };
  }

  const incidents = await loadIncidentsById(entry.incident_ids, config);
  return { entity: entry, incidents };
}

/**
 * Query entities by category
 */
export async function queryByCategory(
  category: string,
  config?: MemoryConfig
): Promise<{ entity: EntityEntry | null; incidents: Incident[] }> {
  const index = await loadEntityIndex(config);
  const key = `category:${category}`;
  const entry = index.entities[key] || null;

  if (!entry) {
    return { entity: null, incidents: [] };
  }

  const incidents = await loadIncidentsById(entry.incident_ids, config);
  return { entity: entry, incidents };
}

/**
 * Get hotspot files - files with the most incidents
 */
export async function getHotspotFiles(
  limit: number = 10,
  config?: MemoryConfig
): Promise<EntityEntry[]> {
  const index = await loadEntityIndex(config);

  return Object.values(index.entities)
    .filter(e => e.type === 'file')
    .sort((a, b) => b.occurrence_count - a.occurrence_count)
    .slice(0, limit);
}

/**
 * Load incidents by their IDs
 */
async function loadIncidentsById(ids: string[], config?: MemoryConfig): Promise<Incident[]> {
  const { loadIncident } = await import('./storage');
  const incidents: Incident[] = [];

  for (const id of ids) {
    try {
      const inc = await loadIncident(id, config);
      if (inc) incidents.push(inc);
    } catch {
      // Skip invalid IDs
    }
  }

  return incidents;
}
