import { NextResponse } from 'next/server'
import { list } from '@vercel/blob'

export async function GET() {
  const token = process.env.BLOB_READ_WRITE_TOKEN
  if (!token) return NextResponse.json({ error: 'No BLOB_READ_WRITE_TOKEN' })

  const all = await list({ token })

  return NextResponse.json({
    token_present: true,
    blob_count: all.blobs.length,
    blobs: all.blobs.map(b => ({
      pathname: b.pathname,
      url: b.url,
      size: b.size,
      uploadedAt: b.uploadedAt,
    })),
  })
}
