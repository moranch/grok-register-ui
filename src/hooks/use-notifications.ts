/**
 * useNotifications —— 顶栏通知 hook
 *
 * Grok Register Console 后端不提供 `/api/notice` 与 `/api/status.announcements`
 * （均为前端模板 one-api/new-api 自带端点）。本 hook 直接返回"无通知"，
 * 仅保留 dialog 开关以兼容 app-header 的 UI 调用。
 */
import { useState } from 'react'

export function useNotifications() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'notice' | 'announcements'>(
    'notice'
  )

  return {
    // Data
    notice: '',
    announcements: [] as Record<string, unknown>[],
    loading: false,

    // Unread counts
    unreadCount: 0,
    unreadNoticeCount: 0,
    unreadAnnouncementsCount: 0,

    // Dialog state
    dialogOpen,
    setDialogOpen,
    activeTab,
    setActiveTab,

    // Actions
    openDialog: (tab?: 'notice' | 'announcements') => {
      setActiveTab(tab || 'notice')
      setDialogOpen(true)
    },
    closeDialog: () => setDialogOpen(false),
    closeToday: () => setDialogOpen(false),
    refetchNotice: () => {
      /* noop */
    },

    // Status
    isNoticeClosed: false,
  }
}
