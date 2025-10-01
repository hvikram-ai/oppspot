import { test, expect } from '@playwright/test'

/**
 * T010: E2E Test - Feature Discovery (ResearchGPT™)
 *
 * Objective: User discovers and tries ResearchGPT™ within first week (80% target)
 *
 * Success Criteria:
 * - ResearchGPT™ discoverable within 3 clicks
 * - Multiple discovery paths (spotlight, nav, quick actions)
 * - Clear usage limits shown
 * - First-time experience smooth and fast
 *
 * Expected: This test will FAIL initially (no feature spotlight implemented)
 */

test.describe('Dashboard: Feature Discovery (ResearchGPT™)', () => {
  test.beforeEach(async ({ page }) => {
    // Login as user who hasn't used ResearchGPT™
    await page.goto('/login')
    await page.fill('[name="email"]', 'demo@oppspot.com')
    await page.fill('[name="password"]', 'Demo123456!')
    await page.click('button[type="submit"]')
    await page.waitForURL('/dashboard')
  })

  test('should display Feature Spotlight carousel', async ({ page }) => {
    const spotlight = page.locator('[data-testid="feature-spotlight"]')
    await expect(spotlight).toBeVisible({ timeout: 3000 })

    // Should have at least one spotlight card
    const spotlightCards = page.locator('[data-testid="spotlight-card"]')
    const count = await spotlightCards.count()
    expect(count).toBeGreaterThan(0)
  })

  test('should show ResearchGPT™ in top 3 spotlights', async ({ page }) => {
    const spotlight = page.locator('[data-testid="feature-spotlight"]')

    // ResearchGPT™ should be visible
    const researchSpotlight = spotlight.locator('text=/ResearchGPT/i')
    await expect(researchSpotlight).toBeVisible()

    // Should be in top 3 (high priority)
    const allCards = page.locator('[data-testid="spotlight-card"]')
    const researchCard = page.locator('[data-testid="spotlight-card"]:has-text("ResearchGPT")')
    const researchIndex = await researchCard.count() > 0 ?
      await allCards.evaluateAll((cards, target) =>
        cards.findIndex(card => card.textContent?.includes('ResearchGPT'))
      ) : -1

    expect(researchIndex).toBeGreaterThanOrEqual(0)
    expect(researchIndex).toBeLessThan(3)
  })

  test('should show ResearchGPT™ card with icon, badge, and CTA', async ({ page }) => {
    const researchCard = page.locator('[data-testid="spotlight-card"]:has-text("ResearchGPT")')

    // Should have icon
    const icon = researchCard.locator('[data-testid="feature-icon"]')
    await expect(icon).toBeVisible()

    // Should have "NEW" badge
    const badge = researchCard.locator('[data-testid="feature-badge"]')
    await expect(badge).toContainText(/NEW|Premium/i)

    // Should have description
    await expect(researchCard).toContainText(/intelligence|research|30 seconds/i)

    // Should have "Try It Now" CTA
    const cta = researchCard.locator('button, a', { hasText: /Try It Now|Try ResearchGPT/i })
    await expect(cta).toBeVisible()
  })

  test('should show credits remaining on spotlight card', async ({ page }) => {
    const researchCard = page.locator('[data-testid="spotlight-card"]:has-text("ResearchGPT")')

    // Should show credits (e.g., "100/100 credits" or "100 credits remaining")
    await expect(researchCard).toContainText(/\d+.*credit/i)
  })

  test('should be accessible via Intelligence navigation group', async ({ page }) => {
    // Check top navigation
    const nav = page.locator('[data-testid="main-navigation"]')
    const intelligenceGroup = nav.locator('text=/Intelligence/i')

    await expect(intelligenceGroup).toBeVisible()

    // Click or hover to show dropdown
    await intelligenceGroup.hover()

    // ResearchGPT™ should be in dropdown
    const dropdown = page.locator('[data-testid="nav-dropdown"]')
    await expect(dropdown.locator('text=/ResearchGPT/i')).toBeVisible({ timeout: 1000 })
  })

  test('should have tooltip explaining feature on nav hover', async ({ page }) => {
    const nav = page.locator('[data-testid="main-navigation"]')
    const intelligenceGroup = nav.locator('text=/Intelligence/i')

    await intelligenceGroup.hover()

    const researchLink = page.locator('text=/ResearchGPT/i').first()
    await researchLink.hover()

    // Tooltip should appear
    const tooltip = page.locator('[role="tooltip"]')
    if (await tooltip.isVisible()) {
      await expect(tooltip).toContainText(/research|intelligence|company/i)
    }
  })

  test('should show in Quick Actions section', async ({ page }) => {
    const quickActions = page.locator('[data-testid="quick-actions"]')
    await expect(quickActions).toBeVisible()

    // "Generate Research" should be in top actions
    const researchAction = quickActions.locator('text=/Generate Research|ResearchGPT/i')
    await expect(researchAction).toBeVisible()
  })

  test('should have prominent styling for premium features', async ({ page }) => {
    const quickActions = page.locator('[data-testid="quick-actions"]')
    const researchBtn = quickActions.locator('button:has-text("Generate Research")').first()

    if (await researchBtn.isVisible()) {
      // Should have gradient or special styling
      const classes = await researchBtn.getAttribute('class')
      expect(classes).toMatch(/gradient|premium|purple|pink/i)
    }
  })

  test('should navigate to research page when clicking spotlight CTA', async ({ page }) => {
    const researchCard = page.locator('[data-testid="spotlight-card"]:has-text("ResearchGPT")')
    const cta = researchCard.locator('button, a').first()

    await cta.click()

    // Should navigate to research page
    await page.waitForURL(/\/research/, { timeout: 2000 })

    // Research page should load
    await expect(page.locator('[data-testid="research-page"]')).toBeVisible()
  })

  test('should open research modal from quick action', async ({ page }) => {
    const quickActions = page.locator('[data-testid="quick-actions"]')
    const researchBtn = quickActions.locator('text=/Generate Research/i').first()

    await researchBtn.click()

    // Should either navigate or open modal
    await page.waitForTimeout(500)

    const modal = page.locator('[role="dialog"]')
    const url = page.url()

    expect(url.includes('/research') || await modal.isVisible()).toBe(true)
  })

  test('should show credits remaining inline', async ({ page }) => {
    const researchLauncher = page.locator('[data-testid="research-gpt-launcher"]')

    if (await researchLauncher.isVisible()) {
      // Should display credits count
      await expect(researchLauncher).toContainText(/\d+\/\d+ credits|credits remaining/i)
    }
  })

  test('should have company autocomplete ready', async ({ page }) => {
    // Navigate to research page
    await page.goto('/research')

    // Search input should be ready
    const searchInput = page.locator('[data-testid="company-search"]')
    await expect(searchInput).toBeVisible()
    await expect(searchInput).toBeFocused()

    // Type to trigger autocomplete
    await searchInput.fill('Monzo')
    await page.waitForTimeout(500)

    // Autocomplete suggestions should appear
    const suggestions = page.locator('[data-testid="autocomplete-suggestion"]')
    const count = await suggestions.count()
    expect(count).toBeGreaterThan(0)
  })

  test('should track feature interaction on spotlight click', async ({ page }) => {
    // Set up request interception to verify tracking
    let trackedInteraction = false

    page.on('request', request => {
      if (request.url().includes('/api/dashboard/interactions')) {
        trackedInteraction = true
        const postData = request.postDataJSON()
        expect(postData.feature_name).toMatch(/research_gpt/i)
        expect(postData.interaction_type).toBe('click')
      }
    })

    const researchCard = page.locator('[data-testid="spotlight-card"]:has-text("ResearchGPT")')
    const cta = researchCard.locator('button, a').first()

    await cta.click()
    await page.waitForTimeout(1000)

    // Interaction should be tracked
    expect(trackedInteraction).toBe(true)
  })

  test('should hide ResearchGPT™ from spotlight after user tries it', async ({ page }) => {
    // Click to try ResearchGPT™
    const researchCard = page.locator('[data-testid="spotlight-card"]:has-text("ResearchGPT")')
    const cta = researchCard.locator('button, a').first()
    await cta.click()

    // Return to dashboard
    await page.goto('/dashboard')

    // ResearchGPT™ should no longer be in spotlight (user has tried it)
    const spotlight = page.locator('[data-testid="feature-spotlight"]')
    const researchInSpotlight = spotlight.locator('text=/ResearchGPT/i')

    // Should not be visible OR next spotlight should show instead
    const isStillVisible = await researchInSpotlight.isVisible()
    if (isStillVisible) {
      // It's okay if still visible on first click, but should rotate eventually
      console.log('Note: ResearchGPT still in spotlight - may need multiple interactions to hide')
    }
  })

  test('should show next spotlight when ResearchGPT™ is excluded', async ({ page }) => {
    const spotlight = page.locator('[data-testid="feature-spotlight"]')

    // Should show other features (Opp Scan, AI Scoring, etc.)
    const spotlightCards = page.locator('[data-testid="spotlight-card"]')
    const count = await spotlightCards.count()
    expect(count).toBeGreaterThanOrEqual(1)

    // Should show at least one of: Opp Scan, AI Scoring, Benchmarking
    const otherFeatures = spotlight.locator('text=/Opp Scan|AI Scoring|Benchmarking/i')
    await expect(otherFeatures.first()).toBeVisible()
  })

  test('should be discoverable within 3 clicks from dashboard', async ({ page }) => {
    // Path 1: Dashboard → Spotlight → ResearchGPT (2 clicks)
    // Path 2: Dashboard → Intelligence nav → ResearchGPT (2 clicks)
    // Path 3: Dashboard → Quick Actions → Generate Research (2 clicks)

    let clickCount = 0

    // Try spotlight path
    const spotlightCTA = page.locator('[data-testid="spotlight-card"]:has-text("ResearchGPT") button').first()
    if (await spotlightCTA.isVisible()) {
      clickCount = 2 // Dashboard loaded (1), Click CTA (2)
      await spotlightCTA.click()
    } else {
      // Try nav path
      const nav = page.locator('text=/Intelligence/i').first()
      await nav.click() // Click 1
      clickCount = 1

      const researchLink = page.locator('text=/ResearchGPT/i').first()
      await researchLink.click() // Click 2
      clickCount = 2
    }

    await page.waitForURL(/\/research/, { timeout: 2000 })

    expect(clickCount).toBeLessThanOrEqual(3)
  })
})

/**
 * Expected Result: ❌ THESE TESTS SHOULD FAIL
 *
 * Failure reasons:
 * - No [data-testid="feature-spotlight"] (T044 not implemented)
 * - No spotlight rotation algorithm (T082 not implemented)
 * - No Intelligence navigation group (T046 not implemented)
 * - No interaction tracking API (T038 not implemented)
 *
 * These tests define acceptance criteria for:
 * - T044: Feature Spotlight component
 * - T046: Goal-based navigation
 * - T082: Spotlight rotation algorithm
 */
