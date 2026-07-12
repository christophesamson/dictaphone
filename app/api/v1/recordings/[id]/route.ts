import { NextRequest, NextResponse } from 'next/server'
import { del } from '@vercel/blob'
import { checkApiKey } from '@/lib/apiAuth'
import { getRecordings, deleteRecording } from '@/lib/storage'

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const err = checkApiKey(req)
  if (err) return err

  const { id } = await params
  const recordings = await getRecordings()
  const rec = recordings.find(r => r.id === id)
  if (!rec) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await del(rec.url)
  await deleteRecording(id)
  return NextResponse.json({ ok: true })
}
