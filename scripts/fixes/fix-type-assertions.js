#!/usr/bin/env node

/**
 * Fix misplaced type assertions in Supabase query chains
 *
 * Problem: Type assertions were placed in the middle of query chains instead of at the end
 * Solution: Move type assertions to after the LAST method in each chain
 */

const fs = require('fs');
const path = require('path');

// Files to fix (from TypeScript errors)
const filesToFix = [
  'lib/ai/chat-orchestrator.ts',
  'lib/ai/embedding/embedding-service.ts',
  'lib/ai/enrichment/enrichment-orchestrator.ts',
  'lib/ai/icp/learning-engine.ts',
  'lib/ai/scoring/ai-financial-scorer.ts',
  'lib/ai/scoring/bant-scorer.ts',
  'lib/ai/scoring/engagement-tracker.ts',
  'lib/ai/scoring/financial-health-scorer.ts',
  'lib/ai/scoring/lead-scoring-service.ts',
  'lib/ai/scoring/ollama-scoring-service.ts',
  'lib/analytics/opportunity-identifier.ts',
  'lib/analytics/trend-analyzer.ts',
  'lib/benchmarking/benchmark-service.ts',
  'lib/benchmarking/core/benchmark-engine.ts',
  'lib/benchmarking/industry/industry-comparison.ts',
  'lib/benchmarking/peers/peer-identifier.ts',
  'lib/chatspot/chat-service.ts',
  'lib/inngest/functions/execute-agent.ts',
  'lib/inngest/functions/generate-embedding.ts',
  'lib/integrations/crm/enrichment-service.ts',
  'lib/integrations/crm/smartsync-orchestrator.ts',
  'lib/knowledge-graph/extraction/entity-extractor.ts',
  'lib/knowledge-graph/integrations/teamplay-integration.ts',
  'lib/knowledge-graph/query/graph-query-engine.ts',
  'lib/notifications/notification-service.ts',
  'lib/opp-scan/scanning-engine.ts',
  'lib/opp-scan/scan-results-data.ts',
  'lib/opp-scan/services/database-similarity-search.ts',
  'lib/opp-scan/services/similar-company-use-case.ts',
  'lib/qualification/ai/qualification-insights.ts',
  'lib/qualification/checklists/checklist-engine.ts',
  'lib/qualification/notifications/qualification-notifications.ts',
  'lib/qualification/recycling/lead-recycling-engine.ts',
  'lib/qualification/routing/lead-routing-engine.ts',
  'lib/qualification/services/qualification-service.ts',
  'lib/research-gpt/repository/research-repository.ts',
  'lib/search/advanced-filter-service.ts',
  'lib/services/data-enrichment.ts',
  'lib/signals/buying-signal-detector.ts',
  'lib/signals/detectors/executive-change-detector.ts',
  'lib/signals/detectors/funding-signal-detector.ts',
  'lib/signals/detectors/job-posting-analyzer.ts',
  'lib/signals/detectors/technology-adoption-detector.ts',
  'lib/signals/engines/signal-aggregation-engine.ts',
  'lib/signals/funding-detector.ts',
  'lib/stakeholder-tracking/champions/champion-identifier.ts',
  'lib/stakeholder-tracking/detractors/detractor-manager.ts',
  'lib/stakeholder-tracking/engagement/engagement-tracker.ts',
  'lib/stakeholder-tracking/influence/influence-scorer.ts',
  'lib/streams/stream-service.ts',
  'lib/teamplay/activity-tracker.ts',
  'lib/templates/template-recommender.ts'
];

// Query methods that can come after type assertion (these are the problem)
const queryMethods = [
  '.single()',
  '.or(',
  '.order(',
  '.limit(',
  '.range(',
  '.gte(',
  '.lte(',
  '.gt(',
  '.lt(',
  '.not(',
  '.in(',
  '.contains(',
  '.filter(',
  '.maybeSingle()',
  '.throwOnError()'
];

function fixFile(filePath) {
  const fullPath = path.join(process.cwd(), filePath);

  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  File not found: ${filePath}`);
    return { fixed: false, reason: 'not found' };
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  const originalContent = content;

  let fixCount = 0;

  // Pattern: Find type assertions followed by more query methods
  // Match: ) as { data: Row<'...'>... } followed by .method(
  const typeAssertionPattern = /(\) as \{ data: Row<'[^']+'>(?:\[\])? \| null; error: any \})\s*\n\s*(\.(?:single|or|order|limit|range|gte|lte|gt|lt|not|in|contains|filter|maybeSingle|throwOnError)\()/g;

  let match;
  let matches = [];

  // Find all matches first (to avoid regex issues during replacement)
  while ((match = typeAssertionPattern.exec(content)) !== null) {
    matches.push({
      index: match.index,
      fullMatch: match[0],
      typeAssertion: match[1],
      nextMethod: match[2]
    });
  }

  // Process matches in reverse order (to preserve indices)
  for (let i = matches.length - 1; i >= 0; i--) {
    const m = matches[i];

    // Find the end of the query chain starting from this point
    const afterAssertion = content.substring(m.index + m.fullMatch.length);
    const lines = afterAssertion.split('\n');

    let chainEndIndex = m.index + m.fullMatch.length - m.typeAssertion.length - 1; // Back to before assertion
    let foundEnd = false;
    let depth = 0;
    let lookingAt = content.substring(chainEndIndex);

    // Find where the chain ends by looking for the last query method
    for (let lineIdx = 0; lineIdx < Math.min(lines.length, 20); lineIdx++) {
      const line = lines[lineIdx].trim();

      // Stop if we hit a new statement
      if (line.match(/^(const|let|var|if|return|await|for|while)\s/) && lineIdx > 0) {
        break;
      }

      // Check if this line has a query method
      const hasQueryMethod = queryMethods.some(method => {
        if (method.endsWith('(')) {
          return line.includes(method);
        }
        return line.includes(method);
      });

      if (hasQueryMethod || line.match(/^\.[a-z]+\(/)) {
        foundEnd = true;
        // Update chainEndIndex to after this line
        chainEndIndex = m.index + m.fullMatch.length - m.typeAssertion.length - 1 +
                       lines.slice(0, lineIdx + 1).join('\n').length;
      } else if (foundEnd && !line.match(/^\./)) {
        // We've found the end of the chain
        break;
      }
    }

    // Now perform the replacement - remove assertion from current position
    // and add it at the end of the chain
    const before = content.substring(0, m.index);
    const after = content.substring(m.index + m.fullMatch.length);

    // Remove type assertion, keep the method
    const withoutAssertion = ')' + '\n      ' + m.nextMethod;

    // Find where to insert the type assertion
    let insertContent = before + withoutAssertion;
    let remaining = after;

    // Look ahead to find the last method in the chain
    const nextLines = remaining.split('\n');
    let accumulatedLines = [];
    let insertPosition = 0;

    for (let j = 0; j < Math.min(nextLines.length, 15); j++) {
      const line = nextLines[j];
      accumulatedLines.push(line);
      insertPosition += line.length + 1; // +1 for newline

      const trimmedLine = line.trim();

      // Check if next line starts a new statement
      if (j < nextLines.length - 1) {
        const nextLine = nextLines[j + 1].trim();

        // If next line starts with . it's part of the chain
        if (nextLine.startsWith('.')) {
          continue;
        }

        // If this line ends with a method call and next doesn't start with ., end here
        if (trimmedLine.match(/\)\s*$/) || trimmedLine.match(/\)/)) {
          // This is the end of the chain
          // Insert type assertion here
          const beforeChainEnd = insertContent + accumulatedLines.join('\n');
          const afterChainEnd = '\n' + nextLines.slice(j + 1).join('\n');
          content = beforeChainEnd + ' ' + m.typeAssertion + afterChainEnd;
          fixCount++;
          break;
        }
      } else {
        // Last line we're checking
        const beforeChainEnd = insertContent + accumulatedLines.join('\n');
        const afterChainEnd = j < nextLines.length - 1 ? '\n' + nextLines.slice(j + 1).join('\n') : '';
        content = beforeChainEnd + ' ' + m.typeAssertion + afterChainEnd;
        fixCount++;
        break;
      }
    }
  }

  if (content !== originalContent) {
    fs.writeFileSync(fullPath, content, 'utf8');
    return { fixed: true, count: fixCount };
  }

  return { fixed: false, reason: 'no changes needed' };
}

// Main execution
console.log('🔧 Fixing type assertion placements in Supabase query chains...\n');

let totalFixed = 0;
let totalFiles = 0;
let errors = [];

for (const file of filesToFix) {
  try {
    const result = fixFile(file);
    if (result.fixed) {
      console.log(`✅ ${file} - Fixed ${result.count} assertion(s)`);
      totalFixed++;
      totalFiles += result.count || 1;
    } else {
      console.log(`⏭️  ${file} - ${result.reason}`);
    }
  } catch (error) {
    console.error(`❌ ${file} - Error: ${error.message}`);
    errors.push({ file, error: error.message });
  }
}

console.log(`\n📊 Summary:`);
console.log(`   Files fixed: ${totalFixed}`);
console.log(`   Total fixes: ${totalFiles}`);
if (errors.length > 0) {
  console.log(`   Errors: ${errors.length}`);
  errors.forEach(e => console.log(`      - ${e.file}: ${e.error}`));
}
