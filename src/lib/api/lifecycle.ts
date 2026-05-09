/**
 * 生命周期管理 API
 * Requirement: Task 9.1 - 按资源分组的 API 模块
 */
import { apiGet, apiPost } from './client'

export interface LifecycleStatus {
  enabled: boolean
  check_hours: number
  last_check_at: string
  last_refresh_at: string
  last_result: string
  running: boolean
}

export interface LifecycleCheckResult {
  ok: boolean
  message: string
  checked: number
  refreshed: number
  failed: number
  checked_at: string
}

export interface LifecycleWorkerInfo {
  running: boolean
  next_check_at: string
  interval_hours: number
  last_duration_sec: number
}

export const lifecycleApi = {
  /** 获取生命周期 Worker 状态 */
  status: () => apiGet<LifecycleStatus>('/lifecycle/status'),

  /** 获取 Worker 详细信息 */
  workerInfo: () => apiGet<LifecycleWorkerInfo>('/lifecycle/worker'),

  /** 立即触发检测 */
  check: () => apiPost<LifecycleCheckResult>('/lifecycle/check'),

  /** 获取最近检测结果列表 */
  recentResults: (limit?: number) =>
    apiGet<{ items: LifecycleCheckResult[] }>(
      '/lifecycle/results',
      limit ? { limit: String(limit) } : undefined
    ),

  /** 启用/禁用生命周期管理 */
  toggle: (enabled: boolean) =>
    apiPost<{ ok: boolean }>('/lifecycle/toggle', { enabled }),
}
