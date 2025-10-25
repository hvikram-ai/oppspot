/**
 * Integration Test: GDPR Compliance
 * T016: Verify data protection and privacy requirements
 *
 * This test MUST FAIL initially (endpoints don't exist yet)
 * Validates: FR-031, FR-032, FR-033, NFR-006, NFR-007, NFR-008
 */

import { test, expect } from '@playwright/test';
import fs from 'fs';

test.describe('ResearchGPT GDPR Compliance Integration', () => {

  test.beforeEach(async ({ page }) => {
    // Login as demo user
    await page.goto('/login');
    await page.fill('[name="email"]', 'demo@oppspot.com');
    await page.fill('[name="password"]', 'Demo123456!');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
  });

  test('should only include business emails (no personal emails)', async ({ request, page }) => {
    const cookies = await page.context().cookies();
    const authCookie = cookies.find(c => c.name.includes('auth'));

    // Generate research
    const response = await request.post('/api/research/mock-monzo', {
      headers: {
        'Cookie': `${authCookie?.name}=${authCookie?.value}`,
      },
    });
    const data = await response.json();

    // Wait for completion
    let reportData;
    let attempts = 0;
    while (attempts < 60) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const getResponse = await request.get(`/api/research/${data.report_id}`, {
        headers: {
          'Cookie': `${authCookie?.name}=${authCookie?.value}`,
        },
      });
      reportData = await getResponse.json();
      if (reportData.status === 'complete') break;
      attempts++;
    }

    // Find decision makers section
    const decisionMakersSection = reportData.sections.find(
      (s: { section_type: string }) => s.section_type === 'decision_makers'
    );

    expect(decisionMakersSection).toBeDefined();
    const keyPeople = decisionMakersSection.content.key_people || [];

    // Assert: No personal email domains
    const personalDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com'];

    for (const person of keyPeople) {
      if (person.business_email) {
        const emailDomain = person.business_email.split('@')[1];

        // Assert: Not a personal email domain
        expect(personalDomains).not.toContain(emailDomain);

        console.log(`✅ Business email validated: ${person.business_email}`);
      }
    }

    console.log(`✅ GDPR: ${keyPeople.length} decision makers checked, no personal emails found`);
  });

  test('should include source attribution for all contact information', async ({ request, page }) => {
    const cookies = await page.context().cookies();
    const authCookie = cookies.find(c => c.name.includes('auth'));

    // Generate research
    const response = await request.post('/api/research/mock-monzo', {
      headers: {
        'Cookie': `${authCookie?.name}=${authCookie?.value}`,
      },
    });
    const data = await response.json();

    // Wait for completion
    let reportData;
    let attempts = 0;
    while (attempts < 60) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const getResponse = await request.get(`/api/research/${data.report_id}`, {
        headers: {
          'Cookie': `${authCookie?.name}=${authCookie?.value}`,
        },
      });
      reportData = await getResponse.json();
      if (reportData.status === 'complete') break;
      attempts++;
    }

    // Find decision makers section
    const decisionMakersSection = reportData.sections.find(
      (s: { section_type: string }) => s.section_type === 'decision_makers'
    );

    const keyPeople = decisionMakersSection.content.key_people || [];

    // Assert: Every person with contact info has source attribution
    for (const person of keyPeople) {
      if (person.business_email || person.linkedin_url || person.phone_number) {
        // Must have contact_source
        expect(person).toHaveProperty('contact_source');
        expect(person.contact_source).toBeDefined();
        expect(person.contact_source.length).toBeGreaterThan(0);

        // Source should be from approved list
        const approvedSources = [
          'companies_house',
          'company_website',
          'press_release',
          'linkedin',
          'financial_filing',
        ];

        expect(approvedSources.some(source =>
          person.contact_source.toLowerCase().includes(source)
        )).toBe(true);

        console.log(`✅ Contact source: ${person.name} - ${person.contact_source}`);
      }
    }

    console.log(`✅ GDPR: All ${keyPeople.length} contacts have source attribution`);
  });

  test('should cite sources for all data points', async ({ request, page }) => {
    const cookies = await page.context().cookies();
    const authCookie = cookies.find(c => c.name.includes('auth'));

    // Generate research
    const response = await request.post('/api/research/mock-monzo', {
      headers: {
        'Cookie': `${authCookie?.name}=${authCookie?.value}`,
      },
    });
    const data = await response.json();

    // Wait for completion
    let reportData;
    let attempts = 0;
    while (attempts < 60) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const getResponse = await request.get(`/api/research/${data.report_id}`, {
        headers: {
          'Cookie': `${authCookie?.name}=${authCookie?.value}`,
        },
      });
      reportData = await getResponse.json();
      if (reportData.status === 'complete') break;
      attempts++;
    }

    // Assert: At least 10 sources (NFR-005)
    expect(reportData.total_sources).toBeGreaterThanOrEqual(10);

    // Find sources section
    const sourcesSection = reportData.sections.find(
      (s: { section_type: string }) => s.section_type === 'sources'
    );

    expect(sourcesSection).toBeDefined();
    const sources = sourcesSection.content.sources || [];

    // Assert: Each source has required fields
    for (const source of sources) {
      expect(source).toHaveProperty('url');
      expect(source).toHaveProperty('title');
      expect(source).toHaveProperty('source_type');
      expect(source).toHaveProperty('accessed_date');

      // Assert: URL is valid
      expect(source.url).toMatch(/^https?:\/\//);

      // Assert: Source type is from approved list
      const sourceTypes = [
        'companies_house',
        'press_release',
        'news_article',
        'company_website',
        'job_posting',
        'linkedin',
        'financial_filing',
        'industry_report',
      ];
      expect(sourceTypes).toContain(source.source_type);

      console.log(`✅ Source: ${source.title} (${source.source_type})`);
    }

    console.log(`✅ GDPR: ${sources.length} sources properly cited`);
  });

  test('should auto-delete personal data after 6 months', async ({ request, page }) => {
    // This test requires time manipulation and database access
    test.skip();

    // TODO: Implement with database helper
    // 1. Create research report with timestamp 6 months ago
    // 2. Run GDPR cleanup job
    // 3. Verify personal data (emails, phone numbers) anonymized
    // 4. Verify report metadata preserved
    // 5. Verify non-personal data (company fundamentals) preserved
  });

  test('should provide data removal request mechanism', async ({ page }) => {
    // Navigate to settings/privacy page
    await page.goto('/settings');

    // Assert: Privacy section exists
    const privacySection = page.locator('[data-testid="privacy-settings"]');
    await expect(privacySection).toBeVisible({ timeout: 5000 });

    // Assert: Data removal option available
    const dataRemovalButton = privacySection.locator('button:has-text("Remove My Data"), button:has-text("Delete Data")');
    await expect(dataRemovalButton).toBeVisible();

    // Click data removal
    await dataRemovalButton.click();

    // Assert: Confirmation dialog
    const confirmDialog = page.locator('[role="alertdialog"], [role="dialog"]');
    await expect(confirmDialog).toBeVisible();
    await expect(confirmDialog).toContainText(/remove all research data|delete your data/i);
    await expect(confirmDialog).toContainText(/cannot be undone|permanent/i);

    // Assert: Explains what will be removed
    await expect(confirmDialog).toContainText(/research reports|personal information/i);
  });

  test('should handle data removal request (FR-033)', async ({ request, page }) => {
    // This test requires data removal endpoint
    test.skip();

    // TODO: Implement with API endpoint
    // const cookies = await page.context().cookies();
    // const authCookie = cookies.find(c => c.name.includes('auth'));
    //
    // const response = await request.post('/api/research/remove-my-data', {
    //   headers: {
    //     'Cookie': `${authCookie?.name}=${authCookie?.value}`,
    //   },
    //   data: {
    //     confirm: true,
    //     verification_code: '123456',
    //   },
    // });
    //
    // expect(response.status()).toBe(200);
    //
    // // Verify all research reports deleted
    // const historyResponse = await request.get('/api/research/history', {
    //   headers: {
    //     'Cookie': `${authCookie?.name}=${authCookie?.value}`,
    //   },
    // });
    // const historyData = await historyResponse.json();
    // expect(historyData.reports).toHaveLength(0);
  });

  test('should display GDPR-compliant privacy notice', async ({ page }) => {
    await page.goto('/business/mock-monzo');

    // Click research button
    const researchButton = page.locator('button:has-text("Generate Research")');
    await researchButton.click();

    // Assert: Privacy notice visible (first time use)
    const privacyNotice = page.locator('[data-testid="privacy-notice"], [data-testid="gdpr-notice"]');

    if (await privacyNotice.isVisible()) {
      // Assert: Explains data collection
      await expect(privacyNotice).toContainText(/data|information/i);
      await expect(privacyNotice).toContainText(/publicly available|official sources/i);

      // Assert: Link to privacy policy
      const privacyPolicyLink = privacyNotice.locator('a:has-text("Privacy Policy")');
      await expect(privacyPolicyLink).toBeVisible();

      // Assert: Accept button
      const acceptButton = privacyNotice.locator('button:has-text("Accept"), button:has-text("I Understand")');
      await acceptButton.click();

      // Assert: Notice dismissed
      await expect(privacyNotice).not.toBeVisible();
    }
  });

  test('should not scrape personal data from social media', async ({ request, page }) => {
    const cookies = await page.context().cookies();
    const authCookie = cookies.find(c => c.name.includes('auth'));

    // Generate research
    const response = await request.post('/api/research/mock-monzo', {
      headers: {
        'Cookie': `${authCookie?.name}=${authCookie?.value}`,
      },
    });
    const data = await response.json();

    // Wait for completion
    let reportData;
    let attempts = 0;
    while (attempts < 60) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const getResponse = await request.get(`/api/research/${data.report_id}`, {
        headers: {
          'Cookie': `${authCookie?.name}=${authCookie?.value}`,
        },
      });
      reportData = await getResponse.json();
      if (reportData.status === 'complete') break;
      attempts++;
    }

    // Find sources
    const sourcesSection = reportData.sections.find(
      (s: { section_type: string }) => s.section_type === 'sources'
    );
    const sources = sourcesSection.content.sources || [];

    // Assert: No social media scraping (Twitter, Facebook, Instagram)
    const bannedSources = ['twitter.com', 'facebook.com', 'instagram.com', 'tiktok.com'];

    for (const source of sources) {
      const domain = new URL(source.url).hostname;
      expect(bannedSources.some(banned => domain.includes(banned))).toBe(false);
    }

    console.log(`✅ GDPR: No personal social media data scraped`);
  });

  test('should mark data freshness to comply with accuracy requirements', async ({ request, page }) => {
    const cookies = await page.context().cookies();
    const authCookie = cookies.find(c => c.name.includes('auth'));

    // Generate research
    const response = await request.post('/api/research/mock-monzo', {
      headers: {
        'Cookie': `${authCookie?.name}=${authCookie?.value}`,
      },
    });
    const data = await response.json();

    // Wait for completion
    let reportData;
    let attempts = 0;
    while (attempts < 60) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const getResponse = await request.get(`/api/research/${data.report_id}`, {
        headers: {
          'Cookie': `${authCookie?.name}=${authCookie?.value}`,
        },
      });
      reportData = await getResponse.json();
      if (reportData.status === 'complete') break;
      attempts++;
    }

    // Assert: Each section has freshness indicators
    for (const section of reportData.sections) {
      expect(section).toHaveProperty('cached_at');
      expect(section).toHaveProperty('expires_at');

      // Assert: Timestamps are valid
      expect(new Date(section.cached_at).toString()).not.toBe('Invalid Date');
      expect(new Date(section.expires_at).toString()).not.toBe('Invalid Date');
    }

    console.log(`✅ GDPR: Data freshness tracked for accuracy`);
  });

  test('should allow users to export their data (GDPR right to data portability)', async ({ page, request }) => {
    await page.goto('/settings');

    // Assert: Export data option available
    const exportButton = page.locator('button:has-text("Export My Data"), button:has-text("Download Data")');
    await expect(exportButton).toBeVisible({ timeout: 5000 });

    // Click export
    const downloadPromise = page.waitForEvent('download');
    await exportButton.click();
    const download = await downloadPromise;

    // Assert: JSON file downloaded
    expect(download.suggestedFilename()).toMatch(/\.json$/);

    // Optionally verify JSON structure
    const path = await download.path();
    if (path) {
      const exportData = JSON.parse(fs.readFileSync(path, 'utf-8'));

      // Assert: Contains user research data
      expect(exportData).toHaveProperty('user_id');
      expect(exportData).toHaveProperty('research_reports');
      expect(Array.isArray(exportData.research_reports)).toBe(true);
    }

    console.log(`✅ GDPR: User data export successful`);
  });

  test('should respect cookies consent for analytics', async ({ page }) => {
    // Visit site fresh (no cookies)
    await page.goto('/');

    // Assert: Cookie consent banner visible
    const cookieBanner = page.locator('[data-testid="cookie-consent"], #cookie-banner');

    if (await cookieBanner.isVisible()) {
      // Assert: Explains analytics usage
      await expect(cookieBanner).toContainText(/cookies|analytics/i);

      // Assert: Reject option available
      const rejectButton = cookieBanner.locator('button:has-text("Reject"), button:has-text("Decline")');
      await expect(rejectButton).toBeVisible();

      // Click reject
      await rejectButton.click();

      // Assert: No analytics scripts loaded
      const analyticsScript = page.locator('script[src*="analytics"], script[src*="gtag"]');
      expect(await analyticsScript.count()).toBe(0);
    }
  });

  test('should log GDPR-sensitive operations for audit trail', async ({ request, page }) => {
    // This test requires access to audit logs
    test.skip();

    // TODO: Implement with audit log system
    // 1. Generate research (triggers data collection)
    // 2. Request data removal
    // 3. Export data
    // 4. Verify all operations logged with:
    //    - Timestamp
    //    - User ID
    //    - Action type
    //    - IP address (anonymized)
  });

  test('should handle right to rectification (correct inaccurate data)', async ({ page }) => {
    // Navigate to research report
    await page.goto('/research');

    const firstReport = page.locator('[data-testid="history-item"]').first();

    if (await firstReport.isVisible()) {
      await firstReport.click();

      // Assert: Report inaccuracy option available
      const reportIssueButton = page.locator('button:has-text("Report Inaccuracy"), button:has-text("Correct Data")');
      await expect(reportIssueButton).toBeVisible({ timeout: 5000 });

      await reportIssueButton.click();

      // Assert: Form to submit correction
      const correctionForm = page.locator('[data-testid="correction-form"], form');
      await expect(correctionForm).toBeVisible();
      await expect(correctionForm).toContainText(/inaccurate|incorrect|correction/i);
    }
  });
});
