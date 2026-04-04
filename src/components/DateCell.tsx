'use client'

interface DateCellProps {
  date: string
  day: number
  count: number
  maxCount: number
  isMyDate: boolean
  isPast: boolean
  onToggle: () => void
}

function getColor(count: number, max: number): { bg: string; text: string } | null {
  if (count === 0) return null
  const pct = max === 0 ? 1 : count / max        // 0..1, how close to max
  // Light green → dark green: lightness 82→32%, saturation 35→55%
  const sat = Math.round(35 + pct * 20)
  const light = Math.round(82 - pct * 50)
  const textDark = light > 55
  return {
    bg: `hsl(120, ${sat}%, ${light}%)`,
    text: textDark ? '#1f2937' : '#ffffff',
  }
}

export default function DateCell({
  day,
  count,
  maxCount,
  isMyDate,
  isPast,
  onToggle,
}: DateCellProps) {
  const color = getColor(count, maxCount)

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
        isMyDate && !isPast ? 'ring-4 ring-indigo-500' : '',
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
