import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { createPoll } from '@/lib/db'

function generateId(): string {
  return randomBytes(6).toString('base64url').slice(0, 8)
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { title, description, startDate, endDate } = body

  if (!title?.trim()) {
    return NextResponse.json({ error: 'title is required' }, { status: 400 })
  }
  const pollId = await createPoll(
    generateId(),
    title.trim(),
    description?.trim() || null,
    startDate || null,
    endDate || null,
  )

  return NextResponse.json({ pollId }, { status: 201 })
}
