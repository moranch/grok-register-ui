/**
 * 邮箱 Provider API
 * Requirement: Task 9.1 - 按资源分组的 API 模块
 */
import { apiGet, apiPost, apiPatch, apiDelete } from './client'

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

export const mailboxApi = {
  /** 获取邮箱 Provider 列表 */
  list: () => apiGet<{ mailboxes: MailboxEntry[] }>('/mailboxes'),

  /** 添加邮箱 Provider */
  add: (data: {
    name: string
    provider_type: MailboxProviderType
    api_base: string
    admin_password?: string
    domain?: string
    site_password?: string
    enabled?: boolean
  }) => apiPost<{ mailbox: MailboxEntry }>('/mailboxes', data),

  /** 更新邮箱 Provider */
  update: (id: number, data: Partial<MailboxEntry & { reset_stats: boolean }>) =>
    apiPatch<{ mailbox: MailboxEntry }>(`/mailboxes/${id}`, data),

  /** 删除邮箱 Provider */
  delete: (id: number) => apiDelete<{ ok: boolean }>(`/mailboxes/${id}`),

  /** 测试连通性 */
  test: (id: number) =>
    apiPost<{ ok: boolean; status_code?: number; message: string }>(`/mailboxes/${id}/test`),

  /** 获取可用域名 */
  domains: (id: number) =>
    apiGet<{ ok: boolean; items: string[]; endpoint?: string; message?: string }>(
      `/mailboxes/${id}/domains`
    ),

  /** 从系统默认配置导入 */
  importDefault: (force?: boolean) =>
    apiPost<{ ok: boolean; skipped?: boolean; message?: string; mailbox?: MailboxEntry }>(
      `/mailboxes/import-default${force ? '?force=true' : ''}`
    ),
}
