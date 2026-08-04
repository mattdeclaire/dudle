import ClaimSession from '@/components/ClaimSession'

interface Props {
  params: Promise<{ id: string; code: string }>
}

export default async function ClaimPage({ params }: Props) {
  const { id, code } = await params
  return <ClaimSession pollId={id} code={code} />
}
