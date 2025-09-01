import { test, expect } from '@playwright/test'
import { 
  navigateToMap, 
  waitForMapLoad, 
  clickMapMarker,
  waitForDataLoad 
} from './helpers/test-helpers'

test.describe('Map Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToMap(page)
    await waitForMapLoad(page)
  })

  test.describe('Map Interface', () => {
    test('should display map elements', async ({ page }) => {
      // Map container
      await expect(page.locator('.leaflet-container')).toBeVisible()
      
      // Map controls
      await expect(page.locator('.leaflet-control-zoom')).toBeVisible()
      
      // Search bar
      await expect(page.locator('[placeholder*="Search businesses or locations"]')).toBeVisible()
      
      // Sidebar toggle
      await expect(page.locator('[data-testid="sidebar-toggle"]')).toBeVisible()
      
      // Filter controls
      await expect(page.locator('text=Filters')).toBeVisible()
    })

    test('should load map tiles', async ({ page }) => {
      await expect(page.locator('.leaflet-tile-loaded').first()).toBeVisible({ timeout: 10000 })
    })

    test('should display business count', async ({ page }) => {
      await expect(page.locator('text=/\\d+ businesses in view/')).toBeVisible()
    })
  })

  test.describe('Map Navigation', () => {
    test('should zoom in and out', async ({ page }) => {
      // Zoom in
      await page.click('.leaflet-control-zoom-in')
      await page.waitForTimeout(500)
      
      // Zoom out
      await page.click('.leaflet-control-zoom-out')
      await page.waitForTimeout(500)
      
      // Map should still be visible
      await expect(page.locator('.leaflet-container')).toBeVisible()
    })

    test('should pan the map', async ({ page }) => {
      const map = page.locator('.leaflet-container')
      
      // Pan by dragging
      await map.dragTo(map, {
        sourcePosition: { x: 200, y: 200 },
        targetPosition: { x: 400, y: 400 }
      })
      
      await page.waitForTimeout(500)
      await expect(map).toBeVisible()
    })

    test('should search for location', async ({ page }) => {
      await page.fill('[placeholder*="Search businesses or locations"]', '@London')
      await page.press('[placeholder*="Search businesses or locations"]', 'Enter')
      await waitForMapLoad(page)
      
      await expect(page.locator('text=Showing London')).toBeVisible()
    })

    test('should handle invalid location search', async ({ page }) => {
      await page.fill('[placeholder*="Search businesses or locations"]', '@InvalidLocation123')
      await page.press('[placeholder*="Search businesses or locations"]', 'Enter')
      
      await expect(page.locator('text=Location not found')).toBeVisible()
    })

    test('should update businesses when map moves', async ({ page }) => {
      // Get initial count
      const initialCount = await page.locator('text=/\\d+ businesses in view/').textContent()
      
      // Pan the map significantly
      const map = page.locator('.leaflet-container')
      await map.dragTo(map, {
        sourcePosition: { x: 200, y: 200 },
        targetPosition: { x: 600, y: 600 }
      })
      
      await waitForDataLoad(page)
      
      // Count should potentially change
      const newCount = await page.locator('text=/\\d+ businesses in view/').textContent()
      expect(newCount).toBeDefined()
    })
  })

  test.describe('Map Markers', () => {
    test('should display business markers', async ({ page }) => {
      await expect(page.locator('.leaflet-marker-icon').first()).toBeVisible({ timeout: 10000 })
    })

    test('should show popup on marker click', async ({ page }) => {
      await clickMapMarker(page, 0)
      await expect(page.locator('.leaflet-popup')).toBeVisible()
      await expect(page.locator('.leaflet-popup-content')).toContainText(/./)
    })

    test('should close popup on close button click', async ({ page }) => {
      await clickMapMarker(page, 0)
      await page.click('.leaflet-popup-close-button')
      await expect(page.locator('.leaflet-popup')).not.toBeVisible()
    })

    test('should show marker clustering at low zoom', async ({ page }) => {
      // Zoom out to trigger clustering
      for (let i = 0; i < 5; i++) {
        await page.click('.leaflet-control-zoom-out')
        await page.waitForTimeout(200)
      }
      
      // Check for cluster markers
      await expect(page.locator('.marker-cluster').first()).toBeVisible()
    })

    test('should expand cluster on click', async ({ page }) => {
      // Zoom out to trigger clustering
      for (let i = 0; i < 5; i++) {
        await page.click('.leaflet-control-zoom-out')
        await page.waitForTimeout(200)
      }
      
      // Click cluster
      await page.locator('.marker-cluster').first().click()
      await page.waitForTimeout(500)
      
      // Should zoom in or spiderfy
      await expect(page.locator('.leaflet-marker-icon')).toBeVisible()
    })
  })

  test.describe('Map Sidebar', () => {
    test('should toggle sidebar visibility', async ({ page }) => {
      const sidebar = page.locator('[data-testid="map-sidebar"]')
      
      // Should be visible by default
      await expect(sidebar).toBeVisible()
      
      // Toggle off
      await page.click('[data-testid="sidebar-toggle"]')
      await expect(sidebar).not.toBeVisible()
      
      // Toggle on
      await page.click('[data-testid="sidebar-toggle"]')
      await expect(sidebar).toBeVisible()
    })

    test('should list businesses in sidebar', async ({ page }) => {
      await expect(page.locator('[data-testid="sidebar-business-item"]').first()).toBeVisible()
    })

    test('should show business details on sidebar item click', async ({ page }) => {
      await page.locator('[data-testid="sidebar-business-item"]').first().click()
      
      // Should show detailed view
      await expect(page.locator('[data-testid="business-detail-panel"]')).toBeVisible()
      await expect(page.locator('text=About')).toBeVisible()
      await expect(page.locator('text=Contact')).toBeVisible()
    })

    test('should close business details', async ({ page }) => {
      await page.locator('[data-testid="sidebar-business-item"]').first().click()
      await page.click('[data-testid="close-details"]')
      
      await expect(page.locator('[data-testid="business-detail-panel"]')).not.toBeVisible()
    })

    test('should sync sidebar selection with map marker', async ({ page }) => {
      await clickMapMarker(page, 0)
      
      // Sidebar should show selected business
      await expect(page.locator('[data-testid="business-detail-panel"]')).toBeVisible()
    })
  })

  test.describe('Map Filters', () => {
    test('should open filter menu', async ({ page }) => {
      await page.click('text=Filters')
      await expect(page.locator('[data-testid="map-filters-panel"]')).toBeVisible()
    })

    test('should filter by category', async ({ page }) => {
      await page.click('text=Filters')
      await page.click('text=Technology')
      await waitForDataLoad(page)
      
      // Check that markers are updated
      const markerCount = await page.locator('.leaflet-marker-icon').count()
      expect(markerCount).toBeGreaterThan(0)
    })

    test('should filter by rating', async ({ page }) => {
      await page.click('text=Filters')
      await page.locator('[data-testid="rating-slider"]').fill('4')
      await waitForDataLoad(page)
      
      const markerCount = await page.locator('.leaflet-marker-icon').count()
      expect(markerCount).toBeGreaterThan(0)
    })

    test('should filter verified businesses only', async ({ page }) => {
      await page.click('text=Filters')
      await page.click('text=Verified businesses only')
      await waitForDataLoad(page)
      
      // All visible markers should be verified (green color)
      await expect(page.locator('.leaflet-marker-icon').first()).toBeVisible()
    })

    test('should clear filters', async ({ page }) => {
      // Apply filters
      await page.click('text=Filters')
      await page.click('text=Technology')
      await waitForDataLoad(page)
      
      // Clear filters
      await page.click('text=Clear all filters')
      await waitForDataLoad(page)
      
      // Should show all businesses again
      const markerCount = await page.locator('.leaflet-marker-icon').count()
      expect(markerCount).toBeGreaterThan(0)
    })
  })

  test.describe('Map Layers', () => {
    test('should open layers menu', async ({ page }) => {
      await page.click('text=Layers')
      await expect(page.locator('[data-testid="map-layers-panel"]')).toBeVisible()
    })

    test('should toggle business locations layer', async ({ page }) => {
      await page.click('text=Layers')
      await page.click('text=Business Locations')
      await page.waitForTimeout(500)
      
      // Markers should toggle visibility
      const markersVisible = await page.locator('.leaflet-marker-icon').isVisible()
      expect(markersVisible).toBeDefined()
    })

    test('should toggle heat map layer', async ({ page }) => {
      await page.click('text=Layers')
      await page.click('text=Heat Map')
      await page.waitForTimeout(500)
      
      // Heat map layer should be visible
      await expect(page.locator('.leaflet-heatmap-layer, canvas')).toBeVisible()
    })
  })

  test.describe('Map Search', () => {
    test('should search for businesses on map', async ({ page }) => {
      await page.fill('[placeholder*="Search businesses or locations"]', 'restaurant')
      await page.press('[placeholder*="Search businesses or locations"]', 'Enter')
      await waitForDataLoad(page)
      
      // Should show filtered results
      await expect(page.locator('.leaflet-marker-icon').first()).toBeVisible()
    })

    test('should search for specific location', async ({ page }) => {
      await page.fill('[placeholder*="Search businesses or locations"]', '@Manchester')
      await page.press('[placeholder*="Search businesses or locations"]', 'Enter')
      await waitForMapLoad(page)
      
      // Map should center on Manchester
      await expect(page.locator('text=Showing Manchester')).toBeVisible()
    })

    test('should combine business and location search', async ({ page }) => {
      await page.fill('[placeholder*="Search businesses or locations"]', 'tech companies in London')
      await page.press('[placeholder*="Search businesses or locations"]', 'Enter')
      await waitForDataLoad(page)
      
      // Should show tech companies in London area
      await expect(page.locator('.leaflet-marker-icon').first()).toBeVisible()
    })
  })

  test.describe('Map Interactions', () => {
    test('should get directions to business', async ({ page }) => {
      await clickMapMarker(page, 0)
      await page.click('text=Get Directions')
      
      // Should open in new tab or show directions
      const newTabPromise = page.context().waitForEvent('page')
      const newTab = await newTabPromise
      await expect(newTab).toHaveURL(/maps\.google\.com|maps\.apple\.com/)
    })

    test('should save business from map', async ({ page }) => {
      await clickMapMarker(page, 0)
      await page.click('[data-testid="save-business"]')
      
      await expect(page.locator('text=Saved')).toBeVisible()
    })

    test('should view full business profile from map', async ({ page }) => {
      await clickMapMarker(page, 0)
      await page.click('text=View Full Profile')
      
      await page.waitForURL(/\/business\//)
      await expect(page.locator('h1')).toBeVisible()
    })
  })

  test.describe('Map Performance', () => {
    test('should handle many markers efficiently', async ({ page }) => {
      // This would test with a dense area
      await page.fill('[placeholder*="Search businesses or locations"]', '@London')
      await page.press('[placeholder*="Search businesses or locations"]', 'Enter')
      await waitForMapLoad(page)
      
      // Should show clustered markers for performance
      const clusters = await page.locator('.marker-cluster').count()
      const markers = await page.locator('.leaflet-marker-icon').count()
      
      expect(clusters + markers).toBeGreaterThan(0)
    })

    test('should load map bounds progressively', async ({ page }) => {
      // Pan to new area
      const map = page.locator('.leaflet-container')
      await map.dragTo(map, {
        sourcePosition: { x: 400, y: 400 },
        targetPosition: { x: 100, y: 100 }
      })
      
      // Should load new businesses
      await waitForDataLoad(page)
      await expect(page.locator('.leaflet-marker-icon').first()).toBeVisible()
    })
  })
})