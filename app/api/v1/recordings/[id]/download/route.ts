import { NextRequest, NextResponse } from 'next/server'
import { checkApiKey } from '@/lib/apiAuth'
import { getRecordings } from '@/lib/storage'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const err = checkApiKey(req)
  if (err) return err

  const { id } = await params
  const recordings = await getRecordings()
  const rec = recordings.find(r => r.id === id)
  if (!rec) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const token = process.env.BLOB_READ_WRITE_TOKEN!
  const upstream = await fetch(rec.url, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!upstream.ok) return NextResponse.json({ error: 'Blob not found' }, { status: 404 })

  const filename = `${rec.name.replace(/[^a-z0-9]/gi, '_')}.webm`

  return new NextResponse(upstream.body, {
    headers: {
      'Content-Type': 'audio/webm',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
