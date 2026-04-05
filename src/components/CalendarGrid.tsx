'use client'

import DateCell from './DateCell'

const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

interface CalendarGridProps {
  monthCount?: number
  availability: Record<string, number>
  participantAvailability: Record<number, string[]>
  participants: { id: number; name: string }[]
  myDates: Set<string>
  onToggle: (date: string) => void
}

function getMonths(count: number): { year: number; month: number }[] {
  const now = new Date()
  const result = []
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
    result.push({ year: d.getFullYear(), month: d.getMonth() })
  }
  return result
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
  monthCount = 3,
  availability,
  participantAvailability,
  participants,
  myDates,
  onToggle,
}: CalendarGridProps) {
  const months = getMonths(monthCount)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const counts = Object.values(availability).filter((n) => n > 0)
  const maxCount = counts.length ? Math.max(...counts) : 0

  // Build date → participant names map
  const dateToNames: Record<string, string[]> = {}
  for (const p of participants) {
    for (const date of participantAvailability[p.id] ?? []) {
      if (!dateToNames[date]) dateToNames[date] = []
      dateToNames[date].push(p.name)
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      {months.map(({ year, month }) => {
        const firstDayOfWeek = new Date(year, month, 1).getDay()
        const daysInMonth = getDaysInMonth(year, month)

        return (
          <div key={`${year}-${month}`}>
            <h3 className="text-center font-semibold text-gray-700 mb-3">
              {MONTH_NAMES[month]} {year}
            </h3>

            {/* Day-of-week headers */}
            <div className="grid grid-cols-7 gap-1 mb-1">
              {DAY_LABELS.map((d) => (
                <div
                  key={d}
                  className="text-center text-xs text-gray-400 font-medium py-1"
                >
                  {d}
                </div>
              ))}
            </div>

            {/* Date cells */}
            <div className="grid grid-cols-7 gap-1">
              {/* Leading empty cells */}
              {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                <div key={`empty-${i}`} />
              ))}

              {/* Day cells */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1
                const dateStr = toDateString(year, month, day)
                const cellDate = new Date(year, month, day)
                const isPast = cellDate < today

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
