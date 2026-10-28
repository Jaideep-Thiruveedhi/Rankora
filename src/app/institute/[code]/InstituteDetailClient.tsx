'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import type { Branch } from '@prisma/client'

type Category = 'GENERAL' | 'EWS' | 'OBC_NCL' | 'SC' | 'ST'
type Quota = 'AIQ' | 'HS' | 'OS'
type Gender = 'MALE' | 'FEMALE' | 'TRANSGENDER'

interface InstituteDetailClientProps {
  institute: {
    id: string
    code: string
    name: string
    shortName: string | null
    type: string
    state: string
    city: string
    latitude: number | null
    longitude: number | null
    website: string | null
    established: number | null
    nirfRank: number | null
    branches: Branch[]
  }
}

interface CutoffHistory {
  year: number
  round: string
  openingRank: number | null
  closingRank: number | null
  openingPercentile: number | null
  closingPercentile: number | null
}

export default function InstituteDetailClient({ institute }: InstituteDetailClientProps) {
  const [selectedBranch, setSelectedBranch] = useState<string | null>(institute.branches[0]?.code || null)
  const [selectedCategory, setSelectedCategory] = useState<Category>('GENERAL')
  const [selectedQuota, setSelectedQuota] = useState<Quota>('AIQ')
  const [selectedGender, setSelectedGender] = useState<Gender>('MALE')

  const { data: history } = useQuery({
    queryKey: ['cutoff-history', institute.code, selectedBranch, selectedCategory, selectedQuota, selectedGender],
    queryFn: async () => {
      if (!selectedBranch) return []
      const res = await fetch('/api/cutoffs?institute=' + institute.code + '&branch=' + selectedBranch + '&category=' + selectedCategory + '&quota=' + selectedQuota + '&gender=' + selectedGender)
      if (!res.ok) return []
      const data = await res.json()
      return data.history as CutoffHistory[]
    },
    enabled: !!selectedBranch,
  })

  const branch = institute.branches.find(b => b.code === selectedBranch)

  const locationString = institute.code + ' ' + institute.type + ' ' + institute.city + ', ' + institute.state

  return (
    <div className='min-h-screen bg-gray-50'>
      <header className='border-b border-border bg-background/95 backdrop-blur sticky top-0 z-50'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='flex h-16 items-center justify-between'>
            <div className='flex items-center gap-2'>
              <Link href='/' className='flex items-center gap-2'>
                <div className='w-8 h-8 rounded-lg bg-primary flex items-center justify-center'>
                  <span className='text-primary-foreground font-bold text-sm'>R</span>
                </div>
                <span className='font-semibold text-xl'>Rankora</span>
              </Link>
              <span className='text-muted-foreground'>/</span>
              <Link href='/institutes' className='text-sm font-medium text-muted-foreground hover:text-foreground'>Institutes</Link>
              <span className='text-muted-foreground'>/</span>
              <span className='text-sm font-medium text-foreground'>{institute.code}</span>
            </div>
          </div>
        </div>
      </header>

      <main className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
        <div className='mb-8'>
          <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6'>
            <div>
              <h1 className='text-2xl sm:text-3xl font-bold text-foreground'>{institute.name}</h1>
              <p className='text-muted-foreground mt-1'>{locationString}</p>
            </div>
            <div className='flex items-center gap-4'>
              {institute.nirfRank && (
                <div className='px-4 py-2 bg-primary/10 text-primary rounded-lg'>
                  <span className='text-sm font-medium'>NIRF Rank: #{institute.nirfRank}</span>
                </div>
              )}
              {institute.website && (
                <a href={institute.website} target='_blank' rel='noopener noreferrer' className='px-4 py-2 text-sm font-medium text-foreground bg-secondary rounded-lg hover:bg-secondary/80'>
                  Website
                </a>
              )}
            </div>
          </div>

          <div className='grid sm:grid-cols-4 gap-4 text-sm'>
            <div className='bg-background border border-border rounded-lg p-4'>
              <p className='text-muted-foreground'>Type</p>
              <p className='font-semibold text-foreground'>{institute.type}</p>
            </div>
            <div className='bg-background border border-border rounded-lg p-4'>
              <p className='text-muted-foreground'>State</p>
              <p className='font-semibold text-foreground'>{institute.state}</p>
            </div>
            <div className='bg-background border border-border rounded-lg p-4'>
              <p className='text-muted-foreground'>City</p>
              <p className='font-semibold text-foreground'>{institute.city}</p>
            </div>
            {institute.established && (
              <div className='bg-background border border-border rounded-lg p-4'>
                <p className='text-muted-foreground'>Established</p>
                <p className='font-semibold text-foreground'>{institute.established}</p>
              </div>
            )}
          </div>
        </div>

        <div className='grid lg:grid-cols-4 gap-8'>
          <aside className='lg:col-span-1'>
            <div className='bg-background border border-border rounded-xl p-4 sticky top-24'>
              <h3 className='font-semibold text-foreground mb-4'>Branches</h3>
              <div className='space-y-1 max-h-[600px] overflow-y-auto'>
                {institute.branches.map(b => (
                  <button
                    key={b.code}
                    onClick={() => setSelectedBranch(b.code)}
                    className={'w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ' +
                      (selectedBranch === b.code
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground')}
                  >
                    {b.code} - {b.name}
                  </button>
                ))}
              </div>
            </div>
          </aside>

          <div className='lg:col-span-3 space-y-6'>
            {branch && (
              <div className='bg-background border border-border rounded-xl p-6'>
                <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6'>
                  <div>
                    <h2 className='text-xl font-semibold text-foreground'>{branch.code} - {branch.name}</h2>
                    <p className='text-muted-foreground'>Cutoff History</p>
                  </div>
                  <div className='flex flex-wrap gap-2'>
                    <select
                      value={selectedCategory}
                      onChange={e => setSelectedCategory(e.target.value as Category)}
                      className='px-3 py-2 border border-border rounded-lg bg-background text-sm'
                    >
                      <option value='GENERAL'>General</option>
                      <option value='EWS'>EWS</option>
                      <option value='OBC_NCL'>OBC-NCL</option>
                      <option value='SC'>SC</option>
                      <option value='ST'>ST</option>
                    </select>
                    <select
                      value={selectedQuota}
                      onChange={e => setSelectedQuota(e.target.value as Quota)}
                      className='px-3 py-2 border border-border rounded-lg bg-background text-sm'
                    >
                      <option value='AIQ'>AIQ</option>
                      <option value='HS'>HS</option>
                      <option value='OS'>OS</option>
                    </select>
                    <select
                      value={selectedGender}
                      onChange={e => setSelectedGender(e.target.value as Gender)}
                      className='px-3 py-2 border border-border rounded-lg bg-background text-sm'
                    >
                      <option value='MALE'>Male</option>
                      <option value='FEMALE'>Female</option>
                      <option value='TRANSGENDER'>Transgender</option>
                    </select>
                  </div>

                  {history && history.length > 0 ? (
                    <div className='overflow-x-auto'>
                      <table className='w-full text-sm'>
                        <thead>
                          <tr className='border-b border-border text-left text-muted-foreground'>
                            <th className='pb-2 pr-4 font-medium'>Year</th>
                            <th className='pb-2 pr-4 font-medium'>Round</th>
                            <th className='pb-2 pr-4 font-medium text-right'>Opening Rank</th>
                            <th className='pb-2 pr-4 font-medium text-right'>Closing Rank</th>
                            <th className='pb-2 pr-4 font-medium text-right'>Opening %ile</th>
                            <th className='pb-2 pr-4 font-medium text-right'>Closing %ile</th>
                          </tr>
                        </thead>
                        <tbody>
                          {history.map((h, i) => (
                            <tr key={i} className='border-b border-border/50 hover:bg-muted/50'>
                              <td className='py-2 pr-4'>{h.year}</td>
                              <td className='py-2 pr-4'>{h.round}</td>
                              <td className='py-2 pr-4 text-right font-mono'>{h.openingRank?.toLocaleString() || '\u2014'}</td>
                              <td className='py-2 pr-4 text-right font-mono font-semibold'>{h.closingRank?.toLocaleString() || '\u2014'}</td>
                              <td className='py-2 pr-4 text-right'>{h.openingPercentile?.toFixed(2) || '\u2014'}</td>
                              <td className='py-2 pr-4 text-right font-semibold'>{h.closingPercentile?.toFixed(2) || '\u2014'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className='text-muted-foreground text-center py-8'>No cutoff data available for this combination</p>
                  )}
                </div>
              </div>
            )}

            <div className='bg-background border border-border rounded-xl p-6'>
              <h3 className='text-lg font-semibold text-foreground mb-4'>All Branches Overview</h3>
              <div className='overflow-x-auto'>
                <table className='w-full text-sm'>
                  <thead>
                    <tr className='border-b border-border text-left text-muted-foreground'>
                      <th className='pb-2 pr-4 font-medium'>Branch</th>
                      <th className='pb-2 pr-4 font-medium'>Name</th>
                      <th className='pb-2 pr-4 font-medium text-right'>2024 R6 Closing (Gen/AIQ)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {institute.branches.map(b => (
                      <tr key={b.code} className='border-b border-border/50 hover:bg-muted/50 cursor-pointer' onClick={() => setSelectedBranch(b.code)}>
                        <td className='py-2 pr-4 font-semibold text-primary'>{b.code}</td>
                        <td className='py-2 pr-4'>{b.name}</td>
                        <td className='py-2 pr-4 text-right font-mono text-muted-foreground'>\u2014</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}