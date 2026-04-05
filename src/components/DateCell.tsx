'use client'

import { useState, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'

interface DateCellProps {
  day: number
  count: number
  maxCount: number
  isMyDate: boolean
  isPast: boolean
  names: string[]
  onToggle: () => void
}

function getColor(count: number, max: number): { bg: string; text: string } | null {
  if (count === 0) return null
  const pct = max === 0 ? 1 : count / max
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
  names,
  onToggle,
}: DateCellProps) {
  const color = getColor(count, maxCount)
  const [popover, setPopover] = useState<{ x: number; y: number } | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressedRef = useRef(false)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const handlePointerDown = useCallback(() => {
    if (isPast) return
    longPressedRef.current = false
    timerRef.current = setTimeout(() => {
      longPressedRef.current = true
      if (buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect()
        setPopover({ x: rect.left + rect.width / 2, y: rect.top })
      }
    }, 1000)
  }, [isPast])

  const handlePointerUp = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    if (!longPressedRef.current && !isPast) {
      onToggle()
    }
    longPressedRef.current = false
  }, [isPast, onToggle])

  const handlePointerLeave = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  return (
    <>
      <button
        ref={buttonRef}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        disabled={isPast}
        className={[
          'relative flex items-center justify-center rounded-lg w-full aspect-square',
          'text-sm font-medium select-none transition-[filter]',
          isPast
            ? 'opacity-30 cursor-not-allowed bg-gray-100'
            : !color
            ? 'bg-gray-100 hover:bg-gray-200 cursor-pointer'
            : 'cursor-pointer hover:brightness-110',
        ]
          .filter(Boolean)
          .join(' ')}
        style={{
          ...(color && !isPast ? { backgroundColor: color.bg } : {}),
          ...(isPast
            ? {}
            : isMyDate
            ? { boxShadow: 'inset 0 4px 8px rgba(0,0,0,0.45), inset 0 2px 4px rgba(0,0,0,0.3)' }
            : { boxShadow: '0 4px 8px rgba(0,0,0,0.35), 0 2px 4px rgba(0,0,0,0.25)' }),
        }}
      >
        <span
          className="font-semibold leading-none"
          style={{ color: color && !isPast ? color.text : undefined }}
        >
          {day}
        </span>
      </button>

      {popover &&
        typeof window !== 'undefined' &&
        createPortal(
          <>
            <div className="fixed inset-0 z-40" onPointerDown={() => setPopover(null)} />
            <div
              className="fixed z-50 bg-white rounded-xl shadow-2xl border border-gray-200 p-3 min-w-[140px] max-w-[200px]"
              style={{
                left: popover.x,
                top: popover.y - 8,
                transform: 'translate(-50%, -100%)',
              }}
            >
              <div className="text-xs font-semibold text-gray-500 mb-1.5">
                {count} {count === 1 ? 'person' : 'people'} available
              </div>
              {names.length > 0 ? (
                <ul className="space-y-0.5">
                  {names.map((name) => (
                    <li key={name} className="text-sm text-gray-800">
                      {name}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-400">No one yet</p>
              )}
            </div>
          </>,
          document.body,
        )}
    </>
  )
}
