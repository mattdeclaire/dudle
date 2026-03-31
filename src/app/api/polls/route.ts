import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { createPollWithOwner } from '@/lib/db'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { title, ownerName } = body

  if (!title?.trim() || !ownerName?.trim()) {
    return NextResponse.json(
      { error: 'title and ownerName are required' },
      { status: 400 }
    )
  }

  const id = uuidv4()
  const { pollId, participantId } = createPollWithOwner(
    id,
    title.trim(),
    ownerName.trim()
  )

  return NextResponse.json({ pollId, participantId }, { status: 201 })
}
