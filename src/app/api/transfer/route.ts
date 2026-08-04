import { NextRequest, NextResponse } from 'next/server'
import { lookupTransferCode } from '@/lib/db'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const code = typeof body.code === 'string' ? body.code.trim() : ''
  if (!code) {
    return NextResponse.json({ error: 'code is required' }, { status: 400 })
  }

  const result = await lookupTransferCode(code)
  if (!result) {
    return NextResponse.json({ error: 'Invalid code' }, { status: 404 })
  }

  return NextResponse.json(result)
}
