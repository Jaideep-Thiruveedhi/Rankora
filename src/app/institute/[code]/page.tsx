import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import InstituteDetailClient from './InstituteDetailClient'

interface Props {
  params: Promise<{ code: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params
  const institute = await prisma.institute.findUnique({ where: { code } })
  if (!institute) return { title: 'Institute Not Found' }
  return {
    title: institute.name + ' - Rankora',
    description: 'View cutoffs, branches, and details for ' + institute.name + ' (' + institute.code + ')',
  }
}

export default async function InstitutePage({ params }: Props) {
  const { code } = await params
  const institute = await prisma.institute.findUnique({
    where: { code },
    include: {
      branches: { orderBy: { name: 'asc' } },
    },
  })

  if (!institute) notFound()

  return <InstituteDetailClient institute={institute} />
}