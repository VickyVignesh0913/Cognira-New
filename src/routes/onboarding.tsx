import { useEffect, useMemo, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Logo } from '@/components/ui'
import { SUBJECTS, STUDENT_GOALS, BLOCKERS, SKILLS, PRO_GOALS, loadProfile, saveProfile, loadTasks, saveTasks, loadHabits, saveHabits, uid, dayKey, type Persona, type Profile } from '@/lib/cognira'
import { buildStarter } from '@/server/cognira'

export const Route = createFileRoute('/onboarding')({ component: Onb })

const empty: Profile = { name: '', persona: 'student', className: '', board: '', profession: '', subjects: [], skills: [], goals: [], blockers: [], level: '', wake: '06:30', sleep: '22:30', hours: '', coins: 0, xp: 0, onboarding_complete: false }

function Onb() {
  const nav = useNavigate()
  const [step, setStep] = useState(0)
  const [persona, setPersona] = useState<Persona>(() => {
    try { return (localStorage.getItem('cognira_persona_pick') as Persona) || (localStorage.getItem('cognira_demo_v1') === 'pro' ? 'professional' : 'student') } catch { return 'student' }
  })
  const [p, setP] = useState<Profile>(() => ({ ...empty, ...(loadProfile() || {}) }))
  const [custom, setCustom] = useState('')
  const [err, setErr] = useState('')

  useEffect(() => { setP((v) => ({ ...v, persona })) }, [persona])
  useEffect(() => { saveProfile(p) }, [p])

  const steps = useMemo(() => persona === 'student'
    ? ['Your name', 'Class + board', 'Subjects', 'Goals', 'Study level', 'Schedule', 'Challenge']
    : ['Your name', 'Profession', 'Goals', 'Schedule', 'Skills', 'Focus style', 'Blockers'], [persona])

  const set = (k: keyof Profile, v: any) => { setErr(''); setP((x) => ({ ...x, [k]: v })) }
  const toggle = (k: 'subjects' | 'skills' | 'goals' | 'blockers', v: string) =>
    setP((x) => ({ ...x, [k]: (x[k] as string[]).includes(v) ? (x[k] as string[]).filter((s) => s !== v) : [...(x[k] as string[]), v] }))

  function valid(): boolean {
    if (step === 0 && !p.name.trim()) return false
    if (persona === 'student') {
      if (step === 1 && (!p.className.trim() || !p.board)) return false
      if (step === 2 && p.subjects.length === 0) return false
      if (step === 3 && p.goals.length === 0) return false
      if (step === 4 && !p.level) return false
      if (step === 6 && p.blockers.length === 0) return false
    } else {
      if (step === 1 && !p.profession.trim()) return false
      if (step === 2 && p.goals.length === 0) return false
      if (step === 4 && p.skills.length === 0) return false
      if (step === 5 && !p.level) return false
      if (step === 6 && p.blockers.length === 0) return false
    }
    return true
  }

  const [phase, setPhase] = useState<'form' | 'ready' | 'done'>('form')
  const [ticks, setTicks] = useState(0)
  useEffect(() => {
    if (phase !== 'ready') return
    const t = setInterval(() => setTicks((x) => Math.min(3, x + 1)), 650)
    const d = setTimeout(() => setPhase('done'), 2300)
    return () => { clearInterval(t); clearTimeout(d) }
  }, [phase])

  async function finish() {
    const done = { ...p, onboarding_complete: true, coins: 20, xp: 50 }
    saveProfile(done)
    // Build an editable starter routine + habits locally so demo mode (no sign-in) lands populated.
    try {
      const tk = dayKey(new Date())
      if (loadTasks().length === 0) {
        const mk = (title: string, start: string, end: string, category: string) => ({ id: uid(), title, start, end, startTime: start, endTime: end, category, repeatDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], completedDates: [] as string[], date: tk })
        const starter = persona === 'student'
          ? [mk(`Revise ${p.subjects[0] || 'Maths'} — 25 min`, '18:00', '18:30', p.subjects[0] || 'Study'), mk(`Practice ${p.subjects[1] || 'Physics'} problems`, '19:00', '19:45', p.subjects[1] || 'Study'), mk('Evening revision + flashcards', '20:00', '20:25', 'Revision')]
          : [mk(`Deep work: ${p.skills[0] || 'top skill'} — 50 min`, '09:00', '09:50', 'Deep Work'), mk('Close 1 routine task', '11:00', '11:30', 'Work'), mk('Learn: 25 min skill practice', '20:00', '20:25', 'Learning')]
        saveTasks(starter)
      }
      if (loadHabits().length === 0) {
        saveHabits(persona === 'student'
          ? [{ id: uid(), title: 'Revise flashcards 20 min', icon: '📚', frequency: 'Daily', target: 1, completedDates: [] }, { id: uid(), title: 'Solve 10 practice problems', icon: '🎯', frequency: 'Daily', target: 10, completedDates: [] }]
          : [{ id: uid(), title: 'Plan top 3 priorities', icon: '🎯', frequency: 'Daily', target: 1, completedDates: [] }, { id: uid(), title: 'No-phone deep work 50 min', icon: '⚡', frequency: 'Daily', target: 1, completedDates: [] }])
      }
    } catch { /* storage full */ }
    try { await buildStarter({ data: { seed: 'starter' } }).catch(() => null) } catch {}
    setPhase('ready')
  }

  if (phase !== 'form') return (
    <div className="phone-wrap"><div className="phone flex min-h-[92vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <Logo size={72} />
      {phase === 'ready' ? (<>
        <div className="kicker">AI Coach is getting ready</div>
        <h1 className="font-display text-3xl">SETTING YOU UP…</h1>
        <div className="w-full max-w-[300px] text-left font-mono2 text-xs">
          {['Reading your goals', 'Building your routine', 'Planning your first week'].map((t, i) => (
            <div key={t} className="mb-2 flex items-center gap-2"><span className="tick">{ticks > i ? '✓' : '·'}</span> {t}</div>
          ))}
        </div>
        <div className="brutal-bar"><span style={{ width: `${(ticks / 3) * 100}%` }} /></div>
      </>) : (<>
        <div className="kicker">All set</div>
        <h1 className="font-display text-4xl">ALL SET, {p.name.split(' ')[0].toUpperCase()}!</h1>
        <div className="brutal-card w-full text-left">
          <div className="mb-2 font-display text-sm">YOUR 3-STEP PLAN</div>
          {(persona === 'student'
            ? [`Revise ${(p.subjects[0] || 'Maths')} for 25 min today`, `Finish 1 routine task before lunch`, `Log 1 focus session tonight`]
            : [`Deep-work block on ${(p.skills[0] || 'your top skill')} for 50 min`, `Close 1 routine task today`, `Keep your #1 habit alive`]
          ).map((t, i) => <div key={i} className="mb-1 font-mono2 text-xs">▸ {t}</div>)}
        </div>
        <button className="brutal-btn w-full" onClick={() => nav({ to: '/home' })}>Go to Dashboard</button>
      </>)}
    </div></div>
  )

  return (
    <div className="phone-wrap"><div className="phone flex min-h-[92vh] flex-col p-6">
      <div className="mb-1 flex items-center justify-between">
        <span className="font-mono2 text-xs">Step {step + 1} of 7</span>
        {step > 0 && <button className="btn-ghost" onClick={() => setStep(step - 1)}>Back</button>}
      </div>
      <div className="brutal-bar mb-4"><span style={{ width: `${((step + 1) / 7) * 100}%` }} /></div>
      <div className="seg mb-4"><button className={persona === 'student' ? 'on' : ''} onClick={() => setPersona('student')}>Student</button><button className={persona === 'professional' ? 'on' : ''} onClick={() => setPersona('professional')}>Professional</button></div>
      <h1 className="font-display text-2xl mb-4">{steps[step].toUpperCase()}</h1>

      <div className="flex flex-1 flex-col gap-3">
        {step === 0 && <label className="lbl">What should we call you?<input className="in" value={p.name} onChange={(e) => set('name', e.target.value)} placeholder={persona === 'student' ? 'Ibrahim' : 'Alex Johnson'} /></label>}
        {persona === 'student' && step === 1 && (<>
          <label className="lbl">Class<input className="in" value={p.className} onChange={(e) => set('className', e.target.value)} placeholder="Class 10" /></label>
          <div className="lbl">Board<div className="flex flex-wrap gap-2">{['CBSE', 'ICSE', 'State', 'IB', 'Other'].map((b) => <button key={b} className={`chip ${p.board === b ? 'on' : ''}`} onClick={() => set('board', b)}>{b}</button>)}</div></div>
        </>)}
        {persona === 'student' && step === 2 && (<>
          <div className="flex flex-wrap gap-2">{SUBJECTS.map((s) => <button key={s} className={`chip ${p.subjects.includes(s) ? 'on' : ''}`} onClick={() => toggle('subjects', s)}>{s}</button>)}</div>
          <div className="flex gap-2"><input className="in" value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Add custom subject" /><button className="brutal-btn" onClick={() => { if (custom.trim()) { toggle('subjects', custom.trim()); setCustom('') } }}>Add</button></div>
        </>)}
        {step === 3 && <div className="flex flex-wrap gap-2">{(persona === 'student' ? STUDENT_GOALS : PRO_GOALS).map((g) => <button key={g} className={`chip ${p.goals.includes(g) ? 'on' : ''}`} onClick={() => toggle('goals', g)}>{g}</button>)}</div>}
        {((persona === 'student' && step === 4) || (persona === 'professional' && step === 5)) && (
          <div className="flex flex-col gap-2">{(persona === 'student' ? ['Beginner', 'Intermediate', 'Pro'] : ['Pomodoro', 'Deep Work', 'Flexible']).map((l) => <button key={l} className={`brutal-card w-full text-left ${p.level === l ? 'brutal-pick' : ''}`} onClick={() => set('level', l)}>{l}</button>)}</div>
        )}
        {((persona === 'student' && step === 5) || (persona === 'professional' && step === 3)) && (<>
          <div className="grid grid-cols-2 gap-3">
            <label className="lbl">Wake<input className="in" type="time" value={p.wake} onChange={(e) => set('wake', e.target.value)} /></label>
            <label className="lbl">Sleep<input className="in" type="time" value={p.sleep} onChange={(e) => set('sleep', e.target.value)} /></label>
          </div>
          <label className="lbl">{persona === 'student' ? 'School hours' : 'Work hours'}<input className="in" value={p.hours} onChange={(e) => set('hours', e.target.value)} placeholder="e.g. 8:00 – 14:30" /></label>
        </>)}
        {persona === 'professional' && step === 1 && <label className="lbl">Profession<input className="in" value={p.profession} onChange={(e) => set('profession', e.target.value)} placeholder="Product manager" /></label>}
        {persona === 'professional' && step === 4 && (<>
          <div className="flex flex-wrap gap-2">{SKILLS.map((s) => <button key={s} className={`chip ${p.skills.includes(s) ? 'on' : ''}`} onClick={() => toggle('skills', s)}>{s}</button>)}</div>
          <div className="flex gap-2"><input className="in" value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Add custom skill" /><button className="brutal-btn" onClick={() => { if (custom.trim()) { toggle('skills', custom.trim()); setCustom('') } }}>Add</button></div>
        </>)}
        {((persona === 'student' && step === 6) || (persona === 'professional' && step === 6)) && (
          <div className="flex flex-col gap-2">{BLOCKERS.map((b) => <button key={b} className={`brutal-card w-full text-left ${p.blockers.includes(b) ? 'brutal-pick' : ''}`} onClick={() => toggle('blockers', b)}>{b}</button>)}</div>
        )}
        {err && <div role="alert" className="text-sm font-bold">{err}</div>}
      </div>

      <button className="brutal-btn mt-6 w-full" onClick={() => {
        if (!valid()) { setErr('Please complete this step to continue.'); return }
        if (step === 6) finish(); else setStep(step + 1)
      }}>{step === 6 ? 'Finish → Build my plan' : 'Continue'}</button>
    </div></div>
  )
}
