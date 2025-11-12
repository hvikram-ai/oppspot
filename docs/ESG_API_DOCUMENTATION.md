# ESG Risk Screening - API Documentation

## Overview

The ESG Risk Screening API provides programmatic access to ESG scores, metrics, benchmarks, and reports for companies.

**Base URL**: `/api/companies/[companyId]/esg`
**Authentication**: Required (Supabase Auth)
**Rate Limits**: Standard oppSpot API limits apply

---

## Table of Contents

1. [Authentication](#authentication)
2. [Endpoints](#endpoints)
   - [GET /summary](#get-summary)
   - [GET /metrics](#get-metrics)
   - [POST /recompute](#post-recompute)
   - [GET /report](#get-report)
3. [Data Models](#data-models)
4. [Error Handling](#error-handling)
5. [Examples](#examples)

---

## Authentication

All ESG API endpoints require authentication via Supabase Auth.

### Headers Required

```http
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

### Getting a Token

```typescript
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();
const { data: { session } } = await supabase.auth.getSession();
const token = session?.access_token;
```

---

## Endpoints

### GET /summary

**Purpose**: Get ESG summary with category scores, highlights, and sentiment

**Endpoint**: `/api/companies/[companyId]/esg/summary?year=YYYY`

**Query Parameters**:
- `year` (optional): Reporting year (default: current year)
  - Type: `integer`
  - Example: `2024`

**Response**: `ESGSummaryResponse`

```typescript
{
  company_id: string;
  company_name: string;
  period_year: number;
  category_scores: Array<{
    category: 'environmental' | 'social' | 'governance';
    score: number;           // 0-100
    level: 'leading' | 'par' | 'lagging';
    subcategory_scores: Array<{
      subcategory: string;
      score: number;
      level: string;
      metric_count: number;
      data_completeness: number; // 0-100
    }>;
    metric_count: number;
    benchmark_percentile?: number;
    data_completeness: number;
  }>;
  highlights: Array<{
    type: 'strength' | 'weakness';
    category: string;
    message: string;
    score?: number;
  }>;
  sentiment?: Array<{
    period_year: number;
    positive_count: number;
    neutral_count: number;
    negative_count: number;
    recent_items: Array<{
      title: string;
      source: string;
      label: 'positive' | 'neutral' | 'negative';
      excerpt: string;
      url?: string;
      created_at: string;
    }>;
  }>;
  computed_at: string;
}
```

**Example Request**:

```bash
curl -X GET "https://oppspot.ai/api/companies/abc123/esg/summary?year=2024" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Example Response**:

```json
{
  "company_id": "abc123",
  "company_name": "ITONICS Innovation GmbH",
  "period_year": 2024,
  "category_scores": [
    {
      "category": "environmental",
      "score": 52.3,
      "level": "par",
      "subcategory_scores": [
        {
          "subcategory": "Climate & Emissions",
          "score": 48.5,
          "level": "par",
          "metric_count": 3,
          "data_completeness": 100
        },
        {
          "subcategory": "Energy & Resources",
          "score": 56.1,
          "level": "par",
          "metric_count": 2,
          "data_completeness": 100
        }
      ],
      "metric_count": 5,
      "benchmark_percentile": 52,
      "data_completeness": 100
    },
    {
      "category": "social",
      "score": 48.1,
      "level": "par",
      "subcategory_scores": [],
      "metric_count": 4,
      "benchmark_percentile": 45,
      "data_completeness": 80
    },
    {
      "category": "governance",
      "score": 61.2,
      "level": "leading",
      "subcategory_scores": [],
      "metric_count": 4,
      "benchmark_percentile": 78,
      "data_completeness": 100
    }
  ],
  "highlights": [
    {
      "type": "strength",
      "category": "Governance",
      "message": "Leading governance practices with 61/100 score",
      "score": 61.2
    },
    {
      "type": "weakness",
      "category": "Social",
      "message": "Social metrics below par at 48/100",
      "score": 48.1
    }
  ],
  "computed_at": "2024-11-12T10:30:00.000Z"
}
```

**Status Codes**:
- `200 OK`: Success
- `401 Unauthorized`: Missing or invalid auth token
- `404 Not Found`: Company or year data not found
- `500 Internal Server Error`: Server error

---

### GET /metrics

**Purpose**: Get detailed ESG metrics with benchmark data

**Endpoint**: `/api/companies/[companyId]/esg/metrics?year=YYYY&category=...`

**Query Parameters**:
- `year` (optional): Reporting year (default: current year)
- `category` (optional): Filter by category
  - Values: `environmental`, `social`, `governance`
- `subcategory` (optional): Filter by subcategory
  - Examples: `Climate & Emissions`, `Labor & Human Rights`
- `limit` (optional): Number of results (default: 100)
- `offset` (optional): Pagination offset (default: 0)

**Response**: `ESGMetricsListResponse`

```typescript
{
  company_id: string;
  period_year: number;
  metrics: Array<{
    id: string;
    category: 'environmental' | 'social' | 'governance';
    subcategory: string;
    metric_key: string;
    metric_name: string;
    value_numeric?: number;
    value_text?: string;
    unit?: string;
    confidence: number;        // 0-1
    source?: string;
    citation?: {
      document_id?: string;
      page_number?: number;
      excerpt?: string;
    };
    benchmark?: {
      sector: string;
      size_band: string;
      region: string;
      p10: number;
      p25: number;
      p50: number;
      p75: number;
      p90: number;
      sample_size?: number;
      data_year?: number;
    };
    has_benchmark: boolean;
    created_at: string;
    updated_at: string;
  }>;
  total_count: number;
  returned_count: number;
  filters: {
    category?: string;
    subcategory?: string;
    sector: string;
    size_band: string;
  };
  pagination: {
    limit: number;
    offset: number;
    has_more: boolean;
  };
}
```

**Example Request**:

```bash
curl -X GET "https://oppspot.ai/api/companies/abc123/esg/metrics?year=2024&category=environmental&limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Example Response**:

```json
{
  "company_id": "abc123",
  "period_year": 2024,
  "metrics": [
    {
      "id": "metric-123",
      "category": "environmental",
      "subcategory": "Climate & Emissions",
      "metric_key": "ghg_scope1_tco2e",
      "metric_name": "GHG Scope 1 Emissions",
      "value_numeric": 450,
      "unit": "tCO2e",
      "confidence": 0.92,
      "source": "Sustainability Report 2024",
      "citation": {
        "document_id": "doc-456",
        "page_number": 15,
        "excerpt": "Our Scope 1 emissions totaled 450 tCO2e in 2024..."
      },
      "benchmark": {
        "sector": "Technology",
        "size_band": "medium",
        "region": "UK",
        "p10": 50,
        "p25": 150,
        "p50": 400,
        "p75": 1000,
        "p90": 2500,
        "sample_size": 45,
        "data_year": 2024
      },
      "has_benchmark": true,
      "created_at": "2024-11-01T09:00:00.000Z",
      "updated_at": "2024-11-01T09:00:00.000Z"
    }
  ],
  "total_count": 12,
  "returned_count": 1,
  "filters": {
    "category": "environmental",
    "sector": "Technology",
    "size_band": "medium"
  },
  "pagination": {
    "limit": 10,
    "offset": 0,
    "has_more": true
  }
}
```

**Status Codes**:
- `200 OK`: Success
- `400 Bad Request`: Invalid query parameters
- `401 Unauthorized`: Missing or invalid auth token
- `404 Not Found`: Company or year data not found
- `500 Internal Server Error`: Server error

---

### POST /recompute

**Purpose**: Trigger recomputation of ESG scores from metrics

**Endpoint**: `/api/companies/[companyId]/esg/recompute`

**Request Body**:

```typescript
{
  period_year: number;       // Required: Year to recompute
  force?: boolean;           // Optional: Force recompute even if recent (default: false)
  include_sentiment?: boolean; // Optional: Include sentiment analysis (default: false)
}
```

**Response**:

```typescript
{
  message: string;
  company_id: string;
  company_name: string;
  period_year: number;
  status: 'success' | 'error';
  metrics_processed: number;
  scores_computed: number;
  scores_saved: number;
  category_summary: {
    [category: string]: {
      score: number;
      level: 'leading' | 'par' | 'lagging';
    };
  };
  computed_at: string;
  error?: string;
}
```

**Example Request**:

```bash
curl -X POST "https://oppspot.ai/api/companies/abc123/esg/recompute" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "period_year": 2024,
    "force": true
  }'
```

**Example Response**:

```json
{
  "message": "ESG scores recomputed successfully",
  "company_id": "abc123",
  "company_name": "ITONICS Innovation GmbH",
  "period_year": 2024,
  "status": "success",
  "metrics_processed": 12,
  "scores_computed": 8,
  "scores_saved": 8,
  "category_summary": {
    "environmental": {
      "score": 52.3,
      "level": "par"
    },
    "social": {
      "score": 48.1,
      "level": "par"
    },
    "governance": {
      "score": 61.2,
      "level": "leading"
    }
  },
  "computed_at": "2024-11-12T10:45:00.000Z"
}
```

**Status Codes**:
- `200 OK`: Success
- `400 Bad Request`: Invalid request body
- `401 Unauthorized`: Missing or invalid auth token
- `404 Not Found`: Company not found
- `500 Internal Server Error`: Server error

---

### GET /report

**Purpose**: Generate and download ESG PDF report

**Endpoint**: `/api/companies/[companyId]/esg/report?year=YYYY&format=pdf`

**Query Parameters**:
- `year` (optional): Reporting year (default: current year)
- `format` (optional): Export format (default: `pdf`)
  - Values: `pdf`, `json`

**Response**:
- **For PDF**: Binary PDF file
  - Content-Type: `application/pdf`
  - Content-Disposition: `attachment; filename="ESG_Report_[CompanyName]_[Year].pdf"`
- **For JSON**: Same as `/summary` endpoint

**Example Request**:

```bash
curl -X GET "https://oppspot.ai/api/companies/abc123/esg/report?year=2024&format=pdf" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o ESG_Report.pdf
```

**PDF Report Contents**:
1. **Cover Page**: Company name, reporting period, generation date
2. **Executive Summary**: Category scores, highlights
3. **Environmental Details**: Score, subcategories, key metrics
4. **Social Details**: Score, subcategories, key metrics
5. **Governance Details**: Score, subcategories, key metrics
6. **Metrics Overview**: Complete metrics inventory

**Status Codes**:
- `200 OK`: Success (PDF binary or JSON)
- `400 Bad Request`: Invalid format parameter
- `401 Unauthorized`: Missing or invalid auth token
- `404 Not Found`: Company or year data not found
- `500 Internal Server Error`: Server error

---

## Data Models

### ESGCategory

```typescript
type ESGCategory = 'environmental' | 'social' | 'governance';
```

### ESGLevel

```typescript
type ESGLevel = 'leading' | 'par' | 'lagging';
```

### ESGMetric

```typescript
interface ESGMetric {
  id: string;
  company_id: string;
  period_year: number;
  category: ESGCategory;
  subcategory: string;
  metric_key: string;
  metric_name: string;
  value_numeric?: number;
  value_text?: string;
  unit?: string;
  confidence: number;        // 0-1
  source?: string;
  citation?: {
    document_id?: string;
    page_number?: number;
    chunk_index?: number;
    excerpt?: string;
  };
  created_at: string;
  updated_at: string;
}
```

### ESGScore

```typescript
interface ESGScore {
  id: string;
  company_id: string;
  period_year: number;
  category: ESGCategory;
  subcategory?: string;
  score: number;             // 0-100
  level: ESGLevel;
  details?: {
    metric_count?: number;
    data_completeness?: number;
    benchmark_percentile?: number;
    weights?: Record<string, number>;
    gaps?: string[];
    improvements?: string[];
  };
  computed_at: string;
}
```

### ESGBenchmark

```typescript
interface ESGBenchmark {
  id: string;
  metric_key: string;
  sector: string;
  size_band: string;
  region: string;
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
  sample_size?: number;
  data_year?: number;
  updated_at: string;
}
```

---

## Error Handling

### Error Response Format

```typescript
{
  error: string;           // Error message
  details?: string;        // Additional error details
  code?: string;           // Error code
  status: number;          // HTTP status code
}
```

### Common Error Codes

| Status | Error Code | Message | Resolution |
|--------|------------|---------|------------|
| 400 | `INVALID_YEAR` | Invalid year parameter | Use valid year (e.g., 2024) |
| 401 | `UNAUTHORIZED` | Missing or invalid token | Provide valid auth token |
| 404 | `COMPANY_NOT_FOUND` | Company not found | Check company ID |
| 404 | `NO_ESG_DATA` | No ESG data for period | Upload ESG documents or check year |
| 500 | `SCORE_COMPUTATION_FAILED` | Score computation failed | Retry or contact support |
| 500 | `PDF_GENERATION_FAILED` | PDF generation failed | Retry or contact support |

### Example Error Response

```json
{
  "error": "No ESG data found for period",
  "details": "No metrics exist for company abc123 in year 2024",
  "code": "NO_ESG_DATA",
  "status": 404
}
```

---

## Examples

### TypeScript/JavaScript

#### Get ESG Summary

```typescript
import { createClient } from '@/lib/supabase/client';

async function getESGSummary(companyId: string, year: number) {
  const supabase = createClient();

  const response = await fetch(
    `/api/companies/${companyId}/esg/summary?year=${year}`,
    {
      headers: {
        'Authorization': `Bearer ${supabase.auth.session?.access_token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch ESG summary');
  }

  return await response.json();
}

// Usage
const summary = await getESGSummary('abc123', 2024);
console.log(`Environmental Score: ${summary.category_scores[0].score}`);
```

#### Recompute Scores

```typescript
async function recomputeESGScores(companyId: string, year: number) {
  const supabase = createClient();

  const response = await fetch(
    `/api/companies/${companyId}/esg/recompute`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabase.auth.session?.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        period_year: year,
        force: true,
      }),
    }
  );

  if (!response.ok) {
    throw new Error('Failed to recompute scores');
  }

  return await response.json();
}

// Usage
const result = await recomputeESGScores('abc123', 2024);
console.log(`Computed ${result.scores_computed} scores`);
```

#### Export PDF

```typescript
async function exportESGReport(companyId: string, year: number) {
  const supabase = createClient();

  const response = await fetch(
    `/api/companies/${companyId}/esg/report?year=${year}&format=pdf`,
    {
      headers: {
        'Authorization': `Bearer ${supabase.auth.session?.access_token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to export report');
  }

  // Download PDF
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ESG_Report_${companyId}_${year}.pdf`;
  a.click();
  window.URL.revokeObjectURL(url);
}

// Usage
await exportESGReport('abc123', 2024);
```

### Python

#### Get ESG Metrics

```python
import requests

def get_esg_metrics(company_id, year, token):
    url = f"https://oppspot.ai/api/companies/{company_id}/esg/metrics"
    params = {"year": year, "category": "environmental"}
    headers = {"Authorization": f"Bearer {token}"}

    response = requests.get(url, params=params, headers=headers)
    response.raise_for_status()

    return response.json()

# Usage
metrics = get_esg_metrics("abc123", 2024, "YOUR_TOKEN")
print(f"Found {metrics['total_count']} environmental metrics")
```

### cURL

#### Get ESG Summary

```bash
curl -X GET \
  "https://oppspot.ai/api/companies/abc123/esg/summary?year=2024" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  | jq '.category_scores'
```

#### Recompute Scores

```bash
curl -X POST \
  "https://oppspot.ai/api/companies/abc123/esg/recompute" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"period_year": 2024, "force": true}' \
  | jq '.category_summary'
```

#### Download PDF Report

```bash
curl -X GET \
  "https://oppspot.ai/api/companies/abc123/esg/report?year=2024&format=pdf" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o ESG_Report_2024.pdf
```

---

## Rate Limits

- **Standard Users**: 60 requests/minute per company
- **Premium Users**: 300 requests/minute per company
- **PDF Generation**: 10 requests/minute (resource-intensive)

**Rate Limit Headers**:
```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1699000000
```

---

## Webhooks (Future)

Planned webhook events for ESG updates:

- `esg.scores.computed`: When scores are recomputed
- `esg.metrics.updated`: When new metrics are added
- `esg.benchmarks.updated`: When benchmarks are refreshed

---

## Support

**Technical Support**: api-support@oppspot.ai
**API Issues**: https://github.com/BoardGuruHV/oppspot/issues
**Documentation**: https://docs.oppspot.ai/api/esg

---

**Last Updated**: November 2025
**API Version**: 1.0
**For**: oppSpot ESG Risk Screening API
