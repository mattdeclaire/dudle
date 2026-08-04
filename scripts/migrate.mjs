/**
 * Runs all pending database migrations. Invoked before `next build`
 * (see package.json) so the schema is up to date by the time the app deploys.
 *
 * Each migration runs once and is recorded in schema_migrations. Statements
 * are still written idempotently so a database created by an older version
 * of the app converges to the same shape.
 */
import { readFileSync, existsSync } from 'fs'
import { randomInt } from 'crypto'

// Plain node doesn't load Next.js env files; pick up POSTGRES_URL locally
for (const file of ['.env.local', '.env']) {
  if (!existsSync(file)) continue
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/)
    if (m && !(m[1] in process.env)) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
    }
  }
}

if (!process.env.POSTGRES_URL) {
  console.warn(
    'migrate: POSTGRES_URL is not set — skipping migrations. ' +
      'This is fine for local typecheck builds, but a deploy build must have database credentials.'
  )
  process.exit(0)
}

const { sql } = await import('@vercel/postgres')

const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
const CODE_LENGTH = 4

function generateCode() {
  return Array.from(
    { length: CODE_LENGTH },
    () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]
  ).join('')
}

const migrations = [
  {
    id: 'initial-schema',
    async run() {
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
      await sql`ALTER TABLE polls ADD COLUMN IF NOT EXISTS description TEXT`
      await sql`ALTER TABLE polls ADD COLUMN IF NOT EXISTS start_date TEXT`
      await sql`ALTER TABLE polls ADD COLUMN IF NOT EXISTS end_date TEXT`
      await sql`
        CREATE TABLE IF NOT EXISTS participants (
          id SERIAL PRIMARY KEY,
          poll_id TEXT NOT NULL REFERENCES polls(id),
          name TEXT NOT NULL,
          code TEXT UNIQUE
        )
      `
      await sql`ALTER TABLE participants ADD COLUMN IF NOT EXISTS code TEXT UNIQUE`
      await sql`
        CREATE TABLE IF NOT EXISTS availability (
          id SERIAL PRIMARY KEY,
          participant_id INTEGER NOT NULL REFERENCES participants(id),
          date TEXT NOT NULL,
          UNIQUE(participant_id, date)
        )
      `
    },
  },
  {
    id: 'participant-codes',
    async run() {
      // Carry codes over from the retired transfer_codes table, then drop it
      try {
        await sql`
          UPDATE participants p SET code = t.code
          FROM transfer_codes t
          WHERE t.participant_id = p.id AND p.code IS NULL
        `
      } catch {
        // transfer_codes table never existed or is already dropped
      }
      await sql`DROP TABLE IF EXISTS transfer_codes`

      // Backfill codes for participants created before codes existed
      const missing = await sql`SELECT id FROM participants WHERE code IS NULL`
      for (const row of missing.rows) {
        for (let attempt = 0; attempt < 10; attempt++) {
          try {
            await sql`UPDATE participants SET code = ${generateCode()} WHERE id = ${row.id}`
            break
          } catch {
            // code collision — retry with a fresh one
          }
        }
      }
    },
  },
]

await sql`
  CREATE TABLE IF NOT EXISTS schema_migrations (
    id TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ DEFAULT NOW()
  )
`
for (const migration of migrations) {
  const applied = await sql`SELECT 1 FROM schema_migrations WHERE id = ${migration.id}`
  if (applied.rows.length > 0) {
    console.log(`migrate: ${migration.id} already applied`)
    continue
  }
  console.log(`migrate: applying ${migration.id}`)
  await migration.run()
  await sql`INSERT INTO schema_migrations (id) VALUES (${migration.id}) ON CONFLICT DO NOTHING`
}
console.log('migrate: done')
process.exit(0)
