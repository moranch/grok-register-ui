import { create } from 'zustand'
import {
  taskApi,
  settingsApi,
  healthApi,
  type Task,
  type SystemSettings,
  type HealthItem,
} from '@/lib/grok-api'

interface GrokState {
  // Tasks
  tasks: Task[]
  loadingTasks: boolean
  fetchTasks: () => Promise<void>
  createTask: (data: Parameters<typeof taskApi.create>[0]) => Promise<void>
  stopTask: (id: number) => Promise<void>
  deleteTask: (id: number) => Promise<void>

  // Task Logs
  taskLogs: Record<number, string[]>
  fetchTaskLogs: (id: number) => Promise<void>

  // Settings
  settings: SystemSettings | null
  defaults: Record<string, unknown>
  loadingSettings: boolean
  fetchSettings: () => Promise<void>
  saveSettings: (data: SystemSettings) => Promise<void>

  // Health
  healthItems: HealthItem[]
  healthCheckedAt: string
  loadingHealth: boolean
  fetchHealth: () => Promise<void>
}

export const useGrokStore = create<GrokState>((set, get) => ({
  // Tasks
  tasks: [],
  loadingTasks: false,
  fetchTasks: async () => {
    set({ loadingTasks: true })
    try {
      const { data } = await taskApi.list()
      set({ tasks: data.tasks })
    } finally {
      set({ loadingTasks: false })
    }
  },
  createTask: async (data) => {
    await taskApi.create(data)
    await get().fetchTasks()
  },
  stopTask: async (id) => {
    await taskApi.stop(id)
    await get().fetchTasks()
  },
  deleteTask: async (id) => {
    await taskApi.delete(id)
    await get().fetchTasks()
  },

  // Task Logs
  taskLogs: {},
  fetchTaskLogs: async (id) => {
    try {
      const { data } = await taskApi.logs(id)
      set((state) => ({
        taskLogs: { ...state.taskLogs, [id]: data.lines },
      }))
    } catch {
      /* empty */
    }
  },

  // Settings
  settings: null,
  defaults: {},
  loadingSettings: false,
  fetchSettings: async () => {
    set({ loadingSettings: true })
    try {
      const { data } = await settingsApi.get()
      set({ settings: data.settings, defaults: data.defaults })
    } finally {
      set({ loadingSettings: false })
    }
  },
  saveSettings: async (data) => {
    await settingsApi.save(data)
    await get().fetchSettings()
  },

  // Health
  healthItems: [],
  healthCheckedAt: '',
  loadingHealth: false,
  fetchHealth: async () => {
    set({ loadingHealth: true })
    try {
      const { data } = await healthApi.check()
      set({ healthItems: data.items, healthCheckedAt: data.checked_at })
    } finally {
      set({ loadingHealth: false })
    }
  },
}))
