import { test, expect } from '@playwright/test'

/**
 * T008: E2E Test - New User First Experience
 *
 * Objective: New user understands value and completes first action within 60 seconds
 *
 * Success Criteria:
 * - User completes first action (viewed search) within 60 seconds
 * - Value proposition clear within first 3 seconds
 * - No confusion about "what to do next"
 *
 * Expected: This test will FAIL initially (no dashboard-v2 implementation yet)
 */

test.describe('Dashboard: New User First Experience', () => {
  test.beforeEach(async ({ page }) => {
    // Create fresh test user account
    await page.goto('/login')

    // TODO: Create test user programmatically or use test account
    // For now, using demo account as proxy for new user
    await page.fill('[name="email"]', 'newuser@test.com')
    await page.fill('[name="password"]', 'Test123456!')
    await page.click('button[type="submit"]')

    // Wait for dashboard to load
    await page.waitForURL('/dashboard')
  })

  test('should show empty state guidance with clear CTA', async ({ page }) => {
    // Hero section should show welcome message
    const heroSection = page.locator('[data-testid="dashboard-hero"]')
    await expect(heroSection).toBeVisible({ timeout: 3000 })

    // Check for welcome message
    await expect(page.locator('text=/Welcome.*find your first opportunity/i')).toBeVisible()

    // Primary CTA should be prominent
    const primaryCTA = page.locator('[data-testid="primary-cta"]')
    await expect(primaryCTA).toBeVisible()
    await expect(primaryCTA).toContainText(/Start Discovery Search|Find Companies/i)

    // Optional tour link should be present
    await expect(page.locator('text=/Take.*tour/i')).toBeVisible()
  })

  test('should show helpful empty state messages (not just "0")', async ({ page }) => {
    // Empty state cards should have guidance, not depressing messages
    const emptyStateCards = page.locator('[data-testid="stat-card"]')
    const cardCount = await emptyStateCards.count()

    expect(cardCount).toBeGreaterThan(0)

    // Check that cards don't just show "0" - should have helpful text
    for (let i = 0; i < cardCount; i++) {
      const card = emptyStateCards.nth(i)
      const text = await card.textContent()

      // Should NOT just say "0" - should have context
      if (text?.includes('0')) {
        expect(text).toMatch(/Complete|Start|Try|Search/i)
      }
    }
  })

  test('should have no null or undefined errors', async ({ page }) => {
    // Check console for errors
    const consoleErrors: string[] = []
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })

    await page.waitForTimeout(2000) // Let dashboard fully render

    // Should not have null/undefined errors
    const nullErrors = consoleErrors.filter(err =>
      err.includes('null') || err.includes('undefined')
    )
    expect(nullErrors).toHaveLength(0)
  })

  test('should navigate to search page instantly (<100ms perceived)', async ({ page }) => {
    const primaryCTA = page.locator('[data-testid="primary-cta"]')

    // Measure navigation time
    const startTime = Date.now()
    await primaryCTA.click()

    // Should navigate to search
    await page.waitForURL('/search', { timeout: 1000 })
    const endTime = Date.now()

    // Navigation should feel instant (<100ms perceived, <1000ms actual)
    const navigationTime = endTime - startTime
    expect(navigationTime).toBeLessThan(1000)

    // Search page should load with placeholder
    await expect(page.locator('[placeholder*="Search" i]')).toBeVisible()
  })

  test('should remember state when returning to dashboard', async ({ page }) => {
    // Navigate to search
    await page.click('[data-testid="primary-cta"]')
    await page.waitForURL('/search')

    // Navigate back to dashboard
    await page.click('[href="/dashboard"]')
    await page.waitForURL('/dashboard')

    // Recent activity should show "Viewed search page"
    const recentActivity = page.locator('[data-testid="recent-activity"]')
    await expect(recentActivity).toContainText(/search/i, { timeout: 2000 })
  })

  test('should complete first action within 60 seconds', async ({ page }) => {
    const startTime = Date.now()

    // User journey: See value → Click CTA → Complete action
    await expect(page.locator('[data-testid="dashboard-hero"]')).toBeVisible()
    await page.click('[data-testid="primary-cta"]')
    await page.waitForURL('/search')

    const endTime = Date.now()
    const timeToFirstAction = (endTime - startTime) / 1000 // seconds

    // Should complete within 60 seconds
    expect(timeToFirstAction).toBeLessThan(60)

    // Ideally within 10 seconds for good UX
    if (timeToFirstAction < 10) {
      console.log(`✅ Excellent: First action completed in ${timeToFirstAction.toFixed(1)}s`)
    }
  })

  test('should show value proposition within 3 seconds', async ({ page }) => {
    const loadStart = Date.now()

    // Value proposition should be immediately visible
    const valueProps = [
      /Save.*hours.*research/i,
      /Find opportunities faster/i,
      /AI-powered/i,
      /Discover.*companies/i
    ]

    let foundValue = false
    for (const prop of valueProps) {
      const element = page.locator(`text=${prop}`).first()
      if (await element.isVisible()) {
        foundValue = true
        break
      }
    }

    const loadTime = (Date.now() - loadStart) / 1000
    expect(foundValue).toBe(true)
    expect(loadTime).toBeLessThan(3)
  })

  test('should have clear next steps (no confusion)', async ({ page }) => {
    // Dashboard should guide user on what to do
    const guidanceElements = [
      '[data-testid="primary-cta"]', // Primary action
      '[data-testid="quick-actions"]', // Quick actions
      'text=/Get started/i', // Onboarding prompt
      'text=/Next steps/i' // Explicit guidance
    ]

    let hasGuidance = false
    for (const selector of guidanceElements) {
      if (await page.locator(selector).isVisible()) {
        hasGuidance = true
        break
      }
    }

    expect(hasGuidance).toBe(true)
  })
})

/**
 * Expected Result: ❌ THESE TESTS SHOULD FAIL
 *
 * Failure reasons:
 * - No [data-testid="dashboard-hero"] element (not implemented)
 * - No [data-testid="primary-cta"] element (not implemented)
 * - No empty state guidance (current dashboard shows "0")
 * - No recent activity tracking (not implemented)
 *
 * These tests define the acceptance criteria for T054-T058 (Dashboard Integration)
 */
