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
}

export async function createPollWithOwner(
  id: string,
  title: string,
  ownerName: string,
  description: string | null,
  startDate: string | null,
  endDate: string | null,
): Promise<{ pollId: string; participantId: number }> {
  await sql`INSERT INTO polls (id, title, description, start_date, end_date) VALUES (${id}, ${title}, ${description}, ${startDate}, ${endDate})`
  const result = await sql<{ id: number }>`
    INSERT INTO participants (poll_id, name) VALUES (${id}, ${ownerName}) RETURNING id
  `
  return { pollId: id, participantId: result.rows[0].id }
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
