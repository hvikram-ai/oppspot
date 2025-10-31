/**
 * Contract Test: M&A Prediction Retrieval API
 *
 * Purpose: Verify API contract for prediction retrieval endpoints
 * Reference: specs/011-m-a-target/contracts/api-predict.yaml
 * Expected: These tests MUST FAIL until T024-T027 are implemented
 *
 * Endpoints tested:
 * - GET /api/ma-predictions/{companyId}
 * - GET /api/ma-predictions/{companyId}/history
 *
 * Performance target: <5 seconds (FR-029)
 */

import { test, expect } from '@playwright/test';

const TEST_COMPANY_ID = '123e4567-e89b-12d3-a456-426614174000';

test.describe('GET /api/ma-predictions/{companyId}', () => {
  test('should return prediction with all required fields', async ({ request }) => {
    // Act: Fetch prediction
    const startTime = Date.now();
    const response = await request.get(`/api/ma-predictions/${TEST_COMPANY_ID}`);
    const duration = Date.now() - startTime;

    // Assert: Response status
    expect(response.status()).toBe(200);

    // Assert: Performance (FR-029: <5 seconds)
    expect(duration).toBeLessThan(5000);

    const body = await response.json();

    // Assert: Response has prediction object
    expect(body).toHaveProperty('prediction');
    const prediction = body.prediction;

    // Assert: Required prediction fields
    expect(prediction).toHaveProperty('id');
    expect(typeof prediction.id).toBe('string');

    expect(prediction).toHaveProperty('company_id');
    expect(prediction.company_id).toBe(TEST_COMPANY_ID);

    expect(prediction).toHaveProperty('prediction_score');
    expect(typeof prediction.prediction_score).toBe('number');
    expect(prediction.prediction_score).toBeGreaterThanOrEqual(0);
    expect(prediction.prediction_score).toBeLessThanOrEqual(100);

    expect(prediction).toHaveProperty('likelihood_category');
    expect(['Low', 'Medium', 'High', 'Very High']).toContain(prediction.likelihood_category);

    expect(prediction).toHaveProperty('confidence_level');
    expect(['High', 'Medium', 'Low']).toContain(prediction.confidence_level);

    expect(prediction).toHaveProperty('analysis_version');
    expect(typeof prediction.analysis_version).toBe('string');

    expect(prediction).toHaveProperty('created_at');
    expect(prediction).toHaveProperty('updated_at');
    expect(prediction).toHaveProperty('data_last_refreshed');

    // Assert: Optional fields
    if (prediction.calculation_time_ms !== undefined) {
      expect(typeof prediction.calculation_time_ms).toBe('number');
      expect(prediction.calculation_time_ms).toBeGreaterThan(0);
    }
  });

  test('should return factors when include=factors', async ({ request }) => {
    // Act
    const response = await request.get(`/api/ma-predictions/${TEST_COMPANY_ID}?include=factors`);

    // Assert
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body).toHaveProperty('factors');
    expect(Array.isArray(body.factors)).toBe(true);

    // Assert: Top 5 factors maximum (per spec)
    expect(body.factors.length).toBeLessThanOrEqual(5);

    if (body.factors.length > 0) {
      const factor = body.factors[0];

      // Assert: Required factor fields
      expect(factor).toHaveProperty('rank');
      expect(factor.rank).toBeGreaterThanOrEqual(1);
      expect(factor.rank).toBeLessThanOrEqual(5);

      expect(factor).toHaveProperty('factor_type');
      expect(['financial', 'operational', 'market', 'historical']).toContain(factor.factor_type);

      expect(factor).toHaveProperty('factor_name');
      expect(typeof factor.factor_name).toBe('string');

      expect(factor).toHaveProperty('factor_description');
      expect(typeof factor.factor_description).toBe('string');

      expect(factor).toHaveProperty('impact_weight');
      expect(factor.impact_weight).toBeGreaterThanOrEqual(0);
      expect(factor.impact_weight).toBeLessThanOrEqual(100);

      if (factor.impact_direction !== undefined) {
        expect(['positive', 'negative', 'neutral']).toContain(factor.impact_direction);
      }

      // Assert: supporting_value is JSONB (object)
      if (factor.supporting_value !== undefined) {
        expect(typeof factor.supporting_value).toBe('object');
      }
    }
  });

  test('should return valuation when include=valuation', async ({ request }) => {
    // Act
    const response = await request.get(`/api/ma-predictions/${TEST_COMPANY_ID}?include=valuation`);

    // Assert
    expect(response.status()).toBe(200);

    const body = await response.json();

    // Valuation may be null for Low likelihood targets
    if (body.valuation !== null) {
      expect(body).toHaveProperty('valuation');
      const valuation = body.valuation;

      // Assert: Required valuation fields
      expect(valuation).toHaveProperty('min_valuation_gbp');
      expect(typeof valuation.min_valuation_gbp).toBe('number');
      expect(valuation.min_valuation_gbp).toBeGreaterThan(0);

      expect(valuation).toHaveProperty('max_valuation_gbp');
      expect(typeof valuation.max_valuation_gbp).toBe('number');
      expect(valuation.max_valuation_gbp).toBeGreaterThanOrEqual(valuation.min_valuation_gbp);

      expect(valuation).toHaveProperty('currency');
      expect(valuation.currency).toBe('GBP');

      expect(valuation).toHaveProperty('valuation_method');
      expect(typeof valuation.valuation_method).toBe('string');

      expect(valuation).toHaveProperty('confidence_level');
      expect(['High', 'Medium', 'Low']).toContain(valuation.confidence_level);

      // Assert: key_assumptions is JSONB (object)
      if (valuation.key_assumptions !== undefined) {
        expect(typeof valuation.key_assumptions).toBe('object');
      }
    }
  });

  test('should return acquirer profiles when include=acquirers', async ({ request }) => {
    // Act
    const response = await request.get(`/api/ma-predictions/${TEST_COMPANY_ID}?include=acquirers`);

    // Assert
    expect(response.status()).toBe(200);

    const body = await response.json();

    // Acquirer profiles may be empty for Low/Medium likelihood
    if (body.acquirer_profiles && body.acquirer_profiles.length > 0) {
      expect(Array.isArray(body.acquirer_profiles)).toBe(true);
      expect(body.acquirer_profiles.length).toBeLessThanOrEqual(10);

      const profile = body.acquirer_profiles[0];

      // Assert: Required acquirer profile fields
      expect(profile).toHaveProperty('rank');
      expect(profile.rank).toBeGreaterThanOrEqual(1);
      expect(profile.rank).toBeLessThanOrEqual(10);

      expect(profile).toHaveProperty('industry_match');
      expect(typeof profile.industry_match).toBe('string');

      expect(profile).toHaveProperty('size_ratio_description');
      expect(typeof profile.size_ratio_description).toBe('string');

      expect(profile).toHaveProperty('geographic_proximity');
      expect(typeof profile.geographic_proximity).toBe('string');

      expect(profile).toHaveProperty('strategic_rationale');
      expect([
        'horizontal_integration',
        'vertical_integration',
        'technology_acquisition',
        'market_expansion',
        'talent_acquisition',
        'other'
      ]).toContain(profile.strategic_rationale);

      expect(profile).toHaveProperty('match_score');
      expect(profile.match_score).toBeGreaterThanOrEqual(0);
      expect(profile.match_score).toBeLessThanOrEqual(100);

      // potential_acquirer_id is nullable (UUID or null)
      if (profile.potential_acquirer_id !== null) {
        expect(typeof profile.potential_acquirer_id).toBe('string');
      }
    }
  });

  test('should return all data when include=all', async ({ request }) => {
    // Act
    const response = await request.get(`/api/ma-predictions/${TEST_COMPANY_ID}?include=all`);

    // Assert
    expect(response.status()).toBe(200);

    const body = await response.json();

    expect(body).toHaveProperty('prediction');
    expect(body).toHaveProperty('factors');
    expect(Array.isArray(body.factors)).toBe(true);

    // Valuation and acquirer_profiles may be null/empty for low likelihood
    if (body.valuation !== null) {
      expect(body).toHaveProperty('valuation');
    }
  });

  test('should return 404 for company without prediction', async ({ request }) => {
    // Act: Request prediction for non-existent company
    const nonExistentId = '999e9999-e99b-99d9-a999-999999999999';
    const response = await request.get(`/api/ma-predictions/${nonExistentId}`);

    // Assert
    expect(response.status()).toBe(404);

    const body = await response.json();
    expect(body).toHaveProperty('error');
    expect(body).toHaveProperty('message');
    expect(body).toHaveProperty('code');
    expect(body.code).toBe(404);
  });

  test('should return 404 for company with insufficient data', async ({ request }) => {
    // Act: This would be a company with <2 years financial data
    const insufficientDataId = '111e1111-e11b-11d1-a111-111111111111';
    const response = await request.get(`/api/ma-predictions/${insufficientDataId}`);

    // Assert: Either 404 or 200 with explicit "insufficient data" message
    if (response.status() === 404) {
      const body = await response.json();
      expect(body.message).toContain('Insufficient data');
    } else {
      // Some implementations may return 200 with null prediction
      expect(response.status()).toBe(200);
    }
  });

  test('should return 401 when not authenticated', async ({ request }) => {
    // Act: Request without auth header
    const response = await request.get(`/api/ma-predictions/${TEST_COMPANY_ID}`, {
      headers: {
        'Authorization': '' // Remove auth
      }
    });

    // Assert
    expect(response.status()).toBe(401);

    const body = await response.json();
    expect(body).toHaveProperty('error');
    expect(body).toHaveProperty('code');
    expect(body.code).toBe(401);
  });

  test('should validate invalid UUID returns 400', async ({ request }) => {
    // Act: Invalid UUID format
    const response = await request.get('/api/ma-predictions/not-a-uuid');

    // Assert: Either 400 or 404 depending on implementation
    expect([400, 404]).toContain(response.status());
  });
});

test.describe('GET /api/ma-predictions/{companyId}/history', () => {
  test('should return historical predictions array', async ({ request }) => {
    // Act
    const response = await request.get(`/api/ma-predictions/${TEST_COMPANY_ID}/history`);

    // Assert
    expect(response.status()).toBe(200);

    const body = await response.json();

    expect(body).toHaveProperty('predictions');
    expect(Array.isArray(body.predictions)).toBe(true);

    expect(body).toHaveProperty('total_count');
    expect(typeof body.total_count).toBe('number');
    expect(body.total_count).toBeGreaterThanOrEqual(0);

    // Assert: Each prediction in history has required fields
    if (body.predictions.length > 0) {
      const prediction = body.predictions[0];

      expect(prediction).toHaveProperty('id');
      expect(prediction).toHaveProperty('company_id');
      expect(prediction).toHaveProperty('prediction_score');
      expect(prediction).toHaveProperty('likelihood_category');
      expect(prediction).toHaveProperty('confidence_level');
      expect(prediction).toHaveProperty('created_at');
      expect(prediction).toHaveProperty('updated_at');

      // Historical predictions should be sorted by created_at DESC
      if (body.predictions.length > 1) {
        const first = new Date(body.predictions[0].created_at);
        const second = new Date(body.predictions[1].created_at);
        expect(first.getTime()).toBeGreaterThanOrEqual(second.getTime());
      }
    }
  });

  test('should respect limit parameter', async ({ request }) => {
    // Act: Request with limit=3
    const response = await request.get(`/api/ma-predictions/${TEST_COMPANY_ID}/history?limit=3`);

    // Assert
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.predictions.length).toBeLessThanOrEqual(3);
  });

  test('should default to limit=10', async ({ request }) => {
    // Act: Request without limit parameter
    const response = await request.get(`/api/ma-predictions/${TEST_COMPANY_ID}/history`);

    // Assert
    expect(response.status()).toBe(200);

    const body = await response.json();
    // If more than 10 historical records exist, should only return 10
    expect(body.predictions.length).toBeLessThanOrEqual(10);
  });

  test('should enforce minimum limit=1', async ({ request }) => {
    // Act: Request with invalid limit=0
    const response = await request.get(`/api/ma-predictions/${TEST_COMPANY_ID}/history?limit=0`);

    // Assert: Either 400 or defaults to minimum of 1
    if (response.status() === 400) {
      const body = await response.json();
      expect(body).toHaveProperty('error');
    } else {
      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.predictions.length).toBeLessThanOrEqual(10);
    }
  });

  test('should enforce maximum limit=100', async ({ request }) => {
    // Act: Request with excessive limit=999
    const response = await request.get(`/api/ma-predictions/${TEST_COMPANY_ID}/history?limit=999`);

    // Assert: Either 400 or caps at 100
    if (response.status() === 400) {
      const body = await response.json();
      expect(body).toHaveProperty('error');
    } else {
      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.predictions.length).toBeLessThanOrEqual(100);
    }
  });

  test('should return 401 when not authenticated', async ({ request }) => {
    // Act: Request without auth
    const response = await request.get(`/api/ma-predictions/${TEST_COMPANY_ID}/history`, {
      headers: {
        'Authorization': ''
      }
    });

    // Assert
    expect(response.status()).toBe(401);
  });

  test('should return empty array for company with no history', async ({ request }) => {
    // Act: New company with no predictions yet
    const newCompanyId = '222e2222-e22b-22d2-a222-222222222222';
    const response = await request.get(`/api/ma-predictions/${newCompanyId}/history`);

    // Assert: Either 200 with empty array or 404
    if (response.status() === 200) {
      const body = await response.json();
      expect(body.predictions).toEqual([]);
      expect(body.total_count).toBe(0);
    } else {
      expect(response.status()).toBe(404);
    }
  });
});
