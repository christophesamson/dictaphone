import { NextRequest, NextResponse } from 'next/server'
import { del } from '@vercel/blob'
import { getRecordings, deleteRecording, renameRecording } from '@/lib/storage'

export async function GET() {
  const recordings = await getRecordings()
  return NextResponse.json(recordings)
}

export async function DELETE(req: NextRequest) {
  const { id, url } = await req.json()
  await del(url)
  await deleteRecording(id)
  return NextResponse.json({ ok: true })
}

export async function PATCH(req: NextRequest) {
  const { id, name } = await req.json()
  await renameRecording(id, name)
  return NextResponse.json({ ok: true })
}
