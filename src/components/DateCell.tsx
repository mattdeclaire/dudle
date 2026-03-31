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

function getBackgroundStyle(
  count: number,
  total: number
): React.CSSProperties {
  if (total === 0 || count === 0) return {}
  const hue = Math.round((count / total) * 120)
  return { backgroundColor: `hsl(${hue}, 70%, 65%)` }
}

export default function DateCell({
  day,
  count,
  totalParticipants,
  isMyDate,
  isPast,
  onToggle,
}: DateCellProps) {
  const hasAvailability = count > 0
  const bgStyle = getBackgroundStyle(count, totalParticipants)
  const isEmpty = !hasAvailability

  return (
    <button
      onClick={isPast ? undefined : onToggle}
      disabled={isPast}
      className={[
        'relative flex flex-col items-center justify-center rounded-lg w-full aspect-square',
        'text-sm font-medium transition-colors select-none',
        isPast
          ? 'opacity-30 cursor-not-allowed bg-gray-50'
          : isEmpty
          ? 'bg-gray-50 hover:bg-gray-100 cursor-pointer'
          : 'cursor-pointer hover:brightness-110',
        isMyDate && !isPast ? 'ring-2 ring-white ring-offset-1 ring-offset-transparent' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={isPast || isEmpty ? undefined : bgStyle}
    >
      {/* checkmark for own selection */}
      {isMyDate && !isPast && (
        <span className="absolute top-0.5 right-1 text-white text-xs leading-none font-bold drop-shadow">
          ✓
        </span>
      )}

      {/* day number */}
      <span className={isEmpty || isPast ? 'text-gray-400' : 'text-white font-bold drop-shadow-sm'}>
        {day}
      </span>

      {/* count badge */}
      {hasAvailability && (
        <span className="text-white text-xs leading-none opacity-90 drop-shadow-sm">
          {count}
        </span>
      )}
    </button>
  )
}
