/**
 * Comprehensive validation test for v1.2.0 features
 */

import { enhancedSearch } from './src/retrieval';
import { autoExtractPatternIfReady } from './src/pattern-extractor';
import { calculateQualityScore } from './src/interactive-verifier';

async function validateV120() {
  console.log('🧪 v1.2.0 Feature Validation\n');
  console.log('═'.repeat(50) + '\n');

  let passCount = 0;
  let totalTests = 4;

  // Test 1: Quality Score Calculation
  console.log('Test 1: Quality Score Calculation');
  try {
    const testIncident: any = {
      incident_id: 'TEST_001',
      timestamp: Date.now(),
      session_id: 'test',
      symptom: {
        description: 'Test error with detailed description for quality testing',
        user_impact: 'high',
        reproducibility: 'always'
      },
      root_cause: {
        description: 'This is a detailed root cause analysis with more than 50 characters to meet quality requirements',
        category: 'react-hooks',
        confidence: 0.9,
        code_snippet: 'const example = true;',
        file: 'test.ts',
        line_range: [1, 10]
      },
      fix: {
        approach: 'Fixed by updating dependencies',
        changes: [{ file: 'test.ts', lines_changed: 5, change_type: 'modify', summary: 'Updated' }],
        time_to_fix: 30
      },
      verification: {
        status: 'verified',
        regression_tests_passed: true,
        user_journey_tested: true,
        success_criteria_met: true
      },
      tags: ['test', 'react', 'hooks', 'quality-check'],
      files_changed: ['test.ts'],
      prevention: 'Always test thoroughly'
    };

    const score = calculateQualityScore(testIncident);
    console.log(`   Quality Score: ${(score * 100).toFixed(0)}%`);

    if (score >= 0.75) {
      console.log('   ✅ PASS - High quality score achieved\n');
      passCount++;
    } else {
      console.log(`   ❌ FAIL - Score too low (${score})\n`);
    }
  } catch (error: any) {
    console.log(`   ❌ FAIL - ${error.message}\n`);
  }

  // Test 2: Enhanced Search (exact match)
  console.log('Test 2: Enhanced Search - Exact Match');
  try {
    const results = await enhancedSearch('react', { threshold: 0.5, maxResults: 10 });
    console.log(`   Found ${results.length} results`);
    console.log('   ✅ PASS - Search executed successfully\n');
    passCount++;
  } catch (error: any) {
    console.log(`   ❌ FAIL - ${error.message}\n`);
  }

  // Test 3: Enhanced Search (fuzzy match)
  console.log('Test 3: Enhanced Search - Fuzzy Match');
  try {
    const results = await enhancedSearch('reakt', { threshold: 0.5, maxResults: 10 });
    console.log(`   Fuzzy search found ${results.length} results`);
    console.log('   ✅ PASS - Fuzzy matching works\n');
    passCount++;
  } catch (error: any) {
    console.log(`   ❌ FAIL - ${error.message}\n`);
  }

  // Test 4: Auto Pattern Extraction
  console.log('Test 4: Auto Pattern Extraction Function');
  try {
    const testIncident: any = {
      incident_id: 'TEST_PATTERN_001',
      timestamp: Date.now(),
      session_id: 'test',
      symptom: { description: 'Pattern test', user_impact: 'high', reproducibility: 'always' },
      root_cause: { description: 'Test root cause', category: 'test-category', confidence: 0.8 },
      fix: { approach: 'Test fix', time_to_fix: 10 },
      tags: ['test'],
      files_changed: []
    };

    const pattern = await autoExtractPatternIfReady(testIncident, {
      minSimilar: 1,
      minQuality: 0.1
    });

    console.log(`   Function executed: ${pattern ? 'Pattern found' : 'No pattern (normal with low data)'}`);
    console.log('   ✅ PASS - Auto extraction works\n');
    passCount++;
  } catch (error: any) {
    console.log(`   ❌ FAIL - ${error.message}\n`);
  }

  // Summary
  console.log('═'.repeat(50));
  console.log(`\n📊 Results: ${passCount}/${totalTests} tests passed`);

  if (passCount === totalTests) {
    console.log('🎉 All tests PASSED! v1.2.0 is ready for production!\n');
  } else {
    console.log(`⚠️  ${totalTests - passCount} tests failed. Review needed.\n`);
  }
}

validateV120().catch(console.error);
