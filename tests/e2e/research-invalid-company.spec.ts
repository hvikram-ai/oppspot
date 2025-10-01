/**
 * Integration Test: Invalid Company Handling
 * T015: Verify error handling for invalid company IDs
 *
 * This test MUST FAIL initially (endpoints don't exist yet)
 * Validates: FR-019, FR-020, FR-021
 */

import { test, expect } from '@playwright/test';

test.describe('ResearchGPT Invalid Company Integration', () => {

  test.beforeEach(async ({ page }) => {
    // Login as demo user
    await page.goto('/login');
    await page.fill('[name="email"]', 'demo@oppspot.com');
    await page.fill('[name="password"]', 'Demo123456!');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
  });

  test('should return 404 for non-existent company ID', async ({ request, page }) => {
    const cookies = await page.context().cookies();
    const authCookie = cookies.find(c => c.name.includes('auth'));

    // Test: Invalid company ID
    const response = await request.post('/api/research/invalid-company-id-12345', {
      headers: {
        'Cookie': `${authCookie?.name}=${authCookie?.value}`,
      },
    });

    // Assert: 404 Not Found
    expect(response.status()).toBe(404);

    const data = await response.json();

    // Assert: Error schema
    expect(data).toHaveProperty('error');
    expect(data).toHaveProperty('message');
    expect(data.error).toMatch(/not found|does not exist/i);

    // Assert: Company ID mentioned in error
    expect(data.message).toContain('invalid-company-id-12345');
  });

  test('should return 404 for malformed UUID', async ({ request, page }) => {
    const cookies = await page.context().cookies();
    const authCookie = cookies.find(c => c.name.includes('auth'));

    // Test: Malformed UUID
    const response = await request.post('/api/research/not-a-valid-uuid', {
      headers: {
        'Cookie': `${authCookie?.name}=${authCookie?.value}`,
      },
    });

    // Assert: 404 Not Found (or 400 Bad Request)
    expect([400, 404]).toContain(response.status());

    const data = await response.json();
    expect(data).toHaveProperty('error');
  });

  test('should return 404 for valid UUID that does not exist', async ({ request, page }) => {
    const cookies = await page.context().cookies();
    const authCookie = cookies.find(c => c.name.includes('auth'));

    // Test: Valid UUID format but non-existent
    const response = await request.post('/api/research/00000000-0000-0000-0000-000000000000', {
      headers: {
        'Cookie': `${authCookie?.name}=${authCookie?.value}`,
      },
    });

    // Assert: 404 Not Found
    expect(response.status()).toBe(404);

    const data = await response.json();
    expect(data.error).toMatch(/company not found|does not exist/i);
  });

  test('should show error message in UI for invalid company', async ({ page }) => {
    // Navigate to invalid business page
    await page.goto('/business/invalid-company-id');

    // Assert: 404 page or error message displayed
    const errorMessage = page.locator('[data-testid="error-message"], .error, [role="alert"]');
    await expect(errorMessage).toBeVisible({ timeout: 5000 });
    await expect(errorMessage).toContainText(/not found|does not exist/i);

    // Assert: Research button not visible or disabled
    const researchButton = page.locator('button:has-text("Generate Research")');
    if (await researchButton.isVisible()) {
      await expect(researchButton).toBeDisabled();
    }
  });

  test('should not consume quota for invalid company', async ({ request, page }) => {
    const cookies = await page.context().cookies();
    const authCookie = cookies.find(c => c.name.includes('auth'));

    // Get quota before
    const quotaBefore = await request.get('/api/research/quota', {
      headers: {
        'Cookie': `${authCookie?.name}=${authCookie?.value}`,
      },
    });
    const dataBefore = await quotaBefore.json();

    // Attempt research on invalid company
    const response = await request.post('/api/research/invalid-company-id', {
      headers: {
        'Cookie': `${authCookie?.name}=${authCookie?.value}`,
      },
    });

    expect(response.status()).toBe(404);

    // Get quota after
    const quotaAfter = await request.get('/api/research/quota', {
      headers: {
        'Cookie': `${authCookie?.name}=${authCookie?.value}`,
      },
    });
    const dataAfter = await quotaAfter.json();

    // Assert: Quota NOT incremented
    expect(dataAfter.researches_used).toBe(dataBefore.researches_used);

    console.log(`✅ Quota preserved after invalid company error`);
  });

  test('should handle company with no Companies House data', async ({ request, page }) => {
    // This test requires a company record without Companies House number
    test.skip();

    // TODO: Implement with test data
    // 1. Create company without company_number
    // 2. Attempt research generation
    // 3. Should either:
    //    a) Return 400 with "insufficient data" error
    //    b) Generate partial report with warning
  });

  test('should validate company_number format before generation', async ({ request, page }) => {
    // This test requires company validation
    test.skip();

    // TODO: Implement validation test
    // 1. Create company with invalid company_number format
    // 2. Attempt research generation
    // 3. Should return 400 Bad Request
    // 4. Error message should explain invalid format
  });

  test('should return 404 when accessing non-existent report directly', async ({ request, page }) => {
    const cookies = await page.context().cookies();
    const authCookie = cookies.find(c => c.name.includes('auth'));

    // Test: GET non-existent report
    const response = await request.get('/api/research/00000000-0000-0000-0000-000000000000', {
      headers: {
        'Cookie': `${authCookie?.name}=${authCookie?.value}`,
      },
    });

    // Assert: 404 Not Found
    expect(response.status()).toBe(404);

    const data = await response.json();
    expect(data).toHaveProperty('error');
    expect(data.error).toMatch(/report not found|does not exist/i);
  });

  test('should return 404 for status of non-existent company', async ({ request, page }) => {
    const cookies = await page.context().cookies();
    const authCookie = cookies.find(c => c.name.includes('auth'));

    // Test: GET status for invalid company
    const response = await request.get('/api/research/invalid-company-id/status', {
      headers: {
        'Cookie': `${authCookie?.name}=${authCookie?.value}`,
      },
    });

    // Assert: 404 Not Found
    expect(response.status()).toBe(404);

    const data = await response.json();
    expect(data).toHaveProperty('error');
  });

  test('should handle SQL injection attempts safely', async ({ request, page }) => {
    const cookies = await page.context().cookies();
    const authCookie = cookies.find(c => c.name.includes('auth'));

    // Test: SQL injection attempt
    const maliciousIds = [
      "'; DROP TABLE research_reports; --",
      "1' OR '1'='1",
      "admin'--",
      "' UNION SELECT * FROM users--",
    ];

    for (const maliciousId of maliciousIds) {
      const response = await request.post(`/api/research/${encodeURIComponent(maliciousId)}`, {
        headers: {
          'Cookie': `${authCookie?.name}=${authCookie?.value}`,
        },
      });

      // Assert: Returns error (not SQL injection)
      expect([400, 404]).toContain(response.status());

      const data = await response.json();
      expect(data).toHaveProperty('error');

      // Should NOT return database error details
      expect(data.error).not.toMatch(/SQL|database|postgres|supabase/i);
    }

    console.log(`✅ SQL injection attempts safely rejected`);
  });

  test('should handle XSS attempts in company ID', async ({ request, page }) => {
    const cookies = await page.context().cookies();
    const authCookie = cookies.find(c => c.name.includes('auth'));

    // Test: XSS attempt
    const xssIds = [
      '<script>alert("XSS")</script>',
      '"><img src=x onerror=alert(1)>',
      'javascript:alert(1)',
    ];

    for (const xssId of xssIds) {
      const response = await request.post(`/api/research/${encodeURIComponent(xssId)}`, {
        headers: {
          'Cookie': `${authCookie?.name}=${authCookie?.value}`,
        },
      });

      // Assert: Returns error
      expect([400, 404]).toContain(response.status());

      const data = await response.json();

      // If error message includes the ID, it should be sanitized
      if (data.message && data.message.includes('<')) {
        // Should not contain raw HTML/script tags
        expect(data.message).not.toMatch(/<script|<img|javascript:/i);
      }
    }

    console.log(`✅ XSS attempts safely rejected`);
  });

  test('should handle extremely long company IDs', async ({ request, page }) => {
    const cookies = await page.context().cookies();
    const authCookie = cookies.find(c => c.name.includes('auth'));

    // Test: Very long ID (potential DoS attempt)
    const longId = 'a'.repeat(10000);

    const response = await request.post(`/api/research/${longId}`, {
      headers: {
        'Cookie': `${authCookie?.name}=${authCookie?.value}`,
      },
    });

    // Assert: Returns error quickly (not timeout)
    expect([400, 404, 414]).toContain(response.status());
  });

  test('should return user-friendly error messages', async ({ request, page }) => {
    const cookies = await page.context().cookies();
    const authCookie = cookies.find(c => c.name.includes('auth'));

    const response = await request.post('/api/research/invalid-company', {
      headers: {
        'Cookie': `${authCookie?.name}=${authCookie?.value}`,
      },
    });

    const data = await response.json();

    // Assert: Error message is user-friendly
    expect(data.error).toBeDefined();
    expect(data.error).not.toMatch(/undefined|null|NaN/i);
    expect(data.error).not.toMatch(/stack trace|at Object|at Function/i);

    // Assert: Includes helpful guidance
    expect(data).toHaveProperty('message');
    expect(data.message.length).toBeGreaterThan(10);
    expect(data.message.length).toBeLessThan(200);
  });

  test('should log errors for monitoring without exposing details to user', async ({ request, page }) => {
    // This test requires access to server logs
    test.skip();

    // TODO: Implement with log monitoring
    // 1. Trigger various error scenarios
    // 2. Verify errors logged to monitoring system
    // 3. Verify logged errors include:
    //    - Request ID
    //    - User ID
    //    - Company ID
    //    - Error stack trace
    //    - Timestamp
    // 4. Verify user response does NOT include these details
  });

  test('should handle rate limiting for repeated invalid requests', async ({ request, page }) => {
    const cookies = await page.context().cookies();
    const authCookie = cookies.find(c => c.name.includes('auth'));

    // Make 20 rapid requests to invalid company
    const requests = [];
    for (let i = 0; i < 20; i++) {
      requests.push(
        request.post('/api/research/invalid-company', {
          headers: {
            'Cookie': `${authCookie?.name}=${authCookie?.value}`,
          },
        })
      );
    }

    const responses = await Promise.all(requests);

    // Assert: Most should be 404
    const notFoundCount = responses.filter(r => r.status() === 404).length;
    expect(notFoundCount).toBeGreaterThan(0);

    // Assert: Some might be rate limited (429)
    const rateLimitedCount = responses.filter(r => r.status() === 429).length;
    if (rateLimitedCount > 0) {
      console.log(`✅ Rate limiting active: ${rateLimitedCount}/20 requests limited`);
    }
  });

  test('should provide link to search for valid companies', async ({ page }) => {
    // Navigate to invalid business page
    await page.goto('/business/invalid-company-id');

    // Assert: Error page includes helpful link
    const searchLink = page.locator('a:has-text("Search for companies"), a:has-text("Browse companies")');
    await expect(searchLink).toBeVisible({ timeout: 5000 });

    // Click link
    await searchLink.click();

    // Assert: Redirects to search/browse page
    await expect(page).toHaveURL(/\/search|\/companies|\/dashboard/);
  });
});
