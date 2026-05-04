import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

async function getMap(mapId: string, userId: string) {
  return prisma.mindMap.findFirst({ where: { id: mapId, userId } })
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ mapId: string }> }
) {
  const { mapId } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const map = await getMap(mapId, session.user.id)
  if (!map) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json(map)
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ mapId: string }> }
) {
  const { mapId } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const map = await getMap(mapId, session.user.id)
  if (!map) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { title, nodesJson, rootId, customTypesJson, stickyNotesJson } = await req.json()

  const updated = await prisma.mindMap.update({
    where: { id: mapId },
    data: {
      ...(title !== undefined && { title }),
      ...(nodesJson !== undefined && { nodesJson }),
      ...(rootId !== undefined && { rootId }),
      ...(customTypesJson !== undefined && { customTypesJson }),
      ...(stickyNotesJson !== undefined && { stickyNotesJson }),
    },
  })

  return NextResponse.json(updated)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ mapId: string }> }
) {
  const { mapId } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const map = await getMap(mapId, session.user.id)
  if (!map) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.mindMap.delete({ where: { id: mapId } })
  return NextResponse.json({ ok: true })
}
