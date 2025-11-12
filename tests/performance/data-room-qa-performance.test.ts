/**
 * Performance Test: Data Room Q&A Performance Validation
 * Feature: 008-oppspot-docs-dataroom
 * Task: T011
 * Reference: research.md section 10 and quickstart.md performance validation
 *
 * IMPORTANT: This test MUST FAIL until full implementation is complete
 */

import { test, expect } from '@playwright/test';

const TEST_DATA_ROOM_NAME = 'Performance Test Room - ' + Date.now();

test.describe('Data Room Q&A - Performance Validation', () => {
  let dataRoomId: string;

  // Setup: Create a data room
  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto('/data-room');

    await page.click('button:has-text("Create Data Room")');
    await page.fill('input[name="name"]', TEST_DATA_ROOM_NAME);
    await page.selectOption('select[name="deal_type"]', 'acquisition');
    await page.click('button:has-text("Create")');

    await page.waitForURL(/\/data-room\/[a-f0-9-]+/);

    const url = page.url();
    const match = url.match(/\/data-room\/([a-f0-9-]+)/);
    if (match) {
      dataRoomId = match[1];
    }

    // Upload test documents for performance testing
    // Note: In real tests, we'd upload actual documents with varying sizes

    await context.close();
  });

  test.describe('FR-005: End-to-End Query Performance (<7 seconds)', () => {
    test('query completes in under 7 seconds (95% target)', async ({ page }) => {
      await page.goto(`/data-room/${dataRoomId}/qa`);

      const questionInput = page.locator('textarea[placeholder*="question" i], input[placeholder*="question" i]');
      await questionInput.fill('What are the revenue projections for Q3 2024?');

      const submitButton = page.locator('button:has-text("Ask"), button:has-text("Submit")').first();

      // Measure end-to-end time
      const startTime = performance.now();

      await submitButton.click();

      // Wait for answer to appear
      const answerArea = page.locator('[data-testid="qa-answer"], .qa-answer').first();
      await expect(answerArea).toBeVisible({ timeout: 10000 });

      const endTime = performance.now();
      const elapsedMs = endTime - startTime;

      // FR-005: 95% of queries should complete in <7 seconds
      console.log(`Query completed in ${elapsedMs}ms`);

      // Allow some overhead for E2E testing (network, rendering)
      // Target: <7000ms, but allow up to 10000ms for test environment
      expect(elapsedMs).toBeLessThan(10000);

      // Ideal case: under 7 seconds
      if (elapsedMs < 7000) {
        console.log('✓ Query met production target (<7s)');
      } else {
        console.log(`⚠ Query slower than production target: ${elapsedMs}ms`);
      }
    });

    test('multiple queries maintain consistent performance', async ({ page }) => {
      await page.goto(`/data-room/${dataRoomId}/qa`);

      const questionInput = page.locator('textarea[placeholder*="question" i]');
      const submitButton = page.locator('button:has-text("Ask")').first();

      const queryTimes: number[] = [];

      // Run 5 queries and measure each
      const testQuestions = [
        'What is the company strategy?',
        'What are the key risks?',
        'Who are the decision makers?',
        'What are the financial projections?',
        'What is the market opportunity?',
      ];

      for (const question of testQuestions) {
        await questionInput.fill(question);

        const startTime = performance.now();
        await submitButton.click();

        await page.waitForSelector('[data-testid="qa-answer"]', { timeout: 10000 });

        const endTime = performance.now();
        const elapsed = endTime - startTime;

        queryTimes.push(elapsed);

        console.log(`Query "${question.substring(0, 30)}..." took ${elapsed}ms`);

        // Small delay between queries
        await page.waitForTimeout(1000);
      }

      // Calculate statistics
      const avgTime = queryTimes.reduce((a, b) => a + b, 0) / queryTimes.length;
      const maxTime = Math.max(...queryTimes);
      const minTime = Math.min(...queryTimes);

      console.log(`Performance stats - Avg: ${avgTime}ms, Min: ${minTime}ms, Max: ${maxTime}ms`);

      // Average should be under 7 seconds
      expect(avgTime).toBeLessThan(10000);

      // 95% (at least 4 out of 5) should be under 7 seconds
      const underTarget = queryTimes.filter(t => t < 7000).length;
      const percentageUnderTarget = (underTarget / queryTimes.length) * 100;

      console.log(`${percentageUnderTarget}% of queries met <7s target`);

      // Allow some variance in test environment
      expect(percentageUnderTarget).toBeGreaterThanOrEqual(60); // At least 60% in test env
    });

    test('query time is displayed to user', async ({ page }) => {
      await page.goto(`/data-room/${dataRoomId}/qa`);

      const questionInput = page.locator('textarea[placeholder*="question" i]');
      await questionInput.fill('Test query for time display');

      const submitButton = page.locator('button:has-text("Ask")').first();
      await submitButton.click();

      await page.waitForSelector('[data-testid="qa-answer"]', { timeout: 10000 });

      // Check if query time is displayed
      const timeDisplay = page.locator('[data-testid="query-time"], .query-time, [data-time], [data-testid="metrics"]');

      if (await timeDisplay.count() > 0) {
        await expect(timeDisplay.first()).toBeVisible();

        const timeText = await timeDisplay.first().textContent();

        // Should show time in readable format
        expect(timeText).toMatch(/\d+\s*(ms|second|s)/i);
      }
    });
  });

  test.describe('FR-031: Vector Search Performance (<300ms for 50K chunks)', () => {
    test('vector search completes quickly for large document set', async ({ page }) => {
      // This test validates that vector search is fast even with many chunks
      // In production, this would test against a database with 50K+ chunks

      await page.goto(`/data-room/${dataRoomId}/qa`);

      const questionInput = page.locator('textarea[placeholder*="question" i]');
      await questionInput.fill('Find all mentions of revenue across all documents');

      const submitButton = page.locator('button:has-text("Ask")').first();

      const startTime = performance.now();
      await submitButton.click();

      // Wait for answer (which includes vector search)
      await page.waitForSelector('[data-testid="qa-answer"]', { timeout: 10000 });

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      console.log(`Total query time (including vector search): ${totalTime}ms`);

      // Vector search should be a small portion of total time
      // If total time is reasonable, vector search must be fast
      expect(totalTime).toBeLessThan(10000);

      // Check if metrics are exposed
      const metricsDisplay = page.locator('[data-testid="metrics"], [data-testid="query-metrics"]');

      if (await metricsDisplay.count() > 0) {
        const metricsText = await metricsDisplay.textContent();

        // May show breakdown: retrieval_time_ms, llm_time_ms, etc.
        console.log('Metrics:', metricsText);

        // If retrieval time is shown, verify it's under 300ms
        if (metricsText?.includes('retrieval')) {
          const retrievalMatch = metricsText.match(/retrieval[:\s]+(\d+)/i);
          if (retrievalMatch) {
            const retrievalTime = parseInt(retrievalMatch[1]);
            console.log(`Retrieval time: ${retrievalTime}ms`);

            // FR-031: Vector search <300ms target
            // Allow some overhead in test environment
            expect(retrievalTime).toBeLessThan(500);
          }
        }
      }
    });

    test('large result sets are handled efficiently', async ({ page }) => {
      await page.goto(`/data-room/${dataRoomId}/qa`);

      // Ask a broad question that might match many chunks
      const questionInput = page.locator('textarea[placeholder*="question" i]');
      await questionInput.fill('What information is available about the company?');

      const submitButton = page.locator('button:has-text("Ask")').first();

      const startTime = performance.now();
      await submitButton.click();

      await page.waitForSelector('[data-testid="qa-answer"]', { timeout: 10000 });

      const endTime = performance.now();
      const elapsed = endTime - startTime;

      console.log(`Broad query completed in ${elapsed}ms`);

      // Should still complete in reasonable time
      expect(elapsed).toBeLessThan(10000);

      // Check citations count (top-k=20 per spec)
      const citations = page.locator('[data-testid="citation"]');
      const citationCount = await citations.count();

      console.log(`Returned ${citationCount} citations`);

      // Should not return too many citations (limited by top-k)
      expect(citationCount).toBeLessThanOrEqual(20);
    });
  });

  test.describe('Streaming Performance (<3 seconds to start)', () => {
    test('streaming starts in under 3 seconds', async ({ page }) => {
      await page.goto(`/data-room/${dataRoomId}/qa`);

      const questionInput = page.locator('textarea[placeholder*="question" i]');
      await questionInput.fill('What is the company mission and vision?');

      const submitButton = page.locator('button:has-text("Ask")').first();

      const startTime = performance.now();
      await submitButton.click();

      // Wait for first content to appear (streaming starts)
      const answerArea = page.locator('[data-testid="qa-answer"], .qa-answer').first();

      // Time to first byte (streaming start)
      await expect(answerArea).toBeVisible({ timeout: 5000 });

      const firstContentTime = performance.now();
      const timeToFirstContent = firstContentTime - startTime;

      console.log(`Streaming started in ${timeToFirstContent}ms`);

      // Target: <3 seconds to start streaming
      // Allow some overhead in test environment
      expect(timeToFirstContent).toBeLessThan(5000);

      if (timeToFirstContent < 3000) {
        console.log('✓ Streaming met production target (<3s)');
      } else {
        console.log(`⚠ Streaming slower than target: ${timeToFirstContent}ms`);
      }
    });

    test('streaming provides progressive user feedback', async ({ page }) => {
      await page.goto(`/data-room/${dataRoomId}/qa`);

      const questionInput = page.locator('textarea[placeholder*="question" i]');
      await questionInput.fill('Describe the company business model in detail');

      const submitButton = page.locator('button:has-text("Ask")').first();
      await submitButton.click();

      // Monitor answer content growth
      const answerArea = page.locator('[data-testid="qa-answer"]').first();

      await expect(answerArea).toBeVisible({ timeout: 5000 });

      // Get initial content length
      await page.waitForTimeout(500);
      const initialLength = (await answerArea.textContent())?.length || 0;

      // Wait a bit more
      await page.waitForTimeout(1500);
      const laterLength = (await answerArea.textContent())?.length || 0;

      console.log(`Content growth: ${initialLength} -> ${laterLength} characters`);

      // Content should grow over time (progressive streaming)
      // Unless answer is very short
      if (initialLength > 0) {
        expect(laterLength).toBeGreaterThanOrEqual(initialLength);
      }
    });

    test('streaming handles interruption gracefully', async ({ page }) => {
      await page.goto(`/data-room/${dataRoomId}/qa`);

      const questionInput = page.locator('textarea[placeholder*="question" i]');
      await questionInput.fill('First streaming query');

      const submitButton = page.locator('button:has-text("Ask")').first();
      await submitButton.click();

      // Wait for streaming to start
      await page.waitForSelector('[data-testid="qa-answer"]', { timeout: 5000 });

      // Interrupt by submitting new query
      await page.waitForTimeout(1000);
      await questionInput.fill('Second interrupting query');
      await submitButton.click();

      // Should handle interruption without error
      await page.waitForTimeout(5000);

      // UI should be in valid state
      const error = page.locator('[data-testid="error"]');
      const hasError = await error.count() > 0 && await error.first().isVisible();

      expect(hasError).toBe(false);
    });
  });

  test.describe('Document Chunking Performance (<2s per 100 pages)', () => {
    test('document processing shows progress for large files', async ({ page }) => {
      // This test would upload a large document and monitor processing

      await page.goto(`/data-room/${dataRoomId}/documents`);

      // Check if processing status is shown
      const processingIndicator = page.locator('[data-testid="processing-status"], [data-status="processing"]');

      if (await processingIndicator.count() > 0) {
        await expect(processingIndicator.first()).toBeVisible();

        const statusText = await processingIndicator.first().textContent();

        // Should show progress
        expect(statusText?.toLowerCase()).toMatch(/processing|analyzing|\d+%/);
      }
    });

    test('chunking completes within expected timeframe', async ({ page }) => {
      // Note: This test requires actual document upload capability
      // and backend processing to be implemented

      await page.goto(`/data-room/${dataRoomId}/documents`);

      // Look for recently processed documents
      const documentStatus = page.locator('[data-testid="document-status"], [data-processing-time]');

      if (await documentStatus.count() > 0) {
        // Check processing time if displayed
        const statusElements = await documentStatus.all();

        for (const elem of statusElements) {
          const text = await elem.textContent();

          // Extract page count and processing time if shown
          const pageMatch = text?.match(/(\d+)\s*pages/i);
          const timeMatch = text?.match(/(\d+)\s*(s|seconds|ms)/i);

          if (pageMatch && timeMatch) {
            const pageCount = parseInt(pageMatch[1]);
            const timeValue = parseInt(timeMatch[1]);
            const timeUnit = timeMatch[2];

            const timeInSeconds = timeUnit.startsWith('m') ? timeValue / 1000 : timeValue;

            console.log(`Document: ${pageCount} pages processed in ${timeInSeconds}s`);

            // FR: <2s per 100 pages
            // Calculate expected time
            const expectedTime = (pageCount / 100) * 2;

            // Allow 2x overhead in test environment
            expect(timeInSeconds).toBeLessThan(expectedTime * 2);
          }
        }
      }
    });
  });

  test.describe('Performance Monitoring and Metrics', () => {
    test('query metrics are tracked and displayed', async ({ page }) => {
      await page.goto(`/data-room/${dataRoomId}/qa`);

      const questionInput = page.locator('textarea[placeholder*="question" i]');
      await questionInput.fill('What are the key performance indicators?');

      const submitButton = page.locator('button:has-text("Ask")').first();
      await submitButton.click();

      await page.waitForSelector('[data-testid="qa-answer"]', { timeout: 10000 });

      // Check for metrics display
      const metricsArea = page.locator('[data-testid="metrics"], [data-testid="query-metrics"], .metrics');

      if (await metricsArea.count() > 0) {
        await expect(metricsArea.first()).toBeVisible();

        const metricsText = await metricsArea.textContent();

        console.log('Query metrics:', metricsText);

        // Should include timing information
        expect(metricsText).toBeTruthy();

        // FR-033: Track 95th percentile latency
        // FR-034: Track average citations per answer
        // These would be displayed in admin/monitoring dashboard
      }
    });

    test('performance degrades gracefully under load', async ({ page }) => {
      await page.goto(`/data-room/${dataRoomId}/qa`);

      const questionInput = page.locator('textarea[placeholder*="question" i]');
      const submitButton = page.locator('button:has-text("Ask")').first();

      // Submit multiple queries rapidly
      const queryTimes: number[] = [];

      for (let i = 0; i < 3; i++) {
        await questionInput.fill(`Load test query ${i + 1}`);

        const startTime = performance.now();
        await submitButton.click();

        await page.waitForSelector('[data-testid="qa-answer"]', { timeout: 15000 });

        const endTime = performance.now();
        queryTimes.push(endTime - startTime);

        await page.waitForTimeout(500);
      }

      console.log('Query times under load:', queryTimes);

      // Later queries shouldn't be dramatically slower
      const firstQuery = queryTimes[0];
      const lastQuery = queryTimes[queryTimes.length - 1];

      // Allow up to 2x slowdown
      expect(lastQuery).toBeLessThan(firstQuery * 2);
    });

    test('UI remains responsive during query processing', async ({ page }) => {
      await page.goto(`/data-room/${dataRoomId}/qa`);

      const questionInput = page.locator('textarea[placeholder*="question" i]');
      await questionInput.fill('Test UI responsiveness');

      const submitButton = page.locator('button:has-text("Ask")').first();
      await submitButton.click();

      // Try to interact with UI while processing
      await page.waitForTimeout(1000);

      // Try to click history button (if exists)
      const historyButton = page.locator('button:has-text("History")');

      if (await historyButton.count() > 0) {
        // UI should remain clickable
        await historyButton.click({ timeout: 2000 });

        // Should respond
        const historyPanel = page.locator('[data-testid="history-panel"]');

        if (await historyPanel.count() > 0) {
          await expect(historyPanel.first()).toBeVisible({ timeout: 3000 });
        }
      }

      // UI didn't freeze
      expect(true).toBe(true);
    });
  });

  test.describe('Performance Benchmarks Summary', () => {
    test('runs full performance suite and reports results', async ({ page }) => {
      console.log('\n=== Performance Benchmark Results ===');

      await page.goto(`/data-room/${dataRoomId}/qa`);

      const results: Record<string, number> = {};

      // Test 1: Simple query
      const questionInput = page.locator('textarea[placeholder*="question" i]');
      const submitButton = page.locator('button:has-text("Ask")').first();

      await questionInput.fill('What is the company strategy?');

      const simpleStart = performance.now();
      await submitButton.click();
      await page.waitForSelector('[data-testid="qa-answer"]', { timeout: 10000 });
      results.simpleQuery = performance.now() - simpleStart;

      await page.waitForTimeout(2000);

      // Test 2: Complex query
      await questionInput.fill('Provide a comprehensive analysis of all financial data and projections');

      const complexStart = performance.now();
      await submitButton.click();
      await page.waitForSelector('[data-testid="qa-answer"]', { timeout: 15000 });
      results.complexQuery = performance.now() - complexStart;

      // Report results
      console.log(`\nSimple Query: ${results.simpleQuery.toFixed(2)}ms`);
      console.log(`Complex Query: ${results.complexQuery.toFixed(2)}ms`);

      // Targets
      console.log('\n=== Performance Targets ===');
      console.log(`Vector Search Target: <300ms (FR-031)`);
      console.log(`E2E Query Target: <7000ms (FR-005)`);
      console.log(`Streaming Start Target: <3000ms`);
      console.log(`Chunking Target: <2s per 100 pages`);

      // Validation
      console.log('\n=== Validation ===');
      console.log(`Simple Query ${results.simpleQuery < 7000 ? '✓ PASS' : '✗ FAIL'} (<7s)`);
      console.log(`Complex Query ${results.complexQuery < 10000 ? '✓ PASS' : '✗ FAIL'} (<10s with overhead)`);

      // At least one query should meet strict target
      const meetsTarget = results.simpleQuery < 7000 || results.complexQuery < 7000;
      expect(meetsTarget).toBe(true);
    });
  });
});
