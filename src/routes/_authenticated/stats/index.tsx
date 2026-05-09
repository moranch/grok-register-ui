import { useEffect, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import {
  BarChart3,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
} from 'lucide-react'
import { useGrokStore } from '@/stores/grok-store'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

const ERROR_KIND_LABEL: Record<string, string> = {
  turnstile_failed: 'Turnstile 失败',
  timeout: '超时',
  proxy_host_unreachable: '代理不可达（SOCKS Host unreachable）',
  proxy_error: '代理错误',
  anti_bot_challenge: '反爬 / CAPTCHA',
  email_otp_failed: '邮箱验证码异常',
  rate_limited: '限流（429）',
  blocked: '被拦截 / 封禁',
  other: '其他',
  unknown: '未知',
}

function StatsPage() {
  const {
    statsOverview,
    statsErrors,
    statsByProxy,
    loadingStats,
    fetchStats,
  } = useGrokStore()

  const [days, setDays] = useState(7)

  useEffect(() => {
    fetchStats(days)
  }, [fetchStats, days])

  const maxTrend = Math.max(
    1,
    ...(statsOverview?.trend || []).map((t) => t.ok + t.fail)
  )
  const totalErrorCount = statsErrors.reduce((s, e) => s + e.count, 0)

  return (
    <div className='space-y-6 p-6'>
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-3'>
          <BarChart3 className='text-primary size-6' />
          <div>
            <h1 className='text-2xl font-bold'>统计分析</h1>
            <p className='text-muted-foreground mt-0.5 text-sm'>
              注册成功率、趋势、错误聚合与代理成功率排行
            </p>
          </div>
        </div>
        <div className='flex items-center gap-2'>
          <select
            className='bg-background h-9 rounded-md border px-2 text-sm'
            value={days}
            onChange={(e) => setDays(parseInt(e.target.value))}
          >
            <option value={1}>近 1 天</option>
            <option value={7}>近 7 天</option>
            <option value={30}>近 30 天</option>
            <option value={90}>近 90 天</option>
          </select>
          <Button
            variant='outline'
            size='sm'
            onClick={() => fetchStats(days)}
            disabled={loadingStats}
          >
            <RefreshCw
              size={16}
              className={loadingStats ? 'animate-spin' : ''}
            />
            刷新
          </Button>
        </div>
      </div>

      {/* 概览卡片 */}
      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-5'>
        <OverviewCard
          label='注册事件'
          value={statsOverview?.total_events ?? 0}
        />
        <OverviewCard
          label='成功数'
          value={statsOverview?.success_count ?? 0}
          accent='emerald'
          icon={<TrendingUp size={14} />}
        />
        <OverviewCard
          label='失败数'
          value={statsOverview?.failure_count ?? 0}
          accent='red'
          icon={<TrendingDown size={14} />}
        />
        <OverviewCard
          label='成功率'
          value={`${statsOverview?.success_rate ?? 0}%`}
          accent={
            (statsOverview?.success_rate ?? 0) >= 50 ? 'emerald' : 'red'
          }
        />
        <OverviewCard
          label='账号池'
          value={statsOverview?.account_count ?? 0}
          accent='violet'
        />
      </div>

      {/* 趋势图 */}
      <Card>
        <CardHeader>
          <CardTitle className='text-base'>每日注册趋势</CardTitle>
        </CardHeader>
        <CardContent>
          {!statsOverview?.trend.length ? (
            <div className='text-muted-foreground py-10 text-center text-sm'>
              暂无数据
            </div>
          ) : (
            <div className='space-y-2'>
              {statsOverview.trend.map((t) => {
                const pct = ((t.ok + t.fail) / maxTrend) * 100
                const okPct =
                  t.ok + t.fail > 0
                    ? Math.round((t.ok / (t.ok + t.fail)) * 100)
                    : 0
                return (
                  <div key={t.day} className='flex items-center gap-3'>
                    <div className='w-[96px] font-mono text-xs'>{t.day}</div>
                    <div className='relative flex-1'>
                      <div className='bg-muted/60 h-6 overflow-hidden rounded-md'>
                        <div
                          className='flex h-full'
                          style={{ width: `${pct}%` }}
                        >
                          <div
                            className='bg-emerald-500'
                            style={{ width: `${okPct}%` }}
                          />
                          <div
                            className='bg-red-500'
                            style={{ width: `${100 - okPct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                    <div className='w-[140px] text-right text-xs'>
                      <span className='text-emerald-600 dark:text-emerald-400'>
                        ✓ {t.ok}
                      </span>
                      <span className='text-muted-foreground mx-1'>/</span>
                      <span className='text-red-600 dark:text-red-400'>
                        ✗ {t.fail}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 错误聚合 */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2 text-base'>
            <AlertTriangle className='size-4 text-amber-500' />
            错误聚合（Top {statsErrors.length}）
          </CardTitle>
        </CardHeader>
        <CardContent>
          {statsErrors.length === 0 ? (
            <div className='text-muted-foreground py-8 text-center text-sm'>
              近 {days} 天内没有失败事件
            </div>
          ) : (
            <div className='space-y-2'>
              {statsErrors.map((e) => {
                const pct =
                  totalErrorCount > 0 ? (e.count / totalErrorCount) * 100 : 0
                return (
                  <div
                    key={e.kind}
                    className='rounded-lg border p-3 transition hover:bg-muted/40'
                  >
                    <div className='mb-2 flex items-center justify-between'>
                      <div className='flex items-center gap-2'>
                        <Badge variant='destructive'>{e.kind}</Badge>
                        <span className='text-sm font-medium'>
                          {ERROR_KIND_LABEL[e.kind] || e.kind}
                        </span>
                      </div>
                      <span className='text-sm font-semibold'>
                        {e.count} 次（{pct.toFixed(1)}%）
                      </span>
                    </div>
                    <Progress value={pct} />
                    {e.sample && (
                      <p className='text-muted-foreground mt-2 truncate font-mono text-xs'>
                        样例：{e.sample}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 代理成功率排行 */}
      <Card>
        <CardHeader>
          <CardTitle className='text-base'>代理成功率排行</CardTitle>
        </CardHeader>
        <CardContent>
          {statsByProxy.length === 0 ? (
            <div className='text-muted-foreground py-8 text-center text-sm'>
              暂无数据
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>代理</TableHead>
                  <TableHead>总请求</TableHead>
                  <TableHead>成功</TableHead>
                  <TableHead>失败</TableHead>
                  <TableHead>成功率</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {statsByProxy.map((p) => (
                  <TableRow key={p.proxy_url}>
                    <TableCell className='max-w-[300px] truncate font-mono text-xs'>
                      {p.proxy_url}
                    </TableCell>
                    <TableCell>{p.total}</TableCell>
                    <TableCell className='text-emerald-600 dark:text-emerald-400'>
                      {p.ok}
                    </TableCell>
                    <TableCell className='text-red-600 dark:text-red-400'>
                      {p.fail}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          p.success_rate >= 70
                            ? 'default'
                            : p.success_rate >= 30
                              ? 'secondary'
                              : 'destructive'
                        }
                      >
                        {p.success_rate}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function OverviewCard({
  label,
  value,
  accent,
  icon,
}: {
  label: string
  value: number | string
  accent?: 'emerald' | 'red' | 'violet'
  icon?: React.ReactNode
}) {
  const color =
    accent === 'emerald'
      ? 'text-emerald-600 dark:text-emerald-400'
      : accent === 'red'
        ? 'text-red-600 dark:text-red-400'
        : accent === 'violet'
          ? 'text-violet-600 dark:text-violet-400'
          : 'text-foreground'
  return (
    <Card>
      <CardContent className='py-4'>
        <div className='text-muted-foreground mb-1 flex items-center gap-1 text-xs tracking-wider uppercase'>
          {icon}
          {label}
        </div>
        <div className={cn('text-2xl font-bold', color)}>{value}</div>
      </CardContent>
    </Card>
  )
}

export const Route = createFileRoute('/_authenticated/stats/')({
  component: StatsPage,
})
