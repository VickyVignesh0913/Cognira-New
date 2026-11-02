import { useEffect, useMemo, useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Shell } from '@/components/ui'
import { dayKey, addDays, loadProfile, saveProfile, demoTasks, demoHabits, demoSessions, loadTasks, loadHabits, loadSessions, saveTasks, randomTip, loadPrefs, type Profile, type Task, type Habit, type FocusSession } from '@/lib/cognira'

export const Route = createFileRoute('/home')({ component: Home })

function streakDays(dates: string[]): number {
  const set = new Set(dates)
  const t = dayKey()
  let s = 0
  let cur = set.has(t) ? t : addDays(t, -1)
  while (set.has(cur)) { s++; cur = addDays(cur, -1) }
  return s
}

function Home() {
  const [p, setP] = useState<Profile | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [habits, setHabits] = useState<Habit[]>([])
  const [sessions, setSessions] = useState<FocusSession[]>([])
  const prefs = useMemo(loadPrefs, [])
  useEffect(() => {
    setP(loadProfile())
    setTasks(loadTasks())
    setHabits(loadHabits())
    setSessions(loadSessions())
    const f = () => { setTasks(loadTasks()); setHabits(loadHabits()); setSessions(loadSessions()); setP(loadProfile()) }
    window.addEventListener('cognira-data', f)
    return () => window.removeEventListener('cognira-data', f)
  }, [])
  const name = (p?.name || 'Friend').split(' ')[0]
  const hour = new Date().getHours()
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const t = tasks.length ? tasks : demoTasks(p?.persona || 'student')
  const h = habits.length ? habits : demoHabits(p?.persona || 'student')
  const s = sessions.length ? sessions : demoSessions()
  const tk = dayKey()
  const doneToday = t.filter((x) => (x.completedDates || []).includes(tk)).length
  const focusToday = Math.round(s.filter((x) => (x.startedAt || '').slice(0, 10) === new Date().toISOString().slice(0, 10)).reduce((a, b) => a + b.durationSec, 0) / 60)
  const streak = Math.max(1, streakDays(h.flatMap((x) => x.completedDates || [])), streakDays(s.map((x) => (x.startedAt || '').slice(0, 10))))
  const week = t.length ? Math.round((doneToday / t.length) * 100) : 0
  const show = prefs.widgets as Record<string, boolean>
  const todayPlan = t.slice(0, 4)

  function toggleTask(id: string) {
    const real = tasks.length ? tasks : null
    const base = real || t
    const next = base.map((x) => x.id === id ? { ...x, completedDates: (x.completedDates || []).includes(tk) ? (x.completedDates || []).filter((d) => d !== tk) : [...(x.completedDates || []), tk] } : x)
    const wasDone = (t.find((x) => x.id === id)?.completedDates || []).includes(tk)
    if (real) { saveTasks(next) } else { saveTasks(next) }
    setTasks(next)
    if (!wasDone && p) { try { const np = { ...p, coins: (p.coins || 0) + 10, xp: (p.xp || 0) + 10 }; saveProfile(np); setP(np) } catch {} }
  }

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(tk, i - 6)), [tk])
  const perDay = days.map((d) => t.filter((x) => (x.completedDates || []).includes(d)).length)
  const max = Math.max(1, ...perDay)
  const pts = perDay.map((c, i) => `${i * 30},${54 - Math.round((c / max) * 44)}`).join(' ')

  return (
    <Shell title="Home" coins={p?.coins || 0}>
      <div className="kicker">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</div>
      <h1 className="font-display text-3xl leading-tight">{greet}, {name} 👋</h1>
      <p className="font-mono2 text-xs">You&apos;re on the right track! {p?.persona === 'professional' ? 'Deep work is your biggest win today.' : 'Revision is your biggest win today.'}</p>
      {show.stats !== false && (
        <div className="grid grid-cols-2 gap-3">
          <div className="brutal-card"><div className="font-mono2 text-[11px] text-ink">🔥 Streak</div><div className="font-display text-2xl">{streak} days</div></div>
          <div className="brutal-card"><div className="font-mono2 text-[11px] text-ink">⏱ Focus today</div><div className="font-display text-2xl">{focusToday} min</div></div>
          <div className="brutal-card"><div className="font-mono2 text-[11px] text-ink">✅ Tasks done</div><div className="font-display text-2xl">{doneToday}/{t.length}</div></div>
          <Link to="/mastery" className="brutal-card brutal-card-yellow" aria-label="Open Subject Mastery tracker"><div className="font-mono2 text-[11px] text-ink">📚 Active → Mastery</div><div className="font-display text-2xl text-ink">{p?.persona === 'student' ? (p?.subjects?.length || 5) : (p?.skills?.length || 4)} {p?.persona === 'student' ? 'subjects' : 'skills'}</div><div className="font-mono2 text-[10px]">Track mastery →</div></Link>
        </div>
      )}
      {show.coachTip !== false && (
        <div className="brutal-card brutal-card-yellow">
          <div className="flex items-center gap-2"><span className="tick">★</span><b>AI COACH TIP</b></div>
          <p className="mt-1 text-sm font-bold">{randomTip({ ...p, tasks: t, habits: h, sessions: s } as any)}</p>
          <Link to="/coach" className="brutal-btn mt-2 inline-block">Let&apos;s do this</Link>
        </div>
      )}
      {show.plan !== false && (
        <div className="brutal-card">
          <div className="mb-2 flex items-center justify-between"><b>TODAY&apos;S PLAN</b><Link to="/routine" className="font-mono2 text-xs underline">View all</Link></div>
          {todayPlan.map((x) => {
            const done = (x.completedDates || []).includes(tk)
            return (
              <button key={x.id} onClick={() => toggleTask(x.id)} className="mb-1 flex min-h-[44px] w-full items-center gap-2 border-b-2 border-ink/10 py-1 text-left last:border-0" aria-pressed={done} aria-label={`Mark ${x.title} ${done ? 'not done' : 'done'}`}>
                <span className="tick">{done ? '✓' : '○'}</span>
                <span className="flex-1 text-sm font-bold">{x.title}</span>
                <span className="font-mono2 text-[11px]">{x.start}–{x.end}</span>
              </button>
            )
          })}
        </div>
      )}
      {show.weekly !== false && (
        <div className="brutal-card">
          <div className="flex items-center justify-between"><b>WEEKLY PROGRESS</b><span className="font-display text-2xl">{week}%</span></div>
          <svg viewBox="0 0 200 60" className="mt-2 w-full" role="img" aria-label="Weekly progress chart">
            <polyline points={pts} fill="none" stroke="var(--color-ink)" strokeWidth="4" strokeLinejoin="round" />
            {perDay.map((c, i) => <circle key={i} cx={i * 30} cy={54 - Math.round((c / max) * 44)} r="5" fill="var(--color-accent)" stroke="var(--color-ink)" strokeWidth="2"><title>{days[i]}: {c} done</title></circle>)}
          </svg>
          <div className="flex justify-between font-mono2 text-[10px]">{days.map((d) => <span key={d}>{d.slice(5)}</span>)}</div>
        </div>
      )}
    </Shell>
  )
}
