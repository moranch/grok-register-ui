import {
  LayoutDashboard,
  ListTodo,
  HeartPulse,
  Settings,
  Network,
  Users,
  BarChart3,
  Monitor,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { GrokLogo } from '@/components/grok-logo'
import { WORKSPACE_IDS } from '@/components/layout/lib/workspace-registry'
import { type SidebarData } from '@/components/layout/types'

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
        title: t('控制台'),
        items: [
          {
            title: t('仪表盘'),
            url: '/dashboard',
            icon: LayoutDashboard,
          },
          {
            title: t('任务管理'),
            url: '/tasks',
            icon: ListTodo,
          },
          {
            title: t('账号管理'),
            url: '/accounts',
            icon: Users,
          },
          {
            title: t('统计分析'),
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
            title: t('健康检查'),
            url: '/health',
            icon: HeartPulse,
          },
          {
            title: t('可视化调试'),
            url: '/novnc',
            icon: Monitor,
          },
          {
            title: t('系统配置'),
            url: '/settings',
            icon: Settings,
          },
        ],
      },
    ],
  }
}
