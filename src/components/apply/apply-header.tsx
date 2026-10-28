'use client'

import Link from 'next/link'

const TABS = [
  { href: '/apply', label: 'Dashboard' },
  { href: '/apply/profile', label: 'Profile' },
  { href: '/apply/documents', label: 'Documents' },
]

export function ApplyHeader({ active }: { active: 'dashboard' | 'profile' | 'documents' }) {
  return (
    <header className='border-b border-border bg-background/95 backdrop-blur sticky top-0 z-50'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
        <div className='flex h-16 items-center justify-between gap-4'>
          <div className='flex items-center gap-3 shrink-0'>
            <Link href='/' className='flex items-center gap-2'>
              <div className='w-8 h-8 rounded-lg bg-primary flex items-center justify-center'>
                <span className='text-primary-foreground font-bold text-sm'>R</span>
              </div>
              <span className='font-semibold text-xl hidden sm:block'>Rankora</span>
            </Link>
            <span className='text-xs font-semibold text-primary bg-primary/10 border border-primary/20 rounded-full px-2.5 py-1 hidden sm:inline-flex'>
              Apply AI
            </span>
          </div>

          <nav className='flex items-center gap-2 sm:gap-4 overflow-x-auto'>
            {TABS.map(tab => {
              const isActive = tab.href === '/apply' ? active === 'dashboard' : tab.href.endsWith(active)
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={'px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ' +
                    (isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted')}
                >
                  {tab.label}
                </Link>
              )
            })}
            <Link href='/predict' className='hidden md:block px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground whitespace-nowrap'>
              Predict
            </Link>
            <Link href='/institutes' className='hidden md:block px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground whitespace-nowrap'>
              Institutes
            </Link>
          </nav>
        </div>
      </div>
    </header>
  )
}
