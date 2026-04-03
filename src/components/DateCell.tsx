'use client'

interface DateCellProps {
  date: string
  day: number
  count: number
  totalParticipants: number
  isMyDate: boolean
  isPast: boolean
  onToggle: () => void
}

function getColor(count: number, total: number): { bg: string; text: string } | null {
  if (total === 0 || count === 0) return null
  const pct = count / total                      // 0..1
  const hue = Math.round(pct * 120)              // 0=red, 60=yellow, 120=green
  // Lightness: keep it mid-range so the hue reads clearly
  const lightness = 62
  // Use dark text in the yellow middle band, white on red and green ends
  const textDark = pct > 0.25 && pct < 0.75
  return {
    bg: `hsl(${hue}, 72%, ${lightness}%)`,
    text: textDark ? '#1f2937' : '#ffffff',
  }
}

export default function DateCell({
  day,
  count,
  totalParticipants,
  isMyDate,
  isPast,
  onToggle,
}: DateCellProps) {
  const color = getColor(count, totalParticipants)

  return (
    <button
      onClick={isPast ? undefined : onToggle}
      disabled={isPast}
      className={[
        'relative flex flex-col items-center justify-center rounded-lg w-full aspect-square',
        'text-sm font-medium select-none transition-[filter]',
        isPast
          ? 'opacity-30 cursor-not-allowed bg-gray-100'
          : !color
          ? 'bg-gray-100 hover:bg-gray-200 cursor-pointer'
          : 'cursor-pointer hover:brightness-110',
        isMyDate && !isPast ? 'ring-2 ring-white ring-offset-1' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={color && !isPast ? { backgroundColor: color.bg } : undefined}
    >
      {/* checkmark for own selection */}
      {isMyDate && !isPast && (
        <span
          className="absolute top-0.5 right-1 text-xs leading-none font-bold"
          style={{ color: color ? color.text : '#6366f1' }}
        >
          ✓
        </span>
      )}

      {/* day number */}
      <span
        className="font-semibold leading-none"
        style={{ color: color && !isPast ? color.text : undefined }}
      >
        {day}
      </span>

      {/* availability count */}
      {count > 0 && (
        <span
          className="text-xs leading-none mt-0.5 opacity-80"
          style={{ color: color ? color.text : undefined }}
        >
          {count}
        </span>
      )}
    </button>
  )
}
