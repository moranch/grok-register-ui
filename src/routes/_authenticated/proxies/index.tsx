import { useEffect, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import {
  Network,
  Plus,
  RefreshCw,
  Trash2,
  RotateCcw,
  CheckCircle2,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

function ProxiesPage() {
  const {
    proxies,
    loadingProxies,
    fetchProxies,
    addProxy,
    updateProxy,
    deleteProxy,
  } = useGrokStore()

  const [form, setForm] = useState({ url: '', label: '' })
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    fetchProxies()
  }, [fetchProxies])

  const handleAdd = async () => {
    if (!form.url.trim()) {
      toast.error('请填写代理地址')
      return
    }
    setAdding(true)
    try {
      await addProxy({ url: form.url.trim(), label: form.label.trim() })
      toast.success('添加成功')
      setForm({ url: '', label: '' })
    } catch (e) {
      const err = e as { response?: { data?: { detail?: string } } }
      toast.error(err?.response?.data?.detail || '添加失败')
    } finally {
      setAdding(false)
    }
  }

  const handleToggle = async (id: number, enabled: boolean) => {
    try {
      await updateProxy(id, { enabled })
    } catch {
      toast.error('更新失败')
    }
  }

  const handleResetStats = async (id: number) => {
    try {
      await updateProxy(id, { reset_stats: true })
      toast.success('已重置统计')
    } catch {
      toast.error('操作失败')
    }
  }

  const handleDelete = async (id: number) => {
    if (!window.confirm(`确认删除代理 #${id}？`)) return
    try {
      await deleteProxy(id)
      toast.success('已删除')
    } catch {
      toast.error('删除失败')
    }
  }

  const total = proxies.length
  const enabled = proxies.filter((p) => p.enabled).length
  const totalSuccess = proxies.reduce((s, p) => s + p.success_count, 0)
  const totalFailure = proxies.reduce((s, p) => s + p.failure_count, 0)
  const overallRate =
    totalSuccess + totalFailure > 0
      ? ((totalSuccess / (totalSuccess + totalFailure)) * 100).toFixed(1)
      : '0'

  return (
    <div className='space-y-6 p-6'>
      {/* 标题 */}
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-3'>
          <Network className='text-primary size-6' />
          <div>
            <h1 className='text-2xl font-bold'>代理池</h1>
            <p className='text-muted-foreground mt-0.5 text-sm'>
              多代理按成功率加权轮询，连续失败 5 次自动禁用
            </p>
          </div>
        </div>
        <Button
          variant='outline'
          size='sm'
          onClick={fetchProxies}
          disabled={loadingProxies}
        >
          <RefreshCw
            size={16}
            className={loadingProxies ? 'animate-spin' : ''}
          />
          刷新
        </Button>
      </div>

      {/* 概览 */}
      <div className='grid gap-4 md:grid-cols-4'>
        <StatMini label='代理总数' value={total} />
        <StatMini label='启用中' value={enabled} accent='emerald' />
        <StatMini label='成功总数' value={totalSuccess} accent='sky' />
        <StatMini label='整体成功率' value={`${overallRate}%`} accent='violet' />
      </div>

      {/* 新增表单 */}
      <Card>
        <CardHeader>
          <CardTitle className='text-base'>添加代理</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='flex flex-col gap-3 md:flex-row md:items-end'>
            <div className='flex-1 space-y-2'>
              <Label htmlFor='proxy-url'>代理地址</Label>
              <Input
                id='proxy-url'
                placeholder='socks5://warp:1080 或 http://user:pass@host:port'
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
              />
            </div>
            <div className='w-full space-y-2 md:w-[240px]'>
              <Label htmlFor='proxy-label'>备注</Label>
              <Input
                id='proxy-label'
                placeholder='WARP-主节点'
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
              />
            </div>
            <Button onClick={handleAdd} disabled={adding}>
              <Plus size={16} />
              {adding ? '添加中...' : '添加'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 代理列表 */}
      <Card>
        <CardHeader>
          <CardTitle className='text-base'>代理列表</CardTitle>
        </CardHeader>
        <CardContent>
          {proxies.length === 0 ? (
            <div className='text-muted-foreground py-10 text-center text-sm'>
              暂无代理。系统将回落到系统配置页里填的默认代理。
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>URL</TableHead>
                  <TableHead>备注</TableHead>
                  <TableHead>启用</TableHead>
                  <TableHead>成功 / 失败</TableHead>
                  <TableHead>成功率</TableHead>
                  <TableHead>连续失败</TableHead>
                  <TableHead className='text-right'>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {proxies.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className='font-mono text-xs'>{p.id}</TableCell>
                    <TableCell className='max-w-[320px] truncate font-mono text-xs'>
                      {p.url}
                    </TableCell>
                    <TableCell className='text-sm'>{p.label || '-'}</TableCell>
                    <TableCell>
                      <Switch
                        checked={p.enabled}
                        onCheckedChange={(v: boolean) => handleToggle(p.id, v)}
                      />
                    </TableCell>
                    <TableCell className='text-sm'>
                      <span className='text-emerald-600 dark:text-emerald-400'>
                        {p.success_count}
                      </span>
                      {' / '}
                      <span className='text-red-600 dark:text-red-400'>
                        {p.failure_count}
                      </span>
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
                    <TableCell>
                      <span
                        className={cn(
                          'text-sm font-semibold',
                          p.consecutive_failures >= 3
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-muted-foreground'
                        )}
                      >
                        {p.consecutive_failures}
                        {p.consecutive_failures >= 5 && ' (已自动禁用)'}
                      </span>
                    </TableCell>
                    <TableCell className='text-right'>
                      <div className='flex justify-end gap-1'>
                        <Button
                          variant='outline'
                          size='icon'
                          className='h-7 w-7'
                          onClick={() => handleResetStats(p.id)}
                          title='重置统计'
                        >
                          <RotateCcw size={12} />
                        </Button>
                        <Button
                          variant='outline'
                          size='icon'
                          className='h-7 w-7'
                          onClick={() => handleDelete(p.id)}
                          title='删除'
                        >
                          <Trash2 size={12} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 说明 */}
      <Card>
        <CardContent className='py-4'>
          <div className='flex items-start gap-3 text-sm'>
            <CheckCircle2 className='mt-0.5 size-4 shrink-0 text-emerald-500' />
            <div>
              <div className='font-medium'>工作原理</div>
              <p className='text-muted-foreground mt-1 leading-relaxed'>
                每次启动任务时，系统会从"启用"状态的代理里按
                <code className='bg-muted mx-1 rounded px-1 py-0.5 text-xs'>
                  (success+1)/(success+failure+2)
                </code>
                加权随机挑一个（Laplace 平滑）。挑中的代理会覆盖任务的
                <code className='bg-muted mx-1 rounded px-1 py-0.5 text-xs'>
                  proxy / browser_proxy
                </code>
                。连续失败 ≥ 5 次会自动禁用，避免把失败的代理继续往下轮。
              </p>
            </div>
          </div>
          <div className='mt-3 flex items-start gap-3 text-sm'>
            <XCircle className='mt-0.5 size-4 shrink-0 text-amber-500' />
            <div>
              <div className='font-medium'>注意</div>
              <p className='text-muted-foreground mt-1 leading-relaxed'>
                没有启用的代理时，任务会回落到系统配置页里填的默认代理。如果默认代理也为空，
                说明整个链路没配代理，x.ai 会直连出口。
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function StatMini({
  label,
  value,
  accent,
}: {
  label: string
  value: number | string
  accent?: 'emerald' | 'sky' | 'violet'
}) {
  const color =
    accent === 'emerald'
      ? 'text-emerald-600 dark:text-emerald-400'
      : accent === 'sky'
        ? 'text-sky-600 dark:text-sky-400'
        : accent === 'violet'
          ? 'text-violet-600 dark:text-violet-400'
          : 'text-foreground'
  return (
    <Card>
      <CardContent className='py-4'>
        <div className='text-muted-foreground mb-1 text-xs tracking-wider uppercase'>
          {label}
        </div>
        <div className={cn('text-2xl font-bold', color)}>{value}</div>
      </CardContent>
    </Card>
  )
}

export const Route = createFileRoute('/_authenticated/proxies/')({
  component: ProxiesPage,
})
