import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { redirect, notFound } from 'next/navigation'
import { MapClient } from './client'
import { MindNode, NodeTypeDef, StickyNote } from '@/lib/types'
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

  // Infer which template this map belongs to by matching type ID overlap
  const bestTemplate = TEMPLATES.map(tpl => ({
    tpl,
    score: tpl.types.filter(tt => customTypes.some(ct => ct.id === tt.id)).length,
  })).sort((a, b) => b.score - a.score)[0]?.tpl

  // Append types that exist in the template but are missing from the map
  if (bestTemplate) {
    const existingIds = new Set(customTypes.map(ct => ct.id))
    const missing = bestTemplate.types.filter(tt => !existingIds.has(tt.id))
    if (missing.length > 0) customTypes = [...customTypes, ...missing]
  }

  // Sync color, bg, wrapTitle from template definitions for built-in types
  const allTemplateTypes = TEMPLATES.flatMap(t => t.types)
  customTypes = customTypes.map(ct => {
    const tmpl = allTemplateTypes.find(tt => tt.id === ct.id)
    if (!tmpl) return ct
    return {
      ...ct,
      color: tmpl.color,
      bg: tmpl.bg,
      wrapTitle: tmpl.wrapTitle,
    }
  })

  let stickyNotes: StickyNote[] = []
  try {
    stickyNotes = map.stickyNotesJson ? JSON.parse(map.stickyNotesJson) : []
  } catch {
    stickyNotes = []
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
      initialStickyNotes={stickyNotes}
    />
  )
}
