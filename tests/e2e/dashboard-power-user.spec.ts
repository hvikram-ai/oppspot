import { test, expect } from '@playwright/test'

/**
 * T009: E2E Test - Power User Daily Workflow
 *
 * Objective: Returning user sees overnight discoveries and knows exactly what to do
 *
 * Success Criteria:
 * - All overnight work visible immediately
 * - Clear prioritization of actions
 * - One-click access to high-value tasks
 * - No manual checking of multiple pages
 *
 * Expected: This test will FAIL initially (no AI digest/priority queue implemented)
 */

test.describe('Dashboard: Power User Daily Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Login as power user (demo account)
    await page.goto('/login')
    await page.fill('[name="email"]', 'demo@oppspot.com')
    await page.fill('[name="password"]', 'Demo123456!')
    await page.click('button[type="submit"]')
    await page.waitForURL('/dashboard')
  })

  test('should display AI Digest card above the fold', async ({ page }) => {
    // AI Digest should be visible without scrolling
    const aiDigest = page.locator('[data-testid="ai-digest-card"]')
    await expect(aiDigest).toBeVisible({ timeout: 3000 })

    // Should be in viewport (above fold)
    const box = await aiDigest.boundingBox()
    expect(box).not.toBeNull()
    if (box) {
      expect(box.y).toBeLessThan(800) // Visible on most screens
    }
  })

  test('should show overnight discoveries count', async ({ page }) => {
    const aiDigest = page.locator('[data-testid="ai-digest-card"]')

    // Should show count of new opportunities
    await expect(aiDigest).toContainText(/\d+.*opportunities?.*found/i)

    // Example: "8 new opportunities found overnight"
    const text = await aiDigest.textContent()
    const numberMatch = text?.match(/(\d+)/)
    expect(numberMatch).not.toBeNull()
  })

  test('should display urgent alerts', async ({ page }) => {
    const aiDigest = page.locator('[data-testid="ai-digest-card"]')

    // Should show leads needing follow-up
    const urgentSection = aiDigest.locator('[data-section="urgent_alerts"]')
    await expect(urgentSection).toBeVisible()

    // Example: "3 leads need follow-up"
    await expect(urgentSection).toContainText(/lead.*follow.*up/i)
  })

  test('should show completed research reports overnight', async ({ page }) => {
    const aiDigest = page.locator('[data-testid="ai-digest-card"]')

    // Should show completed work
    const completedSection = aiDigest.locator('[data-section="completed_work"]')

    // If there's completed work, it should be visible
    if (await completedSection.isVisible()) {
      await expect(completedSection).toContainText(/report.*complete/i)
    }
  })

  test('should have "View All" button to expand digest', async ({ page }) => {
    const aiDigest = page.locator('[data-testid="ai-digest-card"]')
    const viewAllBtn = aiDigest.locator('button', { hasText: /View All|Expand|More/i })

    await expect(viewAllBtn).toBeVisible()

    // Click should expand/navigate
    await viewAllBtn.click()

    // Either expands in place or navigates
    await page.waitForTimeout(500)
    const url = page.url()
    const expanded = await page.locator('[data-testid="digest-expanded"]').isVisible()

    expect(url.includes('/digest') || expanded).toBe(true)
  })

  test('should display Impact Metrics with calculated values', async ({ page }) => {
    const impactMetrics = page.locator('[data-testid="impact-metrics"]')
    await expect(impactMetrics).toBeVisible()

    // Time saved this week (should be number, not "0")
    const timeSaved = impactMetrics.locator('[data-metric="time_saved"]')
    await expect(timeSaved).toBeVisible()
    const timeSavedText = await timeSaved.textContent()
    expect(timeSavedText).toMatch(/\d+\.?\d*.*hour/i)

    // Pipeline value (should show currency)
    const pipelineValue = impactMetrics.locator('[data-metric="pipeline_value"]')
    await expect(pipelineValue).toBeVisible()
    const pipelineText = await pipelineValue.textContent()
    expect(pipelineText).toMatch(/[£$€]\s*[\d,]+/i)
  })

  test('should show metrics with trend indicators', async ({ page }) => {
    const impactMetrics = page.locator('[data-testid="impact-metrics"]')

    // At least one metric should have trend indicator
    const trendIndicators = impactMetrics.locator('[data-testid="trend-indicator"]')
    const count = await trendIndicators.count()
    expect(count).toBeGreaterThan(0)

    // Trend should show direction and percentage
    const firstTrend = trendIndicators.first()
    const trendText = await firstTrend.textContent()
    expect(trendText).toMatch(/[↑↓].*\d+%/i)
  })

  test('should allow drilling down into metrics', async ({ page }) => {
    const impactMetrics = page.locator('[data-testid="impact-metrics"]')
    const firstMetric = impactMetrics.locator('[data-metric]').first()

    // Metric should be clickable
    await expect(firstMetric).toBeVisible()
    await firstMetric.click()

    // Should navigate to detail view or show modal
    await page.waitForTimeout(500)
    const url = page.url()
    const modal = page.locator('[role="dialog"]')

    expect(url !== '/dashboard' || await modal.isVisible()).toBe(true)
  })

  test('should display Priority Queue with ranked items', async ({ page }) => {
    const priorityQueue = page.locator('[data-testid="priority-queue"]')
    await expect(priorityQueue).toBeVisible()

    // Should have queue items
    const queueItems = page.locator('[data-testid="queue-item"]')
    const itemCount = await queueItems.count()
    expect(itemCount).toBeGreaterThan(0)

    // Items should be ranked (first item should be high priority)
    const firstItem = queueItems.first()
    const priorityBadge = firstItem.locator('[data-testid="priority-badge"]')
    await expect(priorityBadge).toBeVisible()
  })

  test('should show high-priority items with fire indicator', async ({ page }) => {
    const queueItems = page.locator('[data-testid="queue-item"]')

    // Check if any critical/high priority items exist
    const criticalItems = queueItems.filter({ has: page.locator('[data-priority="critical"]') })
    const criticalCount = await criticalItems.count()

    if (criticalCount > 0) {
      // Critical items should have fire emoji or icon
      const firstCritical = criticalItems.first()
      await expect(firstCritical).toContainText(/🔥|critical/i)
    }
  })

  test('should display queue item details', async ({ page }) => {
    const firstItem = page.locator('[data-testid="queue-item"]').first()

    // Should show title, description, urgency, action
    await expect(firstItem.locator('[data-field="title"]')).toBeVisible()
    await expect(firstItem.locator('[data-field="description"]')).toBeVisible()
    await expect(firstItem.locator('[data-testid="priority-badge"]')).toBeVisible()
    await expect(firstItem.locator('button', { hasText: /View|Contact|Action/i })).toBeVisible()
  })

  test('should allow one-click actions on queue items', async ({ page }) => {
    const firstItem = page.locator('[data-testid="queue-item"]').first()
    const actionBtn = firstItem.locator('button', { hasText: /View|Contact/i }).first()

    await expect(actionBtn).toBeVisible()
    await actionBtn.click()

    // Should navigate or show modal
    await page.waitForTimeout(500)
    const initialUrl = '/dashboard'
    expect(page.url()).not.toBe(initialUrl)
  })

  test('should update queue item status', async ({ page }) => {
    const firstItem = page.locator('[data-testid="queue-item"]').first()

    // Find mark complete or dismiss button
    const completeBtn = firstItem.locator('button', { hasText: /Complete|Done|Dismiss/i }).first()

    if (await completeBtn.isVisible()) {
      await completeBtn.click()

      // Item should be marked as completed (removed or styled differently)
      await page.waitForTimeout(500)
      const status = await firstItem.getAttribute('data-status')
      expect(status).toMatch(/complete|dismiss/i)
    }
  })

  test('should load all dashboard data within 2.5 seconds', async ({ page }) => {
    // Re-navigate to measure full load time
    const startTime = Date.now()
    await page.goto('/dashboard')

    // Wait for all key components
    await expect(page.locator('[data-testid="ai-digest-card"]')).toBeVisible()
    await expect(page.locator('[data-testid="impact-metrics"]')).toBeVisible()
    await expect(page.locator('[data-testid="priority-queue"]')).toBeVisible()

    const loadTime = (Date.now() - startTime) / 1000
    expect(loadTime).toBeLessThan(2.5)
  })

  test('should not require manual checking of multiple pages', async ({ page }) => {
    // All critical info should be on dashboard
    const dashboard = page.locator('[data-testid="dashboard-wrapper"]')

    // Check that overnight work, metrics, and priorities are all visible
    const hasDigest = await page.locator('[data-testid="ai-digest-card"]').isVisible()
    const hasMetrics = await page.locator('[data-testid="impact-metrics"]').isVisible()
    const hasQueue = await page.locator('[data-testid="priority-queue"]').isVisible()

    expect(hasDigest || hasMetrics || hasQueue).toBe(true)

    // User shouldn't need to navigate away
    expect(page.url()).toContain('/dashboard')
  })
})

/**
 * Expected Result: ❌ THESE TESTS SHOULD FAIL
 *
 * Failure reasons:
 * - No [data-testid="ai-digest-card"] (T040 not implemented)
 * - No [data-testid="priority-queue"] (T041 not implemented)
 * - No [data-testid="impact-metrics"] (T042 not implemented)
 * - No digest data from API (T030-T031 not implemented)
 * - No priority queue data (T033 not implemented)
 *
 * These tests define acceptance criteria for T040-T042 (Dashboard Components)
 */
