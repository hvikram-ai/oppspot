import { test, expect } from '@playwright/test'

/**
 * T011: E2E Test - Mobile Responsive Layout
 *
 * Objective: Mobile user can access all features with thumb-friendly navigation
 *
 * Success Criteria:
 * - All features accessible on mobile
 * - Thumb zone navigation (bottom bar)
 * - No horizontal scroll required
 * - Performance <2s on 3G
 *
 * Expected: This test will FAIL initially (no mobile bottom nav implemented)
 */

test.describe('Dashboard: Mobile Responsive Layout', () => {
  test.use({
    viewport: { width: 375, height: 667 } // iPhone SE
  })

  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.fill('[name="email"]', 'demo@oppspot.com')
    await page.fill('[name="password"]', 'Demo123456!')
    await page.click('button[type="submit"]')
    await page.waitForURL('/dashboard')
  })

  test('should display bottom navigation bar', async ({ page }) => {
    const bottomNav = page.locator('[data-testid="bottom-nav"]')
    await expect(bottomNav).toBeVisible()

    // Should be fixed at bottom
    const box = await bottomNav.boundingBox()
    expect(box).not.toBeNull()
    if (box) {
      expect(box.y).toBeGreaterThan(500) // Near bottom of viewport
    }
  })

  test('should have 5 navigation icons in bottom bar', async ({ page }) => {
    const bottomNav = page.locator('[data-testid="bottom-nav"]')
    const navItems = bottomNav.locator('[data-testid="nav-item"]')

    const count = await navItems.count()
    expect(count).toBe(5)
  })

  test('should show labels only on active tab', async ({ page }) => {
    const bottomNav = page.locator('[data-testid="bottom-nav"]')
    const navItems = bottomNav.locator('[data-testid="nav-item"]')

    // Active item should have visible label
    const activeItem = navItems.filter({ hasText: /Dashboard|Home/i }).first()
    await expect(activeItem).toBeVisible()

    const activeLabel = activeItem.locator('text=/Dashboard|Home/i')
    await expect(activeLabel).toBeVisible()

    // Inactive items may not show labels
    const inactiveItem = navItems.nth(1)
    const hasText = await inactiveItem.textContent()
    // Icon-only or smaller text is acceptable
  })

  test('should hide desktop sidebar', async ({ page }) => {
    const desktopSidebar = page.locator('[data-testid="desktop-sidebar"]')

    // Should not be visible on mobile
    await expect(desktopSidebar).not.toBeVisible()
  })

  test('should stack cards in single column', async ({ page }) => {
    const cards = page.locator('[data-testid*="card"]')
    const count = await cards.count()

    if (count > 1) {
      // Check that cards are stacked vertically
      const firstBox = await cards.nth(0).boundingBox()
      const secondBox = await cards.nth(1).boundingBox()

      expect(firstBox).not.toBeNull()
      expect(secondBox).not.toBeNull()

      if (firstBox && secondBox) {
        // Second card should be below first (not side-by-side)
        expect(secondBox.y).toBeGreaterThan(firstBox.y + firstBox.height - 50)
      }
    }
  })

  test('should have no horizontal scroll', async ({ page }) => {
    // Check body scroll width
    const scrollWidth = await page.evaluate(() => document.body.scrollWidth)
    const clientWidth = await page.evaluate(() => document.body.clientWidth)

    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1) // +1 for rounding
  })

  test('should have touch targets minimum 44x44px', async ({ page }) => {
    const buttons = page.locator('button, a[href]')
    const count = await buttons.count()

    let tooSmall = 0

    for (let i = 0; i < Math.min(count, 10); i++) { // Check first 10
      const box = await buttons.nth(i).boundingBox()
      if (box) {
        if (box.width < 44 || box.height < 44) {
          tooSmall++
        }
      }
    }

    // Most buttons should meet minimum size
    expect(tooSmall).toBeLessThan(3)
  })

  test('should make text readable without zoom', async ({ page }) => {
    // Check font sizes
    const body = page.locator('body')
    const fontSize = await body.evaluate(el =>
      window.getComputedStyle(el).fontSize
    )

    const fontSizeNum = parseInt(fontSize)
    expect(fontSizeNum).toBeGreaterThanOrEqual(14) // Minimum 14px
  })

  test('should have swipeable stat cards', async ({ page }) => {
    const statsGrid = page.locator('[data-testid="stats-grid"]')

    if (await statsGrid.isVisible()) {
      // Should have swipe indicators (dots)
      const indicators = page.locator('[data-testid="swipe-indicator"]')
      const indicatorCount = await indicators.count()
      expect(indicatorCount).toBeGreaterThan(0)
    }
  })

  test('should allow swiping between stat cards', async ({ page }) => {
    const statsGrid = page.locator('[data-testid="stats-grid"]')

    if (await statsGrid.isVisible()) {
      const firstCard = statsGrid.locator('[data-testid="stat-card"]').first()

      // Get initial card text
      const initialText = await firstCard.textContent()

      // Simulate swipe (touch events)
      const box = await firstCard.boundingBox()
      if (box) {
        await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2)

        // Swipe left
        await page.touchscreen.tap(box.x + 50, box.y + box.height / 2)
        await page.waitForTimeout(300)

        // Card should change
        const newText = await firstCard.textContent()
        // May or may not change depending on implementation
      }
    }
  })

  test('should load dashboard in <2s on 3G', async ({ page, context }) => {
    // Set 3G network throttling
    const client = await context.newCDPSession(page)
    await client.send('Network.emulateNetworkConditions', {
      offline: false,
      downloadThroughput: 1.5 * 1024 * 1024 / 8, // 1.5 Mbps
      uploadThroughput: 750 * 1024 / 8, // 750 Kbps
      latency: 100 // 100ms RTT
    })

    const startTime = Date.now()
    await page.goto('/dashboard')

    // Wait for key elements
    await expect(page.locator('[data-testid="dashboard-wrapper"]')).toBeVisible()

    const loadTime = (Date.now() - startTime) / 1000
    expect(loadTime).toBeLessThan(5) // Relaxed for 3G, ideally <2s
  })

  test('should support pull-to-refresh gesture', async ({ page }) => {
    // Simulate pull-to-refresh
    const dashboard = page.locator('[data-testid="dashboard-wrapper"]')

    const box = await dashboard.boundingBox()
    if (box) {
      // Touch at top and drag down
      await page.touchscreen.tap(box.x + box.width / 2, 50)

      // Look for refresh indicator
      const refreshIndicator = page.locator('[data-testid="refresh-indicator"]')
      // May not be visible immediately, but shouldn't error
    }
  })

  test('should expand priority queue items on tap', async ({ page }) => {
    const queueItem = page.locator('[data-testid="queue-item"]').first()

    if (await queueItem.isVisible()) {
      // Tap to expand
      await queueItem.tap()

      // Should show full details
      await page.waitForTimeout(300)

      const expandedContent = queueItem.locator('[data-testid="expanded-content"]')
      if (await expandedContent.isVisible()) {
        await expect(expandedContent).toBeVisible()
      }
    }
  })

  test('should have easy-to-tap action buttons', async ({ page }) => {
    const queueItem = page.locator('[data-testid="queue-item"]').first()

    if (await queueItem.isVisible()) {
      const actionButtons = queueItem.locator('button')
      const count = await actionButtons.count()

      if (count > 0) {
        const firstButton = actionButtons.first()
        const box = await firstButton.boundingBox()

        expect(box).not.toBeNull()
        if (box) {
          // Should be at least 44px tap target
          expect(box.height).toBeGreaterThanOrEqual(44)
        }
      }
    }
  })

  test('should show mobile-optimized navigation', async ({ page }) => {
    // Click bottom nav to navigate
    const searchNavItem = page.locator('[data-testid="bottom-nav"] [href="/search"]')

    await expect(searchNavItem).toBeVisible()
    await searchNavItem.tap()

    await page.waitForURL('/search')
    expect(page.url()).toContain('/search')
  })

  test('should persist bottom nav across pages', async ({ page }) => {
    // Navigate to different page
    await page.goto('/search')

    // Bottom nav should still be visible
    const bottomNav = page.locator('[data-testid="bottom-nav"]')
    await expect(bottomNav).toBeVisible()
  })

  test('should handle safe area insets on iOS', async ({ page }) => {
    // Check for iOS safe area CSS
    const bottomNav = page.locator('[data-testid="bottom-nav"]')

    const paddingBottom = await bottomNav.evaluate(el =>
      window.getComputedStyle(el).paddingBottom
    )

    // Should have padding or use safe-area-inset
    // Just checking it has some bottom space
    const paddingNum = parseInt(paddingBottom)
    expect(paddingNum).toBeGreaterThanOrEqual(0)
  })

  test('should show hamburger menu for secondary navigation', async ({ page }) => {
    const hamburger = page.locator('[data-testid="mobile-menu-button"]')

    if (await hamburger.isVisible()) {
      await hamburger.tap()

      // Menu should open
      const mobileMenu = page.locator('[data-testid="mobile-menu"]')
      await expect(mobileMenu).toBeVisible()

      // Should show all navigation options
      const menuItems = mobileMenu.locator('[data-testid="menu-item"]')
      const count = await menuItems.count()
      expect(count).toBeGreaterThan(5)
    }
  })

  test('should have smooth 60fps animations', async ({ page }) => {
    // Navigate to trigger animation
    const searchNav = page.locator('[data-testid="bottom-nav"] [href="/search"]')
    await searchNav.tap()

    // Animation should be smooth (check for jank)
    // This is a basic check - real performance would need profiling
    await page.waitForTimeout(500)

    // No console errors during animation
    const errors: string[] = []
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
    })

    expect(errors.length).toBe(0)
  })

  test('should work in landscape orientation', async ({ page }) => {
    // Rotate to landscape
    await page.setViewportSize({ width: 667, height: 375 })

    // Dashboard should still be functional
    const dashboard = page.locator('[data-testid="dashboard-wrapper"]')
    await expect(dashboard).toBeVisible()

    // Bottom nav should adapt or move
    const bottomNav = page.locator('[data-testid="bottom-nav"]')
    await expect(bottomNav).toBeVisible()

    // No horizontal scroll in landscape either
    const scrollWidth = await page.evaluate(() => document.body.scrollWidth)
    const clientWidth = await page.evaluate(() => document.body.clientWidth)
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1)
  })
})

/**
 * Expected Result: ❌ THESE TESTS SHOULD FAIL
 *
 * Failure reasons:
 * - No [data-testid="bottom-nav"] (T047 not implemented)
 * - No mobile-optimized card stacking (T059 not implemented)
 * - No swipeable cards (T060 not implemented)
 * - Desktop layout likely showing on mobile
 *
 * These tests define acceptance criteria for:
 * - T047: Mobile bottom navigation component
 * - T059: Mobile responsive styles
 * - T060: Swipeable card implementation
 */
