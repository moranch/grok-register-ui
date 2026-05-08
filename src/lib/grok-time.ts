/**
 * 后端返回的时间字符串格式化辅助函数
 *
 * 后端 now_iso() 返回格式：'2026-05-08 15:58:55'（无时区信息）
 *
 * 两种情况：
 * - 服务器容器已配置 TZ=Asia/Shanghai → 字符串就是东八区时间
 * - 服务器容器是 UTC（默认）→ 字符串是 UTC 时间
 *
 * 通过 `import.meta.env.VITE_BACKEND_TZ` 控制后端时区行为：
 *   - 未设置（默认）：视为已经是浏览器本地时区
 *   - 'utc'：视为 UTC，自动转到浏览器本地时区
 */

const backendTz = (import.meta.env?.VITE_BACKEND_TZ || '').toLowerCase()

/**
 * 获取浏览器当前时区的 UTC 偏移字符串，例如 "UTC+8"、"UTC-5:30"
 */
function getUtcOffsetLabel(): string {
  const offsetMin = -new Date().getTimezoneOffset() // 东八区为 480
  const sign = offsetMin >= 0 ? '+' : '-'
  const abs = Math.abs(offsetMin)
  const hours = Math.floor(abs / 60)
  const minutes = abs % 60
  return minutes === 0
    ? `UTC${sign}${hours}`
    : `UTC${sign}${hours}:${String(minutes).padStart(2, '0')}`
}

/**
 * 两位补零
 */
const pad = (n: number) => String(n).padStart(2, '0')

/**
 * 格式化后端时间字符串为本地可读字符串，并带上时区标签
 * 示例输出：'2026-05-08 23:58:55 (UTC+8)'
 */
export function formatBackendTime(
  raw: string | null | undefined,
  fallback = '-'
): string {
  if (!raw) return fallback
  const s = String(raw).trim()
  if (!s) return fallback

  // 把 "2026-05-08 15:58:55" 转成 ISO 形式
  const normalized = s.includes('T') ? s : s.replace(' ', 'T')
  const isoStr =
    backendTz === 'utc' && !normalized.endsWith('Z')
      ? `${normalized}Z`
      : normalized

  const d = new Date(isoStr)
  if (Number.isNaN(d.getTime())) return s

  // 按浏览器本地时区格式化
  const formatted =
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`

  return `${formatted} (${getUtcOffsetLabel()})`
}

/**
 * 只返回 UTC 偏移标签（方便单独显示在标题右侧等位置）
 */
export function getCurrentTzLabel(): string {
  return getUtcOffsetLabel()
}
