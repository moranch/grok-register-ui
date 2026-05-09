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
  Bug,
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
import { Switch } from '@/components/ui/switch'

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
  const [form, setForm] = useState<{
    name: string
    count: number
    notes: string
    debug_mode: boolean
    debug_override: boolean
  }>({
    name: '',
    count: 50,
    notes: '',
    debug_mode: false,
    debug_override: false,
  })
  const [creating, setCreating] = useState(false)

  // 生成默认任务名：grok-task-<YYYYMMDDHHmmss>（本地时间，更易读）
  const genDefaultName = () => {
    const d = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    const stamp =
      d.getFullYear().toString() +
      pad(d.getMonth() + 1) +
      pad(d.getDate()) +
      pad(d.getHours()) +
      pad(d.getMinutes()) +
      pad(d.getSeconds())
    return `grok-task-${stamp}`
  }

  // 打开新建表单时自动填一个默认任务名
  const openCreateForm = () => {
    setForm({
      name: genDefaultName(),
      count: 50,
      notes: '',
      debug_mode: false,
      debug_override: false,
    })
    setShowCreate(true)
  }

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
    // 名称为空时自动生成
    const finalName = form.name.trim() || genDefaultName()
    setCreating(true)
    try {
      await createTask({
        name: finalName,
        count: form.count,
        notes: form.notes,
        // 只在用户显式勾选"覆盖系统默认"时，才把 debug_mode 传给后端
        // 否则后端会沿用系统配置页里的全局设置
        ...(form.debug_override ? { debug_mode: form.debug_mode } : {}),
      })
      toast.success('任务创建成功')
      setShowCreate(false)
      setForm({
        name: '',
        count: 50,
        notes: '',
        debug_mode: false,
        debug_override: false,
      })
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
          <Button size='sm' onClick={() => (showCreate ? setShowCreate(false) : openCreateForm())}>
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
                <Label htmlFor='task-name' className='flex items-center gap-2'>
                  任务名称
                  <span className='text-muted-foreground text-xs font-normal'>
                    （留空自动生成）
                  </span>
                </Label>
                <div className='flex gap-1.5'>
                  <Input
                    id='task-name'
                    placeholder='grok-task-xxx'
                    value={form.name}
                    onChange={(e) =>
                      setForm({ ...form, name: e.target.value })
                    }
                  />
                  <Button
                    type='button'
                    variant='outline'
                    size='icon'
                    className='shrink-0'
                    onClick={() =>
                      setForm({ ...form, name: genDefaultName() })
                    }
                    title='重新生成'
                  >
                    <RefreshCw size={14} />
                  </Button>
                </div>
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

            {/* 调试模式单任务覆盖 */}
            <div
              className={cn(
                'flex items-start justify-between gap-4 rounded-lg border p-3 transition-colors',
                form.debug_override
                  ? 'border-amber-400/60 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-900/10'
                  : 'bg-muted/30'
              )}
            >
              <div className='space-y-1.5'>
                <div className='flex items-center gap-2'>
                  <Bug size={14} className='text-muted-foreground' />
                  <span className='text-sm font-medium'>
                    覆盖系统默认的调试模式
                  </span>
                </div>
                <p className='text-muted-foreground text-xs leading-relaxed'>
                  默认跟随系统配置页里的设置。勾选后可针对本任务单独切换：
                  {form.debug_override
                    ? form.debug_mode
                      ? '浏览器"有头"运行（Xvfb）'
                      : '浏览器完全无头运行'
                    : '使用系统默认'}
                </p>
              </div>
              <div className='flex items-center gap-3'>
                <Switch
                  checked={form.debug_override}
                  onCheckedChange={(v: boolean) =>
                    setForm({ ...form, debug_override: v })
                  }
                />
                {form.debug_override && (
                  <div className='flex items-center gap-1.5 rounded-md border px-2 py-1'>
                    <span className='text-muted-foreground text-[11px]'>
                      调试
                    </span>
                    <Switch
                      size='sm'
                      checked={form.debug_mode}
                      onCheckedChange={(v: boolean) =>
                        setForm({ ...form, debug_mode: v })
                      }
                    />
                  </div>
                )}
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
      <CardHeader>
        <CardTitle className='text-base'>
          任务 #{task.id} · {task.name}
        </CardTitle>
      </CardHeader>
      <CardContent className='space-y-4'>
        {/* 停止按钮 - 单独一行放在状态卡片上方 */}
        {isRunning && (
          <div className='rounded-lg border border-red-200 bg-red-50 p-2 dark:border-red-900/40 dark:bg-red-900/10'>
            <Button
              variant='destructive'
              size='sm'
              className='w-full'
              onClick={onStop}
            >
              <Square size={14} />
              停止任务
            </Button>
          </div>
        )}

        {/* 6 个紧凑的状态卡片（对齐原版布局） */}
        <div className='grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6'>
          <StatBox label='状态'>
            <span className={cn('text-lg font-semibold', statusColor(task.status))}>
              {task.status}
            </span>
          </StatBox>
          <StatBox label='目标次数'>
            <span className='text-lg font-semibold'>{task.target_count}</span>
          </StatBox>
          <StatBox label='成功数'>
            <span className='text-lg font-semibold text-emerald-600 dark:text-emerald-400'>
              {task.completed_count}
            </span>
          </StatBox>
          <StatBox label='失败数'>
            <span
              className={cn(
                'text-lg font-semibold',
                task.failed_count > 0
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-muted-foreground'
              )}
            >
              {task.failed_count}
            </span>
          </StatBox>
          <StatBox label='当前轮次'>
            <span className='text-lg font-semibold'>
              {task.current_round || 0}
            </span>
          </StatBox>
          <StatBox label='当前阶段'>
            <span
              className={cn(
                'truncate text-lg font-semibold',
                phaseColor(task.current_phase)
              )}
              title={task.current_phase || '-'}
            >
              {task.current_phase || '-'}
            </span>
          </StatBox>
        </div>

        {/* 最近邮箱单独一行 */}
        {task.last_email && (
          <div className='text-muted-foreground flex items-center gap-2 text-sm'>
            <span>最近邮箱：</span>
            <span className='text-foreground font-mono text-xs'>
              {task.last_email}
            </span>
          </div>
        )}

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
    <div className='bg-card rounded-lg border px-3 py-2.5 shadow-sm'>
      <div className='text-muted-foreground mb-1 text-[10px] tracking-wider uppercase'>
        {label}
      </div>
      <div className='flex items-center'>{children}</div>
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

function statusColor(status: string): string {
  switch (status) {
    case 'completed':
      return 'text-emerald-600 dark:text-emerald-400'
    case 'running':
      return 'text-sky-600 dark:text-sky-400'
    case 'failed':
      return 'text-red-600 dark:text-red-400'
    case 'queued':
      return 'text-amber-600 dark:text-amber-400'
    case 'stopping':
    case 'stopped':
      return 'text-muted-foreground'
    default:
      return 'text-foreground'
  }
}

function phaseColor(phase: string): string {
  if (!phase) return 'text-muted-foreground'

  // 成功类（绿色）
  if (phase === 'success' || phase === 'pushed_to_api') {
    return 'text-emerald-600 dark:text-emerald-400'
  }
  // 错误类（红色）
  if (phase === 'error' || phase === 'failed') {
    return 'text-red-600 dark:text-red-400'
  }
  // 进行中（蓝色） - 注册主要步骤
  if (
    phase === 'starting_round' ||
    phase === 'process_started' ||
    phase === 'mailbox_created' ||
    phase === 'email_submitted'
  ) {
    return 'text-sky-600 dark:text-sky-400'
  }
  // 验证流程（紫色） - OTP / 验证码 / Turnstile
  if (
    phase === 'otp_received' ||
    phase === 'turnstile_solved' ||
    phase === 'profile_page' ||
    phase === 'submitting_profile'
  ) {
    return 'text-violet-600 dark:text-violet-400'
  }
  // 等待 / 停止类（琥珀色）
  if (phase === 'queued' || phase === 'stopping' || phase === 'stopped') {
    return 'text-amber-600 dark:text-amber-400'
  }
  // 其他未知阶段 - 用主题前景色（比默认 muted 更显眼）
  return 'text-foreground'
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
