import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { GrokLogo } from '@/components/grok-logo'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'

type SystemBrandProps = {
  defaultName?: string
  defaultVersion?: string
  /**
   * Visual layout:
   * - 'sidebar': stacked card style (used inside the sidebar header).
   * - 'inline': compact horizontal pill (used inside the top app bar).
   */
  variant?: 'sidebar' | 'inline'
}

const BRAND_NAME = 'Grok Register'
const BRAND_SUBTITLE = 'Console'

/**
 * System brand component
 *
 * 直接使用 GrokLogo SVG 组件 + 固定品牌文案，不再依赖后端 /api/status
 * - inline: 顶部应用栏的紧凑 pill 样式，点击回首页
 * - sidebar: 侧边栏 header 的堆叠卡片
 */
export function SystemBrand(props: SystemBrandProps) {
  const { t } = useTranslation()
  const variant = props.variant ?? 'sidebar'
  const name = props.defaultName || BRAND_NAME
  const version = props.defaultVersion || BRAND_SUBTITLE

  if (variant === 'inline') {
    return (
      <Link
        to='/'
        aria-label={t('Go to home')}
        className={cn(
          'text-foreground inline-flex h-7 items-center gap-1.5 rounded-md px-1.5 text-sm font-medium transition-colors outline-none select-none',
          'hover:bg-accent focus-visible:ring-ring/40 focus-visible:ring-2'
        )}
      >
        <GrokLogo className='size-5 shrink-0' />
        <span className='max-w-[12rem] truncate'>{name}</span>
      </Link>
    )
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          size='lg'
          className='hover:text-sidebar-foreground active:text-sidebar-foreground cursor-default hover:bg-transparent active:bg-transparent'
          render={<div />}
        >
          <GrokLogo className='size-8 shrink-0' />
          <div className='grid flex-1 text-start text-sm leading-tight group-data-[collapsible=icon]:hidden'>
            <span className='truncate font-semibold'>{name}</span>
            <span className='text-muted-foreground truncate text-xs'>
              {version}
            </span>
          </div>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
