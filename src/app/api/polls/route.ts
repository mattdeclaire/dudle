import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { createPollWithOwner, initSchema } from '@/lib/db'

function generateId(): string {
  return randomBytes(6).toString('base64url').slice(0, 8)
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { title, ownerName } = body

  if (!title?.trim() || !ownerName?.trim()) {
    return NextResponse.json(
      { error: 'title and ownerName are required' },
      { status: 400 }
    )
  }

  await initSchema()
  const id = generateId()
  const { pollId, participantId } = await createPollWithOwner(
    id,
    title.trim(),
    ownerName.trim()
  )

  return NextResponse.json({ pollId, participantId }, { status: 201 })
}
