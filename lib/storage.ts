import { put, head, del } from '@vercel/blob'

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
  try {
    const result = await head(`${process.env.BLOB_BASE_URL ?? ''}/${INDEX_PATH}`)
    return result.url
  } catch {
    return null
  }
}

export async function getRecordings(): Promise<Recording[]> {
  try {
    const url = await getIndexUrl()
    if (!url) return []
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) return []
    return await res.json()
  } catch {
    return []
  }
}

async function saveRecordings(list: Recording[]): Promise<void> {
  const blob = new Blob([JSON.stringify(list)], { type: 'application/json' })
  await put(INDEX_PATH, blob, { access: 'public', addRandomSuffix: false })
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
