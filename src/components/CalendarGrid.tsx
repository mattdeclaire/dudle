'use client'

import DateCell from './DateCell'

const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

interface CalendarGridProps {
  startDate: string | null
  endDate: string | null
  availability: Record<string, number>
  participantAvailability: Record<number, string[]>
  participants: { id: number; name: string }[]
  myDates: Set<string>
  onToggle: (date: string) => void
}

function getMonths(startDate: string | null, endDate: string | null): { year: number; month: number }[] {
  if (startDate && endDate) {
    const start = new Date(startDate + 'T00:00:00')
    const end = new Date(endDate + 'T00:00:00')
    const result = []
    const cur = new Date(start.getFullYear(), start.getMonth(), 1)
    const last = new Date(end.getFullYear(), end.getMonth(), 1)
    while (cur <= last) {
      result.push({ year: cur.getFullYear(), month: cur.getMonth() })
      cur.setMonth(cur.getMonth() + 1)
    }
    return result
  }
  // Fallback: 3 months from today
  const now = new Date()
  return Array.from({ length: 3 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
    return { year: d.getFullYear(), month: d.getMonth() }
  })
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function toDateString(year: number, month: number, day: number): string {
  const mm = String(month + 1).padStart(2, '0')
  const dd = String(day).padStart(2, '0')
  return `${year}-${mm}-${dd}`
}

export default function CalendarGrid({
  startDate,
  endDate,
  availability,
  participantAvailability,
  participants,
  myDates,
  onToggle,
}: CalendarGridProps) {
  const months = getMonths(startDate, endDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const maxCount = participants.length

  // Build date → participant names map
  const dateToNames: Record<string, string[]> = {}
  for (const p of participants) {
    for (const date of participantAvailability[p.id] ?? []) {
      if (!dateToNames[date]) dateToNames[date] = []
      dateToNames[date].push(p.name)
    }
  }

  const cols = months.length === 1 ? 'grid-cols-1' : months.length === 2 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-3'

  return (
    <div className={`grid ${cols} gap-8`}>
      {months.map(({ year, month }) => {
        const firstDayOfWeek = new Date(year, month, 1).getDay()
        const daysInMonth = getDaysInMonth(year, month)

        return (
          <div key={`${year}-${month}`}>
            <h3 className="text-center font-semibold text-gray-700 mb-3">
              {MONTH_NAMES[month]} {year}
            </h3>

            {/* Day-of-week headers */}
            <div className="grid grid-cols-7 gap-0 mb-1">
              {DAY_LABELS.map((d) => (
                <div key={d} className="text-center text-xs text-gray-400 font-medium py-1">
                  {d}
                </div>
              ))}
            </div>

            {/* Date cells */}
            <div className="grid grid-cols-7 gap-0">
              {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                <div key={`empty-${i}`} />
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1
                const dateStr = toDateString(year, month, day)
                const cellDate = new Date(year, month, day)
                const outOfRange =
                  (startDate != null && dateStr < startDate) ||
                  (endDate != null && dateStr > endDate)
                const isPast = cellDate < today || outOfRange

                return (
                  <DateCell
                    key={dateStr}
                    day={day}
                    count={availability[dateStr] ?? 0}
                    maxCount={maxCount}
                    isMyDate={myDates.has(dateStr)}
                    isPast={isPast}
                    names={dateToNames[dateStr] ?? []}
                    onToggle={() => onToggle(dateStr)}
                  />
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
