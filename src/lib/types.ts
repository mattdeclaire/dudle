export interface Poll {
  id: string
  title: string
  description: string | null
  start_date: string | null
  end_date: string | null
  created_at: string
}

export interface Participant {
  id: number
  poll_id: string
  name: string
}

export interface PollData {
  poll: Poll
  participants: Participant[]
  /** date string (YYYY-MM-DD) → number of participants available */
  availability: Record<string, number>
  /** participantId → array of date strings they selected */
  participantAvailability: Record<number, string[]>
}
