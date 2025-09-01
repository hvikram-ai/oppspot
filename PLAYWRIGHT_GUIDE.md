# Playwright Testing Guide for OppSpot

## Table of Contents
1. [Overview](#overview)
2. [Installation & Setup](#installation--setup)
3. [Running Tests](#running-tests)
4. [Test Structure](#test-structure)
5. [Test Suites](#test-suites)
6. [Writing New Tests](#writing-new-tests)
7. [Best Practices](#best-practices)
8. [Debugging Tests](#debugging-tests)
9. [CI/CD Integration](#cicd-integration)
10. [Troubleshooting](#troubleshooting)

## Overview

This guide provides comprehensive documentation for Playwright end-to-end testing in the OppSpot application. Our test suite covers all major functionality including authentication, search, map features, business details, and email notifications.

### Test Coverage

- **Authentication**: Sign up, sign in, password reset, email verification
- **Search**: Text search, filters, sorting, export, AI mode
- **Map**: Interactive map, markers, clustering, filters, location search
- **Business Details**: Information display, contact details, actions, related businesses
- **Email Notifications**: Settings, verification, welcome emails, alerts

## Installation & Setup

### Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- Application running locally or accessible test environment

### Initial Setup

1. **Install Playwright and dependencies:**
```bash
npm install -D @playwright/test
```

2. **Install Playwright browsers:**
```bash
npx playwright install
```

3. **Install system dependencies (if needed):**
```bash
npx playwright install-deps
```

### Environment Configuration

Create a `.env.test` file for test-specific environment variables:

```env
# Test Environment
PLAYWRIGHT_BASE_URL=http://localhost:3000
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=TestPassword123!

# Test Database (optional)
DATABASE_URL=postgresql://test_user:password@localhost:5432/oppspot_test

# Disable email sending in tests
EMAIL_TESTING_MODE=true
```

## Running Tests

### Basic Commands

```bash
# Run all tests
npx playwright test

# Run tests in headed mode (see browser)
npx playwright test --headed

# Run tests in specific browser
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit

# Run specific test file
npx playwright test tests/auth.spec.ts

# Run tests matching pattern
npx playwright test -g "should login"

# Run tests in debug mode
npx playwright test --debug

# Run tests with specific workers
npx playwright test --workers=4
```

### Test Scripts in package.json

Add these scripts to your `package.json`:

```json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:headed": "playwright test --headed",
    "test:e2e:debug": "playwright test --debug",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:report": "playwright show-report",
    "test:e2e:codegen": "playwright codegen",
    "test:e2e:auth": "playwright test tests/auth.spec.ts",
    "test:e2e:search": "playwright test tests/search.spec.ts",
    "test:e2e:map": "playwright test tests/map.spec.ts",
    "test:e2e:business": "playwright test tests/business-detail.spec.ts",
    "test:e2e:email": "playwright test tests/email-notifications.spec.ts"
  }
}
```

### Playwright UI Mode

Run tests in interactive UI mode for better debugging:

```bash
npx playwright test --ui
```

### Generate Tests with Codegen

Use Playwright's code generator to create tests:

```bash
npx playwright codegen http://localhost:3000
```

## Test Structure

### Directory Structure

```
tests/
├── helpers/
│   └── test-helpers.ts      # Shared utility functions
├── auth.spec.ts              # Authentication tests
├── search.spec.ts            # Search functionality tests
├── map.spec.ts               # Map feature tests
├── business-detail.spec.ts  # Business detail page tests
└── email-notifications.spec.ts # Email notification tests
```

### Test Helper Functions

Key helper functions in `tests/helpers/test-helpers.ts`:

- `login()` - Authenticate user
- `logout()` - Sign out user
- `performSearch()` - Execute search query
- `applyFilter()` - Apply search/map filters
- `waitForDataLoad()` - Wait for data to load
- `waitForMapLoad()` - Wait for map initialization
- `expectNotification()` - Assert toast notifications
- `saveBusiness()` - Save a business to list
- `viewBusinessDetails()` - Navigate to business page

## Test Suites

### 1. Authentication Tests (`auth.spec.ts`)

**Coverage:**
- Sign up flow with validation
- Sign in with credentials
- Password reset process
- Email verification
- Protected route access
- Session management

**Key Test Cases:**
```typescript
test('should successfully create account')
test('should show error for duplicate email')
test('should redirect to signin when accessing protected route')
test('should successfully sign out')
```

### 2. Search Tests (`search.spec.ts`)

**Coverage:**
- Search interface elements
- Text search operations
- Filter applications
- Sorting options
- Result interactions
- Export functionality
- AI search mode

**Key Test Cases:**
```typescript
test('should perform basic text search')
test('should filter by category')
test('should sort by rating')
test('should export search results as CSV')
test('should perform AI-powered search')
```

### 3. Map Tests (`map.spec.ts`)

**Coverage:**
- Map initialization
- Navigation controls
- Marker interactions
- Clustering behavior
- Filter controls
- Sidebar functionality
- Location search

**Key Test Cases:**
```typescript
test('should display business markers')
test('should show popup on marker click')
test('should handle marker clustering')
test('should filter businesses on map')
test('should search for location')
```

### 4. Business Detail Tests (`business-detail.spec.ts`)

**Coverage:**
- Page layout and sections
- Business information display
- Contact information
- Location map
- Business actions (save, share, export)
- Related businesses
- Responsive design

**Key Test Cases:**
```typescript
test('should display business information')
test('should save business')
test('should share on social media')
test('should export business details')
test('should navigate to related business')
```

### 5. Email Notification Tests (`email-notifications.spec.ts`)

**Coverage:**
- Email verification flow
- Notification settings management
- Password reset emails
- Welcome emails
- Alert preferences
- Email delivery status

**Key Test Cases:**
```typescript
test('should request verification email')
test('should toggle notification preferences')
test('should save notification settings')
test('should trigger welcome email on signup')
test('should handle email service errors')
```

## Writing New Tests

### Test Template

```typescript
import { test, expect } from '@playwright/test'
import { /* helper functions */ } from './helpers/test-helpers'

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    // Setup before each test
    await page.goto('/feature-page')
  })

  test.afterEach(async ({ page }) => {
    // Cleanup after each test
  })

  test('should do something specific', async ({ page }) => {
    // Arrange
    await page.fill('input[name="field"]', 'value')
    
    // Act
    await page.click('button[type="submit"]')
    
    // Assert
    await expect(page.locator('.success')).toBeVisible()
  })
})
```

### Common Patterns

**Waiting for elements:**
```typescript
// Wait for element to be visible
await expect(page.locator('.element')).toBeVisible()

// Wait for element with timeout
await expect(page.locator('.element')).toBeVisible({ timeout: 10000 })

// Wait for multiple elements
await expect(page.locator('.items')).toHaveCount(5)
```

**Interacting with forms:**
```typescript
// Fill input
await page.fill('input[name="email"]', 'test@example.com')

// Select dropdown
await page.selectOption('select[name="category"]', 'Technology')

// Check checkbox
await page.check('input[type="checkbox"]')

// Upload file
await page.setInputFiles('input[type="file"]', 'path/to/file.pdf')
```

**Assertions:**
```typescript
// Text content
await expect(page.locator('h1')).toHaveText('Expected Title')
await expect(page.locator('.description')).toContainText('partial text')

// Attributes
await expect(page.locator('button')).toHaveAttribute('disabled', '')
await expect(page.locator('input')).toHaveValue('expected value')

// Visibility
await expect(page.locator('.modal')).toBeVisible()
await expect(page.locator('.hidden')).not.toBeVisible()

// Count
await expect(page.locator('.item')).toHaveCount(10)
```

## Best Practices

### 1. Use Data Test IDs

Add `data-testid` attributes to elements for reliable selection:

```tsx
<button data-testid="submit-button">Submit</button>
```

```typescript
await page.click('[data-testid="submit-button"]')
```

### 2. Avoid Hard-coded Waits

Instead of:
```typescript
await page.waitForTimeout(5000) // Bad
```

Use:
```typescript
await expect(page.locator('.element')).toBeVisible() // Good
await page.waitForLoadState('networkidle') // Good
```

### 3. Use Page Object Model (Optional)

Create page objects for complex pages:

```typescript
class SearchPage {
  constructor(private page: Page) {}

  async search(query: string) {
    await this.page.fill('[data-testid="search-input"]', query)
    await this.page.press('[data-testid="search-input"]', 'Enter')
  }

  async applyFilter(filter: string) {
    await this.page.click(`[data-testid="filter-${filter}"]`)
  }
}
```

### 4. Handle Flaky Tests

```typescript
test('potentially flaky test', async ({ page }) => {
  // Retry specific assertions
  await expect(async () => {
    await page.click('button')
    await expect(page.locator('.result')).toBeVisible()
  }).toPass({ timeout: 10000 })
})
```

### 5. Test Data Management

```typescript
// Use unique data for each test
const uniqueEmail = `test-${Date.now()}@example.com`

// Clean up test data
test.afterEach(async ({ page }) => {
  // Delete created resources
})
```

## Debugging Tests

### Visual Debugging

```bash
# Run with --debug flag
npx playwright test --debug

# Use page.pause() in tests
test('debug this test', async ({ page }) => {
  await page.goto('/page')
  await page.pause() // Pauses execution here
  await page.click('button')
})
```

### Screenshots and Videos

```typescript
// Take screenshot on demand
await page.screenshot({ path: 'screenshot.png' })

// Configure in playwright.config.ts
use: {
  screenshot: 'only-on-failure',
  video: 'retain-on-failure',
  trace: 'on-first-retry',
}
```

### View Test Reports

```bash
# Generate and open HTML report
npx playwright show-report
```

### Trace Viewer

```bash
# View trace for failed tests
npx playwright show-trace trace.zip
```

## CI/CD Integration

### GitHub Actions

Create `.github/workflows/playwright.yml`:

```yaml
name: Playwright Tests
on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    timeout-minutes: 60
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    
    - uses: actions/setup-node@v3
      with:
        node-version: 18
        
    - name: Install dependencies
      run: npm ci
      
    - name: Install Playwright Browsers
      run: npx playwright install --with-deps
      
    - name: Run Playwright tests
      run: npx playwright test
      
    - uses: actions/upload-artifact@v3
      if: always()
      with:
        name: playwright-report
        path: playwright-report/
        retention-days: 30
```

### GitLab CI

Create `.gitlab-ci.yml`:

```yaml
playwright:
  image: mcr.microsoft.com/playwright:v1.40.0-focal
  stage: test
  script:
    - npm ci
    - npx playwright test
  artifacts:
    when: always
    paths:
      - playwright-report/
    expire_in: 1 week
```

## Troubleshooting

### Common Issues and Solutions

**1. Tests failing on CI but passing locally**
- Check environment variables
- Ensure same Node.js version
- Verify database state
- Check for timezone differences

**2. Timeout errors**
```typescript
// Increase timeout for slow operations
test.setTimeout(60000) // 60 seconds

// Or per assertion
await expect(page.locator('.slow')).toBeVisible({ timeout: 30000 })
```

**3. Element not found**
- Check if element is in iframe
- Verify element is not hidden
- Ensure page is fully loaded
- Check for dynamic content

**4. Authentication issues**
```typescript
// Save and reuse authentication state
await page.context().storageState({ path: 'auth.json' })

// Reuse in other tests
const context = await browser.newContext({
  storageState: 'auth.json'
})
```

**5. Flaky map tests**
```typescript
// Wait for map to fully initialize
await page.waitForSelector('.leaflet-tile-loaded')
await page.waitForTimeout(1000) // Additional buffer for animations
```

### Debug Commands

```bash
# Run single test in debug mode
npx playwright test tests/auth.spec.ts --debug

# Run with verbose logging
DEBUG=pw:api npx playwright test

# Generate new test with recorder
npx playwright codegen http://localhost:3000

# Open last HTML report
npx playwright show-report

# View trace file
npx playwright show-trace trace.zip
```

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Playwright API Reference](https://playwright.dev/docs/api/class-playwright)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [CI/CD Guide](https://playwright.dev/docs/ci)
- [Debugging Guide](https://playwright.dev/docs/debug)

## Support

For issues or questions about tests:
1. Check this guide first
2. Review existing test examples
3. Consult Playwright documentation
4. Open an issue in the repository

---

Happy Testing! 🎭