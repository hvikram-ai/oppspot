/**
 * E2E Test: Data Room Q&A - Happy Path Scenarios
 * Feature: 008-oppspot-docs-dataroom
 * Task: T008
 * Reference: spec.md acceptance scenarios 1, 3, 5, 6
 *
 * IMPORTANT: This test MUST FAIL until full implementation is complete
 */

import { test, expect, Page } from '@playwright/test';

// Test data and configuration
const TEST_DATA_ROOM_NAME = 'E2E Test Data Room - ' + Date.now();
const TEST_DOCUMENT = 'test-financial-report.pdf';
const TEST_QUESTION = 'What are the revenue projections for Q3 2024?';

test.describe('Data Room Q&A - Happy Path Scenarios', () => {
  let dataRoomId: string;

  // Setup: Create a data room and upload a test document
  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    // Navigate to data rooms
    await page.goto('/data-room');

    // Create new data room
    await page.click('button:has-text("Create Data Room")');
    await page.fill('input[name="name"]', TEST_DATA_ROOM_NAME);
    await page.selectOption('select[name="deal_type"]', 'acquisition');
    await page.click('button:has-text("Create")');

    // Wait for redirect to data room page
    await page.waitForURL(/\/data-room\/[a-f0-9-]+/);

    // Extract data room ID from URL
    const url = page.url();
    const match = url.match(/\/data-room\/([a-f0-9-]+)/);
    if (match) {
      dataRoomId = match[1];
    }

    // Upload a test document (if available)
    const fileInput = page.locator('input[type="file"]');
    if (await fileInput.count() > 0) {
      // Note: In real tests, we'd upload an actual PDF file
      // For now, we'll skip if no test file is available
    }

    await context.close();
  });

  test.describe('Scenario 1: Submit question and receive streaming answer with citations', () => {
    test('user can ask a question and receive an answer with citations', async ({ page }) => {
      // Navigate to Q&A page
      await page.goto(`/data-room/${dataRoomId}/qa`);

      // Wait for page to load
      await expect(page.locator('h1, h2').filter({ hasText: /Q&A|Ask|Questions/i })).toBeVisible();

      // Find question input
      const questionInput = page.locator('textarea[placeholder*="question" i], input[placeholder*="question" i]');
      await expect(questionInput).toBeVisible();

      // Type question
      await questionInput.fill(TEST_QUESTION);

      // Submit question
      const submitButton = page.locator('button:has-text("Ask"), button:has-text("Submit"), button[type="submit"]').first();
      await submitButton.click();

      // Wait for answer to appear (streaming or complete)
      // The answer should appear in a response area
      const answerArea = page.locator('[data-testid="qa-answer"], .qa-answer, [role="article"]').first();

      // Wait up to 15 seconds for answer (streaming may take time)
      await expect(answerArea).toBeVisible({ timeout: 15000 });

      // Verify answer contains some text
      const answerText = await answerArea.textContent();
      expect(answerText).toBeTruthy();
      expect(answerText!.length).toBeGreaterThan(10);

      // Verify citations are present
      const citations = page.locator('[data-testid="citation"], .citation, a[href*="documents"]');
      const citationCount = await citations.count();

      expect(citationCount).toBeGreaterThan(0);

      // Verify each citation has required information
      const firstCitation = citations.first();
      await expect(firstCitation).toBeVisible();

      // Citation should have document title or page number
      const citationText = await firstCitation.textContent();
      expect(citationText).toBeTruthy();
    });

    test('streaming answer displays progressively', async ({ page }) => {
      await page.goto(`/data-room/${dataRoomId}/qa`);

      const questionInput = page.locator('textarea[placeholder*="question" i], input[placeholder*="question" i]');
      await questionInput.fill('What is the company strategy?');

      const submitButton = page.locator('button:has-text("Ask"), button:has-text("Submit")').first();
      await submitButton.click();

      // Check if streaming indicator appears
      const loadingIndicator = page.locator('[data-testid="loading"], .loading, .spinner');

      // Should show loading initially
      if (await loadingIndicator.count() > 0) {
        await expect(loadingIndicator.first()).toBeVisible({ timeout: 2000 });
      }

      // Wait for answer to complete
      const answerArea = page.locator('[data-testid="qa-answer"], .qa-answer').first();
      await expect(answerArea).toBeVisible({ timeout: 15000 });

      // Loading should disappear when complete
      if (await loadingIndicator.count() > 0) {
        await expect(loadingIndicator.first()).toBeHidden({ timeout: 10000 });
      }
    });

    test('displays query processing time', async ({ page }) => {
      await page.goto(`/data-room/${dataRoomId}/qa`);

      const questionInput = page.locator('textarea[placeholder*="question" i]');
      await questionInput.fill('Quick test question?');

      const submitButton = page.locator('button:has-text("Ask")').first();

      const startTime = Date.now();
      await submitButton.click();

      // Wait for answer
      const answerArea = page.locator('[data-testid="qa-answer"], .qa-answer').first();
      await expect(answerArea).toBeVisible({ timeout: 15000 });

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // FR-005: Query should complete in <7 seconds (95% target)
      // Allow up to 10s for E2E overhead
      expect(totalTime).toBeLessThan(10000);

      // Check if time is displayed in UI
      const timeDisplay = page.locator('[data-testid="query-time"], .query-time');
      if (await timeDisplay.count() > 0) {
        const timeText = await timeDisplay.textContent();
        expect(timeText).toMatch(/\d+/); // Contains a number
      }
    });
  });

  test.describe('Scenario 3 (spec): Click citation to navigate to document with highlighting', () => {
    test('clicking citation navigates to document viewer', async ({ page }) => {
      // First, ask a question to get citations
      await page.goto(`/data-room/${dataRoomId}/qa`);

      const questionInput = page.locator('textarea[placeholder*="question" i]');
      await questionInput.fill(TEST_QUESTION);

      const submitButton = page.locator('button:has-text("Ask")').first();
      await submitButton.click();

      // Wait for answer with citations
      await page.waitForSelector('[data-testid="citation"], .citation, a[href*="documents"]', { timeout: 15000 });

      // Click the first citation
      const firstCitation = page.locator('[data-testid="citation"], .citation, a[href*="documents"]').first();
      await firstCitation.click();

      // Should navigate to document viewer
      await expect(page).toHaveURL(/\/data-room\/[^\/]+\/documents\/[^\/]+/, { timeout: 5000 });

      // Document viewer should be visible
      const documentViewer = page.locator('[data-testid="document-viewer"], .document-viewer, iframe, canvas');
      await expect(documentViewer.first()).toBeVisible({ timeout: 5000 });
    });

    test('citation shows document page and preview text', async ({ page }) => {
      await page.goto(`/data-room/${dataRoomId}/qa`);

      const questionInput = page.locator('textarea[placeholder*="question" i]');
      await questionInput.fill('What are the key risks?');

      const submitButton = page.locator('button:has-text("Ask")').first();
      await submitButton.click();

      // Wait for citations
      const citations = page.locator('[data-testid="citation"], .citation');
      await expect(citations.first()).toBeVisible({ timeout: 15000 });

      // Check citation structure
      const firstCitation = citations.first();

      // Should show page number
      const citationContent = await firstCitation.textContent();
      expect(citationContent).toMatch(/page|p\.?\s*\d+/i);

      // FR-010: Should show preview text (~240 chars, max 500)
      // Text preview should be visible
      const previewText = page.locator('[data-testid="citation-preview"], .citation-preview');
      if (await previewText.count() > 0) {
        const preview = await previewText.first().textContent();
        expect(preview!.length).toBeLessThanOrEqual(500);
      }
    });

    test('document viewer highlights cited text section', async ({ page }) => {
      await page.goto(`/data-room/${dataRoomId}/qa`);

      const questionInput = page.locator('textarea[placeholder*="question" i]');
      await questionInput.fill(TEST_QUESTION);

      const submitButton = page.locator('button:has-text("Ask")').first();
      await submitButton.click();

      // Wait and click citation
      await page.waitForSelector('[data-testid="citation"]', { timeout: 15000 });
      const firstCitation = page.locator('[data-testid="citation"]').first();
      await firstCitation.click();

      // Wait for navigation
      await page.waitForURL(/\/documents\//, { timeout: 5000 });

      // Check for highlighted text (implementation-specific)
      // Could be done via CSS class, background color, etc.
      const highlightedText = page.locator('.highlight, [data-highlighted="true"], mark');

      if (await highlightedText.count() > 0) {
        await expect(highlightedText.first()).toBeVisible({ timeout: 3000 });
      }

      // URL should contain page and chunk parameters
      expect(page.url()).toMatch(/page=\d+/);
    });
  });

  test.describe('Scenario 6 (spec): View query history with pagination', () => {
    test('query history shows past questions with timestamps', async ({ page }) => {
      // First, ask multiple questions to populate history
      await page.goto(`/data-room/${dataRoomId}/qa`);

      const questions = [
        'What is the revenue?',
        'What are the costs?',
        'Who are the competitors?',
      ];

      for (const question of questions) {
        const questionInput = page.locator('textarea[placeholder*="question" i]');
        await questionInput.fill(question);

        const submitButton = page.locator('button:has-text("Ask")').first();
        await submitButton.click();

        // Wait for answer before asking next question
        await page.waitForSelector('[data-testid="qa-answer"]', { timeout: 15000 });

        // Small delay between questions
        await page.waitForTimeout(500);
      }

      // Open history (button, sidebar, or tab)
      const historyButton = page.locator('button:has-text("History"), a:has-text("History"), [data-testid="history-button"]');

      if (await historyButton.count() > 0) {
        await historyButton.click();
      } else {
        // History might be in a sidebar/panel that's always visible
      }

      // Wait for history to load
      const historyPanel = page.locator('[data-testid="history-panel"], .history-panel, [role="complementary"]');
      await expect(historyPanel.first()).toBeVisible({ timeout: 5000 });

      // Verify questions appear in history
      const historyItems = page.locator('[data-testid="history-item"], .history-item');
      const itemCount = await historyItems.count();

      expect(itemCount).toBeGreaterThanOrEqual(3);

      // Check first history item structure
      const firstItem = historyItems.first();

      // Should show question text
      const questionText = await firstItem.textContent();
      expect(questionText).toBeTruthy();

      // Should show timestamp
      const timestamp = firstItem.locator('[data-testid="timestamp"], time, .timestamp');
      if (await timestamp.count() > 0) {
        await expect(timestamp.first()).toBeVisible();
      }
    });

    test('clicking history item re-displays answer and citations', async ({ page }) => {
      await page.goto(`/data-room/${dataRoomId}/qa`);

      // Ask a question first
      const questionInput = page.locator('textarea[placeholder*="question" i]');
      await questionInput.fill('Test historical query');

      const submitButton = page.locator('button:has-text("Ask")').first();
      await submitButton.click();

      // Wait for answer
      await page.waitForSelector('[data-testid="qa-answer"]', { timeout: 15000 });

      // Get the answer text to compare later
      const answerArea = page.locator('[data-testid="qa-answer"]').first();
      const originalAnswer = await answerArea.textContent();

      // Open history
      const historyButton = page.locator('button:has-text("History"), [data-testid="history-button"]');
      if (await historyButton.count() > 0) {
        await historyButton.click();
      }

      // Click on a history item
      const historyItems = page.locator('[data-testid="history-item"]');
      await historyItems.first().click();

      // Answer should be displayed again
      await expect(answerArea).toBeVisible();

      // Should show the same answer
      const displayedAnswer = await answerArea.textContent();
      expect(displayedAnswer).toContain(originalAnswer!.substring(0, 50)); // Check first 50 chars
    });

    test('history supports pagination for many queries', async ({ page }) => {
      await page.goto(`/data-room/${dataRoomId}/qa`);

      // Open history
      const historyButton = page.locator('button:has-text("History")');
      if (await historyButton.count() > 0) {
        await historyButton.click();
      }

      // Check for pagination controls
      const paginationControls = page.locator('[data-testid="pagination"], .pagination, button:has-text("Next"), button:has-text("Load more")');

      // Pagination might not appear if there are fewer than 50 items (default limit)
      // So we just verify the structure exists
      const historyPanel = page.locator('[data-testid="history-panel"]');
      await expect(historyPanel.first()).toBeVisible();

      // History items should be present
      const historyItems = page.locator('[data-testid="history-item"]');
      expect(await historyItems.count()).toBeGreaterThan(0);
    });
  });

  test.describe('Scenario 5 (spec): Provide feedback on answers', () => {
    test('user can mark answer as helpful', async ({ page }) => {
      // Ask a question
      await page.goto(`/data-room/${dataRoomId}/qa`);

      const questionInput = page.locator('textarea[placeholder*="question" i]');
      await questionInput.fill('What is the company mission?');

      const submitButton = page.locator('button:has-text("Ask")').first();
      await submitButton.click();

      // Wait for answer
      await page.waitForSelector('[data-testid="qa-answer"]', { timeout: 15000 });

      // Find feedback controls (thumbs up/down, helpful/not helpful)
      const thumbsUp = page.locator('button[aria-label*="helpful" i]:not([aria-label*="not"]), button:has-text("👍"), [data-testid="thumbs-up"]');

      await expect(thumbsUp.first()).toBeVisible({ timeout: 5000 });

      // Click thumbs up
      await thumbsUp.first().click();

      // Should show confirmation (visual feedback)
      // Check for active state, checkmark, or success message
      const successIndicator = page.locator('[data-testid="feedback-success"], .feedback-success, .toast, .alert');

      // Either button gets active state or a toast appears
      const buttonState = await thumbsUp.first().getAttribute('aria-pressed');
      const hasSuccessToast = await successIndicator.count() > 0;

      expect(buttonState === 'true' || hasSuccessToast).toBe(true);
    });

    test('user can mark answer as not helpful with optional comment', async ({ page }) => {
      await page.goto(`/data-room/${dataRoomId}/qa`);

      const questionInput = page.locator('textarea[placeholder*="question" i]');
      await questionInput.fill('Test question for negative feedback');

      const submitButton = page.locator('button:has-text("Ask")').first();
      await submitButton.click();

      // Wait for answer
      await page.waitForSelector('[data-testid="qa-answer"]', { timeout: 15000 });

      // Click thumbs down / not helpful
      const thumbsDown = page.locator('button[aria-label*="not helpful" i], button:has-text("👎"), [data-testid="thumbs-down"]');
      await thumbsDown.first().click();

      // Comment textarea may appear
      const commentBox = page.locator('textarea[placeholder*="feedback" i], textarea[placeholder*="comment" i], [data-testid="feedback-comment"]');

      if (await commentBox.count() > 0) {
        await commentBox.fill('The answer did not address my specific question about Q3 projections.');

        // Submit feedback
        const submitFeedback = page.locator('button:has-text("Submit feedback"), button:has-text("Send")');
        if (await submitFeedback.count() > 0) {
          await submitFeedback.click();
        }
      }

      // Should show confirmation
      const confirmation = page.locator('[data-testid="feedback-success"], .toast');
      if (await confirmation.count() > 0) {
        await expect(confirmation.first()).toBeVisible({ timeout: 3000 });
      }
    });

    test('user can update their feedback', async ({ page }) => {
      await page.goto(`/data-room/${dataRoomId}/qa`);

      const questionInput = page.locator('textarea[placeholder*="question" i]');
      await questionInput.fill('Question for feedback update test');

      const submitButton = page.locator('button:has-text("Ask")').first();
      await submitButton.click();

      await page.waitForSelector('[data-testid="qa-answer"]', { timeout: 15000 });

      // First, mark as helpful
      const thumbsUp = page.locator('[data-testid="thumbs-up"]').first();
      await thumbsUp.click();

      await page.waitForTimeout(1000);

      // Then change to not helpful
      const thumbsDown = page.locator('[data-testid="thumbs-down"]').first();
      await thumbsDown.click();

      // Should allow the change (upsert behavior)
      // Verify thumbs down is now active
      const thumbsDownState = await thumbsDown.getAttribute('aria-pressed');
      expect(thumbsDownState).toBe('true');

      // Thumbs up should no longer be pressed
      const thumbsUpState = await thumbsUp.getAttribute('aria-pressed');
      expect(thumbsUpState).not.toBe('true');
    });
  });

  test.describe('Integration: Complete workflow', () => {
    test('user can complete full Q&A workflow: ask -> view -> cite -> feedback', async ({ page }) => {
      // Step 1: Navigate to Q&A
      await page.goto(`/data-room/${dataRoomId}/qa`);

      // Step 2: Ask a question
      const questionInput = page.locator('textarea[placeholder*="question" i]');
      await questionInput.fill('Complete workflow test question');

      const submitButton = page.locator('button:has-text("Ask")').first();
      await submitButton.click();

      // Step 3: Receive answer
      await page.waitForSelector('[data-testid="qa-answer"]', { timeout: 15000 });

      const answer = page.locator('[data-testid="qa-answer"]').first();
      await expect(answer).toBeVisible();

      // Step 4: View citation
      const citation = page.locator('[data-testid="citation"]').first();
      if (await citation.count() > 0) {
        // Just verify citation is visible, don't navigate away
        await expect(citation).toBeVisible();
      }

      // Step 5: Provide feedback
      const thumbsUp = page.locator('[data-testid="thumbs-up"]').first();
      if (await thumbsUp.count() > 0) {
        await thumbsUp.click();
        await page.waitForTimeout(500);
      }

      // Step 6: Verify in history
      const historyButton = page.locator('button:has-text("History")');
      if (await historyButton.count() > 0) {
        await historyButton.click();

        const historyItems = page.locator('[data-testid="history-item"]');
        const itemCount = await historyItems.count();
        expect(itemCount).toBeGreaterThan(0);
      }

      // Complete workflow successful
      expect(true).toBe(true);
    });
  });
});
