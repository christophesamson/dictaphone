import { NextRequest, NextResponse } from 'next/server'
import { checkApiKey } from '@/lib/apiAuth'
import { getRecordings } from '@/lib/storage'

export async function GET(req: NextRequest) {
  const err = checkApiKey(req)
  if (err) return err

  const recordings = await getRecordings()
  return NextResponse.json(recordings)
}
