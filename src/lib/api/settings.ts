/**
 * 全局配置 API
 * Requirement: Task 9.1 - 按资源分组的 API 模块
 */
import { apiGet, apiPost } from './client'

export interface SystemSettings {
  // 网络
  proxy: string
  browser_proxy: string
  // 邮箱
  temp_mail_api_base: string
  temp_mail_admin_password: string
  temp_mail_domain: string
  temp_mail_site_password: string
  // Token 推送
  api_endpoint: string
  api_token: string
  api_append: boolean
  // 执行器
  debug_mode: boolean
  executor: string
  // 生命周期
  lifecycle_enabled: boolean
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

export const settingsApi = {
  /** 获取当前配置 */
  get: () =>
    apiGet<{ settings: SystemSettings; defaults: Record<string, unknown> }>('/settings'),

  /** 保存配置 */
  save: (data: Partial<SystemSettings>) =>
    apiPost<{ settings: SystemSettings }>('/settings', data),

  /** 重置为默认配置 */
  reset: () => apiPost<{ settings: SystemSettings }>('/settings/reset'),
}
