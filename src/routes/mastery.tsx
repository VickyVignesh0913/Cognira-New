import { useEffect, useMemo, useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Shell } from '@/components/ui'
import { loadProfile, loadSessions, loadTasks, uid, dayKey, type Profile } from '@/lib/cognira'

export const Route = createFileRoute('/mastery')({ component: Mastery })

interface MasteryLog { at: string; minutes: number }
interface MasteryEntry {
  id: string
  subject: string
  minutes: number
  confidence: number
  updatedAt: string
  logs: MasteryLog[]
}

const KEY = 'cognira-mastery'

function readEntries(): MasteryEntry[] {
  try {
    if (typeof localStorage === 'undefined') return []
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const arr = JSON.parse(raw) as MasteryEntry[]
    return Array.isArray(arr) ? arr : []
  } catch { return [] }
}
function writeEntries(e: MasteryEntry[]) {
  try { localStorage.setItem(KEY, JSON.stringify(e)) } catch { /* full */ }
  try { window.dispatchEvent(new Event('cognira-data')) } catch { /* ssr */ }
}

function Mastery() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [entries, setEntries] = useState<MasteryEntry[]>([])
  const [sessions, setSessions] = useState(() => [] as ReturnType<typeof loadSessions>)
  const [tasks, setTasks] = useState(() => [] as ReturnType<typeof loadTasks>)
  const [logFor, setLogFor] = useState<string | null>(null)
  const [newSubject, setNewSubject] = useState('')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setProfile(loadProfile())
    setEntries(readEntries())
    setSessions(loadSessions())
    setTasks(loadTasks())
    setReady(true)
    const f = () => { setEntries(readEntries()); setSessions(loadSessions()); setTasks(loadTasks()); setProfile(loadProfile()) }
    window.addEventListener('cognira-data', f)
    window.addEventListener('storage', f)
    return () => { window.removeEventListener('cognira-data', f); window.removeEventListener('storage', f) }
  }, [])

  const isPro = profile?.persona === 'professional'
  const baseList = useMemo(() => {
    const list = isPro ? (profile?.skills || []) : (profile?.subjects || [])
    const cleaned = list.map((s) => String(s).trim()).filter(Boolean)
    if (cleaned.length) return [...new Set(cleaned)]
    return isPro ? ['Communication', 'SQL', 'Design'] : ['Maths', 'Physics', 'Chemistry']
  }, [profile, isPro])

  const merged = useMemo(() => {
    const map = new Map<string, MasteryEntry>()
    entries.forEach((e) => map.set(e.subject.toLowerCase(), e))
    // ensure every onboarding subject/skill appears
    baseList.forEach((s) => {
      if (!map.has(s.toLowerCase())) {
        map.set(s.toLowerCase(), { id: uid(), subject: s, minutes: 0, confidence: 3, updatedAt: new Date().toISOString(), logs: [] })
      }
    })
    // include custom logged subjects not in onboarding list
    return [...map.values()]
  }, [entries, baseList])

  const stats = useMemo(() => {
    return merged.map((e) => {
      const focusMins = sessions
        .filter((s) => (s.subject || '').toLowerCase().includes(e.subject.toLowerCase()) || e.subject.toLowerCase().includes((s.subject || '').toLowerCase()))
        .reduce((a, s) => a + (s.durationSec || 0), 0) / 60
      const taskDone = tasks.filter((t) =>
        (t.category || '').toLowerCase() === e.subject.toLowerCase() ||
        t.title.toLowerCase().includes(e.subject.toLowerCase()),
      )
      const doneCount = taskDone.filter((t) => (t.completedDates || []).includes(dayKey())).length
      const totalMins = Math.round((e.minutes || 0) + focusMins)
      const needs = e.confidence <= 2 || (totalMins < 30 && e.confidence <= 3)
      return { entry: e, focusMins: Math.round(focusMins), taskCount: taskDone.length, doneToday: doneCount, totalMins, needs }
    })
  }, [merged, sessions, tasks])

  const sorted = useMemo(() => [...stats].sort((a, b) => a.entry.confidence - b.entry.confidence || a.totalMins - b.totalMins), [stats])
  const totalMinsAll = stats.reduce((a, s) => a + s.totalMins, 0)
  const avgConf = stats.length ? (stats.reduce((a, s) => a + s.entry.confidence, 0) / stats.length) : 0
  const needsCount = stats.filter((s) => s.needs).length
  const weakest = sorted[0]

  function persist(next: MasteryEntry[]) {
    setEntries(next)
    writeEntries(next)
  }

  function setConfidence(subject: string, v: number) {
    const key = subject.toLowerCase()
    const existing = merged.find((e) => e.subject.toLowerCase() === key)
    const base = existing ?? { id: uid(), subject, minutes: 0, confidence: 3, updatedAt: new Date().toISOString(), logs: [] }
    const next: MasteryEntry = { ...base, confidence: v, updatedAt: new Date().toISOString() }
    const others = entries.filter((e) => e.subject.toLowerCase() !== key)
    persist([...others, next])
  }

  function saveLog(subject: string, minutes: number, confidence: number) {
    const key = subject.toLowerCase()
    const existing = merged.find((e) => e.subject.toLowerCase() === key)
    const base = existing ?? { id: uid(), subject, minutes: 0, confidence: 3, updatedAt: new Date().toISOString(), logs: [] }
    const next: MasteryEntry = {
      ...base,
      minutes: (base.minutes || 0) + minutes,
      confidence,
      updatedAt: new Date().toISOString(),
      logs: [...(base.logs || []), { at: new Date().toISOString(), minutes }].slice(-60),
    }
    const others = entries.filter((e) => e.subject.toLowerCase() !== key)
    persist([...others, next])
    setLogFor(null)
  }

  function addSubject() {
    const s = newSubject.trim()
    if (!s) return
    if (merged.some((e) => e.subject.toLowerCase() === s.toLowerCase())) { setNewSubject(''); return }
    persist([...entries, { id: uid(), subject: s, minutes: 0, confidence: 3, updatedAt: new Date().toISOString(), logs: [] }])
    setNewSubject('')
  }

  const label = isPro ? 'SKILLS' : 'SUBJECTS'

  return (
    <Shell title="Mastery" coins={profile?.coins || 0}>
      <div className="kicker">{isPro ? 'Skills · professional' : 'Subjects · class tracking'}</div>
      <h1 className="font-display text-3xl leading-tight">MASTERY</h1>
      <p className="font-mono2 text-xs text-muted">
        {isPro ? 'Log time and confidence per skill. Lowest confidence + least time needs attention first.' : 'Log study time and confidence per subject. Your weakest subject floats to the top.'}
      </p>

      <div className="grid grid-cols-3 gap-2" role="status" aria-label="Mastery summary">
        {[
          [String(merged.length), label.toLowerCase()],
          [`${Math.round(totalMinsAll)}m`, 'tracked time'],
          [stats.length ? `${avgConf.toFixed(1)}/5` : '—', 'avg confidence'],
        ].map(([v, l]) => (
          <div key={l} className="brutal-card text-center">
            <div className="font-display text-2xl">{v}</div>
            <div className="font-mono2 text-[10px] uppercase">{l}</div>
          </div>
        ))}
      </div>

      {weakest && (
        <div className="brutal-card brutal-card-yellow" role="note" aria-label="Needs attention">
          <div className="flex items-center gap-2"><span className="tick">!</span><b>NEEDS ATTENTION</b></div>
          <p className="mt-1 text-sm font-bold">
            {weakest.entry.subject} — confidence {weakest.entry.confidence}/5 · {weakest.totalMins} min tracked.
            {' '}Give it one 25-min push today.
          </p>
          <button className="brutal-btn brutal-btn-white mt-2 min-h-[44px] rounded-[12px] px-4 py-2 text-xs font-bold uppercase" onClick={() => setLogFor(weakest.entry.subject)}>
            Log time for {weakest.entry.subject}
          </button>
        </div>
      )}

      <div className="flex flex-col gap-3" aria-live="polite">
        {!ready && <div className="brutal-card text-sm">Loading your subjects…</div>}
        {ready && sorted.map(({ entry, focusMins, taskCount, totalMins, needs }) => (
          <article key={entry.subject.toLowerCase()} className="brutal-card" aria-label={`${entry.subject} mastery`}>
            <div className="flex items-start gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-display text-lg leading-tight break-words">{entry.subject}</h2>
                  {needs && <span className="rounded-full border-2 border-ink bg-danger px-2 py-0.5 text-[10px] font-bold uppercase text-white" style={{ background: '#FF3D3D' }}>Needs work</span>}
                </div>
                <div className="font-mono2 mt-1 text-[11px] text-muted">
                  {totalMins} min total · {focusMins} min focus · {taskCount} tasks · {entry.logs.length} logs
                </div>
              </div>
              <button
                className="btn-ghost min-h-[44px] min-w-[44px]"
                onClick={() => setLogFor(entry.subject)}
                aria-label={`Log time for ${entry.subject}`}
              >
                + Log
              </button>
            </div>

            <div className="bar mt-2" role="progressbar" aria-valuenow={Math.min(100, totalMins)} aria-valuemin={0} aria-valuemax={100} aria-label={`${entry.subject} time`}>
              <i style={{ width: `${Math.min(100, Math.max(4, (totalMins / Math.max(60, totalMinsAll || 60)) * 100))}%` }} />
            </div>

            <div className="mt-3 flex items-center justify-between gap-2">
              <span className="font-mono2 text-[11px] font-bold uppercase">Confidence {entry.confidence}/5</span>
              <div className="flex gap-1" role="group" aria-label={`${entry.subject} confidence`}>
                {[1, 2, 3, 4, 5].map((v) => (
                  <button
                    key={v}
                    onClick={() => setConfidence(entry.subject, v)}
                    className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border-2 border-ink text-sm font-bold"
                    style={{ background: v <= entry.confidence ? '#0A1128' : '#fff', color: v <= entry.confidence ? '#fff' : '#0A1128' }}
                    aria-label={`Set ${entry.subject} confidence to ${v}`}
                    aria-pressed={entry.confidence === v}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="brutal-card">
        <b className="font-mono2 text-xs">ADD {isPro ? 'SKILL' : 'SUBJECT'}</b>
        <div className="mt-2 flex gap-2">
          <input
            className="in min-h-[44px] flex-1"
            value={newSubject}
            onChange={(e) => setNewSubject(e.target.value)}
            placeholder={isPro ? 'e.g. Public speaking' : 'e.g. Social Science'}
            aria-label={`New ${isPro ? 'skill' : 'subject'} name`}
            onKeyDown={(e) => { if (e.key === 'Enter') addSubject() }}
          />
          <button className="brutal-btn min-h-[44px] px-4 text-sm" onClick={addSubject}>Add</button>
        </div>
        <p className="font-mono2 mt-2 text-[11px] text-muted">From onboarding: {baseList.join(', ') || 'none yet'}</p>
      </div>

      <Link to="/focus" className="brutal-btn mt-1 block text-center">Start a focus session</Link>

      {logFor && (
        <LogSheet
          subject={logFor}
          initialConfidence={merged.find((e) => e.subject.toLowerCase() === logFor.toLowerCase())?.confidence ?? 3}
          close={() => setLogFor(null)}
          save={saveLog}
        />
      )}
    </Shell>
  )
}

function LogSheet({ subject, initialConfidence, close, save }: { subject: string; initialConfidence: number; close: () => void; save: (subject: string, minutes: number, confidence: number) => void }) {
  const [minutes, setMinutes] = useState('25')
  const [confidence, setConfidence] = useState(initialConfidence)
  const [err, setErr] = useState('')
  return (
    <div className="sheet-back" onClick={close}>
      <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={`Log time for ${subject}`}>
        <b>LOG TIME — {subject.toUpperCase()}</b>
        <label className="lbl">Minutes studied<input className="in" type="number" min={1} max={480} value={minutes} onChange={(e) => setMinutes(e.target.value)} aria-label="Minutes studied" /></label>
        <div className="lbl">Confidence after this session
          <div className="flex gap-1" role="group" aria-label="Confidence">
            {[1, 2, 3, 4, 5].map((v) => (
              <button key={v} onClick={() => setConfidence(v)} className={`chip ${confidence === v ? 'on' : ''}`} aria-pressed={confidence === v} aria-label={`Confidence ${v}`}>{v}</button>
            ))}
          </div>
        </div>
        <p className="font-mono2 text-[11px] text-muted">1 = lost · 3 = okay · 5 = could teach it. Time adds to this {subject} total.</p>
        {err && <div role="alert" className="text-sm font-bold">{err}</div>}
        <div className="flex gap-2">
          <button
            className="brutal-btn flex-1"
            onClick={() => {
              const m = Math.round(Number(minutes))
              if (!m || m < 1 || m > 480) { setErr('Enter minutes from 1 to 480.'); return }
              save(subject, m, confidence)
            }}
          >
            Save log
          </button>
          <button className="btn-ghost" onClick={close}>Cancel</button>
        </div>
      </div>
    </div>
  )
}
