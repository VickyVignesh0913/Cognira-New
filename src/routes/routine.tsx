import { useEffect, useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Shell } from '@/components/ui'
import { dayKey, loadProfile, loadTasks, saveProfile, saveTasks, demoTasks, uid, type Task, loadProfile as loadProfileLib } from '@/lib/cognira'
import { completeTaskWithMastery, upsertTask } from '@/server/cognira'

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
  const [masterySubject, setMasterySubject] = useState<string>('')
  const [subjects, setSubjects] = useState<string[]>([])
  const [savingTask, setSavingTask] = useState(false)
  const dates = useMemo(weekDates, [])
  const key = dayKey(dates[dayIdx])

  // Load subjects for mastery subject selector
  useEffect(() => {
    try {
      const pr = loadProfileLib()
      if (pr) {
        setSubjects((pr.persona === 'professional' ? pr.skills : pr.subjects) || [])
      }
    } catch {}
  }, [])

  // Server-aware task persistence
  async function syncTaskWithServer(t: Task) {
    try {
      await upsertTask({
        data: {
          id: t.id,
          title: t.title,
          start: t.start,
          end: t.end,
          category: t.category,
          masterySubject: t.masterSubject || '',
          repeatDays: t.repeatDays,
          completedDates: t.completedDates,
          date: t.date
        }
      })
    } catch (e) {
      console.error('Failed to sync task to server', e)
    }
  }

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

  async function toggle(id: string) {
    const task = tasks.find((x) => x.id === id)
    const before = (task?.completedDates || []).includes(key)

    // Optimistic update
    const t = tasks.map((x) => x.id === id ? { ...x, completedDates: (x.completedDates || []).includes(key) ? (x.completedDates || []).filter((d) => d !== key) : [...(x.completedDates || []), key] } : x)
    persist(t)

    if (!before) {
      awardCoins(10)

      // Log to mastery if task has a subject
      const taskSubject = task?.masterSubject || task?.category
      if (taskSubject) {
        try {
          const result = await completeTaskWithMastery({
            data: {
              taskId: id,
              sessionMinutes: 25,
              subject: taskSubject
            }
          })
          if (result.masteryContribution) {
            // Show toast or notification (would need a toast system)
          }
        } catch {}
      }
    }
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
                  <div className="min-w-0 flex-1"><b className="block break-words text-sm">{t.title}</b><div className="font-mono2 text-[11px]">{t.start}–{t.end} · {t.category}</div></div>
                </div>
                <div className="mt-2 flex justify-end gap-2">
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
      {open && <Sheet edit={edit} day={DAYS[dayIdx]} tasks={tasks} persist={persist} close={() => setOpen(false)} syncTask={syncTaskWithServer} />}
    </Shell>
  )
}

function Sheet({ edit, day, tasks, persist, close, syncTask }: { edit: Task | null; day: string; tasks: Task[]; persist: (t: Task[]) => void; close: () => void; syncTask: (t: Task) => Promise<void> }) {
  const [title, setTitle] = useState(edit?.title || '')
  const [start, setStart] = useState(edit?.start || '09:00')
  const [end, setEnd] = useState(edit?.end || '10:00')
  const [cat, setCat] = useState(edit?.category || 'Study')
  const [masterSubj, setMasterSubj] = useState<string>(edit?.masterSubject || '')
  const [days, setDays] = useState<string[]>(edit?.repeatDays || [day])
  const [err, setErr] = useState('')

  // Get persona to determine available subjects vs skills
  const [availableSubjects, setAvailableSubjects] = useState<string[]>([])
  useEffect(() => {
    try {
      const pr = loadProfileLib()
      if (pr) {
        setAvailableSubjects((pr.persona === 'professional' ? pr.skills : pr.subjects) || [])
      }
    } catch {}
  }, [])

  async function save() {
    if (!title.trim()) { setErr('Give the task a title.'); return }
    if (end <= start) { setErr('End time must be after start time.'); return }

    if (edit) {
      const updatedTask: Task = {
        ...edit,
        title: title.trim(),
        start,
        end,
        startTime: start,
        endTime: end,
        category: cat,
        masterSubject: masterSubj || '',
        repeatDays: days,
        completedDates: edit.completedDates || [],
        date: edit.date || dayKey(new Date())
      }
      persist(tasks.map((t) => t.id === edit.id ? updatedTask : t))
      await syncTask(updatedTask)
    } else {
      const newId = uid()
      const newTask: Task = {
        id: newId,
        title: title.trim(),
        start,
        end,
        startTime: start,
        endTime: end,
        category: cat,
        masterSubject: masterSubj || '',
        repeatDays: days,
        completedDates: [],
        date: dayKey(new Date())
      }
      persist([...tasks, newTask])
      await syncTask(newTask)
    }
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
      <div className="lbl">Category<div className="flex flex-wrap gap-2">{['Study', 'Work', 'Health', 'Personal'].map((c) => <button key={c} className={`chip ${cat === c ? 'on' : ''}`} onClick={() => setCat(c)}>{c}</button>)}</div></div>
      <div className="lbl">Mastery Subject
        <select className="in w-full" value={masterSubj} onChange={(e) => setMasterSubj(e.target.value)}>
          <option value="">Auto-detect from task</option>
          {availableSubjects.length > 0 ? availableSubjects.map((s) => <option key={s} value={s}>{s}</option>) : null}
        </select>
      </div>
      <div className="lbl">Repeat<div className="flex flex-wrap gap-2">{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => <button key={d} className={`chip ${days.includes(d) ? 'on' : ''}`} onClick={() => setDays(days.includes(d) ? days.filter((x) => x !== d) : [...days, d])}>{d}</button>)}</div></div>
      {err && <div role="alert" className="text-sm font-bold">{err}</div>}
      <div className="flex gap-2"><button className="brutal-btn flex-1" onClick={save}>Save</button><button className="btn-ghost" onClick={close}>Cancel</button></div>
    </div></div>
  )
}
