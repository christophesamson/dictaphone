import { NextRequest, NextResponse } from 'next/server'

export function middleware(req: NextRequest) {
  const password = process.env.APP_PASSWORD
  if (!password) return NextResponse.next()

  const cookie = req.cookies.get('auth')
  if (cookie?.value === password) return NextResponse.next()

  if (req.nextUrl.pathname === '/login') return NextResponse.next()

  const url = req.nextUrl.clone()
  url.pathname = '/login'
  return NextResponse.redirect(url)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/auth).*)'],
}
