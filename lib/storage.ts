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
  console.log('[storage] blobs found for metadata/:', blobs.map(b => b.pathname))
  const found = blobs.find(b => b.pathname === INDEX_PATH)
  return found ? found.url : null
}

export async function getRecordings(): Promise<Recording[]> {
  try {
    const url = await getIndexUrl()
    console.log('[storage] index url:', url)
    if (!url) return []
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) {
      console.error('[storage] fetch index failed', res.status)
      return []
    }
    const data = await res.json()
    console.log('[storage] recordings count:', data.length)
    return data
  } catch (err) {
    console.error('[storage] getRecordings error', err)
    return []
  }
}

async function saveRecordings(recordings: Recording[]): Promise<void> {
  const content = JSON.stringify(recordings)
  console.log('[storage] saving index with', recordings.length, 'recordings')
  await put(INDEX_PATH, content, {
    access: 'public',
    addRandomSuffix: false,
    contentType: 'application/json',
  })
  console.log('[storage] index saved')
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
