/**
 * Demo: Enhanced Search
 *
 * Shows how to use the multi-strategy search API
 */

import { enhancedSearch } from './src/index';

async function demo() {
  console.log('\n📚 Enhanced Search Demo\n');
  console.log('Multi-strategy search: exact → tag → fuzzy → category\n');

  // Example 1: Search with defaults
  console.log('Example 1: Basic search');
  console.log('='.repeat(60));
  const results1 = await enhancedSearch('logger not working');

  console.log(`Found ${results1.length} results`);
  results1.forEach((r, i) => {
    console.log(`${i + 1}. [${r.matchType}] ${r.incident.symptom} (${r.score.toFixed(2)})`);
  });

  console.log('\n');

  // Example 2: Adjust threshold
  console.log('Example 2: Higher threshold (more precise)');
  console.log('='.repeat(60));
  const results2 = await enhancedSearch('API error', {
    threshold: 0.8,
    maxResults: 5
  });

  console.log(`Found ${results2.length} results`);
  results2.forEach((r, i) => {
    console.log(`${i + 1}. [${r.matchType}] ${r.incident.symptom} (${r.score.toFixed(2)})`);
  });

  console.log('\n');

  // Example 3: Show match highlights
  console.log('Example 3: View highlights');
  console.log('='.repeat(60));
  const results3 = await enhancedSearch('configuration problem');

  results3.forEach((r, i) => {
    console.log(`${i + 1}. [${r.matchType}] Score: ${r.score.toFixed(2)}`);
    console.log(`   Symptom: ${r.incident.symptom}`);
    console.log(`   Highlights: ${r.highlights.join(', ')}`);
    console.log('');
  });
}

demo().catch(console.error);
