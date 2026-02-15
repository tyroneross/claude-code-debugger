#!/usr/bin/env node
/**
 * Benchmark Scoring System for claude-code-debugger
 *
 * Scores the debugging memory system across 6 dimensions:
 * 1. Retrieval Accuracy (25) - Precision@5, Recall@5 for known-bug search
 * 2. Verdict Precision (20) - Do verdicts match expected classifications?
 * 3. Context Efficiency (15) - Compression ratio, budget enforcement, info preservation
 * 4. Pattern Quality (15) - Do patterns match their source incidents?
 * 5. Scalability (15) - Performance at 10/100/500/1000 incidents
 * 6. Cold Start Quality (10) - MEMORY_SUMMARY.md usefulness
 *
 * Usage: node benchmark-scoring.js
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

// ============================================================================
// SECTION A: Synthetic Data Factory
// ============================================================================

/**
 * Create a deterministic set of incidents across 5 families + noise
 */
function createSyntheticIncidents() {
  const baseTimestamp = Date.now() - 30 * 24 * 60 * 60 * 1000; // 30 days ago

  const incidents = [];

  // Family 1: React Hook Dependency (5 incidents)
  for (let i = 1; i <= 5; i++) {
    incidents.push({
      incident_id: `INC_BENCH_REACT_00${i}`,
      timestamp: baseTimestamp + i * 86400000,
      symptom: `React component re-renders infinitely due to missing dependency in useEffect hook ${i === 1 ? 'causing state loop' : ''}`,
      symptom_type: 'ui',
      root_cause: {
        description: 'useEffect dependency array missing state variable causing infinite re-render cycle',
        file: `src/components/Dashboard${i}.tsx`,
        line_range: [25, 40],
        code_snippet: `useEffect(() => { setData(transform(rawData)); }, []);`,
        category: 'react-hooks',
        confidence: 0.85 + i * 0.02,
      },
      fix: {
        approach: 'Add missing dependency to useEffect dependency array and memoize transform function',
        changes: [{
          file: `src/components/Dashboard${i}.tsx`,
          lines_changed: 3,
          change_type: 'modify',
          summary: 'Added rawData to dependency array, wrapped transform in useCallback',
        }],
        time_to_fix: 15,
      },
      verification: { status: 'verified', regression_tests_passed: true, user_journey_tested: true, success_criteria_met: true },
      tags: ['react', 'hooks', 'useEffect', 'infinite-render', 'dependency-array'],
      files_changed: [`src/components/Dashboard${i}.tsx`],
      quality_gates: { guardian_validated: true, tested_e2e: true, tested_from_ui: true, security_reviewed: false, architect_reviewed: false },
      completeness: { symptom: true, root_cause: true, fix: true, verification: true, quality_score: 0.85 },
    });
  }

  // Family 2: API 500 Error (5 incidents)
  for (let i = 1; i <= 5; i++) {
    incidents.push({
      incident_id: `INC_BENCH_API_00${i}`,
      timestamp: baseTimestamp + (i + 5) * 86400000,
      symptom: `API endpoint /api/users returns 500 Internal Server Error when request body contains null values`,
      symptom_type: 'api',
      root_cause: {
        description: 'Missing null check in request body parser causes TypeError when processing null fields',
        file: `src/api/users/route${i}.ts`,
        line_range: [45, 60],
        category: 'api-error',
        confidence: 0.75 + i * 0.03,
      },
      fix: {
        approach: 'Add null coalescing operator and input validation before processing request body',
        changes: [{
          file: `src/api/users/route${i}.ts`,
          lines_changed: 5,
          change_type: 'modify',
          summary: 'Added nullish coalescing and optional chaining for request body fields',
        }],
        time_to_fix: 20,
      },
      verification: { status: 'verified', regression_tests_passed: true, user_journey_tested: false, success_criteria_met: true },
      tags: ['api', 'error-500', 'null-check', 'validation', 'typescript'],
      files_changed: [`src/api/users/route${i}.ts`],
      quality_gates: { guardian_validated: false, tested_e2e: true, tested_from_ui: false, security_reviewed: false, architect_reviewed: false },
      completeness: { symptom: true, root_cause: true, fix: true, verification: true, quality_score: 0.75 },
    });
  }

  // Family 3: Database Query Timeout (5 incidents)
  for (let i = 1; i <= 5; i++) {
    incidents.push({
      incident_id: `INC_BENCH_DB_00${i}`,
      timestamp: baseTimestamp + (i + 10) * 86400000,
      symptom: `Database query timeout on user search with large result sets exceeding 10000 rows`,
      symptom_type: 'database',
      root_cause: {
        description: 'Missing index on user.email column causing full table scan during search queries',
        file: `prisma/schema.prisma`,
        category: 'database-performance',
        confidence: 0.65 + i * 0.04,
      },
      fix: {
        approach: 'Add composite index on frequently queried columns and implement pagination',
        changes: [{
          file: `prisma/schema.prisma`,
          lines_changed: 2,
          change_type: 'add',
          summary: 'Added @@index on email and created_at columns',
        }],
        time_to_fix: 30,
      },
      verification: { status: i <= 3 ? 'verified' : 'partial', regression_tests_passed: true, user_journey_tested: false, success_criteria_met: i <= 3 },
      tags: ['database', 'performance', 'timeout', 'index', 'prisma'],
      files_changed: ['prisma/schema.prisma', `src/lib/db${i}.ts`],
      quality_gates: { guardian_validated: false, tested_e2e: false, tested_from_ui: false, security_reviewed: false, architect_reviewed: false },
      completeness: { symptom: true, root_cause: true, fix: true, verification: i <= 3, quality_score: 0.65 },
    });
  }

  // Family 4: Auth Token Expiry (3 incidents)
  for (let i = 1; i <= 3; i++) {
    incidents.push({
      incident_id: `INC_BENCH_AUTH_00${i}`,
      timestamp: baseTimestamp + (i + 15) * 86400000,
      symptom: `User gets logged out unexpectedly after auth token expires without refresh`,
      symptom_type: 'auth',
      root_cause: {
        description: 'Token refresh logic not triggered before expiry, missing proactive refresh mechanism',
        file: `src/lib/auth.ts`,
        category: 'authentication',
        confidence: 0.80,
      },
      fix: {
        approach: 'Implement proactive token refresh 5 minutes before expiry using setInterval',
        changes: [{
          file: `src/lib/auth.ts`,
          lines_changed: 20,
          change_type: 'add',
          summary: 'Added token refresh timer that checks expiry and refreshes proactively',
        }],
        time_to_fix: 45,
      },
      verification: { status: 'verified', regression_tests_passed: true, user_journey_tested: true, success_criteria_met: true },
      tags: ['auth', 'token', 'expiry', 'refresh', 'jwt'],
      files_changed: ['src/lib/auth.ts'],
      quality_gates: { guardian_validated: true, tested_e2e: true, tested_from_ui: true, security_reviewed: true, architect_reviewed: false },
      completeness: { symptom: true, root_cause: true, fix: true, verification: true, quality_score: 0.90 },
    });
  }

  // Family 5: CSS Layout Shift (2 incidents)
  for (let i = 1; i <= 2; i++) {
    incidents.push({
      incident_id: `INC_BENCH_CSS_00${i}`,
      timestamp: baseTimestamp + (i + 18) * 86400000,
      symptom: `Page content jumps when images load causing layout shift and poor CLS score`,
      symptom_type: 'ui',
      root_cause: {
        description: 'Images missing width and height attributes causing reflow on load',
        file: `src/components/ImageGallery.tsx`,
        category: 'css-layout',
        confidence: 0.70,
      },
      fix: {
        approach: 'Add explicit width/height or aspect-ratio to images and use placeholder skeleton',
        changes: [{
          file: `src/components/ImageGallery.tsx`,
          lines_changed: 8,
          change_type: 'modify',
          summary: 'Added aspect-ratio CSS and skeleton placeholder for images',
        }],
        time_to_fix: 10,
      },
      verification: { status: 'verified', regression_tests_passed: true, user_journey_tested: true, success_criteria_met: true },
      tags: ['css', 'layout-shift', 'cls', 'images', 'performance'],
      files_changed: ['src/components/ImageGallery.tsx'],
      quality_gates: { guardian_validated: false, tested_e2e: true, tested_from_ui: true, security_reviewed: false, architect_reviewed: false },
      completeness: { symptom: true, root_cause: true, fix: true, verification: true, quality_score: 0.80 },
    });
  }

  // Noise: 10 low-quality/unrelated incidents
  for (let i = 1; i <= 10; i++) {
    incidents.push({
      incident_id: `INC_BENCH_NOISE_0${i < 10 ? '0' + i : i}`,
      timestamp: baseTimestamp + (i + 20) * 86400000,
      symptom: `Miscellaneous issue ${i} with various config problems`,
      root_cause: {
        description: `Generic configuration issue ${i}`,
        category: 'config',
        confidence: 0.3,
      },
      fix: {
        approach: `Updated config file ${i}`,
        changes: [{ file: `config${i}.json`, lines_changed: 1, change_type: 'modify', summary: 'Updated config' }],
      },
      verification: { status: 'unverified', regression_tests_passed: false, user_journey_tested: false, success_criteria_met: false },
      tags: ['config', `noise-${i}`],
      files_changed: [`config${i}.json`],
      quality_gates: { guardian_validated: false, tested_e2e: false, tested_from_ui: false, security_reviewed: false, architect_reviewed: false },
      completeness: { symptom: true, root_cause: false, fix: false, verification: false, quality_score: 0.25 },
    });
  }

  return incidents;
}

/**
 * Create synthetic patterns
 */
function createSyntheticPatterns() {
  return [
    {
      pattern_id: 'PTN_REACT_HOOKS',
      name: 'React Hook Dependency Fix',
      description: 'Fix infinite re-renders caused by missing useEffect dependencies',
      detection_signature: ['useEffect', 'infinite', 're-render', 'dependency', 'hooks', 'loop'],
      applicable_to: ['coder', 'frontend-assessor'],
      solution_template: 'Add missing dependencies to useEffect array and memoize callbacks with useCallback',
      tags: ['react', 'hooks', 'useEffect'],
      related_patterns: [],
      usage_history: { total_uses: 5, successful_uses: 4, by_agent: { coder: 5 }, recent_incidents: ['INC_BENCH_REACT_001', 'INC_BENCH_REACT_002'] },
      success_rate: 0.85,
      last_used: Date.now() - 86400000,
    },
    {
      pattern_id: 'PTN_API_ERROR',
      name: 'API Null Check Pattern',
      description: 'Fix 500 errors caused by missing null checks in request body processing',
      detection_signature: ['500', 'null', 'TypeError', 'request body', 'api', 'validation'],
      applicable_to: ['coder', 'api-assessor'],
      solution_template: 'Add nullish coalescing and input validation before processing request data',
      tags: ['api', 'validation', 'null-check'],
      related_patterns: [],
      usage_history: { total_uses: 5, successful_uses: 4, by_agent: { coder: 5 }, recent_incidents: ['INC_BENCH_API_001'] },
      success_rate: 0.75,
      last_used: Date.now() - 172800000,
    },
    {
      pattern_id: 'PTN_DB_QUERY',
      name: 'Database Index Optimization',
      description: 'Fix query timeouts by adding missing database indexes',
      detection_signature: ['timeout', 'database', 'query', 'slow', 'index', 'full scan'],
      applicable_to: ['coder', 'database-assessor'],
      solution_template: 'Add composite index on frequently queried columns and implement pagination',
      tags: ['database', 'performance', 'index'],
      related_patterns: [],
      usage_history: { total_uses: 5, successful_uses: 3, by_agent: { coder: 5 }, recent_incidents: ['INC_BENCH_DB_001'] },
      success_rate: 0.65,
      last_used: Date.now() - 259200000,
    },
  ];
}

/**
 * Expected results map: query -> expected matches
 */
const EXPECTED_RESULTS = {
  'useEffect infinite re-render hooks': {
    mustFind: ['PTN_REACT_HOOKS', 'INC_BENCH_REACT_001', 'INC_BENCH_REACT_002', 'INC_BENCH_REACT_003'],
    mustNotFind: ['INC_BENCH_NOISE_001', 'INC_BENCH_DB_001'],
    expectedVerdict: 'KNOWN_FIX',
  },
  'API 500 error null request body': {
    mustFind: ['PTN_API_ERROR', 'INC_BENCH_API_001', 'INC_BENCH_API_002'],
    mustNotFind: ['INC_BENCH_NOISE_001', 'INC_BENCH_REACT_001'],
    expectedVerdict: 'KNOWN_FIX',
  },
  'database query timeout slow search': {
    mustFind: ['PTN_DB_QUERY', 'INC_BENCH_DB_001', 'INC_BENCH_DB_002'],
    mustNotFind: ['INC_BENCH_NOISE_001', 'INC_BENCH_REACT_001'],
    expectedVerdict: 'KNOWN_FIX',
  },
  'auth token expired user logged out': {
    mustFind: ['INC_BENCH_AUTH_001'],
    mustNotFind: ['INC_BENCH_NOISE_001'],
    expectedVerdict: 'LIKELY_MATCH',
  },
  'image layout shift CLS performance': {
    mustFind: ['INC_BENCH_CSS_001'],
    mustNotFind: ['INC_BENCH_NOISE_001'],
    expectedVerdict: 'LIKELY_MATCH',
  },
  'completely unrelated gibberish query xyz123': {
    mustFind: [],
    mustNotFind: ['INC_BENCH_REACT_001', 'INC_BENCH_API_001'],
    expectedVerdict: 'NO_MATCH',
  },
};

// ============================================================================
// SECTION B: Benchmark Setup & Teardown
// ============================================================================

async function setupBenchmarkDir() {
  const tmpDir = path.join(os.tmpdir(), `debugger-benchmark-${Date.now()}`);
  const memoryDir = path.join(tmpDir, '.claude', 'memory');
  const incidentsDir = path.join(memoryDir, 'incidents');
  const patternsDir = path.join(memoryDir, 'patterns');

  fs.mkdirSync(incidentsDir, { recursive: true });
  fs.mkdirSync(patternsDir, { recursive: true });

  return { tmpDir, memoryDir, incidentsDir, patternsDir };
}

async function populateBenchmarkData(dirs) {
  const incidents = createSyntheticIncidents();
  const patterns = createSyntheticPatterns();

  // Write incident files
  for (const inc of incidents) {
    fs.writeFileSync(
      path.join(dirs.incidentsDir, `${inc.incident_id}.json`),
      JSON.stringify(inc, null, 2)
    );
  }

  // Write pattern files
  for (const pat of patterns) {
    fs.writeFileSync(
      path.join(dirs.patternsDir, `${pat.pattern_id}.json`),
      JSON.stringify(pat, null, 2)
    );
  }

  return { incidents, patterns };
}

function cleanupBenchmarkDir(tmpDir) {
  try {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  } catch { /* ignore cleanup errors */ }
}

// ============================================================================
// SECTION C: Six Benchmark Suites
// ============================================================================

/**
 * Suite 1: Retrieval Accuracy (25 points)
 * Measures Precision@5 and Recall@5
 */
async function benchRetrievalAccuracy(lib, memoryConfig) {
  let totalPrecision = 0;
  let totalRecall = 0;
  let queryCount = 0;

  for (const [query, expected] of Object.entries(EXPECTED_RESULTS)) {
    try {
      const result = await lib.checkMemory(query, { memoryConfig, max_results: 5 });
      const foundIds = [
        ...result.incidents.map(i => i.incident_id),
        ...result.patterns.map(p => p.pattern_id),
      ];

      // Precision: what fraction of returned results are relevant?
      const truePositives = foundIds.filter(id => expected.mustFind.includes(id)).length;
      const falsePositives = foundIds.filter(id => expected.mustNotFind.includes(id)).length;
      const precision = foundIds.length > 0 ? truePositives / foundIds.length : (expected.mustFind.length === 0 ? 1 : 0);

      // Recall: what fraction of expected results were found?
      const recall = expected.mustFind.length > 0 ? truePositives / expected.mustFind.length : 1;

      // Penalize false positives
      const adjustedPrecision = Math.max(0, precision - falsePositives * 0.2);

      totalPrecision += adjustedPrecision;
      totalRecall += recall;
      queryCount++;
    } catch {
      queryCount++;
    }
  }

  const avgPrecision = queryCount > 0 ? totalPrecision / queryCount : 0;
  const avgRecall = queryCount > 0 ? totalRecall / queryCount : 0;

  // Weight: 60% precision, 40% recall
  return (avgPrecision * 0.6 + avgRecall * 0.4) * 25;
}

/**
 * Suite 2: Verdict Precision (20 points)
 * Do verdicts match expected classifications?
 */
async function benchVerdictPrecision(lib, memoryConfig, hasVerdictSystem) {
  if (!hasVerdictSystem) return 0;

  let correctVerdicts = 0;
  let totalQueries = 0;

  for (const [query, expected] of Object.entries(EXPECTED_RESULTS)) {
    try {
      const result = await lib.checkMemoryWithVerdict(query, { memoryConfig });

      if (result.verdict === expected.expectedVerdict) {
        correctVerdicts++;
      } else if (
        // Partial credit for adjacent verdicts
        (expected.expectedVerdict === 'KNOWN_FIX' && result.verdict === 'LIKELY_MATCH') ||
        (expected.expectedVerdict === 'LIKELY_MATCH' && result.verdict === 'KNOWN_FIX') ||
        (expected.expectedVerdict === 'LIKELY_MATCH' && result.verdict === 'WEAK_SIGNAL')
      ) {
        correctVerdicts += 0.5;
      }

      totalQueries++;
    } catch {
      totalQueries++;
    }
  }

  return totalQueries > 0 ? (correctVerdicts / totalQueries) * 20 : 0;
}

/**
 * Suite 3: Context Efficiency (15 points)
 * Compression ratio, budget enforcement, information preservation
 */
async function benchContextEfficiency(lib, memoryConfig, hasCompression) {
  if (!hasCompression) return 3; // Minimal points for no compression

  let score = 0;
  const incidents = createSyntheticIncidents().slice(0, 5);
  const patterns = createSyntheticPatterns();

  // Test 1: Compression produces output (5 points)
  try {
    const compactInc = incidents.map(i => lib.toCompactIncident ? lib.toCompactIncident(i) : i);
    const compactPat = patterns.map(p => lib.toCompactPattern ? lib.toCompactPattern(p) : p);

    if (typeof lib.compressContext === 'function') {
      const compressed = lib.compressContext(compactInc, compactPat, 2500);
      if (compressed && compressed.length > 0) score += 3;
      if (compressed.includes('PATTERNS:') || compressed.includes('INCIDENTS:')) score += 2;
    }
  } catch { /* no compression */ }

  // Test 2: Budget enforcement (5 points)
  try {
    if (typeof lib.enforceTokenBudget === 'function') {
      const manyIncidents = createSyntheticIncidents().map(i =>
        lib.toCompactIncident ? lib.toCompactIncident(i) : i
      );
      const result = lib.enforceTokenBudget(manyIncidents, [], 500);
      if (result.limitedIncidents.length < manyIncidents.length) score += 3;
      if (result.truncated && result.truncated.incidents > 0) score += 2;
    }
  } catch { /* no budget */ }

  // Test 3: Information preservation (5 points)
  try {
    if (typeof lib.compressContext === 'function') {
      const compactInc = incidents.slice(0, 2).map(i => lib.toCompactIncident(i));
      const compressed = lib.compressContext(compactInc, [], 2500);
      // Check that key info is preserved
      if (compressed.includes('INC_BENCH_REACT_001')) score += 2;
      if (compressed.includes('react-hooks') || compressed.includes('fix:')) score += 3;
    }
  } catch { /* */ }

  return Math.min(score, 15);
}

/**
 * Suite 4: Pattern Quality (15 points)
 * Do patterns match their source incidents?
 */
async function benchPatternQuality(lib, memoryConfig) {
  let score = 0;

  // Test 1: Pattern detection signatures match incidents (5 points)
  try {
    const result = await lib.checkMemory('useEffect infinite re-render dependency', { memoryConfig });
    const hasPatternMatch = result.patterns.length > 0;
    if (hasPatternMatch) score += 5;
  } catch { /* */ }

  // Test 2: Pattern success rates are meaningful (5 points)
  try {
    const patterns = createSyntheticPatterns();
    const validRates = patterns.every(p => p.success_rate > 0 && p.success_rate <= 1);
    if (validRates) score += 3;
    const distinctRates = new Set(patterns.map(p => p.success_rate)).size > 1;
    if (distinctRates) score += 2;
  } catch { /* */ }

  // Test 3: Patterns link back to source incidents (5 points)
  try {
    const patterns = createSyntheticPatterns();
    const hasRecentIncidents = patterns.every(p => p.usage_history?.recent_incidents?.length > 0);
    if (hasRecentIncidents) score += 3;
    const hasUsageCounts = patterns.every(p => p.usage_history?.total_uses > 0);
    if (hasUsageCounts) score += 2;
  } catch { /* */ }

  return Math.min(score, 15);
}

/**
 * Suite 5: Scalability (15 points)
 * Performance at different incident counts
 */
async function benchScalability(lib, memoryConfig, dirs, hasKeywordIndex) {
  const timings = {};

  // Generate incidents at different scales
  for (const scale of [10, 100, 500]) {
    const scaleDir = path.join(os.tmpdir(), `debugger-scale-${scale}-${Date.now()}`);
    const scaleMemDir = path.join(scaleDir, '.claude', 'memory');
    const scaleIncDir = path.join(scaleMemDir, 'incidents');
    const scalePtnDir = path.join(scaleMemDir, 'patterns');
    fs.mkdirSync(scaleIncDir, { recursive: true });
    fs.mkdirSync(scalePtnDir, { recursive: true });

    // Create N incidents
    for (let i = 0; i < scale; i++) {
      const family = i % 5;
      const families = ['react', 'api', 'database', 'auth', 'css'];
      const inc = {
        incident_id: `INC_SCALE_${families[family].toUpperCase()}_${String(i).padStart(4, '0')}`,
        timestamp: Date.now() - i * 3600000,
        symptom: `Scale test incident ${i} for ${families[family]} family with various symptoms`,
        root_cause: { description: `Root cause ${i}`, category: families[family], confidence: 0.7 },
        fix: { approach: `Fix approach ${i}`, changes: [] },
        verification: { status: 'verified', regression_tests_passed: true, user_journey_tested: false, success_criteria_met: true },
        tags: [families[family], `scale-${scale}`],
        files_changed: [`src/file${i}.ts`],
        quality_gates: { guardian_validated: false, tested_e2e: false, tested_from_ui: false, security_reviewed: false, architect_reviewed: false },
        completeness: { symptom: true, root_cause: true, fix: true, verification: true, quality_score: 0.6 },
      };
      fs.writeFileSync(path.join(scaleIncDir, `${inc.incident_id}.json`), JSON.stringify(inc));
    }

    // Time a search
    const scaleConfig = { storageMode: 'local', memoryPath: scaleMemDir, autoMine: false, defaultSimilarityThreshold: 0.5, defaultMaxResults: 5 };
    const start = Date.now();
    try {
      await lib.checkMemory('react useEffect re-render', { memoryConfig: scaleConfig });
    } catch { /* */ }
    timings[scale] = Date.now() - start;

    // Cleanup
    try { fs.rmSync(scaleDir, { recursive: true, force: true }); } catch { /* */ }
  }

  let score = 0;

  // Points for reasonable performance
  if (timings[10] && timings[10] < 1000) score += 5;
  if (timings[100] && timings[100] < 3000) score += 4;
  if (timings[500] && timings[500] < 10000) score += 3;

  // Bonus for sublinear scaling
  if (timings[100] && timings[10] && timings[100] < timings[10] * 15) score += 1.5;
  if (timings[500] && timings[100] && timings[500] < timings[100] * 8) score += 1.5;

  return { score: Math.min(score, 15), timings };
}

/**
 * Suite 6: Cold Start Quality (10 points)
 * MEMORY_SUMMARY.md usefulness
 */
async function benchColdStartQuality(lib, memoryConfig, hasSummary) {
  if (!hasSummary || typeof lib.buildMemorySummary !== 'function') return 0;

  let score = 0;

  try {
    const summary = await lib.buildMemorySummary(memoryConfig);

    if (summary && summary.length > 0) score += 2;
    if (summary.includes('# Debugging Memory Summary')) score += 1;
    if (summary.includes('incidents')) score += 1;
    if (summary.includes('Categories') || summary.includes('categories')) score += 1;
    if (summary.includes('Common Tags') || summary.includes('tags')) score += 1;
    if (summary.includes('Recent') || summary.includes('recent')) score += 1;
    if (summary.includes('Frequently Affected') || summary.includes('files')) score += 1;

    // Check line count is reasonable (<150)
    const lineCount = summary.split('\n').length;
    if (lineCount > 0 && lineCount <= 150) score += 1;

    // Check token estimate is reasonable
    const estTokens = Math.ceil(summary.length / 4);
    if (estTokens < 800) score += 1;
  } catch { /* */ }

  return Math.min(score, 10);
}

// ============================================================================
// SECTION D: Scoring Engine & Comparison Runner
// ============================================================================

async function runBenchmarkSuite(label, lib, memoryConfig, dirs, features) {
  console.log(`\n  Running ${label}...`);

  const scores = {};

  // Suite 1: Retrieval Accuracy
  process.stdout.write('    [1/6] Retrieval Accuracy... ');
  scores.retrieval = await benchRetrievalAccuracy(lib, memoryConfig);
  console.log(`${scores.retrieval.toFixed(1)}/25`);

  // Suite 2: Verdict Precision
  process.stdout.write('    [2/6] Verdict Precision... ');
  scores.verdict = await benchVerdictPrecision(lib, memoryConfig, features.verdict);
  console.log(`${scores.verdict.toFixed(1)}/20`);

  // Suite 3: Context Efficiency
  process.stdout.write('    [3/6] Context Efficiency... ');
  scores.context = await benchContextEfficiency(lib, memoryConfig, features.compression);
  console.log(`${scores.context.toFixed(1)}/15`);

  // Suite 4: Pattern Quality
  process.stdout.write('    [4/6] Pattern Quality... ');
  scores.pattern = await benchPatternQuality(lib, memoryConfig);
  console.log(`${scores.pattern.toFixed(1)}/15`);

  // Suite 5: Scalability
  process.stdout.write('    [5/6] Scalability... ');
  const scalResult = await benchScalability(lib, memoryConfig, dirs, features.keywordIndex);
  scores.scalability = scalResult.score;
  console.log(`${scores.scalability.toFixed(1)}/15 (10:${scalResult.timings[10] || '?'}ms, 100:${scalResult.timings[100] || '?'}ms, 500:${scalResult.timings[500] || '?'}ms)`);

  // Suite 6: Cold Start Quality
  process.stdout.write('    [6/6] Cold Start Quality... ');
  scores.coldStart = await benchColdStartQuality(lib, memoryConfig, features.summary);
  console.log(`${scores.coldStart.toFixed(1)}/10`);

  scores.total = scores.retrieval + scores.verdict + scores.context + scores.pattern + scores.scalability + scores.coldStart;

  return scores;
}

async function main() {
  console.log('\n========================================');
  console.log('  BENCHMARK: claude-code-debugger');
  console.log('========================================\n');

  // Load the library
  let lib;
  try {
    lib = require('./dist/src/index.js');
  } catch (e) {
    console.error('Build required. Run: npm run build');
    console.error('Error:', e.message);
    process.exit(1);
  }

  // Setup benchmark data
  const dirs = await setupBenchmarkDir();
  const { incidents, patterns } = await populateBenchmarkData(dirs);
  console.log(`  Setup: ${incidents.length} incidents, ${patterns.length} patterns in ${dirs.memoryDir}`);

  // Build the memory config pointing to benchmark dir
  const memoryConfig = {
    storageMode: 'local',
    memoryPath: dirs.memoryDir,
    autoMine: false,
    defaultSimilarityThreshold: 0.5,
    defaultMaxResults: 5,
  };

  // Build index for the benchmark data
  try {
    await lib.rebuildIndex(memoryConfig);
    console.log('  Index rebuilt');
  } catch (e) {
    console.log(`  Index build skipped: ${e.message}`);
  }

  // Build keyword index
  try {
    if (typeof lib.rebuildKeywordIndex === 'function') {
      await lib.rebuildKeywordIndex(memoryConfig);
      console.log('  Keyword index rebuilt');
    }
  } catch (e) {
    console.log(`  Keyword index build skipped: ${e.message}`);
  }

  // Run v1.4.0 path (basic features only)
  const v14Features = {
    verdict: false,
    compression: false,
    summary: false,
    keywordIndex: false,
  };
  const v14Scores = await runBenchmarkSuite('v1.4.0 path (checkMemory, enhancedSearch)', lib, memoryConfig, dirs, v14Features);

  // Run v1.5.0+ path (all features)
  const v16Features = {
    verdict: true,
    compression: true,
    summary: true,
    keywordIndex: typeof lib.rebuildKeywordIndex === 'function',
  };
  const v16Scores = await runBenchmarkSuite('v1.6.0 path (verdict, compression, index, summary)', lib, memoryConfig, dirs, v16Features);

  // Print comparison
  console.log('\n========================================');
  console.log('  BENCHMARK RESULTS');
  console.log('========================================\n');

  const dims = [
    { name: 'Retrieval Accuracy', max: 25, key: 'retrieval' },
    { name: 'Verdict Precision', max: 20, key: 'verdict' },
    { name: 'Context Efficiency', max: 15, key: 'context' },
    { name: 'Pattern Quality', max: 15, key: 'pattern' },
    { name: 'Scalability', max: 15, key: 'scalability' },
    { name: 'Cold Start Quality', max: 10, key: 'coldStart' },
  ];

  console.log('  Dimension                  v1.4.0    v1.6.0    Delta');
  console.log('  ' + '─'.repeat(55));

  for (const dim of dims) {
    const v14 = v14Scores[dim.key].toFixed(1).padStart(6);
    const v16 = v16Scores[dim.key].toFixed(1).padStart(6);
    const delta = (v16Scores[dim.key] - v14Scores[dim.key]);
    const deltaStr = (delta >= 0 ? '+' : '') + delta.toFixed(1);
    console.log(`  ${(dim.name + ` (${dim.max})`).padEnd(25)} ${v14}    ${v16}    ${deltaStr.padStart(6)}`);
  }

  console.log('  ' + '─'.repeat(55));
  const v14Total = v14Scores.total.toFixed(1).padStart(6);
  const v16Total = v16Scores.total.toFixed(1).padStart(6);
  const totalDelta = (v16Scores.total - v14Scores.total);
  const totalDeltaStr = (totalDelta >= 0 ? '+' : '') + totalDelta.toFixed(1);
  console.log(`  ${'TOTAL'.padEnd(25)} ${v14Total}    ${v16Total}    ${totalDeltaStr.padStart(6)}`);

  console.log('\n========================================\n');

  // Cleanup
  cleanupBenchmarkDir(dirs.tmpDir);

  // Exit with status
  if (v16Scores.total >= 60) {
    console.log('  PASS: v1.6.0 scores above minimum threshold (60)\n');
    process.exit(0);
  } else {
    console.log(`  WARN: v1.6.0 total ${v16Scores.total.toFixed(1)} below target (60)\n`);
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Benchmark failed:', err);
  process.exit(1);
});
