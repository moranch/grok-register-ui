import { useEffect } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import {
  ListTodo,
  Play,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Activity,
  Clock,
  Users,
  AlertTriangle,
  Network,
} from 'lucide-react'
import { useGrokStore } from '@/stores/grok-store'
import { formatBackendTime } from '@/lib/grok-time'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
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

function DashboardPage() {
  const {
    tasks,
    fetchTasks,
    healthItems,
    fetchHealth,
    healthCheckedAt,
    statsOverview,
    statsErrors,
    fetchStats,
  } = useGrokStore()

  useEffect(() => {
    fetchTasks()
    fetchHealth()
    fetchStats(7)
    const timer = setInterval(() => {
      fetchTasks()
      fetchStats(7)
    }, 15000)
    return () => clearInterval(timer)
  }, [fetchTasks, fetchHealth, fetchStats])

  const totalTasks = tasks.length
  const runningTasks = tasks.filter((t) => t.status === 'running').length
  const completedTasks = tasks.filter((t) => t.status === 'completed').length
  const failedTasks = tasks.filter((t) => t.status === 'failed').length
  const queuedTasks = tasks.filter((t) => t.status === 'queued').length

  // 优先使用后端的事件级统计；没有数据时回落到 task 聚合
  const totalSuccess =
    statsOverview?.success_count ??
    tasks.reduce((sum, t) => sum + t.completed_count, 0)
  const totalFailed =
    statsOverview?.failure_count ??
    tasks.reduce((sum, t) => sum + t.failed_count, 0)
  const successRate =
    statsOverview?.success_rate ??
    (totalSuccess + totalFailed > 0
      ? Number(((totalSuccess / (totalSuccess + totalFailed)) * 100).toFixed(1))
      : 0)
  const accountCount = statsOverview?.account_count ?? 0

  const statCards = [
    {
      label: '总任务数',
      value: totalTasks,
      icon: ListTodo,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-100 dark:bg-blue-900/30',
    },
    {
      label: '运行中',
      value: runningTasks,
      icon: Play,
      color: 'text-sky-600 dark:text-sky-400',
      bg: 'bg-sky-100 dark:bg-sky-900/30',
    },
    {
      label: '成功注册',
      value: totalSuccess,
      icon: CheckCircle2,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-100 dark:bg-emerald-900/30',
    },
    {
      label: '成功率',
      value: `${successRate}%`,
      icon: TrendingUp,
      color:
        successRate > 50
          ? 'text-emerald-600 dark:text-emerald-400'
          : 'text-red-600 dark:text-red-400',
      bg:
        successRate > 50
          ? 'bg-emerald-100 dark:bg-emerald-900/30'
          : 'bg-red-100 dark:bg-red-900/30',
    },
    {
      label: '账号池',
      value: accountCount,
      icon: Users,
      color: 'text-violet-600 dark:text-violet-400',
      bg: 'bg-violet-100 dark:bg-violet-900/30',
    },
  ]

  const statusDistribution = [
    {
      label: '已完成',
      count: completedTasks,
      color: 'bg-emerald-500',
      textColor: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      label: '运行中',
      count: runningTasks,
      color: 'bg-sky-500',
      textColor: 'text-sky-600 dark:text-sky-400',
    },
    {
      label: '失败',
      count: failedTasks,
      color: 'bg-red-500',
      textColor: 'text-red-600 dark:text-red-400',
    },
    {
      label: '队列中',
      count: queuedTasks,
      color: 'bg-amber-500',
      textColor: 'text-amber-600 dark:text-amber-400',
    },
  ]

  const maxTrend = Math.max(
    1,
    ...(statsOverview?.trend || []).map((t) => t.ok + t.fail)
  )
  const trend = statsOverview?.trend || []

  const topErrors = statsErrors.slice(0, 5)

  return (
    <div className='space-y-6 p-6'>
      {/* 标题 */}
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-2xl font-bold'>仪表盘</h1>
          <p className='text-muted-foreground mt-1 text-sm'>
            Grok Register 运行概览
          </p>
        </div>
        <div className='text-muted-foreground flex items-center gap-2 text-sm'>
          <Activity size={16} />
          <span>实时监控</span>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-5'>
        {statCards.map((card) => (
          <Card key={card.label}>
            <CardContent className='p-5'>
              <div className='flex items-start justify-between'>
                <div>
                  <div className='text-muted-foreground mb-2 text-xs tracking-wider uppercase'>
                    {card.label}
                  </div>
                  <div className={`text-3xl font-bold ${card.color}`}>
                    {card.value}
                  </div>
                </div>
                <div
                  className={`flex size-10 items-center justify-center rounded-lg ${card.bg}`}
                >
                  <card.icon size={20} className={card.color} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 趋势 + 错误 Top 5 */}
      <div className='grid gap-4 lg:grid-cols-2'>
        <Card>
          <CardHeader>
            <CardTitle className='text-base'>近 7 天注册趋势</CardTitle>
          </CardHeader>
          <CardContent>
            {trend.length === 0 ? (
              <div className='text-muted-foreground py-10 text-center text-sm'>
                暂无数据
              </div>
            ) : (
              <div className='space-y-2'>
                {trend.map((t) => {
                  const pct = ((t.ok + t.fail) / maxTrend) * 100
                  const okPct =
                    t.ok + t.fail > 0
                      ? Math.round((t.ok / (t.ok + t.fail)) * 100)
                      : 0
                  return (
                    <div key={t.day} className='flex items-center gap-2'>
                      <div className='w-[88px] font-mono text-xs'>{t.day}</div>
                      <div className='relative flex-1'>
                        <div className='bg-muted/60 h-5 overflow-hidden rounded-md'>
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
                      <div className='w-[100px] text-right text-xs'>
                        <span className='text-emerald-600 dark:text-emerald-400'>
                          {t.ok}
                        </span>
                        <span className='text-muted-foreground mx-1'>/</span>
                        <span className='text-red-600 dark:text-red-400'>
                          {t.fail}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2 text-base'>
              <AlertTriangle className='size-4 text-amber-500' />
              错误 Top 5（近 7 天）
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topErrors.length === 0 ? (
              <div className='text-muted-foreground py-10 text-center text-sm'>
                没有失败事件
              </div>
            ) : (
              <div className='space-y-2'>
                {topErrors.map((e) => (
                  <div
                    key={e.kind}
                    className='flex items-center justify-between rounded-lg border p-2.5'
                  >
                    <div className='flex items-center gap-2'>
                      <Badge variant='destructive' className='text-[10px]'>
                        {e.kind}
                      </Badge>
                    </div>
                    <span className='text-sm font-semibold'>
                      {e.count} 次
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 任务状态 + 健康检查 */}
      <div className='grid gap-4 lg:grid-cols-2'>
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2 text-base'>
              <Network className='size-4' />
              任务状态分布
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-4'>
            {statusDistribution.map((item) => (
              <div key={item.label} className='flex items-center gap-3'>
                <div className={cn('size-3 rounded-full', item.color)} />
                <span className='flex-1 text-sm'>{item.label}</span>
                <span className={cn('font-semibold', item.textColor)}>
                  {item.count}
                </span>
                <div className='w-[100px]'>
                  <Progress
                    value={
                      totalTasks > 0 ? (item.count / totalTasks) * 100 : 0
                    }
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex-row items-center justify-between'>
            <CardTitle className='text-base'>健康检查</CardTitle>
            <div className='text-muted-foreground flex items-center gap-1.5 text-xs'>
              <Clock size={14} />
              <span>{formatBackendTime(healthCheckedAt)}</span>
            </div>
          </CardHeader>
          <CardContent>
            {healthItems.length === 0 ? (
              <div className='text-muted-foreground py-8 text-center text-sm'>
                暂无健康检查结果
              </div>
            ) : (
              <div className='space-y-2'>
                {healthItems.map((item) => (
                  <div
                    key={item.key}
                    className='flex items-center justify-between rounded-lg border p-3'
                  >
                    <div className='flex items-center gap-2.5'>
                      {item.ok ? (
                        <CheckCircle2
                          size={18}
                          className='text-emerald-600 dark:text-emerald-400'
                        />
                      ) : (
                        <XCircle
                          size={18}
                          className='text-red-600 dark:text-red-400'
                        />
                      )}
                      <span className='text-sm font-medium'>{item.label}</span>
                    </div>
                    <Badge variant={item.ok ? 'default' : 'destructive'}>
                      {item.ok ? '正常' : '异常'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 最近任务 */}
      <Card>
        <CardHeader>
          <CardTitle className='text-base'>最近任务</CardTitle>
        </CardHeader>
        <CardContent>
          {tasks.length === 0 ? (
            <div className='text-muted-foreground py-10 text-center text-sm'>
              暂无任务
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>名称</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>成功/目标</TableHead>
                  <TableHead>当前阶段</TableHead>
                  <TableHead>创建时间</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.slice(0, 10).map((task) => (
                  <TableRow key={task.id}>
                    <TableCell className='font-mono text-xs'>
                      #{task.id}
                    </TableCell>
                    <TableCell className='font-medium'>{task.name}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(task.status)}>
                        {task.status}
                      </Badge>
                    </TableCell>
                    <TableCell className='text-sm'>
                      {task.completed_count}/{task.target_count}
                    </TableCell>
                    <TableCell className='text-muted-foreground text-sm'>
                      {task.current_phase || '-'}
                    </TableCell>
                    <TableCell className='text-muted-foreground text-sm'>
                      {formatBackendTime(task.created_at)}
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

function statusVariant(
  status: string
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'completed':
      return 'default'
    case 'running':
      return 'secondary'
    case 'failed':
      return 'destructive'
    case 'queued':
      return 'outline'
    default:
      return 'outline'
  }
}

export const Route = createFileRoute('/_authenticated/dashboard/')({
  component: DashboardPage,
})
