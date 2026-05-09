/**
 * Exporter 推送 API
 * Requirement: Task 9.1 - 按资源分组的 API 模块
 */
import { apiGet, apiPost, apiPatch, apiDelete } from './client'

export type ExporterStatus = 'pushed' | 'failed' | 'not_configured'

export interface ExporterEntry {
  id: number
  name: string
  type: string
  endpoint: string
  enabled: boolean
  status: ExporterStatus
  last_pushed_at: string
  last_error: string
  push_count: number
  fail_count: number
  config: Record<string, any>
  created_at: string
}

export const exporterApi = {
  /** 获取 Exporter 列表 */
  list: () => apiGet<{ exporters: ExporterEntry[] }>('/exporters'),

  /** 获取单个 Exporter */
  get: (id: number) => apiGet<{ exporter: ExporterEntry }>(`/exporters/${id}`),

  /** 创建 Exporter */
  create: (body: any) => apiPost<{ exporter: ExporterEntry }>('/exporters', body),

  /** 更新 Exporter */
  update: (id: number, body: any) =>
    apiPatch<{ exporter: ExporterEntry }>(`/exporters/${id}`, body),

  /** 删除 Exporter */
  delete: (id: number) => apiDelete<{ ok: boolean }>(`/exporters/${id}`),

  /** 手动推送 */
  push: (id: number) =>
    apiPost<{ ok: boolean; message: string }>(`/exporters/${id}/push`),

  /** 测试连通性 */
  test: (id: number) =>
    apiPost<{ ok: boolean; message: string }>(`/exporters/${id}/test`),
}
