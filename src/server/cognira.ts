import { createServerFn } from '@tanstack/react-start'
import { eq } from 'drizzle-orm'

const jparse = (s: string | null | undefined, fb: any) => { try { return s ? JSON.parse(s as string) : fb } catch { return fb } }
const nid = (p = '') => `${Date.now()}${p}-${Math.random().toString(36).slice(2)}`

export const getState = createServerFn({ method: 'GET' }).handler(async () => {
  const { currentUser } = await import('@/lib/session.server')
  const u = await currentUser()
  if (!u) return { signedIn: false as const }
  const { getDb } = await import('@/lib/db')
  const s = await import('@/db/schema')
  const d = await getDb()
  const p = (await d.select().from(s.profiles).where(eq(s.profiles.userId, u.id)).get()) ?? null
  const taskRows = await d.select().from(s.tasks).where(eq(s.tasks.userId, u.id))
  const habitRows = await d.select().from(s.habits).where(eq(s.habits.userId, u.id))
  const sessRows = await d.select().from(s.focusSessions).where(eq(s.focusSessions.userId, u.id))
  const resRows = await d.select().from(s.resources).where(eq(s.resources.userId, u.id))
  const msgRows = await d.select().from(s.coachMessages).where(eq(s.coachMessages.userId, u.id))
  let masteryRows: any[] = await d.select().from((s as any).masteryEntries).where(eq((s as any).masteryEntries.userId, u.id))
  sessRows.sort((a, b) => (b.startedAt > a.startedAt ? 1 : -1))
  resRows.sort((a, b) => (b.updatedAt > a.updatedAt ? 1 : -1))
  msgRows.sort((a, b) => (a.createdAt > b.createdAt ? 1 : -1))
  return {
    signedIn: true as const, user: { id: u.id, email: u.email, name: u.name },
    profile: p ? { ...p, subjects: jparse(p.subjects, []), skills: jparse(p.skills, []), goals: jparse(p.goals, []), blockers: jparse(p.blockers, []), widgets: jparse(p.widgets, ['stats', 'coach', 'plan', 'weekly']), onboardingComplete: !!p.onboardingComplete, aiSuggestions: !!p.aiSuggestions, sounds: !!p.sounds } : null,
    tasks: taskRows.map((t) => ({ ...t, repeatDays: jparse(t.repeatDays, []), completedDates: jparse(t.completedDates, []) })),
    habits: habitRows.map((h) => ({ ...h, completedDates: jparse(h.completedDates, []) })),
    sessions: sessRows.slice(0, 60), resources: resRows, messages: msgRows.slice(-60),
    mastery: masteryRows.map((m: any) => ({ ...m, logs: jparse(m.logs, []) })),
  }
})

export const saveProfile = createServerFn({ method: 'POST' })
  .validator((d: any) => d)
  .handler(async ({ data }: { data: any }) => {
    const { requireUser } = await import('@/lib/session.server')
    const u = await requireUser()
    const { getDb } = await import('@/lib/db')
    const s = await import('@/db/schema')
    const d = await getDb()
    const ex = await d.select().from(s.profiles).where(eq(s.profiles.userId, u.id)).get()
    const row: any = {
      userId: u.id, name: String(data.name ?? ''), persona: String(data.persona ?? ''),
      className: String(data.className ?? ''), board: String(data.board ?? ''),
      profession: String(data.profession ?? ''), workFormat: String(data.workFormat ?? ''),
      subjects: JSON.stringify(data.subjects ?? []), skills: JSON.stringify(data.skills ?? []),
      goals: JSON.stringify(data.goals ?? []), blockers: JSON.stringify(data.blockers ?? []),
      level: String(data.level ?? ''), wake: String(data.wake ?? '06:30'), sleep: String(data.sleep ?? '22:30'),
      schoolHours: String(data.schoolHours ?? data.hours ?? ''), workHours: String(data.workHours ?? data.hours ?? ''),
      timezone: String(data.timezone ?? 'Asia/Kolkata'),
      onboardingComplete: data.onboardingComplete ? true : false,
    }
    if (data.coins !== undefined) row.coins = Number(data.coins)
    if (data.xp !== undefined) row.xp = Number(data.xp)
    if (data.theme) row.theme = String(data.theme)
    if (data.motion) row.motion = String(data.motion)
    if (data.environment) row.environment = String(data.environment)
    if (data.widgets) row.widgets = typeof data.widgets === 'string' ? data.widgets : JSON.stringify(data.widgets)
    if (data.aiSuggestions !== undefined) row.aiSuggestions = data.aiSuggestions ? true : false
    if (data.ambient) row.ambient = String(data.ambient)
    if (data.sounds !== undefined) row.sounds = data.sounds ? true : false
    if (ex) { const { userId, ...rest } = row; await d.update(s.profiles).set(rest).where(eq(s.profiles.userId, u.id)) }
    else await d.insert(s.profiles).values(row)
    if (data.onboardingComplete && data.seed && Array.isArray((data.seed as any).tasks)) {
      const now = new Date().toISOString()
      const today = now.slice(0, 10)
      const seed = data.seed as { tasks: any[]; habits: any[] }
      for (const t of seed.tasks.slice(0, 12)) {
        await d.insert(s.tasks).values({ id: nid('-t'), userId: u.id, title: String(t.title), startTime: String(t.start || t.startTime || '09:00'), endTime: String(t.end || t.endTime || '10:00'), category: String(t.category || 'General'), repeatDays: JSON.stringify(t.repeatDays || []), completedDates: JSON.stringify([]), date: String(t.date || today), createdAt: now })
      }
      for (const h of (seed.habits || []).slice(0, 8)) {
        await d.insert(s.habits).values({ id: nid('-h'), userId: u.id, title: String(h.title), icon: String(h.icon || '⭐'), frequency: 'daily', target: 1, completedDates: JSON.stringify([]), createdAt: now })
      }
    }
    return { ok: true }
  })

export const buildStarter = createServerFn({ method: 'POST' })
  .validator((d: any) => d ?? {})
  .handler(async ({ data }: { data: any }) => {
    const { requireUser } = await import('@/lib/session.server')
    const u = await requireUser()
    const { getDb } = await import('@/lib/db')
    const s = await import('@/db/schema')
    const d = await getDb()
    const now = new Date().toISOString()
    const today = now.slice(0, 10)
    const prof = await d.select().from(s.profiles).where(eq(s.profiles.userId, u.id)).get()
    const existing = await d.select().from(s.tasks).where(eq(s.tasks.userId, u.id))
    if (existing.length > 0) return { ok: true, skipped: true }
    const persona = String((prof as any)?.persona || data.persona || 'student')
    const subjects: string[] = (() => { try { return JSON.parse((prof as any)?.subjects || '[]') } catch { return [] } })()
    const skills: string[] = (() => { try { return JSON.parse((prof as any)?.skills || '[]') } catch { return [] } })()
    const tasks = persona === 'professional'
      ? [
        { title: `Deep work: ${(skills[0] || data.skills?.[0] || 'top priority')} (50 min)`, startTime: '09:00', endTime: '10:00', category: 'Deep Work', repeatDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] },
        { title: 'Close 1 routine task before lunch', startTime: '11:00', endTime: '11:30', category: 'Work', repeatDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] },
        { title: `Learn: ${(skills[1] || skills[0] || 'key skill')} — 30 min`, startTime: '20:00', endTime: '20:30', category: 'Learning', repeatDays: ['Mon', 'Wed', 'Fri'] },
      ]
      : [
        { title: `Revise ${subjects[0] || data.subjects?.[0] || 'Maths'} — 25 min`, startTime: '06:30', endTime: '07:00', category: subjects[0] || 'Study', repeatDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] },
        { title: `Practice ${subjects[1] || subjects[0] || 'Physics'} problems`, startTime: '16:00', endTime: '17:00', category: subjects[1] || 'Study', repeatDays: ['Mon', 'Wed', 'Fri'] },
        { title: 'Finish 1 routine task before lunch', startTime: '11:00', endTime: '11:30', category: 'Study', repeatDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] },
      ]
    const habits = persona === 'professional'
      ? [{ title: 'Plan top 3 priorities', icon: '🎯' }, { title: 'No-phone deep work 50 min', icon: '⚡' }, { title: 'Read 20 pages', icon: '📚' }]
      : [{ title: 'Revise flashcards 20 min', icon: '📚' }, { title: 'Solve 10 problems', icon: '🎯' }, { title: 'Read 30 min', icon: '🔥' }]
    for (const t of tasks) {
      await d.insert(s.tasks).values({ id: nid('-t'), userId: u.id, title: t.title, startTime: t.startTime, endTime: t.endTime, category: t.category, repeatDays: JSON.stringify(t.repeatDays), completedDates: JSON.stringify([]), date: today, createdAt: now })
    }
    for (const h of habits) {
      await d.insert(s.habits).values({ id: nid('-h'), userId: u.id, title: h.title, icon: h.icon, frequency: 'daily', target: 1, completedDates: JSON.stringify([]), createdAt: now })
    }
    return { ok: true }
  })

export const upsertTask = createServerFn({ method: 'POST' }).validator((d: any) => d).handler(async ({ data }: { data: any }) => {
  const { requireUser } = await import('@/lib/session.server')
  const u = await requireUser()
  const { getDb } = await import('@/lib/db')
  const s = await import('@/db/schema')
  const d = await getDb()
  const now = new Date().toISOString()
  const startTime = String(data.startTime ?? data.start ?? '09:00')
  const endTime = String(data.endTime ?? data.end ?? '10:00')
  if (data.id) {
    const ex = await d.select().from(s.tasks).where(eq(s.tasks.id, String(data.id))).get()
    if (!ex || ex.userId !== u.id) throw new Error('Not found')
    await d.update(s.tasks).set({ title: String(data.title), startTime, endTime, category: String(data.category || 'General'), repeatDays: JSON.stringify(data.repeatDays || []), completedDates: JSON.stringify(data.completedDates || []) }).where(eq(s.tasks.id, String(data.id)))
    return { ok: true, id: String(data.id) }
  }
  const id = nid('-t')
  await d.insert(s.tasks).values({ id, userId: u.id, title: String(data.title), startTime, endTime, category: String(data.category || 'General'), repeatDays: JSON.stringify(data.repeatDays || []), completedDates: JSON.stringify([]), date: String(data.date || now.slice(0, 10)), createdAt: now })
  return { ok: true, id }
})

export const deleteTask = createServerFn({ method: 'POST' }).validator((d: any) => d).handler(async ({ data }: { data: any }) => {
  const { requireUser } = await import('@/lib/session.server')
  const u = await requireUser()
  const { getDb } = await import('@/lib/db')
  const s = await import('@/db/schema')
  const d = await getDb()
  const ex = await d.select().from(s.tasks).where(eq(s.tasks.id, String(data.id))).get()
  if (ex && ex.userId === u.id) await d.delete(s.tasks).where(eq(s.tasks.id, String(data.id)))
  return { ok: true }
})

export const upsertHabit = createServerFn({ method: 'POST' }).validator((d: any) => d).handler(async ({ data }: { data: any }) => {
  const { requireUser } = await import('@/lib/session.server')
  const u = await requireUser()
  const { getDb } = await import('@/lib/db')
  const s = await import('@/db/schema')
  const d = await getDb()
  const now = new Date().toISOString()
  if (data.id) {
    const ex = await d.select().from(s.habits).where(eq(s.habits.id, String(data.id))).get()
    if (!ex || ex.userId !== u.id) throw new Error('Not found')
    await d.update(s.habits).set({ title: String(data.title), icon: String(data.icon || '⭐'), frequency: String(data.frequency || 'daily'), target: Number(data.target || 1), completedDates: JSON.stringify(data.completedDates || []) }).where(eq(s.habits.id, String(data.id)))
    return { ok: true, id: String(data.id) }
  }
  const id = nid('-h')
  await d.insert(s.habits).values({ id, userId: u.id, title: String(data.title), icon: String(data.icon || '⭐'), frequency: String(data.frequency || 'daily'), target: Number(data.target || 1), completedDates: JSON.stringify([]), createdAt: now })
  return { ok: true, id }
})

export const deleteHabit = createServerFn({ method: 'POST' }).validator((d: any) => d).handler(async ({ data }: { data: any }) => {
  const { requireUser } = await import('@/lib/session.server')
  const u = await requireUser()
  const { getDb } = await import('@/lib/db')
  const s = await import('@/db/schema')
  const d = await getDb()
  const ex = await d.select().from(s.habits).where(eq(s.habits.id, String(data.id))).get()
  if (ex && ex.userId === u.id) await d.delete(s.habits).where(eq(s.habits.id, String(data.id)))
  return { ok: true }
})

export const saveFocusSession = createServerFn({ method: 'POST' }).validator((d: any) => d).handler(async ({ data }: { data: any }) => {
  const { requireUser } = await import('@/lib/session.server')
  const u = await requireUser()
  const { getDb } = await import('@/lib/db')
  const s = await import('@/db/schema')
  const d = await getDb()
  const id = nid('-f')
  await d.insert(s.focusSessions).values({ id, userId: u.id, startedAt: String(data.startedAt), durationSec: Number(data.durationSec), mode: String(data.mode || 'Focus'), subject: String(data.subject || ''), completed: true })
  const prof = await d.select().from(s.profiles).where(eq(s.profiles.userId, u.id)).get()
  if (prof) await d.update(s.profiles).set({ coins: (prof.coins || 0) + 10, xp: (prof.xp || 0) + 20 }).where(eq(s.profiles.userId, u.id))
  return { ok: true, id }
})

export const upsertResource = createServerFn({ method: 'POST' }).validator((d: any) => d).handler(async ({ data }: { data: any }) => {
  const { requireUser } = await import('@/lib/session.server')
  const u = await requireUser()
  const { getDb } = await import('@/lib/db')
  const s = await import('@/db/schema')
  const d = await getDb()
  const now = new Date().toISOString()
  // Only keys this user's uploads produced: deleteResource deletes fileKey from storage.
  const fileKey = String(data.fileKey || '')
  if (fileKey && !fileKey.startsWith(`public/resources/${u.id}/`)) throw new Error('Not found')
  if (data.id) {
    const ex = await d.select().from(s.resources).where(eq(s.resources.id, String(data.id))).get()
    if (!ex || ex.userId !== u.id) throw new Error('Not found')
    await d.update(s.resources).set({ title: String(data.title), type: String(data.type || 'link'), category: String(data.category || 'General'), url: String(data.url || ''), fileKey, updatedAt: now }).where(eq(s.resources.id, String(data.id)))
    return { ok: true, id: String(data.id) }
  }
  const id = nid('-r')
  await d.insert(s.resources).values({ id, userId: u.id, title: String(data.title), type: String(data.type || 'link'), category: String(data.category || 'General'), url: String(data.url || ''), fileKey, updatedAt: now })
  return { ok: true, id }
})

export const deleteResource = createServerFn({ method: 'POST' }).validator((d: any) => d).handler(async ({ data }: { data: any }) => {
  const { requireUser } = await import('@/lib/session.server')
  const u = await requireUser()
  const { getDb } = await import('@/lib/db')
  const s = await import('@/db/schema')
  const d = await getDb()
  const ex = await d.select().from(s.resources).where(eq(s.resources.id, String(data.id))).get()
  if (ex && ex.userId === u.id) {
    if (ex.fileKey) { try { const { storage } = await import('@/lib/storage'); await storage.delete(ex.fileKey) } catch { /* ignore */ } }
    await d.delete(s.resources).where(eq(s.resources.id, String(data.id)))
  }
  return { ok: true }
})

export const uploadResourceFile = createServerFn({ method: 'POST' }).validator((d: unknown) => {
  if (!(d instanceof FormData)) throw new Error('Expected form data')
  return d
}).handler(async ({ data }: { data: FormData }) => {
  const { requireUser } = await import('@/lib/session.server')
  const u = await requireUser()
  const file = data.get('file') as File | null
  if (!file) throw new Error('No file')
  if (file.size > 8 * 1024 * 1024) throw new Error('That file is over 8 MB — pick a smaller one.')
  if (!/^(application\/pdf|image\/|text\/plain)/.test(file.type)) throw new Error('Choose a PDF, image or text file.')
  const { storage } = await import('@/lib/storage')
  const key = `public/resources/${u.id}/${Date.now()}-${(file.name || 'file').replace(/[^a-zA-Z0-9._-]/g, '_')}`
  const bytes = await file.arrayBuffer()
  await storage.put(key, bytes, { contentType: file.type || 'application/octet-stream' })
  return { ok: true, fileKey: key, url: storage.publicUrl(key) }
})

export const coachReply = createServerFn({ method: 'POST' }).validator((d: any) => d).handler(async ({ data }: { data: any }) => {
  const { requireUser } = await import('@/lib/session.server')
  const u = await requireUser()
  const { getDb } = await import('@/lib/db')
  const s = await import('@/db/schema')
  const d = await getDb()
  const message = String(data.message || '').slice(0, 2000)
  const ctx = data.context || {}
  const p = ctx.profile || {}
  const sys = `You are Cognira, a calm study coach. Student-safe, no diagnosis. User: ${p.name || 'friend'} (${p.persona || 'student'}), goals: ${(p.goals || []).join(', ') || 'none set'}, blockers: ${(p.blockers || []).join(', ') || 'none'}. Tasks: ${JSON.stringify((ctx.tasks || []).slice(0, 6))}. Habits: ${JSON.stringify((ctx.habits || []).slice(0, 6))}. Recent focus: ${JSON.stringify((ctx.sessions || []).slice(-5))}. Reply in 2-4 sentences with one concrete next action. No invented facts.`
  let reply = ''
  try {
    const { ai } = await import('@/lib/ai')
    const r = await ai.generateText({ system: sys, prompt: message })
    reply = r.text
  } catch { reply = `Got it. Start with one 25-minute push on your top task, then mark it done and tell me how it went.` }
  const now = new Date().toISOString()
  await d.insert(s.coachMessages).values({ id: nid('-u'), userId: u.id, role: 'user', content: message, createdAt: now })
  await d.insert(s.coachMessages).values({ id: nid('-c'), userId: u.id, role: 'coach', content: reply, createdAt: now })
  return { reply }
})

export const addCoins = createServerFn({ method: 'POST' }).validator((d: any) => d).handler(async ({ data }: { data: any }) => {
  const { requireUser } = await import('@/lib/session.server')
  const u = await requireUser()
  const { getDb } = await import('@/lib/db')
  const s = await import('@/db/schema')
  const d = await getDb()
  const amount = Math.round(Number(data.amount))
  if (!Number.isFinite(amount) || Math.abs(amount) > 1000) throw new Error('Invalid amount')
  const prof = await d.select().from(s.profiles).where(eq(s.profiles.userId, u.id)).get()
  if (prof) await d.update(s.profiles).set({ coins: Math.max(0, (prof.coins || 0) + amount) }).where(eq(s.profiles.userId, u.id))
  return { ok: true }
})

export const logMastery = createServerFn({ method: 'POST' }).validator((d: any) => d).handler(async ({ data }: { data: any }) => {
  const { requireUser } = await import('@/lib/session.server')
  const u = await requireUser()
  const subject = String(data.subject || '').trim().slice(0, 80)
  if (!subject) throw new Error('Subject is required')
  const minutes = Math.max(0, Math.min(480, Math.round(Number(data.minutes) || 0)))
  const confidence = Math.max(1, Math.min(5, Math.round(Number(data.confidence) || 3)))
  if (!minutes && !data.confidence) throw new Error('Nothing to save')
  const { getDb } = await import('@/lib/db')
  const s = await import('@/db/schema')
  const d = await getDb()
  const now = new Date().toISOString()
  const rows = await d.select().from(s.masteryEntries).where(eq(s.masteryEntries.userId, u.id))
  const ex = rows.find((r: any) => String(r.subject).toLowerCase() === subject.toLowerCase())
  if (ex) {
    const logs = jparse(ex.logs, [])
    logs.push({ at: now, minutes })
    await d.update(s.masteryEntries).set({ minutes: (ex.minutes || 0) + minutes, confidence, logs: JSON.stringify(logs.slice(-60)), updatedAt: now }).where(eq(s.masteryEntries.id, ex.id))
    return { ok: true, id: ex.id }
  }
  const id = nid('-m')
  await d.insert(s.masteryEntries).values({ id, userId: u.id, subject, minutes, confidence, logs: JSON.stringify(minutes ? [{ at: now, minutes }] : []), updatedAt: now })
  return { ok: true, id }
})

export const setMasteryConfidence = createServerFn({ method: 'POST' }).validator((d: any) => d).handler(async ({ data }: { data: any }) => {
  const { requireUser } = await import('@/lib/session.server')
  const u = await requireUser()
  const subject = String(data.subject || '').trim().slice(0, 80)
  if (!subject) throw new Error('Subject is required')
  const confidence = Math.max(1, Math.min(5, Math.round(Number(data.confidence) || 3)))
  const { getDb } = await import('@/lib/db')
  const s = await import('@/db/schema')
  const d = await getDb()
  const now = new Date().toISOString()
  const rows = await d.select().from(s.masteryEntries).where(eq(s.masteryEntries.userId, u.id))
  const ex = rows.find((r: any) => String(r.subject).toLowerCase() === subject.toLowerCase())
  if (ex) {
    await d.update(s.masteryEntries).set({ confidence, updatedAt: now }).where(eq(s.masteryEntries.id, ex.id))
    return { ok: true, id: ex.id }
  }
  const id = nid('-m')
  await d.insert(s.masteryEntries).values({ id, userId: u.id, subject, minutes: 0, confidence, logs: JSON.stringify([]), updatedAt: now })
  return { ok: true, id }
})

export const deleteMastery = createServerFn({ method: 'POST' }).validator((d: any) => d).handler(async ({ data }: { data: any }) => {
  const { requireUser } = await import('@/lib/session.server')
  const u = await requireUser()
  const { getDb } = await import('@/lib/db')
  const s = await import('@/db/schema')
  const d = await getDb()
  const id = data?.id != null ? String(data.id) : ''
  const subject = data?.subject != null ? String(data.subject).trim().toLowerCase() : ''
  if (id) {
    const ex = await d.select().from(s.masteryEntries).where(eq(s.masteryEntries.id, id)).get()
    if (ex && (ex as any).userId === u.id) await d.delete(s.masteryEntries).where(eq(s.masteryEntries.id, id))
    return { ok: true }
  }
  if (subject) {
    const rows = await d.select().from(s.masteryEntries).where(eq(s.masteryEntries.userId, u.id))
    const hit = (rows as any[]).find((r) => String(r.subject || '').toLowerCase() === subject)
    if (hit) await d.delete(s.masteryEntries).where(eq(s.masteryEntries.id, hit.id))
    return { ok: true }
  }
  return { ok: true }
})

export const deleteAccount = createServerFn({ method: 'POST' }).handler(async () => {
  const { requireUser } = await import('@/lib/session.server')
  const u = await requireUser()
  const { getDb } = await import('@/lib/db')
  const s = await import('@/db/schema')
  const d = await getDb()
  for (const t of [s.coachMessages, s.resources, s.focusSessions, s.habits, s.tasks, (s as any).masteryEntries, s.profiles]) {
    try { await d.delete(t).where(eq((t as any).userId, u.id)) } catch { /* ignore */ }
  }
  // Remove the sign-in itself too, or the account survives a "delete account".
  try {
    await d.delete(s.session).where(eq(s.session.userId, u.id))
    await d.delete(s.account).where(eq(s.account.userId, u.id))
    await d.delete(s.user).where(eq(s.user.id, u.id))
  } catch { /* ignore */ }
  return { ok: true }
})
