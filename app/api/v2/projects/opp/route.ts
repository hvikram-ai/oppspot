import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    projects: [],
    version: 'v2',
    message: 'Projects API v2 endpoint'
  })
}

export async function POST() {
  return NextResponse.json({
    status: 'ok',
    projects: [],
    version: 'v2',
    message: 'Projects API v2 endpoint'
  })
}