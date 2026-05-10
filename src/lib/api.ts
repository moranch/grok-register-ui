/**
 * Grok Register Console - 统一 API 客户端
 *
 * 本文件合并了旧 grok-api.ts 与 api.ts 的能力：
 * - `api`: 通用 axios 实例（同源请求 + 去重 + 全局错误提示）
 * - `grokApi`: 带 Bearer 认证的 console 专用实例（baseURL=/api）
 * - 全部业务 API（tasks / accounts / proxies / mailboxes / platforms / ...）
 */
import axios from 'axios'
import i18next from 'i18next'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'

// ============================================================================
// 通用 axios 实例：用于非 console 后端（保留给前端模板层）
// ============================================================================

const baseURL = ''

export const api = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    'Cache-Control': 'no-store',
  },
})

// GET 请求去重
const inFlightGet = new Map<string, Promise<unknown>>()
const originalGet = api.get.bind(api)

api.get = ((url: string, config = {}) => {
  const disableDuplicate = (config as unknown as Record<string, unknown>)
    ?.disableDuplicate
  if (disableDuplicate) return originalGet(url, config)

  const params = (config as unknown as Record<string, unknown>)?.params
    ? JSON.stringify((config as unknown as Record<string, unknown>).params)
    : '{}'
  const key = `${url}?${params}`

  if (inFlightGet.has(key)) return inFlightGet.get(key)!
  const req = originalGet(url, config).finally(() => inFlightGet.delete(key))
  inFlightGet.set(key, req)
  return req
}) as typeof api.get

api.interceptors.response.use(
  (response) => {
    const skipBusiness = (response.config as unknown as Record<string, unknown>)
      ?.skipBusinessError
    if (
      !skipBusiness &&
      response &&
      response.data &&
      typeof response.data.success === 'boolean' &&
      !response.data.success
    ) {
      toast.error(response.data.message || 'Request failed')
    }
    return response
  },
  (error) => {
    const skip = error?.config?.skipErrorHandler
    if (!skip) {
      const status = error?.response?.status
      if (status === 401) {
        toast.error(i18next.t('Session expired!'))
        try {
          useAuthStore.getState().auth.reset()
        } catch {
          /* empty */
        }
      } else {
        const msg =
          error?.response?.data?.message || error?.message || 'Request error'
        toast.error(msg)
      }
    }
    return Promise.reject(error)
  }
)

function getUserId(): string | null {
  try {
    if (typeof window !== 'undefined') {
      return window.localStorage.getItem('uid')
    }
  } catch {
    /* empty */
  }
  return null
}

export function getCommonHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const uid = getUserId()
  if (uid) headers['New-Api-User'] = uid
  return headers
}

api.interceptors.request.use((config) => {
  const uid = getUserId()
  if (uid) {
    ;(config.headers as Record<string, string>)['New-Api-User'] = uid
  }
  return config
})

// ============================================================================
// grokApi：Console 专用实例（Bearer 认证 + 401 自动跳登录）
// ============================================================================

const grokApi = axios.create({
  baseURL: '/api',
  timeout: 30000,
})

grokApi.interceptors.request.use((config) => {
  const password =
    typeof window !== 'undefined'
      ? window.localStorage.getItem('console_password')
      : null
  if (password) {
    config.headers.Authorization = `Bearer ${password}`
  }
  return config
})

grokApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      try {
        window.localStorage.removeItem('console_password')
      } catch {
        /* empty */
      }
      if (
        typeof window !== 'undefined' &&
        !window.location.pathname.startsWith('/sign-in')
      ) {
        window.location.href = '/sign-in'
      }
    }
    return Promise.reject(error)
  }
)

// ============================================================================
// 业务类型定义
// ============================================================================

export interface Task {
  id: number
  name: string
  status: string
  target_count: number
  completed_count: number
  failed_count: number
  current_round: number
  current_phase: string
  last_email: string
  last_error: string
  last_log_at: string
  notes: string
  config: TaskConfig
  created_at: string
  started_at: string
  finished_at: string
  exit_code: number
  pid: number
  /** 多平台字段（可能为 undefined，兼容旧后端） */
  platform?: string
  executor_type?: string
  engine_id?: string
  params?: Record<string, unknown>
}

export interface TaskConfig {
  run: { count: number }
  proxy: string
  browser_proxy: string
  temp_mail_api_base: string
  temp_mail_admin_password: string
  temp_mail_domain: string
  temp_mail_site_password: string
  api: { endpoint: string; token: string; append: boolean }
  debug_mode?: boolean
  executor?: string
}

export interface HealthItem {
  key: string
  label: string
  ok: boolean
  summary: string
  detail: string
  target: string
  checked_at: string
}

export interface SystemSettings {
  proxy: string
  browser_proxy: string
  temp_mail_api_base: string
  temp_mail_admin_password: string
  temp_mail_domain: string
  temp_mail_site_password: string
  api_endpoint: string
  api_token: string
  api_append: boolean
  debug_mode: boolean
  executor: string
  lifecycle_enabled: boolean
  lifecycle_check_hours: number
  round_interval_sec: number
  round_timeout_sec: number
  max_concurrent_tasks: number
  circuit_break_fail_threshold: number
  captcha_provider: string
  captcha_api_key: string
  log_level: string
  collect_error_samples: boolean
}

export interface SystemInfo {
  app_name: string
  app_version: string
  python_version: string
  platform: string
  source_project: string
  python_path: string
  runtime_dir: string
  tasks_dir: string
  db_path: string
  db_size_bytes: number
  tasks_size_bytes: number
  auth_required: boolean
  max_concurrent_tasks: number
  webui_dir: string
  counts: {
    tasks: number
    events: number
    accounts: number
    proxies: number
    mailboxes: number
  }
}

export interface ProxyEntry {
  id: number
  url: string
  label: string
  enabled: boolean
  success_count: number
  failure_count: number
  consecutive_failures: number
  success_rate: number
  last_used_at: string
  created_at: string
}

export type MailboxProviderType = 'tmail' | 'duckmail' | 'moemail' | 'custom'

export interface MailboxEntry {
  id: number
  name: string
  provider_type: MailboxProviderType
  api_base: string
  admin_password: string
  domain: string
  site_password: string
  enabled: boolean
  success_count: number
  failure_count: number
  consecutive_failures: number
  success_rate: number
  last_used_at: string
  created_at: string
}

export type AccountLifecycle =
  | 'registered'
  | 'trial'
  | 'subscribed'
  | 'expired'
  | 'invalid'
export type AccountPlanState = 'free' | 'trial' | 'pro' | 'team' | 'unknown'
export type AccountValidity = 'valid' | 'invalid' | 'unknown'

export interface AccountEntry {
  id: number
  email: string
  sso: string
  password: string
  task_id: number | null
  proxy_url: string
  status: string
  platform: string
  lifecycle_status: AccountLifecycle
  plan_state: AccountPlanState
  validity_status: AccountValidity
  display_status: string
  last_error: string
  last_checked_at: string
  notes: string
  extra_json: string
  exporter_status_json: string
  created_at: string
}

export interface AccountAssetSummary {
  total: number
  lifecycle_status: Record<string, number>
  plan_state: Record<string, number>
  validity_status: Record<string, number>
}

export interface StatsOverview {
  total_events: number
  success_count: number
  failure_count: number
  success_rate: number
  account_count: number
  trend: { day: string; ok: number; fail: number }[]
}

export interface StatsErrorItem {
  kind: string
  count: number
  sample: string
}

export interface StatsByProxyItem {
  proxy_url: string
  ok: number
  fail: number
  total: number
  success_rate: number
}

export interface LifecycleStatus {
  enabled: boolean
  check_hours: number
  last_check_at: string
  last_refresh_at: string
  last_result: string
  running: boolean
}

// ---- 平台（多平台注册器新增） ----

export interface PlatformRegisterEngine {
  id: string
  display_name: string
  is_recommended?: boolean
  is_deprecated?: boolean
}

export interface Platform {
  name: string
  display_name: string
  enabled: boolean
  executor_type?: string
  supported_executors?: string[]
  capabilities?: string[]
  register_engines?: PlatformRegisterEngine[]
  config?: Record<string, unknown>
  config_schema?: Record<string, unknown>
  extra_schema?: Record<string, unknown>
}

export interface PlatformListResponse {
  platforms: Platform[]
}

export interface PlatformTestRunResult {
  ok: boolean
  message?: string
  [key: string]: unknown
}

// ============================================================================
// 业务 API（全部走带 Bearer 认证的 grokApi 实例）
// ============================================================================

export const taskApi = {
  list: () => grokApi.get<{ tasks: Task[] }>('/tasks'),
  get: (id: number) => grokApi.get<{ task: Task }>(`/tasks/${id}`),
  create: (
    data: Partial<TaskConfig> & {
      name: string
      count: number
      notes?: string
      /** 平台 name，默认 'grok'（对应后端 PLATFORM_REGISTRY 里的 key） */
      platform?: string
      /** 非 grok 平台必填：对应该平台的 register_engines.id */
      engine_id?: string
      extra?: Record<string, unknown>
    }
  ) => grokApi.post<{ task: Task }>('/tasks', data),
  stop: (id: number) => grokApi.post(`/tasks/${id}/stop`),
  delete: (id: number) => grokApi.delete(`/tasks/${id}`),
  logs: (id: number, limit = 250) =>
    grokApi.get<{ lines: string[] }>(`/tasks/${id}/logs`, {
      params: { limit },
    }),
  streamUrl: (id: number) => {
    const pw = typeof window !== 'undefined'
      ? window.localStorage.getItem('console_password') || ''
      : ''
    return `/api/tasks/${id}/stream${pw ? `?token=${encodeURIComponent(pw)}` : ''}`
  },
}

export const settingsApi = {
  get: () =>
    grokApi.get<{
      settings: SystemSettings
      defaults: Record<string, unknown>
    }>('/settings'),
  save: (data: SystemSettings) =>
    grokApi.post<{ settings: SystemSettings }>('/settings', data),
}

export const healthApi = {
  check: () =>
    grokApi.get<{ items: HealthItem[]; checked_at: string }>('/health'),
}

export const proxyApi = {
  list: () => grokApi.get<{ proxies: ProxyEntry[] }>('/proxies'),
  add: (data: { url: string; label?: string; enabled?: boolean }) =>
    grokApi.post<{ proxy: ProxyEntry }>('/proxies', data),
  update: (
    id: number,
    data: { label?: string; enabled?: boolean; reset_stats?: boolean }
  ) => grokApi.patch<{ proxy: ProxyEntry }>(`/proxies/${id}`, data),
  delete: (id: number) => grokApi.delete(`/proxies/${id}`),
}

export const mailboxApi = {
  list: () => grokApi.get<{ mailboxes: MailboxEntry[] }>('/mailboxes'),
  add: (data: {
    name: string
    provider_type: MailboxProviderType
    api_base: string
    admin_password?: string
    domain?: string
    site_password?: string
    enabled?: boolean
  }) => grokApi.post<{ mailbox: MailboxEntry }>('/mailboxes', data),
  update: (
    id: number,
    data: Partial<{
      name: string
      provider_type: MailboxProviderType
      api_base: string
      admin_password: string
      domain: string
      site_password: string
      enabled: boolean
      reset_stats: boolean
    }>
  ) => grokApi.patch<{ mailbox: MailboxEntry }>(`/mailboxes/${id}`, data),
  delete: (id: number) => grokApi.delete(`/mailboxes/${id}`),
  test: (id: number) =>
    grokApi.post<{
      ok: boolean
      status_code?: number
      message: string
      checked_at: string
    }>(`/mailboxes/${id}/test`),
  domains: (id: number) =>
    grokApi.get<{
      ok: boolean
      items: string[]
      endpoint?: string
      message?: string
      checked_at: string
    }>(`/mailboxes/${id}/domains`),
  importDefault: (force = false) =>
    grokApi.post<{
      ok: boolean
      skipped?: boolean
      message?: string
      mailbox?: MailboxEntry
    }>('/mailboxes/import-default', null, { params: { force } }),
}

export const accountApi = {
  list: (limit = 500) =>
    grokApi.get<{ items: AccountEntry[] }>('/accounts', { params: { limit } }),
  summary: () => grokApi.get<AccountAssetSummary>('/accounts/summary'),
  update: (
    id: number,
    data: Partial<{
      lifecycle_status: AccountLifecycle
      plan_state: AccountPlanState
      validity_status: AccountValidity
      notes: string
      last_error: string
    }>
  ) => grokApi.patch<{ account: AccountEntry }>(`/accounts/${id}`, data),
  delete: (id: number) => grokApi.delete(`/accounts/${id}`),
  exportUrl: (fmt: 'json' | 'csv' | 'sso') => `/api/accounts/export?fmt=${fmt}`,
}

export const statsApi = {
  overview: (days = 7) =>
    grokApi.get<StatsOverview>('/stats/overview', { params: { days } }),
  errors: (days = 7) =>
    grokApi.get<{ items: StatsErrorItem[] }>('/stats/errors', {
      params: { days },
    }),
  byProxy: () => grokApi.get<{ items: StatsByProxyItem[] }>('/stats/by-proxy'),
}

export const lifecycleApi = {
  status: () => grokApi.get<LifecycleStatus>('/lifecycle/status'),
  check: () =>
    grokApi.post<{
      ok: boolean
      message: string
      endpoint?: string
      checked_at: string
    }>('/lifecycle/check'),
  toggle: (enabled?: boolean) =>
    grokApi.post<{
      enabled: boolean
      check_hours: number
      changed_at: string
    }>('/lifecycle/toggle', { enabled }),
}

export const metaApi = {
  get: () =>
    grokApi.get<{
      defaults: Record<string, unknown>
      settings: SystemSettings
      source_project: string
      python_path: string
      max_concurrent_tasks: number
    }>('/meta'),
}

export const systemApi = {
  info: () => grokApi.get<SystemInfo>('/system/info'),
  cleanup: (
    target: 'events' | 'finished_tasks' | 'all_tasks' | 'accounts',
    days = 30
  ) =>
    grokApi.post<{ ok: boolean; target: string; deleted: number }>(
      '/system/cleanup',
      null,
      { params: { target, days } }
    ),
  exportConfigUrl: () => '/api/system/export-config',
  importConfig: (payload: unknown) =>
    grokApi.post<{
      ok: boolean
      imported: { settings: boolean; proxies: number; mailboxes: number }
    }>('/system/import-config', payload),
}

export const platformApi = {
  list: async (): Promise<PlatformListResponse> => {
    const res = await grokApi.get('/platforms/')
    const data = res.data
    if (Array.isArray(data)) return { platforms: data as Platform[] }
    if (Array.isArray(data?.platforms)) return data as PlatformListResponse
    return { platforms: [] }
  },
  detail: async (name: string): Promise<Platform> => {
    const res = await grokApi.get<Platform>(
      `/platforms/${encodeURIComponent(name)}`
    )
    return res.data
  },
  updateConfig: async (
    name: string,
    config: Record<string, unknown>
  ): Promise<Platform> => {
    const res = await grokApi.patch<Platform>(
      `/platforms/${encodeURIComponent(name)}/config`,
      config
    )
    return res.data
  },
  /** 启用/禁用平台 */
  setEnabled: async (
    name: string,
    enabled: boolean
  ): Promise<{ ok: boolean; platform: string; enabled: boolean }> => {
    const res = await grokApi.patch(
      `/platforms/${encodeURIComponent(name)}/enabled`,
      { enabled }
    )
    return res.data
  },
  testRun: async (
    name: string,
    params: Record<string, unknown> = {}
  ): Promise<PlatformTestRunResult> => {
    const res = await grokApi.post<PlatformTestRunResult>(
      `/platforms/${encodeURIComponent(name)}/test-run`,
      params
    )
    return res.data
  },
}

export default grokApi
