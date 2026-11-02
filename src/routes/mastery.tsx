import { useEffect, useMemo, useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Shell } from '@/components/ui'
import { useAction } from '@/lib/actions'
import { validateInput } from '@/lib/monstarx/validation'
import { z } from 'zod'
import { loadProfile, loadSessions, loadTasks, uid, dayKey, type Profile } from '@/lib/cognira'
import { getState, logMastery, setMasteryConfidence, deleteMastery } from '@/server/cognira'

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
const SUBJECT_SCHEMA = z.object({ subject: z.string().trim().min(1, 'Give it a name.').max(80, 'Keep it under 80 characters.') })
const LOG_SCHEMA = z.object({ minutes: z.number().int().min(1, 'Enter minutes from 1 to 480.').max(480, 'Enter minutes from 1 to 480.') })

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

type Stats = { entry: MasteryEntry; focusMins: number; taskCount: number; doneToday: number; totalMins: number; needs: boolean }

function Mastery() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [entries, setEntries] = useState<MasteryEntry[]>([])
  const [sessions, setSessions] = useState(() => [] as ReturnType<typeof loadSessions>)
  const [tasks, setTasks] = useState(() => [] as ReturnType<typeof loadTasks>)
  const [signedIn, setSignedIn] = useState(false)
  const [synced, setSynced] = useState(false)
  const [logFor, setLogFor] = useState<string | null>(null)
  const [newSubject, setNewSubject] = useState('')
  const [addError, setAddError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [deletedNote, setDeletedNote] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  const logAction = useAction(logMastery, {
    onSuccess: () => { void refreshServer() },
    onError: (m) => setActionError(m),
  })
  const confAction = useAction(setMasteryConfidence, {
    onSuccess: () => { void refreshServer() },
    onError: (m) => setActionError(m),
  })
  const delAction = useAction(deleteMastery, {
    onSuccess: () => { void refreshServer() },
    onError: (m) => setActionError(m),
  })

  async function refreshServer() {
    try {
      const st = await getState()
      if (st.signedIn) {
        setSignedIn(true)
        const m = ((st as { mastery?: MasteryEntry[] }).mastery || []).map((e) => ({
          id: String(e.id),
          subject: String(e.subject),
          minutes: Number(e.minutes) || 0,
          confidence: Math.min(5, Math.max(1, Number(e.confidence) || 3)),
          updatedAt: String(e.updatedAt || new Date().toISOString()),
          logs: Array.isArray(e.logs) ? e.logs : [],
        }))
        setEntries(m)
        writeEntries(m)
        if ((st as { profile?: Profile | null }).profile) setProfile((st as { profile?: Profile | null }).profile as Profile)
      }
    } catch { /* offline — stay on local data */ }
    setSynced(true)
  }

  useEffect(() => {
    setProfile(loadProfile())
    setEntries(readEntries())
    setSessions(loadSessions())
    setTasks(loadTasks())
    setReady(true)
    void refreshServer()
    const f = () => { setSessions(loadSessions()); setTasks(loadTasks()); setProfile(loadProfile()) }
    window.addEventListener('cognira-data', f)
    window.addEventListener('storage', f)
    return () => { window.removeEventListener('cognira-data', f); window.removeEventListener('storage', f) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    baseList.forEach((s) => {
      if (!map.has(s.toLowerCase())) {
        map.set(s.toLowerCase(), { id: uid(), subject: s, minutes: 0, confidence: 3, updatedAt: new Date().toISOString(), logs: [] })
      }
    })
    return [...map.values()]
  }, [entries, baseList])

  const stats: Stats[] = useMemo(() => {
    return merged.map((e) => {
      const focusMins = sessions
        .filter((s) => {
          const sub = (s.subject || '').toLowerCase()
          const key = e.subject.toLowerCase()
          return sub.includes(key) || key.includes(sub)
        })
        .reduce((a, s) => a + (s.durationSec || 0), 0) / 60
      const taskDone = tasks.filter((t) =>
        (t.category || '').toLowerCase() === e.subject.toLowerCase() ||
        t.title.toLowerCase().includes(e.subject.toLowerCase()),
      )
      const tk = dayKey()
      const doneToday = taskDone.filter((t) => (t.completedDates || []).includes(tk)).length
      const totalMins = Math.round((e.minutes || 0) + focusMins)
      const needs = e.confidence <= 2 || (totalMins < 30 && e.confidence <= 3)
      return { entry: e, focusMins: Math.round(focusMins), taskCount: taskDone.length, doneToday, totalMins, needs }
    })
  }, [merged, sessions, tasks])

  const sorted = useMemo(() => [...stats].sort((a, b) => a.entry.confidence - b.entry.confidence || a.totalMins - b.totalMins), [stats])
  const totalMinsAll = stats.reduce((a, s) => a + s.totalMins, 0)
  const avgConf = stats.length ? (stats.reduce((a, s) => a + s.entry.confidence, 0) / stats.length) : 0
  const needsCount = stats.filter((s) => s.needs).length
  const weakest = sorted[0]
  const busy = logAction.pending || confAction.pending || delAction.pending || !synced

  function persistLocal(next: MasteryEntry[]) {
    setEntries(next)
    writeEntries(next)
  }

  function handleConfidence(subject: string, v: number) {
    setActionError(null)
    const key = subject.toLowerCase()
    const existing = merged.find((e) => e.subject.toLowerCase() === key)
    const base = existing ?? { id: uid(), subject, minutes: 0, confidence: 3, updatedAt: new Date().toISOString(), logs: [] }
    const next: MasteryEntry = { ...base, confidence: v, updatedAt: new Date().toISOString() }
    persistLocal([...entries.filter((e) => e.subject.toLowerCase() !== key), next])
    if (signedIn) confAction.run({ data: { subject, confidence: v } })
  }

  function handleSaveLog(subject: string, minutes: number, confidence: number) {
    setActionError(null)
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
    persistLocal([...entries.filter((e) => e.subject.toLowerCase() !== key), next])
    if (signedIn) logAction.run({ data: { subject, minutes, confidence } })
    setLogFor(null)
  }

  function handleAdd() {
    setAddError(null)
    setActionError(null)
    const check = validateInput(SUBJECT_SCHEMA, { subject: newSubject })
    if (!check.ok) { setAddError(check.error.message); return }
    const s = newSubject.trim()
    if (merged.some((e) => e.subject.toLowerCase() === s.toLowerCase())) { setAddError('That one is already on your list.'); return }
    const entry: MasteryEntry = { id: uid(), subject: s, minutes: 0, confidence: 3, updatedAt: new Date().toISOString(), logs: [] }
    persistLocal([...entries, entry])
    if (signedIn) logAction.run({ data: { subject: s, minutes: 0, confidence: 3 } })
    setNewSubject('')
  }

  function handleDelete(subject: string) {
    setActionError(null)
    setDeletedNote(null)
    persistLocal(entries.filter((e) => e.subject.toLowerCase() !== subject.toLowerCase()))
    if (signedIn) {
      delAction.run({ data: { subject } })
    }
    setDeletedNote(`${subject} removed from your tracker.`)
    window.setTimeout(() => setDeletedNote(null), 4000)
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

      {needsCount > 0 && weakest && (
        <div className="brutal-card brutal-card-yellow" role="note" aria-label="Needs attention">
          <div className="flex items-center gap-2"><span className="tick">!</span><b>NEEDS ATTENTION{needsCount > 1 ? ` · ${needsCount}` : ''}</b></div>
          <p className="mt-1 text-sm font-bold">
            {weakest.entry.subject} — confidence {weakest.entry.confidence}/5 · {weakest.totalMins} min tracked.
            {' '}Give it one 25-min push today.
          </p>
          <button className="brutal-btn brutal-btn-white mt-2 min-h-[44px] rounded-[12px] px-4 py-2 text-xs font-bold uppercase" onClick={() => setLogFor(weakest.entry.subject)}>
            Log time for {weakest.entry.subject}
          </button>
        </div>
      )}

      {(actionError || logAction.error || confAction.error || delAction.error) && (
        <div role="alert" className="brutal-card text-sm font-bold" style={{ background: '#FFE9E9' }}>
          {actionError || logAction.error || confAction.error || delAction.error}
          <div className="font-mono2 mt-1 text-[11px] font-normal">Your entry is kept on this device — check your connection and it will sync when you are back online.</div>
        </div>
      )}
      {deletedNote && <div role="status" className="brutal-card text-sm font-bold">{deletedNote}</div>}
      {!signedIn && synced && (
        <div className="font-mono2 text-[11px] text-muted">Exploring demo — entries save on this device. <Link to="/login" className="underline">Sign in</Link> to sync them to your account.</div>
      )}

      <div className="flex flex-col gap-3" aria-live="polite">
        {!ready && <div className="brutal-card text-sm">Loading your subjects…</div>}
        {ready && sorted.map(({ entry, focusMins, taskCount, doneToday, totalMins, needs }) => (
          <article key={entry.subject.toLowerCase()} className="brutal-card" aria-label={`${entry.subject} mastery`}>
            <div className="flex items-start gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-display text-lg leading-tight break-words">{entry.subject}</h2>
                  {needs && <span className="rounded-full border-2 border-ink px-2 py-0.5 text-[10px] font-bold uppercase text-white" style={{ background: '#FF3D3D' }}>Needs work</span>}
                </div>
                <div className="font-mono2 mt-1 text-[11px] text-muted">
                  {totalMins} min total · {focusMins} min focus · {taskCount} tasks{doneToday > 0 ? ` · ${doneToday} done today` : ''} · {entry.logs.length} logs
                </div>
              </div>
              <div className="flex shrink-0 flex-col gap-1">
                <button
                  className="btn-ghost min-h-[44px] min-w-[44px]"
                  onClick={() => setLogFor(entry.subject)}
                  aria-label={`Log time for ${entry.subject}`}
                >
                  + Log
                </button>
                <button
                  className="btn-ghost min-h-[44px] min-w-[44px] text-xs"
                  onClick={() => { if (window.confirm(`Remove ${entry.subject} from your tracker? Logged minutes stay in Focus history.`)) handleDelete(entry.subject) }}
                  aria-label={`Remove ${entry.subject}`}
                >
                  Remove
                </button>
              </div>
            </div>

            <div className="bar mt-2" role="progressbar" aria-valuenow={Math.min(100, totalMins)} aria-valuemin={0} aria-valuemax={100} aria-label={`${entry.subject} time`}>
              <i style={{ width: `${Math.min(100, Math.max(4, (totalMins / Math.max(60, totalMinsAll || 60)) * 100))}%` }} />
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <span className="font-mono2 text-[11px] font-bold uppercase">Confidence {entry.confidence}/5</span>
              <div className="flex gap-1" role="group" aria-label={`${entry.subject} confidence`}>
                {[1, 2, 3, 4, 5].map((v) => (
                  <button
                    key={v}
                    onClick={() => handleConfidence(entry.subject, v)}
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

            {entry.logs.length > 0 && (
              <div className="mt-2">
                <button
                  className="font-mono2 text-[11px] font-bold uppercase underline"
                  onClick={() => setExpanded(expanded === entry.subject.toLowerCase() ? null : entry.subject.toLowerCase())}
                  aria-expanded={expanded === entry.subject.toLowerCase()}
                >
                  {expanded === entry.subject.toLowerCase() ? 'Hide history' : `History · last ${Math.min(5, entry.logs.length)} logs`}
                </button>
                {expanded === entry.subject.toLowerCase() && (
                  <ul className="mt-1 flex flex-col gap-1">
                    {[...entry.logs].slice(-5).reverse().map((l, i) => (
                      <li key={`${l.at}-${i}`} className="font-mono2 flex justify-between text-[11px]">
                        <span>{new Date(l.at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · {new Date(l.at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</span>
                        <span>+{l.minutes} min</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            {busy && <span className="sr-only">Saving…</span>}
          </article>
        ))}
      </div>

      <div className="brutal-card">
        <b className="font-mono2 text-xs">ADD {isPro ? 'SKILL' : 'SUBJECT'}</b>
        <fieldset disabled={!ready} className="mt-2 flex gap-2">
          <input
            className="in min-h-[44px] flex-1"
            value={newSubject}
            onChange={(e) => { setNewSubject(e.target.value); setAddError(null) }}
            placeholder={isPro ? 'e.g. Public speaking' : 'e.g. Social Science'}
            aria-label={`New ${isPro ? 'skill' : 'subject'} name`}
            aria-invalid={addError ? true : undefined}
            aria-describedby={addError ? 'mastery-add-error' : undefined}
            maxLength={80}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAdd() } }}
          />
          <button className="brutal-btn min-h-[44px] px-4 text-sm" onClick={handleAdd}>{logAction.pending ? 'Adding…' : 'Add'}</button>
        </fieldset>
        {addError && <div id="mastery-add-error" role="alert" className="mt-1 text-sm font-bold">{addError}</div>}
        <p className="font-mono2 mt-2 text-[11px] text-muted">From onboarding: {baseList.join(', ') || 'none yet'}</p>
      </div>

      <Link to="/focus" className="brutal-btn mt-1 block text-center">Start a focus session</Link>
      <Link to="/home" className="btn-ghost mt-1 block text-center">Back to Home</Link>

      {logFor && (
        <LogSheet
          subject={logFor}
          initialConfidence={merged.find((e) => e.subject.toLowerCase() === logFor.toLowerCase())?.confidence ?? 3}
          close={() => setLogFor(null)}
          save={handleSaveLog}
          pending={logAction.pending}
          ready={logAction.ready}
        />
      )}
    </Shell>
  )
}

function LogSheet({ subject, initialConfidence, close, save, pending, ready }: { subject: string; initialConfidence: number; close: () => void; save: (subject: string, minutes: number, confidence: number) => void; pending: boolean; ready: boolean }) {
  const [minutes, setMinutes] = useState('25')
  const [confidence, setConfidence] = useState(initialConfidence)
  const [err, setErr] = useState('')
  return (
    <div className="sheet-back" onClick={close}>
      <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={`Log time for ${subject}`}>
        <b>LOG TIME — {subject.toUpperCase()}</b>
        <fieldset disabled={!ready} className="mt-2 flex flex-col gap-3">
          <label className="lbl">Minutes studied
            <input className="in" type="number" min={1} max={480} value={minutes} onChange={(e) => { setMinutes(e.target.value); setErr('') }} aria-label="Minutes studied" aria-invalid={err ? true : undefined} />
          </label>
          <div className="lbl">Confidence after this session
            <div className="flex gap-1" role="group" aria-label="Confidence">
              {[1, 2, 3, 4, 5].map((v) => (
                <button key={v} onClick={() => setConfidence(v)} className={`chip ${confidence === v ? 'on' : ''}`} aria-pressed={confidence === v} aria-label={`Confidence ${v}`}>{v}</button>
              ))}
            </div>
          </div>
        </fieldset>
        <p className="font-mono2 text-[11px] text-muted">1 = lost · 3 = okay · 5 = could teach it. Time adds to this {subject} total.</p>
        {err && <div role="alert" className="text-sm font-bold">{err}</div>}
        <div className="flex gap-2">
          <button
            className="brutal-btn flex-1"
            onClick={() => {
              const check = validateInput(LOG_SCHEMA, { minutes: Math.round(Number(minutes)) })
              if (!check.ok) { setErr(check.error.message); return }
              const m = Math.round(Number(minutes))
              if (!m || m < 1 || m > 480) { setErr('Enter minutes from 1 to 480.'); return }
              save(subject, m, confidence)
            }}
          >
            {pending ? 'Saving…' : 'Save log'}
          </button>
          <button className="btn-ghost" onClick={close}>Cancel</button>
        </div>
      </div>
    </div>
  )
}
