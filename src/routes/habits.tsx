import { useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Shell } from '@/components/ui'
import { dayKey, loadHabits, loadProfile, saveHabits, saveProfile, uid, type Habit } from '@/lib/cognira'

export const Route = createFileRoute('/habits')({ component: H })

function last7(): string[] { return Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - (6 - i)); return dayKey(d) }) }
function streak(h: Habit): number {
  let s = 0; const d = new Date()
  const done = new Set(h.completedDates || [])
  if (!done.has(dayKey(d))) d.setDate(d.getDate() - 1)
  while (done.has(dayKey(d))) { s++; d.setDate(d.getDate() - 1) }
  return s
}

function H() {
  const [habits, setHabits] = useState<Habit[]>(loadHabits)
  const [tab, setTab] = useState<'All' | 'Analytics'>('All')
  const [open, setOpen] = useState(false)
  const days = useMemo(last7, [])
  const today = dayKey(new Date())
  const completedToday = habits.filter((h) => (h.completedDates || []).includes(today)).length
  const best = habits.reduce((m, h) => Math.max(m, streak(h)), 0)

  function persist(h: Habit[]) { setHabits(h); saveHabits(h) }
  function toggle(id: string) {
    const before = (habits.find((x) => x.id === id)?.completedDates || []).includes(today)
    persist(habits.map((h) => h.id === id ? { ...h, completedDates: (h.completedDates || []).includes(today) ? (h.completedDates || []).filter((d) => d !== today) : [...(h.completedDates || []), today] } : h))
    if (!before) { try { const pr = loadProfile(); if (pr) saveProfile({ ...pr, coins: (pr.coins || 0) + 5 }) } catch {} }
  }

  return (
    <Shell title="Habits">
      <h1 className="font-display text-3xl">HABITS</h1>
      <div className="seg"><button className={tab === 'All' ? 'on' : ''} onClick={() => setTab('All')}>All Habits</button><button className={tab === 'Analytics' ? 'on' : ''} onClick={() => setTab('Analytics')}>Analytics</button></div>
      <div className="grid grid-cols-3 gap-2">
        {[['Total', habits.length], ['Done today', completedToday], ['Best streak', `${best}d`]].map(([l, v]) => <div key={l} className="brutal-card text-center"><div className="font-display text-2xl">{v}</div><div className="font-mono2 text-[10px]">{l}</div></div>)}
      </div>
      {tab === 'All' ? (
        <div className="flex flex-col gap-3">
          {habits.length === 0 && <div className="brutal-card text-sm">No habits yet. Add your first one below.</div>}
          {habits.map((h) => (
            <button key={h.id} onClick={() => toggle(h.id)} className="brutal-card text-left" aria-pressed={(h.completedDates || []).includes(today)}>
              <div className="flex items-center gap-2"><span className="text-xl">{h.icon}</span><div className="flex-1"><b className="text-sm">{h.title}</b><div className="font-mono2 text-[11px]">{h.frequency} · {h.category || 'Study'} · target {h.target} · 🔥 {streak(h)} day streak</div></div><span className="tick">{(h.completedDates || []).includes(today) ? '✓' : '○'}</span></div>
              <div className="mt-2 flex gap-1">{days.map((d) => { const doneD = (h.completedDates || []).includes(d); return <span key={d} className="dot" style={{ background: doneD ? 'var(--color-ink)' : 'var(--color-surface)', border: '2px solid var(--color-ink)' }} title={d} /> })}</div>
            </button>
          ))}
          <button className="brutal-btn" onClick={() => setOpen(true)}>+ Add habit</button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="brutal-card"><b>WEEKLY COMPLETION</b>
            <div className="mt-2 flex h-28 items-end gap-2">{days.map((d) => { const c = habits.filter((h) => (h.completedDates || []).includes(d)).length; const pct = habits.length ? c / habits.length : 0; return <div key={d} className="flex-1" style={{ height: `${Math.max(6, pct * 100)}%`, background: 'var(--color-primary)', border: '2px solid var(--color-ink)' }} title={`${d}: ${c}/${habits.length}`} /> })}</div>
            <div className="mt-1 flex gap-2 font-mono2 text-[10px]">{days.map((d) => <span key={d} className="flex-1 text-center">{d.slice(5)}</span>)}</div>
          </div>
          {habits.map((h) => { const c = days.filter((d) => (h.completedDates || []).includes(d)).length; return <div key={h.id} className="brutal-card"><div className="flex justify-between text-sm"><b>{h.icon} {h.title}</b><span>{Math.round((c / 7) * 100)}%</span></div><div className="bar mt-1"><i style={{ width: `${(c / 7) * 100}%` }} /></div></div> })}
        </div>
      )}
      {open && <NewHabit close={() => setOpen(false)} add={(h: Habit) => { persist([...habits, h]); setOpen(false) }} />}
    </Shell>
  )
}

function NewHabit({ close, add }: { close: () => void; add: (h: Habit) => void }) {
  const [title, setTitle] = useState('')
  const [icon, setIcon] = useState('📚')
  const [freq, setFreq] = useState('Daily')
  const [cat, setCat] = useState('Study')
  const [target, setTarget] = useState('1')
  const [err, setErr] = useState('')
  return (
    <div className="sheet-back" onClick={close}><div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="New habit">
      <b>NEW HABIT</b>
      <label className="lbl">Title<input className="in" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Read 20 pages" /></label>
      <div className="lbl">Icon<div className="flex gap-2">{['📚', '🏃', '💧', '🧘', '💻', '✍️'].map((i) => <button key={i} className={`chip ${icon === i ? 'on' : ''}`} onClick={() => setIcon(i)}>{i}</button>)}</div></div>
      <div className="lbl">Category<div className="flex flex-wrap gap-2">{['Study', 'Health', 'Mind', 'Work'].map((c) => <button key={c} className={`chip ${cat === c ? 'on' : ''}`} onClick={() => setCat(c)}>{c}</button>)}</div></div>
      <div className="lbl">Frequency<div className="flex gap-2">{['Daily', 'Weekdays', 'Weekends'].map((f) => <button key={f} className={`chip ${freq === f ? 'on' : ''}`} onClick={() => setFreq(f)}>{f}</button>)}</div></div>
      <label className="lbl">Target<input className="in" type="number" min={1} max={100} value={target} onChange={(e) => setTarget(e.target.value)} aria-label="Target" /></label>
      {err && <div role="alert" className="text-sm font-bold">{err}</div>}
      <div className="flex gap-2"><button className="brutal-btn flex-1" onClick={() => { if (!title.trim()) { setErr('Give the habit a name.'); return } add({ id: uid(), title: title.trim(), icon, frequency: freq, category: cat, target: Math.max(1, Math.min(100, Number(target) || 1)), completedDates: [] }) }}>Add habit</button><button className="btn-ghost" onClick={close}>Cancel</button></div>
    </div></div>
  )
}
