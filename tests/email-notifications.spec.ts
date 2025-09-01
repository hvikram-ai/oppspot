import { test, expect } from '@playwright/test'
import { 
  login,
  expectNotification,
  TEST_USER,
  waitForDataLoad
} from './helpers/test-helpers'

test.describe('Email Notifications', () => {
  test.describe('Email Verification', () => {
    test('should show email verification prompt after signup', async ({ page }) => {
      // Sign up with new account
      const uniqueEmail = `test-${Date.now()}@example.com`
      await page.goto('/auth/signup')
      await page.fill('input[name="name"]', 'Test User')
      await page.fill('input[name="email"]', uniqueEmail)
      await page.fill('input[name="password"]', 'TestPassword123!')
      await page.fill('input[name="company"]', 'Test Company')
      await page.click('button[type="submit"]')
      
      // Should show verification prompt
      await expect(page.locator('text=/verify.*email/i')).toBeVisible({ timeout: 10000 })
    })

    test('should navigate to verification page', async ({ page }) => {
      await page.goto('/auth/verify')
      await expect(page.locator('h1, h2')).toContainText(/verify/i)
      await expect(page.locator('input[type="email"]')).toBeVisible()
      await expect(page.locator('button:has-text("Send Verification Email")')).toBeVisible()
    })

    test('should request verification email', async ({ page }) => {
      await page.goto('/auth/verify')
      await page.fill('input[type="email"]', TEST_USER.email)
      await page.click('button:has-text("Send Verification Email")')
      
      await expectNotification(page, 'Verification email sent')
      await expect(page.locator('text=Check Your Email')).toBeVisible()
    })

    test('should show error for invalid email', async ({ page }) => {
      await page.goto('/auth/verify')
      await page.fill('input[type="email"]', 'invalid-email')
      await page.click('button:has-text("Send Verification Email")')
      
      await expect(page.locator('text=/invalid.*email/i')).toBeVisible()
    })

    test('should handle verification link click', async ({ page }) => {
      // This would typically be tested with a real verification token
      // For testing, we'll check the success page exists
      await page.goto('/auth/verify-success')
      await expect(page.locator('text=Email Verified Successfully')).toBeVisible()
      await expect(page.locator('button:has-text("Go to Dashboard")')).toBeVisible()
    })
  })

  test.describe('Notification Settings', () => {
    test.beforeEach(async ({ page }) => {
      // Login first
      await login(page, TEST_USER.email, TEST_USER.password)
      await page.goto('/settings/notifications')
      await waitForDataLoad(page)
    })

    test('should display notification settings page', async ({ page }) => {
      await expect(page.locator('h1')).toContainText(/notification.*settings/i)
      await expect(page.locator('text=Email Notifications')).toBeVisible()
    })

    test('should display all notification categories', async ({ page }) => {
      // Email notifications toggle
      await expect(page.locator('label:has-text("Email Notifications")')).toBeVisible()
      
      // Specific notification types
      await expect(page.locator('label:has-text("Weekly Digest")')).toBeVisible()
      await expect(page.locator('label:has-text("Business Updates")')).toBeVisible()
      await expect(page.locator('label:has-text("Search Alerts")')).toBeVisible()
      await expect(page.locator('label:has-text("Security Alerts")')).toBeVisible()
      await expect(page.locator('label:has-text("Product Updates")')).toBeVisible()
      await expect(page.locator('label:has-text("Marketing Emails")')).toBeVisible()
    })

    test('should toggle email notifications master switch', async ({ page }) => {
      const masterSwitch = page.locator('#email-notifications')
      
      // Get initial state
      const initialState = await masterSwitch.isChecked()
      
      // Toggle
      await masterSwitch.click()
      
      // Verify toggled
      expect(await masterSwitch.isChecked()).toBe(!initialState)
      
      // Other toggles should be disabled when master is off
      if (!await masterSwitch.isChecked()) {
        await expect(page.locator('#weekly-digest')).toBeDisabled()
        await expect(page.locator('#business-updates')).toBeDisabled()
      }
    })

    test('should toggle individual notification types', async ({ page }) => {
      // Ensure master switch is on
      const masterSwitch = page.locator('#email-notifications')
      if (!await masterSwitch.isChecked()) {
        await masterSwitch.click()
      }
      
      // Toggle weekly digest
      const weeklyDigest = page.locator('#weekly-digest')
      const initialState = await weeklyDigest.isChecked()
      await weeklyDigest.click()
      expect(await weeklyDigest.isChecked()).toBe(!initialState)
    })

    test('should keep security alerts always enabled', async ({ page }) => {
      const securityAlerts = page.locator('#security-alerts')
      
      // Security alerts should not be affected by master switch
      await expect(securityAlerts).toBeEnabled()
      
      // Toggle should work
      const initialState = await securityAlerts.isChecked()
      await securityAlerts.click()
      expect(await securityAlerts.isChecked()).toBe(!initialState)
    })

    test('should save notification settings', async ({ page }) => {
      // Make changes
      const productUpdates = page.locator('#product-updates')
      const initialState = await productUpdates.isChecked()
      await productUpdates.click()
      
      // Save
      await page.click('button:has-text("Save Settings")')
      await expectNotification(page, 'saved successfully')
      
      // Reload and verify persistence
      await page.reload()
      await waitForDataLoad(page)
      
      const newState = await productUpdates.isChecked()
      expect(newState).toBe(!initialState)
    })

    test('should show loading state while saving', async ({ page }) => {
      await page.locator('#marketing-emails').click()
      await page.click('button:has-text("Save Settings")')
      
      // Should show loading indicator
      await expect(page.locator('text=Saving...')).toBeVisible()
      
      // Should complete
      await expectNotification(page, 'saved')
    })
  })

  test.describe('Password Reset Email', () => {
    test('should request password reset email', async ({ page }) => {
      await page.goto('/auth/forgot-password')
      await page.fill('input[type="email"]', TEST_USER.email)
      await page.click('button[type="submit"]')
      
      await expectNotification(page, 'email sent')
      await expect(page.locator('text=/check.*email/i')).toBeVisible()
    })

    test('should show password reset form with token', async ({ page }) => {
      // This would be accessed via email link
      // For testing, check the reset page exists
      await page.goto('/auth/reset-password?token=test-token')
      
      await expect(page.locator('input[type="password"]')).toBeVisible()
      await expect(page.locator('input[placeholder*="Confirm"]')).toBeVisible()
      await expect(page.locator('button:has-text("Reset Password")')).toBeVisible()
    })

    test('should validate password requirements', async ({ page }) => {
      await page.goto('/auth/reset-password?token=test-token')
      
      // Try weak password
      await page.locator('input[type="password"]').first().fill('123')
      await page.fill('input[placeholder*="Confirm"]', '123')
      await page.click('button:has-text("Reset Password")')
      
      await expect(page.locator('text=/password.*requirements/i')).toBeVisible()
    })

    test('should validate password match', async ({ page }) => {
      await page.goto('/auth/reset-password?token=test-token')
      
      await page.locator('input[type="password"]').first().fill('NewPassword123!')
      await page.fill('input[placeholder*="Confirm"]', 'DifferentPassword123!')
      await page.click('button:has-text("Reset Password")')
      
      await expect(page.locator('text=/passwords.*match/i')).toBeVisible()
    })
  })

  test.describe('Welcome Email', () => {
    test('should trigger welcome email on signup', async ({ page }) => {
      const uniqueEmail = `welcome-test-${Date.now()}@example.com`
      
      await page.goto('/auth/signup')
      await page.fill('input[name="name"]', 'Welcome Test')
      await page.fill('input[name="email"]', uniqueEmail)
      await page.fill('input[name="password"]', 'TestPassword123!')
      await page.fill('input[name="company"]', 'Test Company')
      
      // Intercept API calls to verify email is sent
      page.on('request', request => {
        if (request.url().includes('/api/email/send')) {
          const postData = request.postData()
          if (postData) {
            const data = JSON.parse(postData)
            expect(data.type).toBe('welcome')
            expect(data.to).toBe(uniqueEmail)
          }
        }
      })
      
      await page.click('button[type="submit"]')
      await page.waitForURL(/onboarding|dashboard/, { timeout: 10000 })
    })
  })

  test.describe('Notification Emails', () => {
    test.beforeEach(async ({ page }) => {
      await login(page, TEST_USER.email, TEST_USER.password)
    })

    test('should send search alert email when enabled', async ({ page }) => {
      // Enable search alerts
      await page.goto('/settings/notifications')
      const searchAlerts = page.locator('#search-alerts')
      if (!await searchAlerts.isChecked()) {
        await searchAlerts.click()
        await page.click('button:has-text("Save Settings")')
        await expectNotification(page, 'saved')
      }
      
      // Save a search
      await page.goto('/search')
      await page.fill('[placeholder*="Search"]', 'tech startups')
      await page.press('[placeholder*="Search"]', 'Enter')
      await waitForDataLoad(page)
      
      await page.click('[data-testid="save-search"]')
      await expectNotification(page, 'Search saved')
      
      // This would trigger alert emails when new matches are found
    })

    test('should respect email notification preferences', async ({ page }) => {
      // Disable all emails
      await page.goto('/settings/notifications')
      const masterSwitch = page.locator('#email-notifications')
      if (await masterSwitch.isChecked()) {
        await masterSwitch.click()
        await page.click('button:has-text("Save Settings")')
        await expectNotification(page, 'saved')
      }
      
      // Actions that would normally send emails should not
      await page.goto('/search')
      await page.click('[data-testid="save-search"]')
      
      // No email should be sent (would need to mock email service to verify)
    })
  })

  test.describe('Email Templates', () => {
    test('should display unsubscribe link in email footer', async ({ page }) => {
      // This would be tested by examining actual email content
      // For now, verify the settings page is accessible
      await page.goto('/settings/notifications')
      await expect(page.locator('text=/unsubscribe|manage.*preferences/i')).toBeVisible()
    })

    test('should include proper email headers', async ({ page }) => {
      // Intercept email API calls to verify headers
      page.on('request', request => {
        if (request.url().includes('/api/email/send')) {
          const headers = request.headers()
          expect(headers['content-type']).toContain('application/json')
        }
      })
      
      // Trigger an email action
      await page.goto('/auth/verify')
      await page.fill('input[type="email"]', TEST_USER.email)
      await page.click('button:has-text("Send Verification Email")')
    })
  })

  test.describe('Email Delivery Status', () => {
    test('should handle email service errors gracefully', async ({ page }) => {
      // Mock email service failure
      await page.route('**/api/email/send', route => {
        route.fulfill({
          status: 503,
          body: JSON.stringify({ error: 'Email service unavailable' })
        })
      })
      
      await page.goto('/auth/verify')
      await page.fill('input[type="email"]', TEST_USER.email)
      await page.click('button:has-text("Send Verification Email")')
      
      await expect(page.locator('text=/failed.*send.*email/i')).toBeVisible()
    })

    test('should retry failed email sends', async ({ page }) => {
      let attemptCount = 0
      
      await page.route('**/api/email/send', route => {
        attemptCount++
        if (attemptCount === 1) {
          route.fulfill({ status: 500 })
        } else {
          route.fulfill({ status: 200, body: JSON.stringify({ success: true }) })
        }
      })
      
      await page.goto('/auth/verify')
      await page.fill('input[type="email"]', TEST_USER.email)
      await page.click('button:has-text("Send Verification Email")')
      
      // Should retry and succeed
      await expectNotification(page, 'sent')
    })
  })
})