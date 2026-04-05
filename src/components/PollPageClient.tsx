'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import type { PollData } from '@/lib/types'
import NameEntryForm from './NameEntryForm'
import CalendarGrid from './CalendarGrid'

interface PollPageClientProps {
  initialData: PollData
}

export default function PollPageClient({ initialData }: PollPageClientProps) {
  const pollId = initialData.poll.id
  const [phase, setPhase] = useState<'name' | 'calendar'>('name')
  const [participantId, setParticipantId] = useState<number | null>(null)
  const [pollData, setPollData] = useState<PollData>(initialData)
  const [myDates, setMyDates] = useState<Set<string>>(new Set())
  const [copied, setCopied] = useState(false)
  const [activeIds, setActiveIds] = useState<Set<number>>(
    () => new Set(initialData.participants.map((p) => p.id)),
  )

  useEffect(() => {
    const stored = localStorage.getItem(`participant-${pollId}`)
    if (stored) {
      const id = parseInt(stored, 10)
      const participant = initialData.participants.find((p) => p.id === id)
      if (participant) {
        const existing = initialData.participantAvailability[id] ?? []
        setMyDates(new Set(existing))
        setParticipantId(id)
        setPhase('calendar')
      }
    }
  }, [pollId, initialData])

  // Keep activeIds in sync when new participants join
  useEffect(() => {
    setActiveIds((prev) => {
      const next = new Set(prev)
      for (const p of pollData.participants) next.add(p.id)
      return next
    })
  }, [pollData.participants])

  const handleNameSuccess = useCallback(
    (id: number, name: string) => {
      setParticipantId(id)
      const existing = pollData.participantAvailability[id] ?? []
      setMyDates(new Set(existing))
      setPhase('calendar')
    },
    [pollData.participantAvailability],
  )

  const handleToggle = useCallback(
    (date: string) => {
      if (!participantId) return

      const wasSelected = myDates.has(date)
      setMyDates((prev) => {
        const next = new Set(prev)
        wasSelected ? next.delete(date) : next.add(date)
        return next
      })
      setPollData((prev) => {
        const newCount = (prev.availability[date] ?? 0) + (wasSelected ? -1 : 1)
        const prevDates = prev.participantAvailability[participantId] ?? []
        const newDates = wasSelected ? prevDates.filter((d) => d !== date) : [...prevDates, date]
        return {
          ...prev,
          availability: { ...prev.availability, [date]: Math.max(0, newCount) },
          participantAvailability: { ...prev.participantAvailability, [participantId]: newDates },
        }
      })

      fetch(`/api/polls/${pollId}/participants/${participantId}/availability`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date }),
      }).catch(() => {
        setMyDates((prev) => {
          const next = new Set(prev)
          wasSelected ? next.add(date) : next.delete(date)
          return next
        })
        setPollData((prev) => {
          const newCount = (prev.availability[date] ?? 0) + (wasSelected ? 1 : -1)
          const prevDates = prev.participantAvailability[participantId] ?? []
          const revertedDates = wasSelected
            ? [...prevDates, date]
            : prevDates.filter((d) => d !== date)
          return {
            ...prev,
            availability: { ...prev.availability, [date]: Math.max(0, newCount) },
            participantAvailability: {
              ...prev.participantAvailability,
              [participantId]: revertedDates,
            },
          }
        })
      })
    },
    [participantId, pollId, myDates],
  )

  const toggleParticipant = useCallback((id: number) => {
    setActiveIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }, [])

  // Recompute availability counts from participantAvailability filtered by activeIds
  const filteredAvailability = useMemo(() => {
    const result: Record<string, number> = {}
    for (const p of pollData.participants) {
      if (!activeIds.has(p.id)) continue
      for (const date of pollData.participantAvailability[p.id] ?? []) {
        result[date] = (result[date] ?? 0) + 1
      }
    }
    return result
  }, [pollData.participants, pollData.participantAvailability, activeIds])

  const filteredParticipantAvailability = useMemo(() => {
    const result: Record<number, string[]> = {}
    for (const p of pollData.participants) {
      if (activeIds.has(p.id)) {
        result[p.id] = pollData.participantAvailability[p.id] ?? []
      }
    }
    return result
  }, [pollData.participants, pollData.participantAvailability, activeIds])

  const shareUrl =
    typeof window !== 'undefined' ? `${window.location.origin}/d/${pollId}` : `/d/${pollId}`

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback: select the input
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">{pollData.poll.title}</h1>
      </div>

      {phase === 'name' && (
        <NameEntryForm pollId={pollId} onSuccess={handleNameSuccess} />
      )}

      {phase === 'calendar' && (
        <>
          {/* Participant toggles */}
          {pollData.participants.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mb-6">
              {participantId && (
                <>
                  <button
                    onClick={() => setActiveIds(new Set(pollData.participants.map((p) => p.id)))}
                    className="text-xs text-indigo-500 hover:text-indigo-700 underline"
                  >
                    show all
                  </button>
                  <button
                    onClick={() => setActiveIds(new Set([participantId]))}
                    className="text-xs text-indigo-500 hover:text-indigo-700 underline"
                  >
                    only me
                  </button>
                  <span className="text-gray-300 text-xs">|</span>
                </>
              )}
              {pollData.participants.map((p) => {
                const active = activeIds.has(p.id)
                const isMe = p.id === participantId
                return (
                  <button
                    key={p.id}
                    onClick={() => toggleParticipant(p.id)}
                    className={[
                      'px-2 py-1 rounded-full text-xs font-medium transition-colors',
                      active
                        ? isMe
                          ? 'bg-indigo-100 text-indigo-700'
                          : 'bg-gray-200 text-gray-700'
                        : 'bg-gray-100 text-gray-300 line-through',
                    ].join(' ')}
                  >
                    {p.name}
                  </button>
                )
              })}
            </div>
          )}

          {/* Calendar */}
          <CalendarGrid
            availability={filteredAvailability}
            participantAvailability={filteredParticipantAvailability}
            participants={pollData.participants.filter((p) => activeIds.has(p.id))}
            myDates={participantId && activeIds.has(participantId) ? myDates : new Set<string>()}
            onToggle={handleToggle}
          />

          {/* Share link */}
          <div className="flex items-center gap-2 mt-8 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <input
              type="text"
              readOnly
              value={shareUrl}
              className="flex-1 text-sm text-gray-600 bg-transparent outline-none min-w-0"
            />
            <button
              onClick={handleCopy}
              className="shrink-0 text-sm px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors"
            >
              {copied ? 'Copied!' : 'Copy link'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
