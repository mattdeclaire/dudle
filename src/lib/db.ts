import Database from 'better-sqlite3'
import path from 'path'
import type { PollData, Poll, Participant } from './types'

declare global {
  // eslint-disable-next-line no-var
  var _db: Database.Database | undefined
}

function getDb(): Database.Database {
  if (!global._db) {
    const dbPath = process.env.NODE_ENV === 'production'
      ? '/tmp/poll.db'
      : path.join(process.cwd(), 'data', 'poll.db')
    const db = new Database(dbPath)
    db.pragma('journal_mode = WAL')
    db.pragma('foreign_keys = ON')
    initSchema(db)
    global._db = db
  }
  return global._db
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS polls (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS participants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      poll_id TEXT NOT NULL,
      name TEXT NOT NULL,
      FOREIGN KEY (poll_id) REFERENCES polls(id)
    );

    CREATE TABLE IF NOT EXISTS availability (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      participant_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      UNIQUE(participant_id, date),
      FOREIGN KEY (participant_id) REFERENCES participants(id)
    );
  `)
}

export function createPollWithOwner(
  id: string,
  title: string,
  ownerName: string
): { pollId: string; participantId: number } {
  const db = getDb()
  const run = db.transaction(() => {
    db.prepare('INSERT INTO polls (id, title) VALUES (?, ?)').run(id, title)
    const result = db
      .prepare('INSERT INTO participants (poll_id, name) VALUES (?, ?)')
      .run(id, ownerName)
    return result.lastInsertRowid as number
  })
  const participantId = run()
  return { pollId: id, participantId }
}

export function getPollWithAvailability(id: string): PollData | null {
  const db = getDb()

  const poll = db
    .prepare('SELECT * FROM polls WHERE id = ?')
    .get(id) as Poll | undefined
  if (!poll) return null

  const participants = db
    .prepare('SELECT * FROM participants WHERE poll_id = ?')
    .all(id) as Participant[]

  const rows = db
    .prepare(
      `SELECT a.participant_id, a.date
       FROM availability a
       JOIN participants p ON a.participant_id = p.id
       WHERE p.poll_id = ?`
    )
    .all(id) as { participant_id: number; date: string }[]

  const availability: Record<string, number> = {}
  const participantAvailability: Record<number, string[]> = {}

  for (const row of rows) {
    availability[row.date] = (availability[row.date] ?? 0) + 1
    if (!participantAvailability[row.participant_id]) {
      participantAvailability[row.participant_id] = []
    }
    participantAvailability[row.participant_id].push(row.date)
  }

  return { poll, participants, availability, participantAvailability }
}

export function upsertParticipant(
  pollId: string,
  name: string
): Participant {
  const db = getDb()
  const existing = db
    .prepare(
      'SELECT * FROM participants WHERE poll_id = ? AND LOWER(name) = LOWER(?)'
    )
    .get(pollId, name) as Participant | undefined

  if (existing) return existing

  const result = db
    .prepare('INSERT INTO participants (poll_id, name) VALUES (?, ?)')
    .run(pollId, name)
  return {
    id: result.lastInsertRowid as number,
    poll_id: pollId,
    name,
  }
}

export function toggleAvailability(
  participantId: number,
  date: string
): void {
  const db = getDb()
  const existing = db
    .prepare(
      'SELECT id FROM availability WHERE participant_id = ? AND date = ?'
    )
    .get(participantId, date)

  if (existing) {
    db.prepare(
      'DELETE FROM availability WHERE participant_id = ? AND date = ?'
    ).run(participantId, date)
  } else {
    db.prepare(
      'INSERT INTO availability (participant_id, date) VALUES (?, ?)'
    ).run(participantId, date)
  }
}
