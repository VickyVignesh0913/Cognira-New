import { useEffect, useRef, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Shell } from '@/components/ui'
import { clearAll, DEFAULT_PREFS, loadPrefs, loadProfile, savePrefs, type Prefs } from '@/lib/cognira'

export const Route = createFileRoute('/settings')({ component: S })

const THEMES = ['Adaptive', 'Sky Blue', 'Calm', 'Focus', 'Minimal'] as const
const MOTIONS = ['Full', 'Balanced', 'Minimal', 'Reduced'] as const
const ENVS = ['Calm', 'Deep Focus', 'Energetic', 'Zen'] as const

function S() {
  const nav = useNavigate()
  const profile = loadProfile()
  const [p, setP] = useState<Prefs>(DEFAULT_PREFS)
  const current = useRef(p)
  current.current = p
  // Load after mount so the server HTML and the first client render agree (localStorage is client-only).
  useEffect(() => { setP(loadPrefs()) }, [])
  useEffect(() => {
    const root = document.documentElement
    root.classList.remove('theme-calm', 'theme-focus', 'theme-minimal', 'theme-sky')
    const t = p.theme.toLowerCase()
    root.classList.add(t.includes('calm') ? 'theme-calm' : t.includes('focus') ? 'theme-focus' : t.includes('minimal') ? 'theme-minimal' : 'theme-sky')
    document.body.classList.toggle('motion-minimal', p.motion.toLowerCase() === 'minimal' || p.motion.toLowerCase() === 'reduced')
    document.body.dataset.env = p.env
  }, [p.theme, p.motion, p.env])
  function set(patch: Partial<Prefs>) {
    const n = { ...current.current, ...patch }
    current.current = n
    setP(n)
    savePrefs(n)
  }

  return (
    <Shell title="Settings">
      <h1 className="font-display text-3xl">SETTINGS</h1>
      <div className="brutal-card"><b>ACCOUNT</b><div className="mt-1 text-sm">{profile ? `${profile.name} · ${profile.persona}` : 'Exploring demo'}</div><div className="font-mono2 text-[11px]">Cognira v1.0.0</div>
        <div className="mt-2 flex gap-2"><button className="chip" onClick={() => nav({ to: '/onboarding' })}>Edit profile</button><button className="chip" onClick={() => { if (confirm('Delete all Cognira data on this device? This cannot be undone.')) { clearAll(); nav({ to: '/' }) } }}>Delete data</button></div>
      </div>
      <div className="brutal-card"><b>APPEARANCE & ATMOSPHERE</b><div className="mt-2 flex flex-wrap gap-2">{THEMES.map((t) => <button key={t} className={`chip ${p.theme === t ? 'on' : ''}`} onClick={() => set({ theme: t })}>{t}</button>)}</div><p className="mt-1 font-mono2 text-[11px]">Theme changes the whole app instantly.</p></div>
      <div className="brutal-card"><b>MOTION</b><div className="mt-2 flex flex-wrap gap-2">{MOTIONS.map((t) => <button key={t} className={`chip ${p.motion === t ? 'on' : ''}`} onClick={() => set({ motion: t })}>{t}</button>)}</div></div>
      <div className="brutal-card"><b>FOCUS ENVIRONMENT</b><div className="mt-2 flex flex-wrap gap-2">{ENVS.map((t) => <button key={t} className={`chip ${p.env === t ? 'on' : ''}`} onClick={() => set({ env: t })}>{t}</button>)}</div><p className="mt-1 font-mono2 text-[11px]">Sets the default timer length + sound on Focus.</p></div>
      <div className="brutal-card"><b>DASHBOARD WIDGETS</b>
        {[['stats', 'Stat cards'], ['plan', "Today's Plan"], ['weekly', 'Weekly progress'], ['coachTip', 'Coach tip']].map(([k, l]) => <label key={k} className="flex items-center justify-between border-t-2 border-ink py-1 text-sm"><span>{l}</span><input type="checkbox" checked={(p.widgets as any)[k] !== false} onChange={(e) => set({ widgets: { ...p.widgets, [k]: e.target.checked } })} aria-label={l} /></label>)}
      </div>
      <div className="brutal-card"><b>SOUNDS & AI</b>
        <label className="flex items-center justify-between py-1 text-sm"><span>Focus chime</span><input type="checkbox" checked={p.sound} onChange={(e) => set({ sound: e.target.checked })} aria-label="Focus chime" /></label>
        <label className="flex items-center justify-between py-1 text-sm"><span>AI suggestions on Home</span><input type="checkbox" checked={p.ai} onChange={(e) => set({ ai: e.target.checked })} aria-label="AI suggestions" /></label>
        <div className="lbl">Ambient choice<div className="flex gap-2">{['Rain', 'Silence', 'Lo-fi'].map((a) => <button key={a} className={`chip ${p.ambient === a ? 'on' : ''}`} onClick={() => set({ ambient: a })}>{a}</button>)}</div></div>
      </div>
      <button className="brutal-btn" onClick={() => nav({ to: '/home' })}>Back to Home</button>
    </Shell>
  )
}
