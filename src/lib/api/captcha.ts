/**
 * 验证码服务 API
 * Requirement: Task 9.1 - 按资源分组的 API 模块
 */
import { apiGet, apiPost } from './client'

export interface CaptchaProvider {
  name: string
  type: string
  enabled: boolean
  api_key: string
  balance: number | null
  success_count: number
  failure_count: number
  success_rate: number
  last_used_at: string
}

export interface CaptchaTestResult {
  ok: boolean
  message: string
  solve_time_ms?: number
  provider: string
}

export const captchaApi = {
  /** 获取验证码服务列表 */
  list: () => apiGet<{ providers: CaptchaProvider[] }>('/captcha/providers'),

  /** 获取当前配置 */
  config: () => apiGet<{ provider: string; api_key: string }>('/captcha/config'),

  /** 更新验证码配置 */
  updateConfig: (body: { provider: string; api_key: string }) =>
    apiPost<{ ok: boolean }>('/captcha/config', body),

  /** 测试验证码服务 */
  test: () => apiPost<CaptchaTestResult>('/captcha/test'),

  /** 查询余额 */
  balance: () => apiGet<{ balance: number; provider: string }>('/captcha/balance'),
}
