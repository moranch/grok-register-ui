/**
 * 统计 API
 * Requirement: Task 9.1 - 按资源分组的 API 模块
 */
import { apiGet } from './client'

export interface StatsOverview {
  total_events: number
  success_count: number
  failure_count: number
  success_rate: number
  account_count: number
  trend: { day: string; ok: number; fail: number }[]
}

export interface StatsErrorItem {
  kind: string
  count: number
  sample: string
}

export interface StatsByProxyItem {
  proxy_url: string
  ok: number
  fail: number
  total: number
  success_rate: number
}

export interface StatsByPlatformItem {
  platform: string
  ok: number
  fail: number
  total: number
  success_rate: number
}

export const statsApi = {
  /** 获取总览统计 */
  overview: (days?: number) =>
    apiGet<StatsOverview>('/stats/overview', days ? { days: String(days) } : undefined),

  /** 获取错误统计 */
  errors: (days?: number) =>
    apiGet<{ items: StatsErrorItem[] }>('/stats/errors', days ? { days: String(days) } : undefined),

  /** 按代理统计 */
  byProxy: () => apiGet<{ items: StatsByProxyItem[] }>('/stats/by-proxy'),

  /** 按平台统计 */
  byPlatform: () => apiGet<{ items: StatsByPlatformItem[] }>('/stats/by-platform'),
}
