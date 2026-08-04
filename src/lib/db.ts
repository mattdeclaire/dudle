import { randomInt } from 'crypto'
import { sql } from '@vercel/postgres'
import type { PollData, Poll, Participant } from './types'

export async function initSchema() {
  await sql`
    CREATE TABLE IF NOT EXISTS polls (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      start_date TEXT,
      end_date TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `
  // Migrate existing tables
  await sql`ALTER TABLE polls ADD COLUMN IF NOT EXISTS description TEXT`
  await sql`ALTER TABLE polls ADD COLUMN IF NOT EXISTS start_date TEXT`
  await sql`ALTER TABLE polls ADD COLUMN IF NOT EXISTS end_date TEXT`
  await sql`
    CREATE TABLE IF NOT EXISTS participants (
      id SERIAL PRIMARY KEY,
      poll_id TEXT NOT NULL REFERENCES polls(id),
      name TEXT NOT NULL
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS availability (
      id SERIAL PRIMARY KEY,
      participant_id INTEGER NOT NULL REFERENCES participants(id),
      date TEXT NOT NULL,
      UNIQUE(participant_id, date)
    )
  `
  await sql`ALTER TABLE participants ADD COLUMN IF NOT EXISTS code TEXT UNIQUE`
  // Carry codes over from the retired transfer_codes table, then drop it
  try {
    await sql`
      UPDATE participants p SET code = t.code
      FROM transfer_codes t
      WHERE t.participant_id = p.id AND p.code IS NULL
    `
  } catch {
    // transfer_codes table already dropped
  }
  await sql`DROP TABLE IF EXISTS transfer_codes`
  // Backfill codes for participants created before codes existed
  const missing = await sql<{ id: number }>`SELECT id FROM participants WHERE code IS NULL`
  for (const row of missing.rows) {
    await assignCode(row.id)
  }
}

// No ambiguous characters (0/O, 1/I/L) so codes are easy to read off a screen
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
const CODE_LENGTH = 4

function generateCode(): string {
  return Array.from(
    { length: CODE_LENGTH },
    () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]
  ).join('')
}

async function assignCode(participantId: number): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = generateCode()
    try {
      await sql`UPDATE participants SET code = ${code} WHERE id = ${participantId}`
      return code
    } catch {
      // code collision — retry with a fresh one
    }
  }
  throw new Error('Failed to generate participant code')
}

export async function createPoll(
  id: string,
  title: string,
  description: string | null,
  startDate: string | null,
  endDate: string | null,
): Promise<string> {
  await sql`INSERT INTO polls (id, title, description, start_date, end_date) VALUES (${id}, ${title}, ${description}, ${startDate}, ${endDate})`
  return id
}

export async function getPollWithAvailability(id: string): Promise<PollData | null> {
  const pollResult = await sql<Poll>`SELECT * FROM polls WHERE id = ${id}`
  if (pollResult.rows.length === 0) return null
  const poll = pollResult.rows[0]

  // Explicit columns: never send participant codes to every viewer
  const participantsResult = await sql<Participant>`
    SELECT id, poll_id, name FROM participants WHERE poll_id = ${id}
  `
  const participants = participantsResult.rows

  const rowsResult = await sql<{ participant_id: number; date: string }>`
    SELECT a.participant_id, a.date
    FROM availability a
    JOIN participants p ON a.participant_id = p.id
    WHERE p.poll_id = ${id}
  `

  const availability: Record<string, number> = {}
  const participantAvailability: Record<number, string[]> = {}

  for (const row of rowsResult.rows) {
    availability[row.date] = (availability[row.date] ?? 0) + 1
    if (!participantAvailability[row.participant_id]) {
      participantAvailability[row.participant_id] = []
    }
    participantAvailability[row.participant_id].push(row.date)
  }

  return { poll, participants, availability, participantAvailability }
}

export async function createParticipant(
  pollId: string,
  name: string
): Promise<Participant> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = generateCode()
    try {
      const result = await sql<Participant>`
        INSERT INTO participants (poll_id, name, code)
        VALUES (${pollId}, ${name}, ${code})
        RETURNING id, poll_id, name
      `
      return result.rows[0]
    } catch {
      // code collision — retry with a fresh one
    }
  }
  throw new Error('Failed to create participant')
}

export async function getParticipantCode(
  pollId: string,
  participantId: number
): Promise<string | null> {
  const result = await sql<{ code: string | null }>`
    SELECT code FROM participants WHERE id = ${participantId} AND poll_id = ${pollId}
  `
  if (result.rows.length === 0) return null
  return result.rows[0].code ?? (await assignCode(participantId))
}

export async function lookupTransferCode(
  code: string
): Promise<{ pollId: string; participantId: number; name: string } | null> {
  const result = await sql<{ id: number; poll_id: string; name: string }>`
    SELECT id, poll_id, name FROM participants WHERE code = ${code.toUpperCase()}
  `
  if (result.rows.length === 0) return null
  const row = result.rows[0]
  return { pollId: row.poll_id, participantId: row.id, name: row.name }
}

export async function toggleAvailability(
  participantId: number,
  date: string
): Promise<void> {
  const existing = await sql`
    SELECT id FROM availability WHERE participant_id = ${participantId} AND date = ${date}
  `
  if (existing.rows.length > 0) {
    await sql`DELETE FROM availability WHERE participant_id = ${participantId} AND date = ${date}`
  } else {
    await sql`INSERT INTO availability (participant_id, date) VALUES (${participantId}, ${date})`
  }
}
