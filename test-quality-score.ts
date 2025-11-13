#!/usr/bin/env ts-node
/**
 * Test quality score calculation
 */

import { calculateQualityScore, generateQualityFeedback } from './src';
import type { Incident } from './src';

// Test cases with different quality levels
const testCases: Array<{ name: string; incident: Partial<Incident>; expectedRange: [number, number] }> = [
  {
    name: 'Minimal incident (poor quality)',
    incident: {
      symptom: 'Error',
      root_cause: {
        description: 'Bug',
        category: 'unknown',
        confidence: 0.3
      },
      fix: {
        approach: 'Fixed it',
        changes: []
      },
      verification: {
        status: 'unverified',
        regression_tests_passed: false,
        user_journey_tested: false,
        success_criteria_met: false
      },
      tags: []
    },
    expectedRange: [0.0, 0.3]
  },
  {
    name: 'Fair incident (partial details)',
    incident: {
      symptom: 'Search results not showing data even though API returned items',
      root_cause: {
        description: 'React component was not re-rendering after state update because useEffect dependency array was missing',
        category: 'react-hooks',
        confidence: 0.75
      },
      fix: {
        approach: 'Added missing dependency to useEffect array',
        changes: [
          {
            file: 'components/SearchResults.tsx',
            lines_changed: 3,
            change_type: 'modify',
            summary: 'Added data to useEffect deps'
          }
        ]
      },
      verification: {
        status: 'partial',
        regression_tests_passed: true,
        user_journey_tested: false,
        success_criteria_met: true
      },
      tags: ['react', 'hooks']
    },
    expectedRange: [0.5, 0.7]
  },
  {
    name: 'Excellent incident (complete details)',
    incident: {
      symptom: 'Search results component displays "No results" message despite API returning valid data with items. Console logs show data is fetched successfully but UI does not update.',
      root_cause: {
        description: 'The SearchResults component was using useEffect to process search data, but the dependency array did not include the "data" prop. This caused the effect to only run on mount, not when new search results arrived. When users performed a search, the API would return results and update the parent state, but the SearchResults component would not re-process the data because the effect wasn\'t triggered.',
        category: 'react-hooks',
        confidence: 0.95,
        file: 'components/SearchResults.tsx',
        line_range: [45, 52]
      },
      fix: {
        approach: 'Added the "data" prop to the useEffect dependency array to ensure the effect runs whenever new search results arrive. Also added a null check before processing to handle edge cases.',
        changes: [
          {
            file: 'components/SearchResults.tsx',
            lines_changed: 5,
            change_type: 'modify',
            summary: 'Added data to useEffect dependency array and null guard'
          },
          {
            file: 'components/SearchResults.test.tsx',
            lines_changed: 12,
            change_type: 'add',
            summary: 'Added test for re-rendering on data change'
          }
        ],
        time_to_fix: 15
      },
      verification: {
        status: 'verified',
        regression_tests_passed: true,
        user_journey_tested: true,
        success_criteria_met: true,
        tests_run: ['SearchResults.test.tsx', 'SearchFlow.e2e.tsx']
      },
      tags: ['react', 'hooks', 'useEffect', 'infinite-loop', 'rendering'],
      files_changed: ['components/SearchResults.tsx', 'components/SearchResults.test.tsx']
    },
    expectedRange: [0.85, 1.0]
  }
];

console.log('🧪 Testing Quality Score Calculation\n');

for (const testCase of testCases) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Test: ${testCase.name}`);
  console.log(`${'='.repeat(60)}`);

  const score = calculateQualityScore(testCase.incident);
  const percentage = (score * 100).toFixed(0);

  console.log(`\nCalculated Score: ${percentage}%`);
  console.log(`Expected Range: ${(testCase.expectedRange[0] * 100).toFixed(0)}% - ${(testCase.expectedRange[1] * 100).toFixed(0)}%`);

  // Check if score is in expected range
  const inRange = score >= testCase.expectedRange[0] && score <= testCase.expectedRange[1];
  console.log(`Result: ${inRange ? '✅ PASS' : '❌ FAIL'}`);

  // Generate feedback
  const feedback = generateQualityFeedback(testCase.incident as Incident);
  console.log(`\nFeedback:\n${feedback}`);
}

console.log('\n\n' + '='.repeat(60));
console.log('Quality Score Rubric:');
console.log('='.repeat(60));
console.log('Root Cause Analysis: 30%');
console.log('  - Description (50+ chars): 10%');
console.log('  - Description (100+ chars): +5%');
console.log('  - Confidence (≥0.7): 10%');
console.log('  - Confidence (≥0.9): +5%');
console.log('\nFix Details: 30%');
console.log('  - Approach documented (20+ chars): 15%');
console.log('  - Changes documented (≥1): 10%');
console.log('  - Changes documented (≥3): +5%');
console.log('\nVerification: 20%');
console.log('  - Fully verified: 15%');
console.log('  - Partially verified: 8%');
console.log('  - Regression tests: 2.5%');
console.log('  - User journey tested: 2.5%');
console.log('\nDocumentation: 20%');
console.log('  - Tags (≥2): 5%');
console.log('  - Tags (≥3): +5%');
console.log('  - Tags (≥5): +5%');
console.log('  - Prevention advice: 5%');
