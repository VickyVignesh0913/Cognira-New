import { useEffect, useState } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { authClient } from '@/lib/auth-client'
import { useAction } from '@/lib/actions'
import { getSessionUser, getSignInOptions } from '@/lib/session'
import { Logo, BrutalBtn, BrutalCard } from '@/components/ui'
import { DEMO_STUDENT, DEMO_PRO, loadProfile } from '@/lib/cognira'

export const Route = createFileRoute('/')({
  loader: async () => {
    const [user, opts] = await Promise.all([getSessionUser().catch(() => null), getSignInOptions().catch(() => ({ google: false }))])
    return { user, google: opts.google }
  },
  component: Opening,
})

function Opening() {
  const data = Route.useLoaderData() as { user: any; google: boolean }
  const nav = useNavigate()
  const [phase, setPhase] = useState<'splash' | 'intro' | 'join' | 'who'>('splash')
  const [slide, setSlide] = useState(0)
  const [bar, setBar] = useState(8)

  useEffect(() => {
    if (phase !== 'splash') return
    const t1 = setInterval(() => setBar((b) => Math.min(100, b + 14)), 220)
    const t2 = setTimeout(() => { setPhase('intro'); }, 1600)
    return () => { clearInterval(t1); clearTimeout(t2) }
  }, [phase])

  useEffect(() => {
    try {
      if (localStorage.getItem('cognira_seen') === '1' && !data.user) setPhase('join')
      if (data.user) nav({ to: loadProfile() ? '/home' : '/onboarding' })
    } catch { /* ignore */ }
  }, [])

  const slides = [
    { t: 'PLAN YOUR DAY', d: 'Routines, subjects and projects in one calm timeline — built around your real schedule.' },
    { t: 'FOCUS THAT COUNTS', d: 'Pomodoro or Deep Work sessions that save to your stats and grow your streak.' },
    { t: 'A COACH THAT KNOWS YOU', d: 'Advice based on your goals, tasks and recent focus — not generic tips.' },
  ]

  return (
    <div className="phone-wrap">
      <div className="phone">
        {phase === 'splash' && (
          <div className="flex min-h-[92vh] flex-col items-center justify-center gap-5 p-8 text-center">
            <Logo size={84} />
            <h1 className="font-display text-4xl">COGNIRA</h1>
            <p className="font-mono2 text-xs uppercase tracking-widest text-ink">Your Personal Growth Companion</p>
            <p className="font-mono2 text-xs">Preparing your experience…</p>
            <div className="brutal-bar"><span style={{ width: `${bar}%` }} /></div>
          </div>
        )}
        {phase === 'intro' && (
          <div className="flex min-h-[92vh] flex-col p-6">
            <div className="flex justify-end"><button className="btn-ghost" onClick={() => setPhase('join')}>Skip</button></div>
            <div className="flex flex-1 flex-col justify-center gap-4">
              <div className="kicker">Cognira · {slide + 1} / 3</div>
              <h1 className="font-display text-4xl leading-tight">{slides[slide].t}</h1>
              <p className="text-sm">{slides[slide].d}</p>
              <BrutalCard>{slides[slide].d}</BrutalCard>
            </div>
            <div className="dots">{[0, 1, 2].map((i) => <span key={i} className={i === slide ? 'on' : ''} />)}</div>
            <div className="mt-4 flex gap-3">
              {slide > 0 && <button className="btn-ghost brutal-box flex-1" onClick={() => setSlide(slide - 1)}>Back</button>}
              <button className="brutal-btn flex-1" onClick={() => { if (slide === 2) { try { localStorage.setItem('cognira_seen', '1') } catch {} ; setPhase('join') } else setSlide(slide + 1) }}>
                {slide === 2 ? "Let's go" : 'Next'}
              </button>
            </div>
          </div>
        )}
        {phase === 'join' && <Join google={data.google} onWho={() => setPhase('who')} />}
        {phase === 'who' && <Who />}
      </div>
    </div>
  )
}

function Join({ google: googleEnabled, onWho }: { google: boolean; onWho: () => void }) {
  const nav = useNavigate()
  const google = useAction(async () => {
    const r: any = await authClient.signIn.social({ provider: 'google', callbackURL: '/home' })
    if ((r as any)?.error) throw new Error((r as any).error.message || 'Google sign-in failed')
    return r
  }, { onSuccess: () => nav({ to: '/home' }) })
  const demo = (which: 'student' | 'pro') => {
    try { localStorage.setItem('cognira_demo_v1', which) } catch {}
    import('@/lib/cognira').then((m) => {
      try {
        const seed = which === 'pro' ? m.alexSeed() : m.ibrahimSeed()
        const persona = which === 'pro' ? 'professional' : 'student'
        m.saveTasks(seed.tasks as any); m.saveHabits(seed.habits as any); m.saveSessions(seed.sessions as any); m.saveResources(seed.resources as any)
        m.saveProfile({ name: which === 'pro' ? 'Alex Johnson' : 'Ibrahim', persona, subjects: persona === 'student' ? ['Maths', 'Physics', 'Chemistry'] : [], skills: persona === 'professional' ? ['Communication', 'SQL'] : [], goals: persona === 'student' ? ['Board exams'] : ['Promotion'], blockers: ['Procrastination'], className: persona === 'student' ? 'Class 10' : '', board: persona === 'student' ? 'CBSE' : '', profession: persona === 'professional' ? 'Product Manager' : '', level: 'Beginner', wake: '06:30', sleep: '22:30', hours: '', coins: 42, xp: 120, onboarding_complete: true } as any)
      } catch {}
      nav({ to: '/home' })
    })
  }
  return (
    <div className="flex min-h-[92vh] flex-col justify-center gap-4 p-6">
      <div className="flex items-center gap-3"><Logo size={48} /><h1 className="font-display text-3xl">JOIN COGNIRA</h1></div>
      <p className="font-mono2 text-xs uppercase tracking-widest text-ink">AI-powered. Human-focused.</p>
      <Link to="/login" className="brutal-btn w-full">Continue with Email</Link>
      {googleEnabled && <>
        <button className="brutal-btn brutal-btn-yellow w-full text-ink" onClick={() => google.run()}>{google.pending ? 'Opening Google…' : 'Continue with Google'}</button>
        {google.error && <div role="alert" className="font-mono2 text-xs">{google.error}</div>}
      </>}
      <button className="brutal-btn brutal-btn-white w-full" onClick={onWho}>Not sure yet? Choose your path</button>
      <div className="text-center font-mono2 text-xs">Already have an account? <Link to="/login" className="underline">Sign in</Link></div>
      <div className="brutal-card">
        <div className="kicker">Try it first</div>
        <p className="mb-3 text-sm">Explore with a full sample day — no account needed.</p>
        <div className="flex gap-3">
          <button className="brutal-btn flex-1" onClick={() => demo('student')}>Explore as {DEMO_STUDENT.name}</button>
          <button className="brutal-btn brutal-btn-white flex-1" onClick={() => demo('pro')}>Explore as {DEMO_PRO.name}</button>
        </div>
      </div>
    </div>
  )
}

function Who() {
  const nav = useNavigate()
  const [p, setP] = useState<'student' | 'professional' | ''>('')
  return (
    <div className="flex min-h-[92vh] flex-col justify-center gap-4 p-6">
      <div className="kicker">Who are you?</div>
      <h1 className="font-display text-3xl">PICK YOUR PATH</h1>
      <button onClick={() => setP('student')} className={`brutal-card w-full text-left ${p === 'student' ? 'brutal-pick' : ''}`}>
        <div className="font-display">STUDENT</div>
        <div className="text-sm text-ink">Study planning, subjects, StudyHouse library.</div>
      </button>
      <button onClick={() => setP('professional')} className={`brutal-card w-full text-left ${p === 'professional' ? 'brutal-pick' : ''}`}>
        <div className="font-display">PROFESSIONAL</div>
        <div className="text-sm text-ink">Work routines, projects, Resources library.</div>
      </button>
      <BrutalBtn disabled={!p} onClick={() => { try { localStorage.setItem('cognira_persona_pick', p) } catch {}; nav({ to: '/onboarding' }) }}>Continue</BrutalBtn>
    </div>
  )
}
