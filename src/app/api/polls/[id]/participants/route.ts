import { NextRequest, NextResponse } from 'next/server'
import { getPollWithAvailability, upsertParticipant } from '@/lib/db'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const poll = getPollWithAvailability(id)
  if (!poll) {
    return NextResponse.json({ error: 'Poll not found' }, { status: 404 })
  }

  const body = await request.json()
  const { name } = body
  if (!name?.trim()) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 })
  }

  const participant = upsertParticipant(id, name.trim())
  return NextResponse.json({ id: participant.id, name: participant.name })
}
