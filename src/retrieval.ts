/**
 * Debugging Memory System - Retrieval Layer
 *
 * Finds similar incidents and patterns based on symptom description.
 * Uses simple keyword matching for MVP (embeddings can be added later).
 */

import type {
  Incident,
  Pattern,
  RetrievalConfig,
  RetrievalResult,
  MemoryConfig
} from './types';
import { loadAllIncidents, loadAllPatterns } from './storage';

/**
 * Default retrieval configuration
 */
const DEFAULT_CONFIG: RetrievalConfig = {
  similarity_threshold: 0.5,        // 50% similarity minimum (keyword-based matching)
  max_results: 5,                   // Top 5 results
  temporal_preference: 90,          // Prefer last 90 days
  include_unvalidated: true         // Include unvalidated (guardian rarely runs in this project)
};

/**
 * Check memory for similar incidents
 *
 * This is the main entry point for memory retrieval.
 */
export async function checkMemory(
  symptom: string,
  config: Partial<RetrievalConfig> & { memoryConfig?: MemoryConfig } = {}
): Promise<RetrievalResult> {

  const { memoryConfig, ...retrievalConfig } = config;
  const fullConfig = { ...DEFAULT_CONFIG, ...retrievalConfig };

  console.log(`🧠 Checking memory for: "${symptom.substring(0, 50)}..."`);

  // Step 1: Try to match patterns first (most efficient)
  const patterns = await matchPatterns(symptom, fullConfig, memoryConfig);

  if (patterns.length > 0) {
    console.log(`✅ Found ${patterns.length} matching patterns`);
    return {
      incidents: [],
      patterns,
      confidence: 0.9, // High confidence if pattern matches
      retrieval_method: 'pattern',
      tokens_used: estimateTokens(patterns)
    };
  }

  // Step 2: No patterns, search incidents
  const incidents = await searchIncidents(symptom, fullConfig, memoryConfig);

  console.log(`✅ Found ${incidents.length} similar incidents`);

  return {
    incidents,
    patterns: [],
    confidence: incidents.length > 0 ? 0.7 : 0.0,
    retrieval_method: 'incident',
    tokens_used: estimateTokens(incidents)
  };
}

/**
 * Match patterns based on symptom
 */
async function matchPatterns(
  symptom: string,
  config: RetrievalConfig,
  memoryConfig?: MemoryConfig
): Promise<Pattern[]> {

  const allPatterns = await loadAllPatterns(memoryConfig);
  const symptomLower = symptom.toLowerCase();
  const symptomWords = extractKeywords(symptomLower);

  const scored = allPatterns.map(pattern => {
    // Check detection signatures
    const signatureMatches = pattern.detection_signature.filter(sig =>
      symptomWords.some(word => sig.toLowerCase().includes(word))
    ).length;

    // Check tags
    const tagMatches = pattern.tags.filter(tag =>
      symptomWords.includes(tag.toLowerCase())
    ).length;

    // Calculate score
    const score =
      (signatureMatches / Math.max(pattern.detection_signature.length, 1)) * 0.7 +
      (tagMatches / Math.max(pattern.tags.length, 1)) * 0.3;

    return { pattern, score };
  });

  // Filter and sort
  return scored
    .filter(item => item.score >= config.similarity_threshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, config.max_results)
    .map(item => item.pattern);
}

/**
 * Search for similar incidents
 */
async function searchIncidents(
  symptom: string,
  config: RetrievalConfig,
  memoryConfig?: MemoryConfig
): Promise<Incident[]> {

  const allIncidents = await loadAllIncidents(memoryConfig);
  const symptomLower = symptom.toLowerCase();
  const symptomWords = extractKeywords(symptomLower);

  const now = Date.now();
  const temporalCutoff = now - (config.temporal_preference || 90) * 24 * 60 * 60 * 1000;

  const scored = allIncidents.map(incident => {
    // Skip unvalidated if configured
    if (!config.include_unvalidated &&
        incident.quality_gates &&
        !incident.quality_gates.guardian_validated) {
      return { incident, score: 0 };
    }

    // Calculate similarity
    const symptomSimilarity = calculateKeywordSimilarity(
      symptomWords,
      extractKeywords(incident.symptom.toLowerCase())
    );

    // Tag similarity with bidirectional matching
    const incidentTagWords = incident.tags.flatMap(tag => tag.toLowerCase().split(/\s+/));
    const tagMatches = symptomWords.filter(word =>
      incidentTagWords.some(tagWord => tagWord.includes(word) || word.includes(tagWord))
    ).length;
    const tagSimilarity = tagMatches / Math.max(symptomWords.length, 1);

    // Temporal boost (prefer recent)
    const age = now - incident.timestamp;
    const temporalBoost = age < temporalCutoff ? 1.2 : 1.0;

    // Weight: 60% symptom keywords, 40% tags (tags are more semantic)
    const score = (symptomSimilarity * 0.6 + tagSimilarity * 0.4) * temporalBoost;

    return { incident, score };
  });

  // Filter and sort
  const results = scored
    .filter(item => item.score >= config.similarity_threshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, config.max_results)
    .map(item => ({ ...item.incident, similarity_score: item.score }));

  return results;
}

/**
 * Calculate keyword-based similarity
 */
function calculateKeywordSimilarity(words1: string[], words2: string[]): number {
  if (words1.length === 0 || words2.length === 0) return 0;

  const set1 = new Set(words1);
  const set2 = new Set(words2);

  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);

  return intersection.size / union.size; // Jaccard similarity
}

/**
 * Extract keywords from text
 */
function extractKeywords(text: string): string[] {
  // Remove common words (simple stop words)
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should',
    'can', 'could', 'may', 'might', 'must', 'this', 'that', 'these', 'those'
  ]);

  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ') // Remove punctuation
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word));
}

/**
 * Estimate token usage for context injection
 */
function estimateTokens(items: (Incident | Pattern)[]): number {
  // Rough estimate: 4 chars ≈ 1 token
  const totalChars = items.reduce((sum, item) => {
    return sum + JSON.stringify(item).length;
  }, 0);

  return Math.ceil(totalChars / 4);
}

/**
 * Get full incident details (for lazy loading)
 */
export async function getFullIncident(incident_id: string): Promise<Incident | null> {
  const { loadIncident } = await import('./storage');
  return loadIncident(incident_id);
}

/**
 * Simple search by tags
 */
export async function searchByTags(tags: string[], config?: MemoryConfig): Promise<Incident[]> {
  const allIncidents = await loadAllIncidents(config);

  return allIncidents.filter(incident =>
    tags.some(tag => incident.tags.includes(tag))
  );
}

/**
 * Get recent incidents
 */
export async function getRecentIncidents(days: number = 7, config?: MemoryConfig): Promise<Incident[]> {
  const allIncidents = await loadAllIncidents(config);
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

  return allIncidents
    .filter(incident => incident.timestamp >= cutoff)
    .sort((a, b) => b.timestamp - a.timestamp);
}
