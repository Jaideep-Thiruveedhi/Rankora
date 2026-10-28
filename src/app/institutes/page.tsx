'use client'

import { useState, useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'

interface Institute {
  id: string
  code: string
  name: string
  shortName: string | null
  type: string
  state: string
  city: string
  nirfRank: number | null
}

export default function InstitutesPage() {
  const [search, setSearch] = useState('')
  const [state, setState] = useState('')
  const [type, setType] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  const { data: institutes, isLoading } = useQuery({
    queryKey: ['institutes', debouncedSearch, state, type],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (debouncedSearch) params.set('q', debouncedSearch)
      if (state) params.set('state', state)
      if (type) params.set('type', type)
      params.set('limit', '100')
      const res = await fetch('/api/institutes?' + params.toString())
      return res.json() as Promise<Institute[]>
    },
  })

  const states = useMemo(() => [...new Set(institutes?.map(i => i.state) || [])].sort(), [institutes])
  const types = useMemo(() => [...new Set(institutes?.map(i => i.type) || [])].sort(), [institutes])

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
              <span className='text-sm font-medium text-foreground'>Institutes</span>
            </div>
            <Link href='/predict' className='px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/90'>
              Predict
            </Link>
          </div>
        </div>
      </header>

      <main className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
        <div className='mb-8'>
          <h1 className='text-2xl sm:text-3xl font-bold text-foreground'>Institute Directory</h1>
          <p className='text-muted-foreground mt-1'>Browse all JOSSA participating institutes</p>
        </div>

        <div className='bg-background border border-border rounded-xl p-4 sm:p-6 mb-6'>
          <div className='grid sm:grid-cols-4 gap-4'>
            <div className='sm:col-span-2'>
              <label className='block text-sm font-medium text-foreground mb-1.5'>Search</label>
              <input
                type='text'
                placeholder='Search by name, code, or short name...'
                value={search}
                onChange={e => setSearch(e.target.value)}
                className='w-full px-4 py-2.5 border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary focus:border-transparent'
              />
            </div>
            <div>
              <label className='block text-sm font-medium text-foreground mb-1.5'>State</label>
              <select
                value={state}
                onChange={e => setState(e.target.value)}
                className='w-full px-4 py-2.5 border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary focus:border-transparent'
              >
                <option value=''>All States</option>
                {states.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className='block text-sm font-medium text-foreground mb-1.5'>Type</label>
              <select
                value={type}
                onChange={e => setType(e.target.value)}
                className='w-full px-4 py-2.5 border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary focus:border-transparent'
              >
                <option value=''>All Types</option>
                {types.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className='grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'>
            {[...Array(8)].map((_, i) => (
              <InstituteCardSkeleton key={i} />
            ))}
          </div>
        ) : institutes?.length === 0 ? (
          <div className='text-center py-12'>
            <p className='text-muted-foreground'>No institutes found matching your criteria.</p>
          </div>
        ) : (
          <div className='grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'>
            {institutes!.map(inst => (
              <InstituteCard key={inst.id} institute={inst} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

function InstituteCard({ institute }: { institute: Institute }) {
  return (
    <Link href={'/institute/' + institute.code} className='bg-background border border-border rounded-xl p-4 hover:shadow-md transition-shadow block'>
      <div className='flex items-start justify-between gap-3'>
        <div className='flex-1 min-w-0'>
          <h3 className='font-semibold text-foreground truncate'>{institute.name}</h3>
          <p className='text-sm text-muted-foreground mt-0.5'>{institute.code}</p>
          {institute.shortName && <p className='text-xs text-muted-foreground'>{institute.shortName}</p>}
        </div>
        {institute.nirfRank && (
          <span className='px-2 py-1 text-xs font-medium bg-primary/10 text-primary rounded-full shrink-0'>
            NIRF #{institute.nirfRank}
          </span>
        )}
      </div>
      <div className='mt-3 flex flex-wrap gap-2'>
        <span className='px-2 py-0.5 text-xs bg-muted text-muted-foreground rounded'>{institute.type}</span>
        <span className='px-2 py-0.5 text-xs bg-muted text-muted-foreground rounded'>{institute.state}</span>
        <span className='px-2 py-0.5 text-xs bg-muted text-muted-foreground rounded'>{institute.city}</span>
      </div>
    </Link>
  )
}

function InstituteCardSkeleton() {
  return (
    <div className='bg-background border border-border rounded-xl p-4 animate-pulse'>
      <div className='flex items-start justify-between gap-3'>
        <div className='flex-1'>
          <div className='h-5 w-3/4 bg-muted rounded mb-2'></div>
          <div className='h-4 w-1/4 bg-muted rounded'></div>
        </div>
        <div className='h-6 w-20 bg-muted rounded-full shrink-0'></div>
      </div>
      <div className='mt-3 flex gap-2'>
        <div className='h-5 w-16 bg-muted rounded'></div>
        <div className='h-5 w-20 bg-muted rounded'></div>
        <div className='h-5 w-16 bg-muted rounded'></div>
      </div>
    </div>
  )
}