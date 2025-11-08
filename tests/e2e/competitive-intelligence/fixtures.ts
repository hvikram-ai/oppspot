/**
 * Test Fixtures for Competitive Intelligence E2E Tests
 * Provides reusable test data and helper functions
 */

import { Page } from '@playwright/test';

export interface TestAnalysis {
  id?: string;
  title: string;
  target_company_name: string;
  target_company_website?: string;
  description?: string;
  market_segment?: string;
  geography?: string;
}

export interface TestCompetitor {
  id?: string;
  competitor_name: string;
  competitor_website?: string;
  relationship_type?: 'direct_competitor' | 'adjacent_market' | 'potential_threat' | 'substitute';
  threat_level?: 'low' | 'medium' | 'high' | 'critical';
  notes?: string;
}

/**
 * Sample test data for creating analyses
 */
export const sampleAnalyses: TestAnalysis[] = [
  {
    title: 'Q4 2024 SaaS Analytics Competitive Analysis',
    target_company_name: 'Acme Analytics Inc.',
    target_company_website: 'https://acmeanalytics.com',
    description: 'Comprehensive competitive landscape analysis for our SaaS analytics product launch in Q4 2024.',
    market_segment: 'B2B SaaS Analytics',
    geography: 'North America',
  },
  {
    title: 'EMEA Fintech Market Analysis',
    target_company_name: 'FinTech Solutions Ltd',
    target_company_website: 'https://fintechsolutions.co.uk',
    description: 'Market positioning analysis for European fintech expansion.',
    market_segment: 'Fintech',
    geography: 'EMEA',
  },
  {
    title: 'E-commerce Platform Competitive Intel',
    target_company_name: 'ShopSmart Inc',
    target_company_website: 'https://shopsmart.com',
    market_segment: 'E-commerce',
    geography: 'Global',
  },
];

/**
 * Sample competitor data
 */
export const sampleCompetitors: TestCompetitor[] = [
  {
    competitor_name: 'Competitor Alpha',
    competitor_website: 'https://compet itor-alpha.com',
    relationship_type: 'direct_competitor',
    threat_level: 'high',
    notes: 'Market leader in enterprise segment',
  },
  {
    competitor_name: 'Competitor Beta',
    competitor_website: 'https://competitor-beta.com',
    relationship_type: 'direct_competitor',
    threat_level: 'medium',
    notes: 'Strong in mid-market',
  },
  {
    competitor_name: 'Adjacent Player',
    competitor_website: 'https://adjacent-player.com',
    relationship_type: 'adjacent_market',
    threat_level: 'low',
    notes: 'Moving into our space from adjacent market',
  },
];

/**
 * Test user credentials (must exist in test database)
 * NOTE: Using demo@oppspot.com for all roles since dedicated test users could not be created
 */
export const testUsers = {
  owner: {
    email: 'demo@oppspot.com',
    password: 'Demo123456!',
  },
  viewer: {
    email: 'demo@oppspot.com',
    password: 'Demo123456!',
  },
  admin: {
    email: 'demo@oppspot.com',
    password: 'Demo123456!',
  },
};

/**
 * Helper: Login as a test user
 */
export async function loginAsUser(page: Page, userType: 'owner' | 'viewer' | 'admin' = 'owner') {
  const user = testUsers[userType];

  await page.goto('/login');

  // Click the "Password" tab - use text content to find it
  await page.click('button:has-text("Password")');

  // Wait for the sign-in form to be visible
  await page.waitForSelector('input#signin-email', { state: 'visible' });

  // Fill in credentials
  await page.fill('input#signin-email', user.email);
  await page.fill('input#signin-password', user.password);

  // Submit the form
  await page.click('button[type="submit"]:has-text("Sign In")');

  // Wait for redirect to dashboard
  await page.waitForURL('/dashboard', { timeout: 10000 });
}

/**
 * Helper: Navigate to Competitive Intelligence page
 */
export async function navigateToCompetitiveIntelligence(page: Page) {
  await page.goto('/competitive-intelligence');
  await page.waitForLoadState('load');

  // Wait for page content - try h1 first, fall back to waiting for page load
  try {
    await page.waitForSelector('h1', { timeout: 5000 });
  } catch {
    // Page loaded but might have different content - continue anyway
    console.log('H1 not found, but page loaded');
  }
}

/**
 * Helper: Create analysis via API
 */
export async function createAnalysisViaAPI(
  request: any,
  analysisData: TestAnalysis
): Promise<string> {
  const response = await request.post('/api/competitive-analysis', {
    data: analysisData,
  });

  if (!response.ok()) {
    throw new Error(`Failed to create analysis: ${response.status()}`);
  }

  const data = await response.json();
  return data.id;
}

/**
 * Helper: Delete analysis via API (cleanup)
 */
export async function deleteAnalysisViaAPI(request: any, analysisId: string): Promise<void> {
  await request.delete(`/api/competitive-analysis/${analysisId}`);
}

/**
 * Helper: Add competitor via API
 */
export async function addCompetitorViaAPI(
  request: any,
  analysisId: string,
  competitorData: TestCompetitor
): Promise<string> {
  const response = await request.post(
    `/api/competitive-analysis/${analysisId}/competitors`,
    {
      data: competitorData,
    }
  );

  if (!response.ok()) {
    throw new Error(`Failed to add competitor: ${response.status()}`);
  }

  const data = await response.json();
  return data.id;
}

/**
 * Helper: Wait for toast notification
 */
export async function waitForToast(page: Page, expectedText?: string, timeout = 5000) {
  const toastSelector = '[data-sonner-toast]';
  await page.waitForSelector(toastSelector, { timeout });

  if (expectedText) {
    const toastText = await page.locator(toastSelector).textContent();
    if (!toastText?.includes(expectedText)) {
      throw new Error(`Toast does not contain expected text: "${expectedText}". Got: "${toastText}"`);
    }
  }
}

/**
 * Helper: Fill create analysis form
 */
export async function fillCreateAnalysisForm(page: Page, data: TestAnalysis) {
  await page.fill('input#title', data.title);
  await page.fill('input#company-name', data.target_company_name);

  if (data.target_company_website) {
    await page.fill('input#company-website', data.target_company_website);
  }

  if (data.market_segment) {
    await page.fill('input#market-segment', data.market_segment);
  }

  if (data.geography) {
    await page.fill('input#geography', data.geography);
  }

  if (data.description) {
    await page.fill('textarea#description', data.description);
  }
}

/**
 * Helper: Fill add competitor form
 */
export async function fillAddCompetitorForm(page: Page, data: TestCompetitor) {
  await page.fill('input#competitor-name', data.competitor_name);

  if (data.competitor_website) {
    await page.fill('input#competitor-website', data.competitor_website);
  }

  if (data.relationship_type) {
    await page.click('select#relationship-type');
    await page.click(`text=${data.relationship_type.replace('_', ' ')}`);
  }

  if (data.threat_level) {
    await page.click('select#threat-level');
    await page.click(`text=${data.threat_level}`);
  }

  if (data.notes) {
    await page.fill('textarea#notes', data.notes);
  }
}

/**
 * Helper: Assert error message displayed
 */
export async function assertErrorDisplayed(page: Page, errorText?: string) {
  const errorSelector = '[role="alert"]';
  await page.waitForSelector(errorSelector);

  if (errorText) {
    const errorContent = await page.locator(errorSelector).textContent();
    if (!errorContent?.includes(errorText)) {
      throw new Error(`Error does not contain expected text: "${errorText}". Got: "${errorContent}"`);
    }
  }
}

/**
 * Helper: Wait for loading to complete
 */
export async function waitForLoadingComplete(page: Page) {
  // Wait for any loading spinners to disappear
  await page.waitForSelector('[data-loading="true"]', { state: 'hidden', timeout: 10000 }).catch(() => {
    // Ignore if no loading indicator found
  });
}

/**
 * Helper: Get analysis count from list
 */
export async function getAnalysisCount(page: Page): Promise<number> {
  const rows = await page.locator('table tbody tr').count();
  return rows;
}

/**
 * Helper: Get competitor count from table
 */
export async function getCompetitorCount(page: Page): Promise<number> {
  const rows = await page.locator('table tbody tr').count();
  return rows;
}

/**
 * Cleanup: Delete all test analyses
 */
export async function cleanupTestAnalyses(request: any) {
  try {
    const response = await request.get('/api/competitive-analysis?limit=100');
    if (response.ok()) {
      const data = await response.json();
      const analyses = data.analyses || [];

      // Delete all analyses with "Test" or "E2E" in title
      for (const analysis of analyses) {
        if (analysis.title.includes('Test') || analysis.title.includes('E2E') || analysis.title.includes('Q4 2024')) {
          await deleteAnalysisViaAPI(request, analysis.id);
        }
      }
    }
  } catch (error) {
    console.error('Cleanup failed:', error);
  }
}
