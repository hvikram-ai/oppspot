import { Page, expect } from '@playwright/test'

/**
 * Test data constants
 */
export const TEST_USER = {
  email: 'test@example.com',
  password: 'TestPassword123!',
  name: 'Test User',
  company: 'Test Company'
}

export const TEST_BUSINESS = {
  name: 'TechStart Solutions',
  category: 'Technology',
  location: 'London'
}

/**
 * Authentication helpers
 */
export async function login(page: Page, email: string, password: string) {
  await page.goto('/auth/signin')
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', password)
  await page.click('button[type="submit"]')
  await page.waitForURL(/dashboard|home/, { timeout: 10000 })
}

export async function logout(page: Page) {
  await page.click('[data-testid="user-menu"]')
  await page.click('text=Sign Out')
  await page.waitForURL('/auth/signin', { timeout: 5000 })
}

/**
 * Navigation helpers
 */
export async function navigateToSearch(page: Page) {
  await page.goto('/search')
  await expect(page).toHaveURL('/search')
  await expect(page.locator('h1')).toContainText(/search/i)
}

export async function navigateToMap(page: Page) {
  await page.goto('/map')
  await expect(page).toHaveURL('/map')
  await expect(page.locator('h1')).toContainText(/map/i)
}

export async function navigateToDashboard(page: Page) {
  await page.goto('/dashboard')
  await expect(page).toHaveURL('/dashboard')
}

/**
 * Search helpers
 */
export async function performSearch(page: Page, query: string) {
  await page.fill('[placeholder*="Search"]', query)
  await page.press('[placeholder*="Search"]', 'Enter')
  // Wait for results to load
  await page.waitForSelector('[data-testid="search-results"]', { timeout: 5000 })
}

export async function applyFilter(page: Page, filterType: string, value: string) {
  await page.click(`[data-testid="filter-${filterType}"]`)
  await page.click(`text=${value}`)
  // Wait for filtered results
  await page.waitForTimeout(1000)
}

/**
 * Business interaction helpers
 */
export async function saveBusiness(page: Page, businessName: string) {
  await page.locator(`[data-testid="business-${businessName}"]`).hover()
  await page.click(`[data-testid="save-${businessName}"]`)
  await expect(page.locator('text=Saved')).toBeVisible()
}

export async function viewBusinessDetails(page: Page, businessName: string) {
  await page.click(`text=${businessName}`)
  await page.waitForURL(/\/business\//, { timeout: 5000 })
  await expect(page.locator('h1')).toContainText(businessName)
}

/**
 * Form helpers
 */
export async function fillSignupForm(page: Page, userData: typeof TEST_USER) {
  await page.fill('input[name="name"]', userData.name)
  await page.fill('input[name="email"]', userData.email)
  await page.fill('input[name="password"]', userData.password)
  await page.fill('input[name="company"]', userData.company)
}

/**
 * Assertion helpers
 */
export async function expectNotification(page: Page, message: string) {
  await expect(page.locator(`text=${message}`)).toBeVisible({ timeout: 5000 })
}

export async function expectErrorMessage(page: Page, message: string) {
  await expect(page.locator('.error-message, [role="alert"]')).toContainText(message)
}

/**
 * Wait helpers
 */
export async function waitForDataLoad(page: Page) {
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(500) // Additional buffer for React updates
}

/**
 * Map helpers
 */
export async function waitForMapLoad(page: Page) {
  await page.waitForSelector('.leaflet-container', { timeout: 10000 })
  await page.waitForTimeout(1000) // Wait for map tiles to load
}

export async function clickMapMarker(page: Page, index = 0) {
  const markers = await page.locator('.leaflet-marker-icon')
  await markers.nth(index).click()
  await page.waitForSelector('.leaflet-popup', { timeout: 3000 })
}

/**
 * Cleanup helpers
 */
export async function clearLocalStorage(page: Page) {
  await page.evaluate(() => localStorage.clear())
}

export async function clearCookies(page: Page) {
  await page.context().clearCookies()
}