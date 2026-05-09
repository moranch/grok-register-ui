/**
 * 注册任务 API
 * Requirement: Task 9.1 - 按资源分组的 API 模块
 */
import { apiGet, apiPost, apiDelete, BASE_URL } from './client'

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
  config: Record<string, any>
  created_at: string
  started_at: string
  finished_at: string
  exit_code: number
  pid: number
}

export const taskApi = {
  /** 获取任务列表 */
  list: (params?: Record<string, string>) =>
    apiGet<{ tasks: Task[] }>('/tasks', params),

  /** 获取单个任务 */
  get: (id: number) => apiGet<{ task: Task }>(`/tasks/${id}`),

  /** 创建注册任务 */
  register: (body: any) => apiPost<{ task: Task }>('/tasks', body),

  /** 停止任务 */
  stop: (id: number) => apiPost<{ ok: boolean }>(`/tasks/${id}/stop`),

  /** 跳过当前步骤 */
  skipCurrent: (id: number) => apiPost<{ ok: boolean }>(`/tasks/${id}/skip-current`),

  /** 删除任务 */
  delete: (id: number) => apiDelete<{ ok: boolean }>(`/tasks/${id}`),

  /** SSE 实时日志流 URL */
  streamUrl: (id: number, since?: number) =>
    `${BASE_URL}/tasks/${id}/stream?since=${since || 0}`,
}
