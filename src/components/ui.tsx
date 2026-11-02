import { useEffect, useState } from 'react'
import { Link, useLocation } from '@tanstack/react-router'
import { Home, CalendarDays, Timer, LibraryBig, Leaf, Settings, Coins, Bell, MessageCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { loadPrefs, loadProfile } from '@/lib/cognira'

export function Logo({ size = 34 }: { size?: number }) {
  return (
    <span className="brutal-sm inline-flex items-center justify-center rounded-[12px] bg-surface" style={{ width: size, height: size }} aria-hidden>
      <svg width={size - 10} height={size - 10} viewBox="0 0 32 32" fill="none">
        <defs>
          <linearGradient id="cg" x1="0" y1="0" x2="32" y2="32">
            <stop offset="0" stopColor="#1E60FF" />
            <stop offset="0.55" stopColor="#7C3AED" />
            <stop offset="1" stopColor="#FF9F1C" />
          </linearGradient>
        </defs>
        <path d="M16 2c1 4-2 6-3.5 8.5C10.5 13.5 9 16 9 19a7 7 0 0 0 14 0c0-2-.8-3.8-2-5.5-.3 1.2-1 2-2 2.5.5-3.5-.5-9-3-14z" fill="url(#cg)" stroke="#0A1128" strokeWidth="1.6" />
        <path d="M23 4l.9 1.9 2.1.3-1.5 1.5.4 2.1-1.9-1-1.9 1 .4-2.1-1.5-1.5 2.1-.3z" fill="#FF9F1C" stroke="#0A1128" strokeWidth="1" />
      </svg>
    </span>
  )
}

export function Shell({ children, coins = 0, title = 'Cognira' }: { children: React.ReactNode; coins?: number; title?: string }) {
  const loc = useLocation()
  const [liveCoins, setLiveCoins] = useState(coins)
  // Screens read localStorage and the clock, neither of which exist during SSR.
  // Render them only after mount so the server HTML and the first client render agree.
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  const [tickerPaused, setTickerPaused] = useState(false)
  useEffect(() => {
    const sync = () => { try { const p = loadProfile(); if (p && typeof p.coins === 'number') setLiveCoins(coins || p.coins) } catch {} }
    sync()
    window.addEventListener('cognira-data', sync)
    return () => window.removeEventListener('cognira-data', sync)
  }, [coins])
  useEffect(() => {
    try {
      const pr = loadPrefs()
      const root = document.documentElement
      root.classList.remove('theme-calm', 'theme-focus', 'theme-minimal', 'theme-sky')
      const t = (pr.theme || 'Sky Blue').toLowerCase()
      root.classList.add(t.includes('calm') ? 'theme-calm' : t.includes('focus') ? 'theme-focus' : t.includes('minimal') ? 'theme-minimal' : 'theme-sky')
      document.body.classList.toggle('motion-minimal', (pr.motion || '').toLowerCase() === 'minimal' || (pr.motion || '').toLowerCase() === 'reduced')
    } catch {}
  }, [loc.pathname])
  const showCoins = coins || liveCoins
  const tabs = [
    { to: '/home', label: 'Home', icon: Home },
    { to: '/routine', label: 'Routine', icon: CalendarDays },
    { to: '/focus', label: 'Focus', icon: Timer },
    { to: '/library', label: 'House', icon: LibraryBig },
    { to: '/habits', label: 'Habit', icon: Leaf },
  ]
  return (
    <div className="min-h-screen">
      <div className="mx-auto min-h-screen w-full max-w-[480px] border-x-2 border-ink bg-bg">
        <header className="sticky top-0 z-20 border-b-2 border-ink bg-surface">
          <div className="flex items-center justify-between px-6 py-3">
            <Link to="/home" className="flex items-center gap-2" aria-label="Cognira home">
              <Logo />
              <span className="font-display text-lg uppercase tracking-tight">Cognira</span>
            </Link>
            <div className="flex items-center gap-2">
              <span className="brutal-sm flex items-center gap-1 rounded-full bg-accent px-3 py-1 text-xs font-bold text-on-accent" aria-label={`${showCoins} coins`}>
                <Coins size={14} strokeWidth={2.5} /> {showCoins}
              </span>
              <Link to="/coach" className="brutal-sm rounded-full bg-surface p-2 text-ink" aria-label="AI Coach">
                <MessageCircle size={16} strokeWidth={2.5} />
              </Link>
              <button className="brutal-sm rounded-full bg-surface p-2 text-ink" aria-label="Notifications" onClick={() => alert('No new notifications. Reminders appear in your Today\'s Plan.')}>
                <Bell size={16} strokeWidth={2.5} />
              </button>
              <Link to="/settings" className="brutal-sm rounded-full bg-surface p-2 text-ink" aria-label="Settings">
                <Settings size={16} strokeWidth={2.5} />
              </Link>
            </div>
          </div>
          <div className="marquee relative border-t-2 border-ink bg-ink py-1 text-[11px] font-bold uppercase tracking-widest text-surface">
            <div className={cn('marquee-inner', tickerPaused && 'paused')}>
              <span className="px-4">AI Life Coach ✦ {title} ✦ Small wins daily ✦ Student & Professional ✦ AI Life Coach ✦ {title} ✦ Small wins daily ✦ Student & Professional ✦&nbsp;</span>
              <span className="px-4">AI Life Coach ✦ {title} ✦ Small wins daily ✦ Student & Professional ✦ AI Life Coach ✦ {title} ✦ Small wins daily ✦ Student & Professional ✦&nbsp;</span>
            </div>
            {/* WCAG 2.2.2: auto-playing motion needs its own pause control */}
            <button type="button" onClick={() => setTickerPaused((v) => !v)} className="marquee-toggle absolute inset-y-0 right-0 w-7 border-l-2 border-surface bg-ink text-[10px]" aria-label={tickerPaused ? 'Play ticker' : 'Pause ticker'}>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" aria-hidden>
                {tickerPaused ? <path d="M2 1l7 4-7 4z" /> : <><rect x="2" y="1" width="2.5" height="8" /><rect x="6" y="1" width="2.5" height="8" /></>}
              </svg>
            </button>
          </div>
        </header>
        <main className="px-6 pb-28 pt-5">{mounted && children}</main>
        <nav className="fixed bottom-0 left-1/2 z-20 w-full max-w-[480px] -translate-x-1/2 border-t-2 border-ink bg-surface" aria-label="Primary">
          <div className="grid grid-cols-5">
            {tabs.map(t => {
              const active = loc.pathname === t.to || (t.to === '/home' && loc.pathname === '/')
              return (
                <Link
                  key={t.to}
                  to={t.to}
                  className={cn('flex min-h-[64px] flex-col items-center justify-center gap-1 border-r-2 border-ink text-[10px] font-bold uppercase tracking-wider last:border-r-0', active ? 'bg-accent text-on-accent' : 'bg-surface')}
                  activeProps={{ className: 'bg-accent' }}
                  aria-current={active ? 'page' : undefined}
                >
                  <t.icon size={20} strokeWidth={2.5} />
                  {t.label}
                </Link>
              )
            })}
          </div>
        </nav>
      </div>
    </div>
  )
}

export function Card({ children, className = '', accent = false }: { children: React.ReactNode; className?: string; accent?: boolean }) {
  return <section className={cn('brutal rounded-[12px] p-4', accent ? 'bg-accent' : 'bg-surface', className)}>{children}</section>
}

export function PrimaryButton({ children, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button {...rest} className={cn('brutal-btn min-h-[44px] w-full rounded-[14px] bg-primary px-4 py-3 font-display text-sm uppercase tracking-wide text-on-primary disabled:opacity-60', rest.className)}>
      {children}
    </button>
  )
}

export function Chip({ active, children, onClick }: { active?: boolean; children: React.ReactNode; onClick?: () => void }) {
  return (
    <button onClick={onClick} className={cn('min-h-[44px] rounded-full border-2 border-ink px-4 py-2 text-xs font-bold uppercase tracking-wide', active ? 'bg-ink text-surface' : 'bg-surface text-ink')}>
      {children}
    </button>
  )
}

export const BrutalCard = Card
export const BrutalBtn = PrimaryButton
