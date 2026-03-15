import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ shareToken: string }> }
) {
  const { shareToken } = await params
  const { password } = await req.json()

  const map = await prisma.mindMap.findUnique({
    where: { shareToken },
    select: { sharePasswordHash: true, title: true, nodesJson: true, rootId: true },
  })

  if (!map || !map.sharePasswordHash) {
    return NextResponse.json({ error: '链接无效' }, { status: 404 })
  }

  const valid = await bcrypt.compare(password ?? '', map.sharePasswordHash)
  if (!valid) {
    return NextResponse.json({ error: '密码错误' }, { status: 401 })
  }

  return NextResponse.json({
    title: map.title,
    nodesJson: map.nodesJson,
    rootId: map.rootId,
  })
}
