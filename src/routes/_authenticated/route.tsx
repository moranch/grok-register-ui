import { createFileRoute, redirect } from '@tanstack/react-router'
import grokApi from '@/lib/grok-api'
import { AuthenticatedLayout } from '@/components/layout'

// 仅首次会话校验一次，避免每次路由切换都打后端
let authChecked = false

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async ({ location }) => {
    if (authChecked) return

    try {
      const res = await grokApi.get('/auth/status')
      const data = res.data as {
        auth_required: boolean
        authenticated: boolean
      }

      // 后端未启用密码 或 已认证 → 放行
      if (!data.auth_required || data.authenticated) {
        authChecked = true
        return
      }

      // 需要认证但未登录 → 跳登录页
      throw redirect({
        to: '/sign-in',
        search: { redirect: location.href },
      })
    } catch (err) {
      // 如果是 redirect 继续抛
      if (err && typeof err === 'object' && 'isRedirect' in err) throw err
      // 网络错误、后端无响应等：放行让前端正常渲染（后续 API 请求各自报错）
      authChecked = true
    }
  },
  component: AuthenticatedLayout,
})
