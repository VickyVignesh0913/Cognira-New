import { useEffect, useRef, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Shell } from '@/components/ui'
import { loadProfile, loadSessions, saveProfile, saveSessions, dayKey, type FocusSession, addToSyncQueue, clearSyncedSessions, countPendingSessions } from '@/lib/cognira'
import { saveFocusSession, logSessionStudyTime } from '@/server/cognira'

// Generate stable UUID for session - used for idempotency
function createSessionId(): string {
  try {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return (crypto as { randomUUID: () => string }).randomUUID()
    }
  } catch { /* fallback */ }
  return `sess-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

// Server response type
type SessionResult = {
  ok: boolean
  id: string
  focusLogged: boolean
  masteryUpdated: boolean
  subject?: string
  masterySubject?: string
  minutesAdded: string | null
}

export const Route = createFileRoute('/focus')({ component: F })

// Magnetic Pendulum Timer Constants
const PRESETS = [{ n: 'Pomodoro', f: 25, b: 5 }, { n: 'Deep Work', f: 50, b: 10 }]
const R = 84, C = 2 * Math.PI * R
const TOTAL_SEGMENTS = 7
const SWINGS_PER_SEGMENT = 12
const TOTAL_SWINGS = TOTAL_SEGMENTS * SWINGS_PER_SEGMENT // 84 swings for 25 minutes
const SWING_PERIOD = 800 // milliseconds per half-swing (45 degrees each way)

function F() {
  const [mode, setMode] = useState<'Focus' | 'Break'>('Focus')
  const [preset, setPreset] = useState(0)
  const [custom, setCustom] = useState('15')
  const [useCustom, setUseCustom] = useState(false)
  const mins = useCustom ? Math.max(1, Math.min(120, Number(custom) || 15)) : mode === 'Focus' ? PRESETS[preset].f : PRESETS[preset].b
  const total = mins * 60
  const [left, setLeft] = useState(total)
  const [running, setRunning] = useState(false)
  const endRef = useRef(0)
  const swingTimeRef = useRef(0) // Track total swing time for animation
  const [sessions, setSessions] = useState<FocusSession[]>([])
  const [done, setDone] = useState(false)
  const [sessionResult, setSessionResult] = useState<SessionResult | null>(null)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [ambient, setAmbient] = useState('Off')
  const [subject, setSubject] = useState('')
  const [subjects, setSubjects] = useState<string[]>([])
  const pendingCount = countPendingSessions()
  useEffect(() => { if (!running) setLeft(total) }, [total, mode, preset, useCustom])
  useEffect(() => {
    setSessions(loadSessions())
    try {
      const pr = loadProfile()
      if (pr) {
        setAmbient(pr.ambient || 'Off')
        setSubjects((pr.persona === 'professional' ? pr.skills : pr.subjects) || [])
      }
    } catch {}
  }, [])
  useEffect(() => {
    if (!running) return
    endRef.current = Date.now() + left * 1000
    const id = setInterval(() => {
      const l = Math.max(0, Math.round((endRef.current - Date.now()) / 1000))
      setLeft(l)
      if (l <= 0) { clearInterval(id); finish() }
    }, 500)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running])

  async function finish() {
    setRunning(false)
    if (mode === 'Focus') {
      const sessionId = createSessionId()
      const s: FocusSession = {
        id: sessionId,
        startedAt: new Date().toISOString(),
        durationSec: total,
        mode: useCustom ? 'Custom' : PRESETS[preset].n,
        completed: true,
        subject: subject || undefined
      }
      const next = [...sessions, s]; setSessions(next); saveSessions(next)

      // Update local profile
      try { const pr = loadProfile(); if (pr) saveProfile({ ...pr, coins: (pr.coins || 0) + 10 }) } catch {}

      // Sync to server with stable ID (transaction handles mastery accumulation)
      try {
        const result = await saveFocusSession({
          data: {
            id: sessionId,
            startedAt: s.startedAt,
            durationSec: s.durationSec,
            mode: s.mode,
            subject: s.subject
          }
        })
        if (result?.ok) {
          setSessionResult(result as SessionResult)
          setDone(true)
          setSyncError(null)
          clearSyncedSessions()
        } else {
          // Server returned error, queue for retry
          addToSyncQueue({
            id: sessionId,
            type: 'focus-session',
            data: {
              startedAt: s.startedAt,
              durationSec: s.durationSec,
              mode: s.mode as 'Focus' | 'Break',
              subject: s.subject
            }
          })
          setSyncError('Session saved locally, will sync when back online.')
        }
      } catch (e) {
        // Network error or other failure, queue for retry
        addToSyncQueue({
          id: sessionId,
          type: 'focus-session',
          data: {
            startedAt: s.startedAt,
            durationSec: s.durationSec,
            mode: s.mode as 'Focus' | 'Break',
            subject: s.subject
          }
        })
        setSyncError('Session saved locally, will sync when back online.')
      }
    }
  }

  // Magnetic Pendulum Animation calculations
  const mm = String(Math.floor(left / 60)).padStart(2, '0'), ss = String(left % 60).padStart(2, '0')
  const prog = 1 - left / total

  // Calculate completed field lines (magnetic accumulator)
  const totalMinutes = mins * 60
  const secondsElapsed = totalMinutes - left
  const swingsElapsed = Math.floor(secondsElapsed * 1000 / SWING_PERIOD)
  const completedLines = Math.min(TOTAL_SEGMENTS, Math.floor(swingsElapsed / SWINGS_PER_SEGMENT))
  const currentLineProgress = (swingsElapsed % SWINGS_PER_SEGMENT) / SWINGS_PER_SEGMENT

  // Pendulum swing angle (sine wave oscillation)
  const swingAngle = Math.sin(secondsElapsed / 1000) * 45 // ±45 degrees
  const currentLineWidth = 16 - (completedLines / TOTAL_SEGMENTS) * 14

  const today = sessions.filter((s) => dayKey(s.startedAt) === dayKey(new Date()))

  // Reduced motion check
  const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  return (
    <Shell title="Focus">
      <h1 className="font-display text-3xl">FOCUS</h1>
      <div className="seg"><button className={mode === 'Focus' ? 'on' : ''} onClick={() => { setMode('Focus'); setRunning(false) }}>Focus</button><button className={mode === 'Break' ? 'on' : ''} onClick={() => { setMode('Break'); setRunning(false) }}>Break</button></div>
      <div className="flex gap-2">{PRESETS.map((p, i) => <button key={p.n} className={`chip ${!useCustom && preset === i ? 'on' : ''}`} onClick={() => { setPreset(i); setUseCustom(false); setRunning(false) }}>{p.n} {p.f}/{p.b}</button>)}
        <button className={`chip ${useCustom ? 'on' : ''}`} onClick={() => { setUseCustom(true); setRunning(false) }}>Custom</button></div>
      {useCustom && <label className="lbl">Custom minutes<input className="in" type="number" min={1} max={120} value={custom} onChange={(e) => setCustom(e.target.value)} /></label>}
      {subjects.length > 0 && <label className="lbl">Subject<select className="in" value={subject} disabled={running} onChange={(e) => setSubject(e.target.value)}><option value="">No subject</option>{subjects.map((s) => <option key={s} value={s}>{s}</option>)}</select></label>}
      <div className="brutal-card items-center text-center">
        {/* Magnetic Pendulum Timer SVG */}
        <svg viewBox="0 0 200 200" className="mx-auto w-52" role="img" aria-label={`Focus timer, ${mm}:${ss} remaining of ${mins} minutes`}>
          <title>Focus Session Timer</title>
          <desc>Magnetic pendulum timer showing time as accumulated field lines. The pendulum swings with growing radial magnetic field lines around the perimeter.</desc>

          {/* Background circle - field lines container */}
          <circle cx="100" cy="100" r={R} fill="none" stroke="var(--color-soft)" strokeWidth="16" />

          {/* Magnetic field lines accumulator - 7 radial lines */}
          {Array.from({ length: TOTAL_SEGMENTS }).map((_, i) => {
            const isCompleted = i < completedLines
            const isCurrent = i === completedLines
            const lineProgress = isCurrent ? currentLineProgress : 0

            // Calculate line angle (evenly distributed around circle)
            const endAngle = -90 + (i / TOTAL_SEGMENTS) * 360
            const lineLength = C
            const dashOffset = prefersReducedMotion ? 0 : lineLength * (1 - lineProgress)
            const dashArray = lineLength

            return (
              <line
                key={i}
                x1="100"
                y1="100"
                x2={100 + (R - 8) * Math.cos(endAngle * Math.PI / 180)}
                y2={100 + (R - 8) * Math.sin(endAngle * Math.PI / 180)}
                stroke="var(--color-primary)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={dashArray.toFixed(1)}
                strokeDashoffset={dashOffset.toFixed(1)}
                style={{
                  filter: isCompleted && completedLines > 0 ? 'drop-shadow(0 0 2px var(--color-primary))' : 'none',
                  opacity: isCompleted ? 0.9 : (isCurrent ? 0.6 : 0.1)
                }}
              />
            )
          })}

          {/* Pendulum - swinging on a pivot */}
          <g transform={prefersReducedMotion ? '' : `rotate(${swingAngle} 100 100)`}>
            {/* Pendulum rod */}
            <line x1="100" y1="50" x2="100" y2="90" stroke="var(--color-ink)" strokeWidth="2" />
            {/* Pendulum bob */}
            <circle cx="100" cy="90" r="7" fill="var(--color-ink)" />
          </g>

          {/* Current line being drawn */}
          {completedLines < TOTAL_SEGMENTS && (
            <line
              x1="100"
              y1="100"
              x2={100 + (R - 8) * Math.cos((-90 + (completedLines / TOTAL_SEGMENTS) * 360) * Math.PI / 180)}
              y2={100 + (R - 8) * Math.sin((-90 + (completedLines / TOTAL_SEGMENTS) * 360) * Math.PI / 180)}
              stroke="var(--color-primary)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={C.toFixed(1)}
              strokeDashoffset={(C * (1 - currentLineProgress)).toFixed(1)}
              style={{
                filter: 'drop-shadow(0 0 4px var(--color-primary))',
                opacity: 0.8
              }}
            />
          )}

          {/* Time display */}
          <text x="100" y="96" textAnchor="middle" fontSize="34" fontWeight="900" fill="var(--color-ink)" fontFamily="Archivo Black, Arial, sans-serif">{mm}:{ss}</text>
          <text x="100" y="122" textAnchor="middle" fontSize="11" fill="var(--color-soft)" fontFamily="Space Mono">{mode} · {useCustom ? 'Custom' : PRESETS[preset].n}</text>
        </svg>

        <div className="mt-2 flex gap-2">
          {!running ? <button className="brutal-btn flex-1" onClick={() => { if (left <= 0) setLeft(total); setDone(false); setRunning(true) }}>Start</button> : <button className="brutal-btn flex-1" onClick={() => setRunning(false)}>Pause</button>}
          <button className="btn-ghost" onClick={() => { setRunning(false); setLeft(total) }}>Reset</button>
        </div>
        {done && sessionResult?.ok && (
          <div className="mt-2 border-2 border-ink bg-accent p-2 font-bold text-on-accent" role="status">
            🎉 Session saved! +10 coins{sessionResult.masteryUpdated && sessionResult.masterySubject ? ` • ${sessionResult.minutesAdded || '+25'}m to ${sessionResult.masterySubject} mastery` : ''}. Nice work.
          </div>
        )}
        {syncError && (
          <div className="mt-2 border-2 border-ink bg-accent p-2 font-bold text-on-accent" role="status">
            ⚠️ {syncError}
          </div>
        )}
      </div>
      <div className="brutal-card"><b>TODAY'S SESSIONS</b>{today.length === 0 ? <div className="mt-1 font-mono2 text-xs">No sessions yet — start your first one above.</div> : <div className="mt-1 flex flex-col gap-1">{today.map((s) => <div key={s.id} className="flex items-center justify-between gap-2 border-t-2 border-ink pt-1 font-mono2 text-xs first:border-t-0 first:pt-0"><span>{new Date(s.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span><span>{s.mode} · {Math.round(s.durationSec / 60)} min</span><span className="tick">✓</span></div>)}</div>}</div>
      {([['Focus Mode', ['Silent', 'Phone away', 'Do not disturb']], ['Ambient Sound', ['Off', 'Rain', 'Forest', 'Café']], ['Background Music', ['Off', 'Lo-fi', 'Classical']]] as const).map(([label, opts]) => (
        <div key={label} className="brutal-card"><b className="font-mono2 text-xs">{label.toUpperCase()}</b><div className="mt-1 flex flex-wrap gap-2">{opts.map((o) => <button key={o} className={`chip ${label === 'Ambient Sound' && ambient === o ? 'on' : ''}`} onClick={() => { if (label === 'Ambient Sound') { setAmbient(o); try { const p = loadProfile(); if (p) saveProfile({ ...p, ambient: o }) } catch { /* keep timer running */ } } }}>{o}</button>)}</div></div>
      ))}
    </Shell>
  )
}
