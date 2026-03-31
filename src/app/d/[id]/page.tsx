import { notFound } from 'next/navigation'
import { getPollWithAvailability } from '@/lib/db'
import PollPageClient from '@/components/PollPageClient'

interface Props {
  params: Promise<{ id: string }>
}

export default async function PollPage({ params }: Props) {
  const { id } = await params
  const data = getPollWithAvailability(id)
  if (!data) notFound()

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 md:p-8">
      <PollPageClient initialData={data} />
    </div>
  )
}
