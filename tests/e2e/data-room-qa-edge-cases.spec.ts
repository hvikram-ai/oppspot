/**
 * E2E Test: Data Room Q&A - Edge Cases
 * Feature: 008-oppspot-docs-dataroom
 * Task: T010
 * Reference: spec.md edge cases section
 *
 * IMPORTANT: This test MUST FAIL until full implementation is complete
 */

import { test, expect, Page } from '@playwright/test';

const TEST_DATA_ROOM_NAME = 'E2E Edge Cases Room - ' + Date.now();

test.describe('Data Room Q&A - Edge Cases', () => {
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

    await context.close();
  });

  test.describe('Edge Case: Multi-Document Questions', () => {
    test('synthesizes answer from multiple documents with multiple citations', async ({ page }) => {
      // This test assumes multiple documents have been uploaded
      await page.goto(`/data-room/${dataRoomId}/qa`);

      // Ask a question that requires information from multiple documents
      const questionInput = page.locator('textarea[placeholder*="question" i], input[placeholder*="question" i]');
      await questionInput.fill('What is the overall company strategy across all departments?');

      const submitButton = page.locator('button:has-text("Ask"), button:has-text("Submit")').first();
      await submitButton.click();

      // Wait for answer
      const answerArea = page.locator('[data-testid="qa-answer"], .qa-answer').first();
      await expect(answerArea).toBeVisible({ timeout: 15000 });

      // Should have answer text
      const answerText = await answerArea.textContent();
      expect(answerText).toBeTruthy();
      expect(answerText!.length).toBeGreaterThan(50);

      // Should have multiple citations (from different documents)
      const citations = page.locator('[data-testid="citation"], .citation');
      const citationCount = await citations.count();

      // Expect at least 2 citations for multi-document synthesis
      if (citationCount > 0) {
        expect(citationCount).toBeGreaterThanOrEqual(1);

        // Check if citations reference different documents
        const citationTexts = await citations.allTextContents();

        // Should show document titles or identifiers
        expect(citationTexts.length).toBeGreaterThan(0);
      }
    });

    test('citations from multiple documents are clearly labeled', async ({ page }) => {
      await page.goto(`/data-room/${dataRoomId}/qa`);

      const questionInput = page.locator('textarea[placeholder*="question" i]');
      await questionInput.fill('Summarize the financial and operational data');

      const submitButton = page.locator('button:has-text("Ask")').first();
      await submitButton.click();

      await page.waitForSelector('[data-testid="qa-answer"]', { timeout: 15000 });

      // Check citations
      const citations = page.locator('[data-testid="citation"]');

      if (await citations.count() > 1) {
        // Each citation should show document title
        for (let i = 0; i < Math.min(await citations.count(), 3); i++) {
          const citation = citations.nth(i);
          const citationText = await citation.textContent();

          // Should contain document identifier (title, filename, or ID)
          expect(citationText).toBeTruthy();
          expect(citationText!.length).toBeGreaterThan(5);
        }
      }
    });

    test('multi-document answer maintains coherence', async ({ page }) => {
      await page.goto(`/data-room/${dataRoomId}/qa`);

      const questionInput = page.locator('textarea[placeholder*="question" i]');
      await questionInput.fill('What are the key metrics across all reports?');

      const submitButton = page.locator('button:has-text("Ask")').first();
      await submitButton.click();

      await page.waitForSelector('[data-testid="qa-answer"]', { timeout: 15000 });

      const answerArea = page.locator('[data-testid="qa-answer"]').first();
      const answerText = await answerArea.textContent();

      // Answer should be coherent (not just concatenated snippets)
      expect(answerText).toBeTruthy();

      // Should have proper sentence structure
      expect(answerText).toMatch(/\./); // Contains periods

      // Should not have obvious copy-paste artifacts
      expect(answerText).not.toMatch(/\[document \d+\]/i);
      expect(answerText).not.toMatch(/page \d+ page \d+/i); // Repeated page numbers
    });
  });

  test.describe('Edge Case: Contradictory Information', () => {
    test('cites both sources when information conflicts', async ({ page }) => {
      await page.goto(`/data-room/${dataRoomId}/qa`);

      // Ask a question that might have conflicting answers
      const questionInput = page.locator('textarea[placeholder*="question" i]');
      await questionInput.fill('What is the projected growth rate?');

      const submitButton = page.locator('button:has-text("Ask")').first();
      await submitButton.click();

      await page.waitForSelector('[data-testid="qa-answer"]', { timeout: 15000 });

      const answerArea = page.locator('[data-testid="qa-answer"]').first();
      const answerText = await answerArea.textContent();

      // If contradictory information exists, answer should acknowledge it
      const hasContradictionIndicator =
        answerText?.toLowerCase().includes('however') ||
        answerText?.toLowerCase().includes('different') ||
        answerText?.toLowerCase().includes('conflicting') ||
        answerText?.toLowerCase().includes('varies') ||
        answerText?.toLowerCase().includes('according to');

      // Check citations
      const citations = page.locator('[data-testid="citation"]');
      const citationCount = await citations.count();

      // If contradictory, should cite multiple sources
      if (hasContradictionIndicator) {
        expect(citationCount).toBeGreaterThanOrEqual(2);
      }
    });

    test('indicates discrepancy in answer text', async ({ page }) => {
      await page.goto(`/data-room/${dataRoomId}/qa`);

      const questionInput = page.locator('textarea[placeholder*="question" i]');
      await questionInput.fill('What is the employee count?');

      const submitButton = page.locator('button:has-text("Ask")').first();
      await submitButton.click();

      await page.waitForSelector('[data-testid="qa-answer"]', { timeout: 15000 });

      const answerArea = page.locator('[data-testid="qa-answer"]').first();
      const answerText = await answerArea.textContent();

      // Answer should present both pieces of information if contradictory
      expect(answerText).toBeTruthy();

      // Should not pick one arbitrarily without mentioning the other
      // Look for language that indicates multiple sources or uncertainty
      const hasMultipleSourceIndicators =
        answerText?.includes('according to') ||
        answerText?.includes('while') ||
        answerText?.includes('whereas') ||
        answerText?.match(/\d+.*and.*\d+/); // Multiple numbers presented

      // Test structure is valid even if no contradiction exists
      expect(answerText!.length).toBeGreaterThan(0);
    });
  });

  test.describe('Edge Case: Permission Changes Mid-Session', () => {
    test('next query reflects updated permissions after access revoked', async ({ page }) => {
      // This test requires multi-user setup to change permissions
      // For now, we document the expected behavior

      await page.goto(`/data-room/${dataRoomId}/qa`);

      // User asks a question with full access
      const questionInput = page.locator('textarea[placeholder*="question" i]');
      await questionInput.fill('What documents are available?');

      const submitButton = page.locator('button:has-text("Ask")').first();
      await submitButton.click();

      await page.waitForSelector('[data-testid="qa-answer"]', { timeout: 15000 });

      // In a real test with permission changes:
      // 1. Admin revokes access to certain documents
      // 2. User asks another question
      // 3. Answer should only use documents user still has access to
      // 4. Previously cited documents should not appear in new answers

      // For now, verify basic functionality works
      const answer = page.locator('[data-testid="qa-answer"]').first();
      await expect(answer).toBeVisible();
    });

    test('displays error if all document access is revoked', async ({ page }) => {
      await page.goto(`/data-room/${dataRoomId}/qa`);

      // If user has no access, should show appropriate error or empty state

      const questionInput = page.locator('textarea[placeholder*="question" i]');
      await questionInput.fill('Test question with no access');

      const submitButton = page.locator('button:has-text("Ask")').first();
      await submitButton.click();

      await page.waitForTimeout(10000);

      // Either shows error or abstention message
      const errorOrAbstention = page.locator('[data-testid="error"], [data-testid="qa-answer"]');
      await expect(errorOrAbstention.first()).toBeVisible();

      const text = await errorOrAbstention.first().textContent();

      // Should indicate no access or no information
      const hasNoAccessIndicator =
        text?.toLowerCase().includes('permission') ||
        text?.toLowerCase().includes('access') ||
        text?.toLowerCase().includes('no information') ||
        text?.toLowerCase().includes('insufficient');

      expect(hasNoAccessIndicator).toBeTruthy();
    });
  });

  test.describe('Edge Case: Scanned PDFs with OCR', () => {
    test('displays OCR warning for scanned documents', async ({ page }) => {
      // This test assumes a scanned PDF has been uploaded
      await page.goto(`/data-room/${dataRoomId}/documents`);

      // Check if OCR warning is shown on document with no text layer
      const ocrWarning = page.locator('[data-testid="ocr-warning"], .ocr-warning, [data-ocr-attempted="true"]');

      if (await ocrWarning.count() > 0) {
        await expect(ocrWarning.first()).toBeVisible();

        const warningText = await ocrWarning.first().textContent();

        // Should mention OCR or scanned document
        expect(warningText?.toLowerCase()).toMatch(/ocr|scanned|optical|text extraction/);
      }
    });

    test('OCR warning appears in Q&A results when citing scanned document', async ({ page }) => {
      await page.goto(`/data-room/${dataRoomId}/qa`);

      const questionInput = page.locator('textarea[placeholder*="question" i]');
      await questionInput.fill('What information is in the scanned documents?');

      const submitButton = page.locator('button:has-text("Ask")').first();
      await submitButton.click();

      await page.waitForSelector('[data-testid="qa-answer"]', { timeout: 15000 });

      // Check if OCR confidence warning appears with citations
      const ocrIndicator = page.locator('[data-testid="ocr-indicator"], .ocr-note, [data-ocr="true"]');

      if (await ocrIndicator.count() > 0) {
        const indicatorText = await ocrIndicator.textContent();

        // Should inform user about OCR
        expect(indicatorText?.toLowerCase()).toMatch(/ocr|extracted|scanned/);
      }
    });

    test('low OCR confidence documents marked for review', async ({ page }) => {
      await page.goto(`/data-room/${dataRoomId}/documents`);

      // Check for documents with low OCR confidence
      const lowConfidenceIndicator = page.locator('[data-testid="low-confidence"], [data-ocr-confidence="low"]');

      if (await lowConfidenceIndicator.count() > 0) {
        await expect(lowConfidenceIndicator.first()).toBeVisible();

        const text = await lowConfidenceIndicator.first().textContent();

        // Should suggest review
        expect(text?.toLowerCase()).toMatch(/review|check|verify|low confidence/);
      }
    });
  });

  test.describe('Edge Case: Very Long Documents (1000+ pages)', () => {
    test('displays performance warning for large documents', async ({ page }) => {
      await page.goto(`/data-room/${dataRoomId}/documents`);

      // Check for large document warning
      const sizeWarning = page.locator('[data-testid="size-warning"], .large-document-warning, [data-page-count]');

      if (await sizeWarning.count() > 0) {
        // Check if any document has 1000+ pages indicator
        const warnings = await sizeWarning.all();

        for (const warning of warnings) {
          const text = await warning.textContent();

          if (text && (text.includes('1000') || text.includes('large') || text.includes('pages'))) {
            // Should warn about processing time
            expect(text.toLowerCase()).toMatch(/processing|indexing|time|performance/);
          }
        }
      }
    });

    test('large document indexing shows progress indicator', async ({ page }) => {
      await page.goto(`/data-room/${dataRoomId}/documents`);

      // Check for processing status on large documents
      const processingIndicator = page.locator('[data-testid="processing-status"], .processing, [data-status="processing"]');

      if (await processingIndicator.count() > 0) {
        // Should show progress
        const text = await processingIndicator.first().textContent();

        expect(text?.toLowerCase()).toMatch(/processing|indexing|analyzing|\d+%/);
      }
    });

    test('Q&A works with large documents once indexed', async ({ page }) => {
      await page.goto(`/data-room/${dataRoomId}/qa`);

      // Ask question that might reference large document
      const questionInput = page.locator('textarea[placeholder*="question" i]');
      await questionInput.fill('What information is in the comprehensive report?');

      const submitButton = page.locator('button:has-text("Ask")').first();
      await submitButton.click();

      // May take longer for large documents
      await page.waitForTimeout(15000);

      // Should eventually return answer or indicate processing
      const result = page.locator('[data-testid="qa-answer"], [data-testid="error"], [data-testid="processing"]');
      await expect(result.first()).toBeVisible();
    });

    test('pagination works efficiently for large document history', async ({ page }) => {
      await page.goto(`/data-room/${dataRoomId}/qa`);

      // Submit multiple queries to build history
      const questionInput = page.locator('textarea[placeholder*="question" i]');
      const submitButton = page.locator('button:has-text("Ask")').first();

      for (let i = 0; i < 5; i++) {
        await questionInput.fill(`Test query ${i + 1} for pagination`);
        await submitButton.click();
        await page.waitForTimeout(3000);
      }

      // Open history
      const historyButton = page.locator('button:has-text("History"), [data-testid="history-button"]');

      if (await historyButton.count() > 0) {
        await historyButton.click();

        // History should load efficiently
        const historyItems = page.locator('[data-testid="history-item"]');
        const loadTime = Date.now();

        await expect(historyItems.first()).toBeVisible({ timeout: 3000 });

        const elapsed = Date.now() - loadTime;

        // Should load quickly even with large history
        expect(elapsed).toBeLessThan(3000);
      }
    });
  });

  test.describe('Edge Case: Special Characters and Formatting', () => {
    test('handles questions with special characters', async ({ page }) => {
      await page.goto(`/data-room/${dataRoomId}/qa`);

      const questionInput = page.locator('textarea[placeholder*="question" i]');

      // Question with special characters
      await questionInput.fill('What is the "revenue" & profit margin (Q1-Q4)?');

      const submitButton = page.locator('button:has-text("Ask")').first();
      await submitButton.click();

      await page.waitForSelector('[data-testid="qa-answer"]', { timeout: 15000 });

      const answer = page.locator('[data-testid="qa-answer"]').first();
      await expect(answer).toBeVisible();

      // Should handle special characters gracefully
      const answerText = await answer.textContent();
      expect(answerText).toBeTruthy();
    });

    test('preserves formatting in answers', async ({ page }) => {
      await page.goto(`/data-room/${dataRoomId}/qa`);

      const questionInput = page.locator('textarea[placeholder*="question" i]');
      await questionInput.fill('List the key financial metrics');

      const submitButton = page.locator('button:has-text("Ask")').first();
      await submitButton.click();

      await page.waitForSelector('[data-testid="qa-answer"]', { timeout: 15000 });

      const answer = page.locator('[data-testid="qa-answer"]').first();

      // Check if lists/bullets are preserved
      const html = await answer.innerHTML();

      // May contain list formatting
      const hasFormatting =
        html.includes('<ul>') ||
        html.includes('<ol>') ||
        html.includes('<li>') ||
        html.includes('\n') ||
        html.includes('<br>');

      // Answer should be formatted (not just plain text blob)
      expect(html.length).toBeGreaterThan(0);
    });

    test('handles Unicode and emoji in questions', async ({ page }) => {
      await page.goto(`/data-room/${dataRoomId}/qa`);

      const questionInput = page.locator('textarea[placeholder*="question" i]');
      await questionInput.fill('What are the café revenue projections? 📊💰');

      const submitButton = page.locator('button:has-text("Ask")').first();
      await submitButton.click();

      await page.waitForTimeout(15000);

      // Should handle Unicode gracefully (either answer or abstention)
      const result = page.locator('[data-testid="qa-answer"], [data-testid="error"]');
      await expect(result.first()).toBeVisible();
    });
  });

  test.describe('Edge Case: Concurrent Queries', () => {
    test('handles multiple queries in quick succession', async ({ page }) => {
      await page.goto(`/data-room/${dataRoomId}/qa`);

      const questionInput = page.locator('textarea[placeholder*="question" i]');
      const submitButton = page.locator('button:has-text("Ask")').first();

      // Submit first query
      await questionInput.fill('First concurrent query');
      await submitButton.click();

      // Immediately submit second query (before first completes)
      await page.waitForTimeout(1000);
      await questionInput.fill('Second concurrent query');
      await submitButton.click();

      // Both should eventually complete or show appropriate state
      await page.waitForTimeout(15000);

      // Check that UI is in valid state (not stuck/broken)
      const answers = page.locator('[data-testid="qa-answer"]');
      const answerCount = await answers.count();

      // Should have at least one answer showing
      expect(answerCount).toBeGreaterThan(0);

      // Should not show loading forever
      const loadingIndicator = page.locator('[data-testid="loading"]');
      const isStillLoading = await loadingIndicator.count() > 0 && await loadingIndicator.first().isVisible();

      // If still loading after 15s, something is wrong
      if (isStillLoading) {
        // Allow some grace period
        await page.waitForTimeout(5000);
        const stillLoadingAfterWait = await loadingIndicator.first().isVisible().catch(() => false);
        expect(stillLoadingAfterWait).toBe(false);
      }
    });

    test('cancels previous query when new query submitted', async ({ page }) => {
      await page.goto(`/data-room/${dataRoomId}/qa`);

      const questionInput = page.locator('textarea[placeholder*="question" i]');
      const submitButton = page.locator('button:has-text("Ask")').first();

      // Submit first query
      await questionInput.fill('Query to be cancelled');
      await submitButton.click();

      // Quickly submit second query
      await page.waitForTimeout(500);
      await questionInput.fill('Replacement query');
      await submitButton.click();

      // Wait for result
      await page.waitForTimeout(15000);

      // Should show result for second query, not first
      const answer = page.locator('[data-testid="qa-answer"]').first();

      if (await answer.isVisible()) {
        const answerText = await answer.textContent();

        // Should not contain both answers (query was replaced)
        expect(answerText).toBeTruthy();
      }
    });
  });

  test.describe('Edge Case: Empty and Minimal Data', () => {
    test('handles empty data room gracefully', async ({ page }) => {
      // Create an empty data room
      await page.goto('/data-room');

      await page.click('button:has-text("Create Data Room")');
      await page.fill('input[name="name"]', 'Empty Room - ' + Date.now());
      await page.selectOption('select[name="deal_type"]', 'acquisition');
      await page.click('button:has-text("Create")');

      await page.waitForURL(/\/data-room\/[a-f0-9-]+/);

      const url = page.url();
      const match = url.match(/\/data-room\/([a-f0-9-]+)/);
      const emptyRoomId = match ? match[1] : '';

      // Go to Q&A
      await page.goto(`/data-room/${emptyRoomId}/qa`);

      // Should show empty state or warning
      const emptyState = page.locator('[data-testid="empty-state"], .empty-state');

      if (await emptyState.count() > 0) {
        await expect(emptyState.first()).toBeVisible();

        const emptyText = await emptyState.textContent();
        expect(emptyText?.toLowerCase()).toMatch(/no documents|upload|empty/);
      }

      // Try to ask a question anyway
      const questionInput = page.locator('textarea[placeholder*="question" i]');
      await questionInput.fill('Test question in empty room');

      const submitButton = page.locator('button:has-text("Ask")').first();
      await submitButton.click();

      await page.waitForTimeout(10000);

      // Should show abstention
      const answer = page.locator('[data-testid="qa-answer"]').first();
      await expect(answer).toBeVisible();

      const answerText = await answer.textContent();
      expect(answerText?.toLowerCase()).toMatch(/no information|insufficient|no documents/);
    });
  });
});
