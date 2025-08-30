import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: { slug: string[] } }
) {
  return NextResponse.json(
    {
      error: 'API endpoint not found',
      path: `/api/${params.slug.join('/')}`,
      status: 404
    },
    { status: 404 }
  )
}

export async function POST(
  request: Request,
  { params }: { params: { slug: string[] } }
) {
  return NextResponse.json(
    {
      error: 'API endpoint not found',
      path: `/api/${params.slug.join('/')}`,
      status: 404
    },
    { status: 404 }
  )
}