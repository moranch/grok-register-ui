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
      // 当前不在 /sign-in 页时自动跳转登录（避免登录页自己 401 时循环跳）
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

export default grokApi
