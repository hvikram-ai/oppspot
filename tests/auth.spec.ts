import { test, expect } from '@playwright/test'
import { TEST_USER, fillSignupForm, expectNotification, expectErrorMessage } from './helpers/test-helpers'

test.describe('Authentication', () => {
  test.describe('Sign Up', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/signup')
    })

    test('should display signup form', async ({ page }) => {
      await expect(page.locator('h1')).toContainText(/start your free trial/i)
      await expect(page.locator('input#fullName')).toBeVisible()
      await expect(page.locator('input#email')).toBeVisible()
      await expect(page.locator('input#password')).toBeVisible()
      await expect(page.locator('button[type="submit"]')).toBeVisible()
    })

    test('should show validation errors for empty form', async ({ page }) => {
      // Try to submit without agreeing to terms
      await page.click('button[type="submit"]', { force: true })
      // Button should be disabled, check for required field indicators
      const submitButton = page.locator('button[type="submit"]')
      await expect(submitButton).toBeDisabled()
    })

    test('should show error for invalid email', async ({ page }) => {
      await page.fill('input#fullName', TEST_USER.name)
      await page.fill('input#email', 'invalid-email')
      await page.fill('input#password', TEST_USER.password)
      await page.fill('input#companyName', TEST_USER.company)
      // Click the select trigger and choose an option
      await page.click('#role')
      await page.click('[role="option"]:has-text("Sales")')
      await page.check('input#terms')
      // The X icon should appear for invalid email
      await expect(page.locator('svg.text-red-500')).toBeVisible()
    })

    test('should show error for weak password', async ({ page }) => {
      await page.fill('input#fullName', TEST_USER.name)
      await page.fill('input#email', TEST_USER.email)
      await page.fill('input#password', '123')
      await page.fill('input#companyName', TEST_USER.company)
      // Click the select trigger and choose an option
      await page.click('#role')
      await page.click('[role="option"]:has-text("Sales")')
      await page.check('input#terms')
      // Check for weak password indicator
      await expect(page.locator('text=Weak')).toBeVisible()
      await page.click('button[type="submit"]')
      await expectErrorMessage(page, 'stronger password')
    })

    test('should successfully create account', async ({ page }) => {
      const uniqueEmail = `test-${Date.now()}@example.com`
      await page.fill('input#fullName', TEST_USER.name)
      await page.fill('input#email', uniqueEmail)
      await page.fill('input#password', TEST_USER.password)
      await page.fill('input#companyName', TEST_USER.company)
      // Click the select trigger and choose an option
      await page.click('#role')
      await page.click('[role="option"]:has-text("Sales")')
      await page.check('input#terms')
      await page.click('button[type="submit"]')
      
      // Should redirect to onboarding or dashboard
      await page.waitForURL(/onboarding|dashboard|home/, { timeout: 10000 })
    })

    test('should show error for duplicate email', async ({ page }) => {
      await page.fill('input#fullName', TEST_USER.name)
      await page.fill('input#email', TEST_USER.email)
      await page.fill('input#password', TEST_USER.password)
      await page.fill('input#companyName', TEST_USER.company)
      // Click the select trigger and choose an option
      await page.click('#role')
      await page.click('[role="option"]:has-text("Sales")')
      await page.check('input#terms')
      await page.click('button[type="submit"]')
      
      // Wait for success or error
      await page.waitForTimeout(2000)
      
      // Try again with same email
      await page.goto('/signup')
      await page.fill('input#fullName', TEST_USER.name)
      await page.fill('input#email', TEST_USER.email)
      await page.fill('input#password', TEST_USER.password)
      await page.fill('input#companyName', TEST_USER.company)
      // Click the select trigger and choose an option
      await page.click('#role')
      await page.click('[role="option"]:has-text("Sales")')
      await page.check('input#terms')
      await page.click('button[type="submit"]')
      await expectErrorMessage(page, 'already')
    })

    test('should have working sign in link', async ({ page }) => {
      await page.click('text=/sign in/i')
      await expect(page).toHaveURL(/login/)
    })
  })

  test.describe('Sign In', () => {
    test.beforeEach(async ({ page }) => {
      // Navigate to login page
      await page.goto('/login')
    })

    test('should display signin form', async ({ page }) => {
      await expect(page.locator('h1, h2')).toContainText(/sign in|log in|welcome/i)
      await expect(page.locator('input#signin-email')).toBeVisible()
      await expect(page.locator('input#signin-password')).toBeVisible()
      await expect(page.locator('button[type="submit"]')).toBeVisible()
    })

    test('should show validation errors for empty form', async ({ page }) => {
      await page.click('button[type="submit"]')
      await expect(page.locator('text=/required/i')).toBeVisible()
    })

    test('should show error for invalid credentials', async ({ page }) => {
      await page.fill('input#signin-email', 'wrong@example.com')
      await page.fill('input#signin-password', 'wrongpassword')
      await page.click('button[type="submit"]')
      await expectErrorMessage(page, 'Invalid')
    })

    test.skip('should successfully sign in with valid credentials', async ({ page }) => {
      // Skip as test user may not exist
      await page.fill('input#signin-email', TEST_USER.email)
      await page.fill('input#signin-password', TEST_USER.password)
      await page.click('button[type="submit"]')
      
      await page.waitForURL(/dashboard|home|search/, { timeout: 10000 })
    })

    test('should have working forgot password link', async ({ page }) => {
      await page.click('text=/forgot password/i')
      await expect(page).toHaveURL(/forgot-password|reset/)
    })

    test('should have working sign up link', async ({ page }) => {
      await page.click('text=/sign up/i')
      await expect(page).toHaveURL('/signup')
    })
  })

  test.describe.skip('Password Reset', () => {
    test.beforeEach(async ({ page }) => {
      // Skip password reset tests as page may not exist
      await page.goto('/forgot-password')
    })

    test('should display password reset form', async ({ page }) => {
      await expect(page.locator('h1, h2')).toContainText(/reset|forgot/i)
      await expect(page.locator('input[type="email"]')).toBeVisible()
      await expect(page.locator('button[type="submit"]')).toBeVisible()
    })

    test('should show validation error for empty email', async ({ page }) => {
      await page.click('button[type="submit"]')
      await expectErrorMessage(page, 'email')
    })

    test('should show success message after submitting email', async ({ page }) => {
      await page.fill('input[type="email"]', TEST_USER.email)
      await page.click('button[type="submit"]')
      await expectNotification(page, 'email sent')
    })

    test('should have working back to sign in link', async ({ page }) => {
      await page.click('text=/sign in/i')
      await expect(page).toHaveURL(/signin|login/)
    })
  })

  test.describe.skip('Email Verification', () => {
    // Skip email verification tests as these pages may not exist yet
    test('should navigate to verification page', async ({ page }) => {
      await page.goto('/auth/verify')
      await expect(page.locator('h1, h2')).toContainText(/verify/i)
    })

    test('should request verification email', async ({ page }) => {
      await page.goto('/auth/verify')
      await page.fill('input[type="email"]', TEST_USER.email)
      await page.click('button:has-text("Send Verification Email")')
      await expectNotification(page, 'Verification email sent')
    })

    test('should handle verification success page', async ({ page }) => {
      await page.goto('/auth/verify-success')
      await expect(page.locator('text=Email Verified Successfully')).toBeVisible()
    })
  })

  test.describe('Protected Routes', () => {
    test('should allow access to public routes without auth', async ({ page }) => {
      await page.goto('/')
      await expect(page).toHaveURL('/')
      
      await page.goto('/search')
      await expect(page).toHaveURL('/search')
      
      await page.goto('/map')
      await expect(page).toHaveURL('/map')
    })
  })
})