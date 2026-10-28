'use client'

import { useState, useEffect, useMemo, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import type { PredictionResult, InstitutePrediction, BranchPrediction, Tier } from '@/lib/prediction/types'

const TIER_COLORS: Record<Tier, { bg: string; text: string; border: string; badge: string }> = {
  SAFER: { bg: 'bg-green-50', text: 'text-green-800', border: 'border-green-200', badge: 'bg-green-100 text-green-700' },
  POSSIBLE: { bg: 'bg-yellow-50', text: 'text-yellow-800', border: 'border-yellow-200', badge: 'bg-yellow-100 text-yellow-700' },
  REACH: { bg: 'bg-orange-50', text: 'text-orange-800', border: 'border-orange-200', badge: 'bg-orange-100 text-orange-700' },
  UNLIKELY: { bg: 'bg-red-50', text: 'text-red-800', border: 'border-red-200', badge: 'bg-red-100 text-red-700' },
}

function ResultsContent() {
  const searchParams = useSearchParams()
  const [data, setData] = useState<PredictionResult | null>(null)
  const [activeTab, setActiveTab] = useState<Tier | 'ALL'>('ALL')
  const [filters, setFilters] = useState({
    branch: '',
    instituteType: '',
    state: '',
    minNirf: '',
    maxNirf: '',
  })
  const [showFilters, setShowFilters] = useState(false)

  // Parse data from URL params on mount - use a ref to avoid setState in effect warning
  useEffect(() => {
    const dataParam = searchParams.get('data')
    if (dataParam) {
      try {
        const parsed = JSON.parse(dataParam)
        // Use setTimeout to avoid synchronous setState in effect
        setTimeout(() => setData(parsed), 0)
      } catch {
        console.error('Failed to parse prediction data')
      }
    }
  }, [searchParams])

  const results = useMemo(() => data?.results || [], [data])
  const stats = useMemo(() => data?.stats || { totalOptions: 0, saferCount: 0, possibleCount: 0, reachCount: 0 }, [data])
  const metadata = data?.metadata

  const filteredResults = useMemo(() => {
    return results.filter(inst => {
      if (filters.branch && !inst.branches.some(b => b.branch.code === filters.branch)) return false
      if (filters.instituteType && inst.institute.type !== filters.instituteType) return false
      if (filters.state && inst.institute.state !== filters.state) return false
      if (filters.minNirf && inst.institute.nirfRank && inst.institute.nirfRank < parseInt(filters.minNirf)) return false
      if (filters.maxNirf && inst.institute.nirfRank && inst.institute.nirfRank > parseInt(filters.maxNirf)) return false
      return true
    }).map(inst => ({
      ...inst,
      branches: activeTab === 'ALL'
        ? inst.branches
        : inst.branches.filter(b => b.tier === activeTab),
    })).filter(inst => inst.branches.length > 0)
  }, [results, filters, activeTab])

  const allBranches = useMemo(() => [...new Set(results.flatMap(i => i.branches.map(b => b.branch.code)))].sort(), [results])
  const allTypes = useMemo(() => [...new Set(results.map(i => i.institute.type))].sort(), [results])
  const allStates = useMemo(() => [...new Set(results.map(i => i.institute.state))].sort(), [results])

  if (!data) {
    return (
      <div className='min-h-screen bg-gray-50 flex items-center justify-center'>
        <div className='text-center'>
          <p className='text-muted-foreground'>No prediction data found. <a href='/predict' className='text-primary underline'>Start a new prediction</a></p>
        </div>
      </div>
    )
  }

  return (
    <div className='min-h-screen bg-gray-50'>
      <header className='border-b border-border bg-background/95 backdrop-blur sticky top-0 z-50'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='flex h-16 items-center justify-between'>
            <div className='flex items-center gap-2'>
              <div className='w-8 h-8 rounded-lg bg-primary flex items-center justify-center'>
                <span className='text-primary-foreground font-bold text-sm'>R</span>
              </div>
              <span className='font-semibold text-xl'>Rankora</span>
            </div>
            <Link href='/predict' className='text-sm font-medium text-muted-foreground hover:text-foreground'>New Prediction</Link>
          </div>
        </div>
      </header>

      <main className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
        <div className='mb-8'>
          <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6'>
            <div>
              <h1 className='text-2xl sm:text-3xl font-bold text-foreground'>Prediction Results</h1>
              <p className='text-muted-foreground mt-1'>{metadata?.disclaimer || ''}</p>
            </div>
            <div className='flex items-center gap-2 text-sm text-muted-foreground'>
              <span>Rank: <span className='font-semibold text-foreground'>{metadata?.input.jeeRank?.toLocaleString() || '—'}</span></span>
              <span className='mx-2'>•</span>
              <span>Percentile: <span className='font-semibold text-foreground'>{metadata?.input.jeePercentile || '—'}</span></span>
              <span className='mx-2'>•</span>
              <span>{metadata?.input.category} / {metadata?.input.quota} / {metadata?.input.gender}</span>
            </div>
          </div>

          <div className='flex flex-wrap gap-2 mb-6'>
            {(['ALL', 'SAFER', 'POSSIBLE', 'REACH'] as const).map(tier => (
              <button
                key={tier}
                onClick={() => setActiveTab(tier)}
                className={'px-4 py-2 rounded-lg text-sm font-medium transition-colors ' +
                  (activeTab === tier
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80')}
              >
                {tier === 'ALL' ? 'All' : tier}
                {tier !== 'ALL' && (
                  <span className='ml-2 px-2 py-0.5 text-xs rounded-full bg-primary/20 text-primary'>
                    {tier === 'SAFER' ? stats.saferCount : tier === 'POSSIBLE' ? stats.possibleCount : stats.reachCount}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className='flex items-center justify-between mb-4'>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className='flex items-center gap-2 px-4 py-2 text-sm font-medium text-foreground bg-secondary rounded-lg hover:bg-secondary/80 transition-colors'
            >
              <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z' /></svg>
              Filters
            </button>
            <div className='text-sm text-muted-foreground'>
              {filteredResults.reduce((sum, i) => sum + i.branches.length, 0)} options across {filteredResults.length} institutes
            </div>
          </div>

          {showFilters && (
            <div className='mb-6 p-4 bg-background border border-border rounded-lg space-y-4'>
              <div className='grid sm:grid-cols-2 lg:grid-cols-5 gap-4'>
                <select
                  value={filters.branch}
                  onChange={e => setFilters(f => ({ ...f, branch: e.target.value }))}
                  className='px-4 py-2 border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary'
                >
                  <option value=''>All Branches</option>
                  {allBranches.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
                <select
                  value={filters.instituteType}
                  onChange={e => setFilters(f => ({ ...f, instituteType: e.target.value }))}
                  className='px-4 py-2 border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary'
                >
                  <option value=''>All Types</option>
                  {allTypes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <select
                  value={filters.state}
                  onChange={e => setFilters(f => ({ ...f, state: e.target.value }))}
                  className='px-4 py-2 border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary'
                >
                  <option value=''>All States</option>
                  {allStates.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <input
                  type='number'
                  placeholder='Min NIRF'
                  value={filters.minNirf}
                  onChange={e => setFilters(f => ({ ...f, minNirf: e.target.value }))}
                  className='px-4 py-2 border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary'
                />
                <input
                  type='number'
                  placeholder='Max NIRF'
                  value={filters.maxNirf}
                  onChange={e => setFilters(f => ({ ...f, maxNirf: e.target.value }))}
                  className='px-4 py-2 border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary'
                />
              </div>
              {(filters.branch || filters.instituteType || filters.state || filters.minNirf || filters.maxNirf) && (
                <button
                  onClick={() => setFilters({ branch: '', instituteType: '', state: '', minNirf: '', maxNirf: '' })}
                  className='text-sm text-primary hover:underline'
                >
                  Clear all filters
                </button>
              )}
            </div>
          )}

          {filteredResults.length === 0 && (
            <div className='text-center py-12'>
              <p className='text-muted-foreground'>No results match your filters.</p>
              <button
                onClick={() => setFilters({ branch: '', instituteType: '', state: '', minNirf: '', maxNirf: '' })}
                className='mt-2 text-primary hover:underline'
              >
                Clear filters
              </button>
            </div>
          )}

          <div className='space-y-4'>
            {filteredResults.map(inst => (
              <InstituteCard key={inst.institute.id} institute={inst} />
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}

export default function ResultsPage() {
  return (
    <Suspense fallback={
      <div className='min-h-screen bg-gray-50 flex items-center justify-center'>
        <p className='text-muted-foreground'>Loading prediction…</p>
      </div>
    }>
      <ResultsContent />
    </Suspense>
  )
}

function InstituteCard({ institute }: { institute: InstitutePrediction }) {
  const { institute: inst, branches } = institute
  const bestTier = branches[0]?.tier || 'UNLIKELY'
  const colors = TIER_COLORS[bestTier]

  return (
    <div className={'bg-background border ' + colors.border + ' rounded-xl overflow-hidden hover:shadow-md transition-shadow'}>
      <div className='p-4 sm:p-6'>
        <div className='flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4'>
          <div className='flex-1'>
            <div className='flex items-center gap-3 mb-2'>
              <h3 className='text-lg font-semibold text-foreground'>{inst.name}</h3>
              {inst.nirfRank && (
                <span className='px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground rounded'>
                  NIRF #{inst.nirfRank}
                </span>
              )}
            </div>
            <div className='flex flex-wrap items-center gap-3 text-sm text-muted-foreground mb-2'>
              <span className='px-2 py-0.5 bg-muted rounded'>{inst.type}</span>
              <span className='px-2 py-0.5 bg-muted rounded'>{inst.state}</span>
              <span className='px-2 py-0.5 bg-muted rounded'>{inst.city}</span>
              {inst.shortName && <span className='px-2 py-0.5 bg-muted rounded'>{inst.shortName}</span>}
            </div>
            <div className='flex flex-wrap gap-2'>
              {branches.slice(0, 3).map(b => (
                <TierBadge key={b.branch.id} branch={b} />
              ))}
              {branches.length > 3 && (
                <span className='px-3 py-1 text-sm text-muted-foreground bg-muted rounded'>
                  +{branches.length - 3} more
                </span>
              )}
            </div>
          </div>
          <div className='flex items-center gap-3'>
            <span className={'px-3 py-1.5 rounded-full text-sm font-semibold ' + colors.badge}>
              {bestTier}
            </span>
            <Link
              href={'/institute/' + inst.code}
              className='px-4 py-2 text-sm font-medium text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors'
            >
              Details
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

function TierBadge({ branch }: { branch: BranchPrediction }) {
  const colors = TIER_COLORS[branch.tier]
  return (
    <span className={'px-3 py-1 rounded-full text-xs font-semibold ' + colors.badge} title={branch.reason}>
      {branch.branch.code} {branch.tier}
    </span>
  )
}