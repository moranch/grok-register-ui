/**
 * 账号资产 API
 * Requirement: Task 9.1 - 按资源分组的 API 模块
 */
import { apiGet, apiPost, apiPatch, apiDelete, BASE_URL } from './client'

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

export const accountApi = {
  /** 获取账号列表 */
  list: (params?: Record<string, string>) =>
    apiGet<{ items: AccountEntry[] }>('/accounts', params),

  /** 获取账号汇总 */
  summary: () => apiGet<AccountAssetSummary>('/accounts/summary'),

  /** 获取单个账号 */
  get: (id: number) => apiGet<{ account: AccountEntry }>(`/accounts/${id}`),

  /** 检测账号有效性 */
  check: (id: number) =>
    apiPost<{ ok: boolean; message: string }>(`/accounts/${id}/check`),

  /** 刷新账号 Token */
  refresh: (id: number) =>
    apiPost<{ ok: boolean; message: string }>(`/accounts/${id}/refresh`),

  /** 批量删除 */
  batchDelete: (ids: number[]) => apiDelete<{ ok: boolean; deleted: number }>('/accounts', { ids }),

  /** 导出 URL（直接下载） */
  export: (fmt: string, platform?: string) =>
    `${BASE_URL}/accounts/export?fmt=${fmt}&platform=${platform || ''}`,

  /** 批量同步状态 */
  batchSyncStatus: (body: any) =>
    apiPost<{ ok: boolean; updated: number }>('/accounts/batch-sync-status', body),

  /** 回填远程认证信息 */
  backfillRemoteAuth: (body: any) =>
    apiPost<{ ok: boolean; updated: number }>('/accounts/backfill-remote-auth', body),
}
