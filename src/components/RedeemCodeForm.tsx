'use client'

import { useState } from 'react'

interface RedeemCodeFormProps {
  /** When set and the code belongs to this poll, onSuccess is called instead of navigating */
  pollId?: string
  onSuccess?: (participantId: number, name: string) => void
}

export default function RedeemCodeForm({ pollId, onSuccess }: RedeemCodeFormProps) {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!code.trim()) return
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim() }),
      })
      if (!res.ok) {
        setError(res.status === 404 ? 'Invalid or expired code.' : 'Something went wrong. Please try again.')
        setLoading(false)
        return
      }
      const data = await res.json()
      localStorage.setItem(`participant-${data.pollId}`, String(data.participantId))
      if (pollId === data.pollId && onSuccess) {
        onSuccess(data.participantId, data.name)
      } else {
        window.location.href = `/d/${data.pollId}`
      }
    } catch {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap gap-2">
      <input
        type="text"
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        placeholder="e.g. XK4M"
        maxLength={4}
        autoCapitalize="characters"
        autoComplete="off"
        spellCheck={false}
        className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-lg font-mono tracking-widest uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
      />
      <button
        type="submit"
        disabled={loading || !code.trim()}
        className="shrink-0 py-2 px-4 bg-gray-700 text-white font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? 'Checking…' : 'Continue'}
      </button>
      {error && <p className="text-red-600 text-sm basis-full">{error}</p>}
    </form>
  )
}
