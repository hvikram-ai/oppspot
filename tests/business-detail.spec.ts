import { test, expect } from '@playwright/test'
import { 
  viewBusinessDetails,
  waitForDataLoad,
  waitForMapLoad,
  expectNotification
} from './helpers/test-helpers'

test.describe('Business Detail Page', () => {
  // Use a known business ID or navigate from search
  test.beforeEach(async ({ page }) => {
    // Navigate to search and click first business
    await page.goto('/search')
    await page.fill('[placeholder*="Search"]', 'technology')
    await page.press('[placeholder*="Search"]', 'Enter')
    await waitForDataLoad(page)
    
    // Click first business to go to detail page
    await page.locator('[data-testid="business-name"]').first().click()
    await page.waitForURL(/\/business\//)
    await waitForDataLoad(page)
  })

  test.describe('Page Layout', () => {
    test('should display breadcrumb navigation', async ({ page }) => {
      await expect(page.locator('nav[aria-label="Breadcrumb"]')).toBeVisible()
      await expect(page.locator('text=Home')).toBeVisible()
      await expect(page.locator('text=Search')).toBeVisible()
    })

    test('should display business header', async ({ page }) => {
      await expect(page.locator('h1')).toBeVisible()
      await expect(page.locator('[data-testid="business-header"]')).toBeVisible()
    })

    test('should display main content sections', async ({ page }) => {
      // Business info section
      await expect(page.locator('text=Business Information')).toBeVisible()
      
      // Contact section
      await expect(page.locator('text=Contact Information')).toBeVisible()
      
      // Location section (if coordinates exist)
      const locationSection = page.locator('text=Location')
      if (await locationSection.isVisible()) {
        await expect(locationSection).toBeVisible()
      }
    })

    test('should display sidebar actions', async ({ page }) => {
      await expect(page.locator('text=Actions')).toBeVisible()
      await expect(page.locator('button:has-text("Save Business")')).toBeVisible()
      await expect(page.locator('button:has-text("Share")')).toBeVisible()
    })
  })

  test.describe('Business Information', () => {
    test('should display business name and verification status', async ({ page }) => {
      const businessName = await page.locator('h1').textContent()
      expect(businessName).toBeTruthy()
      
      // Check for verification badge if verified
      const verifiedBadge = page.locator('[data-testid="verified-badge"]')
      if (await verifiedBadge.isVisible()) {
        await expect(verifiedBadge).toContainText('Verified')
      }
    })

    test('should display business categories', async ({ page }) => {
      const categories = page.locator('[data-testid="business-categories"] .badge')
      const count = await categories.count()
      expect(count).toBeGreaterThan(0)
    })

    test('should display business rating if available', async ({ page }) => {
      const rating = page.locator('[data-testid="business-rating"]')
      if (await rating.isVisible()) {
        const ratingText = await rating.textContent()
        expect(ratingText).toMatch(/\d(\.\d)?/)
      }
    })

    test('should display business description', async ({ page }) => {
      const description = page.locator('[data-testid="business-description"]')
      if (await description.isVisible()) {
        const text = await description.textContent()
        expect(text).toBeTruthy()
      }
    })

    test('should switch between info tabs', async ({ page }) => {
      // Click on Hours tab
      await page.click('text=Hours')
      await expect(page.locator('text=/Monday|Tuesday|Wednesday/')).toBeVisible()
      
      // Click on Details tab
      await page.click('text=Details')
      await expect(page.locator('text=/Listed Since|Last Updated/')).toBeVisible()
      
      // Click back to Overview
      await page.click('text=Overview')
    })
  })

  test.describe('Contact Information', () => {
    test('should display phone numbers if available', async ({ page }) => {
      const phoneSection = page.locator('text=Phone').locator('..')
      if (await phoneSection.isVisible()) {
        const phoneNumber = await phoneSection.locator('a[href^="tel:"]').textContent()
        expect(phoneNumber).toMatch(/[\d\s\-\+\(\)]+/)
      }
    })

    test('should display email addresses if available', async ({ page }) => {
      const emailSection = page.locator('text=Email').locator('..')
      if (await emailSection.isVisible()) {
        const email = await emailSection.locator('a[href^="mailto:"]').textContent()
        expect(email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)
      }
    })

    test('should display website if available', async ({ page }) => {
      const websiteSection = page.locator('text=Website').locator('..')
      if (await websiteSection.isVisible()) {
        const website = await websiteSection.locator('a[target="_blank"]').getAttribute('href')
        expect(website).toMatch(/^https?:\/\//)
      }
    })

    test('should display address if available', async ({ page }) => {
      const addressSection = page.locator('text=Address').locator('..')
      if (await addressSection.isVisible()) {
        const addressText = await addressSection.textContent()
        expect(addressText).toBeTruthy()
      }
    })

    test('should copy contact information to clipboard', async ({ page }) => {
      const copyButton = page.locator('[data-testid="copy-button"]').first()
      if (await copyButton.isVisible()) {
        await copyButton.click()
        await expectNotification(page, 'Copied')
      }
    })

    test('should open directions in new tab', async ({ page, context }) => {
      const directionsButton = page.locator('button:has-text("Get Directions")')
      if (await directionsButton.isVisible()) {
        const pagePromise = context.waitForEvent('page')
        await directionsButton.click()
        const newPage = await pagePromise
        await expect(newPage).toHaveURL(/maps\.google\.com|maps\.apple\.com/)
      }
    })
  })

  test.describe('Location Map', () => {
    test('should display location map if coordinates available', async ({ page }) => {
      const mapContainer = page.locator('.leaflet-container')
      if (await mapContainer.isVisible()) {
        await waitForMapLoad(page)
        await expect(mapContainer).toBeVisible()
        
        // Should have a marker
        await expect(page.locator('.leaflet-marker-icon')).toBeVisible()
      }
    })

    test('should show popup on marker click', async ({ page }) => {
      const mapContainer = page.locator('.leaflet-container')
      if (await mapContainer.isVisible()) {
        await page.locator('.leaflet-marker-icon').click()
        await expect(page.locator('.leaflet-popup')).toBeVisible()
      }
    })
  })

  test.describe('Business Actions', () => {
    test('should save business', async ({ page }) => {
      await page.click('button:has-text("Save Business")')
      await expect(page.locator('button:has-text("Saved")')).toBeVisible()
    })

    test('should unsave business', async ({ page }) => {
      // First save
      await page.click('button:has-text("Save Business")')
      await expect(page.locator('button:has-text("Saved")')).toBeVisible()
      
      // Then unsave
      await page.click('button:has-text("Saved")')
      await expect(page.locator('button:has-text("Save Business")')).toBeVisible()
    })

    test('should open share menu', async ({ page }) => {
      await page.click('button:has-text("Share")')
      await expect(page.locator('text=Facebook')).toBeVisible()
      await expect(page.locator('text=Twitter')).toBeVisible()
      await expect(page.locator('text=LinkedIn')).toBeVisible()
      await expect(page.locator('text=Copy Link')).toBeVisible()
    })

    test('should copy share link', async ({ page }) => {
      await page.click('button:has-text("Share")')
      await page.click('text=Copy Link')
      await expectNotification(page, 'copied')
    })

    test('should share on social media', async ({ page, context }) => {
      await page.click('button:has-text("Share")')
      
      // Test Facebook share
      const pagePromise = context.waitForEvent('page')
      await page.click('text=Facebook')
      const newPage = await pagePromise
      await expect(newPage).toHaveURL(/facebook\.com/)
      await newPage.close()
    })

    test('should open more actions menu', async ({ page }) => {
      await page.click('[data-testid="more-actions"]')
      await expect(page.locator('text=Print')).toBeVisible()
      await expect(page.locator('text=Export as PDF')).toBeVisible()
      await expect(page.locator('text=Export as CSV')).toBeVisible()
      await expect(page.locator('text=Suggest Edit')).toBeVisible()
      await expect(page.locator('text=Report Issue')).toBeVisible()
    })

    test('should trigger print dialog', async ({ page }) => {
      await page.click('[data-testid="more-actions"]')
      
      // Listen for print dialog
      page.on('dialog', dialog => dialog.accept())
      await page.click('text=Print')
    })

    test('should export as PDF', async ({ page }) => {
      await page.click('[data-testid="more-actions"]')
      
      const downloadPromise = page.waitForEvent('download')
      await page.click('text=Export as PDF')
      const download = await downloadPromise
      
      expect(download.suggestedFilename()).toContain('.pdf')
    })

    test('should open write review modal', async ({ page }) => {
      await page.click('button:has-text("Write Review")')
      await expect(page.locator('[data-testid="review-modal"]')).toBeVisible()
    })

    test('should add to comparison', async ({ page }) => {
      await page.click('button:has-text("Add to Compare")')
      await expectNotification(page, 'Added to comparison')
    })
  })

  test.describe('Related Businesses', () => {
    test('should display related businesses section', async ({ page }) => {
      const relatedSection = page.locator('text=Similar Businesses')
      if (await relatedSection.isVisible()) {
        await expect(relatedSection).toBeVisible()
        
        // Should show business cards
        const relatedBusinesses = page.locator('[data-testid="related-business-card"]')
        const count = await relatedBusinesses.count()
        expect(count).toBeGreaterThan(0)
      }
    })

    test('should navigate to related business', async ({ page }) => {
      const relatedSection = page.locator('text=Similar Businesses')
      if (await relatedSection.isVisible()) {
        const firstRelated = page.locator('[data-testid="related-business-card"]').first()
        const businessName = await firstRelated.locator('[data-testid="business-name"]').textContent()
        
        await firstRelated.click()
        await page.waitForURL(/\/business\//)
        
        const newBusinessName = await page.locator('h1').textContent()
        expect(newBusinessName).toBe(businessName)
      }
    })

    test('should view more similar businesses', async ({ page }) => {
      const viewMoreButton = page.locator('text=View More Similar Businesses')
      if (await viewMoreButton.isVisible()) {
        await viewMoreButton.click()
        await page.waitForURL(/\/search\?related=/)
        await expect(page.locator('[data-testid="search-results"]')).toBeVisible()
      }
    })
  })

  test.describe('Quick Actions', () => {
    test('should visit business website', async ({ page, context }) => {
      const websiteButton = page.locator('button:has-text("Visit Website")')
      if (await websiteButton.isVisible()) {
        const pagePromise = context.waitForEvent('page')
        await websiteButton.click()
        const newPage = await pagePromise
        
        const url = newPage.url()
        expect(url).not.toContain('localhost')
        await newPage.close()
      }
    })

    test('should open claim business modal', async ({ page }) => {
      const claimButton = page.locator('button:has-text("Claim Business")')
      if (await claimButton.isVisible()) {
        await claimButton.click()
        await expect(page.locator('[data-testid="claim-modal"]')).toBeVisible()
      }
    })

    test('should view analytics', async ({ page }) => {
      const analyticsButton = page.locator('button:has-text("View Analytics")')
      if (await analyticsButton.isVisible()) {
        await analyticsButton.click()
        await expect(page.locator('[data-testid="analytics-panel"]')).toBeVisible()
      }
    })
  })

  test.describe('Contact Actions', () => {
    test('should open send message modal', async ({ page }) => {
      await page.click('button:has-text("Send Message")')
      await expect(page.locator('[data-testid="message-modal"]')).toBeVisible()
    })

    test('should request callback', async ({ page }) => {
      await page.click('button:has-text("Request Callback")')
      await expect(page.locator('[data-testid="callback-modal"]')).toBeVisible()
    })
  })

  test.describe('Responsive Design', () => {
    test('should be responsive on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.reload()
      
      // Main elements should still be visible
      await expect(page.locator('h1')).toBeVisible()
      await expect(page.locator('[data-testid="business-header"]')).toBeVisible()
      
      // Sidebar should be below content on mobile
      const contactInfo = page.locator('text=Contact Information')
      await expect(contactInfo).toBeVisible()
    })

    test('should be responsive on tablet', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 })
      await page.reload()
      
      await expect(page.locator('h1')).toBeVisible()
      await expect(page.locator('[data-testid="business-header"]')).toBeVisible()
    })
  })
})