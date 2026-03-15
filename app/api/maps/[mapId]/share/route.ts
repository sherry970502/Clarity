import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { randomBytes } from 'crypto'

async function getMap(mapId: string, userId: string) {
  return prisma.mindMap.findFirst({ where: { id: mapId, userId } })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ mapId: string }> }
) {
  const { mapId } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const map = await getMap(mapId, session.user.id)
  if (!map) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { password } = await req.json()
  if (!password || !password.trim()) {
    return NextResponse.json({ error: '请输入密码' }, { status: 400 })
  }

  const shareToken = map.shareToken ?? randomBytes(16).toString('hex')
  const sharePasswordHash = await bcrypt.hash(password, 10)

  const updated = await prisma.mindMap.update({
    where: { id: mapId },
    data: { shareToken, sharePasswordHash },
  })

  return NextResponse.json({ shareToken: updated.shareToken })
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

  await prisma.mindMap.update({
    where: { id: mapId },
    data: { shareToken: null, sharePasswordHash: null },
  })

  return NextResponse.json({ ok: true })
}
