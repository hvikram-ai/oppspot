/**
 * Bull Board Dashboard
 * Web UI for monitoring and managing Bull queues
 */

import { NextRequest, NextResponse } from 'next/server'
import { createBullBoard } from '@bull-board/api'
import { BullAdapter } from '@bull-board/api/bullAdapter'
import { ExpressAdapter } from '@bull-board/express'
import { getAllQueues } from '@/lib/queue/queue-manager'
import { createClient } from '@/lib/supabase/server'

// ============================================================================
// BULL BOARD SETUP
// ============================================================================

let serverAdapter: ExpressAdapter | null = null
let bullBoard: ReturnType<typeof createBullBoard> | null = null

/**
 * Initialize Bull Board (singleton)
 */
function initBullBoard() {
  if (bullBoard) {
    return serverAdapter!
  }

  // Create Express adapter
  serverAdapter = new ExpressAdapter()
  serverAdapter.setBasePath('/api/admin/bull-board')

  // Get all queues
  const queues = getAllQueues()

  // Create Bull Board
  bullBoard = createBullBoard({
    queues: queues.map((q) => new BullAdapter(q)),
    serverAdapter: serverAdapter,
  })

  console.log('[Bull Board] Dashboard initialized')

  return serverAdapter
}

// ============================================================================
// API ROUTES
// ============================================================================

/**
 * Check if user is admin
 */
async function isAdmin(request: NextRequest): Promise<boolean> {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      return false
    }

    // Check if user has admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single<{ role: string }>()

    return profile?.role === 'admin' || user.email?.endsWith('@oppspot.com') || false
  } catch {
    return false
  }
}

/**
 * GET handler - Serve Bull Board UI
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    // Check admin access
    if (!(await isAdmin(request))) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Admin access required' },
        { status: 403 }
      )
    }

    // Initialize Bull Board
    const adapter = initBullBoard()

    // Get path
    const { path } = await params
    const urlPath = '/' + (path?.join('/') || '')

    // Create mock Express request/response
    const mockReq = {
      method: 'GET',
      url: urlPath,
      headers: Object.fromEntries(request.headers.entries()),
      query: Object.fromEntries(new URL(request.url).searchParams.entries()),
    }

    const mockRes = {
      statusCode: 200,
      headers: {} as Record<string, string>,
      body: '',
      setHeader: function (name: string, value: string) {
        this.headers[name] = value
      },
      getHeader: function (name: string) {
        return this.headers[name]
      },
      send: function (body: string) {
        this.body = body
      },
      json: function (data: unknown) {
        this.body = JSON.stringify(data)
        this.setHeader('Content-Type', 'application/json')
      },
      redirect: function (url: string) {
        this.statusCode = 302
        this.setHeader('Location', url)
      },
      status: function (code: number) {
        this.statusCode = code
        return this
      },
    }

    // Get the Express router
    const router = adapter.getRouter() as (req: typeof mockReq, res: typeof mockRes, next: () => void) => void

    // Handle the request
    await new Promise<void>((resolve) => {
      router(mockReq, mockRes, () => resolve())
    })

    // Return response
    const headers = new Headers(mockRes.headers)
    return new NextResponse(mockRes.body, {
      status: mockRes.statusCode,
      headers,
    })
  } catch (error) {
    console.error('[Bull Board] Error:', error)

    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to load Bull Board' },
      { status: 500 }
    )
  }
}

/**
 * POST handler - Handle Bull Board actions
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    // Check admin access
    if (!(await isAdmin(request))) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Admin access required' },
        { status: 403 }
      )
    }

    // Initialize Bull Board
    const adapter = initBullBoard()

    // Get path
    const { path } = await params
    const urlPath = '/' + (path?.join('/') || '')

    // Get request body
    const body = await request.text()

    // Create mock Express request/response
    const mockReq = {
      method: 'POST',
      url: urlPath,
      headers: Object.fromEntries(request.headers.entries()),
      body: body ? JSON.parse(body) : {},
    }

    const mockRes = {
      statusCode: 200,
      headers: {} as Record<string, string>,
      body: '',
      setHeader: function (name: string, value: string) {
        this.headers[name] = value
      },
      getHeader: function (name: string) {
        return this.headers[name]
      },
      send: function (body: string) {
        this.body = body
      },
      json: function (data: unknown) {
        this.body = JSON.stringify(data)
        this.setHeader('Content-Type', 'application/json')
      },
      status: function (code: number) {
        this.statusCode = code
        return this
      },
    }

    // Get the Express router
    const router = adapter.getRouter() as (req: typeof mockReq, res: typeof mockRes, next: () => void) => void

    // Handle the request
    await new Promise<void>((resolve) => {
      router(mockReq, mockRes, () => resolve())
    })

    // Return response
    const headers = new Headers(mockRes.headers)
    return new NextResponse(mockRes.body, {
      status: mockRes.statusCode,
      headers,
    })
  } catch (error) {
    console.error('[Bull Board] Error:', error)

    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to process Bull Board action' },
      { status: 500 }
    )
  }
}

/**
 * PUT and DELETE handlers for completeness
 */
export const PUT = POST
export const DELETE = POST
