import { ShareViewer } from './client'

export default async function SharePage({ params }: { params: Promise<{ shareToken: string }> }) {
  const { shareToken } = await params
  return <ShareViewer shareToken={shareToken} />
}
