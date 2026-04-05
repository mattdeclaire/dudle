import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getPollWithAvailability, initSchema } from '@/lib/db'
import PollPageClient from '@/components/PollPageClient'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  await initSchema()
  const { id } = await params
  const data = await getPollWithAvailability(id)
  return {
    title: data ? `${data.poll.title} — Dudle` : 'Dudle',
  }
}

export default async function PollPage({ params }: Props) {
  await initSchema()
  const { id } = await params
  const data = await getPollWithAvailability(id)
  if (!data) notFound()

  return <PollPageClient initialData={data} />
}
