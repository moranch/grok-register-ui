import {
  LayoutDashboard,
  ListTodo,
  HeartPulse,
  Settings,
  Network,
  Users,
  BarChart3,
  Monitor,
  Mail,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { GrokLogo } from '@/components/grok-logo'
import { WORKSPACE_IDS } from '@/components/layout/lib/workspace-registry'
import { type SidebarData } from '@/components/layout/types'

/**
 * 参考 any-auto-register 的菜单布局：
 *   - 两段式结构：主导航（总览/任务/账号/统计）+ 运维（代理/健康/noVNC）+ 系统（设置）
 *   - 每个分组都有 title 作为视觉分隔
 *   - "设置"页内部自带左侧子导航（tab bar），不走 sidebar collapsible 子菜单
 *     —— 避免 TanStack Router 对 ?query 链接的类型/路由处理问题
 */
export function useSidebarData(): SidebarData {
  const { t } = useTranslation()

  return {
    workspaces: [
      {
        id: WORKSPACE_IDS.DEFAULT,
        name: 'Grok Register',
        logo: GrokLogo,
        plan: 'Console',
      },
    ],
    navGroups: [
      {
        id: 'main',
        title: t('主导航'),
        items: [
          {
            title: t('总览'),
            url: '/dashboard',
            icon: LayoutDashboard,
          },
          {
            title: t('任务'),
            url: '/tasks',
            icon: ListTodo,
          },
          {
            title: t('账户资产'),
            url: '/accounts',
            icon: Users,
          },
          {
            title: t('统计'),
            url: '/stats',
            icon: BarChart3,
          },
        ],
      },
      {
        id: 'ops',
        title: t('运维'),
        items: [
          {
            title: t('代理池'),
            url: '/proxies',
            icon: Network,
          },
          {
            title: t('邮箱 Provider'),
            url: '/mailboxes',
            icon: Mail,
          },
          {
            title: t('健康检查'),
            url: '/health',
            icon: HeartPulse,
          },
          {
            title: t('可视化调试'),
            url: '/novnc',
            icon: Monitor,
          },
        ],
      },
      {
        id: 'system',
        title: t('系统'),
        items: [
          {
            title: t('设置'),
            url: '/settings',
            icon: Settings,
          },
        ],
      },
    ],
  }
}
