import Link from 'next/link'

export default function LandingPage() {
  return (
    <div className='min-h-screen flex flex-col'>
      <header className='border-b border-border bg-background/95 backdrop-blur sticky top-0 z-50'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='flex h-16 items-center justify-between'>
            <div className='flex items-center gap-2'>
              <div className='w-8 h-8 rounded-lg bg-primary flex items-center justify-center'>
                <span className='text-primary-foreground font-bold text-sm'>R</span>
              </div>
              <span className='font-semibold text-xl'>Rankora</span>
            </div>
            <nav className='flex items-center gap-6 text-sm font-medium text-muted-foreground'>
              <Link href='/predict' className='hover:text-foreground transition-colors'>Predict</Link>
              <Link href='/institutes' className='hover:text-foreground transition-colors'>Institutes</Link>
              <Link href='/apply' className='hover:text-foreground transition-colors'>Apply AI</Link>
              <Link href='/about' className='hover:text-foreground transition-colors'>About</Link>
            </nav>
          </div>
        </div>
      </header>

      <main className='flex-1 flex flex-col'>
        <section className='relative py-20 sm:py-32 lg:py-40 overflow-hidden'>
          <div className='absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10' />
          <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative'>
            <div className='text-center max-w-3xl mx-auto'>
              <h1 className='text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground mb-6'>
                Predict Your <span className='text-primary'>JOSSA College</span> Options
              </h1>
              <p className='text-lg sm:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto'>
                Enter your JEE rank, category, and preferences. Get instant, data-driven college predictions
                with transparent tier-based analysis based on official JOSSA cutoff history.
              </p>
              <div className='flex flex-col sm:flex-row gap-4 justify-center'>
                <Link
                  href='/predict'
                  className='inline-flex items-center justify-center gap-2 px-8 py-4 text-lg font-semibold text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 transition-colors shadow-lg shadow-primary/25'
                >
                  Start Prediction
                </Link>
                <Link
                  href='/institutes'
                  className='inline-flex items-center justify-center gap-2 px-8 py-4 text-lg font-semibold text-foreground bg-secondary rounded-lg hover:bg-secondary/80 transition-colors border border-border'
                >
                  Browse Institutes
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className='py-16 sm:py-24 bg-muted/30'>
          <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
            <div className='grid md:grid-cols-3 gap-8'>
              <FeatureCard
                title='Deterministic Predictions'
                description='No AI hallucinations. Every prediction is calculated from verified JOSSA cutoff data using transparent, auditable algorithms.'
                icon='🎯'
              />
              <FeatureCard
                title='Tier-Based Results'
                description='Clear Safer / Possible / Reach / Unlikely tiers with confidence scores and historical trend analysis.'
                icon='📊'
              />
              <FeatureCard
                title='Rich Filtering & Search'
                description='Filter by branch, institute type (IIT/NIT/IIIT/GFTI), state, NIRF rank, and custom preferences.'
                icon='🔍'
              />
            </div>
          </div>
        </section>

        <section className='py-16 sm:py-24'>
          <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center'>
            <h2 className='text-3xl sm:text-4xl font-bold text-foreground mb-4'>How It Works</h2>
            <p className='text-lg text-muted-foreground mb-12 max-w-2xl mx-auto'>
              Three simple steps to get your personalized college predictions
            </p>
            <div className='grid md:grid-cols-3 gap-8'>
              <StepCard number='01' title='Enter Your Profile' description='JEE rank/percentile, category, home state, gender, and target year/round' />
              <StepCard number='02' title='Set Preferences' description='Filter by branches, institute types, states, and NIRF rankings' />
              <StepCard number='03' title='View Results' description='Get tiered college options with cutoffs, trends, and detailed explanations' />
            </div>
          </div>
        </section>

        <section className='py-16 sm:py-24 bg-muted/30'>
          <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center'>
            <h2 className='text-3xl sm:text-4xl font-bold text-foreground mb-4'>Data Source</h2>
            <p className='text-lg text-muted-foreground mb-8 max-w-2xl mx-auto'>
              All predictions are based on official JOSSA (Joint Seat Allocation Authority) counselling data
              from 2023-2024. Data is validated, normalized, and stored in a structured SQL database.
            </p>
            <div className='flex flex-wrap justify-center gap-4 text-sm text-muted-foreground'>
              <span className='px-4 py-2 bg-background border border-border rounded-full'>JOSSA 2024</span>
              <span className='px-4 py-2 bg-background border border-border rounded-full'>JOSSA 2023</span>
              <span className='px-4 py-2 bg-background border border-border rounded-full'>Verified Cutoffs</span>
              <span className='px-4 py-2 bg-background border border-border rounded-full'>Percentile Mappings</span>
            </div>
          </div>
        </section>
      </main>

      <footer className='border-t border-border bg-background py-12'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-muted-foreground'>
          <p>Rankora - JOSSA College Predictor</p>
          <p className='mt-2'>Not affiliated with JoSAA or any government body. Predictions based on historical data only.</p>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({ title, description, icon }: { title: string; description: string; icon: string }) {
  return (
    <div className='bg-background border border-border rounded-xl p-6 hover:shadow-lg transition-shadow'>
      <div className='text-3xl mb-4'>{icon}</div>
      <h3 className='text-lg font-semibold text-foreground mb-2'>{title}</h3>
      <p className='text-muted-foreground'>{description}</p>
    </div>
  )
}

function StepCard({ number, title, description }: { number: string; title: string; description: string }) {
  return (
    <div className='relative p-6 text-left'>
      <div className='absolute -top-3 left-6 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg'>
        {number}
      </div>
      <div className='pt-8'>
        <h3 className='text-lg font-semibold text-foreground mb-2'>{title}</h3>
        <p className='text-muted-foreground'>{description}</p>
      </div>
    </div>
  )
}