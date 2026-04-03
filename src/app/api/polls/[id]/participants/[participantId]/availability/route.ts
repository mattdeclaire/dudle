import { NextRequest, NextResponse } from 'next/server'
import { getPollWithAvailability, toggleAvailability, initSchema } from '@/lib/db'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; participantId: string }> }
) {
  await initSchema()
  const { id, participantId: participantIdStr } = await params
  const pollData = await getPollWithAvailability(id)
  if (!pollData) {
    return NextResponse.json({ error: 'Poll not found' }, { status: 404 })
  }

  const participantId = parseInt(participantIdStr, 10)
  const belongs = pollData.participants.some((p) => p.id === participantId)
  if (!belongs) {
    return NextResponse.json({ error: 'Participant not found' }, { status: 404 })
  }

  const body = await request.json()
  const { date } = body
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'date must be YYYY-MM-DD' }, { status: 400 })
  }

  await toggleAvailability(participantId, date)
  const updated = await getPollWithAvailability(id)
  return NextResponse.json(updated)
}
