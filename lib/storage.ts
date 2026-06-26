import { put, list } from '@vercel/blob'

export interface Recording {
  id: string
  name: string
  url: string
  duration: number
  size: number
  createdAt: string
}

const INDEX_PATH = 'metadata/index.json'

async function getIndexUrl(): Promise<string | null> {
  const { blobs } = await list({ prefix: 'metadata/' })
  const found = blobs.find(b => b.pathname === INDEX_PATH)
  return found ? found.url : null
}

export async function getRecordings(): Promise<Recording[]> {
  try {
    const url = await getIndexUrl()
    if (!url) return []
    const token = process.env.BLOB_READ_WRITE_TOKEN!
    const res = await fetch(url, {
      cache: 'no-store',
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return []
    return await res.json()
  } catch (err) {
    console.error('[storage] getRecordings error', err)
    return []
  }
}

async function saveRecordings(recordings: Recording[]): Promise<void> {
  await put(INDEX_PATH, JSON.stringify(recordings), {
    access: 'private',
    addRandomSuffix: false,
    contentType: 'application/json',
  })
}

export async function addRecording(rec: Recording): Promise<void> {
  const list = await getRecordings()
  await saveRecordings([rec, ...list])
}

export async function deleteRecording(id: string): Promise<void> {
  const list = await getRecordings()
  await saveRecordings(list.filter(r => r.id !== id))
}

export async function renameRecording(id: string, name: string): Promise<void> {
  const list = await getRecordings()
  await saveRecordings(list.map(r => r.id === id ? { ...r, name } : r))
}
