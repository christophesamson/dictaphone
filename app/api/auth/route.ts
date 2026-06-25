import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
  const { password } = await req.json()
  const expected = process.env.APP_PASSWORD

  if (!expected || password !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const cookieStore = await cookies()
  cookieStore.set('auth', password, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  })

  return NextResponse.json({ ok: true })
}
