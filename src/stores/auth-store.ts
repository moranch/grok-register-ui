import { create } from 'zustand'

export type UserPermissions = {
  sidebar_settings?: boolean
  sidebar_modules?: Record<string, unknown>
}

export interface AuthUser {
  id: number
  username: string
  display_name?: string
  email?: string
  role: number
  status?: number
  group?: string
  quota?: number
  used_quota?: number
  request_count?: number
  aff_code?: string
  aff_count?: number
  aff_quota?: number
  aff_history_quota?: number
  inviter_id?: number
  github_id?: string
  oidc_id?: string
  wechat_id?: string
  telegram_id?: string
  linux_do_id?: string
  setting?: Record<string, unknown> | string
  stripe_customer?: string
  sidebar_modules?: string
  permissions?: UserPermissions
}

interface AuthState {
  auth: {
    user: AuthUser | null
    setUser: (user: AuthUser | null) => void
    reset: () => void
  }
}

export const useAuthStore = create<AuthState>()((set) => {
  // Restore user info from localStorage
  const initUser = (() => {
    try {
      if (typeof window !== 'undefined') {
        const saved = window.localStorage.getItem('user')
        if (saved) return JSON.parse(saved)
      }
    } catch {
      // Clear dirty data when parsing fails
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem('user')
      }
    }

    // ⚠️ 开发阶段：注入一个默认管理员用户，绕过登录
    // TODO: 接入后端后删除此逻辑
    if (typeof window !== 'undefined' && import.meta.env.DEV) {
      const devUser: AuthUser = {
        id: 1,
        username: 'admin',
        display_name: 'Admin (Dev)',
        role: 100,
        status: 1,
        group: 'default',
      }
      try {
        window.localStorage.setItem('user', JSON.stringify(devUser))
      } catch {
        /* empty */
      }
      return devUser
    }
    return null
  })()

  return {
    auth: {
      user: initUser,
      setUser: (user) =>
        set((state) => {
          // Persist user to localStorage
          if (typeof window !== 'undefined') {
            if (user) {
              window.localStorage.setItem('user', JSON.stringify(user))
            } else {
              window.localStorage.removeItem('user')
            }
          }
          return { ...state, auth: { ...state.auth, user } }
        }),
      reset: () =>
        set((state) => {
          if (typeof window !== 'undefined') {
            window.localStorage.removeItem('user')
          }
          return {
            ...state,
            auth: { ...state.auth, user: null },
          }
        }),
    },
  }
})
