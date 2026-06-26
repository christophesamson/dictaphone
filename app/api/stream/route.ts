import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const blobUrl = req.nextUrl.searchParams.get('url')
  if (!blobUrl) return NextResponse.json({ error: 'Missing url' }, { status: 400 })

  const token = process.env.BLOB_READ_WRITE_TOKEN
  if (!token) return NextResponse.json({ error: 'No token' }, { status: 500 })

  const res = await fetch(blobUrl, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!res.ok) return NextResponse.json({ error: 'Blob not found' }, { status: 404 })

  const contentType = res.headers.get('content-type') ?? 'audio/webm'
  const contentLength = res.headers.get('content-length')

  const headers: Record<string, string> = {
    'Content-Type': contentType,
    'Cache-Control': 'private, max-age=3600',
  }
  if (contentLength) headers['Content-Length'] = contentLength

  return new NextResponse(res.body, { headers })
}
