/**
 * Grok Register Console API
 * 对接 grok-register-main 的 FastAPI 后端
 */
import axios from 'axios'

const grokApi = axios.create({
  baseURL: '/api',
  timeout: 30000,
})

grokApi.interceptors.request.use((config) => {
  const password = localStorage.getItem('console_password')
  if (password) {
    config.headers.Authorization = `Bearer ${password}`
  }
  return config
})

grokApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('console_password')
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

// ==================== 类型 ====================

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
}

export interface TaskConfig {
  run: { count: number }
  proxy: string
  browser_proxy: string
  temp_mail_api_base: string
  temp_mail_admin_password: string
  temp_mail_domain: string
  temp_mail_site_password: string
  api: {
    endpoint: string
    token: string
    append: boolean
  }
  /** 调试模式：true=浏览器"有头"运行（Xvfb），false=无头 */
  debug_mode?: boolean
  /** 执行器：headless / headed / protocol */
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
  /** 调试模式：默认 false（无头） */
  debug_mode: boolean
  /** 执行器：headless(默认) / headed / protocol */
  executor: string
  /** 账号生命周期自动续期开关 */
  lifecycle_enabled: boolean
  /** 有效性检测间隔，单位小时 */
  lifecycle_check_hours: number

  // 注册策略
  round_interval_sec: number
  round_timeout_sec: number
  max_concurrent_tasks: number
  circuit_break_fail_threshold: number

  // 验证码
  captcha_provider: string
  captcha_api_key: string

  // 高级
  log_level: string
  collect_error_samples: boolean
}

// 系统信息
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

// ---- 代理池 ----
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

// ---- 邮箱 Provider ----
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

// ---- 账号 ----
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
  lifecycle_status: AccountLifecycle
  plan_state: AccountPlanState
  validity_status: AccountValidity
  last_error: string
  last_checked_at: string
  notes: string
  created_at: string
}

export interface AccountAssetSummary {
  total: number
  lifecycle_status: Record<string, number>
  plan_state: Record<string, number>
  validity_status: Record<string, number>
}

// ---- 统计 ----
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

// ---- 生命周期 ----
export interface LifecycleStatus {
  enabled: boolean
  check_hours: number
  last_check_at: string
  last_refresh_at: string
  last_result: string
  running: boolean
}

// ==================== API ====================

export const taskApi = {
  list: () => grokApi.get<{ tasks: Task[] }>('/tasks'),
  get: (id: number) => grokApi.get<{ task: Task }>(`/tasks/${id}`),
  create: (
    data: Partial<TaskConfig> & { name: string; count: number; notes?: string }
  ) => grokApi.post<{ task: Task }>('/tasks', data),
  stop: (id: number) => grokApi.post(`/tasks/${id}/stop`),
  delete: (id: number) => grokApi.delete(`/tasks/${id}`),
  logs: (id: number, limit = 250) =>
    grokApi.get<{ lines: string[] }>(`/tasks/${id}/logs`, {
      params: { limit },
    }),
  /** SSE 实时日志 URL（EventSource 直接用） */
  streamUrl: (id: number) => `/api/tasks/${id}/stream`,
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
}

export const accountApi = {
  list: (limit = 500) =>
    grokApi.get<{ items: AccountEntry[] }>('/accounts', { params: { limit } }),
  summary: () =>
    grokApi.get<AccountAssetSummary>('/accounts/summary'),
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
  exportUrl: (fmt: 'json' | 'csv' | 'sso') =>
    `/api/accounts/export?fmt=${fmt}`,
}

export const statsApi = {
  overview: (days = 7) =>
    grokApi.get<StatsOverview>('/stats/overview', { params: { days } }),
  errors: (days = 7) =>
    grokApi.get<{ items: StatsErrorItem[] }>('/stats/errors', {
      params: { days },
    }),
  byProxy: () =>
    grokApi.get<{ items: StatsByProxyItem[] }>('/stats/by-proxy'),
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

export default grokApi
