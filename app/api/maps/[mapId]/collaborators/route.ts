import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

async function assertOwner(mapId: string, userId: string) {
  const map = await prisma.mindMap.findFirst({ where: { id: mapId, userId } })
  return map
}

// GET — list collaborators (owner + collaborators can view)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ mapId: string }> }
) {
  const { mapId } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const hasAccess = await prisma.mindMap.findFirst({
    where: {
      id: mapId,
      OR: [{ userId: session.user.id }, { collaborators: { some: { userId: session.user.id } } }],
    },
  })
  if (!hasAccess) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const collaborators = await prisma.mapCollaborator.findMany({
    where: { mapId },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { invitedAt: 'asc' },
  })

  return NextResponse.json(collaborators)
}

// POST — invite by email (owner only)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ mapId: string }> }
) {
  const { mapId } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!await assertOwner(mapId, session.user.id))
    return NextResponse.json({ error: '仅所有者可邀请协作者' }, { status: 403 })

  const { email } = await req.json().catch(() => ({}))
  if (!email) return NextResponse.json({ error: '请填写邮箱' }, { status: 400 })

  const invitee = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, email: true },
  })
  if (!invitee) return NextResponse.json({ error: '该邮箱尚未注册' }, { status: 404 })
  if (invitee.id === session.user.id)
    return NextResponse.json({ error: '不能邀请自己' }, { status: 400 })

  const collab = await prisma.mapCollaborator.upsert({
    where: { mapId_userId: { mapId, userId: invitee.id } },
    create: { mapId, userId: invitee.id },
    update: {},
    include: { user: { select: { id: true, name: true, email: true } } },
  })

  return NextResponse.json(collab, { status: 201 })
}

// DELETE — remove a collaborator (owner only)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ mapId: string }> }
) {
  const { mapId } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!await assertOwner(mapId, session.user.id))
    return NextResponse.json({ error: '仅所有者可移除协作者' }, { status: 403 })

  const { userId } = await req.json().catch(() => ({}))
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

  await prisma.mapCollaborator.deleteMany({ where: { mapId, userId } })
  return NextResponse.json({ ok: true })
}
