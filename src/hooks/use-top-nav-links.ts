export type TopNavLink = {
  title: string
  href: string
  disabled?: boolean
  external?: boolean
}

/**
 * Grok Register 控制台：顶部导航保持空，所有功能通过左侧 Sidebar 访问。
 */
export function useTopNavLinks(): TopNavLink[] {
  return []
}
