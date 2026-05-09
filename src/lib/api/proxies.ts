/**
 * 代理池 API
 * Requirement: Task 9.1 - 按资源分组的 API 模块
 */
import { apiGet, apiPost, apiPatch, apiDelete } from './client'

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

export const proxyApi = {
  /** 获取代理列表 */
  list: () => apiGet<{ proxies: ProxyEntry[] }>('/proxies'),

  /** 添加代理 */
  add: (data: { url: string; label?: string; enabled?: boolean }) =>
    apiPost<{ proxy: ProxyEntry }>('/proxies', data),

  /** 更新代理 */
  update: (id: number, data: { label?: string; enabled?: boolean; reset_stats?: boolean }) =>
    apiPatch<{ proxy: ProxyEntry }>(`/proxies/${id}`, data),

  /** 删除代理 */
  delete: (id: number) => apiDelete<{ ok: boolean }>(`/proxies/${id}`),

  /** 批量导入代理 */
  batchImport: (urls: string[]) =>
    apiPost<{ ok: boolean; imported: number; skipped: number }>('/proxies/batch', { urls }),

  /** 重置所有代理统计 */
  resetAllStats: () => apiPost<{ ok: boolean }>('/proxies/reset-stats'),
}
