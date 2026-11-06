import { useState } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { authClient } from '@/lib/auth-client'
import { useAction } from '@/lib/actions'
import { loadProfile } from '@/lib/cognira'
import { getSignInOptions } from '@/lib/session'
import { Logo } from '@/components/ui'

export const Route = createFileRoute('/login')({
  loader: async () => ({ google: (await getSignInOptions()).google }),
  component: Login,
})

function Login() {
  const nav = useNavigate()
  const { google: googleEnabled } = Route.useLoaderData()
  const [mode, setMode] = useState<'in' | 'up'>('up')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const login = useAction(async () => {
    const r: any = mode === 'in'
      ? await authClient.signIn.email({ email, password })
      : await authClient.signUp.email({ name: name || email.split('@')[0], email, password })
    if (r?.error) throw new Error(r.error.message || 'Sign-in failed')
    return r
  }, { onSuccess: () => nav({ to: mode === 'in' && loadProfile()?.onboarding_complete ? '/home' : '/onboarding' }) })

  const google = useAction(async () => {
    const r: any = await authClient.signIn.social({ provider: 'google', callbackURL: '/home' })
    if (r?.error) throw new Error(r.error.message || 'Google sign-in failed')
    return r
  }, { onSuccess: () => nav({ to: '/home' }) })

  return (
    <div className="phone-wrap"><div className="phone flex min-h-[92vh] flex-col justify-center gap-4 p-6">
      <div className="flex items-center gap-3"><Logo size={48} /><h1 className="font-display text-3xl">{mode === 'in' ? 'WELCOME BACK' : 'JOIN COGNIRA'}</h1></div>
      <div className="seg"><button className={mode === 'up' ? 'on' : ''} onClick={() => setMode('up')}>Sign up</button><button className={mode === 'in' ? 'on' : ''} onClick={() => setMode('in')}>Sign in</button></div>
      <form onSubmit={(e) => { e.preventDefault(); login.run() }} className="flex flex-col gap-3">
        <fieldset disabled={!login.ready} className="flex flex-col gap-3">
          {mode === 'up' && (<label className="lbl">Name<input className="in" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ibrahim" /></label>)}
          <label className="lbl">Email<input className="in" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" /></label>
          <label className="lbl">Password<input className="in" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="8+ characters" /></label>
          {login.error && <div role="alert" className="brutal-card text-sm" style={{ borderColor: 'var(--color-danger)' }}>{login.error}</div>}
          <button className="brutal-btn w-full" type="submit" disabled={login.pending}>{login.pending ? 'Please wait…' : mode === 'in' ? 'Sign in' : 'Create account'}</button>
        </fieldset>
      </form>
      {googleEnabled && <>
        <button className="brutal-btn brutal-btn-yellow w-full text-ink" onClick={() => google.run()}>{google.pending ? 'Opening Google…' : 'Continue with Google'}</button>
        {google.error && <div role="alert" className="brutal-card text-sm">{google.error}</div>}
      </>}
      <div className="text-center font-mono2 text-xs"><Link to="/" className="underline">← Back to welcome</Link></div>
    </div></div>
  )
}
