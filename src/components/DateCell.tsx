'use client'

interface DateCellProps {
  date: string
  day: number
  count: number
  minCount: number
  maxCount: number
  isMyDate: boolean
  isPast: boolean
  onToggle: () => void
}

function getColor(count: number, min: number, max: number): { bg: string; text: string } | null {
  if (count === 0) return null
  // When all dates have the same count, show green (best available)
  const pct = max === min ? 1 : (count - min) / (max - min)
  const hue = Math.round(pct * 120)              // 0=red, 60=yellow, 120=green
  const textDark = pct > 0.25 && pct < 0.75
  return {
    bg: `hsl(${hue}, 72%, 62%)`,
    text: textDark ? '#1f2937' : '#ffffff',
  }
}

export default function DateCell({
  day,
  count,
  minCount,
  maxCount,
  isMyDate,
  isPast,
  onToggle,
}: DateCellProps) {
  const color = getColor(count, minCount, maxCount)

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
        isMyDate && !isPast ? 'ring-3 ring-indigo-500' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={color && !isPast ? { backgroundColor: color.bg } : undefined}
    >
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
