import { useEffect, useRef, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Shell } from '@/components/ui'
import { loadCoach, loadFocusSessions, loadHabits, loadProfile, loadTasks, saveCoach, type CoachMsg } from '@/lib/cognira'
import { useAction } from '@/lib/actions'
import { coachReply } from '@/server/cognira'

export const Route = createFileRoute('/coach')({ component: C })

const CHIPS = ['Plan my evening', "I'm behind on Maths", 'I keep losing focus']

function tipFor(profile: ReturnType<typeof loadProfile>): string {
  if (!profile) return 'Tell me your goal and I will turn it into one small next step.'
  const goals = profile.goals?.[0]
  return `Hi ${profile.name}! ${goals ? `Let's move "${goals}" forward today with one 25-minute push.` : 'Pick one win for today and I will plan it with you.'}`
}

function C() {
  const [msgs, setMsgs] = useState<CoachMsg[]>(loadCoach)
  const [draft, setDraft] = useState('')
  const [typing, setTyping] = useState(false)
  const bottom = useRef<HTMLDivElement>(null)
  useEffect(() => { bottom.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs, typing])
  const profile = loadProfile()

  const send = useAction(async (text: string, next: CoachMsg[]) => {
    try {
      const r = await coachReply({ data: { message: text, context: { profile, tasks: loadTasks().slice(0, 8), habits: loadHabits().slice(0, 8), sessions: loadFocusSessions().slice(-7) } } })
      const reply: CoachMsg = { role: 'coach', content: String((r as any)?.reply || (r as any)?.text || 'Got it — start with 25 focused minutes, then tell me how it went.'), at: new Date().toISOString() }
      const fin = [...next, reply]; setMsgs(fin); saveCoach(fin)
    } catch {
      const content = profile ? tipFor(profile) : 'Got it — start with one 25-minute focus block on the first thing you named, then mark it done and tell me how it went.'
      const fin = [...next, { role: 'coach' as const, content, at: new Date().toISOString() }]; setMsgs(fin); saveCoach(fin)
    } finally { setTyping(false) }
    return null
  }, { refresh: false })

  // Render the sent message now; the server reply can take a while (AI generation).
  function submit(text: string) {
    const t = text.trim()
    if (!t || send.pending) return
    const mine: CoachMsg = { role: 'user', content: t, at: new Date().toISOString() }
    const next = [...msgs, mine]
    setMsgs(next); saveCoach(next); setDraft(''); setTyping(true)
    send.run(t, next)
  }

  return (
    <Shell title="AI Coach">
      <div className="brutal-card flex items-center gap-2"><span className="text-2xl">🔥</span><div><b>COACH</b><div className="font-mono2 text-[11px]">Calm · direct · knows your plan</div></div></div>
      <div className="flex flex-col gap-2" aria-live="polite">
        {msgs.length === 0 && <div className="brutal-card text-sm">{tipFor(profile)}</div>}
        {msgs.map((m, i) => <div key={i} className={m.role === 'user' ? 'ml-8 border-2 border-black bg-[#0A1128] p-2 text-sm text-white' : 'mr-8 border-2 border-black bg-white p-2 text-sm'} style={{ borderRadius: 12 }}>{m.content}</div>)}
        {typing && <div className="mr-8 border-2 border-black bg-white p-2 font-mono2 text-xs">typing…</div>}
        <div ref={bottom} />
      </div>
      <div className="flex flex-wrap gap-2">{CHIPS.map((c) => <button key={c} className="chip" onClick={() => submit(c)}>{c}</button>)}</div>
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); submit(draft) }}>
        <input className="in flex-1" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Ask your coach…" aria-label="Ask your coach" />
        <button className="brutal-btn" type="submit" disabled={send.pending}>{send.pending ? '…' : 'Send'}</button>
      </form>
      {send.error && <div role="alert" className="brutal-card text-sm">Couldn't reach the coach — your words are saved. Try again.</div>}
    </Shell>
  )
}
