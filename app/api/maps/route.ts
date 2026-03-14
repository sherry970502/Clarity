import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { INITIAL_NODES } from '@/lib/store'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const maps = await prisma.mindMap.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: 'desc' },
    select: { id: true, title: true, updatedAt: true, createdAt: true },
  })

  return NextResponse.json(maps)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { title } = await req.json().catch(() => ({}))
  const rootId = 'root'

  const rootNode = {
    id: rootId,
    title: title || '新战略图',
    description: '',
    type: 'dimension',
    priority: null,
    children: [],
    parentId: null,
  }

  const map = await prisma.mindMap.create({
    data: {
      userId: session.user.id,
      title: title || '新战略图',
      nodesJson: JSON.stringify({ [rootId]: rootNode }),
      rootId,
    },
  })

  return NextResponse.json(map, { status: 201 })
}
