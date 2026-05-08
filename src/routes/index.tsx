import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  beforeLoad: () => {
    // 首页直接跳转到仪表盘
    throw redirect({ to: '/dashboard' })
  },
})
