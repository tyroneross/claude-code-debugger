#!/usr/bin/env ts-node
/**
 * Test script for Interactive Verification feature
 *
 * This demonstrates the interactive prompts for building high-quality incidents.
 */

import { storeIncident, generateIncidentId, calculateQualityScore } from './src';

async function testInteractiveMode() {
  console.log('🧪 Testing Interactive Verification\n');

  // Create a minimal incident
  const minimalIncident = {
    incident_id: generateIncidentId(),
    timestamp: Date.now(),
    symptom: 'Search results showing 0 items but logs show data was fetched',
    root_cause: {
      description: 'React component not re-rendering after state update',
      category: 'react-hooks',
      confidence: 0.85
    },
    fix: {
      approach: 'Added useEffect dependency array',
      changes: []
    },
    verification: {
      status: 'partial' as const,
      regression_tests_passed: false,
      user_journey_tested: false,
      success_criteria_met: false
    },
    tags: ['react'],
    files_changed: [],
    quality_gates: {
      guardian_validated: false,
      tested_e2e: false,
      tested_from_ui: false,
      security_reviewed: false,
      architect_reviewed: false
    },
    completeness: {
      symptom: true,
      root_cause: false,
      fix: false,
      verification: false,
      quality_score: 0
    }
  };

  console.log('📋 Initial incident quality score:', calculateQualityScore(minimalIncident));

  try {
    // Store with interactive mode enabled
    const result = await storeIncident(minimalIncident, {
      interactive: true,
      validate_schema: true
    });

    console.log('\n✅ Success!');
    console.log('Incident ID:', result.incident_id);
    console.log('File path:', result.file_path);
  } catch (error) {
    if (error instanceof Error && error.message === 'Incident storage cancelled by user') {
      console.log('\n❌ User cancelled storage');
    } else {
      console.error('\n❌ Error:', error);
    }
  }
}

// Run the test
testInteractiveMode().catch(console.error);
