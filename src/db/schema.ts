export * from './auth-schema'
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const profiles = sqliteTable('profiles', {
  userId: text('user_id').primaryKey(),
  name: text('name').notNull().default(''),
  persona: text('persona').notNull().default(''),
  className: text('class_name').notNull().default(''),
  board: text('board').notNull().default(''),
  profession: text('profession').notNull().default(''),
  workFormat: text('work_format').notNull().default(''),
  subjects: text('subjects').notNull().default('[]'),
  skills: text('skills').notNull().default('[]'),
  goals: text('goals').notNull().default('[]'),
  blockers: text('blockers').notNull().default('[]'),
  level: text('level').notNull().default(''),
  wake: text('wake').notNull().default('06:30'),
  sleep: text('sleep').notNull().default('22:30'),
  schoolHours: text('school_hours').notNull().default(''),
  workHours: text('work_hours').notNull().default(''),
  coins: integer('coins').notNull().default(0),
  xp: integer('xp').notNull().default(0),
  timezone: text('timezone').notNull().default('Asia/Kolkata'),
  onboardingComplete: integer('onboarding_complete', { mode: 'boolean' }).notNull().default(false),
  theme: text('theme').notNull().default('sky'),
  motion: text('motion').notNull().default('full'),
  environment: text('environment').notNull().default('calm'),
  widgets: text('widgets').notNull().default('["stats","coach","plan","weekly"]'),
  aiSuggestions: integer('ai_suggestions', { mode: 'boolean' }).notNull().default(true),
  ambient: text('ambient').notNull().default('rain'),
  sounds: integer('sounds', { mode: 'boolean' }).notNull().default(true),
})

export const tasks = sqliteTable('tasks', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  title: text('title').notNull(),
  startTime: text('start_time').notNull(),
  endTime: text('end_time').notNull(),
  category: text('category').notNull().default('Study'),
  repeatDays: text('repeat_days').notNull().default('[]'),
  completedDates: text('completed_dates').notNull().default('[]'),
  date: text('date').notNull().default(''),
  createdAt: text('created_at').notNull(),
})

export const habits = sqliteTable('habits', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  title: text('title').notNull(),
  icon: text('icon').notNull().default('star'),
  frequency: text('frequency').notNull().default('daily'),
  target: integer('target').notNull().default(1),
  completedDates: text('completed_dates').notNull().default('[]'),
  createdAt: text('created_at').notNull(),
})

export const focusSessions = sqliteTable('focus_sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  startedAt: text('started_at').notNull(),
  durationSec: integer('duration_sec').notNull(),
  mode: text('mode').notNull().default('focus'),
  subject: text('subject').notNull().default(''),
  completed: integer('completed', { mode: 'boolean' }).notNull().default(true),
})

export const resources = sqliteTable('resources', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  title: text('title').notNull(),
  type: text('type').notNull().default('note'),
  category: text('category').notNull().default('General'),
  url: text('url').notNull().default(''),
  fileKey: text('file_key').notNull().default(''),
  updatedAt: text('updated_at').notNull(),
})

export const coachMessages = sqliteTable('coach_messages', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  role: text('role').notNull(),
  content: text('content').notNull(),
  createdAt: text('created_at').notNull(),
})

export type Profile = typeof profiles.$inferSelect
export type Task = typeof tasks.$inferSelect
export type Habit = typeof habits.$inferSelect
export type FocusSession = typeof focusSessions.$inferSelect
export type Resource = typeof resources.$inferSelect
export type CoachMessage = typeof coachMessages.$inferSelect
