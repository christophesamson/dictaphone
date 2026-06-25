import { kv } from '@vercel/kv'

export interface Recording {
  id: string
  name: string
  url: string
  duration: number
  size: number
  createdAt: string
}

const KEY = 'recordings'

export async function getRecordings(): Promise<Recording[]> {
  const data = await kv.get<Recording[]>(KEY)
  return data ?? []
}

export async function addRecording(rec: Recording): Promise<void> {
  const list = await getRecordings()
  await kv.set(KEY, [rec, ...list])
}

export async function deleteRecording(id: string): Promise<void> {
  const list = await getRecordings()
  await kv.set(KEY, list.filter(r => r.id !== id))
}

export async function renameRecording(id: string, name: string): Promise<void> {
  const list = await getRecordings()
  await kv.set(KEY, list.map(r => r.id === id ? { ...r, name } : r))
}
