import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { randomBytes } from 'crypto'
import { MindNode } from '@/lib/types'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ shareToken: string }> }
) {
  const { shareToken } = await params
  const { password } = await req.json()

  const map = await prisma.mindMap.findUnique({
    where: { shareToken },
    select: { sharePasswordHash: true, title: true, nodesJson: true, rootId: true, customTypesJson: true, userId: true },
  })

  if (!map || !map.sharePasswordHash) {
    return NextResponse.json({ error: '链接无效' }, { status: 404 })
  }

  const valid = await bcrypt.compare(password ?? '', map.sharePasswordHash)
  if (!valid) {
    return NextResponse.json({ error: '密码错误' }, { status: 401 })
  }

  // Collect linked sub-map IDs from nodes
  let linkedMapIds: string[] = []
  try {
    const nodes: Record<string, MindNode> = JSON.parse(map.nodesJson)
    linkedMapIds = [...new Set(
      Object.values(nodes).filter(n => n.mapLink).map(n => n.mapLink!)
    )]
  } catch {}

  // Ensure all linked sub-maps (owned by same user) have share tokens — generate on-demand if missing
  const linkedMaps: { id: string; title: string; shareToken: string }[] = []
  for (const linkedMapId of linkedMapIds) {
    const sub = await prisma.mindMap.findFirst({
      where: { id: linkedMapId, userId: map.userId },
      select: { id: true, title: true, shareToken: true },
    })
    if (!sub) continue
    let token = sub.shareToken
    if (!token) {
      const updated = await prisma.mindMap.update({
        where: { id: linkedMapId },
        data: { shareToken: randomBytes(16).toString('hex'), sharePasswordHash: map.sharePasswordHash },
      })
      token = updated.shareToken!
    }
    linkedMaps.push({ id: sub.id, title: sub.title, shareToken: token })
  }

  return NextResponse.json({
    title: map.title,
    nodesJson: map.nodesJson,
    rootId: map.rootId,
    customTypesJson: map.customTypesJson,
    linkedMaps,
  })
}
