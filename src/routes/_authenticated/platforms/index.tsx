/**
 * 平台管理页
 * Requirement: Task 10.1 - 平台列表、配置弹窗、试跑功能
 */
import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Layers, Settings, Play, RefreshCw, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { platformApi, type Platform } from '@/lib/api'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { SchemaForm } from '@/components/common/SchemaForm'

function PlatformsPage() {
  const queryClient = useQueryClient()
  const [configTarget, setConfigTarget] = useState<Platform | null>(null)
  const [configValue, setConfigValue] = useState<Record<string, any>>({})
  const [testRunTarget, setTestRunTarget] = useState<string | null>(null)

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['platforms'],
    queryFn: () => platformApi.list(),
  })

  const updateConfigMutation = useMutation({
    mutationFn: ({ name, config }: { name: string; config: any }) =>
      platformApi.updateConfig(name, config),
    onSuccess: () => {
      toast.success('配置已保存')
      setConfigTarget(null)
      queryClient.invalidateQueries({ queryKey: ['platforms'] })
    },
    onError: (e: Error) => toast.error(e.message || '保存失败'),
  })

  const testRunMutation = useMutation({
    mutationFn: (name: string) => platformApi.testRun(name, {}),
    onSuccess: (result) => {
      if (result.ok) toast.success(result.message || '试跑成功')
      else toast.error(result.message || '试跑失败')
      setTestRunTarget(null)
    },
    onError: (e: Error) => {
      toast.error(e.message || '试跑失败')
      setTestRunTarget(null)
    },
  })

  const platforms = data?.platforms || []

  const openConfig = (p: Platform) => {
    setConfigTarget(p)
    setConfigValue(p.config || {})
  }

  const handleSaveConfig = () => {
    if (!configTarget) return
    updateConfigMutation.mutate({ name: configTarget.name, config: configValue })
  }

  const handleTestRun = (name: string) => {
    setTestRunTarget(name)
    testRunMutation.mutate(name)
  }

  return (
    <div className='space-y-6 p-6'>
      {/* 标题 */}
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-3'>
          <Layers className='text-primary size-6' />
          <div>
            <h1 className='text-2xl font-bold'>平台管理</h1>
            <p className='text-muted-foreground mt-0.5 text-sm'>
              管理注册平台、配置执行参数、试跑验证
            </p>
          </div>
        </div>
        <Button variant='outline' size='sm' onClick={() => refetch()} disabled={isLoading}>
          <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          刷新
        </Button>
      </div>

      {/* 平台卡片列表 */}
      {platforms.length === 0 ? (
        <Card>
          <CardContent className='py-16 text-center'>
            <Layers className='text-muted-foreground/40 mx-auto mb-3 size-12' />
            <div className='text-muted-foreground text-sm'>暂无平台</div>
          </CardContent>
        </Card>
      ) : (
        <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
          {platforms.map((p) => (
            <Card key={p.name} className={cn(!p.enabled && 'opacity-60')}>
              <CardHeader className='flex-row items-start justify-between pb-3'>
                <div>
                  <CardTitle className='text-base'>{p.display_name}</CardTitle>
                  <span className='text-muted-foreground font-mono text-xs'>{p.name}</span>
                </div>
                <Switch checked={p.enabled} disabled />
              </CardHeader>
              <CardContent className='space-y-3'>
                {/* 执行器徽章 */}
                <div className='flex flex-wrap gap-1.5'>
                  <Badge variant='outline'>{p.executor_type}</Badge>
                  {p.capabilities?.map((cap) => (
                    <Badge key={cap} variant='secondary' className='text-[10px]'>
                      {cap}
                    </Badge>
                  ))}
                </div>

                {/* 操作按钮 */}
                <div className='flex gap-2'>
                  <Button
                    variant='outline'
                    size='sm'
                    className='h-7 text-xs'
                    onClick={() => openConfig(p)}
                  >
                    <Settings size={12} />
                    配置
                  </Button>
                  <Button
                    variant='outline'
                    size='sm'
                    className='h-7 text-xs'
                    onClick={() => handleTestRun(p.name)}
                    disabled={testRunTarget === p.name}
                  >
                    {testRunTarget === p.name ? (
                      <RefreshCw size={12} className='animate-spin' />
                    ) : (
                      <Play size={12} />
                    )}
                    试跑
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 配置弹窗 */}
      <Dialog open={!!configTarget} onOpenChange={() => setConfigTarget(null)}>
        <DialogContent className='max-h-[80vh] max-w-lg overflow-y-auto'>
          <DialogHeader>
            <DialogTitle>配置 - {configTarget?.display_name}</DialogTitle>
          </DialogHeader>
          {configTarget?.config_schema ? (
            <SchemaForm
              schema={configTarget.config_schema}
              value={configValue}
              onChange={setConfigValue}
            />
          ) : (
            <div className='text-muted-foreground py-6 text-center text-sm'>
              该平台无可配置项
            </div>
          )}
          <div className='flex justify-end gap-2 pt-4'>
            <Button variant='outline' onClick={() => setConfigTarget(null)}>
              取消
            </Button>
            <Button
              onClick={handleSaveConfig}
              disabled={updateConfigMutation.isPending}
            >
              <CheckCircle2 size={14} />
              保存
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export const Route = createFileRoute('/_authenticated/platforms/')({
  component: PlatformsPage,
})
