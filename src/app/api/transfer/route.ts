import { NextRequest, NextResponse } from 'next/server'
import { redeemTransferCode, initSchema } from '@/lib/db'

export async function POST(request: NextRequest) {
  await initSchema()
  const body = await request.json()
  const code = typeof body.code === 'string' ? body.code.trim() : ''
  if (!code) {
    return NextResponse.json({ error: 'code is required' }, { status: 400 })
  }

  const result = await redeemTransferCode(code)
  if (!result) {
    return NextResponse.json({ error: 'Invalid or expired code' }, { status: 404 })
  }

  return NextResponse.json(result)
}
