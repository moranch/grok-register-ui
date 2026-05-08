import { useEffect, useState, useCallback, useMemo } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import {
  Plus,
  Play,
  Square,
  Trash2,
  Loader2,
  FileText,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
  RefreshCw,
  ListTodo,
} from 'lucide-react'
import { toast } from 'sonner'
import type { Task } from '@/lib/grok-api'
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
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'

const RUNNING_STATES = ['queued', 'running', 'stopping']

function TasksPage() {
  const {
    tasks,
    loadingTasks,
    fetchTasks,
    createTask,
    stopTask,
    deleteTask,
    taskLogs,
    fetchTaskLogs,
  } = useGrokStore()

  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: '', count: 50, notes: '' })
  const [creating, setCreating] = useState(false)

  // 定时刷新任务列表
  useEffect(() => {
    fetchTasks()
    const timer = setInterval(fetchTasks, 5000)
    return () => clearInterval(timer)
  }, [fetchTasks])

  // 选中任务时每 3 秒刷新日志
  useEffect(() => {
    if (!selectedTaskId) return
    fetchTaskLogs(selectedTaskId)
    const timer = setInterval(() => fetchTaskLogs(selectedTaskId), 3000)
    return () => clearInterval(timer)
  }, [selectedTaskId, fetchTaskLogs])

  const handleCreate = useCallback(async () => {
    if (!form.name.trim()) {
      toast.error('请填写任务名称')
      return
    }
    setCreating(true)
    try {
      await createTask({
        name: form.name.trim(),
        count: form.count,
        notes: form.notes,
      })
      toast.success('任务创建成功')
      setShowCreate(false)
      setForm({ name: '', count: 50, notes: '' })
    } catch {
      toast.error('任务创建失败')
    } finally {
      setCreating(false)
    }
  }, [form, createTask])

  const handleStop = async (id: number) => {
    try {
      await stopTask(id)
      toast.success(`已停止任务 #${id}`)
    } catch {
      toast.error('停止失败')
    }
  }

  const handleDelete = async (id: number) => {
    if (!window.confirm(`确认删除任务 #${id}？`)) return
    try {
      await deleteTask(id)
      toast.success(`已删除任务 #${id}`)
      if (selectedTaskId === id) {
        setSelectedTaskId(null)
      }
    } catch {
      toast.error('删除失败')
    }
  }

  const selectedTask = useMemo(
    () => tasks.find((t) => t.id === selectedTaskId) || null,
    [tasks, selectedTaskId]
  )
  const logs = selectedTaskId ? taskLogs[selectedTaskId] || [] : []

  return (
    <div className='space-y-6 p-6'>
      {/* 标题 */}
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-3'>
          <ListTodo className='text-primary size-6' />
          <div>
            <h1 className='text-2xl font-bold'>任务管理</h1>
            <p className='text-muted-foreground mt-0.5 text-sm'>
              创建、监控和管理批量注册任务
            </p>
          </div>
        </div>
        <div className='flex items-center gap-2'>
          <Button
            variant='outline'
            size='sm'
            onClick={fetchTasks}
            disabled={loadingTasks}
          >
            <RefreshCw
              size={16}
              className={loadingTasks ? 'animate-spin' : ''}
            />
            刷新
          </Button>
          <Button size='sm' onClick={() => setShowCreate((v) => !v)}>
            <Plus size={16} />
            新建任务
          </Button>
        </div>
      </div>

      {/* 新建任务表单 */}
      {showCreate && (
        <Card className='border-primary/40 animate-in fade-in slide-in-from-top-2 duration-200'>
          <CardHeader className='flex-row items-center justify-between pb-2'>
            <CardTitle className='text-base'>新建任务</CardTitle>
            <Button
              variant='ghost'
              size='sm'
              onClick={() => setShowCreate(false)}
            >
              取消
            </Button>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='grid gap-4 md:grid-cols-3'>
              <div className='space-y-2'>
                <Label htmlFor='task-name'>任务名称</Label>
                <Input
                  id='task-name'
                  placeholder='例如: batch-01'
                  value={form.name}
                  onChange={(e) =>
                    setForm({ ...form, name: e.target.value })
                  }
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='task-count'>执行次数</Label>
                <Input
                  id='task-count'
                  type='number'
                  min={1}
                  max={5000}
                  value={form.count}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      count: parseInt(e.target.value) || 1,
                    })
                  }
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='task-notes'>备注</Label>
                <Input
                  id='task-notes'
                  placeholder='可选'
                  value={form.notes}
                  onChange={(e) =>
                    setForm({ ...form, notes: e.target.value })
                  }
                />
              </div>
            </div>
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? (
                <Loader2 size={16} className='animate-spin' />
              ) : (
                <Play size={16} />
              )}
              创建任务
            </Button>
          </CardContent>
        </Card>
      )}

      {/* 左右分屏：左边列表 + 右边详情 */}
      <div className='grid gap-6 lg:grid-cols-[360px_1fr]'>
        {/* 左：任务列表 */}
        <Card className='h-fit'>
          <CardHeader className='flex-row items-center justify-between pb-3'>
            <CardTitle className='text-base'>任务列表</CardTitle>
            <span className='text-muted-foreground text-xs'>
              共 {tasks.length} 个任务
            </span>
          </CardHeader>
          <CardContent className='pt-0'>
            {tasks.length === 0 ? (
              <div className='text-muted-foreground py-10 text-center'>
                <FileText className='mx-auto mb-3 size-12 opacity-30' />
                <div className='text-sm'>暂无任务</div>
              </div>
            ) : (
              <div className='space-y-2'>
                {tasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    selected={task.id === selectedTaskId}
                    onClick={() => setSelectedTaskId(task.id)}
                    onStop={() => handleStop(task.id)}
                    onDelete={() => handleDelete(task.id)}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 右：任务详情 */}
        {selectedTask ? (
          <TaskDetail
            task={selectedTask}
            logs={logs}
            onStop={() => handleStop(selectedTask.id)}
            onRefreshLogs={() => fetchTaskLogs(selectedTask.id)}
          />
        ) : (
          <Card>
            <CardContent className='text-muted-foreground py-20 text-center'>
              <FileText className='mx-auto mb-3 size-12 opacity-30' />
              <div className='text-sm'>选择任务查看详情</div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

// ======================== 左侧任务卡片 ========================

function TaskCard({
  task,
  selected,
  onClick,
  onStop,
  onDelete,
}: {
  task: Task
  selected: boolean
  onClick: () => void
  onStop: () => void
  onDelete: () => void
}) {
  const progress =
    task.target_count > 0
      ? Math.round((task.completed_count / task.target_count) * 100)
      : 0
  const isRunning = RUNNING_STATES.includes(task.status)

  return (
    <div
      onClick={onClick}
      className={cn(
        'cursor-pointer rounded-lg border p-4 transition-all',
        selected
          ? 'border-primary bg-primary/5'
          : 'hover:border-primary/40 hover:bg-muted/40'
      )}
    >
      <div className='mb-3 flex items-center justify-between gap-2'>
        <span className='truncate text-sm font-semibold'>
          <span className='text-muted-foreground font-mono'>#{task.id}</span>{' '}
          {task.name}
        </span>
        <Badge variant={statusVariant(task.status)} className='shrink-0'>
          {task.status}
        </Badge>
      </div>

      <div className='mb-3'>
        <div className='mb-1.5 flex justify-between text-xs'>
          <span className='text-muted-foreground'>进度</span>
          <span className='font-semibold'>
            {task.completed_count}/{task.target_count}
          </span>
        </div>
        <Progress value={progress} />
      </div>

      <div className='text-muted-foreground mb-3 text-xs'>
        {task.current_phase || '-'}
      </div>

      <div
        className='flex gap-2'
        onClick={(e) => e.stopPropagation()}
        role='toolbar'
      >
        {isRunning ? (
          <Button
            variant='destructive'
            size='sm'
            className='h-7 px-2.5 text-xs'
            onClick={onStop}
          >
            <Square size={12} />
            停止
          </Button>
        ) : (
          <Button
            variant='outline'
            size='sm'
            className='h-7 px-2.5 text-xs'
            onClick={onDelete}
          >
            <Trash2 size={12} />
            删除
          </Button>
        )}
      </div>
    </div>
  )
}

// ======================== 右侧任务详情 ========================

function TaskDetail({
  task,
  logs,
  onStop,
  onRefreshLogs,
}: {
  task: Task
  logs: string[]
  onStop: () => void
  onRefreshLogs: () => void
}) {
  const isRunning = RUNNING_STATES.includes(task.status)

  return (
    <Card>
      <CardHeader className='flex-row items-center justify-between'>
        <CardTitle className='text-base'>
          任务 #{task.id} · {task.name}
        </CardTitle>
        {isRunning && (
          <Button variant='destructive' size='sm' onClick={onStop}>
            <Square size={14} />
            停止任务
          </Button>
        )}
      </CardHeader>
      <CardContent className='space-y-6'>
        {/* 3 个统计卡片 */}
        <div className='grid gap-4 md:grid-cols-3'>
          <StatBox label='状态'>
            <Badge variant={statusVariant(task.status)}>
              {statusIcon(task.status)}
              {task.status}
            </Badge>
          </StatBox>
          <StatBox label='成功/目标'>
            <div className='text-3xl font-bold text-emerald-600 dark:text-emerald-400'>
              {task.completed_count}
              <span className='text-muted-foreground text-base font-normal'>
                /{task.target_count}
              </span>
            </div>
          </StatBox>
          <StatBox label='失败数'>
            <div
              className={cn(
                'text-3xl font-bold',
                task.failed_count > 0
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-muted-foreground'
              )}
            >
              {task.failed_count}
            </div>
          </StatBox>
        </div>

        {/* 3 个辅助信息 */}
        <div className='grid gap-4 md:grid-cols-3'>
          <InfoItem label='当前轮次' value={String(task.current_round || 0)} />
          <InfoItem label='当前阶段' value={task.current_phase || '-'} />
          <InfoItem
            label='最近邮箱'
            value={task.last_email || '-'}
            mono
          />
        </div>

        {/* 错误信息 */}
        {task.last_error && (
          <div className='flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900/40 dark:bg-red-900/10'>
            <AlertCircle className='mt-0.5 size-5 shrink-0 text-red-600 dark:text-red-400' />
            <div className='flex-1 space-y-1'>
              <div className='font-semibold text-red-600 dark:text-red-400'>
                错误信息
              </div>
              <div className='text-sm whitespace-pre-wrap'>
                {task.last_error}
              </div>
            </div>
          </div>
        )}

        <Separator />

        {/* 实时日志 */}
        <div>
          <div className='mb-3 flex items-center justify-between'>
            <div className='flex items-center gap-2'>
              <h3 className='text-base font-semibold'>实时日志</h3>
              <span className='text-muted-foreground text-xs'>
                {logs.length} 行
              </span>
            </div>
            <Button variant='outline' size='sm' onClick={onRefreshLogs}>
              <RefreshCw size={14} />
              刷新日志
            </Button>
          </div>
          <ScrollArea className='h-[500px] rounded-lg bg-[#1a1a2e]'>
            <div className='p-4 font-mono text-xs leading-relaxed text-[#a0a0b0]'>
              {logs.length === 0 ? (
                <div className='py-10 text-center text-[#6a6a7a]'>
                  暂无日志
                </div>
              ) : (
                logs.map((line, i) => (
                  <div
                    key={i}
                    className={cn(
                      'rounded px-1 py-0.5 break-all whitespace-pre-wrap hover:bg-white/5',
                      logClass(line)
                    )}
                  >
                    {line}
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  )
}

// ======================== 辅助组件 ========================

function StatBox({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className='bg-card rounded-xl border p-4 shadow-sm'>
      <div className='text-muted-foreground mb-2 text-xs tracking-wider uppercase'>
        {label}
      </div>
      <div>{children}</div>
    </div>
  )
}

function InfoItem({
  label,
  value,
  mono,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div>
      <div className='text-muted-foreground mb-1 text-xs'>{label}</div>
      <div
        className={cn(
          'truncate text-sm font-semibold',
          mono && 'font-mono text-xs'
        )}
        title={value}
      >
        {value}
      </div>
    </div>
  )
}

function statusIcon(status: string) {
  switch (status) {
    case 'running':
      return <Loader2 size={12} className='animate-spin' />
    case 'completed':
      return <CheckCircle2 size={12} />
    case 'failed':
      return <XCircle size={12} />
    case 'queued':
      return <Clock size={12} />
    default:
      return null
  }
}

function statusVariant(
  status: string
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'completed':
      return 'default'
    case 'running':
    case 'stopping':
      return 'secondary'
    case 'failed':
      return 'destructive'
    case 'queued':
    case 'stopped':
      return 'outline'
    default:
      return 'outline'
  }
}

function logClass(line: string): string {
  if (line.includes('成功') || line.toLowerCase().includes('success'))
    return 'text-green-400'
  if (
    line.includes('错误') ||
    line.includes('失败') ||
    line.includes('[Error]')
  )
    return 'text-red-400'
  if (line.includes('[*]') || line.includes('INFO')) return 'text-blue-400'
  return ''
}

export const Route = createFileRoute('/_authenticated/tasks/')({
  component: TasksPage,
})
