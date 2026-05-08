import { type QueryClient } from '@tanstack/react-query'
import {
  createRootRouteWithContext,
  Outlet,
} from '@tanstack/react-router'
import { ThemeCustomizationProvider } from '@/context/theme-customization-provider'
import { useSystemConfig } from '@/hooks/use-system-config'
import { Toaster } from '@/components/ui/sonner'
import { NavigationProgress } from '@/components/navigation-progress'
import { GeneralError } from '@/features/errors/general-error'
import { NotFoundError } from '@/features/errors/not-found-error'

function RootComponent() {
  // Load system configuration (logo, system name, etc.) from backend
  useSystemConfig({ autoLoad: true })

  return (
    <ThemeCustomizationProvider>
      <NavigationProgress />
      <Outlet />
      <Toaster duration={5000} />
    </ThemeCustomizationProvider>
  )
}

// 缓存 setup 状态检查结果，避免每次导航都重复调用 API
// 使用 localStorage 持久化，避免页面刷新后重复检查
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const SETUP_CHECKED_KEY = 'setup_status_checked'

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient
}>()({
  // 应用初始化与路由解析前统一校验会话
  beforeLoad: async () => {
    // ⚠️ 开发阶段：绕过 setup 检查，直接进入页面
    // TODO: 接入 grok-register-main 后端后恢复此逻辑
    return
  },
  component: RootComponent,
  notFoundComponent: NotFoundError,
  errorComponent: GeneralError,
})
