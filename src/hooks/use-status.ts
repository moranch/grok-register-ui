/**
 * useStatus —— 系统状态 hook
 *
 * Grok Register Console 后端不提供 `/api/status`（那是前端模板自带的
 * one-api/new-api 系统信息端点）。本 hook 直接返回空状态，避免无效 404 轮询。
 *
 * 原模板逻辑保留在 git 历史中；如果后续需要接入真实系统状态，应改为调用
 * grokApi 的 `/system/info` 等端点并重新实现 `mapStatusDataToConfig`。
 */
import type { SystemStatus } from '@/features/auth/types'

export function useStatus() {
  return {
    status: null as SystemStatus | null,
    loading: false,
    error: null as Error | null,
  }
}
