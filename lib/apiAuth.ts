import { NextRequest, NextResponse } from 'next/server'

export function checkApiKey(req: NextRequest): NextResponse | null {
  const expected = process.env.API_KEY
  if (!expected) {
    return NextResponse.json({ error: 'API_KEY not configured' }, { status: 500 })
  }
  const key = req.headers.get('x-api-key')
  if (key !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return null // OK
}
