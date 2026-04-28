import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  Archive,
  BarChart3,
  Bell,
  BookOpen,
  CalendarDays,
  Check,
  ChevronRight,
  CircleDot,
  Clock3,
  Command,
  Download,
  FileText,
  Flame,
  Inbox,
  KanbanSquare,
  LayoutDashboard,
  ListChecks,
  Moon,
  MoreHorizontal,
  NotebookPen,
  Pause,
  Play,
  Plus,
  RefreshCcw,
  Search,
  Settings,
  ShieldAlert,
  Sparkles,
  Sun,
  Target,
  Timer,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useHotkeys } from 'react-hotkeys-hook'
import { toast } from 'sonner'
import { create } from 'zustand'
import type { User } from '@supabase/supabase-js'
import { format, isToday, parseISO, startOfWeek } from 'date-fns'
import { ru } from 'date-fns/locale'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { hasSupabaseConfig, supabase } from './lib/supabase'

type Page =
  | 'today'
  | 'board'
  | 'inbox'
  | 'backlog'
  | 'calendar'
  | 'flags'
  | 'decisions'
  | 'retros'
  | 'templates'
  | 'notes'
  | 'analytics'
  | 'settings'

type Project = 'Angular PMS' | 'site-generator' | 'Mobile' | 'Backend/API' | 'Managed-service' | 'Cross-product' | 'Personal'
type TaskType = 'feature' | 'bug' | 'research' | 'ops' | 'tech-debt' | 'meeting' | 'spike' | 'docs'
type Impact = 'high' | 'medium' | 'low'
type Effort = 'XS' | 'S' | 'M' | 'L' | 'XL'
type Priority = 'P0' | 'P1' | 'P2' | 'P3'
type Status = 'inbox' | 'backlog' | 'week' | 'progress' | 'review' | 'done' | 'archived'
type Severity = 'critical' | 'high' | 'medium' | 'low'

type Task = {
  id: string
  title: string
  description: string
  project: Project
  type: TaskType
  impact: Impact
  effort: Effort
  priority: Priority
  status: Status
  entryPoint: string
  acceptanceCriteria: string[]
  tags: string[]
  dueDate?: string
  estimatedMinutes?: number
  actualMinutes: number
  pomodoroSessions: number
  position: number
  createdAt: string
  updatedAt: string
  completedAt?: string
}

type Flag = {
  id: string
  title: string
  description: string
  severity: Severity
  category: 'technical' | 'product' | 'process' | 'business' | 'security'
  status: 'open' | 'in_progress' | 'mitigated' | 'resolved' | 'accepted'
  owner: string
  identifiedAt: string
  targetResolutionDate?: string
}

type Decision = {
  id: string
  date: string
  title: string
  status: 'proposed' | 'accepted' | 'rejected' | 'superseded' | 'deprecated'
  context: string
  decision: string
  alternatives: string
  consequences: string
  tags: string[]
}

type Note = {
  id: string
  title: string
  content: string
  pinned: boolean
  tags: string[]
  updatedAt: string
}

type Retro = {
  id: string
  date: string
  type: 'daily' | 'weekly' | 'monthly'
  field1: string
  field2: string
  field3: string
  mood: number
  energy: number
  notes: string
}

type Template = {
  id: string
  name: string
  description: string
  category: string
  content: string
  usageCount: number
}

type PomodoroState = {
  running: boolean
  mode: 'focus' | 'short_break' | 'long_break'
  secondsLeft: number
  taskId?: string
  cyclesCompleted: number
  startedAt?: string
}

type AppState = {
  currentUser: User | null
  authReady: boolean
  dataLoading: boolean
  dataError?: string
  tasks: Task[]
  flags: Flag[]
  decisions: Decision[]
  notes: Note[]
  retros: Retro[]
  templates: Template[]
  mit: { date: string; taskId?: string; completed: boolean }
  pomodoro: PomodoroState
  theme: 'dark' | 'light'
  accentColor: string
  onboardingDone: boolean
  initialize: () => Promise<void>
  loadData: () => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  createTask: (input: TaskInput) => Promise<void>
  updateTask: (id: string, patch: Partial<Task>) => Promise<void>
  deleteTask: (id: string) => Promise<void>
  moveTask: (id: string, status: Status) => boolean
  bulkMove: (ids: string[], status: Status) => Promise<void>
  setMit: (taskId?: string) => Promise<void>
  toggleTheme: () => void
  setOnboardingDone: () => void
  startPomodoro: (taskId?: string) => void
  pausePomodoro: () => void
  stopPomodoro: (interrupted?: boolean) => void
  tickPomodoro: () => void
  upsertFlag: (flag: Flag) => Promise<void>
  upsertDecision: (decision: Decision) => Promise<void>
  upsertNote: (note: Note) => Promise<void>
  upsertRetro: (retro: Retro) => Promise<void>
  useTemplate: (id: string) => Promise<void>
  importData: (data: Partial<Pick<AppState, 'tasks' | 'flags' | 'decisions' | 'notes' | 'retros' | 'templates'>>) => Promise<void>
}

type TaskInput = Omit<Task, 'id' | 'actualMinutes' | 'pomodoroSessions' | 'position' | 'createdAt' | 'updatedAt' | 'completedAt'>

const todayKey = () => format(new Date(), 'yyyy-MM-dd')
const uid = () => crypto.randomUUID()
const WIP_LIMIT = 3
const FOCUS_SECONDS = 25 * 60
const SHORT_BREAK_SECONDS = 5 * 60
const LONG_BREAK_SECONDS = 15 * 60

const PROJECTS: Project[] = ['Angular PMS', 'site-generator', 'Mobile', 'Backend/API', 'Managed-service', 'Cross-product', 'Personal']
const TASK_TYPES: TaskType[] = ['feature', 'bug', 'research', 'ops', 'tech-debt', 'meeting', 'spike', 'docs']
const IMPACTS: Impact[] = ['high', 'medium', 'low']
const EFFORTS: Effort[] = ['XS', 'S', 'M', 'L', 'XL']
const PRIORITIES: Priority[] = ['P0', 'P1', 'P2', 'P3']

const STATUS_LABELS: Record<Status, string> = {
  inbox: 'Inbox',
  backlog: 'Backlog',
  week: 'Неделя',
  progress: 'В работе',
  review: 'Review',
  done: 'Done',
  archived: 'Архив',
}

const BOARD_STATUSES: Status[] = ['inbox', 'backlog', 'week', 'progress', 'review', 'done']

const PRIORITY_COLORS: Record<Priority, string> = {
  P0: '#ffffff',
  P1: '#c4b5fd',
  P2: '#8b5cf6',
  P3: '#6d687a',
}

const SEVERITY_COLORS: Record<Severity, string> = {
  critical: '#ffffff',
  high: '#c4b5fd',
  medium: '#8b5cf6',
  low: '#6d687a',
}

const emptyPomodoro: PomodoroState = {
  running: false,
  mode: 'focus',
  secondsLeft: FOCUS_SECONDS,
  cyclesCompleted: 0,
}

function getClient() {
  if (!supabase) throw new Error('Supabase не настроен')
  return supabase
}

function taskFromDb(row: any): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? '',
    project: row.project,
    type: row.type,
    impact: row.impact,
    effort: row.effort,
    priority: row.priority,
    status: row.status,
    entryPoint: row.entry_point ?? '',
    acceptanceCriteria: Array.isArray(row.acceptance_criteria) ? row.acceptance_criteria : [],
    tags: row.tags ?? [],
    dueDate: row.due_date ?? undefined,
    estimatedMinutes: row.estimated_minutes ?? undefined,
    actualMinutes: row.actual_minutes ?? 0,
    pomodoroSessions: row.pomodoro_sessions ?? 0,
    position: row.position ?? 0,
    createdAt: row.created_at ?? new Date().toISOString(),
    updatedAt: row.updated_at ?? new Date().toISOString(),
    completedAt: row.completed_at ?? undefined,
  }
}

function taskToDb(task: Task, userId: string) {
  return {
    id: task.id,
    user_id: userId,
    title: task.title,
    description: task.description,
    project: task.project,
    type: task.type,
    impact: task.impact,
    effort: task.effort,
    priority: task.priority,
    status: task.status,
    entry_point: task.entryPoint,
    acceptance_criteria: task.acceptanceCriteria,
    tags: task.tags,
    due_date: task.dueDate ?? null,
    estimated_minutes: task.estimatedMinutes ?? null,
    actual_minutes: task.actualMinutes,
    pomodoro_sessions: task.pomodoroSessions,
    completed_at: task.completedAt ?? null,
    position: task.position,
  }
}

function flagFromDb(row: any): Flag {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? '',
    severity: row.severity,
    category: row.category,
    status: row.status,
    owner: row.owner ?? '',
    identifiedAt: row.identified_at ?? todayKey(),
    targetResolutionDate: row.target_resolution_date ?? undefined,
  }
}

function flagToDb(flag: Flag, userId: string) {
  return {
    id: flag.id,
    user_id: userId,
    title: flag.title,
    description: flag.description,
    severity: flag.severity,
    category: flag.category,
    status: flag.status,
    owner: flag.owner,
    identified_at: flag.identifiedAt,
    target_resolution_date: flag.targetResolutionDate ?? null,
  }
}

function decisionFromDb(row: any): Decision {
  return {
    id: row.id,
    date: row.date,
    title: row.title,
    status: row.status,
    context: row.context ?? '',
    decision: row.decision ?? '',
    alternatives: row.alternatives ?? '',
    consequences: row.consequences ?? '',
    tags: row.tags ?? [],
  }
}

function decisionToDb(decision: Decision, userId: string) {
  return {
    id: decision.id,
    user_id: userId,
    date: decision.date,
    title: decision.title,
    status: decision.status,
    context: decision.context,
    decision: decision.decision,
    alternatives: decision.alternatives,
    consequences: decision.consequences,
    tags: decision.tags,
  }
}

function noteFromDb(row: any): Note {
  return {
    id: row.id,
    title: row.title ?? '',
    content: row.content ?? '',
    pinned: row.pinned ?? false,
    tags: row.tags ?? [],
    updatedAt: row.updated_at ?? new Date().toISOString(),
  }
}

function noteToDb(note: Note, userId: string) {
  return {
    id: note.id,
    user_id: userId,
    title: note.title,
    content: note.content,
    pinned: note.pinned,
    tags: note.tags,
  }
}

function retroFromDb(row: any): Retro {
  return {
    id: row.id,
    date: row.date,
    type: row.type,
    field1: row.field1 ?? '',
    field2: row.field2 ?? '',
    field3: row.field3 ?? '',
    mood: row.mood ?? 3,
    energy: row.energy ?? 3,
    notes: row.notes ?? '',
  }
}

function retroToDb(retro: Retro, userId: string) {
  return {
    id: retro.id,
    user_id: userId,
    date: retro.date,
    type: retro.type,
    field1: retro.field1,
    field2: retro.field2,
    field3: retro.field3,
    mood: retro.mood,
    energy: retro.energy,
    notes: retro.notes,
  }
}

function templateFromDb(row: any): Template {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? '',
    category: row.category ?? 'custom',
    content: row.content ?? '',
    usageCount: row.usage_count ?? 0,
  }
}

function templateToDb(template: Template, userId: string) {
  return {
    id: template.id,
    user_id: userId,
    name: template.name,
    description: template.description,
    category: template.category,
    content: template.content,
    usage_count: template.usageCount,
  }
}

function resetDataState() {
  return {
    tasks: [],
    flags: [],
    decisions: [],
    notes: [],
    retros: [],
    templates: [],
    mit: { date: todayKey(), completed: false },
    pomodoro: emptyPomodoro,
  }
}

const useAppStore = create<AppState>()((set, get) => ({
  currentUser: null,
  authReady: false,
  dataLoading: false,
  dataError: undefined,
  ...resetDataState(),
  theme: 'dark',
  accentColor: '#8b5cf6',
  onboardingDone: false,
  initialize: async () => {
    if (!hasSupabaseConfig || !supabase) {
      set({ authReady: true, dataError: 'Supabase env не настроены' })
      return
    }
    const { data, error } = await supabase.auth.getSession()
    if (error) {
      console.error(error)
      set({ authReady: true, dataError: 'Не удалось восстановить сессию' })
      return
    }
    const user = data.session?.user ?? null
    set({ currentUser: user, authReady: true })
    if (user) await get().loadData()
    supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') set({ currentUser: null, ...resetDataState() })
      if (event === 'SIGNED_IN' && session?.user) {
        set({ currentUser: session.user })
        void get().loadData()
      }
    })
  },
  loadData: async () => {
    const user = get().currentUser
    if (!user) return
    const client = getClient()
    set({ dataLoading: true, dataError: undefined })
    try {
      const [tasksRes, flagsRes, decisionsRes, notesRes, retrosRes, templatesRes, mitRes, profileRes] = await Promise.all([
        client.from('tasks').select('*').order('position', { ascending: true }).order('created_at', { ascending: false }),
        client.from('red_flags').select('*').order('created_at', { ascending: false }),
        client.from('decisions').select('*').order('date', { ascending: false }),
        client.from('notes').select('*').order('updated_at', { ascending: false }),
        client.from('retros').select('*').order('date', { ascending: false }),
        client.from('user_templates').select('*').order('created_at', { ascending: false }),
        client.from('daily_mit').select('*').eq('date', todayKey()).maybeSingle(),
        client.from('profiles').select('theme, accent_color').eq('id', user.id).maybeSingle(),
      ])
      const firstError = [tasksRes, flagsRes, decisionsRes, notesRes, retrosRes, templatesRes, mitRes, profileRes].find((res) => res.error)?.error
      if (firstError) throw firstError
      set({
        tasks: (tasksRes.data ?? []).map(taskFromDb),
        flags: (flagsRes.data ?? []).map(flagFromDb),
        decisions: (decisionsRes.data ?? []).map(decisionFromDb),
        notes: (notesRes.data ?? []).map(noteFromDb),
        retros: (retrosRes.data ?? []).map(retroFromDb),
        templates: (templatesRes.data ?? []).map(templateFromDb),
        mit: mitRes.data ? { date: mitRes.data.date, taskId: mitRes.data.task_id ?? undefined, completed: mitRes.data.completed ?? false } : { date: todayKey(), completed: false },
        theme: profileRes.data?.theme ?? get().theme,
        accentColor: profileRes.data?.accent_color === '#f0542d' ? '#8b5cf6' : profileRes.data?.accent_color ?? get().accentColor,
        dataLoading: false,
      })
    } catch (error) {
      console.error(error)
      set({ dataLoading: false, dataError: 'Не удалось загрузить данные из Supabase' })
      toast.error('Не удалось загрузить данные из Supabase')
    }
  },
  signIn: async (email, password) => {
    const { error } = await getClient().auth.signInWithPassword({ email, password })
    if (error) throw error
  },
  signUp: async (email, password) => {
    const { error } = await getClient().auth.signUp({
      email,
      password,
      options: {
        data: { display_name: email.split('@')[0] },
        emailRedirectTo: window.location.origin,
      },
    })
    if (error) throw error
  },
  signOut: async () => {
    const { error } = await getClient().auth.signOut()
    if (error) throw error
    set({ currentUser: null, ...resetDataState() })
  },
  createTask: async (input) => {
    const user = get().currentUser
    if (!user) return
    const now = new Date().toISOString()
    const task: Task = { ...input, id: uid(), actualMinutes: 0, pomodoroSessions: 0, position: get().tasks.length + 1, createdAt: now, updatedAt: now }
    const prev = get().tasks
    set({ tasks: [task, ...prev] })
    const { error } = await getClient().from('tasks').insert(taskToDb(task, user.id))
    if (error) {
      console.error(error)
      set({ tasks: prev })
      toast.error('Не удалось сохранить задачу. Проверьте подключение')
      return
    }
    toast.success('Задача создана')
  },
  updateTask: async (id, patch) => {
    const user = get().currentUser
    if (!user) return
    const prev = get().tasks
    const nextTasks = prev.map((task) => (task.id === id ? { ...task, ...patch, updatedAt: new Date().toISOString() } : task))
    const nextTask = nextTasks.find((task) => task.id === id)
    if (!nextTask) return
    set({ tasks: nextTasks })
    const { error } = await getClient().from('tasks').update(taskToDb(nextTask, user.id)).eq('id', id)
    if (error) {
      console.error(error)
      set({ tasks: prev })
      toast.error('Не удалось сохранить задачу. Проверьте подключение')
    }
  },
  deleteTask: async (id) => {
    const prevTasks = get().tasks
    const prevMit = get().mit
    set({ tasks: prevTasks.filter((item) => item.id !== id), mit: prevMit.taskId === id ? { date: todayKey(), completed: false } : prevMit })
    const { error } = await getClient().from('tasks').delete().eq('id', id)
    if (error) {
      console.error(error)
      set({ tasks: prevTasks, mit: prevMit })
      toast.error('Не удалось удалить задачу')
      return
    }
    if (prevMit.taskId === id) await get().setMit(undefined)
    toast.success('Задача удалена')
  },
  moveTask: (id, status) => {
    const current = get().tasks.find((task) => task.id === id)
    if (!current) return false
    if (status === 'progress') {
      const activeProgress = get().tasks.filter((task) => task.status === 'progress' && task.id !== id).length
      if (activeProgress >= WIP_LIMIT) {
        toast.error('WIP-лимит: в работе может быть не больше 3 задач')
        return false
      }
    }
    void get().updateTask(id, { status, completedAt: status === 'done' ? new Date().toISOString() : current.completedAt })
    return true
  },
  bulkMove: async (ids, status) => {
    const canMoveToProgress = status !== 'progress' || get().tasks.filter((task) => task.status === 'progress' && !ids.includes(task.id)).length + ids.length <= WIP_LIMIT
    if (!canMoveToProgress) {
      toast.error('Bulk action отменён: превышен WIP-лимит')
      return
    }
    const prev = get().tasks
    const next = prev.map((task) => (ids.includes(task.id) ? { ...task, status, completedAt: status === 'done' ? new Date().toISOString() : task.completedAt, updatedAt: new Date().toISOString() } : task))
    set({ tasks: next })
    const { error } = await getClient().from('tasks').update({ status, completed_at: status === 'done' ? new Date().toISOString() : null }).in('id', ids)
    if (error) {
      console.error(error)
      set({ tasks: prev })
      toast.error('Не удалось обновить задачи')
      return
    }
    toast.success('Задачи обновлены')
  },
  setMit: async (taskId) => {
    const user = get().currentUser
    if (!user) return
    const prev = get().mit
    const mit = { date: todayKey(), taskId, completed: false }
    set({ mit })
    const { error } = await getClient().from('daily_mit').upsert({ user_id: user.id, date: mit.date, task_id: taskId ?? null, completed: false })
    if (error) {
      console.error(error)
      set({ mit: prev })
      toast.error('Не удалось сохранить MIT')
      return
    }
    toast.success(taskId ? 'MIT выбран' : 'MIT сброшен')
  },
  toggleTheme: () => {
    const next = get().theme === 'dark' ? 'light' : 'dark'
    set({ theme: next })
    const user = get().currentUser
    if (user) void getClient().from('profiles').update({ theme: next }).eq('id', user.id)
  },
  setOnboardingDone: () => set({ onboardingDone: true }),
  startPomodoro: (taskId) => {
    if ('Notification' in window && Notification.permission === 'default') void Notification.requestPermission()
    set({ pomodoro: { ...get().pomodoro, running: true, taskId, startedAt: get().pomodoro.startedAt ?? new Date().toISOString() } })
  },
  pausePomodoro: () => set({ pomodoro: { ...get().pomodoro, running: false } }),
  stopPomodoro: (interrupted = true) => {
    const p = get().pomodoro
    if (!interrupted && p.mode === 'focus' && p.taskId) {
      const minutes = Math.round((FOCUS_SECONDS - p.secondsLeft) / 60) || 25
      const task = get().tasks.find((item) => item.id === p.taskId)
      if (task) void get().updateTask(task.id, { actualMinutes: task.actualMinutes + minutes, pomodoroSessions: task.pomodoroSessions + 1 })
    }
    set({ pomodoro: emptyPomodoro })
  },
  tickPomodoro: () => {
    const p = get().pomodoro
    if (!p.running) return
    if (p.secondsLeft > 1) {
      set({ pomodoro: { ...p, secondsLeft: p.secondsLeft - 1 } })
      return
    }
    if (p.mode === 'focus' && p.taskId) {
      const task = get().tasks.find((item) => item.id === p.taskId)
      if (task) void get().updateTask(task.id, { actualMinutes: task.actualMinutes + 25, pomodoroSessions: task.pomodoroSessions + 1 })
    }
    const nextCycles = p.mode === 'focus' ? p.cyclesCompleted + 1 : p.cyclesCompleted
    const nextMode = p.mode === 'focus' ? (nextCycles % 4 === 0 ? 'long_break' : 'short_break') : 'focus'
    const nextSeconds = nextMode === 'focus' ? FOCUS_SECONDS : nextMode === 'long_break' ? LONG_BREAK_SECONDS : SHORT_BREAK_SECONDS
    if ('Notification' in window && Notification.permission === 'granted') new Notification(p.mode === 'focus' ? 'Фокус завершён' : 'Перерыв завершён')
    toast.success(p.mode === 'focus' ? 'Фокус завершён' : 'Перерыв завершён')
    set({ pomodoro: { ...p, mode: nextMode, secondsLeft: nextSeconds, cyclesCompleted: nextCycles, running: false, startedAt: undefined } })
  },
  upsertFlag: async (flag) => {
    const user = get().currentUser
    if (!user) return
    const prev = get().flags
    const exists = prev.some((item) => item.id === flag.id)
    set({ flags: exists ? prev.map((item) => (item.id === flag.id ? flag : item)) : [flag, ...prev] })
    const { error } = await getClient().from('red_flags').upsert(flagToDb(flag, user.id))
    if (error) {
      console.error(error)
      set({ flags: prev })
      toast.error('Не удалось сохранить флаг')
    }
  },
  upsertDecision: async (decision) => {
    const user = get().currentUser
    if (!user) return
    const prev = get().decisions
    const exists = prev.some((item) => item.id === decision.id)
    set({ decisions: exists ? prev.map((item) => (item.id === decision.id ? decision : item)) : [decision, ...prev] })
    const { error } = await getClient().from('decisions').upsert(decisionToDb(decision, user.id))
    if (error) {
      console.error(error)
      set({ decisions: prev })
      toast.error('Не удалось сохранить решение')
      return
    }
    toast.success('Решение сохранено')
  },
  upsertNote: async (note) => {
    const user = get().currentUser
    if (!user) return
    const nextNote = { ...note, updatedAt: new Date().toISOString() }
    const prev = get().notes
    const exists = prev.some((item) => item.id === nextNote.id)
    set({ notes: exists ? prev.map((item) => (item.id === nextNote.id ? nextNote : item)) : [nextNote, ...prev] })
    const { error } = await getClient().from('notes').upsert(noteToDb(nextNote, user.id))
    if (error) {
      console.error(error)
      set({ notes: prev })
      toast.error('Не удалось сохранить заметку')
    }
  },
  upsertRetro: async (retro) => {
    const user = get().currentUser
    if (!user) return
    const prev = get().retros
    const exists = prev.some((item) => item.id === retro.id)
    set({ retros: exists ? prev.map((item) => (item.id === retro.id ? retro : item)) : [retro, ...prev] })
    const { error } = await getClient().from('retros').upsert(retroToDb(retro, user.id))
    if (error) {
      console.error(error)
      set({ retros: prev })
      toast.error('Не удалось сохранить ретро')
      return
    }
    toast.success('Ретро сохранено')
  },
  useTemplate: async (id) => {
    const template = get().templates.find((item) => item.id === id)
    if (!template) return
    const next = { ...template, usageCount: template.usageCount + 1 }
    set({ templates: get().templates.map((item) => (item.id === id ? next : item)) })
    const user = get().currentUser
    if (user) await getClient().from('user_templates').upsert(templateToDb(next, user.id))
  },
  importData: async (data) => {
    const user = get().currentUser
    if (!user) return
    const client = getClient()
    const operations = []
    if (data.tasks?.length) operations.push(client.from('tasks').upsert(data.tasks.map((task) => taskToDb(task, user.id))))
    if (data.flags?.length) operations.push(client.from('red_flags').upsert(data.flags.map((flag) => flagToDb(flag, user.id))))
    if (data.decisions?.length) operations.push(client.from('decisions').upsert(data.decisions.map((decision) => decisionToDb(decision, user.id))))
    if (data.notes?.length) operations.push(client.from('notes').upsert(data.notes.map((note) => noteToDb(note, user.id))))
    if (data.retros?.length) operations.push(client.from('retros').upsert(data.retros.map((retro) => retroToDb(retro, user.id))))
    if (data.templates?.length) operations.push(client.from('user_templates').upsert(data.templates.map((template) => templateToDb(template, user.id))))
    const results = await Promise.all(operations)
    const error = results.find((result) => result.error)?.error
    if (error) {
      console.error(error)
      toast.error('Не удалось импортировать данные')
      return
    }
    await get().loadData()
    toast.success('Данные импортированы')
  },
}))

function App() {
  const [page, setPage] = useState<Page>('today')
  const [taskModalOpen, setTaskModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | undefined>()
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [hotkeysOpen, setHotkeysOpen] = useState(false)
  const { theme, accentColor, tickPomodoro, pomodoro, toggleTheme, onboardingDone, setOnboardingDone, initialize, authReady, currentUser, dataLoading, dataError } = useAppStore()

  useEffect(() => {
    void initialize()
  }, [initialize])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.documentElement.style.setProperty('--accent', accentColor)
  }, [theme, accentColor])

  useEffect(() => {
    const id = window.setInterval(() => tickPomodoro(), 1000)
    return () => window.clearInterval(id)
  }, [tickPomodoro])

  useHotkeys('mod+k', (event) => {
    event.preventDefault()
    setPaletteOpen(true)
  })
  useHotkeys('c', () => setTaskModalOpen(true), { enableOnFormTags: false })
  useHotkeys('?', () => setHotkeysOpen(true), { enableOnFormTags: false })
  useHotkeys('p', () => {
    const store = useAppStore.getState()
    if (store.pomodoro.running) store.pausePomodoro()
    else store.startPomodoro(store.mit.taskId)
  }, { enableOnFormTags: false })
  useHotkeys('g t', () => setPage('today'), { enableOnFormTags: false })
  useHotkeys('g b', () => setPage('board'), { enableOnFormTags: false })
  useHotkeys('g i', () => setPage('inbox'), { enableOnFormTags: false })
  useHotkeys('g l', () => setPage('backlog'), { enableOnFormTags: false })
  useHotkeys('g c', () => setPage('calendar'), { enableOnFormTags: false })
  useHotkeys('g n', () => setPage('notes'), { enableOnFormTags: false })
  useHotkeys('g d', () => setPage('decisions'), { enableOnFormTags: false })
  useHotkeys('g f', () => setPage('flags'), { enableOnFormTags: false })
  useHotkeys('g a', () => setPage('analytics'), { enableOnFormTags: false })
  useHotkeys('g s', () => setPage('settings'), { enableOnFormTags: false })

  const renderPage = () => {
    switch (page) {
      case 'today':
        return <TodayPage openTask={(task) => { setEditingTask(task); setTaskModalOpen(true) }} />
      case 'board':
        return <BoardPage openTask={(task) => { setEditingTask(task); setTaskModalOpen(true) }} />
      case 'inbox':
        return <TaskListPage mode="inbox" openTask={(task) => { setEditingTask(task); setTaskModalOpen(true) }} />
      case 'backlog':
        return <TaskListPage mode="backlog" openTask={(task) => { setEditingTask(task); setTaskModalOpen(true) }} />
      case 'calendar':
        return <CalendarPage />
      case 'flags':
        return <FlagsPage />
      case 'decisions':
        return <DecisionsPage />
      case 'retros':
        return <RetrosPage />
      case 'templates':
        return <TemplatesPage />
      case 'notes':
        return <NotesPage />
      case 'analytics':
        return <AnalyticsPage />
      case 'settings':
        return <SettingsPage />
      default:
        return null
    }
  }

  if (!hasSupabaseConfig) {
    return <ConfigRequiredPage />
  }

  if (!authReady) {
    return <FullPageState title="Загрузка" text="Восстанавливаем сессию Supabase." />
  }

  if (!currentUser) {
    return <LoginPage />
  }

  return (
    <div className="min-h-screen bg-cockpit-bg text-cockpit-text">
      <div className="flex min-h-screen">
        <Sidebar page={page} setPage={setPage} />
        <main className="min-w-0 flex-1">
          <TopBar page={page} setPage={setPage} onCreate={() => { setEditingTask(undefined); setTaskModalOpen(true) }} onPalette={() => setPaletteOpen(true)} onTheme={toggleTheme} />
          {dataError && (
            <div className="mx-4 mt-4 rounded border border-[var(--danger)] bg-cockpit-card p-3 text-[var(--danger)] md:mx-6">
              {dataError}
            </div>
          )}
          {dataLoading && (
            <div className="mx-4 mt-4 rounded border border-[var(--border-primary)] bg-cockpit-card p-3 text-[var(--text-secondary)] md:mx-6">
              Загрузка данных из Supabase...
            </div>
          )}
          {renderPage()}
        </main>
      </div>
      <TaskFormModal open={taskModalOpen} task={editingTask} onClose={() => { setTaskModalOpen(false); setEditingTask(undefined) }} />
      <CommandPalette open={paletteOpen} setOpen={setPaletteOpen} setPage={setPage} openTask={(task) => { setEditingTask(task); setTaskModalOpen(true) }} />
      <HotkeysModal open={hotkeysOpen} onClose={() => setHotkeysOpen(false)} />
      {!onboardingDone && <Onboarding onClose={setOnboardingDone} onCreate={() => setTaskModalOpen(true)} />}
      {pomodoro.running && <PomodoroFloating setPage={setPage} />}
    </div>
  )
}

function ConfigRequiredPage() {
  return (
    <FullPageState
      title="Supabase не настроен"
      text="Добавьте VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY в Vercel Environment Variables и в локальный .env.local."
    />
  )
}

function FullPageState({ title, text }: { title: string; text: string }) {
  return (
    <div className="grid min-h-screen place-items-center bg-cockpit-bg p-4 text-cockpit-text">
      <div className="card w-full max-w-xl p-8">
        <div className="mb-5 grid h-12 w-12 place-items-center rounded-lg border border-[var(--border-accent)] bg-[var(--accent-soft)] text-[var(--accent)]">
          <LayoutDashboard size={22} />
        </div>
        <div className="text-display text-3xl leading-tight">{title}</div>
        <p className="mt-3 text-[var(--text-secondary)]">{text}</p>
      </div>
    </div>
  )
}

function LoginPage() {
  const signIn = useAppStore((state) => state.signIn)
  const signUp = useAppStore((state) => state.signUp)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    if (!email || !password) {
      toast.error('Введите email и пароль')
      return
    }
    setLoading(true)
    try {
      if (mode === 'login') {
        await signIn(email, password)
      } else {
        await signUp(email, password)
        toast.success('Аккаунт создан')
      }
    } catch (error) {
      console.error(error)
      const message = error instanceof Error ? error.message : 'Unknown error'
      toast.error(`${mode === 'login' ? 'Не удалось войти' : 'Не удалось создать аккаунт'}: ${message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-cockpit-bg p-4 text-cockpit-text">
      <div className="card w-full max-w-md p-7">
        <div className="mb-6 flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-lg border border-[var(--border-accent)] bg-[var(--accent-soft)] text-[var(--accent)]">
            <LayoutDashboard size={18} />
          </div>
          <div>
            <div className="text-display text-2xl leading-none">PM Cockpit</div>
            <div className="mt-1 text-[11px] font-semibold text-[var(--text-tertiary)]">Supabase Auth</div>
          </div>
        </div>
        <div className="grid gap-3">
          <label>
            <span className="mb-1 block text-[10px] uppercase text-[var(--text-tertiary)]">Email</span>
            <input className="input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>
          <label>
            <span className="mb-1 block text-[10px] uppercase text-[var(--text-tertiary)]">Пароль</span>
            <input className="input" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </label>
        </div>
        <button className="btn btn-primary mt-5 w-full" disabled={loading} onClick={submit}>
          {mode === 'login' ? 'Войти' : 'Создать аккаунт'}
        </button>
        <button className="btn mt-3 w-full" disabled={loading} onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}>
          {mode === 'login' ? 'Регистрация' : 'У меня есть аккаунт'}
        </button>
      </div>
    </div>
  )
}

function Sidebar({ page, setPage }: { page: Page; setPage: (page: Page) => void }) {
  const items: Array<{ id: Page; label: string; icon: typeof Target }> = [
    { id: 'today', label: 'Today', icon: Target },
    { id: 'board', label: 'Board', icon: KanbanSquare },
    { id: 'inbox', label: 'Inbox', icon: Inbox },
    { id: 'backlog', label: 'Backlog', icon: ListChecks },
    { id: 'calendar', label: 'Календарь', icon: CalendarDays },
    { id: 'flags', label: 'Флаги', icon: ShieldAlert },
    { id: 'decisions', label: 'Решения', icon: BookOpen },
    { id: 'retros', label: 'Ретро', icon: RefreshCcw },
    { id: 'templates', label: 'Шаблоны', icon: FileText },
    { id: 'notes', label: 'Заметки', icon: NotebookPen },
    { id: 'analytics', label: 'Аналитика', icon: BarChart3 },
    { id: 'settings', label: 'Настройки', icon: Settings },
  ]
  return (
    <aside className="sticky top-0 hidden h-screen w-[272px] shrink-0 border-r border-[var(--border-primary)] bg-cockpit-panel p-4 lg:block">
      <div className="mb-6 flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-lg border border-[var(--border-accent)] bg-[var(--accent-soft)] text-[var(--accent)]">
          <LayoutDashboard size={18} />
        </div>
        <div>
          <div className="text-display text-lg leading-none">PM Cockpit</div>
          <div className="mt-1 text-[11px] font-semibold text-[var(--text-tertiary)]">SmartBooking</div>
        </div>
      </div>
      <nav className="space-y-1">
        {items.map((item) => {
          const Icon = item.icon
          const active = page === item.id
          return (
            <button
              key={item.id}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[13px] font-semibold transition ${active ? 'bg-[var(--accent)] text-white shadow-lg shadow-violet-950/30' : 'text-[var(--text-secondary)] hover:bg-cockpit-hover hover:text-[var(--text-primary)]'}`}
              onClick={() => setPage(item.id)}
            >
              <Icon size={15} />
              <span>{item.label}</span>
            </button>
          )
        })}
      </nav>
    </aside>
  )
}

function TopBar({ page, setPage, onCreate, onPalette, onTheme }: { page: Page; setPage: (page: Page) => void; onCreate: () => void; onPalette: () => void; onTheme: () => void }) {
  const theme = useAppStore((state) => state.theme)
  const signOut = useAppStore((state) => state.signOut)
  const openFlags = useAppStore((state) => state.flags.filter((flag) => flag.status === 'open').length)
  const p0 = useAppStore((state) => state.tasks.filter((task) => task.priority === 'P0' && task.status !== 'done' && task.status !== 'archived').length)
  const mobilePages: Array<{ id: Page; label: string }> = [
    { id: 'today', label: 'Today' },
    { id: 'board', label: 'Board' },
    { id: 'inbox', label: 'Inbox' },
    { id: 'analytics', label: 'Аналитика' },
  ]
  return (
    <header className="sticky top-0 z-20 border-b border-[var(--border-primary)] bg-cockpit-bg/90 px-4 py-3 shadow-[0_18px_40px_rgba(0,0,0,0.16)] backdrop-blur-xl md:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[10px] uppercase text-[var(--text-tertiary)]">
            <span>{format(new Date(), 'EEEE, d MMMM', { locale: ru })}</span>
            <span className="hidden sm:inline">/ Asia/Tashkent</span>
          </div>
          <h1 className="text-display mt-1 text-3xl leading-tight">{pageTitle(page)}</h1>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn hidden lg:inline-flex" onClick={onPalette}>
            <Command size={15} /> Cmd+K
          </button>
          <button className="btn hidden lg:inline-flex" onClick={() => setPage('flags')}>
            <AlertTriangle size={15} /> {openFlags}
          </button>
          <button className="btn hidden lg:inline-flex" onClick={() => setPage('today')}>
            <Flame size={15} /> P0: {p0}
          </button>
          <button className="btn" aria-label="Переключить тему" onClick={onTheme}>
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>
          <button className="btn hidden lg:inline-flex" onClick={() => void signOut()}>
            Выйти
          </button>
          <button className="btn btn-primary" onClick={onCreate}>
            <Plus size={15} /> <span className="hidden lg:inline">Создать</span>
          </button>
        </div>
      </div>
      <div className="mt-3 flex gap-2 overflow-x-auto lg:hidden">
        {mobilePages.map((item) => (
          <button key={item.id} className={`badge whitespace-nowrap ${page === item.id ? 'border-[var(--accent)] text-[var(--accent)]' : ''}`} onClick={() => setPage(item.id)}>
            {item.label}
          </button>
        ))}
      </div>
    </header>
  )
}

function pageTitle(page: Page) {
  const titles: Record<Page, string> = {
    today: 'Сегодня',
    board: 'Kanban',
    inbox: 'Inbox',
    backlog: 'Backlog',
    calendar: 'Календарь',
    flags: 'Системные флаги',
    decisions: 'Журнал решений',
    retros: 'Ретроспективы',
    templates: 'Шаблоны',
    notes: 'Заметки',
    analytics: 'Аналитика',
    settings: 'Настройки',
  }
  return titles[page]
}

function TodayPage({ openTask }: { openTask: (task: Task) => void }) {
  const tasks = useAppStore((state) => state.tasks)
  const mit = useAppStore((state) => state.mit)
  const setMit = useAppStore((state) => state.setMit)
  const activeTask = tasks.find((task) => task.id === mit.taskId)
  const todayTasks = tasks.filter((task) => task.dueDate && isToday(parseISO(task.dueDate)) && task.status !== 'archived')
  const p0Tasks = tasks.filter((task) => task.priority === 'P0' && task.status !== 'done' && task.status !== 'archived')
  const now = new Date()
  const day = now.getDay()
  const afterWork = now.getHours() >= 17

  useEffect(() => {
    if (mit.date !== todayKey()) {
      useAppStore.setState({ mit: { date: todayKey(), completed: false } })
    }
  }, [mit.date])

  return (
    <PageShell>
      <div className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
        <section className="card p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-[10px] uppercase text-[var(--text-tertiary)]">MIT</div>
              <h2 className="text-display mt-2 text-3xl">Главная задача дня</h2>
            </div>
            {activeTask && <PriorityBadge priority={activeTask.priority} />}
          </div>
          {activeTask ? (
            <div className="mt-5">
              <button className="wrap-anywhere block max-w-full text-left text-xl font-semibold hover:text-[var(--accent)]" onClick={() => openTask(activeTask)}>
                {activeTask.title}
              </button>
              <p className="mt-3 max-w-3xl text-[var(--text-secondary)]">{activeTask.description}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="badge">{activeTask.project}</span>
                <span className="badge">{activeTask.type}</span>
                <span className="badge">{activeTask.effort}</span>
                <span className="badge">{activeTask.actualMinutes} мин</span>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                <button className="btn btn-primary" onClick={() => useAppStore.getState().startPomodoro(activeTask.id)}>
                  <Play size={15} /> Фокус
                </button>
                <button className="btn" onClick={() => setMit(undefined)}>
                  <X size={15} /> Сбросить MIT
                </button>
              </div>
            </div>
          ) : (
            <EmptyState title="MIT не выбран" text="Выберите одну задачу, которая должна сдвинуть день." />
          )}
        </section>
        <PomodoroPanel />
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <StatCard label="P0 открыто" value={p0Tasks.length.toString()} icon={Flame} tone="danger" />
        <StatCard label="Сегодня задач" value={todayTasks.length.toString()} icon={CalendarDays} />
        <StatCard label="Фокус сегодня" value={`${tasks.reduce((sum, task) => sum + task.actualMinutes, 0)} мин`} icon={Clock3} />
      </div>
      {(day === 1 || day === 5 || afterWork) && (
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {day === 1 && <Nudge text="Понедельник. Спланируйте неделю и выберите MIT." />}
          {day === 5 && <Nudge text="Пятница. Самое время сделать ретро недели." />}
          {afterWork && <Nudge text="После 17:00. Запишите короткое EOD-ретро." />}
        </div>
      )}
      <section className="mt-4 grid gap-4 xl:grid-cols-[0.7fr_1fr]">
        <div className="card p-5">
          <SectionHeader title="Выбрать MIT" subtitle="Открытые P0/P1 задачи" />
          <div className="mt-4 space-y-2">
            {tasks.filter((task) => task.status !== 'done' && task.status !== 'archived').slice(0, 8).map((task) => (
              <button key={task.id} className="w-full rounded border border-[var(--border-primary)] p-3 text-left hover:border-[var(--accent)]" onClick={() => setMit(task.id)}>
                <div className="flex items-center justify-between gap-2">
                  <span>{task.title}</span>
                  <PriorityBadge priority={task.priority} />
                </div>
                <div className="mt-2 text-[11px] text-[var(--text-tertiary)]">{task.project} / {STATUS_LABELS[task.status]}</div>
              </button>
            ))}
          </div>
        </div>
        <div className="card p-5">
          <SectionHeader title="Сегодня" subtitle="Дедлайны и быстрый список" />
          <TaskTable tasks={todayTasks.length ? todayTasks : tasks.slice(0, 6)} openTask={openTask} />
        </div>
      </section>
    </PageShell>
  )
}

function PomodoroPanel() {
  const pomodoro = useAppStore((state) => state.pomodoro)
  const start = useAppStore((state) => state.startPomodoro)
  const pause = useAppStore((state) => state.pausePomodoro)
  const stop = useAppStore((state) => state.stopPomodoro)
  const mit = useAppStore((state) => state.mit)
  const total = pomodoro.mode === 'focus' ? FOCUS_SECONDS : pomodoro.mode === 'long_break' ? LONG_BREAK_SECONDS : SHORT_BREAK_SECONDS
  const progress = 1 - pomodoro.secondsLeft / total
  const radius = 54
  const circumference = 2 * Math.PI * radius
  return (
    <section className="card p-5">
      <SectionHeader title="Pomodoro" subtitle={pomodoro.mode === 'focus' ? 'Фокус' : 'Перерыв'} />
      <div className="mt-5 grid place-items-center">
        <svg width="150" height="150" viewBox="0 0 150 150" aria-label="Pomodoro progress">
          <circle cx="75" cy="75" r={radius} fill="none" stroke="var(--border-primary)" strokeWidth="8" />
          <circle
            cx="75"
            cy="75"
            r={radius}
            fill="none"
            stroke="var(--accent)"
            strokeLinecap="round"
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - progress)}
            transform="rotate(-90 75 75)"
            className="transition-all duration-500"
          />
          <text x="75" y="80" textAnchor="middle" fill="var(--text-primary)" fontSize="24" fontFamily="JetBrains Mono" fontWeight="700">
            {formatSeconds(pomodoro.secondsLeft)}
          </text>
        </svg>
      </div>
      <div className="mt-5 flex justify-center gap-2">
        {pomodoro.running ? (
          <button className="btn" onClick={pause}><Pause size={15} /> Пауза</button>
        ) : (
          <button className="btn btn-primary" onClick={() => start(mit.taskId)}><Play size={15} /> Старт</button>
        )}
        <button className="btn" onClick={() => stop(true)}><X size={15} /> Стоп</button>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 text-center">
        <div className="rounded border border-[var(--border-primary)] p-3">
          <div className="text-lg font-bold">{pomodoro.cyclesCompleted}</div>
          <div className="text-[10px] uppercase text-[var(--text-tertiary)]">Циклов</div>
        </div>
        <div className="rounded border border-[var(--border-primary)] p-3">
          <div className="text-lg font-bold">{pomodoro.running ? 'Идёт' : 'Пауза'}</div>
          <div className="text-[10px] uppercase text-[var(--text-tertiary)]">Статус</div>
        </div>
      </div>
    </section>
  )
}

function BoardPage({ openTask }: { openTask: (task: Task) => void }) {
  const tasks = useAppStore((state) => state.tasks)
  const moveTask = useAppStore((state) => state.moveTask)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const visibleTasks = tasks.filter((task) => task.status !== 'archived')
  return (
    <PageShell wide>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase text-[var(--text-tertiary)]">Hard rule</div>
          <div className="mt-1">WIP-лимит в колонке «В работе»: {WIP_LIMIT}</div>
        </div>
        <div className="badge">Drag and drop включён</div>
      </div>
      <div className="grid gap-3 xl:grid-cols-6">
        {BOARD_STATUSES.map((status) => {
          const columnTasks = visibleTasks.filter((task) => task.status === status).sort((a, b) => a.position - b.position)
          return (
            <section
              key={status}
              className="min-h-[360px] rounded-lg border border-[var(--border-primary)] bg-cockpit-panel p-3"
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => {
                if (draggingId) moveTask(draggingId, status)
                setDraggingId(null)
              }}
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="font-semibold">{STATUS_LABELS[status]}</h2>
                <span className={`badge ${status === 'progress' && columnTasks.length >= WIP_LIMIT ? 'border-[var(--warning)] text-[var(--warning)]' : ''}`}>{columnTasks.length}</span>
              </div>
              <div className="space-y-2">
                {columnTasks.map((task) => (
                  <TaskCard key={task.id} task={task} openTask={openTask} onDragStart={() => setDraggingId(task.id)} />
                ))}
                {!columnTasks.length && <div className="rounded border border-dashed border-[var(--border-primary)] p-4 text-[var(--text-tertiary)]">Пусто</div>}
              </div>
            </section>
          )
        })}
      </div>
    </PageShell>
  )
}

function TaskCard({ task, openTask, onDragStart }: { task: Task; openTask: (task: Task) => void; onDragStart?: () => void }) {
  return (
    <article
      draggable
      onDragStart={onDragStart}
      className="rounded-lg border border-[var(--border-primary)] bg-cockpit-card p-3.5 transition hover:border-[var(--accent)] hover:bg-[var(--bg-hover)]"
    >
      <button className="wrap-anywhere block w-full text-left font-semibold leading-snug" onClick={() => openTask(task)}>
        {task.title}
      </button>
      <p className="mt-2 line-clamp-2 text-[11px] leading-relaxed text-[var(--text-tertiary)]">{task.description || task.entryPoint}</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <PriorityBadge priority={task.priority} />
        <span className="badge">{task.project}</span>
        <span className="badge">{task.effort}</span>
      </div>
    </article>
  )
}

function TaskListPage({ mode, openTask }: { mode: 'inbox' | 'backlog'; openTask: (task: Task) => void }) {
  const tasks = useAppStore((state) => state.tasks)
  const bulkMove = useAppStore((state) => state.bulkMove)
  const [selected, setSelected] = useState<string[]>([])
  const [filter, setFilter] = useState<Project | 'all'>('all')
  const list = tasks
    .filter((task) => task.status === mode)
    .filter((task) => filter === 'all' || task.project === filter)
    .sort((a, b) => PRIORITIES.indexOf(a.priority) - PRIORITIES.indexOf(b.priority))
  const toggle = (id: string) => setSelected((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]))
  return (
    <PageShell>
      <div className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SectionHeader title={mode === 'inbox' ? 'Inbox' : 'Backlog'} subtitle="Сортировка по приоритету" />
          <div className="flex flex-wrap gap-2">
            <select className="input w-56" value={filter} onChange={(event) => setFilter(event.target.value as Project | 'all')}>
              <option value="all">Все проекты</option>
              {PROJECTS.map((project) => <option key={project}>{project}</option>)}
            </select>
            <button className="btn" disabled={!selected.length} onClick={() => bulkMove(selected, 'week')}>В неделю</button>
            <button className="btn" disabled={!selected.length} onClick={() => bulkMove(selected, 'archived')}><Archive size={15} /> Архив</button>
          </div>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse">
            <thead className="text-left text-[10px] uppercase text-[var(--text-tertiary)]">
              <tr className="border-b border-[var(--border-primary)]">
                <th className="w-10 py-2"></th>
                <th className="py-2">Задача</th>
                <th>Проект</th>
                <th>Тип</th>
                <th>Приоритет</th>
                <th>Оценка</th>
                <th>Срок</th>
              </tr>
            </thead>
            <tbody>
              {list.map((task) => (
                <tr key={task.id} className="border-b border-[var(--border-primary)]">
                  <td className="py-3"><input type="checkbox" checked={selected.includes(task.id)} onChange={() => toggle(task.id)} /></td>
                  <td className="py-3"><button className="wrap-anywhere text-left hover:text-[var(--accent)]" onClick={() => openTask(task)}>{task.title}</button></td>
                  <td>{task.project}</td>
                  <td>{task.type}</td>
                  <td><PriorityBadge priority={task.priority} /></td>
                  <td>{task.effort}</td>
                  <td>{task.dueDate ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!list.length && <EmptyState title="Пусто" text="Нажмите C или кнопку выше, чтобы создать задачу." />}
        </div>
      </div>
    </PageShell>
  )
}

function CalendarPage() {
  const tasks = useAppStore((state) => state.tasks)
  const grouped = useMemo(() => {
    const byDate = new Map<string, Task[]>()
    tasks.filter((task) => task.dueDate && task.status !== 'archived').forEach((task) => {
      byDate.set(task.dueDate!, [...(byDate.get(task.dueDate!) ?? []), task])
    })
    return Array.from(byDate.entries()).sort(([a], [b]) => a.localeCompare(b))
  }, [tasks])
  return (
    <PageShell>
      <div className="card p-5">
        <SectionHeader title="Календарь" subtitle="Задачи с датами" />
        <div className="mt-4 grid gap-3">
          {grouped.map(([date, items]) => (
            <div key={date} className="rounded border border-[var(--border-primary)] p-4">
              <div className="font-semibold">{format(parseISO(date), 'd MMMM, EEEE', { locale: ru })}</div>
              <div className="mt-3 grid gap-2">
                {items.map((task) => (
                  <div key={task.id} className="flex flex-wrap items-center justify-between gap-2">
                    <span>{task.title}</span>
                    <div className="flex gap-2"><PriorityBadge priority={task.priority} /><span className="badge">{STATUS_LABELS[task.status]}</span></div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {!grouped.length && <EmptyState title="Нет дат" text="Добавьте due date в задаче." />}
        </div>
      </div>
    </PageShell>
  )
}

function FlagsPage() {
  const flags = useAppStore((state) => state.flags)
  const upsertFlag = useAppStore((state) => state.upsertFlag)
  const statuses: Flag['status'][] = ['open', 'in_progress', 'mitigated', 'resolved', 'accepted']
  return (
    <PageShell>
      <div className="grid gap-4 lg:grid-cols-2">
        {flags.map((flag) => (
          <article key={flag.id} className="card p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="mb-2 flex flex-wrap gap-2">
                  <span className="badge" style={{ borderColor: SEVERITY_COLORS[flag.severity], color: SEVERITY_COLORS[flag.severity] }}>{flag.severity}</span>
                  <span className="badge">{flag.category}</span>
                </div>
              <h2 className="wrap-anywhere font-semibold">{flag.title}</h2>
                <p className="mt-2 text-[var(--text-secondary)]">{flag.description || 'Описание не указано'}</p>
              </div>
              <AlertTriangle color={SEVERITY_COLORS[flag.severity]} size={20} />
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <span className="text-[11px] text-[var(--text-tertiary)]">Owner: {flag.owner || '-'}</span>
              <select className="input w-44" value={flag.status} onChange={(event) => upsertFlag({ ...flag, status: event.target.value as Flag['status'] })}>
                {statuses.map((status) => <option key={status}>{status}</option>)}
              </select>
            </div>
          </article>
        ))}
      </div>
    </PageShell>
  )
}

function DecisionsPage() {
  const decisions = useAppStore((state) => state.decisions)
  const upsertDecision = useAppStore((state) => state.upsertDecision)
  const [editing, setEditing] = useState<Decision | null>(null)
  return (
    <PageShell>
      <div className="mb-4 flex justify-end">
        <button className="btn btn-primary" onClick={() => setEditing({ id: uid(), date: todayKey(), title: '', status: 'accepted', context: '', decision: '', alternatives: '', consequences: '', tags: [] })}>
          <Plus size={15} /> Решение
        </button>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {decisions.map((item) => (
          <article key={item.id} className="card p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[10px] uppercase text-[var(--text-tertiary)]">{item.date} / {item.status}</div>
              <h2 className="wrap-anywhere text-display mt-2 text-xl">{item.title}</h2>
              </div>
              <button className="btn" onClick={() => setEditing(item)}><MoreHorizontal size={15} /></button>
            </div>
            <div className="markdown mt-4">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{`**Context:** ${item.context}\n\n**Decision:** ${item.decision}\n\n**Consequences:** ${item.consequences}`}</ReactMarkdown>
            </div>
          </article>
        ))}
      </div>
      {editing && <DecisionModal decision={editing} onClose={() => setEditing(null)} onSave={(decision) => { upsertDecision(decision); setEditing(null) }} />}
    </PageShell>
  )
}

function NotesPage() {
  const notes = useAppStore((state) => state.notes)
  const upsertNote = useAppStore((state) => state.upsertNote)
  const [activeId, setActiveId] = useState(notes[0]?.id)
  const active = notes.find((note) => note.id === activeId) ?? notes[0]
  useHotkeys('n', () => {
    const note: Note = { id: uid(), title: 'Новая заметка', content: '', pinned: false, tags: [], updatedAt: new Date().toISOString() }
    upsertNote(note)
    setActiveId(note.id)
  }, { enableOnFormTags: false })
  return (
    <PageShell wide>
      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <aside className="card p-3">
          <button className="btn btn-primary mb-3 w-full" onClick={() => {
            const note: Note = { id: uid(), title: 'Новая заметка', content: '', pinned: false, tags: [], updatedAt: new Date().toISOString() }
            upsertNote(note)
            setActiveId(note.id)
          }}>
            <Plus size={15} /> Заметка
          </button>
          <div className="space-y-2">
            {notes.map((note) => (
              <button key={note.id} className={`w-full rounded border p-3 text-left ${active?.id === note.id ? 'border-[var(--accent)]' : 'border-[var(--border-primary)]'}`} onClick={() => setActiveId(note.id)}>
                <div className="font-semibold">{note.title || 'Без названия'}</div>
                <div className="mt-1 text-[10px] text-[var(--text-tertiary)]">{format(new Date(note.updatedAt), 'dd.MM HH:mm')}</div>
              </button>
            ))}
          </div>
        </aside>
        {active ? (
          <section className="grid gap-4 xl:grid-cols-2">
            <div className="card p-4">
              <input className="input mb-3" value={active.title} onChange={(event) => upsertNote({ ...active, title: event.target.value, updatedAt: new Date().toISOString() })} />
              <textarea className="input min-h-[520px] resize-y" value={active.content} onChange={(event) => upsertNote({ ...active, content: event.target.value, updatedAt: new Date().toISOString() })} />
            </div>
            <div className="card p-5">
              <SectionHeader title="Preview" subtitle="Markdown" />
              <div className="markdown mt-4">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{active.content || 'Пусто.'}</ReactMarkdown>
              </div>
            </div>
          </section>
        ) : <EmptyState title="Нет заметок" text="Нажмите N, чтобы создать заметку." />}
      </div>
    </PageShell>
  )
}

function RetrosPage() {
  const retros = useAppStore((state) => state.retros)
  const upsertRetro = useAppStore((state) => state.upsertRetro)
  const [type, setType] = useState<Retro['type']>('daily')
  const existing = retros.find((retro) => retro.date === todayKey() && retro.type === type)
  const [draft, setDraft] = useState<Retro>(existing ?? { id: uid(), date: todayKey(), type, field1: '', field2: '', field3: '', mood: 3, energy: 3, notes: '' })
  useEffect(() => {
    const next = retros.find((retro) => retro.date === todayKey() && retro.type === type)
    setDraft(next ?? { id: uid(), date: todayKey(), type, field1: '', field2: '', field3: '', mood: 3, energy: 3, notes: '' })
  }, [type, retros])
  return (
    <PageShell>
      <div className="grid gap-4 lg:grid-cols-[1fr_0.8fr]">
        <section className="card p-5">
          <SectionHeader title="Ретро" subtitle="Daily / Weekly / Monthly" />
          <div className="mt-4 flex gap-2">
            {(['daily', 'weekly', 'monthly'] as const).map((item) => <button key={item} className={`btn ${type === item ? 'btn-primary' : ''}`} onClick={() => setType(item)}>{item}</button>)}
          </div>
          <div className="mt-4 grid gap-3">
            <textarea className="input min-h-24" placeholder={type === 'daily' ? 'Сделано' : type === 'weekly' ? 'Wins' : 'Achievements'} value={draft.field1} onChange={(event) => setDraft({ ...draft, field1: event.target.value })} />
            <textarea className="input min-h-24" placeholder={type === 'daily' ? 'Блокеры' : type === 'weekly' ? 'Stuck' : 'Challenges'} value={draft.field2} onChange={(event) => setDraft({ ...draft, field2: event.target.value })} />
            <textarea className="input min-h-24" placeholder={type === 'daily' ? 'Завтра' : type === 'weekly' ? 'Lessons' : 'Focus next'} value={draft.field3} onChange={(event) => setDraft({ ...draft, field3: event.target.value })} />
            <textarea className="input min-h-24" placeholder="Заметки" value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} />
            <button className="btn btn-primary justify-self-start" onClick={() => upsertRetro(draft)}><Check size={15} /> Сохранить</button>
          </div>
        </section>
        <section className="card p-5">
          <SectionHeader title="История" subtitle={`${retros.length} записей`} />
          <div className="mt-4 space-y-3">
            {retros.slice(0, 8).map((retro) => (
              <div key={retro.id} className="rounded border border-[var(--border-primary)] p-3">
                <div className="text-[10px] uppercase text-[var(--text-tertiary)]">{retro.date} / {retro.type}</div>
                <div className="mt-2 text-[var(--text-secondary)]">{retro.field1 || retro.notes || 'Без текста'}</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </PageShell>
  )
}

function TemplatesPage() {
  const templates = useAppStore((state) => state.templates)
  const useTemplate = useAppStore((state) => state.useTemplate)
  return (
    <PageShell>
      <div className="grid gap-4 lg:grid-cols-3">
        {templates.map((template) => (
          <article key={template.id} className="card p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="badge">{template.category}</span>
                <h2 className="text-display mt-3 text-xl">{template.name}</h2>
              </div>
              <span className="badge">{template.usageCount}</span>
            </div>
            <p className="mt-3 text-[var(--text-secondary)]">{template.description}</p>
            <pre className="mt-4 max-h-60 overflow-auto rounded border border-[var(--border-primary)] bg-cockpit-bg p-3 text-[11px] text-[var(--text-secondary)]">{template.content}</pre>
            <button className="btn mt-4" onClick={() => { navigator.clipboard?.writeText(template.content); useTemplate(template.id); toast.success('Шаблон скопирован') }}>
              <FileText size={15} /> Использовать
            </button>
          </article>
        ))}
      </div>
    </PageShell>
  )
}

function AnalyticsPage() {
  const tasks = useAppStore((state) => state.tasks)
  const flags = useAppStore((state) => state.flags)
  const done = tasks.filter((task) => task.status === 'done')
  const byProject = PROJECTS.map((project) => ({ name: project, value: tasks.filter((task) => task.project === project).length })).filter((item) => item.value)
  const byStatus = BOARD_STATUSES.map((status) => ({ name: STATUS_LABELS[status], value: tasks.filter((task) => task.status === status).length }))
  const weekly = Array.from({ length: 7 }, (_, index) => {
    const date = new Date()
    date.setDate(date.getDate() - (6 - index))
    const key = format(date, 'yyyy-MM-dd')
    return {
      date: format(date, 'dd.MM'),
      done: done.filter((task) => task.completedAt?.startsWith(key)).length,
      focus: tasks.reduce((sum, task) => sum + (task.updatedAt.startsWith(key) ? task.actualMinutes : 0), 0),
    }
  })
  return (
    <PageShell>
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Всего задач" value={tasks.length.toString()} icon={ListChecks} />
        <StatCard label="Done" value={done.length.toString()} icon={Check} tone="success" />
        <StatCard label="Фокус" value={`${tasks.reduce((sum, task) => sum + task.actualMinutes, 0)} мин`} icon={Timer} />
        <StatCard label="Открытые флаги" value={flags.filter((flag) => flag.status === 'open').length.toString()} icon={AlertTriangle} tone="danger" />
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <ChartCard title="Неделя">
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={weekly}>
              <CartesianGrid stroke="var(--border-primary)" />
              <XAxis dataKey="date" stroke="var(--text-tertiary)" />
              <YAxis stroke="var(--text-tertiary)" />
              <Tooltip contentStyle={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)' }} />
              <Area dataKey="focus" stroke="var(--accent)" fill="var(--accent)" fillOpacity={0.2} />
              <Area dataKey="done" stroke="var(--info)" fill="var(--info)" fillOpacity={0.2} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Статусы">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={byStatus}>
              <CartesianGrid stroke="var(--border-primary)" />
              <XAxis dataKey="name" stroke="var(--text-tertiary)" />
              <YAxis stroke="var(--text-tertiary)" />
              <Tooltip contentStyle={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)' }} />
              <Bar dataKey="value" fill="var(--accent)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
      <div className="mt-4">
        <ChartCard title="Проекты">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={byProject} dataKey="value" nameKey="name" outerRadius={110} label>
                {byProject.map((_, index) => <Cell key={index} fill={['#8b5cf6', '#c4b5fd', '#ffffff', '#6d687a', '#a78bfa', '#2c2934', '#d7d5de'][index % 7]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)' }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </PageShell>
  )
}

function SettingsPage() {
  const store = useAppStore()
  const fileRef = useRef<HTMLInputElement | null>(null)
  const exportJson = () => {
    downloadFile('pm-cockpit-export.json', JSON.stringify({
      tasks: store.tasks,
      flags: store.flags,
      decisions: store.decisions,
      notes: store.notes,
      retros: store.retros,
      templates: store.templates,
    }, null, 2), 'application/json')
  }
  const exportCsv = () => {
    const rows = [['title', 'project', 'type', 'priority', 'status', 'dueDate', 'actualMinutes'], ...store.tasks.map((task) => [task.title, task.project, task.type, task.priority, task.status, task.dueDate ?? '', String(task.actualMinutes)])]
    downloadFile('pm-cockpit-tasks.csv', rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n'), 'text/csv')
  }
  return (
    <PageShell>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card p-5">
          <SectionHeader title="Профиль" subtitle="Supabase workspace" />
          <div className="mt-4 grid gap-3">
            <label>
              <span className="mb-1 block text-[10px] uppercase text-[var(--text-tertiary)]">Timezone</span>
              <input className="input" value="Asia/Tashkent" readOnly />
            </label>
            <div className="rounded border border-[var(--border-primary)] p-4">
              <div className="font-semibold">Supabase</div>
              <p className="mt-2 text-[var(--text-secondary)]">
                {hasSupabaseConfig ? 'Переменные окружения найдены. Клиент Supabase готов.' : 'Добавьте VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY в .env.local для подключения БД.'}
              </p>
            </div>
          </div>
        </section>
        <section className="card p-5">
          <SectionHeader title="Данные" subtitle="Экспорт / импорт" />
          <div className="mt-4 flex flex-wrap gap-2">
            <button className="btn" onClick={exportJson}><Download size={15} /> JSON</button>
            <button className="btn" onClick={exportCsv}><Download size={15} /> CSV</button>
            <button className="btn" onClick={() => fileRef.current?.click()}><Upload size={15} /> Импорт</button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (!file) return
                const reader = new FileReader()
                reader.onload = () => {
                  try {
                    store.importData(JSON.parse(String(reader.result)))
                  } catch {
                    toast.error('Не удалось импортировать JSON')
                  }
                }
                reader.readAsText(file)
              }}
            />
          </div>
        </section>
      </div>
    </PageShell>
  )
}

function TaskFormModal({ open, task, onClose }: { open: boolean; task?: Task; onClose: () => void }) {
  const createTask = useAppStore((state) => state.createTask)
  const updateTask = useAppStore((state) => state.updateTask)
  const deleteTask = useAppStore((state) => state.deleteTask)
  const moveTask = useAppStore((state) => state.moveTask)
  const [draft, setDraft] = useState<TaskInput>({
    title: '',
    description: '',
    project: 'Cross-product',
    type: 'feature',
    impact: 'medium',
    effort: 'M',
    priority: 'P2',
    status: 'inbox',
    entryPoint: '',
    acceptanceCriteria: [''],
    tags: [],
  })
  useEffect(() => {
    if (task) {
      const { id: _id, actualMinutes: _a, pomodoroSessions: _p, position: _pos, createdAt: _c, updatedAt: _u, completedAt: _done, ...input } = task
      setDraft(input)
    } else {
      setDraft({ title: '', description: '', project: 'Cross-product', type: 'feature', impact: 'medium', effort: 'M', priority: 'P2', status: 'inbox', entryPoint: '', acceptanceCriteria: [''], tags: [] })
    }
  }, [task, open])
  if (!open) return null
  const requiredFilled = Boolean(draft.title && draft.project && draft.type && draft.impact && draft.effort && draft.priority)
  const submit = () => {
    if (!requiredFilled) {
      toast.error('Заполните обязательные поля задачи')
      return
    }
    if (draft.status === 'progress' && (!task || task.status !== 'progress')) {
      const activeProgress = useAppStore.getState().tasks.filter((item) => item.status === 'progress' && item.id !== task?.id).length
      if (activeProgress >= WIP_LIMIT) {
        toast.error('WIP-лимит: в работе может быть не больше 3 задач')
        return
      }
    }
    const cleaned = { ...draft, acceptanceCriteria: draft.acceptanceCriteria.filter(Boolean), tags: draft.tags.filter(Boolean) }
    if (task) {
      const prevStatus = task.status
      updateTask(task.id, cleaned)
      if (cleaned.status !== prevStatus) moveTask(task.id, cleaned.status)
      toast.success('Задача сохранена')
    } else {
      createTask(cleaned)
    }
    onClose()
  }
  return (
    <Modal onClose={onClose} title={task ? 'Редактировать задачу' : 'Создать задачу'}>
      <div className="grid max-h-[75vh] gap-4 overflow-y-auto pr-1 md:grid-cols-2">
        <label className="md:col-span-2">
          <RequiredLabel>Название</RequiredLabel>
          <input className={`input ${!draft.title ? 'border-[var(--danger)]' : ''}`} value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} />
        </label>
        <FieldSelect label="Проект" value={draft.project} options={PROJECTS} onChange={(value) => setDraft({ ...draft, project: value as Project })} required />
        <FieldSelect label="Тип" value={draft.type} options={TASK_TYPES} onChange={(value) => setDraft({ ...draft, type: value as TaskType })} required />
        <FieldSelect label="Impact" value={draft.impact} options={IMPACTS} onChange={(value) => setDraft({ ...draft, impact: value as Impact })} required />
        <FieldSelect label="Effort" value={draft.effort} options={EFFORTS} onChange={(value) => setDraft({ ...draft, effort: value as Effort })} required />
        <FieldSelect label="Priority" value={draft.priority} options={PRIORITIES} onChange={(value) => setDraft({ ...draft, priority: value as Priority })} required />
        <FieldSelect label="Status" value={draft.status} options={BOARD_STATUSES} onChange={(value) => setDraft({ ...draft, status: value as Status })} />
        <label className="md:col-span-2">
          <span className="mb-1 block text-[10px] uppercase text-[var(--text-tertiary)]">Описание</span>
          <textarea className="input min-h-24" value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} />
        </label>
        <label>
          <span className="mb-1 block text-[10px] uppercase text-[var(--text-tertiary)]">Entry point</span>
          <input className="input" value={draft.entryPoint} onChange={(event) => setDraft({ ...draft, entryPoint: event.target.value })} />
        </label>
        <label>
          <span className="mb-1 block text-[10px] uppercase text-[var(--text-tertiary)]">Due date</span>
          <input className="input" type="date" value={draft.dueDate ?? ''} onChange={(event) => setDraft({ ...draft, dueDate: event.target.value || undefined })} />
        </label>
        <label>
          <span className="mb-1 block text-[10px] uppercase text-[var(--text-tertiary)]">Оценка, мин</span>
          <input className="input" type="number" value={draft.estimatedMinutes ?? ''} onChange={(event) => setDraft({ ...draft, estimatedMinutes: event.target.value ? Number(event.target.value) : undefined })} />
        </label>
        <label>
          <span className="mb-1 block text-[10px] uppercase text-[var(--text-tertiary)]">Tags</span>
          <input className="input" value={draft.tags.join(', ')} onChange={(event) => setDraft({ ...draft, tags: event.target.value.split(',').map((item) => item.trim()).filter(Boolean) })} />
        </label>
        <label className="md:col-span-2">
          <span className="mb-1 block text-[10px] uppercase text-[var(--text-tertiary)]">Acceptance criteria, по одному на строку</span>
          <textarea className="input min-h-24" value={draft.acceptanceCriteria.join('\n')} onChange={(event) => setDraft({ ...draft, acceptanceCriteria: event.target.value.split('\n') })} />
        </label>
      </div>
      <div className="mt-5 flex flex-wrap justify-between gap-2">
        <div>{task && <button className="btn btn-danger" onClick={() => { if (confirm('Удалить задачу?')) { deleteTask(task.id); onClose() } }}><Trash2 size={15} /> Удалить</button>}</div>
        <div className="flex gap-2">
          <button className="btn" onClick={onClose}>Отмена</button>
          <button className="btn btn-primary" disabled={!requiredFilled} onClick={submit}>Сохранить</button>
        </div>
      </div>
    </Modal>
  )
}

function CommandPalette({ open, setOpen, setPage, openTask }: { open: boolean; setOpen: (open: boolean) => void; setPage: (page: Page) => void; openTask: (task: Task) => void }) {
  const { tasks, flags, decisions, notes } = useAppStore()
  const [query, setQuery] = useState('')
  useEffect(() => {
    if (open) setQuery('')
  }, [open])
  if (!open) return null
  const nav: Array<{ label: string; page: Page }> = [
    { label: 'Today', page: 'today' }, { label: 'Board', page: 'board' }, { label: 'Inbox', page: 'inbox' }, { label: 'Backlog', page: 'backlog' }, { label: 'Analytics', page: 'analytics' },
  ]
  const q = query.toLowerCase()
  const results = [
    ...nav.filter((item) => item.label.toLowerCase().includes(q)).map((item) => ({ key: `nav-${item.page}`, label: item.label, meta: 'Навигация', action: () => { setPage(item.page); setOpen(false) } })),
    ...tasks.filter((item) => searchable(item, q)).slice(0, 8).map((task) => ({ key: `task-${task.id}`, label: task.title, meta: `Задача / ${task.project}`, action: () => { openTask(task); setOpen(false) } })),
    ...decisions.filter((item) => `${item.title} ${item.context} ${item.decision}`.toLowerCase().includes(q)).slice(0, 5).map((item) => ({ key: `decision-${item.id}`, label: item.title, meta: 'Решение', action: () => { setPage('decisions'); setOpen(false) } })),
    ...notes.filter((item) => `${item.title} ${item.content}`.toLowerCase().includes(q)).slice(0, 5).map((item) => ({ key: `note-${item.id}`, label: item.title, meta: 'Заметка', action: () => { setPage('notes'); setOpen(false) } })),
    ...flags.filter((item) => `${item.title} ${item.description}`.toLowerCase().includes(q)).slice(0, 5).map((item) => ({ key: `flag-${item.id}`, label: item.title, meta: 'Флаг', action: () => { setPage('flags'); setOpen(false) } })),
  ]
  return (
    <Modal onClose={() => setOpen(false)} title="Command palette" narrow>
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
        <input autoFocus className="input pl-9" placeholder="Поиск по задачам, решениям, заметкам, флагам" value={query} onChange={(event) => setQuery(event.target.value)} />
      </div>
      <div className="mt-3 max-h-96 overflow-y-auto">
        {results.map((item) => (
          <button key={item.key} className="flex w-full items-center justify-between gap-3 rounded p-3 text-left hover:bg-cockpit-hover" onClick={item.action}>
            <span>{item.label}</span>
            <span className="text-[10px] uppercase text-[var(--text-tertiary)]">{item.meta}</span>
          </button>
        ))}
        {!results.length && <EmptyState title="Ничего не найдено" text="Попробуйте другой запрос." />}
      </div>
    </Modal>
  )
}

function DecisionModal({ decision, onClose, onSave }: { decision: Decision; onClose: () => void; onSave: (decision: Decision) => void }) {
  const [draft, setDraft] = useState(decision)
  return (
    <Modal onClose={onClose} title="Решение">
      <div className="grid gap-3">
        <input className="input" placeholder="Название" value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} />
        <textarea className="input min-h-24" placeholder="Context" value={draft.context} onChange={(event) => setDraft({ ...draft, context: event.target.value })} />
        <textarea className="input min-h-24" placeholder="Decision" value={draft.decision} onChange={(event) => setDraft({ ...draft, decision: event.target.value })} />
        <textarea className="input min-h-24" placeholder="Alternatives" value={draft.alternatives} onChange={(event) => setDraft({ ...draft, alternatives: event.target.value })} />
        <textarea className="input min-h-24" placeholder="Consequences" value={draft.consequences} onChange={(event) => setDraft({ ...draft, consequences: event.target.value })} />
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <button className="btn" onClick={onClose}>Отмена</button>
        <button className="btn btn-primary" onClick={() => onSave(draft)}>Сохранить</button>
      </div>
    </Modal>
  )
}

function HotkeysModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null
  const rows = [
    ['Cmd/Ctrl+K', 'Command palette'], ['C', 'Создать задачу'], ['N', 'Новая заметка'], ['G T', 'Today'], ['G B', 'Board'], ['G I', 'Inbox'], ['G L', 'Backlog'], ['G A', 'Analytics'], ['P', 'Pomodoro'], ['?', 'Хоткеи'],
  ]
  return (
    <Modal onClose={onClose} title="Горячие клавиши" narrow>
      <div className="grid gap-2">
        {rows.map(([key, action]) => (
          <div key={key} className="flex items-center justify-between rounded border border-[var(--border-primary)] p-3">
            <kbd className="badge">{key}</kbd>
            <span>{action}</span>
          </div>
        ))}
      </div>
    </Modal>
  )
}

function Onboarding({ onClose, onCreate }: { onClose: () => void; onCreate: () => void }) {
  return (
    <div className="fixed inset-x-4 bottom-4 z-40 mx-auto max-w-2xl rounded border border-[var(--border-accent)] bg-cockpit-card p-4 shadow-2xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-display text-xl">Первый запуск</div>
          <p className="mt-2 text-[var(--text-secondary)]">Три действия: Cmd+K для поиска, C для новой задачи, G T для Today.</p>
        </div>
        <div className="flex gap-2">
          <button className="btn" onClick={onCreate}><Plus size={15} /> Задача</button>
          <button className="btn btn-primary" onClick={onClose}>Понятно</button>
        </div>
      </div>
    </div>
  )
}

function PomodoroFloating({ setPage }: { setPage: (page: Page) => void }) {
  const pomodoro = useAppStore((state) => state.pomodoro)
  return (
    <button className="fixed bottom-4 right-4 z-30 flex h-[60px] w-[140px] items-center justify-center gap-3 rounded border border-[var(--accent)] bg-cockpit-card shadow-2xl" onClick={() => setPage('today')}>
      <span className="relative flex h-3 w-3">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--accent)] opacity-75"></span>
        <span className="relative inline-flex h-3 w-3 rounded-full bg-[var(--accent)]"></span>
      </span>
      <span className="font-bold">{formatSeconds(pomodoro.secondsLeft)}</span>
    </button>
  )
}

function PageShell({ children, wide = false }: { children: React.ReactNode; wide?: boolean }) {
  return <div className={`mx-auto w-full p-4 md:p-6 ${wide ? 'max-w-[1600px]' : 'max-w-7xl'}`}>{children}</div>
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div>
      <h2 className="text-display text-xl">{title}</h2>
      {subtitle && <p className="mt-1 text-[11px] text-[var(--text-tertiary)]">{subtitle}</p>}
    </div>
  )
}

function StatCard({ label, value, icon: Icon, tone }: { label: string; value: string; icon: typeof Target; tone?: 'danger' | 'success' }) {
  const color = tone === 'danger' ? 'var(--danger)' : tone === 'success' ? 'var(--success)' : 'var(--accent)'
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase text-[var(--text-tertiary)]">{label}</div>
          <div className="text-display mt-2 text-2xl">{value}</div>
        </div>
        <Icon color={color} size={22} />
      </div>
    </div>
  )
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card p-5">
      <SectionHeader title={title} />
      <div className="mt-4">{children}</div>
    </section>
  )
}

function Nudge({ text }: { text: string }) {
  return (
    <div className="rounded border border-[var(--border-accent)] bg-cockpit-card p-4 text-[var(--text-secondary)]">
      <div className="flex gap-3"><Bell size={16} className="mt-0.5 text-[var(--accent)]" /> <span>{text}</span></div>
    </div>
  )
}

function TaskTable({ tasks, openTask }: { tasks: Task[]; openTask: (task: Task) => void }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px]">
        <tbody>
          {tasks.map((task) => (
            <tr key={task.id} className="border-b border-[var(--border-primary)]">
              <td className="py-3"><button className="wrap-anywhere text-left hover:text-[var(--accent)]" onClick={() => openTask(task)}>{task.title}</button></td>
              <td><span className="badge">{task.project}</span></td>
              <td><PriorityBadge priority={task.priority} /></td>
              <td className="text-right text-[var(--text-tertiary)]">{STATUS_LABELS[task.status]}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {!tasks.length && <EmptyState title="Пусто" text="Нет задач для этого списка." />}
    </div>
  )
}

function PriorityBadge({ priority }: { priority: Priority }) {
  return <span className="badge" style={{ borderColor: PRIORITY_COLORS[priority], color: PRIORITY_COLORS[priority] }}>{priority}</span>
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded border border-dashed border-[var(--border-primary)] p-6 text-center">
      <div className="font-semibold">{title}</div>
      <div className="mt-2 text-[var(--text-tertiary)]">{text}</div>
    </div>
  )
}

function Modal({ title, children, onClose, narrow = false }: { title: string; children: React.ReactNode; onClose: () => void; narrow?: boolean }) {
  useHotkeys('esc', onClose)
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/65 p-4" onMouseDown={onClose}>
      <div className={`card w-full ${narrow ? 'max-w-xl' : 'max-w-4xl'} p-5 shadow-2xl`} onMouseDown={(event) => event.stopPropagation()}>
        <div className="mb-5 flex items-center justify-between gap-3">
          <h2 className="text-display text-2xl">{title}</h2>
          <button className="btn" aria-label="Закрыть" onClick={onClose}><X size={15} /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

function RequiredLabel({ children }: { children: React.ReactNode }) {
  return <span className="mb-1 block text-[10px] uppercase text-[var(--text-tertiary)]">{children} <span className="text-[var(--danger)]">*</span></span>
}

function FieldSelect({ label, value, options, onChange, required }: { label: string; value: string; options: readonly string[]; onChange: (value: string) => void; required?: boolean }) {
  return (
    <label>
      {required ? <RequiredLabel>{label}</RequiredLabel> : <span className="mb-1 block text-[10px] uppercase text-[var(--text-tertiary)]">{label}</span>}
      <select className="input" value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  )
}

function searchable(task: Task, query: string) {
  return `${task.title} ${task.description} ${task.entryPoint} ${task.tags.join(' ')}`.toLowerCase().includes(query)
}

function formatSeconds(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = Math.floor(seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

function downloadFile(name: string, content: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = name
  anchor.click()
  URL.revokeObjectURL(url)
}

export default App
