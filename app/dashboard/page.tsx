import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import { DashboardClient } from './client'

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect('/login')

  const [ownedMaps, collaborations] = await Promise.all([
    prisma.mindMap.findMany({
      where: { userId: session.user.id },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true, title: true, updatedAt: true, createdAt: true,
        collaborators: { select: { user: { select: { id: true, name: true } } } },
      },
    }),
    prisma.mapCollaborator.findMany({
      where: { userId: session.user.id },
      include: {
        map: {
          select: {
            id: true, title: true, updatedAt: true, createdAt: true,
            user: { select: { name: true } },
          },
        },
      },
      orderBy: { map: { updatedAt: 'desc' } },
    }),
  ])

  const collaboratedMaps = collaborations.map(c => ({
    id: c.map.id,
    title: c.map.title,
    updatedAt: c.map.updatedAt,
    createdAt: c.map.createdAt,
    isCollaborated: true as const,
    ownerName: c.map.user.name,
    collaborators: [],
  }))

  return (
    <DashboardClient
      maps={ownedMaps}
      collaboratedMaps={collaboratedMaps}
      userName={session.user.name}
    />
  )
}
