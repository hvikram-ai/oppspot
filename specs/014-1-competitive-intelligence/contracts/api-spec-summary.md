# API Contracts: Competitive Intelligence Dashboard

**Version**: 1.0.0
**Base URL**: `/api/competitive-analysis`
**Authentication**: Required (Supabase Auth)

## Endpoints

### Analyses Management

#### `GET /api/competitive-analysis`
List user's analyses (owner or granted access)

**Query Params**:
- `status`: Filter by status (draft|in_progress|completed|archived)
- `limit`: Page size (default 20)
- `offset`: Pagination offset

**Response 200**:
```json
{
  "analyses": [
    {
      "id": "uuid",
      "title": "string",
      "target_company_name": "string",
      "competitor_count": 0,
      "avg_feature_parity_score": 0.00,
      "overall_moat_score": 0.00,
      "last_refreshed_at": "timestamp",
      "created_at": "timestamp"
    }
  ],
  "total": 0
}
```

#### `POST /api/competitive-analysis`
Create new analysis

**Request Body**:
```json
{
  "target_company_name": "string (required)",
  "target_company_website": "string",
  "title": "string (required)",
  "description": "string",
  "market_segment": "string",
  "geography": "string"
}
```

**Response 201**:
```json
{
  "id": "uuid",
  "...": "..."
}
```

#### `GET /api/competitive-analysis/[id]`
Get single analysis with full dashboard data

**Response 200**:
```json
{
  "analysis": {...},
  "competitors": [{...}],
  "feature_parity_scores": [{...}],
  "feature_matrix": [{...}],
  "pricing_comparisons": [{...}],
  "moat_score": {...}
}
```

#### `PATCH /api/competitive-analysis/[id]`
Update analysis metadata (owner only)

**Request Body**: Partial analysis object

**Response 200**: Updated analysis

#### `DELETE /api/competitive-analysis/[id]`
Soft delete analysis (owner only)

**Response 204**: No content

---

### Data Operations

#### `POST /api/competitive-analysis/[id]/refresh`
Trigger on-demand data refresh (FR-009)

**Request Body**: (empty)

**Response 202**:
```json
{
  "status": "processing",
  "estimated_completion_seconds": 120
}
```

#### `POST /api/competitive-analysis/[id]/competitors`
Add competitor to analysis

**Request Body**:
```json
{
  "competitor_name": "string",
  "competitor_website": "string",
  "relationship_type": "direct_competitor"
}
```

**Response 201**: Created competitor relationship

#### `DELETE /api/competitive-analysis/[id]/competitors/[competitorId]`
Remove competitor from analysis

**Response 204**: No content

---

### Sharing & Permissions

#### `POST /api/competitive-analysis/[id]/share`
Invite user to access analysis (FR-020)

**Request Body**:
```json
{
  "user_email": "string",
  "access_level": "view|edit"
}
```

**Response 200**:
```json
{
  "grant_id": "uuid",
  "invitation_sent": true
}
```

#### `DELETE /api/competitive-analysis/[id]/share/[grantId]`
Revoke access (FR-023-NEW)

**Response 204**: No content

---

### Export

#### `GET /api/competitive-analysis/[id]/export?format=pdf|excel|pptx`
Download analysis export (FR-018)

**Response 200**:
- Headers: `Content-Type: application/pdf | application/vnd.openxmlformats-officedocument.spreadsheetml.sheet | application/vnd.openxmlformats-officedocument.presentationml.presentation`
- Headers: `Content-Disposition: attachment; filename="Analysis-{title}-{date}.{ext}"`
- Body: Binary file

**Response 400**: Invalid format

---

### Alerts

#### `GET /api/competitive-analysis/stale-alerts`
Check for analyses with stale data (>30 days) (FR-025)

**Response 200**:
```json
{
  "stale_analyses": [
    {
      "id": "uuid",
      "title": "string",
      "last_refreshed_at": "timestamp",
      "days_since_refresh": 35
    }
  ]
}
```

---

## Error Responses

**401 Unauthorized**: Not authenticated
**403 Forbidden**: Not authorized (not owner, no grant)
**404 Not Found**: Resource doesn't exist
**429 Too Many Requests**: Rate limit exceeded
**500 Internal Server Error**: Server error

---

## Contract Tests

Contract tests validate request/response schemas only (no business logic).

**Location**: `specs/014-1-competitive-intelligence/contracts/test-contracts/`

- `test-analysis-crud.test.ts` - CRUD operations
- `test-refresh.test.ts` - Data refresh endpoint
- `test-sharing.test.ts` - Permission management
- `test-export.test.ts` - Export generation
- `test-stale-alerts.test.ts` - Staleness detection

**Run**: `npm test -- contracts/test-contracts`

---

**API Contracts Complete** | Ready for implementation
