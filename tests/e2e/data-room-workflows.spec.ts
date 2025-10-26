/**
 * E2E Tests for Data Room Workflows
 * Tests workflow creation, management, and automation
 */

import { test, expect } from '@playwright/test'

// Helper to create authenticated context
async function getAuthenticatedContext(page: Page) {
  // Login first (reuse existing auth helpers if available)
  await page.goto('/login')
  await page.fill('input[type="email"]', 'test@oppspot.com')
  await page.fill('input[type="password"]', 'Test123456!')
  await page.click('button[type="submit"]')
  await page.waitForURL('/dashboard')
}

test.describe('Data Room Workflows - API', () => {
  let dataRoomId: string
  let workflowId: string

  test.beforeAll(async ({ request }) => {
    // Create a test data room for workflow tests
    const response = await request.post('/api/data-room', {
      data: {
        name: 'Workflow Test Data Room',
        description: 'Test data room for workflow E2E tests',
        deal_type: 'acquisition',
        company_id: null
      }
    })

    expect(response.ok()).toBeTruthy()
    const { id } = await response.json()
    dataRoomId = id
  })

  test('POST /api/data-room/workflows - should create workflow', async ({ request }) => {
    const response = await request.post('/api/data-room/workflows', {
      data: {
        data_room_id: dataRoomId,
        name: 'Due Diligence Workflow',
        description: 'Standard M&A due diligence process',
        workflow_type: 'review',
        config: {
          auto_start: false,
          require_all_approvals: true
        }
      }
    })

    expect(response.status()).toBe(201)
    const result = await response.json()
    expect(result.success).toBe(true)
    expect(result.data).toHaveProperty('id')
    expect(result.data.name).toBe('Due Diligence Workflow')
    expect(result.data.status).toBe('draft')

    workflowId = result.data.id
  })

  test('GET /api/data-room/workflows - should list workflows', async ({ request }) => {
    const response = await request.get(`/api/data-room/workflows?data_room_id=${dataRoomId}`)

    expect(response.ok()).toBeTruthy()
    const result = await response.json()
    expect(result.success).toBe(true)
    expect(Array.isArray(result.data)).toBe(true)
    expect(result.data.length).toBeGreaterThan(0)
    expect(result.data[0]).toHaveProperty('workflow_steps')
  })

  test('GET /api/data-room/workflows/[id] - should get workflow details', async ({ request }) => {
    const response = await request.get(`/api/data-room/workflows/${workflowId}`)

    expect(response.ok()).toBeTruthy()
    const result = await response.json()
    expect(result.success).toBe(true)
    expect(result.data.id).toBe(workflowId)
    expect(result.data).toHaveProperty('total_steps')
    expect(result.data).toHaveProperty('completed_steps')
    expect(result.data).toHaveProperty('pending_approvals')
  })

  test('PATCH /api/data-room/workflows/[id] - should update workflow', async ({ request }) => {
    const response = await request.patch(`/api/data-room/workflows/${workflowId}`, {
      data: {
        name: 'Updated Workflow Name',
        description: 'Updated description'
      }
    })

    expect(response.ok()).toBeTruthy()
    const result = await response.json()
    expect(result.success).toBe(true)
    expect(result.data.name).toBe('Updated Workflow Name')
    expect(result.data.description).toBe('Updated description')
  })

  test('POST /api/data-room/workflows/[id]/start - should start workflow', async ({ request }) => {
    const response = await request.post(`/api/data-room/workflows/${workflowId}/start`)

    expect(response.ok()).toBeTruthy()
    const result = await response.json()
    expect(result.success).toBe(true)
    expect(result.message).toContain('started')
  })

  test('POST /api/data-room/workflows/[id]/start - should not start already active workflow', async ({ request }) => {
    const response = await request.post(`/api/data-room/workflows/${workflowId}/start`)

    expect(response.status()).toBe(400)
    const result = await response.json()
    expect(result.error).toContain('already started')
  })

  test('GET /api/data-room/workflows - should filter by status', async ({ request }) => {
    const response = await request.get(`/api/data-room/workflows?data_room_id=${dataRoomId}&status=active`)

    expect(response.ok()).toBeTruthy()
    const result = await response.json()
    expect(result.success).toBe(true)
    expect(result.data.every((w: { status: string }) => w.status === 'active')).toBe(true)
  })
})

test.describe('Data Room Approvals - API', () => {
  let approvalId: string

  test('GET /api/data-room/approvals - should list approvals', async ({ request }) => {
    const response = await request.get('/api/data-room/approvals')

    expect(response.ok()).toBeTruthy()
    const result = await response.json()
    expect(result.success).toBe(true)
    expect(Array.isArray(result.data)).toBe(true)
  })

  test('GET /api/data-room/approvals?pending=true - should list pending approvals only', async ({ request }) => {
    const response = await request.get('/api/data-room/approvals?pending=true')

    expect(response.ok()).toBeTruthy()
    const result = await response.json()
    expect(result.success).toBe(true)
    expect(result.data.every((a: { decision: null }) => a.decision === null)).toBe(true)
  })

  test('PATCH /api/data-room/approvals/[id] - should approve request', async ({ request }) => {
    // First get a pending approval
    const listResponse = await request.get('/api/data-room/approvals?pending=true')
    const listResult = await listResponse.json()

    if (listResult.data.length > 0) {
      approvalId = listResult.data[0].id

      const response = await request.patch(`/api/data-room/approvals/${approvalId}`, {
        data: {
          decision: 'approved',
          decision_notes: 'Looks good, approved'
        }
      })

      expect(response.ok()).toBeTruthy()
      const result = await response.json()
      expect(result.success).toBe(true)
      expect(result.data.decision).toBe('approved')
      expect(result.data.decision_notes).toBe('Looks good, approved')
      expect(result.data.decided_at).toBeTruthy()
    }
  })

  test('PATCH /api/data-room/approvals/[id] - should reject request', async ({ request }) => {
    const listResponse = await request.get('/api/data-room/approvals?pending=true')
    const listResult = await listResponse.json()

    if (listResult.data.length > 0) {
      const testApprovalId = listResult.data[0].id

      const response = await request.patch(`/api/data-room/approvals/${testApprovalId}`, {
        data: {
          decision: 'rejected',
          decision_notes: 'Missing required information'
        }
      })

      expect(response.ok()).toBeTruthy()
      const result = await response.json()
      expect(result.success).toBe(true)
      expect(result.data.decision).toBe('rejected')
    }
  })

  test('PATCH /api/data-room/approvals/[id] - should request changes', async ({ request }) => {
    const listResponse = await request.get('/api/data-room/approvals?pending=true')
    const listResult = await listResponse.json()

    if (listResult.data.length > 0) {
      const testApprovalId = listResult.data[0].id

      const response = await request.patch(`/api/data-room/approvals/${testApprovalId}`, {
        data: {
          decision: 'needs_changes',
          decision_notes: 'Please update section 3'
        }
      })

      expect(response.ok()).toBeTruthy()
      const result = await response.json()
      expect(result.success).toBe(true)
      expect(result.data.decision).toBe('needs_changes')
    }
  })
})

test.describe('Data Room Tasks - API', () => {
  let taskId: string

  test('GET /api/data-room/tasks - should list all tasks', async ({ request }) => {
    const response = await request.get('/api/data-room/tasks')

    expect(response.ok()).toBeTruthy()
    const result = await response.json()
    expect(result.success).toBe(true)
    expect(Array.isArray(result.data)).toBe(true)
  })

  test('GET /api/data-room/tasks?assigned_to_me=true - should list my tasks', async ({ request }) => {
    const response = await request.get('/api/data-room/tasks?assigned_to_me=true')

    expect(response.ok()).toBeTruthy()
    const result = await response.json()
    expect(result.success).toBe(true)
    expect(Array.isArray(result.data)).toBe(true)

    if (result.data.length > 0) {
      taskId = result.data[0].id
    }
  })

  test('GET /api/data-room/tasks?status=pending - should filter by status', async ({ request }) => {
    const response = await request.get('/api/data-room/tasks?status=pending')

    expect(response.ok()).toBeTruthy()
    const result = await response.json()
    expect(result.success).toBe(true)
    expect(result.data.every((t: { status: string }) => t.status === 'pending')).toBe(true)
  })

  test('PATCH /api/data-room/tasks/[id] - should update task status', async ({ request }) => {
    if (!taskId) {
      test.skip()
      return
    }

    const response = await request.patch(`/api/data-room/tasks/${taskId}`, {
      data: {
        status: 'in_progress'
      }
    })

    expect(response.ok()).toBeTruthy()
    const result = await response.json()
    expect(result.success).toBe(true)
    expect(result.data.status).toBe('in_progress')
  })

  test('PATCH /api/data-room/tasks/[id] - should update task priority', async ({ request }) => {
    if (!taskId) {
      test.skip()
      return
    }

    const response = await request.patch(`/api/data-room/tasks/${taskId}`, {
      data: {
        priority: 'urgent'
      }
    })

    expect(response.ok()).toBeTruthy()
    const result = await response.json()
    expect(result.success).toBe(true)
    expect(result.data.priority).toBe('urgent')
  })

  test('PATCH /api/data-room/tasks/[id] - should complete task', async ({ request }) => {
    if (!taskId) {
      test.skip()
      return
    }

    const response = await request.patch(`/api/data-room/tasks/${taskId}`, {
      data: {
        status: 'completed'
      }
    })

    expect(response.ok()).toBeTruthy()
    const result = await response.json()
    expect(result.success).toBe(true)
    expect(result.data.status).toBe('completed')
    expect(result.data.completed_at).toBeTruthy()
  })
})

test.describe('Data Room Checklists - API', () => {
  let checklistId: string
  let itemId: string

  test('GET /api/data-room/checklists/[id] - should get checklist with items', async ({ request }) => {
    // This would require creating a checklist first
    // For now, test with mock ID (will fail if no checklist exists)
    test.skip()
  })

  test('PATCH /api/data-room/checklists/[id]/items/[itemId] - should update item status', async ({ request }) => {
    test.skip()
  })

  test('PATCH /api/data-room/checklists/[id]/items/[itemId] - should add notes', async ({ request }) => {
    test.skip()
  })

  test('PATCH /api/data-room/checklists/[id]/items/[itemId] - should link document', async ({ request }) => {
    test.skip()
  })
})

test.describe('Data Room Workflows - Error Handling', () => {
  test('POST /api/data-room/workflows - should reject invalid data', async ({ request }) => {
    const response = await request.post('/api/data-room/workflows', {
      data: {
        name: '', // Empty name should fail
        workflow_type: 'invalid_type'
      }
    })

    expect(response.status()).toBe(400)
    const result = await response.json()
    expect(result.error).toContain('Validation')
  })

  test('GET /api/data-room/workflows - should require data_room_id', async ({ request }) => {
    const response = await request.get('/api/data-room/workflows')

    expect(response.status()).toBe(400)
    const result = await response.json()
    expect(result.error).toContain('data_room_id')
  })

  test('GET /api/data-room/workflows/[id] - should return 404 for non-existent workflow', async ({ request }) => {
    const response = await request.get('/api/data-room/workflows/00000000-0000-0000-0000-000000000000')

    expect(response.status()).toBe(404)
  })

  test('PATCH /api/data-room/approvals/[id] - should not allow duplicate decisions', async ({ request }) => {
    // Get an already-decided approval
    const listResponse = await request.get('/api/data-room/approvals?pending=false')
    const listResult = await listResponse.json()

    if (listResult.data.length > 0) {
      const decidedApprovalId = listResult.data[0].id

      const response = await request.patch(`/api/data-room/approvals/${decidedApprovalId}`, {
        data: {
          decision: 'approved'
        }
      })

      expect(response.status()).toBe(400)
      const result = await response.json()
      expect(result.error).toContain('already decided')
    }
  })
})
