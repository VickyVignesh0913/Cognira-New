import { useEffect, useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Shell } from '@/components/ui'
import { dayKey, loadProfile, loadTasks, saveProfile, saveTasks, demoTasks, uid, type Task } from '@/lib/cognira'

export const Route = createFileRoute('/routine')({ component: R })

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
function weekDates() {
  const now = new Date(); const dow = (now.getDay() + 6) % 7
  return Array.from({ length: 7 }, (_, i) => { const d = new Date(now); d.setDate(now.getDate() - dow + i); return d })
}

function R() {
  const [tasks, setTasks] = useState<Task[]>(() => { const t = loadTasks(); return t.length ? t : demoTasks(loadProfile()?.persona || 'student') })
  const [view, setView] = useState<'Day' | 'Week' | 'Month'>('Day')
  const [dayIdx, setDayIdx] = useState(() => (new Date().getDay() + 6) % 7)
  const [open, setOpen] = useState(false)
  const [edit, setEdit] = useState<Task | null>(null)
  const dates = useMemo(weekDates, [])
  const key = dayKey(dates[dayIdx])

  // Week/Month are views of this page, so Back should step Week -> Day instead of leaving /routine.
  useEffect(() => {
    const onPop = (e: PopStateEvent) => setView((e.state as { routineView?: string } | null)?.routineView === 'Week' ? 'Week' : 'Day')
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])
  function pickView(v: 'Day' | 'Week' | 'Month') {
    if (v === view) return
    setView(v)
    if (v === 'Week' && view === 'Day') history.pushState({ routineView: 'Week' }, '')
  }

  function persist(t: Task[]) { setTasks(t); saveTasks(t) }
  function awardCoins(n: number) { try { const pr = loadProfile(); if (pr) saveProfile({ ...pr, coins: (pr.coins || 0) + n }) } catch {} }
  function toggle(id: string) {
    const before = (tasks.find((x) => x.id === id)?.completedDates || []).includes(key)
    const t = tasks.map((x) => x.id === id ? { ...x, completedDates: (x.completedDates || []).includes(key) ? (x.completedDates || []).filter((d) => d !== key) : [...(x.completedDates || []), key] } : x)
    persist(t)
    if (!before) awardCoins(10)
  }
  function remove(id: string) { if (confirm('Delete this task?')) persist(tasks.filter((x) => x.id !== id)) }

  const dayTasks = tasks.filter((t) => (t.repeatDays || []).length === 0 || (t.repeatDays || []).includes(DAYS[dayIdx])).sort((a, b) => a.start.localeCompare(b.start))
  const doneCount = tasks.filter((t) => (t.completedDates || []).includes(key)).length

  return (
    <Shell title="Routine">
      <h1 className="font-display text-3xl">MY ROUTINE</h1>
      <div className="flex gap-1">
        {dates.map((d, i) => (
          <button key={i} onClick={() => setDayIdx(i)} className={`flex min-h-[44px] flex-1 flex-col items-center justify-center border-2 border-ink font-mono2 text-[11px] ${i === dayIdx ? 'bg-ink text-surface' : 'bg-surface'}`} aria-label={d.toDateString()}>
            <span>{DAYS[i][0]}</span><b>{d.getDate()}</b>
          </button>
        ))}
      </div>
      <div className="seg"><button className={view === 'Day' ? 'on' : ''} onClick={() => pickView('Day')}>Day</button><button className={view === 'Week' ? 'on' : ''} onClick={() => pickView('Week')}>Week</button><button className={view === 'Month' ? 'on' : ''} onClick={() => pickView('Month')}>Month</button></div>

      {view === 'Day' && (
        <div className="flex flex-col gap-3">
          {dayTasks.length === 0 && <div className="brutal-card text-sm">Nothing scheduled. Tap + to add your first task.</div>}
          {dayTasks.map((t) => (
            <div key={t.id} className="flex gap-3">
              <div className="w-12 shrink-0 font-mono2 text-[11px] font-bold">{t.start}</div>
              <div className={`brutal-card min-w-0 flex-1 ${(t.completedDates || []).includes(key) ? 'opacity-60' : ''}`}>
                <div className="flex items-center gap-2">
                  <button className="tick min-h-[44px] min-w-[44px]" onClick={() => toggle(t.id)} aria-label={`Complete ${t.title}`}>{(t.completedDates || []).includes(key) ? '✓' : '○'}</button>
                  <div className="min-w-0 flex-1"><b className="block break-words text-sm [overflow-wrap:anywhere]">{t.title}</b><div className="font-mono2 text-[11px]">{t.start}–{t.end} · {t.category}</div></div>
                  <button className="btn-ghost" onClick={() => { setEdit(t); setOpen(true) }} aria-label="Edit">✎</button>
                  <button className="btn-ghost" onClick={() => remove(t.id)} aria-label="Delete">🗑</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {view === 'Week' && (
        <div className="flex flex-col gap-3">{DAYS.map((d, i) => {
          const k = dayKey(dates[i]); const list = tasks.filter((t) => (t.repeatDays || []).includes(d) || (t.repeatDays || []).length === 0)
          return <div key={d} className="brutal-card"><b>{d} — {dates[i].toLocaleDateString()}</b>{list.map((t) => <div key={t.id} className="font-mono2 text-xs">{(t.completedDates || []).includes(k) ? '✓' : '○'} {t.start} {t.title}</div>)}</div>
        })}</div>
      )}
      {view === 'Month' && (
        <div className="brutal-card"><b>MONTH SUMMARY</b><div className="font-display text-4xl">{doneCount}/{tasks.length}</div><p className="font-mono2 text-xs">tasks done on selected day · keep the streak alive</p></div>
      )}

      <button className="fab" onClick={() => { setEdit(null); setOpen(true) }} aria-label="Add task">+</button>
      {open && <Sheet edit={edit} day={DAYS[dayIdx]} tasks={tasks} persist={persist} close={() => setOpen(false)} />}
    </Shell>
  )
}

function Sheet({ edit, day, tasks, persist, close }: { edit: Task | null; day: string; tasks: Task[]; persist: (t: Task[]) => void; close: () => void }) {
  const [title, setTitle] = useState(edit?.title || '')
  const [start, setStart] = useState(edit?.start || '09:00')
  const [end, setEnd] = useState(edit?.end || '10:00')
  const [cat, setCat] = useState(edit?.category || 'Study')
  const [days, setDays] = useState<string[]>(edit?.repeatDays || [day])
  const [err, setErr] = useState('')
  function save() {
    if (!title.trim()) { setErr('Give the task a title.'); return }
    if (end <= start) { setErr('End time must be after start time.'); return }
    if (edit) persist(tasks.map((t) => t.id === edit.id ? { ...t, title: title.trim(), start, end, startTime: start, endTime: end, category: cat, repeatDays: days } : t))
    else persist([...tasks, { id: uid(), title: title.trim(), start, end, startTime: start, endTime: end, category: cat, repeatDays: days, completedDates: [], date: dayKey(new Date()) }])
    close()
  }
  return (
    <div className="sheet-back" onClick={close}><div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Task editor">
      <b>{edit ? 'EDIT TASK' : 'NEW TASK'}</b>
      <label className="lbl">Title<input className="in" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Maths revision" /></label>
      <div className="grid grid-cols-2 gap-3">
        <label className="lbl">Start<input className="in" type="time" value={start} onChange={(e) => setStart(e.target.value)} /></label>
        <label className="lbl">End<input className="in" type="time" value={end} onChange={(e) => setEnd(e.target.value)} /></label>
      </div>
      <label className="lbl">Category<div className="flex flex-wrap gap-2">{['Study', 'Work', 'Health', 'Personal'].map((c) => <button key={c} className={`chip ${cat === c ? 'on' : ''}`} onClick={() => setCat(c)}>{c}</button>)}</div></label>
      <div className="lbl">Repeat<div className="flex flex-wrap gap-2">{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => <button key={d} className={`chip ${days.includes(d) ? 'on' : ''}`} onClick={() => setDays(days.includes(d) ? days.filter((x) => x !== d) : [...days, d])}>{d}</button>)}</div></div>
      {err && <div role="alert" className="text-sm font-bold">{err}</div>}
      <div className="flex gap-2"><button className="brutal-btn flex-1" onClick={save}>Save</button><button className="btn-ghost" onClick={close}>Cancel</button></div>
    </div></div>
  )
}
