import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
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
  Cpu,
  EyeOff,
  Eye,
  Zap,
  ExternalLink,
  Layers,
} from 'lucide-react'
import { toast } from 'sonner'
import { taskApi, platformApi, type Task, type Platform } from '@/lib/api'
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

type ExecutorKey = 'default' | 'headless' | 'headed' | 'protocol'

const EXECUTOR_OPTIONS: {
  key: ExecutorKey
  icon: typeof Cpu
  title: string
  desc: string
}[] = [
  {
    key: 'default',
    icon: Cpu,
    title: '跟随系统',
    desc: '使用系统配置里的默认执行器',
  },
  {
    key: 'headless',
    icon: EyeOff,
    title: '无头',
    desc: '--headless=new',
  },
  {
    key: 'headed',
    icon: Eye,
    title: '有头（调试）',
    desc: 'Xvfb + noVNC 可观察',
  },
  {
    key: 'protocol',
    icon: Zap,
    title: '纯协议（实验）',
    desc: '无浏览器',
  },
]

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
    executor: ExecutorKey
    platform: string
    engine_id: string
  }>({
    name: '',
    count: 50,
    notes: '',
    executor: 'default',
    platform: 'grok',
    engine_id: '',
  })
  const [creating, setCreating] = useState(false)

  // 拉可用平台，只展示 enabled=true 的
  const { data: platformsData } = useQuery({
    queryKey: ['platforms'],
    queryFn: () => platformApi.list(),
    staleTime: 60_000,
  })
  const enabledPlatforms: Platform[] = useMemo(
    () => (platformsData?.platforms || []).filter((p) => p.enabled),
    [platformsData]
  )
  const currentPlatform = useMemo<Platform | undefined>(
    () => enabledPlatforms.find((p) => p.name === form.platform),
    [enabledPlatforms, form.platform]
  )
  const currentEngines = currentPlatform?.register_engines || []

  // 平台切换时重置 engine_id 到该平台的推荐/第一个
  useEffect(() => {
    if (!currentPlatform) return
    const engines = currentPlatform.register_engines || []
    if (engines.length === 0) {
      if (form.engine_id !== '') setForm((f) => ({ ...f, engine_id: '' }))
      return
    }
    const still = engines.find((e) => e.id === form.engine_id)
    if (still) return
    const recommended = engines.find((e) => e.is_recommended)
    setForm((f) => ({ ...f, engine_id: (recommended || engines[0]).id }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPlatform?.name])

  // 生成默认任务名：<platform>-task-<YYYYMMDDHHmmss>（本地时间，更易读）
  const genDefaultName = (platform: string = form.platform) => {
    const d = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    const stamp =
      d.getFullYear().toString() +
      pad(d.getMonth() + 1) +
      pad(d.getDate()) +
      pad(d.getHours()) +
      pad(d.getMinutes()) +
      pad(d.getSeconds())
    return `${platform || 'grok'}-task-${stamp}`
  }

  // 打开新建表单时自动填一个默认任务名
  const openCreateForm = () => {
    setForm({
      name: genDefaultName('grok'),
      count: 50,
      notes: '',
      executor: 'default',
      platform: 'grok',
      engine_id: '',
    })
    setShowCreate(true)
  }

  // 定时刷新任务列表
  useEffect(() => {
    fetchTasks()
    const timer = setInterval(fetchTasks, 5000)
    return () => clearInterval(timer)
  }, [fetchTasks])

  // SSE 实时日志：保存在本地 state 里（不走 store，避免 SSE 重连闪烁）
  const [sseLogs, setSseLogs] = useState<string[]>([])
  const sseRef = useRef<EventSource | null>(null)
  useEffect(() => {
    // 关掉旧的连接
    if (sseRef.current) {
      sseRef.current.close()
      sseRef.current = null
    }
    setSseLogs([])
    if (!selectedTaskId) return
    try {
      const es = new EventSource(taskApi.streamUrl(selectedTaskId))
      sseRef.current = es
      es.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data) as { line: string }
          setSseLogs((prev) => {
            // 保留最多 2000 行，避免内存爆炸
            const next =
              prev.length > 2000 ? prev.slice(-1800) : prev.slice()
            next.push(data.line)
            return next
          })
        } catch {
          /* ignore */
        }
      }
      es.addEventListener('done', () => {
        es.close()
      })
      es.onerror = () => {
        // 5 秒后回落到一次性拉取（fetchTaskLogs）作为兜底
        setTimeout(() => fetchTaskLogs(selectedTaskId), 5000)
      }
    } catch {
      // EventSource 创建失败，回落老的 3 秒轮询
      fetchTaskLogs(selectedTaskId)
      const timer = setInterval(() => fetchTaskLogs(selectedTaskId), 3000)
      return () => clearInterval(timer)
    }
    return () => {
      sseRef.current?.close()
      sseRef.current = null
    }
  }, [selectedTaskId, fetchTaskLogs])

  const handleCreate = useCallback(async () => {
    // 名称为空时自动生成
    const finalName = form.name.trim() || genDefaultName(form.platform)
    // 非 grok 平台必须选一个 engine
    if (form.platform !== 'grok' && !form.engine_id) {
      toast.error('请为该平台选择一个注册引擎 (engine_id)')
      return
    }
    setCreating(true)
    try {
      await createTask({
        name: finalName,
        count: form.count,
        notes: form.notes,
        platform: form.platform || 'grok',
        ...(form.engine_id ? { engine_id: form.engine_id } : {}),
        // executor === 'default' 就不传给后端，让后端用系统默认
        ...(form.executor !== 'default' ? { executor: form.executor } : {}),
      })
      toast.success('任务创建成功')
      setShowCreate(false)
      setForm({
        name: '',
        count: 50,
        notes: '',
        executor: 'default',
        platform: 'grok',
        engine_id: '',
      })
    } catch (e: any) {
      const msg =
        e?.response?.data?.detail || e?.message || '任务创建失败'
      toast.error(msg)
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
  // 优先用 SSE 实时日志，SSE 断开时回落到 taskLogs 里的轮询结果
  const logs = useMemo(() => {
    if (sseLogs.length > 0) return sseLogs
    return selectedTaskId ? taskLogs[selectedTaskId] || [] : []
  }, [sseLogs, selectedTaskId, taskLogs])

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

            {/* 平台选择 */}
            <div className='space-y-2'>
              <div className='flex items-center gap-2'>
                <Layers size={14} className='text-muted-foreground' />
                <span className='text-sm font-medium'>平台</span>
                <span className='text-muted-foreground text-xs font-normal'>
                  （仅展示已启用的平台）
                </span>
              </div>
              {enabledPlatforms.length === 0 ? (
                <div className='text-muted-foreground rounded-lg border border-dashed p-3 text-xs'>
                  暂无已启用平台，请先到"平台管理"启用至少一个。
                </div>
              ) : (
                <div className='grid gap-2 md:grid-cols-4'>
                  {enabledPlatforms.map((p) => {
                    const selected = form.platform === p.name
                    return (
                      <label
                        key={p.name}
                        className={cn(
                          'cursor-pointer space-y-1 rounded-lg border p-2.5 text-xs transition-all',
                          selected
                            ? 'border-primary bg-primary/5 shadow-sm'
                            : 'hover:border-primary/40 hover:bg-muted/40'
                        )}
                      >
                        <input
                          type='radio'
                          name='task-platform'
                          className='sr-only'
                          value={p.name}
                          checked={selected}
                          onChange={() =>
                            setForm((f) => ({
                              ...f,
                              platform: p.name,
                              // 名字用默认模板，避免串名；用户手改过则保留
                              name:
                                f.name === '' ||
                                /^[a-z0-9_-]+-task-\d+$/i.test(f.name)
                                  ? genDefaultName(p.name)
                                  : f.name,
                            }))
                          }
                        />
                        <div className='flex items-center gap-1.5'>
                          <span className='font-semibold'>
                            {p.display_name}
                          </span>
                        </div>
                        <div className='text-muted-foreground font-mono text-[10px]'>
                          {p.name}
                        </div>
                      </label>
                    )
                  })}
                </div>
              )}
            </div>

            {/* 引擎选择（非 grok 平台才显示；grok 只有一套流程） */}
            {form.platform !== 'grok' && currentEngines.length > 0 && (
              <div className='space-y-2'>
                <div className='flex items-center gap-2'>
                  <Zap size={14} className='text-muted-foreground' />
                  <span className='text-sm font-medium'>注册引擎</span>
                  <span className='text-muted-foreground text-xs font-normal'>
                    （engine_id）
                  </span>
                </div>
                <div className='grid gap-2 md:grid-cols-3'>
                  {currentEngines.map((e) => {
                    const selected = form.engine_id === e.id
                    return (
                      <label
                        key={e.id}
                        className={cn(
                          'cursor-pointer space-y-1 rounded-lg border p-2.5 text-xs transition-all',
                          selected
                            ? 'border-primary bg-primary/5 shadow-sm'
                            : 'hover:border-primary/40 hover:bg-muted/40'
                        )}
                      >
                        <input
                          type='radio'
                          name='task-engine'
                          className='sr-only'
                          value={e.id}
                          checked={selected}
                          onChange={() =>
                            setForm((f) => ({ ...f, engine_id: e.id }))
                          }
                        />
                        <div className='flex items-center justify-between gap-1.5'>
                          <span className='font-semibold'>
                            {e.display_name}
                          </span>
                          {e.is_recommended && (
                            <Badge variant='secondary' className='text-[9px]'>
                              推荐
                            </Badge>
                          )}
                          {e.is_deprecated && (
                            <Badge
                              variant='outline'
                              className='border-amber-500/50 text-amber-600 text-[9px]'
                            >
                              deprecated
                            </Badge>
                          )}
                        </div>
                        <div className='text-muted-foreground font-mono text-[10px]'>
                          {e.id}
                        </div>
                      </label>
                    )
                  })}
                </div>
              </div>
            )}

            {/* 执行器选择（单任务覆盖） */}
            <div className='space-y-2'>
              <div className='flex items-center gap-2'>
                <Cpu size={14} className='text-muted-foreground' />
                <span className='text-sm font-medium'>执行器</span>
                <span className='text-muted-foreground text-xs font-normal'>
                  （可针对本任务单独选择，留空跟随系统）
                </span>
              </div>
              <div className='grid gap-2 md:grid-cols-4'>
                {EXECUTOR_OPTIONS.map((opt) => {
                  const selected = form.executor === opt.key
                  const Icon = opt.icon
                  return (
                    <label
                      key={opt.key}
                      className={cn(
                        'cursor-pointer space-y-1 rounded-lg border p-2.5 text-xs transition-all',
                        selected
                          ? 'border-primary bg-primary/5 shadow-sm'
                          : 'hover:border-primary/40 hover:bg-muted/40'
                      )}
                    >
                      <input
                        type='radio'
                        name='task-executor'
                        className='sr-only'
                        value={opt.key}
                        checked={selected}
                        onChange={() =>
                          setForm({ ...form, executor: opt.key })
                        }
                      />
                      <div className='flex items-center gap-1.5'>
                        <Icon size={12} className='text-primary' />
                        <span className='font-semibold'>{opt.title}</span>
                      </div>
                      <div className='text-muted-foreground text-[10px]'>
                        {opt.desc}
                      </div>
                    </label>
                  )
                })}
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
  const [autoScroll, setAutoScroll] = useState(true)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const logEndRef = useRef<HTMLDivElement>(null)

  // 自动滚动到日志底部
  useEffect(() => {
    if (!autoScroll) return
    logEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [logs.length, autoScroll])

  // headed 执行器时，顶部提示"可以到 noVNC 看浏览器"
  const executor = task.config?.executor || 'headless'
  const isHeaded = executor === 'headed' || !!task.config?.debug_mode

  return (
    <Card>
      <CardHeader>
        <CardTitle className='text-base'>
          任务 #{task.id} · {task.name}
        </CardTitle>
      </CardHeader>
      <CardContent className='space-y-4'>
        {/* 有头执行器时：提示可用 noVNC 实时观察 */}
        {isHeaded && isRunning && (
          <div className='flex items-center justify-between rounded-lg border border-violet-300 bg-violet-50 p-3 dark:border-violet-500/40 dark:bg-violet-900/10'>
            <div className='flex items-start gap-2'>
              <Eye className='mt-0.5 size-4 text-violet-600 dark:text-violet-400' />
              <div className='text-sm'>
                <div className='font-medium text-violet-700 dark:text-violet-300'>
                  这是"有头执行器"任务
                </div>
                <p className='text-muted-foreground mt-0.5 text-xs'>
                  可以到"可视化调试（noVNC）"页实时看到浏览器窗口
                </p>
              </div>
            </div>
            <Button
              size='sm'
              variant='outline'
              onClick={() => window.open('/novnc', '_blank')}
            >
              <ExternalLink size={14} />
              打开 noVNC
            </Button>
          </div>
        )}

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
              <span className='flex items-center gap-1 rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400'>
                <span className='size-1.5 animate-pulse rounded-full bg-emerald-500' />
                SSE
              </span>
            </div>
            <div className='flex items-center gap-2'>
              <label className='flex items-center gap-1.5 text-xs'>
                <input
                  type='checkbox'
                  checked={autoScroll}
                  onChange={(e) => setAutoScroll(e.target.checked)}
                />
                <span className='text-muted-foreground'>自动滚动</span>
              </label>
              <Button variant='outline' size='sm' onClick={onRefreshLogs}>
                <RefreshCw size={14} />
                刷新日志
              </Button>
            </div>
          </div>
          <ScrollArea
            ref={scrollAreaRef}
            className='h-[500px] rounded-lg bg-[#1a1a2e]'
          >
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
              <div ref={logEndRef} />
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
