import { useEffect, useRef, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Shell } from '@/components/ui'
import { loadProfile, loadSessions, saveProfile, saveSessions, dayKey, uid, type FocusSession } from '@/lib/cognira'
import { saveFocusSession } from '@/server/cognira'

export const Route = createFileRoute('/focus')({ component: F })

const PRESETS = [{ n: 'Pomodoro', f: 25, b: 5 }, { n: 'Deep Work', f: 50, b: 10 }]
const R = 84, C = 2 * Math.PI * R

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
  const [sessions, setSessions] = useState<FocusSession[]>([])
  const [done, setDone] = useState(false)
  const [ambient, setAmbient] = useState('Off')
  useEffect(() => { if (!running) setLeft(total) }, [total, mode, preset, useCustom])
  useEffect(() => {
    setSessions(loadSessions())
    try { const pr = loadProfile(); if (pr) setAmbient(pr.ambient || 'Off') } catch {}
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

  function finish() {
    setRunning(false); setDone(true)
    if (mode === 'Focus') {
      const s: FocusSession = { id: uid(), startedAt: new Date().toISOString(), durationSec: total, mode: useCustom ? 'Custom' : PRESETS[preset].n, completed: true }
      const next = [...sessions, s]; setSessions(next); saveSessions(next)
      try { const pr = loadProfile(); if (pr) saveProfile({ ...pr, coins: (pr.coins || 0) + 10 }) } catch {}
      try { saveFocusSession({ data: { startedAt: s.startedAt, durationSec: s.durationSec, mode: s.mode } }).catch(() => null) } catch {}
    }
  }
  const mm = String(Math.floor(left / 60)).padStart(2, '0'), ss = String(left % 60).padStart(2, '0')
  const prog = 1 - left / total
  const today = sessions.filter((s) => dayKey(s.startedAt) === dayKey(new Date()))

  return (
    <Shell title="Focus">
      <h1 className="font-display text-3xl">FOCUS</h1>
      <div className="seg"><button className={mode === 'Focus' ? 'on' : ''} onClick={() => { setMode('Focus'); setRunning(false) }}>Focus</button><button className={mode === 'Break' ? 'on' : ''} onClick={() => { setMode('Break'); setRunning(false) }}>Break</button></div>
      <div className="flex gap-2">{PRESETS.map((p, i) => <button key={p.n} className={`chip ${!useCustom && preset === i ? 'on' : ''}`} onClick={() => { setPreset(i); setUseCustom(false); setRunning(false) }}>{p.n} {p.f}/{p.b}</button>)}
        <button className={`chip ${useCustom ? 'on' : ''}`} onClick={() => { setUseCustom(true); setRunning(false) }}>Custom</button></div>
      {useCustom && <label className="lbl">Custom minutes<input className="in" type="number" min={1} max={120} value={custom} onChange={(e) => setCustom(e.target.value)} /></label>}
      <div className="brutal-card items-center text-center">
        <svg viewBox="0 0 200 200" className="mx-auto w-52" role="timer" aria-label={`${mm}:${ss} remaining`}>
          <circle cx="100" cy="100" r={R} fill="none" stroke="#EAF0FA" strokeWidth="16" />
          <circle cx="100" cy="100" r={R} fill="none" stroke="#0A1128" strokeWidth="16" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - prog)} transform="rotate(-90 100 100)" />
          <text x="100" y="96" textAnchor="middle" fontSize="34" fontWeight="900" fill="#0A1128" fontFamily="Archivo Black">{mm}:{ss}</text>
          <text x="100" y="122" textAnchor="middle" fontSize="11" fill="#6C7A9C" fontFamily="Space Mono">{mode} · {useCustom ? 'Custom' : PRESETS[preset].n}</text>
        </svg>
        <div className="mt-2 flex justify-center gap-2">
          {!running ? <button className="brutal-btn" onClick={() => { if (left <= 0) setLeft(total); setDone(false); setRunning(true) }}>Start {mode} Session</button> : <button className="brutal-btn" onClick={() => setRunning(false)}>Pause</button>}
          <button className="btn-ghost" onClick={() => { setRunning(false); setLeft(total) }}>Reset</button>
        </div>
        {done && <div className="mt-2 border-2 border-ink bg-[#FF9F1C] p-2 font-bold" role="status">🎉 Session saved! +10 coins. Nice work.</div>}
      </div>
      <div className="brutal-card"><b>TODAY'S SESSIONS</b>{today.length === 0 ? <div className="mt-1 font-mono2 text-xs">No sessions yet — start your first one above.</div> : <div className="mt-1 flex flex-col gap-1">{today.map((s) => <div key={s.id} className="flex items-center justify-between gap-2 border-t-2 border-ink pt-1 font-mono2 text-xs first:border-t-0 first:pt-0"><span>{new Date(s.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span><span>{s.mode} · {Math.round(s.durationSec / 60)} min</span><span className="tick">✓</span></div>)}</div>}</div>
      {([['Focus Mode', ['Silent', 'Phone away', 'Do not disturb']], ['Ambient Sound', ['Off', 'Rain', 'Forest', 'Café']], ['Background Music', ['Off', 'Lo-fi', 'Classical']]] as const).map(([label, opts]) => (
        <div key={label} className="brutal-card"><b className="font-mono2 text-xs">{label.toUpperCase()}</b><div className="mt-1 flex flex-wrap gap-2">{opts.map((o) => <button key={o} className={`chip ${label === 'Ambient Sound' && ambient === o ? 'on' : ''}`} onClick={() => { if (label === 'Ambient Sound') { setAmbient(o); try { const p = loadProfile(); if (p) saveProfile({ ...p, ambient: o }) } catch { /* keep timer running */ } } }}>{o}</button>)}</div></div>
      ))}
    </Shell>
  )
}
