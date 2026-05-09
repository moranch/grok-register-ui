/**
 * 生命周期管理页
 * Requirement: Task 10.5 - Worker 状态卡片、立即检测、最近检测结果
 */
import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  HeartPulse,
  RefreshCw,
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  Activity,
} from 'lucide-react'
import { toast } from 'sonner'
import { lifecycleApi } from '@/lib/api'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'

function LifecyclePage() {
  const queryClient = useQueryClient()

  const { data: status, isLoading } = useQuery({
    queryKey: ['lifecycle-status'],
    queryFn: () => lifecycleApi.status(),
    refetchInterval: 10000,
  })

  const { data: resultsData } = useQuery({
    queryKey: ['lifecycle-results'],
    queryFn: () => lifecycleApi.recentResults(20),
  })

  const checkMutation = useMutation({
    mutationFn: () => lifecycleApi.check(),
    onSuccess: (result) => {
      if (result.ok) {
        toast.success(`检测完成：检测 ${result.checked} 个，刷新 ${result.refreshed} 个`)
      } else {
        toast.error(result.message || '检测失败')
      }
      queryClient.invalidateQueries({ queryKey: ['lifecycle-status'] })
      queryClient.invalidateQueries({ queryKey: ['lifecycle-results'] })
    },
    onError: (e: Error) => toast.error(e.message || '检测失败'),
  })

  const toggleMutation = useMutation({
    mutationFn: (enabled: boolean) => lifecycleApi.toggle(enabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lifecycle-status'] })
      toast.success('已更新')
    },
    onError: (e: Error) => toast.error(e.message || '操作失败'),
  })

  const results = resultsData?.items || []

  return (
    <div className='space-y-6 p-6'>
      {/* 标题 */}
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-3'>
          <HeartPulse className='text-primary size-6' />
          <div>
            <h1 className='text-2xl font-bold'>生命周期管理</h1>
            <p className='text-muted-foreground mt-0.5 text-sm'>
              自动检测账号有效性、Token 续期
            </p>
          </div>
        </div>
        <Button
          size='sm'
          onClick={() => checkMutation.mutate()}
          disabled={checkMutation.isPending}
        >
          {checkMutation.isPending ? (
            <RefreshCw size={16} className='animate-spin' />
          ) : (
            <Play size={16} />
          )}
          立即检测
        </Button>
      </div>

      {/* Worker 状态卡片 */}
      <div className='grid gap-4 md:grid-cols-4'>
        <Card>
          <CardContent className='py-4'>
            <div className='text-muted-foreground mb-1 text-xs uppercase'>启用状态</div>
            <div className='flex items-center justify-between'>
              <span className={cn('text-lg font-bold', status?.enabled ? 'text-emerald-600' : 'text-muted-foreground')}>
                {status?.enabled ? '已启用' : '已禁用'}
              </span>
              <Switch
                checked={status?.enabled ?? false}
                onCheckedChange={(v) => toggleMutation.mutate(v)}
                disabled={toggleMutation.isPending}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className='py-4'>
            <div className='text-muted-foreground mb-1 text-xs uppercase'>Worker 状态</div>
            <div className='flex items-center gap-2'>
              {status?.running ? (
                <>
                  <Activity size={16} className='text-emerald-500 animate-pulse' />
                  <span className='text-lg font-bold text-emerald-600'>运行中</span>
                </>
              ) : (
                <>
                  <Clock size={16} className='text-muted-foreground' />
                  <span className='text-muted-foreground text-lg font-bold'>空闲</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className='py-4'>
            <div className='text-muted-foreground mb-1 text-xs uppercase'>检测间隔</div>
            <div className='text-lg font-bold'>{status?.check_hours ?? '-'} 小时</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className='py-4'>
            <div className='text-muted-foreground mb-1 text-xs uppercase'>上次检测</div>
            <div className='text-sm font-medium'>
              {status?.last_check_at || '从未执行'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 最近检测结果 */}
      <Card>
        <CardHeader>
          <CardTitle className='text-base'>最近检测结果</CardTitle>
        </CardHeader>
        <CardContent>
          {results.length === 0 ? (
            <div className='text-muted-foreground py-10 text-center text-sm'>
              暂无检测记录
            </div>
          ) : (
            <div className='space-y-2'>
              {results.map((r, i) => (
                <div
                  key={i}
                  className='flex items-center justify-between rounded-lg border p-3'
                >
                  <div className='flex items-center gap-3'>
                    {r.ok ? (
                      <CheckCircle2 size={16} className='text-emerald-500' />
                    ) : (
                      <XCircle size={16} className='text-red-500' />
                    )}
                    <div>
                      <div className='text-sm font-medium'>{r.message}</div>
                      <div className='text-muted-foreground text-xs'>
                        检测 {r.checked} · 刷新 {r.refreshed} · 失败 {r.failed}
                      </div>
                    </div>
                  </div>
                  <div className='flex items-center gap-2'>
                    <Badge variant={r.ok ? 'default' : 'destructive'}>
                      {r.ok ? '成功' : '失败'}
                    </Badge>
                    <span className='text-muted-foreground text-xs'>
                      {r.checked_at}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export const Route = createFileRoute('/_authenticated/lifecycle/')({
  component: LifecyclePage,
})
