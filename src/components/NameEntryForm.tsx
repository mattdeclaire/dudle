'use client'

import { useState } from 'react'
import RedeemCodeForm from './RedeemCodeForm'

interface NameEntryFormProps {
  pollId: string
  onSuccess: (participantId: number, name: string) => void
}

export default function NameEntryForm({ pollId, onSuccess }: NameEntryFormProps) {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    setError('')

    try {
      const res = await fetch(`/api/polls/${pollId}/participants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      })
      if (!res.ok) throw new Error('Failed to join')
      const data = await res.json()
      localStorage.setItem(`participant-${pollId}`, String(data.id))
      onSuccess(data.id, data.name)
    } catch {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="max-w-sm mx-auto">
      <p className="text-gray-600 mb-4 text-center">
        New here? Enter your name to mark your availability
      </p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          required
          autoFocus
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={loading || !name.trim()}
          className="w-full py-2 px-4 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Joining…' : 'Join'}
        </button>
      </form>

      <div className="flex items-center gap-3 my-6">
        <div className="flex-1 border-t border-gray-200" />
        <span className="text-xs text-gray-400 uppercase tracking-wide">or</span>
        <div className="flex-1 border-t border-gray-200" />
      </div>

      <p className="text-gray-600 mb-3 text-center text-sm">
        Already joined? Enter the code from your other device
      </p>
      <RedeemCodeForm pollId={pollId} onSuccess={onSuccess} />
    </div>
  )
}
