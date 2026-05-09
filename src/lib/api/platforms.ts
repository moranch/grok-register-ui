/**
 * 平台管理 API
 * Requirement: Task 9.1 - 按资源分组的 API 模块
 */
import { apiGet, apiPatch, apiPost } from './client'

export interface Platform {
  name: string
  display_name: string
  enabled: boolean
  executor_type: string
  capabilities: string[]
  config_schema: Record<string, any>
  config: Record<string, any>
}

export const platformApi = {
  /** 获取所有平台列表 */
  list: () => apiGet<{ platforms: Platform[] }>('/platforms'),

  /** 获取单个平台详情 */
  get: (name: string) => apiGet<{ platform: Platform }>(`/platforms/${name}`),

  /** 更新平台配置 */
  updateConfig: (name: string, config: any) =>
    apiPatch<{ platform: Platform }>(`/platforms/${name}/config`, { config }),

  /** 试跑平台 */
  testRun: (name: string, params: any) =>
    apiPost<{ ok: boolean; message: string; logs?: string[] }>(
      `/platforms/${name}/test-run`,
      params
    ),
}
