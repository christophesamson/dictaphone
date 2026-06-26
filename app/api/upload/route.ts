import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { addRecording } from '@/lib/storage'
import { nanoid } from 'nanoid'

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData()
    const file = form.get('file') as File
    const duration = Number(form.get('duration') ?? 0)
    const name = (form.get('name') as string) || `Note ${new Date().toLocaleString('fr-FR')}`

    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

    const id = nanoid()
    const blob = await put(`recordings/${id}.webm`, file, { access: 'private' })

    await addRecording({
      id,
      name,
      url: blob.url,
      duration,
      size: file.size,
      createdAt: new Date().toISOString(),
    })

    return NextResponse.json({ ok: true, id })
  } catch (err) {
    console.error('[upload] error', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
