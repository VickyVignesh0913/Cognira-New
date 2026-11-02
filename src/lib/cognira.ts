// Shared Cognira logic: demo seeds, date helpers, stats. Browser-safe.
export type Persona = 'student' | 'professional' | ''

export interface DemoTask { id: string; title: string; start: string; end: string; startTime: string; endTime: string; category: string; repeatDays: string[]; completedDates: string[]; date: string }
export type Task = DemoTask
export interface DemoHabit { id: string; title: string; icon: string; frequency: string; target: number; category?: string; completedDates: string[] }
export type Habit = DemoHabit
export interface DemoSession { id: string; startedAt: string; durationSec: number; mode: string; subject?: string; completed?: boolean }
export type FocusSession = DemoSession
export interface DemoResource { id: string; title: string; type: string; category: string; url: string; fileKey?: string; updatedAt: string }
export type Resource = DemoResource
export interface CoachMsg { role: 'user' | 'coach'; content: string; at: string }
export interface Profile {
  name: string; persona: Persona;
  subjects: string[]; skills: string[]; goals: string[]; blockers: string[];
  ambient?: string; className: string; board: string; profession: string;
  level: string; wake: string; sleep: string; hours: string;
  coins: number; xp: number; onboarding_complete: boolean;
  [k: string]: string | string[] | number | boolean | undefined
}
export interface Prefs { theme: string; motion: string; env: string; widgets: Record<string, boolean>; sound: boolean; ai: boolean; ambient: string }

export const SUBJECTS = ['Maths', 'Physics', 'Chemistry', 'Biology', 'English', 'History']
export const STUDENT_GOALS = ['Board exams', 'JEE / NEET prep', 'Improve grades', 'Study consistency', 'Revision']
export const PRO_GOALS = ['Promotion', 'New skills', 'Work-life balance', 'Deep work', 'Leadership']
export const BLOCKERS = ['Procrastination', 'Phone distraction', 'No plan', 'Low energy', 'Lack of time']
export const SKILLS = ['Communication', 'SQL', 'Design', 'Management', 'Coding', 'Writing']

export function uid(): string {
  try {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return (crypto as { randomUUID(): string }).randomUUID()
  } catch { /* fallback */ }
  return `id-${Date.now()}-${Math.floor(Math.random() * 1e9)}`
}

function fmtKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

export function todayKey(_tz?: string): string {
  return fmtKey(new Date())
}
export function dayKey(d?: Date | string): string {
  if (!d) return fmtKey(new Date())
  if (typeof d === 'string') {
    if (/^\d{4}-\d{2}-\d{2}/.test(d)) return d.slice(0, 10)
    const p = new Date(d)
    return isNaN(p.getTime()) ? fmtKey(new Date()) : fmtKey(p)
  }
  return fmtKey(d)
}

export function addDays(key: string, n: number): string {
  const d = new Date(key + 'T12:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}
export function relTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const m = Math.floor(ms / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return d === 1 ? 'yesterday' : `${d} days ago`
}
export function streakOf(dates: string[], today: string): number {
  const set = new Set(dates)
  let s = 0
  let cur = today
  if (!set.has(cur)) cur = addDays(today, -1)
  while (set.has(cur)) { s++; cur = addDays(cur, -1) }
  return s
}
export function bestStreak(dates: string[]): number {
  if (!dates.length) return 0
  const sorted = [...new Set(dates)].sort()
  let best = 1, cur = 1
  for (let i = 1; i < sorted.length; i++) {
    if (addDays(sorted[i - 1], 1) === sorted[i]) cur++
    else { best = Math.max(best, cur); cur = 1 }
  }
  return Math.max(best, cur)
}
export function fmtDur(sec: number): string {
  const m = Math.floor(sec / 60)
  if (m < 60) return `${m}m`
  return `${Math.floor(m / 60)}h ${m % 60}m`
}
export function greeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}
export function pctWeek(tasks: DemoTask[]): number {
  if (!tasks.length) return 0
  const t = todayKey()
  const done = tasks.filter((x) => (x.completedDates || []).includes(t)).length
  return Math.round((done / tasks.length) * 100)
}
export function randomTip(p: Profile | null): string {
  if (!p) return 'Pick one win for today and give it 25 focused minutes.'
  const g = p.goals?.[0]
  const b = p.blockers?.[0]
  if (g && b) return `Move "${g}" forward today — one 25-min push past "${b}".`
  if (g) return `One 25-minute push on "${g}" beats a perfect plan. Start now.`
  return 'Small wins daily — start with a 25-minute focus session.'
}

const T = todayKey()
const iso = (daysAgo: number, h = 10) => {
  const d = new Date(T + 'T12:00:00')
  d.setDate(d.getDate() - daysAgo)
  d.setHours(h, 0, 0, 0)
  return d.toISOString()
}

function mkTask(id: string, title: string, start: string, end: string, category: string, repeatDays: string[], completedDates: string[]): DemoTask {
  return { id, title, start, end, startTime: start, endTime: end, category, repeatDays, completedDates, date: T }
}

export function ibrahimSeed() {
  const tasks: DemoTask[] = [
    mkTask('t1', 'Physics: Rotational Mechanics Ch.7', '06:30', '07:30', 'Physics', ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], [addDays(T, -1), T]),
    mkTask('t2', 'Maths: Quadratic Equations practice', '08:00', '09:00', 'Maths', ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], [addDays(T, -1)]),
    mkTask('t3', 'Chemistry: Chemical Bonding revision', '16:00', '17:00', 'Chemistry', ['Mon', 'Wed', 'Fri'], []),
    mkTask('t4', 'English: Writing skills + sample paper', '19:00', '20:00', 'English', ['Tue', 'Thu', 'Sat'], []),
  ]
  const habits: DemoHabit[] = [
    { id: 'h1', title: 'Revise flashcards 20 min', icon: 'book', frequency: 'daily', target: 1, completedDates: [addDays(T, -4), addDays(T, -3), addDays(T, -2), addDays(T, -1), T] },
    { id: 'h2', title: 'Solve 10 Maths problems', icon: 'target', frequency: 'daily', target: 10, completedDates: [addDays(T, -2), addDays(T, -1)] },
    { id: 'h3', title: 'Read NCERT Science 30 min', icon: 'flame', frequency: 'daily', target: 1, completedDates: [addDays(T, -6), addDays(T, -5), addDays(T, -4), addDays(T, -3), addDays(T, -2), addDays(T, -1), T] },
  ]
  const sessions: DemoSession[] = [
    { id: 's1', startedAt: iso(0, 6), durationSec: 1500, mode: 'focus', subject: 'Physics' },
    { id: 's2', startedAt: iso(0, 8), durationSec: 1500, mode: 'focus', subject: 'Maths' },
    { id: 's3', startedAt: iso(1, 16), durationSec: 3000, mode: 'focus', subject: 'Chemistry' },
    { id: 's4', startedAt: iso(2, 10), durationSec: 1500, mode: 'focus', subject: 'Biology' },
    { id: 's5', startedAt: iso(3, 9), durationSec: 1500, mode: 'focus', subject: 'Maths' },
  ]
  const resources: DemoResource[] = [
    { id: 'r1', title: 'Physics Ch.7 — Handwritten Notes', type: 'note', category: 'Physics', url: '', updatedAt: iso(0, 9) },
    { id: 'r2', title: 'CBSE Maths PYQ 2024 Set 1', type: 'pyq', category: 'Maths', url: 'https://cbseacademic.nic.in', updatedAt: iso(1, 11) },
    { id: 'r3', title: 'Chemical Bonding — Mock Test 3', type: 'mock', category: 'Chemistry', url: '', updatedAt: iso(2, 14) },
    { id: 'r4', title: 'Biology Diagrams Bookmarks', type: 'note', category: 'Biology', url: 'https://ncert.nic.in', updatedAt: iso(4, 10) },
  ]
  return { tasks, habits, sessions, resources }
}

export function alexSeed() {
  const tasks: DemoTask[] = [
    mkTask('t1', 'Deep work: Q4 roadmap draft', '09:00', '11:00', 'Deep Work', ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], [T]),
    mkTask('t2', '1:1 with design team', '11:30', '12:00', 'Meetings', ['Tue'], []),
    mkTask('t3', 'Review sprint metrics', '14:00', '15:00', 'Projects', ['Mon', 'Wed', 'Fri'], [addDays(T, -2), addDays(T, -1)]),
    mkTask('t4', 'Learn: SQL for PMs — lesson 5', '20:00', '20:45', 'Learning', ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], []),
  ]
  const habits: DemoHabit[] = [
    { id: 'h1', title: 'Plan top 3 priorities', icon: 'target', frequency: 'daily', target: 1, completedDates: [addDays(T, -3), addDays(T, -2), addDays(T, -1), T] },
    { id: 'h2', title: 'No-phone deep work 50 min', icon: 'zap', frequency: 'daily', target: 1, completedDates: [addDays(T, -1)] },
    { id: 'h3', title: 'Read 20 pages', icon: 'book', frequency: 'daily', target: 1, completedDates: [addDays(T, -5), addDays(T, -4), addDays(T, -3), addDays(T, -2), addDays(T, -1), T] },
  ]
  const sessions: DemoSession[] = [
    { id: 's1', startedAt: iso(0, 9), durationSec: 3000, mode: 'focus', subject: 'Roadmap' },
    { id: 's2', startedAt: iso(1, 9), durationSec: 3000, mode: 'focus', subject: 'Sprint review' },
    { id: 's3', startedAt: iso(2, 14), durationSec: 1500, mode: 'focus', subject: 'Learning' },
  ]
  const resources: DemoResource[] = [
    { id: 'r1', title: 'Q4 Roadmap Template', type: 'template', category: 'Documents', url: '', updatedAt: iso(0, 8) },
    { id: 'r2', title: 'Sprint Retro Notes', type: 'doc', category: 'Documents', url: '', updatedAt: iso(1, 15) },
    { id: 'r3', title: 'SQL for PMs — course link', type: 'link', category: 'Links', url: 'https://example.com/sql-for-pms', updatedAt: iso(2, 20) },
    { id: 'r4', title: 'Stakeholder update article', type: 'article', category: 'Articles', url: 'https://example.com/article', updatedAt: iso(5, 9) },
  ]
  return { tasks, habits, sessions, resources }
}

export const DEMO_STUDENT = { name: 'Ibrahim', persona: 'student' as Persona }
export const DEMO_PRO = { name: 'Alex Johnson', persona: 'professional' as Persona }

export function demoTasks(persona: Persona | string): DemoTask[] {
  return (persona === 'professional' ? alexSeed() : ibrahimSeed()).tasks
}
export function demoHabits(persona: Persona | string): DemoHabit[] {
  return (persona === 'professional' ? alexSeed() : ibrahimSeed()).habits
}
export function demoSessions(): DemoSession[] {
  return ibrahimSeed().sessions
}
export function demoResources(persona: Persona | string): DemoResource[] {
  return (persona === 'professional' ? alexSeed() : ibrahimSeed()).resources
}

export const DEMO_KEY = 'cognira-demo-v1'
export interface DemoStore {
  profile: { name: string; persona: Persona; className: string; board: string; profession: string; subjects: string[]; skills: string[]; goals: string[]; blockers: string[]; level: string; wake: string; sleep: string; coins: number; theme: string; motion: string; environment: string; widgets: string[]; aiSuggestions: boolean; ambient: string; sounds: boolean }
  tasks: DemoTask[]; habits: DemoHabit[]; sessions: DemoSession[]; resources: DemoResource[]; messages: { role: string; content: string; createdAt: string }[]
}
export function loadDemo(): DemoStore | null {
  try {
    const raw = localStorage.getItem(DEMO_KEY)
    return raw ? JSON.parse(raw) as DemoStore : null
  } catch { return null }
}
export function saveDemo(s: DemoStore) {
  try { localStorage.setItem(DEMO_KEY, JSON.stringify(s)) } catch { /* full */ }
}

// Browser local persistence used by all tab screens (demo mode + offline cache)
function readLS<T>(key: string, fb: T): T {
  try {
    if (typeof localStorage === 'undefined') return fb
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) as T : fb
  } catch { return fb }
}
function writeLS(key: string, val: unknown): boolean {
  try { localStorage.setItem(key, JSON.stringify(val)); return true } catch { return false /* full */ }
}
function emit() {
  try { window.dispatchEvent(new Event('cognira-data')) } catch { /* ssr */ }
}

export function loadProfile(): Profile | null {
  const d = readLS<DemoStore | null>(DEMO_KEY, null)
  if (d?.profile) return d.profile as unknown as Profile
  return readLS<Profile | null>('cognira-profile', null)
}
export function saveProfile(p: Profile): void {
  saveProfileLocal(p)
}
export function saveProfileLocal(p: Profile) {
  writeLS('cognira-profile', p)
  const d = readLS<DemoStore | null>(DEMO_KEY, null)
  if (d) { d.profile = { ...(d.profile as object), ...(p as object) } as DemoStore['profile']; writeLS(DEMO_KEY, d) }
  emit()
}
export function loadTasks(): DemoTask[] { return readLS<DemoTask[]>('cognira-tasks', []) }
export function saveTasks(t: DemoTask[]) { writeLS('cognira-tasks', t); emit() }
export function loadHabits(): DemoHabit[] { return readLS<DemoHabit[]>('cognira-habits', []) }
export function saveHabits(h: DemoHabit[]) { writeLS('cognira-habits', h); emit() }
export function loadSessions(): DemoSession[] { return readLS<DemoSession[]>('cognira-sessions', []) }
export function loadFocusSessions(): DemoSession[] { return loadSessions() }
export function saveSessions(s: DemoSession[]) { writeLS('cognira-sessions', s); emit() }
export function loadResources(): DemoResource[] { return readLS<DemoResource[]>('cognira-resources', []) }
export function saveResources(r: DemoResource[]): boolean { const ok = writeLS('cognira-resources', r); emit(); return ok }
export function loadCoach(): CoachMsg[] { return readLS<CoachMsg[]>('cognira-coach', []) }
export function saveCoach(m: CoachMsg[]) { writeLS('cognira-coach', m); emit() }

// Settings prefs (local)
const PREFS_KEY = 'cognira-prefs'
export const DEFAULT_PREFS: Prefs = { theme: 'Sky Blue', motion: 'Full', env: 'Calm', widgets: { stats: true, plan: true, weekly: true, coachTip: true }, sound: true, ai: true, ambient: 'Rain' }
export function loadPrefs(): Prefs {
  const p = readLS<Partial<Prefs>>(PREFS_KEY, {})
  return { ...DEFAULT_PREFS, ...p, widgets: { ...DEFAULT_PREFS.widgets, ...(p.widgets || {}) } }
}
export function savePrefs(p: Prefs) { writeLS(PREFS_KEY, p); emit() }
export function clearAll() {
  try {
    ;['cognira-profile', 'cognira-tasks', 'cognira-habits', 'cognira-sessions', 'cognira-resources', 'cognira-coach', DEMO_KEY, PREFS_KEY].forEach((k) => localStorage.removeItem(k))
  } catch { /* noop */ }
  emit()
}
