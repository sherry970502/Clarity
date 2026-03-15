import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { redirect, notFound } from 'next/navigation'
import { MapClient } from './client'
import { MindNode } from '@/lib/types'

export default async function MapPage({ params }: { params: Promise<{ mapId: string }> }) {
  const { mapId } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect('/login')

  const map = await prisma.mindMap.findFirst({
    where: { id: mapId, userId: session.user.id },
  })
  if (!map) notFound()

  let nodes: Record<string, MindNode>
  try {
    nodes = JSON.parse(map.nodesJson)
  } catch {
    nodes = {}
  }

  return (
    <MapClient
      mapId={map.id}
      mapTitle={map.title}
      initialNodes={nodes}
      rootId={map.rootId}
      userName={session.user.name}
      shareToken={map.shareToken ?? null}
    />
  )
}
