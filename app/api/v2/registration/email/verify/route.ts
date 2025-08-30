import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Email verification endpoint',
    verified: false
  })
}

export async function POST() {
  return NextResponse.json({
    status: 'ok',
    message: 'Email verification endpoint',
    verified: false
  })
}