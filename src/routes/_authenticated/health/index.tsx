import { useEffect } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import {
  HeartPulse,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Server,
  Database,
  Globe,
  Shield,
} from 'lucide-react'
import { useGrokStore } from '@/stores/grok-store'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

const healthIcons: Record<string, typeof HeartPulse> = {
  server: Server,
  database: Database,
  network: Globe,
  security: Shield,
}

function HealthPage() {
  const { healthItems, healthCheckedAt, loadingHealth, fetchHealth } =
    useGrokStore()

  useEffect(() => {
    fetchHealth()
  }, [fetchHealth])

  return (
    <div className='space-y-6 p-6'>
      {/* 标题 */}
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-3'>
          <HeartPulse className='text-primary size-6' />
          <div>
            <h1 className='text-2xl font-bold'>健康检查</h1>
            <p className='text-muted-foreground mt-0.5 text-sm'>
              检查外部服务与依赖的运行状态
            </p>
          </div>
        </div>
        <Button onClick={fetchHealth} disabled={loadingHealth}>
          <RefreshCw
            size={16}
            className={loadingHealth ? 'animate-spin' : ''}
          />
          {loadingHealth ? '检测中...' : '重新检测'}
        </Button>
      </div>

      {/* 检测时间 */}
      <div className='text-muted-foreground flex items-center gap-2 text-sm'>
        <Clock size={16} />
        <span>
          检测时间:{' '}
          {healthCheckedAt ? new Date(healthCheckedAt).toLocaleString() : '-'}
        </span>
      </div>

      {/* 检查项卡片 */}
      {healthItems.length === 0 ? (
        <Card>
          <CardContent className='py-16 text-center'>
            <HeartPulse className='text-muted-foreground/40 mx-auto mb-3 size-12' />
            <div className='text-muted-foreground text-sm'>
              暂无健康检查结果
            </div>
            <div className='text-muted-foreground/60 mt-1 text-xs'>
              点击"重新检测"开始检查
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className='grid gap-4 md:grid-cols-2'>
          {healthItems.map((item) => {
            const Icon = healthIcons[item.key] || HeartPulse
            return (
              <Card
                key={item.key}
                className={
                  item.ok
                    ? 'border-l-4 border-l-emerald-500'
                    : 'border-l-4 border-l-red-500'
                }
              >
                <CardHeader>
                  <div className='flex items-start justify-between'>
                    <div className='flex items-center gap-3'>
                      <div
                        className={`flex size-10 items-center justify-center rounded-lg ${
                          item.ok
                            ? 'bg-emerald-100 dark:bg-emerald-900/30'
                            : 'bg-red-100 dark:bg-red-900/30'
                        }`}
                      >
                        <Icon
                          size={20}
                          className={
                            item.ok
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-red-600 dark:text-red-400'
                          }
                        />
                      </div>
                      <div>
                        <CardTitle className='text-base'>
                          {item.label}
                        </CardTitle>
                        <div className='text-muted-foreground mt-0.5 text-xs'>
                          {item.target}
                        </div>
                      </div>
                    </div>
                    <Badge variant={item.ok ? 'default' : 'destructive'}>
                      {item.ok ? (
                        <>
                          <CheckCircle2 size={12} />
                          正常
                        </>
                      ) : (
                        <>
                          <XCircle size={12} />
                          异常
                        </>
                      )}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className='bg-muted rounded-lg p-3'>
                    <div className='mb-1 font-medium'>{item.summary}</div>
                    <div className='text-muted-foreground text-sm whitespace-pre-wrap'>
                      {item.detail}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

export const Route = createFileRoute('/_authenticated/health/')({
  component: HealthPage,
})
