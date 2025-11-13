/**
 * Test Auto-Pattern Extraction
 *
 * Tests the new auto-extraction feature with atomize-news incidents
 */

import { loadAllIncidents, getMemoryStats } from './src/storage';
import { autoExtractPatternIfReady } from './src/pattern-extractor';
import { getConfig } from './src/config';

async function testAutoExtraction() {
  console.log('🧪 Testing Auto-Pattern Extraction\n');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Use atomize-news memory path directly
  const config = {
    storageMode: 'local' as const,
    memoryPath: '/Users/tyroneross/Desktop/Git Folder/atomize-news/.claude/memory',
    autoMine: false,
    defaultSimilarityThreshold: 0.7,
    defaultMaxResults: 5
  };

  console.log('📊 Memory Statistics (Before):');
  const statsBefore = await getMemoryStats(config);
  console.log(`   Total incidents: ${statsBefore.total_incidents}`);
  console.log(`   Total patterns: ${statsBefore.total_patterns}\n`);

  // Load all incidents
  const incidents = await loadAllIncidents(config);
  console.log(`📚 Loaded ${incidents.length} incidents from atomize-news\n`);

  // Group by category to show what we have
  const categories = incidents.reduce((acc, inc) => {
    const cat = inc.root_cause.category;
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  console.log('📋 Incidents by category:');
  Object.entries(categories)
    .sort((a, b) => b[1] - a[1])
    .forEach(([cat, count]) => {
      console.log(`   ${cat}: ${count} incidents`);
    });
  console.log('');

  // Try auto-extraction for each incident
  console.log('🔍 Testing auto-extraction for each category...\n');

  let patternsExtracted = 0;
  const processedCategories = new Set<string>();

  for (const incident of incidents) {
    const category = incident.root_cause.category;

    // Skip if already processed this category
    if (processedCategories.has(category)) {
      continue;
    }

    processedCategories.add(category);

    console.log(`\n🧩 Testing category: ${category}`);

    // Get category info
    const categoryIncidents = incidents.filter(i =>
      i.root_cause.category === category &&
      i.root_cause.confidence >= 0.7 &&
      !i.patternized
    );

    console.log(`   Available incidents: ${categoryIncidents.length} (confidence >=0.7, not patternized)`);

    const pattern = await autoExtractPatternIfReady(incident, {
      minSimilar: 3,
      minQuality: 0.20, // Very low threshold for testing (20%)
      config
    });

    if (pattern) {
      patternsExtracted++;
      console.log(`   ✅ Pattern extracted!`);
      console.log(`   Name: ${pattern.name}`);
      console.log(`   ID: ${pattern.pattern_id}`);
      console.log(`   Incidents: ${pattern.usage_history.total_uses}`);
      console.log(`   Success rate: ${(pattern.success_rate * 100).toFixed(0)}%`);
      console.log(`   Tags: [${pattern.tags.slice(0, 5).join(', ')}]`);
    } else if (categoryIncidents.length < 3) {
      console.log(`   ⏭️  Not enough incidents (${categoryIncidents.length} found, need 3+)`);
    } else {
      console.log(`   ❌ Quality score too low or pattern already exists`);
    }
  }

  // Show final statistics
  console.log('\n\n📊 Final Statistics:');
  const statsAfter = await getMemoryStats(config);
  console.log(`   Patterns extracted: ${patternsExtracted}`);
  console.log(`   Total patterns in memory: ${statsAfter.total_patterns}`);
  console.log(`   Total incidents: ${statsAfter.total_incidents}`);

  console.log('\n✅ Test complete!\n');
}

testAutoExtraction().catch(console.error);
