import { test, expect } from '@playwright/test'
import { 
  navigateToSearch, 
  performSearch, 
  applyFilter, 
  waitForDataLoad,
  TEST_BUSINESS 
} from './helpers/test-helpers'

test.describe('Search Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToSearch(page)
    await waitForDataLoad(page)
  })

  test.describe('Search Interface', () => {
    test('should display search page elements', async ({ page }) => {
      // Search bar
      await expect(page.locator('[placeholder*="Search"]')).toBeVisible()
      
      // Filters section
      await expect(page.locator('text=Filters')).toBeVisible()
      
      // Results section
      await expect(page.locator('[data-testid="search-results"]')).toBeVisible()
      
      // Sort options
      await expect(page.locator('text=Sort')).toBeVisible()
    })

    test('should display search suggestions on focus', async ({ page }) => {
      await page.click('[placeholder*="Search"]')
      await expect(page.locator('[data-testid="search-suggestions"]')).toBeVisible()
    })

    test('should clear search input', async ({ page }) => {
      const searchInput = page.locator('[placeholder*="Search"]')
      await searchInput.fill('test query')
      await expect(searchInput).toHaveValue('test query')
      
      await page.click('[data-testid="clear-search"]')
      await expect(searchInput).toHaveValue('')
    })
  })

  test.describe('Search Operations', () => {
    test('should perform basic text search', async ({ page }) => {
      await performSearch(page, 'technology')
      
      // Check that results are displayed
      const results = page.locator('[data-testid="search-result-item"]')
      await expect(results.first()).toBeVisible()
      
      // Check result count is displayed
      await expect(page.locator('text=/\\d+ results?/')).toBeVisible()
    })

    test('should show no results message for invalid search', async ({ page }) => {
      await performSearch(page, 'xyzabc123notfound')
      await expect(page.locator('text=No results found')).toBeVisible()
    })

    test('should search with multiple keywords', async ({ page }) => {
      await performSearch(page, 'tech london consulting')
      const results = page.locator('[data-testid="search-result-item"]')
      await expect(results.first()).toBeVisible()
    })

    test('should maintain search query in URL', async ({ page }) => {
      await performSearch(page, 'finance')
      await expect(page).toHaveURL(/[?&]q=finance/)
    })

    test('should perform search on Enter key', async ({ page }) => {
      await page.fill('[placeholder*="Search"]', 'healthcare')
      await page.press('[placeholder*="Search"]', 'Enter')
      await waitForDataLoad(page)
      
      const results = page.locator('[data-testid="search-result-item"]')
      await expect(results.first()).toBeVisible()
    })
  })

  test.describe('Filters', () => {
    test('should display filter categories', async ({ page }) => {
      await page.click('text=Filters')
      await expect(page.locator('text=Categories')).toBeVisible()
      await expect(page.locator('text=Location')).toBeVisible()
      await expect(page.locator('text=Rating')).toBeVisible()
      await expect(page.locator('text=Verified')).toBeVisible()
    })

    test('should filter by category', async ({ page }) => {
      await applyFilter(page, 'category', 'Technology')
      await waitForDataLoad(page)
      
      // Check that filtered results are shown
      const results = page.locator('[data-testid="search-result-item"]')
      await expect(results.first()).toBeVisible()
      
      // Check that category badge is shown
      await expect(page.locator('[data-testid="active-filter-Technology"]')).toBeVisible()
    })

    test('should filter by location', async ({ page }) => {
      await applyFilter(page, 'location', 'London')
      await waitForDataLoad(page)
      
      const results = page.locator('[data-testid="search-result-item"]')
      await expect(results.first()).toBeVisible()
    })

    test('should filter by minimum rating', async ({ page }) => {
      await page.click('[data-testid="filter-rating"]')
      await page.click('text=4+ stars')
      await waitForDataLoad(page)
      
      // Verify all results have 4+ rating
      const ratings = await page.locator('[data-testid="business-rating"]').allTextContents()
      ratings.forEach(rating => {
        const ratingValue = parseFloat(rating)
        expect(ratingValue).toBeGreaterThanOrEqual(4)
      })
    })

    test('should filter by verified businesses only', async ({ page }) => {
      await page.click('[data-testid="filter-verified"]')
      await waitForDataLoad(page)
      
      // Check that all results have verified badge
      const results = page.locator('[data-testid="search-result-item"]')
      const verifiedBadges = page.locator('[data-testid="verified-badge"]')
      
      const resultCount = await results.count()
      const badgeCount = await verifiedBadges.count()
      
      expect(resultCount).toBe(badgeCount)
    })

    test('should apply multiple filters', async ({ page }) => {
      await applyFilter(page, 'category', 'Technology')
      await applyFilter(page, 'location', 'London')
      await page.click('[data-testid="filter-verified"]')
      await waitForDataLoad(page)
      
      // Check that multiple filter badges are shown
      await expect(page.locator('[data-testid="active-filter-Technology"]')).toBeVisible()
      await expect(page.locator('[data-testid="active-filter-London"]')).toBeVisible()
      await expect(page.locator('[data-testid="active-filter-Verified"]')).toBeVisible()
    })

    test('should clear individual filters', async ({ page }) => {
      await applyFilter(page, 'category', 'Technology')
      await waitForDataLoad(page)
      
      await page.click('[data-testid="remove-filter-Technology"]')
      await waitForDataLoad(page)
      
      await expect(page.locator('[data-testid="active-filter-Technology"]')).not.toBeVisible()
    })

    test('should clear all filters', async ({ page }) => {
      await applyFilter(page, 'category', 'Technology')
      await applyFilter(page, 'location', 'London')
      await waitForDataLoad(page)
      
      await page.click('text=Clear all')
      await waitForDataLoad(page)
      
      await expect(page.locator('[data-testid*="active-filter"]')).not.toBeVisible()
    })
  })

  test.describe('Sorting', () => {
    test('should sort by relevance (default)', async ({ page }) => {
      await performSearch(page, 'business')
      await expect(page.locator('[data-testid="sort-relevance"]')).toHaveAttribute('aria-selected', 'true')
    })

    test('should sort by rating', async ({ page }) => {
      await performSearch(page, 'business')
      await page.click('[data-testid="sort-dropdown"]')
      await page.click('text=Highest Rating')
      await waitForDataLoad(page)
      
      // Get all ratings and verify they're in descending order
      const ratings = await page.locator('[data-testid="business-rating"]').allTextContents()
      const ratingValues = ratings.map(r => parseFloat(r))
      
      for (let i = 1; i < ratingValues.length; i++) {
        expect(ratingValues[i]).toBeLessThanOrEqual(ratingValues[i - 1])
      }
    })

    test('should sort alphabetically', async ({ page }) => {
      await performSearch(page, 'business')
      await page.click('[data-testid="sort-dropdown"]')
      await page.click('text=Name (A-Z)')
      await waitForDataLoad(page)
      
      const names = await page.locator('[data-testid="business-name"]').allTextContents()
      const sortedNames = [...names].sort()
      expect(names).toEqual(sortedNames)
    })

    test('should sort by distance when location is enabled', async ({ page }) => {
      // Enable location
      await page.click('[data-testid="enable-location"]')
      await page.context().grantPermissions(['geolocation'])
      await page.context().setGeolocation({ latitude: 51.5074, longitude: -0.1278 })
      
      await performSearch(page, 'business')
      await page.click('[data-testid="sort-dropdown"]')
      await page.click('text=Nearest')
      await waitForDataLoad(page)
      
      await expect(page.locator('[data-testid="distance-info"]').first()).toBeVisible()
    })
  })

  test.describe('Result Interactions', () => {
    test('should display business details in results', async ({ page }) => {
      await performSearch(page, 'technology')
      
      const firstResult = page.locator('[data-testid="search-result-item"]').first()
      await expect(firstResult.locator('[data-testid="business-name"]')).toBeVisible()
      await expect(firstResult.locator('[data-testid="business-description"]')).toBeVisible()
      await expect(firstResult.locator('[data-testid="business-location"]')).toBeVisible()
    })

    test('should save business from search results', async ({ page }) => {
      await performSearch(page, 'technology')
      
      const firstResult = page.locator('[data-testid="search-result-item"]').first()
      await firstResult.hover()
      await firstResult.locator('[data-testid="save-button"]').click()
      
      await expect(page.locator('text=Saved')).toBeVisible()
    })

    test('should navigate to business detail page', async ({ page }) => {
      await performSearch(page, 'technology')
      
      const firstBusinessName = await page.locator('[data-testid="business-name"]').first().textContent()
      await page.locator('[data-testid="business-name"]').first().click()
      
      await page.waitForURL(/\/business\//)
      await expect(page.locator('h1')).toContainText(firstBusinessName!)
    })

    test('should open business in new tab', async ({ page, context }) => {
      await performSearch(page, 'technology')
      
      // Listen for new page
      const pagePromise = context.waitForEvent('page')
      await page.locator('[data-testid="open-in-new-tab"]').first().click()
      const newPage = await pagePromise
      
      await newPage.waitForLoadState()
      await expect(newPage).toHaveURL(/\/business\//)
    })
  })

  test.describe('Export and Save', () => {
    test('should export search results as CSV', async ({ page }) => {
      await performSearch(page, 'technology')
      
      // Start waiting for download before clicking
      const downloadPromise = page.waitForEvent('download')
      await page.click('[data-testid="export-csv"]')
      const download = await downloadPromise
      
      expect(download.suggestedFilename()).toContain('.csv')
    })

    test('should save search query', async ({ page }) => {
      await performSearch(page, 'technology consulting')
      await page.click('[data-testid="save-search"]')
      
      await expect(page.locator('text=Search saved')).toBeVisible()
    })

    test('should select multiple results', async ({ page }) => {
      await performSearch(page, 'technology')
      
      // Select first 3 results
      await page.locator('[data-testid="select-result"]').nth(0).click()
      await page.locator('[data-testid="select-result"]').nth(1).click()
      await page.locator('[data-testid="select-result"]').nth(2).click()
      
      await expect(page.locator('text=3 selected')).toBeVisible()
    })

    test('should bulk save selected results', async ({ page }) => {
      await performSearch(page, 'technology')
      
      // Select results
      await page.locator('[data-testid="select-all"]').click()
      await page.click('[data-testid="bulk-save"]')
      
      await expect(page.locator('text=saved to list')).toBeVisible()
    })
  })

  test.describe('AI Search Mode', () => {
    test('should toggle AI search mode', async ({ page }) => {
      await page.click('[data-testid="ai-mode-toggle"]')
      await expect(page.locator('text=AI Mode')).toBeVisible()
      await expect(page.locator('[placeholder*="natural language"]')).toBeVisible()
    })

    test('should perform AI-powered search', async ({ page }) => {
      await page.click('[data-testid="ai-mode-toggle"]')
      await page.fill('[placeholder*="natural language"]', 'Find eco-friendly cafes with vegan options near me')
      await page.press('[placeholder*="natural language"]', 'Enter')
      await waitForDataLoad(page)
      
      const results = page.locator('[data-testid="search-result-item"]')
      await expect(results.first()).toBeVisible()
    })
  })
})