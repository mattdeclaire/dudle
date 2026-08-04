import { NextRequest, NextResponse } from 'next/server'
import { getParticipantCode, initSchema } from '@/lib/db'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; participantId: string }> }
) {
  await initSchema()
  const { id, participantId } = await params

  const code = await getParticipantCode(id, parseInt(participantId, 10))
  if (!code) {
    return NextResponse.json({ error: 'Participant not found' }, { status: 404 })
  }

  return NextResponse.json({ code })
}
