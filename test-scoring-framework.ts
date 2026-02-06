#!/usr/bin/env npx ts-node
/**
 * Debugger Scoring Framework
 *
 * Evaluates the claude-code-debugger across 6 dimensions:
 *
 * 1. Retrieval Accuracy  - Can it find the right incident given varied symptoms?
 * 2. Semantic Recall      - Does it match semantically similar but lexically different descriptions?
 * 3. Token Efficiency     - How much context budget does it consume per result?
 * 4. Pattern Extraction   - Does it correctly group and extract reusable patterns?
 * 5. Memory Freshness     - Does it prefer recent incidents appropriately?
 * 6. Hook Coverage        - Does the audit miner capture incidents from markdown?
 *
 * Scoring: Each dimension 0-100, weighted average = overall score.
 *
 * Usage: npx ts-node test-scoring-framework.ts
 */

import fs from 'fs/promises';
import path from 'path';
import { getConfig, getMemoryPaths } from './src/config';
import { storeIncident, loadAllIncidents, generateIncidentId, loadAllPatterns, storePattern } from './src/storage';
import { checkMemory, enhancedSearch, checkMemoryTiered, quickMemoryCheck } from './src/retrieval';
import { extractPatterns, autoExtractPatternIfReady } from './src/pattern-extractor';
import type { Incident, Pattern, MemoryConfig } from './src/types';

// =============================================================================
// TEST INFRASTRUCTURE
// =============================================================================

interface ScoreDimension {
  name: string;
  weight: number;
  score: number;
  maxScore: number;
  details: TestResult[];
}

interface TestResult {
  name: string;
  passed: boolean;
  score: number;
  maxScore: number;
  notes: string;
  durationMs: number;
}

interface ScoringReport {
  timestamp: string;
  dimensions: ScoreDimension[];
  overallScore: number;
  overallMax: number;
  grade: string;
  weakSpots: string[];
  strengths: string[];
  recommendations: string[];
}

const TEST_MEMORY_PATH = path.join(process.cwd(), '.test-scoring-memory');

function getTestConfig(): MemoryConfig {
  return {
    storageMode: 'local',
    memoryPath: TEST_MEMORY_PATH,
    autoMine: false,
    defaultSimilarityThreshold: 0.5,
    defaultMaxResults: 10,
  };
}

// =============================================================================
// TEST INCIDENT FACTORY
// =============================================================================

function makeIncident(opts: Partial<Incident> & { symptom: string }): Incident {
  return {
    incident_id: opts.incident_id || generateIncidentId(),
    timestamp: opts.timestamp || Date.now(),
    symptom: opts.symptom,
    root_cause: opts.root_cause || {
      description: 'Test root cause description that is at least 50 characters for quality scoring',
      category: 'test',
      confidence: 0.8,
    },
    fix: opts.fix || {
      approach: 'Test fix approach',
      changes: [{ file: 'test.ts', lines_changed: 5, change_type: 'modify', summary: 'Fixed it' }],
    },
    verification: opts.verification || {
      status: 'verified',
      regression_tests_passed: true,
      user_journey_tested: true,
      success_criteria_met: true,
    },
    tags: opts.tags || ['test'],
    files_changed: opts.files_changed || ['test.ts'],
    quality_gates: opts.quality_gates || {
      guardian_validated: false,
      tested_e2e: true,
      tested_from_ui: false,
      security_reviewed: false,
      architect_reviewed: false,
    },
    completeness: opts.completeness || {
      symptom: true,
      root_cause: true,
      fix: true,
      verification: true,
      quality_score: 0.75,
    },
  };
}

// =============================================================================
// DIMENSION 1: RETRIEVAL ACCURACY (weight: 25%)
// =============================================================================

async function scoreRetrievalAccuracy(config: MemoryConfig): Promise<ScoreDimension> {
  const dim: ScoreDimension = {
    name: 'Retrieval Accuracy',
    weight: 0.25,
    score: 0,
    maxScore: 0,
    details: [],
  };

  // Seed incidents
  const incidents = [
    makeIncident({
      symptom: 'React useEffect hook causes infinite re-render loop when dependency array includes object literal',
      tags: ['react', 'hooks', 'useEffect', 'infinite-loop', 'rendering'],
      root_cause: { description: 'Object literals in useEffect dependency array create new reference each render, causing infinite loops', category: 'react-hooks', confidence: 0.95 },
    }),
    makeIncident({
      symptom: 'Database connection pool exhausted after high traffic spike, all queries timing out',
      tags: ['database', 'connection-pool', 'timeout', 'performance'],
      root_cause: { description: 'Connection pool size too small for traffic volume, idle connections not being released', category: 'database', confidence: 0.9 },
    }),
    makeIncident({
      symptom: 'API endpoint returns 500 when user submits form with special characters in name field',
      tags: ['api', 'validation', 'error-handling', 'input-sanitization'],
      root_cause: { description: 'Missing input sanitization allows special characters to break SQL query construction', category: 'api', confidence: 0.85 },
    }),
    makeIncident({
      symptom: 'Next.js hydration mismatch error on product page due to server/client date formatting difference',
      tags: ['nextjs', 'hydration', 'ssr', 'date-formatting'],
      root_cause: { description: 'Server renders date in UTC, client renders in local timezone, causing HTML mismatch', category: 'react-hooks', confidence: 0.9 },
    }),
    makeIncident({
      symptom: 'Memory leak in WebSocket handler causing Node.js process to crash after 24 hours',
      tags: ['memory-leak', 'websocket', 'nodejs', 'crash'],
      root_cause: { description: 'Event listeners not being cleaned up on WebSocket disconnect, accumulating in memory', category: 'performance', confidence: 0.88 },
    }),
  ];

  for (const inc of incidents) {
    await storeIncident(inc, { config });
  }

  // Test 1: Exact symptom match
  const t1start = Date.now();
  const r1 = await checkMemory('React useEffect hook causes infinite re-render loop', { memoryConfig: config });
  const t1 = { name: 'Exact symptom substring match', passed: false, score: 0, maxScore: 10, notes: '', durationMs: Date.now() - t1start };
  if (r1.incidents.length > 0 && r1.incidents[0].root_cause?.category === 'react-hooks') {
    t1.passed = true;
    t1.score = 10;
    t1.notes = `Found ${r1.incidents.length} incidents, top match correct`;
  } else {
    t1.notes = `Expected react-hooks incident, got ${r1.incidents.length} results`;
  }
  dim.details.push(t1);

  // Test 2: Keyword-based match (different phrasing, same keywords)
  const t2start = Date.now();
  const r2 = await checkMemory('database timeout connection pool', { memoryConfig: config });
  const t2 = { name: 'Keyword-based match (rephrased)', passed: false, score: 0, maxScore: 10, notes: '', durationMs: Date.now() - t2start };
  if (r2.incidents.length > 0) {
    const hasDbIncident = r2.incidents.some(i => i.tags?.includes('database') || i.root_cause?.category === 'database');
    if (hasDbIncident) {
      t2.passed = true;
      t2.score = 10;
      t2.notes = 'Found database incident via keyword match';
    } else {
      t2.score = 3;
      t2.notes = `Found incidents but none related to database: ${r2.incidents.map(i => i.root_cause?.category).join(', ')}`;
    }
  } else {
    t2.notes = 'No incidents found';
  }
  dim.details.push(t2);

  // Test 3: Tag-based retrieval
  const t3start = Date.now();
  const r3 = await enhancedSearch('websocket memory crash', { memoryConfig: config });
  const t3 = { name: 'Tag-based enhanced search', passed: false, score: 0, maxScore: 10, notes: '', durationMs: Date.now() - t3start };
  if (r3.length > 0) {
    const hasWsIncident = r3.some(r => r.incident.tags?.includes('memory-leak') || r.incident.tags?.includes('websocket'));
    if (hasWsIncident) {
      t3.passed = true;
      t3.score = 10;
      t3.notes = `Found via ${r3[0].matchType} match, score: ${r3[0].score.toFixed(2)}`;
    } else {
      t3.score = 3;
      t3.notes = `Found results but wrong category: ${r3.map(r => r.matchType).join(', ')}`;
    }
  } else {
    t3.notes = 'No results from enhanced search';
  }
  dim.details.push(t3);

  // Test 4: Empty/irrelevant query should return nothing
  const t4start = Date.now();
  const r4 = await checkMemory('completely unrelated quantum physics problem', { memoryConfig: config });
  const t4 = { name: 'Irrelevant query returns no false positives', passed: false, score: 0, maxScore: 10, notes: '', durationMs: Date.now() - t4start };
  if (r4.incidents.length === 0) {
    t4.passed = true;
    t4.score = 10;
    t4.notes = 'Correctly returned 0 results for irrelevant query';
  } else {
    t4.score = Math.max(0, 10 - r4.incidents.length * 3);
    t4.notes = `Returned ${r4.incidents.length} false positives`;
  }
  dim.details.push(t4);

  // Test 5: Partial match should still find relevant results
  const t5start = Date.now();
  const r5 = await checkMemory('form validation 500 error', { memoryConfig: config });
  const t5 = { name: 'Partial match retrieval', passed: false, score: 0, maxScore: 10, notes: '', durationMs: Date.now() - t5start };
  if (r5.incidents.length > 0) {
    const hasApiIncident = r5.incidents.some(i => i.root_cause?.category === 'api' || i.tags?.includes('validation'));
    if (hasApiIncident) {
      t5.passed = true;
      t5.score = 10;
      t5.notes = 'Found API/validation incident via partial match';
    } else {
      t5.score = 4;
      t5.notes = `Found ${r5.incidents.length} incidents but wrong category`;
    }
  } else {
    t5.notes = 'No incidents found for partial match';
  }
  dim.details.push(t5);

  dim.score = dim.details.reduce((s, t) => s + t.score, 0);
  dim.maxScore = dim.details.reduce((s, t) => s + t.maxScore, 0);
  return dim;
}

// =============================================================================
// DIMENSION 2: SEMANTIC RECALL (weight: 20%)
// =============================================================================

async function scoreSemanticRecall(config: MemoryConfig): Promise<ScoreDimension> {
  const dim: ScoreDimension = {
    name: 'Semantic Recall',
    weight: 0.20,
    score: 0,
    maxScore: 0,
    details: [],
  };

  // These tests use different vocabulary to describe the same underlying problems.
  // A keyword-only system will struggle; a semantic system should succeed.

  const semanticTests = [
    {
      name: 'Synonym: "component keeps refreshing" ≈ "infinite re-render loop"',
      query: 'component keeps refreshing itself endlessly',
      expectedCategory: 'react-hooks',
      expectedTags: ['react', 'hooks', 'rendering'],
    },
    {
      name: 'Paraphrase: "DB stops responding" ≈ "connection pool exhausted"',
      query: 'database stops responding under load',
      expectedCategory: 'database',
      expectedTags: ['database', 'timeout'],
    },
    {
      name: 'Domain shift: "XSS via form input" ≈ "special characters in name field"',
      query: 'injection attack through user input form',
      expectedCategory: 'api',
      expectedTags: ['validation', 'input-sanitization'],
    },
    {
      name: 'Jargon variation: "SSR content mismatch" ≈ "hydration mismatch"',
      query: 'server rendered HTML does not match client markup',
      expectedCategory: 'react-hooks',
      expectedTags: ['hydration', 'ssr'],
    },
    {
      name: 'Casual language: "app eats all the RAM" ≈ "memory leak"',
      query: 'application gradually uses more and more memory until it dies',
      expectedCategory: 'performance',
      expectedTags: ['memory-leak'],
    },
  ];

  for (const st of semanticTests) {
    const start = Date.now();
    const results = await enhancedSearch(st.query, { memoryConfig: config, threshold: 0.3 });
    const dur = Date.now() - start;

    const t: TestResult = { name: st.name, passed: false, score: 0, maxScore: 10, notes: '', durationMs: dur };

    if (results.length > 0) {
      const categoryMatch = results.some(r => r.incident.root_cause?.category === st.expectedCategory);
      const tagMatch = results.some(r =>
        st.expectedTags.some(et => (r.incident.tags ?? []).includes(et))
      );

      if (categoryMatch) {
        t.passed = true;
        t.score = 10;
        t.notes = `Category match found (${st.expectedCategory}), match type: ${results[0].matchType}`;
      } else if (tagMatch) {
        t.score = 6;
        t.notes = `Tag match but wrong top category. Got: ${results[0].incident.root_cause?.category}`;
      } else {
        t.score = 2;
        t.notes = `Found ${results.length} results but none match expected category/tags`;
      }
    } else {
      t.score = 0;
      t.notes = 'MISS: No results found - semantic gap not bridged';
    }

    dim.details.push(t);
  }

  dim.score = dim.details.reduce((s, t) => s + t.score, 0);
  dim.maxScore = dim.details.reduce((s, t) => s + t.maxScore, 0);
  return dim;
}

// =============================================================================
// DIMENSION 3: TOKEN EFFICIENCY (weight: 15%)
// =============================================================================

async function scoreTokenEfficiency(config: MemoryConfig): Promise<ScoreDimension> {
  const dim: ScoreDimension = {
    name: 'Token Efficiency',
    weight: 0.15,
    score: 0,
    maxScore: 0,
    details: [],
  };

  // Test 1: Summary tier stays within budget
  const t1start = Date.now();
  const r1 = await checkMemoryTiered('database', {
    memoryConfig: config,
    tier: 'summary',
    token_budget: 500,
  });
  const t1 = { name: 'Summary tier respects 500-token budget', passed: false, score: 0, maxScore: 10, notes: '', durationMs: Date.now() - t1start };
  if (r1.tokens_used <= 500) {
    t1.passed = true;
    t1.score = 10;
    t1.notes = `Used ${r1.tokens_used} tokens (budget: 500)`;
  } else {
    t1.score = Math.max(0, 10 - Math.floor((r1.tokens_used - 500) / 50));
    t1.notes = `Over budget: ${r1.tokens_used} tokens (budget: 500)`;
  }
  dim.details.push(t1);

  // Test 2: Compact tier uses less than full tier
  const t2start = Date.now();
  const rCompact = await checkMemoryTiered('react hooks', { memoryConfig: config, tier: 'compact', token_budget: 2500 });
  const rFull = await checkMemoryTiered('react hooks', { memoryConfig: config, tier: 'full', token_budget: 10000 });
  const t2 = { name: 'Compact tier uses fewer tokens than full', passed: false, score: 0, maxScore: 10, notes: '', durationMs: Date.now() - t2start };
  if (rCompact.tokens_used < (rFull.tokens_used || 10000)) {
    t2.passed = true;
    t2.score = 10;
    const ratio = rFull.tokens_used > 0 ? (rCompact.tokens_used / rFull.tokens_used * 100).toFixed(0) : '0';
    t2.notes = `Compact: ${rCompact.tokens_used} tokens, Full: ${rFull.tokens_used} tokens (${ratio}% of full)`;
  } else {
    t2.notes = `Compact (${rCompact.tokens_used}) >= Full (${rFull.tokens_used})`;
  }
  dim.details.push(t2);

  // Test 3: Quick memory check is under 200 tokens
  const t3start = Date.now();
  const r3 = await quickMemoryCheck('error', { memoryConfig: config });
  const t3 = { name: 'Quick check under 200 tokens', passed: false, score: 0, maxScore: 10, notes: '', durationMs: Date.now() - t3start };
  if (r3.tokensUsed <= 200) {
    t3.passed = true;
    t3.score = 10;
    t3.notes = `Used ${r3.tokensUsed} tokens`;
  } else {
    t3.score = Math.max(0, 10 - Math.floor((r3.tokensUsed - 200) / 50));
    t3.notes = `Over target: ${r3.tokensUsed} tokens (target: 200)`;
  }
  dim.details.push(t3);

  // Test 4: Token budget enforcement doesn't lose high-quality results
  const t4start = Date.now();
  const rTight = await checkMemoryTiered('database', { memoryConfig: config, tier: 'compact', token_budget: 400 });
  const rLoose = await checkMemoryTiered('database', { memoryConfig: config, tier: 'compact', token_budget: 5000 });
  const t4 = { name: 'Tight budget retains at least 1 result', passed: false, score: 0, maxScore: 10, notes: '', durationMs: Date.now() - t4start };
  const tightCount = (rTight.incidents?.length || 0) + (rTight.summaries?.length || 0);
  const looseCount = (rLoose.incidents?.length || 0) + (rLoose.summaries?.length || 0);
  if (tightCount > 0) {
    t4.passed = true;
    t4.score = 10;
    t4.notes = `Tight budget: ${tightCount} results, Loose: ${looseCount} results`;
  } else {
    t4.notes = `Tight budget returned 0 results (loose returned ${looseCount})`;
  }
  dim.details.push(t4);

  dim.score = dim.details.reduce((s, t) => s + t.score, 0);
  dim.maxScore = dim.details.reduce((s, t) => s + t.maxScore, 0);
  return dim;
}

// =============================================================================
// DIMENSION 4: PATTERN EXTRACTION (weight: 15%)
// =============================================================================

async function scorePatternExtraction(config: MemoryConfig): Promise<ScoreDimension> {
  const dim: ScoreDimension = {
    name: 'Pattern Extraction',
    weight: 0.15,
    score: 0,
    maxScore: 0,
    details: [],
  };

  // Seed 4 incidents with same category to trigger pattern extraction
  const reactIncidents = [
    makeIncident({
      symptom: 'useEffect dependency array causes infinite loop with object',
      tags: ['react', 'hooks', 'useEffect', 'infinite-loop'],
      root_cause: { description: 'Object in dependency array causes re-render loop because new reference each render', category: 'react-hooks', confidence: 0.9 },
    }),
    makeIncident({
      symptom: 'useState update inside useEffect without proper deps triggers loop',
      tags: ['react', 'hooks', 'useState', 'useEffect'],
      root_cause: { description: 'Missing dependency in useEffect causes stale closure over state setter', category: 'react-hooks', confidence: 0.85 },
    }),
    makeIncident({
      symptom: 'useCallback not memoizing correctly, child re-renders every time',
      tags: ['react', 'hooks', 'useCallback', 'memoization', 'rendering'],
      root_cause: { description: 'useCallback dependency array not including all referenced values, breaking memoization', category: 'react-hooks', confidence: 0.8 },
    }),
    makeIncident({
      symptom: 'useMemo dependency on props.items causes recalculation on every render',
      tags: ['react', 'hooks', 'useMemo', 'performance', 'rendering'],
      root_cause: { description: 'props.items is a new array reference on each parent render, invalidating useMemo', category: 'react-hooks', confidence: 0.82 },
    }),
  ];

  for (const inc of reactIncidents) {
    await storeIncident(inc, { config });
  }

  // Test 1: Pattern extraction finds candidates
  const t1start = Date.now();
  const patterns = await extractPatterns({ min_incidents: 3, min_similarity: 0.5, auto_store: false, config });
  const t1 = { name: 'Extracts pattern from 4+ similar incidents', passed: false, score: 0, maxScore: 15, notes: '', durationMs: Date.now() - t1start };
  if (patterns.length > 0) {
    t1.passed = true;
    t1.score = 15;
    t1.notes = `Extracted ${patterns.length} pattern(s): ${patterns.map(p => p.name).join(', ')}`;
  } else {
    t1.notes = 'No patterns extracted despite 4 similar react-hooks incidents';
  }
  dim.details.push(t1);

  // Test 2: Pattern has valid structure
  const t2start = Date.now();
  const t2 = { name: 'Pattern has complete structure', passed: false, score: 0, maxScore: 10, notes: '', durationMs: Date.now() - t2start };
  if (patterns.length > 0) {
    const p = patterns[0];
    const hasId = !!p.pattern_id;
    const hasName = !!p.name;
    const hasSig = p.detection_signature?.length > 0;
    const hasSolution = !!p.solution_template;
    const hasRate = typeof p.success_rate === 'number';
    const fields = [hasId, hasName, hasSig, hasSolution, hasRate];
    const complete = fields.filter(Boolean).length;
    t2.score = Math.floor((complete / fields.length) * 10);
    t2.passed = complete === fields.length;
    t2.notes = `${complete}/${fields.length} required fields present`;
  } else {
    t2.notes = 'No pattern to validate';
  }
  dim.details.push(t2);

  // Test 3: Auto-extraction triggers correctly
  const t3start = Date.now();
  const newInc = makeIncident({
    symptom: 'Another useRef hook causing stale reference in callback',
    tags: ['react', 'hooks', 'useRef', 'stale-closure'],
    root_cause: { description: 'useRef current value not updated before callback fires, reading stale reference', category: 'react-hooks', confidence: 0.87 },
  });
  const autoPattern = await autoExtractPatternIfReady(newInc, { config, minSimilar: 3, minQuality: 0.4 });
  const t3 = { name: 'Auto-extraction triggers on threshold', passed: false, score: 0, maxScore: 10, notes: '', durationMs: Date.now() - t3start };
  // Note: auto-extract may or may not trigger depending on existing patterns
  if (autoPattern) {
    t3.passed = true;
    t3.score = 10;
    t3.notes = `Auto-extracted: ${autoPattern.pattern_id}`;
  } else {
    // It's acceptable if pattern already exists
    const existing = await loadAllPatterns(config);
    if (existing.length > 0) {
      t3.score = 7;
      t3.notes = 'Pattern already exists (correct dedup behavior)';
    } else {
      t3.notes = 'Auto-extraction did not trigger';
    }
  }
  dim.details.push(t3);

  dim.score = dim.details.reduce((s, t) => s + t.score, 0);
  dim.maxScore = dim.details.reduce((s, t) => s + t.maxScore, 0);
  return dim;
}

// =============================================================================
// DIMENSION 5: MEMORY FRESHNESS (weight: 15%)
// =============================================================================

async function scoreMemoryFreshness(config: MemoryConfig): Promise<ScoreDimension> {
  const dim: ScoreDimension = {
    name: 'Memory Freshness',
    weight: 0.15,
    score: 0,
    maxScore: 0,
    details: [],
  };

  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;

  // Create incidents at different ages
  const recentInc = makeIncident({
    symptom: 'Cache invalidation bug in redis TTL configuration causing stale data',
    tags: ['redis', 'cache', 'ttl', 'stale-data'],
    timestamp: now - 1 * oneDay, // 1 day old
    root_cause: { description: 'Redis TTL set too high, causing stale data to persist beyond acceptable window', category: 'caching', confidence: 0.85 },
  });

  const oldInc = makeIncident({
    symptom: 'Cache invalidation issue in memcached configuration with expired keys',
    tags: ['cache', 'memcached', 'ttl', 'stale-data'],
    timestamp: now - 120 * oneDay, // 120 days old
    root_cause: { description: 'Memcached TTL too high causing stale data, similar to redis caching issues', category: 'caching', confidence: 0.9 },
  });

  await storeIncident(recentInc, { config });
  await storeIncident(oldInc, { config });

  // Test 1: Recent incident ranks higher
  const t1start = Date.now();
  const r1 = await checkMemory('cache stale data TTL', { memoryConfig: config, temporal_preference: 90 });
  const t1 = { name: 'Recent incident ranks above old incident', passed: false, score: 0, maxScore: 15, notes: '', durationMs: Date.now() - t1start };
  if (r1.incidents.length >= 2) {
    const recentIdx = r1.incidents.findIndex(i => i.incident_id === recentInc.incident_id);
    const oldIdx = r1.incidents.findIndex(i => i.incident_id === oldInc.incident_id);
    if (recentIdx >= 0 && oldIdx >= 0 && recentIdx < oldIdx) {
      t1.passed = true;
      t1.score = 15;
      t1.notes = `Recent at position ${recentIdx}, old at position ${oldIdx}`;
    } else if (recentIdx >= 0 && oldIdx >= 0) {
      t1.score = 5;
      t1.notes = `Old incident ranked higher (recent: ${recentIdx}, old: ${oldIdx}) - temporal boost insufficient`;
    } else {
      t1.score = 3;
      t1.notes = `Missing incidents in results (recent found: ${recentIdx >= 0}, old found: ${oldIdx >= 0})`;
    }
  } else {
    t1.notes = `Only ${r1.incidents.length} result(s) returned, need 2`;
  }
  dim.details.push(t1);

  // Test 2: Old incidents still findable (not excluded)
  const t2start = Date.now();
  const r2 = await checkMemory('memcached expired keys', { memoryConfig: config });
  const t2 = { name: 'Old incidents still accessible', passed: false, score: 0, maxScore: 10, notes: '', durationMs: Date.now() - t2start };
  if (r2.incidents.length > 0) {
    const hasOld = r2.incidents.some(i => i.incident_id === oldInc.incident_id);
    if (hasOld) {
      t2.passed = true;
      t2.score = 10;
      t2.notes = 'Old incident found when specifically searched';
    } else {
      t2.score = 3;
      t2.notes = 'Old incident not found even with specific query';
    }
  } else {
    t2.notes = 'No results for old incident query';
  }
  dim.details.push(t2);

  dim.score = dim.details.reduce((s, t) => s + t.score, 0);
  dim.maxScore = dim.details.reduce((s, t) => s + t.maxScore, 0);
  return dim;
}

// =============================================================================
// DIMENSION 6: HOOK COVERAGE / AUDIT MINING (weight: 10%)
// =============================================================================

async function scoreHookCoverage(config: MemoryConfig): Promise<ScoreDimension> {
  const dim: ScoreDimension = {
    name: 'Hook Coverage & Audit Mining',
    weight: 0.10,
    score: 0,
    maxScore: 0,
    details: [],
  };

  // Test 1: hooks.json has session-stop hook
  const t1start = Date.now();
  const t1 = { name: 'Session-stop hook configured', passed: false, score: 0, maxScore: 10, notes: '', durationMs: 0 };
  try {
    const hooksContent = await fs.readFile(path.join(process.cwd(), 'hooks/hooks.json'), 'utf-8');
    const hooks = JSON.parse(hooksContent);
    if (hooks.Stop && hooks.Stop.length > 0) {
      t1.passed = true;
      t1.score = 10;
      t1.notes = `Stop hook configured with ${hooks.Stop.length} matcher(s)`;
    } else {
      t1.notes = 'No Stop hook found in hooks.json';
    }
  } catch (e) {
    t1.notes = `Could not read hooks.json: ${e}`;
  }
  t1.durationMs = Date.now() - t1start;
  dim.details.push(t1);

  // Test 2: No PreToolUse hook (this is a gap we want to detect)
  const t2start = Date.now();
  const t2 = { name: 'PreToolUse hook for proactive warnings (MISSING)', passed: false, score: 0, maxScore: 10, notes: '', durationMs: 0 };
  try {
    const hooksContent = await fs.readFile(path.join(process.cwd(), 'hooks/hooks.json'), 'utf-8');
    const hooks = JSON.parse(hooksContent);
    if (hooks.PreToolUse) {
      t2.passed = true;
      t2.score = 10;
      t2.notes = 'PreToolUse hook present';
    } else {
      t2.score = 0;
      t2.notes = 'GAP: No PreToolUse hook - cannot warn about previously-buggy files before edits';
    }
  } catch (e) {
    t2.notes = `Could not check: ${e}`;
  }
  t2.durationMs = Date.now() - t2start;
  dim.details.push(t2);

  // Test 3: No PostToolUse hook for error capture
  const t3start = Date.now();
  const t3 = { name: 'PostToolUse error capture hook (MISSING)', passed: false, score: 0, maxScore: 10, notes: '', durationMs: 0 };
  try {
    const hooksContent = await fs.readFile(path.join(process.cwd(), 'hooks/hooks.json'), 'utf-8');
    const hooks = JSON.parse(hooksContent);
    if (hooks.PostToolUse) {
      t3.passed = true;
      t3.score = 10;
      t3.notes = 'PostToolUse hook present';
    } else {
      t3.score = 0;
      t3.notes = 'GAP: No PostToolUse hook - errors from tool calls not captured in real-time';
    }
  } catch (e) {
    t3.notes = `Could not check: ${e}`;
  }
  t3.durationMs = Date.now() - t3start;
  dim.details.push(t3);

  dim.score = dim.details.reduce((s, t) => s + t.score, 0);
  dim.maxScore = dim.details.reduce((s, t) => s + t.maxScore, 0);
  return dim;
}

// =============================================================================
// REPORT GENERATION
// =============================================================================

function generateReport(dimensions: ScoreDimension[]): ScoringReport {
  const overallScore = dimensions.reduce((sum, d) => sum + d.score * d.weight, 0);
  const overallMax = dimensions.reduce((sum, d) => sum + d.maxScore * d.weight, 0);
  const pct = overallMax > 0 ? (overallScore / overallMax * 100) : 0;

  const grade = pct >= 90 ? 'A' : pct >= 80 ? 'B' : pct >= 70 ? 'C' : pct >= 60 ? 'D' : 'F';

  const weakSpots: string[] = [];
  const strengths: string[] = [];

  for (const d of dimensions) {
    const dimPct = d.maxScore > 0 ? (d.score / d.maxScore * 100) : 0;
    if (dimPct < 50) {
      weakSpots.push(`${d.name}: ${dimPct.toFixed(0)}% (${d.details.filter(t => !t.passed).map(t => t.notes).join('; ')})`);
    } else if (dimPct >= 80) {
      strengths.push(`${d.name}: ${dimPct.toFixed(0)}%`);
    }
  }

  const recommendations: string[] = [];

  // Check specific weak spots
  const semanticDim = dimensions.find(d => d.name === 'Semantic Recall');
  if (semanticDim && semanticDim.maxScore > 0 && (semanticDim.score / semanticDim.maxScore) < 0.6) {
    recommendations.push('ADD SEMANTIC SEARCH: Implement embedding-based retrieval (strategy 5) to bridge lexical gaps. Current keyword/fuzzy matching misses semantically similar symptoms described with different vocabulary.');
  }

  const hookDim = dimensions.find(d => d.name.includes('Hook'));
  if (hookDim && hookDim.maxScore > 0 && (hookDim.score / hookDim.maxScore) < 0.5) {
    recommendations.push('ADD PROACTIVE HOOKS: Implement PreToolUse hook to warn about previously-buggy files before edits, and PostToolUse hook to capture errors in real-time rather than waiting for session end.');
  }

  const freshDim = dimensions.find(d => d.name === 'Memory Freshness');
  if (freshDim && freshDim.maxScore > 0 && (freshDim.score / freshDim.maxScore) < 0.7) {
    recommendations.push('IMPROVE TEMPORAL WEIGHTING: Current temporal boost (1.2x for <90 days) is insufficient. Consider exponential decay or a configurable recency window.');
  }

  // Always recommend adaptive token budget for Opus 4.6
  recommendations.push('ADAPTIVE TOKEN BUDGETS: Detect model context capacity (Opus 4.6 = 1M tokens) and scale token budgets accordingly. Current fixed 2500-token budget is conservative for large-context models.');

  // Recommend observation masking
  recommendations.push('OBSERVATION MASKING: Per JetBrains NeurIPS 2025 research, mask large observation payloads (stack traces, code blocks) rather than truncating the reasoning chain. Current compact tier truncates uniformly.');

  // KV-cache awareness
  recommendations.push('KV-CACHE STABILITY: Ensure skill auto-injection uses a stable prefix without dynamic timestamps. Per Manus research, this can achieve 10x cost reduction on cached prefixes.');

  return {
    timestamp: new Date().toISOString(),
    dimensions,
    overallScore,
    overallMax,
    grade,
    weakSpots,
    strengths,
    recommendations,
  };
}

function printReport(report: ScoringReport): void {
  console.log('\n' + '═'.repeat(70));
  console.log('  CLAUDE CODE DEBUGGER - SCORING REPORT');
  console.log('  Generated: ' + report.timestamp);
  console.log('═'.repeat(70));

  console.log(`\n  OVERALL: ${(report.overallScore / report.overallMax * 100).toFixed(1)}% (Grade: ${report.grade})\n`);

  for (const dim of report.dimensions) {
    const pct = dim.maxScore > 0 ? (dim.score / dim.maxScore * 100).toFixed(0) : '0';
    const bar = '█'.repeat(Math.floor(Number(pct) / 5)) + '░'.repeat(20 - Math.floor(Number(pct) / 5));
    console.log(`  ${dim.name.padEnd(28)} ${bar} ${pct}% (${dim.score}/${dim.maxScore}) [weight: ${(dim.weight * 100).toFixed(0)}%]`);

    for (const t of dim.details) {
      const icon = t.passed ? '✅' : '❌';
      console.log(`    ${icon} ${t.name} (${t.score}/${t.maxScore}) ${t.durationMs}ms`);
      if (!t.passed || t.notes) {
        console.log(`       ${t.notes}`);
      }
    }
    console.log('');
  }

  if (report.strengths.length > 0) {
    console.log('  STRENGTHS:');
    for (const s of report.strengths) {
      console.log(`    ✅ ${s}`);
    }
    console.log('');
  }

  if (report.weakSpots.length > 0) {
    console.log('  WEAK SPOTS:');
    for (const w of report.weakSpots) {
      console.log(`    ⚠️  ${w}`);
    }
    console.log('');
  }

  if (report.recommendations.length > 0) {
    console.log('  RECOMMENDATIONS:');
    for (let i = 0; i < report.recommendations.length; i++) {
      console.log(`    ${i + 1}. ${report.recommendations[i]}`);
    }
    console.log('');
  }

  console.log('═'.repeat(70));
}

// =============================================================================
// MAIN
// =============================================================================

async function main(): Promise<void> {
  const config = getTestConfig();

  // Clean up previous test data
  try {
    await fs.rm(TEST_MEMORY_PATH, { recursive: true, force: true });
  } catch {}

  console.log('Starting scoring framework...');
  console.log(`Test memory path: ${TEST_MEMORY_PATH}\n`);

  // Run all dimensions
  const dimensions: ScoreDimension[] = [];

  console.log('--- Running Dimension 1: Retrieval Accuracy ---');
  dimensions.push(await scoreRetrievalAccuracy(config));

  console.log('\n--- Running Dimension 2: Semantic Recall ---');
  dimensions.push(await scoreSemanticRecall(config));

  console.log('\n--- Running Dimension 3: Token Efficiency ---');
  dimensions.push(await scoreTokenEfficiency(config));

  console.log('\n--- Running Dimension 4: Pattern Extraction ---');
  dimensions.push(await scorePatternExtraction(config));

  console.log('\n--- Running Dimension 5: Memory Freshness ---');
  dimensions.push(await scoreMemoryFreshness(config));

  console.log('\n--- Running Dimension 6: Hook Coverage ---');
  dimensions.push(await scoreHookCoverage(config));

  // Generate and print report
  const report = generateReport(dimensions);
  printReport(report);

  // Save report
  const reportPath = path.join(process.cwd(), 'scoring-report.json');
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2), 'utf-8');
  console.log(`\nReport saved to: ${reportPath}`);

  // Cleanup
  try {
    await fs.rm(TEST_MEMORY_PATH, { recursive: true, force: true });
  } catch {}
}

main().catch(console.error);
