import { useEffect, useMemo, useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Check, ChevronRight, Clock3, Flame, NotebookText, Sparkles } from 'lucide-react'
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
  const todaySessions = s.filter((x) => (x.startedAt || '').slice(0, 10) === new Date().toISOString().slice(0, 10))
  const doneToday = t.filter((x) => (x.completedDates || []).includes(tk)).length
  const focusToday = Math.round(todaySessions.reduce((a, b) => a + b.durationSec, 0) / 60)
  const streak = Math.max(1, streakDays(h.flatMap((x) => x.completedDates || [])), streakDays(s.map((x) => (x.startedAt || '').slice(0, 10))))
  const week = t.length ? Math.round((doneToday / t.length) * 100) : 0
  const show = prefs.widgets as Record<string, boolean>
  const todayPlan = t.slice(0, 3)

  function toggleTask(id: string) {
    const next = t.map((x) => x.id === id ? { ...x, completedDates: (x.completedDates || []).includes(tk) ? (x.completedDates || []).filter((d) => d !== tk) : [...(x.completedDates || []), tk] } : x)
    const wasDone = (t.find((x) => x.id === id)?.completedDates || []).includes(tk)
    saveTasks(next)
    setTasks(next)
    if (!wasDone && p) { try { const np = { ...p, coins: (p.coins || 0) + 10, xp: (p.xp || 0) + 10 }; saveProfile(np); setP(np) } catch {} }
  }

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(tk, i - 6)), [tk])
  const perDay = days.map((d) => t.filter((x) => (x.completedDates || []).includes(d)).length)
  const max = Math.max(1, ...perDay)
  const labels = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']

  return (
    <Shell title="Home" coins={p?.coins || 0}>
      <div className="kicker">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</div>
      <h1 className="font-display text-2xl leading-tight sm:text-3xl">{greet}, {name} 👋</h1>
      {show.stats !== false && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="brutal-card min-w-0 p-3"><div className="mb-1"><Flame size={18}/></div><div className="font-display text-xl">{streak} days</div><div className="kicker">{p?.persona === 'professional' ? 'WORK STREAK' : 'STUDY STREAK'}</div></div>
          <div className="brutal-card min-w-0 p-3"><div className="mb-1"><Clock3 size={18}/></div><div className="font-display text-xl">{Math.floor(focusToday / 60)}h {focusToday % 60}m</div><div className="kicker">FOCUS TIME</div></div>
          <div className="brutal-card min-w-0 p-3"><div className="mb-1"><Check size={18}/></div><div className="font-display text-xl">{doneToday}/{t.length}</div><div className="kicker">TASKS DONE</div></div>
          <Link to="/mastery" className="brutal-card min-w-0 p-3" aria-label="Open Subject Mastery tracker"><div className="mb-1"><NotebookText size={18}/></div><div className="font-display text-xl">{p?.persona === 'student' ? (p?.subjects?.length || 5) : (p?.skills?.length || 4)}</div><div className="kicker">{p?.persona === 'professional' ? 'SKILLS' : 'SUBJECTS'}</div></Link>
        </div>
      )}
      {show.coachTip !== false && (
        <section className="brutal relative overflow-hidden rounded-[16px] bg-ink p-4 text-white shadow-[4px_4px_0_#0a1128]">
          <div className="flex items-center gap-2 font-mono2 text-xs font-bold tracking-widest text-accent"><Sparkles size={16}/> AI LIFE COACH</div>
          <p className="mt-2 max-w-[85%] font-mono2 text-xs leading-relaxed text-white">{randomTip((p ? { ...p, tasks: t, habits: h, sessions: s } : null) as Profile | null)}</p>
          <Link to="/coach" className="mt-3 inline-flex min-h-11 items-center rounded-lg border-2 border-ink bg-accent px-4 font-mono2 text-xs font-bold uppercase text-ink shadow-[3px_3px_0_#fff]">Let&apos;s do this</Link>
          <span aria-hidden className="absolute right-3 top-3 rounded-full bg-primary/20 p-3 text-2xl">✦</span>
        </section>
      )}
      {show.plan !== false && (
        <section>
          <div className="mb-2 flex items-center justify-between"><h2 className="font-display text-sm">TODAY&apos;S PLAN</h2><Link to="/routine" className="font-mono2 text-xs font-bold uppercase text-primary underline">View all</Link></div>
          <div className="space-y-2">
            {todayPlan.map((x) => {
              const done = (x.completedDates || []).includes(tk)
              return <div key={x.id} className="flex min-h-[48px] items-center gap-2 rounded-[10px] border-2 border-ink bg-surface px-2 py-2 shadow-[2px_2px_0_#0a1128]">
                <button onClick={() => toggleTask(x.id)} className={`flex h-6 w-6 shrink-0 items-center justify-center rounded border-2 border-ink text-sm text-white ${done ? 'bg-primary' : 'bg-surface'}`} aria-pressed={done} aria-label={`Mark ${x.title} ${done ? 'not done' : 'done'}`}>{done ? <Check size={15}/> : null}</button>
                <span className="min-w-0 flex-1 text-[11px] font-bold leading-snug">{x.title}</span><span className="shrink-0 font-mono2 text-[9px] text-muted">{x.start}–{x.end}</span><ChevronRight size={15} className="shrink-0 text-muted"/>
              </div>
            })}
          </div>
        </section>
      )}
      {show.weekly !== false && (
        <section className="brutal-card p-3">
          <div className="flex items-center justify-between"><h2 className="font-display text-sm">WEEKLY PROGRESS</h2><span className="font-display text-2xl text-primary">{week}%</span></div>
          <div className="mt-3 flex h-16 items-end gap-1 border-b-2 border-ink pb-1" role="img" aria-label="Weekly task completion bars">
            {perDay.map((count, i) => <div key={days[i]} className="flex h-full flex-1 items-end"><div title={`${days[i]}: ${count} tasks`} className={`w-full rounded-t-[2px] border-2 border-ink ${i === 2 ? 'bg-accent' : i === 3 ? 'bg-primary' : 'bg-bg'}`} style={{ height: `${Math.max(18, (count / max) * 100)}%` }}/></div>)}
          </div>
          <div className="mt-1 flex justify-between font-mono2 text-[9px] text-muted">{days.map((d, i) => <span key={d} className={i === 3 ? 'font-bold text-primary' : ''}>{labels[i]}</span>)}</div>
        </section>
      )}
    </Shell>
  )
}
