import { put, list, del } from '@vercel/blob'

export interface Recording {
  id: string
  name: string
  url: string
  duration: number
  size: number
  createdAt: string
}

const token = () => process.env.BLOB_READ_WRITE_TOKEN!

function metaPath(id: string) {
  return `metadata/${id}.json`
}

export async function getRecordings(): Promise<Recording[]> {
  const { blobs } = await list({ prefix: 'metadata/', token: token() })
  if (blobs.length === 0) return []

  const results = await Promise.all(
    blobs.map(async b => {
      const res = await fetch(b.url, {
        cache: 'no-store',
        headers: { Authorization: `Bearer ${token()}` },
      })
      if (!res.ok) return null
      return res.json() as Promise<Recording>
    })
  )

  return results
    .filter(Boolean)
    .sort((a, b) => new Date(b!.createdAt).getTime() - new Date(a!.createdAt).getTime()) as Recording[]
}

export async function addRecording(rec: Recording): Promise<void> {
  await put(metaPath(rec.id), JSON.stringify(rec), {
    access: 'private',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/json',
    token: token(),
  })
}

export async function deleteRecording(id: string): Promise<void> {
  const { blobs } = await list({ prefix: metaPath(id), token: token() })
  if (blobs.length > 0) await del(blobs[0].url, { token: token() })
}

export async function renameRecording(id: string, name: string): Promise<void> {
  const { blobs } = await list({ prefix: metaPath(id), token: token() })
  if (blobs.length === 0) return
  const res = await fetch(blobs[0].url, {
    cache: 'no-store',
    headers: { Authorization: `Bearer ${token()}` },
  })
  if (!res.ok) return
  const rec: Recording = await res.json()
  await addRecording({ ...rec, name })
}
