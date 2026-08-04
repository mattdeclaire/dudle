'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

interface ClaimSessionProps {
  pollId: string
  code: string
}

export default function ClaimSession({ pollId, code }: ClaimSessionProps) {
  const router = useRouter()
  const claimed = useRef(false)

  useEffect(() => {
    if (claimed.current) return
    claimed.current = true

    async function claim() {
      try {
        const res = await fetch('/api/transfer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code }),
        })
        if (res.ok) {
          const data = await res.json()
          localStorage.setItem(`participant-${data.pollId}`, String(data.participantId))
        }
      } catch {
        // Invalid code or network error — land on the event page either way
      }
      // replace() keeps the code out of the address bar and browser history
      router.replace(`/d/${pollId}`)
    }
    claim()
  }, [pollId, code, router])

  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <p className="text-gray-400">Loading your session…</p>
    </div>
  )
}
