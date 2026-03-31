import { NextRequest, NextResponse } from 'next/server'
import { getPollWithAvailability } from '@/lib/db'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const data = getPollWithAvailability(id)
  if (!data) {
    return NextResponse.json({ error: 'Poll not found' }, { status: 404 })
  }
  return NextResponse.json(data)
}
