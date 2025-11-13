/**
 * Test Enhanced Search
 *
 * Validates multi-strategy search: exact → tag → fuzzy → category
 */

import { enhancedSearch, storeIncident, generateIncidentId } from './src/index';
import type { Incident } from './src/index';

async function createTestIncidents(): Promise<void> {
  console.log('Creating test incidents...\n');

  const incidents: Partial<Incident>[] = [
    {
      incident_id: generateIncidentId(),
      timestamp: Date.now(),
      symptom: 'Sentry logger not working properly',
      root_cause: {
        description: 'Logger initialization failed due to missing API key',
        category: 'config',
        confidence: 0.9,
        code_snippet: 'const logger = new Sentry({ apiKey: undefined });',
        file: 'lib/logger.ts',
        line_range: [10, 15]
      },
      fix: {
        approach: 'Added environment variable validation at startup',
        changes: [
          {
            file: 'lib/logger.ts',
            lines_changed: 5,
            change_type: 'modify',
            summary: 'Added API key validation'
          }
        ],
        time_to_fix: 20
      },
      verification: {
        status: 'verified',
        regression_tests_passed: true,
        user_journey_tested: true,
        success_criteria_met: true
      },
      tags: ['logger', 'sentry', 'config', 'initialization'],
      files_changed: ['lib/logger.ts'],
      agent_used: 'coder'
    },
    {
      incident_id: generateIncidentId(),
      timestamp: Date.now() - 1000,
      symptom: 'API endpoint returns 500 error',
      root_cause: {
        description: 'Unhandled promise rejection in database query',
        category: 'api',
        confidence: 0.95,
        code_snippet: 'const result = await db.query(sql);',
        file: 'app/api/users/route.ts',
        line_range: [25, 30]
      },
      fix: {
        approach: 'Wrapped database calls in try-catch with proper error handling',
        changes: [
          {
            file: 'app/api/users/route.ts',
            lines_changed: 8,
            change_type: 'modify',
            summary: 'Added error handling'
          }
        ],
        time_to_fix: 15
      },
      verification: {
        status: 'verified',
        regression_tests_passed: true,
        user_journey_tested: true,
        success_criteria_met: true
      },
      tags: ['api', 'database', 'error-handling', 'promise'],
      files_changed: ['app/api/users/route.ts'],
      agent_used: 'coder'
    },
    {
      incident_id: generateIncidentId(),
      timestamp: Date.now() - 2000,
      symptom: 'Logger throwing errors in production',
      root_cause: {
        description: 'Missing error boundary around logger calls',
        category: 'error-handling',
        confidence: 0.85,
        code_snippet: 'logger.error(new Error("test"));',
        file: 'lib/logger.ts',
        line_range: [40, 45]
      },
      fix: {
        approach: 'Added try-catch wrapper around all logger methods',
        changes: [
          {
            file: 'lib/logger.ts',
            lines_changed: 12,
            change_type: 'modify',
            summary: 'Added error boundaries'
          }
        ],
        time_to_fix: 25
      },
      verification: {
        status: 'verified',
        regression_tests_passed: true,
        user_journey_tested: false,
        success_criteria_met: true
      },
      tags: ['logger', 'error-handling', 'production'],
      files_changed: ['lib/logger.ts'],
      agent_used: 'coder'
    }
  ];

  for (const incident of incidents) {
    await storeIncident(incident as Incident, { validate_schema: false });
  }

  console.log(`✅ Created ${incidents.length} test incidents\n`);
}

async function testSearch(query: string): Promise<void> {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`SEARCH: "${query}"`);
  console.log('='.repeat(60));

  const results = await enhancedSearch(query, {
    threshold: 0.5,
    maxResults: 10
  });

  if (results.length === 0) {
    console.log('❌ No results found\n');
    return;
  }

  console.log(`\n✅ Found ${results.length} results:\n`);

  results.forEach((result, i) => {
    console.log(`${i + 1}. [${result.matchType.toUpperCase()}] Score: ${result.score.toFixed(2)}`);
    console.log(`   Symptom: ${result.incident.symptom}`);
    console.log(`   Tags: ${result.incident.tags.join(', ')}`);
    console.log(`   Highlights: ${result.highlights.join(' | ')}`);
    console.log('');
  });
}

async function runTests(): Promise<void> {
  console.log('\n🧪 Testing Enhanced Search\n');
  console.log('='.repeat(60));

  // Create test data
  await createTestIncidents();

  // Test 1: Exact match
  await testSearch('logger not working');

  // Test 2: Tag match
  await testSearch('API error');

  // Test 3: Fuzzy match
  await testSearch('logr isnt workng');

  // Test 4: Category match (should find config-related issues)
  await testSearch('configuration problem');

  console.log('\n✅ All tests complete!\n');
}

runTests().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});
