import { create } from 'zustand'
import {
  taskApi,
  settingsApi,
  healthApi,
  proxyApi,
  mailboxApi,
  accountApi,
  statsApi,
  lifecycleApi,
  type Task,
  type SystemSettings,
  type HealthItem,
  type ProxyEntry,
  type MailboxEntry,
  type MailboxProviderType,
  type AccountEntry,
  type AccountAssetSummary,
  type AccountLifecycle,
  type AccountPlanState,
  type AccountValidity,
  type StatsOverview,
  type StatsErrorItem,
  type StatsByProxyItem,
  type LifecycleStatus,
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

  // Proxy pool
  proxies: ProxyEntry[]
  loadingProxies: boolean
  fetchProxies: () => Promise<void>
  addProxy: (data: {
    url: string
    label?: string
    enabled?: boolean
  }) => Promise<void>
  updateProxy: (
    id: number,
    data: { label?: string; enabled?: boolean; reset_stats?: boolean }
  ) => Promise<void>
  deleteProxy: (id: number) => Promise<void>

  // Mailbox pool
  mailboxes: MailboxEntry[]
  loadingMailboxes: boolean
  fetchMailboxes: () => Promise<void>
  addMailbox: (data: {
    name: string
    provider_type: MailboxProviderType
    api_base: string
    admin_password?: string
    domain?: string
    site_password?: string
    enabled?: boolean
  }) => Promise<void>
  updateMailbox: (
    id: number,
    data: Parameters<typeof mailboxApi.update>[1]
  ) => Promise<void>
  deleteMailbox: (id: number) => Promise<void>
  testMailbox: (
    id: number
  ) => Promise<{ ok: boolean; message: string }>

  // Accounts
  accounts: AccountEntry[]
  loadingAccounts: boolean
  fetchAccounts: (limit?: number) => Promise<void>
  accountSummary: AccountAssetSummary | null
  fetchAccountSummary: () => Promise<void>
  updateAccount: (
    id: number,
    data: Partial<{
      lifecycle_status: AccountLifecycle
      plan_state: AccountPlanState
      validity_status: AccountValidity
      notes: string
      last_error: string
    }>
  ) => Promise<void>
  deleteAccount: (id: number) => Promise<void>

  // Stats
  statsOverview: StatsOverview | null
  statsErrors: StatsErrorItem[]
  statsByProxy: StatsByProxyItem[]
  loadingStats: boolean
  fetchStats: (days?: number) => Promise<void>

  // Lifecycle
  lifecycle: LifecycleStatus | null
  loadingLifecycle: boolean
  fetchLifecycle: () => Promise<void>
  triggerLifecycleCheck: () => Promise<void>
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

  // Proxies
  proxies: [],
  loadingProxies: false,
  fetchProxies: async () => {
    set({ loadingProxies: true })
    try {
      const { data } = await proxyApi.list()
      set({ proxies: data.proxies })
    } finally {
      set({ loadingProxies: false })
    }
  },
  addProxy: async (data) => {
    await proxyApi.add(data)
    await get().fetchProxies()
  },
  updateProxy: async (id, data) => {
    await proxyApi.update(id, data)
    await get().fetchProxies()
  },
  deleteProxy: async (id) => {
    await proxyApi.delete(id)
    await get().fetchProxies()
  },

  // Mailboxes
  mailboxes: [],
  loadingMailboxes: false,
  fetchMailboxes: async () => {
    set({ loadingMailboxes: true })
    try {
      const { data } = await mailboxApi.list()
      set({ mailboxes: data.mailboxes })
    } finally {
      set({ loadingMailboxes: false })
    }
  },
  addMailbox: async (data) => {
    await mailboxApi.add(data)
    await get().fetchMailboxes()
  },
  updateMailbox: async (id, data) => {
    await mailboxApi.update(id, data)
    await get().fetchMailboxes()
  },
  deleteMailbox: async (id) => {
    await mailboxApi.delete(id)
    await get().fetchMailboxes()
  },
  testMailbox: async (id) => {
    const { data } = await mailboxApi.test(id)
    return { ok: data.ok, message: data.message }
  },

  // Accounts
  accounts: [],
  loadingAccounts: false,
  fetchAccounts: async (limit = 500) => {
    set({ loadingAccounts: true })
    try {
      const { data } = await accountApi.list(limit)
      set({ accounts: data.items })
    } finally {
      set({ loadingAccounts: false })
    }
  },
  accountSummary: null,
  fetchAccountSummary: async () => {
    try {
      const { data } = await accountApi.summary()
      set({ accountSummary: data })
    } catch {
      /* ignore */
    }
  },
  updateAccount: async (id, data) => {
    await accountApi.update(id, data)
    await get().fetchAccounts(1000)
    await get().fetchAccountSummary()
  },
  deleteAccount: async (id) => {
    await accountApi.delete(id)
    await get().fetchAccounts(1000)
    await get().fetchAccountSummary()
  },

  // Stats
  statsOverview: null,
  statsErrors: [],
  statsByProxy: [],
  loadingStats: false,
  fetchStats: async (days = 7) => {
    set({ loadingStats: true })
    try {
      const [ov, er, bp] = await Promise.all([
        statsApi.overview(days),
        statsApi.errors(days),
        statsApi.byProxy(),
      ])
      set({
        statsOverview: ov.data,
        statsErrors: er.data.items,
        statsByProxy: bp.data.items,
      })
    } finally {
      set({ loadingStats: false })
    }
  },

  // Lifecycle
  lifecycle: null,
  loadingLifecycle: false,
  fetchLifecycle: async () => {
    set({ loadingLifecycle: true })
    try {
      const { data } = await lifecycleApi.status()
      set({ lifecycle: data })
    } finally {
      set({ loadingLifecycle: false })
    }
  },
  triggerLifecycleCheck: async () => {
    await lifecycleApi.check()
    await get().fetchLifecycle()
  },
}))
