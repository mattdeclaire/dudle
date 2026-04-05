'use client'

import { useEffect, useState, useCallback } from 'react'
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
  const [myName, setMyName] = useState<string>('')
  const [pollData, setPollData] = useState<PollData>(initialData)
  const [myDates, setMyDates] = useState<Set<string>>(new Set())
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(`participant-${pollId}`)
    if (stored) {
      const id = parseInt(stored, 10)
      const participant = initialData.participants.find((p) => p.id === id)
      if (participant) {
        const existing = initialData.participantAvailability[id] ?? []
        setMyDates(new Set(existing))
        setParticipantId(id)
        setMyName(participant.name)
        setPhase('calendar')
      }
    }
  }, [pollId, initialData])

  const handleNameSuccess = useCallback(
    (id: number, name: string) => {
      setParticipantId(id)
      setMyName(name)
      const existing = pollData.participantAvailability[id] ?? []
      setMyDates(new Set(existing))
      setPhase('calendar')
    },
    [pollData.participantAvailability]
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
        // Revert on failure
        setMyDates((prev) => {
          const next = new Set(prev)
          wasSelected ? next.add(date) : next.delete(date)
          return next
        })
        setPollData((prev) => {
          const newCount = (prev.availability[date] ?? 0) + (wasSelected ? 1 : -1)
          const prevDates = prev.participantAvailability[participantId] ?? []
          const revertedDates = wasSelected ? [...prevDates, date] : prevDates.filter((d) => d !== date)
          return {
            ...prev,
            availability: { ...prev.availability, [date]: Math.max(0, newCount) },
            participantAvailability: { ...prev.participantAvailability, [participantId]: revertedDates },
          }
        })
      })
    },
    [participantId, pollId, myDates]
  )

  const shareUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/d/${pollId}`
      : `/d/${pollId}`

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
        {phase === 'calendar' && myName && (
          <p className="text-gray-500 text-sm mt-1">Editing as {myName}</p>
        )}
      </div>

      {phase === 'name' && (
        <NameEntryForm pollId={pollId} onSuccess={handleNameSuccess} />
      )}

      {phase === 'calendar' && (
        <>
          {/* Share link */}
          <div className="flex items-center gap-2 mb-6 p-3 bg-gray-50 rounded-lg border border-gray-200">
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

          {/* Participants */}
          {pollData.participants.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {pollData.participants.map((p) => (
                <span
                  key={p.id}
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    p.id === participantId
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {p.name}
                </span>
              ))}
            </div>
          )}

          {/* Calendar */}
          <CalendarGrid
            availability={pollData.availability}
            participantAvailability={pollData.participantAvailability}
            participants={pollData.participants}
            myDates={myDates}
            onToggle={handleToggle}
          />

          {/* Legend */}
          <div className="mt-8 flex flex-wrap items-center gap-4 text-sm text-gray-500">
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded bg-gray-100 border border-gray-200" />
              <span>No one</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: 'hsl(120,40%,74%)' }} />
              <span>Few available</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: 'hsl(120,47%,57%)' }} />
              <span>Some available</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: 'hsl(120,55%,32%)' }} />
              <span>Most available</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded bg-gray-100 ring-4 ring-indigo-500" />
              <span>You&apos;re available</span>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
