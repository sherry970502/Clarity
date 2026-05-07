import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ mapId: string }> }
) {
  const { mapId } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const original = await prisma.mindMap.findFirst({ where: { id: mapId, userId: session.user.id } })
  if (!original) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const copy = await prisma.mindMap.create({
    data: {
      userId: session.user.id,
      title: `${original.title} 副本`,
      nodesJson: original.nodesJson,
      rootId: original.rootId,
      customTypesJson: original.customTypesJson,
      // stickyNotes intentionally not copied (personal scratch notes)
    },
  })

  return NextResponse.json(copy, { status: 201 })
}
