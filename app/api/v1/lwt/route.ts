import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'API endpoint ready',
    data: null
  })
}

export async function POST() {
  return NextResponse.json({
    status: 'ok',
    message: 'API endpoint ready',
    data: null
  })
}