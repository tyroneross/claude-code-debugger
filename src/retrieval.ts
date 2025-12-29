/**
 * Debugging Memory System - Retrieval Layer
 *
 * Finds similar incidents and patterns based on symptom description.
 * Uses multi-strategy search: exact → tag → fuzzy → semantic (optional).
 */

import type {
  Incident,
  Pattern,
  RetrievalConfig,
  RetrievalResult,
  MemoryConfig
} from './types';
import { loadAllIncidents, loadAllPatterns } from './storage';
import natural from 'natural';

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
 * Enhanced search result with match type and highlights
 */
export interface SearchResult {
  incident: Incident;
  score: number;
  matchType: 'exact' | 'tag' | 'fuzzy' | 'category' | 'semantic';
  highlights: string[];
}

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
    const patternTags = pattern.tags ?? [];
    const tagMatches = patternTags.filter(tag =>
      symptomWords.includes(tag.toLowerCase())
    ).length;

    // Calculate score
    const score =
      (signatureMatches / Math.max(pattern.detection_signature.length, 1)) * 0.7 +
      (tagMatches / Math.max(patternTags.length, 1)) * 0.3;

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

    // Skip incidents without valid symptom
    if (!incident.symptom || typeof incident.symptom !== 'string') {
      return { incident, score: 0 };
    }

    // Calculate similarity
    const symptomSimilarity = calculateKeywordSimilarity(
      symptomWords,
      extractKeywords(incident.symptom.toLowerCase())
    );

    // Tag similarity with bidirectional matching
    const incidentTagWords = (incident.tags ?? []).flatMap(tag => tag.toLowerCase().split(/\s+/));
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
    tags.some(tag => (incident.tags ?? []).includes(tag))
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

/**
 * Enhanced multi-strategy search
 *
 * Strategy order: exact → tag → fuzzy → category
 * Each strategy adds results with appropriate confidence scores
 */
export async function enhancedSearch(
  query: string,
  options?: { threshold?: number; maxResults?: number; memoryConfig?: MemoryConfig }
): Promise<SearchResult[]> {

  const threshold = options?.threshold ?? 0.5;
  const maxResults = options?.maxResults ?? 10;
  const allIncidents = await loadAllIncidents(options?.memoryConfig);

  if (allIncidents.length === 0) {
    return [];
  }

  const queryLower = query.toLowerCase();
  const queryWords = extractKeywords(queryLower);
  const results: SearchResult[] = [];
  const seenIds = new Set<string>();

  // STRATEGY 1: EXACT MATCH (score: 1.0)
  // Check if symptom description contains query (case-insensitive)
  for (const incident of allIncidents) {
    if (seenIds.has(incident.incident_id)) continue;
    if (!incident.symptom || typeof incident.symptom !== 'string') continue;

    const symptomLower = incident.symptom.toLowerCase();
    if (symptomLower.includes(queryLower)) {
      results.push({
        incident,
        score: 1.0,
        matchType: 'exact',
        highlights: [incident.symptom]
      });
      seenIds.add(incident.incident_id);
    }
  }

  // STRATEGY 2: TAG MATCH (score: 0.9)
  // Check if any tags match normalized query
  for (const incident of allIncidents) {
    if (seenIds.has(incident.incident_id)) continue;

    const incidentTags = incident.tags ?? [];
    const normalizedTags = incidentTags.map(tag => tag.toLowerCase());
    const matchedTags = normalizedTags.filter(tag =>
      queryWords.some(word => tag.includes(word) || word.includes(tag))
    );

    if (matchedTags.length > 0) {
      results.push({
        incident,
        score: 0.9,
        matchType: 'tag',
        highlights: incidentTags.filter(tag =>
          matchedTags.includes(tag.toLowerCase())
        )
      });
      seenIds.add(incident.incident_id);
    }
  }

  // STRATEGY 3: FUZZY MATCH (score: 0.7-0.85)
  // Use Jaro-Winkler distance for similar strings
  const fuzzyThreshold = 0.7;
  for (const incident of allIncidents) {
    if (seenIds.has(incident.incident_id)) continue;
    if (!incident.symptom || typeof incident.symptom !== 'string') continue;

    const symptomScore = fuzzyMatch(queryLower, incident.symptom.toLowerCase(), fuzzyThreshold);
    const rootCauseDesc = incident.root_cause?.description ?? '';
    const rootCauseScore = rootCauseDesc
      ? fuzzyMatch(queryLower, rootCauseDesc.toLowerCase(), fuzzyThreshold)
      : 0;

    const maxScore = Math.max(symptomScore, rootCauseScore);
    if (maxScore >= fuzzyThreshold) {
      const highlight = symptomScore >= rootCauseScore
        ? incident.symptom
        : (rootCauseDesc || incident.symptom);

      results.push({
        incident,
        score: maxScore,
        matchType: 'fuzzy',
        highlights: [highlight]
      });
      seenIds.add(incident.incident_id);
    }
  }

  // STRATEGY 4: CATEGORY MATCH (score: 0.6)
  // If we have top matches, find similar categories
  if (results.length > 0) {
    const topCategories = new Set(
      results.slice(0, 3)
        .map(r => r.incident.root_cause?.category)
        .filter(Boolean)
    );

    for (const incident of allIncidents) {
      if (seenIds.has(incident.incident_id)) continue;
      const category = incident.root_cause?.category;
      if (!category) continue;

      if (topCategories.has(category)) {
        results.push({
          incident,
          score: 0.6,
          matchType: 'category',
          highlights: [category]
        });
        seenIds.add(incident.incident_id);
      }
    }
  }

  // Sort by score descending and return top results
  return results
    .filter(r => r.score >= threshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults);
}

/**
 * Fuzzy string matching using Jaro-Winkler distance
 * Returns score between 0 and 1 if above threshold, 0 otherwise
 */
function fuzzyMatch(query: string, text: string, threshold: number): number {
  const distance = natural.JaroWinklerDistance(
    query.toLowerCase(),
    text.toLowerCase()
  );
  return distance >= threshold ? distance : 0;
}

// ============================================================================
// TIERED RETRIEVAL - Token-optimized memory retrieval
// ============================================================================

import type {
  TieredRetrievalConfig,
  TieredRetrievalResult,
} from './types';

import {
  toCompactIncident,
  toCompactPattern,
  generateIncidentSummary,
  enforceTokenBudget,
} from './storage';

/**
 * Token-optimized memory check with tiered retrieval
 *
 * Tiers:
 * - 'summary': Minimal representation (~100 tokens/incident) for quick scans
 * - 'compact': Short keys, truncated fields (~200 tokens/incident) - DEFAULT
 * - 'full': Complete incident data (~550 tokens/incident) for detailed analysis
 *
 * Token budget enforcement ensures context doesn't exceed limits.
 */
export async function checkMemoryTiered(
  symptom: string,
  config: Partial<TieredRetrievalConfig> & { memoryConfig?: MemoryConfig } = {}
): Promise<TieredRetrievalResult> {
  const { memoryConfig, tier = 'compact', token_budget = 2500, ...retrievalConfig } = config;
  const fullConfig = { ...DEFAULT_CONFIG, ...retrievalConfig };

  // Get raw results using existing search
  const rawResult = await checkMemory(symptom, { memoryConfig, ...fullConfig });

  // Transform based on tier
  if (tier === 'summary') {
    return transformToSummaryTier(rawResult, token_budget);
  }

  if (tier === 'compact') {
    return transformToCompactTier(rawResult, token_budget);
  }

  // 'full' tier - return as-is with full data
  return {
    confidence: rawResult.confidence,
    tokens_used: rawResult.tokens_used,
    has_more_details: false,
  };
}

/**
 * Transform results to summary tier (~100 tokens per incident)
 */
function transformToSummaryTier(
  result: RetrievalResult,
  budget: number
): TieredRetrievalResult {
  const summaries = result.incidents.map(generateIncidentSummary);
  const patternSummaries = result.patterns.map(p => ({
    id: p.pattern_id,
    name: p.name,
    success_rate: p.success_rate,
  }));

  // Estimate tokens (100 per summary, 50 per pattern summary)
  const tokensPerSummary = 100;
  const tokensPerPatternSummary = 50;
  const maxSummaries = Math.floor((budget * 0.6) / tokensPerSummary);
  const maxPatternSummaries = Math.floor((budget * 0.3) / tokensPerPatternSummary);

  const limitedSummaries = summaries.slice(0, maxSummaries);
  const limitedPatternSummaries = patternSummaries.slice(0, maxPatternSummaries);

  const tokensUsed =
    limitedSummaries.length * tokensPerSummary +
    limitedPatternSummaries.length * tokensPerPatternSummary +
    Math.floor(budget * 0.1);

  return {
    summaries: limitedSummaries,
    pattern_summaries: limitedPatternSummaries,
    confidence: result.confidence,
    tokens_used: tokensUsed,
    has_more_details: true,
    truncated: {
      incidents: summaries.length - limitedSummaries.length,
      patterns: patternSummaries.length - limitedPatternSummaries.length,
    },
  };
}

/**
 * Transform results to compact tier (~200 tokens per incident)
 */
function transformToCompactTier(
  result: RetrievalResult,
  budget: number
): TieredRetrievalResult {
  // Convert to compact format
  const compactIncidents = result.incidents.map(toCompactIncident);
  const compactPatterns = result.patterns.map(toCompactPattern);

  // Apply token budget
  const { limitedIncidents, limitedPatterns, tokensUsed, truncated } =
    enforceTokenBudget(compactIncidents, compactPatterns, budget);

  return {
    incidents: limitedIncidents,
    patterns: limitedPatterns,
    confidence: result.confidence,
    tokens_used: tokensUsed,
    has_more_details: truncated.incidents > 0 || truncated.patterns > 0,
    truncated,
  };
}

/**
 * Quick memory check with minimal output
 *
 * Returns only essential fields for rapid assessment.
 * Useful when token budget is very tight.
 */
export async function quickMemoryCheck(
  symptom: string,
  config?: { memoryConfig?: MemoryConfig; maxResults?: number }
): Promise<{
  hasMatches: boolean;
  matchCount: number;
  topMatch?: {
    id: string;
    symptom: string;
    category: string;
    confidence: number;
  };
  tokensUsed: number;
}> {
  const result = await checkMemoryTiered(symptom, {
    memoryConfig: config?.memoryConfig,
    tier: 'summary',
    token_budget: 500, // Minimal budget
    max_results: config?.maxResults || 3,
  });

  const summaries = result.summaries || [];

  return {
    hasMatches: summaries.length > 0,
    matchCount: summaries.length,
    topMatch: summaries[0]
      ? {
          id: summaries[0].incident_id,
          symptom: summaries[0].symptom_preview,
          category: summaries[0].category,
          confidence: summaries[0].confidence,
        }
      : undefined,
    tokensUsed: result.tokens_used,
  };
}

/**
 * Get incident details on demand (lazy loading)
 *
 * Use this when compact/summary tier found a match and full details are needed.
 */
export async function getIncidentDetails(
  incident_id: string,
  config?: MemoryConfig
): Promise<Incident | null> {
  const { loadIncident } = await import('./storage');
  return loadIncident(incident_id, config);
}

/**
 * Get pattern details on demand (lazy loading)
 */
export async function getPatternDetails(
  pattern_id: string,
  config?: MemoryConfig
): Promise<Pattern | null> {
  const { loadPattern } = await import('./storage');
  return loadPattern(pattern_id, config);
}

/**
 * Estimate token usage for different retrieval tiers
 */
export function estimateTokensForTier(
  incidentCount: number,
  patternCount: number,
  tier: 'summary' | 'compact' | 'full'
): number {
  const multipliers = {
    summary: { incident: 100, pattern: 50 },
    compact: { incident: 200, pattern: 120 },
    full: { incident: 550, pattern: 250 },
  };

  const m = multipliers[tier];
  return incidentCount * m.incident + patternCount * m.pattern + 50; // +50 for overhead
}
