import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { redirect, notFound } from 'next/navigation'
import { MapClient } from './client'
import { MindNode, NodeTypeDef } from '@/lib/types'
import { TEMPLATES } from '@/lib/templates'

export default async function MapPage({
  params,
  searchParams,
}: {
  params: Promise<{ mapId: string }>
  searchParams: Promise<{ from?: string }>
}) {
  const { mapId } = await params
  const { from: fromMapId } = await searchParams
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect('/login')

  const [map, allMaps] = await Promise.all([
    prisma.mindMap.findFirst({ where: { id: mapId, userId: session.user.id } }),
    prisma.mindMap.findMany({
      where: { userId: session.user.id },
      orderBy: { updatedAt: 'desc' },
      select: { id: true, title: true },
    }),
  ])
  if (!map) notFound()

  let nodes: Record<string, MindNode>
  try {
    nodes = JSON.parse(map.nodesJson)
  } catch {
    nodes = {}
  }

  let customTypes: NodeTypeDef[]
  try {
    customTypes = map.customTypesJson ? JSON.parse(map.customTypesJson) : TEMPLATES[0].types
  } catch {
    customTypes = TEMPLATES[0].types
  }

  // Fetch the "from" map title for back navigation
  let fromMapTitle: string | null = null
  if (fromMapId) {
    const fromMap = allMaps.find(m => m.id === fromMapId)
    fromMapTitle = fromMap?.title ?? null
  }

  return (
    <MapClient
      mapId={map.id}
      mapTitle={map.title}
      initialNodes={nodes}
      initialCustomTypes={customTypes}
      rootId={map.rootId}
      userName={session.user.name}
      shareToken={map.shareToken ?? null}
      allMaps={allMaps.filter(m => m.id !== mapId)}
      fromMapId={fromMapId ?? null}
      fromMapTitle={fromMapTitle}
    />
  )
}
