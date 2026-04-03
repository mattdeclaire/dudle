import { NextRequest, NextResponse } from 'next/server'
import { getPollWithAvailability, initSchema } from '@/lib/db'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await initSchema()
  const { id } = await params
  const data = await getPollWithAvailability(id)
  if (!data) {
    return NextResponse.json({ error: 'Poll not found' }, { status: 404 })
  }
  return NextResponse.json(data)
}
