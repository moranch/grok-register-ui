/**
 * API 模块统一导出
 * Requirement: Task 9.1 - API 层重构，按资源分组
 */
export { platformApi } from './platforms'
export { taskApi } from './tasks'
export { accountApi } from './accounts'
export { exporterApi } from './exporters'
export { mailboxApi } from './mailboxes'
export { captchaApi } from './captcha'
export { proxyApi } from './proxies'
export { lifecycleApi } from './lifecycle'
export { statsApi } from './stats'
export { settingsApi } from './settings'
export { authApi } from './auth'

// 重新导出类型
export type { Platform } from './platforms'
export type { Task } from './tasks'
export type {
  AccountEntry,
  AccountLifecycle,
  AccountPlanState,
  AccountValidity,
  AccountAssetSummary,
} from './accounts'
export type { ExporterEntry, ExporterStatus } from './exporters'
export type { MailboxEntry, MailboxProviderType } from './mailboxes'
export type { CaptchaProvider, CaptchaTestResult } from './captcha'
export type { ProxyEntry } from './proxies'
export type {
  LifecycleStatus,
  LifecycleCheckResult,
  LifecycleWorkerInfo,
} from './lifecycle'
export type {
  StatsOverview,
  StatsErrorItem,
  StatsByProxyItem,
  StatsByPlatformItem,
} from './stats'
export type { SystemSettings } from './settings'
export type { AuthStatus } from './auth'
