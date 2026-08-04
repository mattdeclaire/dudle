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
  await sql`
    CREATE TABLE IF NOT EXISTS transfer_codes (
      code TEXT PRIMARY KEY,
      poll_id TEXT NOT NULL REFERENCES polls(id),
      participant_id INTEGER NOT NULL REFERENCES participants(id)
    )
  `
  // Codes used to be short-lived; they are now permanent
  await sql`ALTER TABLE transfer_codes DROP COLUMN IF EXISTS expires_at`
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

  const participantsResult = await sql<Participant>`
    SELECT * FROM participants WHERE poll_id = ${id}
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

export async function upsertParticipant(
  pollId: string,
  name: string
): Promise<Participant> {
  const existing = await sql<Participant>`
    SELECT * FROM participants
    WHERE poll_id = ${pollId} AND LOWER(name) = LOWER(${name})
    LIMIT 1
  `
  if (existing.rows.length > 0) return existing.rows[0]

  const result = await sql<Participant>`
    INSERT INTO participants (poll_id, name) VALUES (${pollId}, ${name}) RETURNING *
  `
  return result.rows[0]
}

// No ambiguous characters (0/O, 1/I/L) so codes are easy to read off a screen
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
const CODE_LENGTH = 4

export async function getParticipant(
  pollId: string,
  participantId: number
): Promise<Participant | null> {
  const result = await sql<Participant>`
    SELECT * FROM participants WHERE id = ${participantId} AND poll_id = ${pollId}
  `
  return result.rows[0] ?? null
}

export async function getOrCreateTransferCode(
  pollId: string,
  participantId: number
): Promise<string> {
  const existing = await sql<{ code: string }>`
    SELECT code FROM transfer_codes WHERE participant_id = ${participantId}
  `
  if (existing.rows.length > 0) return existing.rows[0].code

  for (let attempt = 0; attempt < 10; attempt++) {
    const code = Array.from(
      { length: CODE_LENGTH },
      () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]
    ).join('')
    try {
      await sql`
        INSERT INTO transfer_codes (code, poll_id, participant_id)
        VALUES (${code}, ${pollId}, ${participantId})
      `
      return code
    } catch {
      // code collision — retry with a fresh one
    }
  }
  throw new Error('Failed to generate transfer code')
}

export async function lookupTransferCode(
  code: string
): Promise<{ pollId: string; participantId: number; name: string } | null> {
  const result = await sql<{ poll_id: string; participant_id: number; name: string }>`
    SELECT t.poll_id, t.participant_id, p.name
    FROM transfer_codes t
    JOIN participants p ON p.id = t.participant_id
    WHERE t.code = ${code.toUpperCase()}
  `
  if (result.rows.length === 0) return null
  const row = result.rows[0]
  return { pollId: row.poll_id, participantId: row.participant_id, name: row.name }
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
