/**
 * Test Auto-Extraction Workflow
 *
 * Simulates the real-world workflow of storing incidents and auto-extracting patterns
 */

import { storeDebugIncident } from './src/debug-wrapper';
import { debugWithMemory } from './src/debug-wrapper';
import { getMemoryStats } from './src/storage';
import type { Incident } from './src/types';

async function testWorkflow() {
  console.log('🧪 Testing Auto-Extraction Workflow\n');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Step 1: Start a debug session
  console.log('Step 1: Starting debug session...\n');
  const debugContext = await debugWithMemory('React component infinite re-renders due to useEffect dependencies');

  console.log(`\nSession ID: ${debugContext.context_used.session_id}\n`);

  // Step 2: Simulate debugging and finding the fix
  console.log('Step 2: Debugging and fixing the issue...\n');

  // Simulate the incident data (4th react-hooks incident to trigger pattern extraction)
  const incidentData: Partial<Incident> = {
    root_cause: {
      description: 'Missing dependency in useEffect hook causing infinite loop. Component re-renders trigger useEffect which updates state, causing more re-renders.',
      file: 'components/TrendingTopics.tsx',
      line_range: [45, 55],
      code_snippet: `useEffect(() => {
  fetchData();
}, []); // Missing fetchData dependency`,
      category: 'react-hooks',
      confidence: 0.95
    },
    fix: {
      approach: 'Add missing dependency to useEffect dependency array',
      changes: [
        {
          file: 'components/TrendingTopics.tsx',
          lines_changed: 1,
          change_type: 'modify',
          summary: 'Added fetchData to useEffect dependencies'
        }
      ],
      time_to_fix: 5
    },
    verification: {
      status: 'verified',
      regression_tests_passed: true,
      user_journey_tested: true,
      success_criteria_met: true,
      tests_run: ['components/TrendingTopics.test.tsx']
    },
    tags: ['react', 'hooks', 'useEffect', 'dependencies', 'infinite-loop'],
    files_changed: ['components/TrendingTopics.tsx'],
    agent_used: 'coder',
    quality_gates: {
      guardian_validated: true,
      tested_e2e: true,
      tested_from_ui: true,
      security_reviewed: false,
      architect_reviewed: false
    }
  };

  // Step 3: Store the incident (this should trigger auto-extraction)
  console.log('Step 3: Storing incident (auto-extraction will run)...\n');

  const result = await storeDebugIncident(debugContext.context_used.session_id, incidentData);

  console.log(`\n✅ Incident stored: ${result.incident_id}`);
  console.log(`   Verified: ${result.verified}`);

  // Step 4: Check final statistics
  console.log('\n\nStep 4: Final Memory Statistics...\n');
  const stats = await getMemoryStats();
  console.log(`   Total incidents: ${stats.total_incidents}`);
  console.log(`   Total patterns: ${stats.total_patterns}`);

  console.log('\n✅ Workflow test complete!\n');
}

testWorkflow().catch(console.error);
