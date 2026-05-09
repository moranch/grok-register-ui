/**
 * 认证 API
 * Requirement: Task 9.1 - 按资源分组的 API 模块
 */
import { apiPost, apiGet } from './client'

export interface AuthStatus {
  authenticated: boolean
  auth_required: boolean
}

export const authApi = {
  /** 登录验证 */
  login: (password: string) =>
    apiPost<{ ok: boolean; message: string }>('/auth/login', { password }),

  /** 检查认证状态 */
  status: () => apiGet<AuthStatus>('/auth/status'),

  /** 修改密码 */
  changePassword: (oldPassword: string, newPassword: string) =>
    apiPost<{ ok: boolean; message: string }>('/auth/change-password', {
      old_password: oldPassword,
      new_password: newPassword,
    }),

  /** 登出 */
  logout: () => apiPost<{ ok: boolean }>('/auth/logout'),
}
