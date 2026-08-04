import { NextRequest, NextResponse } from 'next/server'
import { createTransferCode, getParticipant, initSchema } from '@/lib/db'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; participantId: string }> }
) {
  await initSchema()
  const { id, participantId } = await params

  const participant = await getParticipant(id, parseInt(participantId, 10))
  if (!participant) {
    return NextResponse.json({ error: 'Participant not found' }, { status: 404 })
  }

  const { code, expiresAt } = await createTransferCode(id, participant.id)
  return NextResponse.json({ code, expiresAt })
}
