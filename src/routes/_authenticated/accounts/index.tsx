/**
 * 账户资产（对齐 any-auto-register 的 Accounts 页）
 *
 * 关键改造：
 *   - 头部概览：总数 + lifecycle_status / plan_state / validity_status 三组分布
 *   - 表格：每行显示 email / sso / 生命周期 / 套餐 / 有效性 / 备注 / 创建时间
 *   - 行内编辑：lifecycle / plan_state / validity / notes（弹窗）
 *   - 筛选：按 lifecycle / plan / validity / 关键字搜索
 *   - 批量导出：JSON / CSV / 纯 SSO 列表
 */
import { useEffect, useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import {
  Users,
  RefreshCw,
  Download,
  FileJson,
  FileText,
  FileSpreadsheet,
  Trash2,
  Pencil,
  Copy,
  X,
  CheckCircle2,
  XCircle,
  Clock,
  Star,
  AlertCircle,
  Filter,
} from 'lucide-react'
import { toast } from 'sonner'
import { useGrokStore } from '@/stores/grok-store'
import {
  accountApi,
  type AccountEntry,
  type AccountLifecycle,
  type AccountPlanState,
  type AccountValidity,
} from '@/lib/api'
import { formatBackendTime } from '@/lib/grok-time'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

// ============== 枚举标签 ==============

const LIFECYCLE_OPTIONS: {
  key: AccountLifecycle
  label: string
  color: string
  icon: React.ElementType
}[] = [
  {
    key: 'registered',
    label: '已注册',
    color: 'text-sky-600 dark:text-sky-400',
    icon: CheckCircle2,
  },
  {
    key: 'trial',
    label: '试用中',
    color: 'text-violet-600 dark:text-violet-400',
    icon: Star,
  },
  {
    key: 'subscribed',
    label: '已订阅',
    color: 'text-emerald-600 dark:text-emerald-400',
    icon: Star,
  },
  {
    key: 'expired',
    label: '已过期',
    color: 'text-amber-600 dark:text-amber-400',
    icon: Clock,
  },
  {
    key: 'invalid',
    label: '已失效',
    color: 'text-red-600 dark:text-red-400',
    icon: XCircle,
  },
]

const PLAN_OPTIONS: { key: AccountPlanState; label: string }[] = [
  { key: 'free', label: 'Free' },
  { key: 'trial', label: 'Trial' },
  { key: 'pro', label: 'Pro' },
  { key: 'team', label: 'Team' },
  { key: 'unknown', label: 'Unknown' },
]

const VALIDITY_OPTIONS: {
  key: AccountValidity
  label: string
  icon: React.ElementType
  color: string
}[] = [
  {
    key: 'valid',
    label: '有效',
    icon: CheckCircle2,
    color: 'text-emerald-600 dark:text-emerald-400',
  },
  {
    key: 'invalid',
    label: '失效',
    icon: XCircle,
    color: 'text-red-600 dark:text-red-400',
  },
  {
    key: 'unknown',
    label: '未知',
    icon: AlertCircle,
    color: 'text-muted-foreground',
  },
]

// 平台徽章配色（与 /platforms 页保持一致风格）
const PLATFORM_BADGE: Record<string, { label: string; color: string }> = {
  grok: { label: 'Grok', color: 'bg-violet-500/15 text-violet-700 dark:text-violet-400 border-violet-500/30' },
  windsurf: { label: 'Windsurf', color: 'bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-500/30' },
  cursor: { label: 'Cursor', color: 'bg-zinc-500/15 text-zinc-700 dark:text-zinc-300 border-zinc-500/30' },
  kiro: { label: 'Kiro', color: 'bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30' },
  chatgpt: { label: 'ChatGPT', color: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30' },
  anything: { label: 'Anything', color: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30' },
  blink: { label: 'Blink', color: 'bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-400 border-fuchsia-500/30' },
  cerebras: { label: 'Cerebras', color: 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30' },
  openblocklabs: { label: 'OpenBlockLabs', color: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30' },
  tavily: { label: 'Tavily', color: 'bg-teal-500/15 text-teal-700 dark:text-teal-400 border-teal-500/30' },
  trae: { label: 'Trae', color: 'bg-lime-500/15 text-lime-700 dark:text-lime-400 border-lime-500/30' },
}

// ============== 主组件 ==============

function AccountsPage() {
  const {
    accounts,
    accountSummary,
    loadingAccounts,
    fetchAccounts,
    fetchAccountSummary,
    updateAccount,
    deleteAccount,
  } = useGrokStore()

  const [search, setSearch] = useState('')
  const [filterPlatform, setFilterPlatform] = useState<string>('')
  const [filterLifecycle, setFilterLifecycle] = useState<string>('')
  const [filterPlan, setFilterPlan] = useState<string>('')
  const [filterValidity, setFilterValidity] = useState<string>('')
  const [editing, setEditing] = useState<AccountEntry | null>(null)

  useEffect(() => {
    fetchAccounts(2000)
    fetchAccountSummary()
  }, [fetchAccounts, fetchAccountSummary])

  // 当前账户列表里出现过的所有平台 — 用于筛选下拉
  const availablePlatforms = useMemo(() => {
    const set = new Set<string>()
    accounts.forEach((a) => {
      if (a.platform) set.add(a.platform)
    })
    return Array.from(set).sort()
  }, [accounts])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return accounts.filter((a) => {
      if (filterPlatform && a.platform !== filterPlatform) return false
      if (filterLifecycle) {
        // 用综合 display_status 去匹配（和表格/概览卡一致）
        const effective = a.display_status || a.lifecycle_status
        if (effective !== filterLifecycle) return false
      }
      if (filterPlan && a.plan_state !== filterPlan) return false
      if (filterValidity && a.validity_status !== filterValidity) return false
      if (!q) return true
      return (
        a.email.toLowerCase().includes(q) ||
        a.sso.toLowerCase().includes(q) ||
        (a.platform || '').toLowerCase().includes(q) ||
        (a.proxy_url || '').toLowerCase().includes(q) ||
        (a.notes || '').toLowerCase().includes(q)
      )
    })
  }, [accounts, search, filterPlatform, filterLifecycle, filterPlan, filterValidity])

  const openExport = (fmt: 'json' | 'csv' | 'sso') => {
    const pw = localStorage.getItem('console_password') || ''
    fetch(accountApi.exportUrl(fmt), {
      headers: pw ? { Authorization: `Bearer ${pw}` } : undefined,
    })
      .then((r) => r.blob().then((blob) => ({ r, blob })))
      .then(({ r, blob }) => {
        const cd = r.headers.get('content-disposition') || ''
        const m = cd.match(/filename="?([^";]+)"?/i)
        const filename = m ? m[1] : `grok-accounts.${fmt}`
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        a.click()
        URL.revokeObjectURL(url)
      })
      .catch(() => toast.error('导出失败'))
  }

  const handleDelete = async (a: AccountEntry) => {
    if (!window.confirm(`确认删除账号 ${a.email || `#${a.id}`}？`)) return
    try {
      await deleteAccount(a.id)
      toast.success('已删除')
    } catch {
      toast.error('删除失败')
    }
  }

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success('已复制')
    } catch {
      toast.error('复制失败')
    }
  }

  return (
    <div className='space-y-6 p-6'>
      {/* 标题 */}
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-3'>
          <Users className='text-primary size-6' />
          <div>
            <h1 className='text-2xl font-bold'>账户资产</h1>
            <p className='text-muted-foreground mt-0.5 text-sm'>
              账号全生命周期管理：生命周期 / 套餐 / 有效性 · 行内编辑 · 批量导出
            </p>
          </div>
        </div>
        <div className='flex items-center gap-2'>
          <Button
            variant='outline'
            size='sm'
            onClick={() => {
              fetchAccounts(2000)
              fetchAccountSummary()
            }}
            disabled={loadingAccounts}
          >
            <RefreshCw
              size={16}
              className={loadingAccounts ? 'animate-spin' : ''}
            />
            刷新
          </Button>
          <Button variant='outline' size='sm' onClick={() => openExport('json')}>
            <FileJson size={16} />
            JSON
          </Button>
          <Button variant='outline' size='sm' onClick={() => openExport('csv')}>
            <FileSpreadsheet size={16} />
            CSV
          </Button>
          <Button size='sm' onClick={() => openExport('sso')}>
            <Download size={16} />
            SSO 列表
          </Button>
        </div>
      </div>

      {/* 概览 */}
      <AssetSummary
        total={accountSummary?.total ?? accounts.length}
        lifecycle={accounts.reduce<Record<string, number>>((acc, a) => {
          // 使用综合 display_status 聚合，而不是 lifecycle_status 单列
          const key = a.display_status || a.lifecycle_status || 'registered'
          acc[key] = (acc[key] || 0) + 1
          return acc
        }, {})}
        plans={accountSummary?.plan_state || {}}
        validity={accountSummary?.validity_status || {}}
        platforms={accounts.reduce<Record<string, number>>((acc, a) => {
          const p = a.platform || 'unknown'
          acc[p] = (acc[p] || 0) + 1
          return acc
        }, {})}
      />

      {/* 筛选条 */}
      <Card>
        <CardContent className='py-4'>
          <div className='flex flex-wrap items-center gap-3'>
            <div className='flex items-center gap-1.5 text-xs text-muted-foreground'>
              <Filter size={12} />
              筛选
            </div>
            <FilterSelect
              label='平台'
              value={filterPlatform}
              onChange={setFilterPlatform}
              options={availablePlatforms.map((p) => ({
                key: p,
                label: PLATFORM_BADGE[p]?.label ?? p,
              }))}
            />
            <FilterSelect
              label='状态'
              value={filterLifecycle}
              onChange={setFilterLifecycle}
              options={LIFECYCLE_OPTIONS.map((o) => ({
                key: o.key,
                label: o.label,
              }))}
            />
            <FilterSelect
              label='套餐'
              value={filterPlan}
              onChange={setFilterPlan}
              options={PLAN_OPTIONS.map((o) => ({
                key: o.key,
                label: o.label,
              }))}
            />
            <FilterSelect
              label='有效性'
              value={filterValidity}
              onChange={setFilterValidity}
              options={VALIDITY_OPTIONS.map((o) => ({
                key: o.key,
                label: o.label,
              }))}
            />
            <Input
              placeholder='按邮箱 / SSO / 平台 / 代理 / 备注 搜索'
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className='max-w-[280px]'
            />
            {(filterPlatform ||
              filterLifecycle ||
              filterPlan ||
              filterValidity ||
              search) && (
              <Button
                variant='ghost'
                size='sm'
                onClick={() => {
                  setSearch('')
                  setFilterPlatform('')
                  setFilterLifecycle('')
                  setFilterPlan('')
                  setFilterValidity('')
                }}
              >
                <X size={14} />
                清空
              </Button>
            )}
            <span className='text-muted-foreground ml-auto text-xs'>
              共 {accounts.length} 条 · 过滤后 {filtered.length}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* 表格 */}
      <Card>
        <CardHeader className='pb-3'>
          <CardTitle className='text-base'>账号列表</CardTitle>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className='text-muted-foreground py-10 text-center'>
              <FileText className='mx-auto mb-3 size-10 opacity-30' />
              <div className='text-sm'>
                {accounts.length === 0 ? '暂无账号' : '没有匹配的账号'}
              </div>
            </div>
          ) : (
            <div className='overflow-x-auto'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className='w-[60px]'>ID</TableHead>
                    <TableHead className='w-[100px]'>平台</TableHead>
                    <TableHead>邮箱</TableHead>
                    <TableHead>Tokens</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>套餐</TableHead>
                    <TableHead>有效性</TableHead>
                    <TableHead>备注</TableHead>
                    <TableHead>创建时间</TableHead>
                    <TableHead className='text-right'>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.slice(0, 500).map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className='font-mono text-xs'>
                        #{a.id}
                      </TableCell>
                      <TableCell>
                        <PlatformBadge value={a.platform} />
                      </TableCell>
                      <TableCell
                        className='max-w-[180px] truncate text-sm'
                        title={a.email || '(空)'}
                      >
                        {a.email || <span className='text-muted-foreground'>-</span>}
                      </TableCell>
                      <TableCell>
                        <TokensCell tokens={a.tokens} onCopy={copy} />
                      </TableCell>
                      <TableCell>
                        <LifecycleBadge value={(a.display_status || a.lifecycle_status) as AccountLifecycle} />
                      </TableCell>
                      <TableCell>
                        <PlanBadge value={a.plan_state} />
                      </TableCell>
                      <TableCell>
                        <ValidityBadge value={a.validity_status} />
                      </TableCell>
                      <TableCell
                        className='max-w-[160px] truncate text-xs'
                        title={a.notes}
                      >
                        {a.notes || <span className='text-muted-foreground'>-</span>}
                      </TableCell>
                      <TableCell className='text-muted-foreground text-xs'>
                        {formatBackendTime(a.created_at)}
                      </TableCell>
                      <TableCell className='text-right'>
                        <div className='flex justify-end gap-1'>
                          <Button
                            variant='outline'
                            size='icon'
                            className='h-7 w-7'
                            onClick={() => setEditing(a)}
                            title='编辑'
                          >
                            <Pencil size={12} />
                          </Button>
                          <Button
                            variant='outline'
                            size='icon'
                            className='h-7 w-7'
                            onClick={() => handleDelete(a)}
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
            </div>
          )}
          {filtered.length > 500 && (
            <div className='text-muted-foreground mt-3 text-center text-xs'>
              仅显示前 500 条；导出可拿全部
            </div>
          )}
        </CardContent>
      </Card>

      {/* 编辑弹窗 */}
      {editing && (
        <EditDialog
          account={editing}
          onClose={() => setEditing(null)}
          onSave={async (patch) => {
            try {
              await updateAccount(editing.id, patch)
              toast.success('已保存')
              setEditing(null)
            } catch {
              toast.error('保存失败')
            }
          }}
        />
      )}
    </div>
  )
}

// ============== 概览 ==============

function AssetSummary({
  total,
  lifecycle,
  plans,
  validity,
  platforms,
}: {
  total: number
  lifecycle: Record<string, number>
  plans: Record<string, number>
  validity: Record<string, number>
  platforms: Record<string, number>
}) {
  // 平台选项动态根据实际数据生成
  const platformOptions = Object.keys(platforms)
    .sort((a, b) => (platforms[b] ?? 0) - (platforms[a] ?? 0))
    .map((k) => ({ key: k, label: PLATFORM_BADGE[k]?.label ?? k }))

  return (
    <div className='grid gap-4 lg:grid-cols-5'>
      <Card>
        <CardContent className='py-4'>
          <div className='text-muted-foreground mb-1 text-xs tracking-wider uppercase'>
            账号总数
          </div>
          <div className='text-foreground text-3xl font-bold'>{total}</div>
        </CardContent>
      </Card>
      <DistCard
        title='平台分布'
        data={platforms}
        options={platformOptions}
      />
      <DistCard
        title='状态'
        data={lifecycle}
        options={LIFECYCLE_OPTIONS.map((o) => ({
          key: o.key,
          label: o.label,
        }))}
      />
      <DistCard
        title='套餐分布'
        data={plans}
        options={PLAN_OPTIONS.map((o) => ({ key: o.key, label: o.label }))}
      />
      <DistCard
        title='有效性'
        data={validity}
        options={VALIDITY_OPTIONS.map((o) => ({
          key: o.key,
          label: o.label,
        }))}
      />
    </div>
  )
}

function DistCard({
  title,
  data,
  options,
}: {
  title: string
  data: Record<string, number>
  options: { key: string; label: string }[]
}) {
  const total = Object.values(data).reduce((a, b) => a + b, 0)
  return (
    <Card>
      <CardContent className='py-4'>
        <div className='text-muted-foreground mb-2 text-xs tracking-wider uppercase'>
          {title}
        </div>
        <div className='space-y-1.5'>
          {options.map((o) => {
            const n = data[o.key] ?? 0
            const pct = total > 0 ? (n / total) * 100 : 0
            return (
              <div key={o.key} className='flex items-center gap-2 text-xs'>
                <span className='text-muted-foreground w-[52px] shrink-0'>
                  {o.label}
                </span>
                <div className='bg-muted relative h-1.5 flex-1 overflow-hidden rounded-full'>
                  <div
                    className='bg-primary h-full'
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className='w-[24px] text-right font-semibold'>{n}</span>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

// ============== 编辑弹窗 ==============

function EditDialog({
  account,
  onClose,
  onSave,
}: {
  account: AccountEntry
  onClose: () => void
  onSave: (
    patch: Partial<{
      lifecycle_status: AccountLifecycle
      plan_state: AccountPlanState
      validity_status: AccountValidity
      notes: string
      sso: string
      email: string
      password: string
    }>
  ) => void | Promise<void>
}) {
  const [form, setForm] = useState({
    lifecycle_status: account.lifecycle_status,
    plan_state: account.plan_state,
    validity_status: account.validity_status,
    notes: account.notes || '',
    sso: account.sso || '',
    email: account.email || '',
    password: account.password || '',
  })

  return (
    <div
      className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4'
      onClick={onClose}
    >
      <div
        className='bg-card max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-xl border shadow-2xl'
        onClick={(e) => e.stopPropagation()}
      >
        <div className='flex items-center justify-between border-b p-4'>
          <div>
            <h2 className='text-base font-semibold'>编辑账号</h2>
            <p className='text-muted-foreground text-xs'>
              #{account.id} · {account.email || '(空邮箱)'}
            </p>
          </div>
          <Button variant='ghost' size='icon' onClick={onClose}>
            <X size={16} />
          </Button>
        </div>
        <div className='space-y-4 p-4'>
          <div className='space-y-2'>
            <Label htmlFor='edit-email'>邮箱</Label>
            <Input
              id='edit-email'
              placeholder='账号邮箱'
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div className='space-y-2'>
            <Label htmlFor='edit-password'>密码</Label>
            <Input
              id='edit-password'
              type='text'
              placeholder='明文密码（可选）'
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className='font-mono text-xs'
            />
          </div>
          <div className='space-y-2'>
            <Label htmlFor='edit-sso'>SSO Token</Label>
            <textarea
              id='edit-sso'
              placeholder='注册或登录后得到的 token，长串文本'
              value={form.sso}
              onChange={(e) => setForm({ ...form, sso: e.target.value })}
              rows={3}
              className='flex w-full resize-y rounded-md border bg-background px-3 py-2 font-mono text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
            />
          </div>
          <div className='space-y-2'>
            <Label>生命周期</Label>
            <div className='grid grid-cols-5 gap-2'>
              {LIFECYCLE_OPTIONS.map((o) => {
                const selected = form.lifecycle_status === o.key
                return (
                  <button
                    key={o.key}
                    type='button'
                    onClick={() =>
                      setForm({ ...form, lifecycle_status: o.key })
                    }
                    className={cn(
                      'rounded-md border p-2 text-center text-xs transition-colors',
                      selected
                        ? 'border-primary bg-primary/10 text-primary font-medium'
                        : 'hover:bg-muted'
                    )}
                  >
                    {o.label}
                  </button>
                )
              })}
            </div>
          </div>
          <div className='space-y-2'>
            <Label>套餐</Label>
            <div className='grid grid-cols-5 gap-2'>
              {PLAN_OPTIONS.map((o) => {
                const selected = form.plan_state === o.key
                return (
                  <button
                    key={o.key}
                    type='button'
                    onClick={() => setForm({ ...form, plan_state: o.key })}
                    className={cn(
                      'rounded-md border p-2 text-center text-xs transition-colors',
                      selected
                        ? 'border-primary bg-primary/10 text-primary font-medium'
                        : 'hover:bg-muted'
                    )}
                  >
                    {o.label}
                  </button>
                )
              })}
            </div>
          </div>
          <div className='space-y-2'>
            <Label>有效性</Label>
            <div className='grid grid-cols-3 gap-2'>
              {VALIDITY_OPTIONS.map((o) => {
                const selected = form.validity_status === o.key
                return (
                  <button
                    key={o.key}
                    type='button'
                    onClick={() =>
                      setForm({ ...form, validity_status: o.key })
                    }
                    className={cn(
                      'rounded-md border p-2 text-center text-xs transition-colors',
                      selected
                        ? 'border-primary bg-primary/10 text-primary font-medium'
                        : 'hover:bg-muted'
                    )}
                  >
                    {o.label}
                  </button>
                )
              })}
            </div>
          </div>
          <div className='space-y-2'>
            <Label htmlFor='edit-notes'>备注</Label>
            <Input
              id='edit-notes'
              placeholder='可选'
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
          {account.last_error && (
            <div className='text-muted-foreground text-xs'>
              最后一次错误：<span className='text-red-500'>{account.last_error}</span>
            </div>
          )}
        </div>
        <div className='flex justify-end gap-2 border-t p-4'>
          <Button variant='outline' onClick={onClose}>
            取消
          </Button>
          <Button onClick={() => onSave(form)}>保存</Button>
        </div>
      </div>
    </div>
  )
}

// ============== 小组件 ==============

function LifecycleBadge({ value }: { value: AccountLifecycle }) {
  const cfg = LIFECYCLE_OPTIONS.find((o) => o.key === value) || LIFECYCLE_OPTIONS[0]
  const Icon = cfg.icon
  return (
    <Badge variant='outline' className='gap-1'>
      <Icon size={10} className={cfg.color} />
      {cfg.label}
    </Badge>
  )
}

function PlatformBadge({ value }: { value: string }) {
  const key = (value || '').toLowerCase()
  const cfg = PLATFORM_BADGE[key]
  const label = cfg?.label ?? (value || '-')
  const color = cfg?.color ?? 'bg-muted text-muted-foreground border-border'
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border px-2 py-0.5 font-mono text-[11px]',
        color,
      )}
      title={value || '未知平台'}
    >
      {label}
    </span>
  )
}

function TokensCell({ tokens, onCopy }: { tokens: AccountEntry['tokens']; onCopy: (s: string) => void }) {
  const entries = [
    { label: 'Session', value: tokens?.session_token || '' },
    { label: 'Access', value: tokens?.access_token || '' },
    { label: 'Refresh', value: tokens?.refresh_token || '' },
    { label: 'ID', value: tokens?.id_token || '' },
  ].filter((e) => e.value)

  if (entries.length === 0) {
    return <span className='text-muted-foreground text-xs'>-</span>
  }

  return (
    <div className='space-y-0.5'>
      {entries.map((e) => (
        <div key={e.label} className='flex items-center gap-1'>
          <span className='text-muted-foreground w-[50px] shrink-0 text-[10px]'>{e.label}</span>
          <span className='max-w-[140px] truncate font-mono text-[10px]' title={e.value}>
            {e.value.slice(0, 20)}...
          </span>
          <Button variant='ghost' size='icon' className='h-5 w-5' onClick={() => onCopy(e.value)}>
            <Copy size={10} />
          </Button>
        </div>
      ))}
    </div>
  )
}

function PlanBadge({ value }: { value: AccountPlanState }) {
  const cfg = PLAN_OPTIONS.find((o) => o.key === value) || PLAN_OPTIONS[4]
  const variant: 'default' | 'secondary' | 'outline' =
    cfg.key === 'pro' || cfg.key === 'team'
      ? 'default'
      : cfg.key === 'trial'
        ? 'secondary'
        : 'outline'
  return <Badge variant={variant}>{cfg.label}</Badge>
}

function ValidityBadge({ value }: { value: AccountValidity }) {
  const cfg = VALIDITY_OPTIONS.find((o) => o.key === value) || VALIDITY_OPTIONS[2]
  const Icon = cfg.icon
  return (
    <span className={cn('inline-flex items-center gap-1 text-xs', cfg.color)}>
      <Icon size={12} />
      {cfg.label}
    </span>
  )
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { key: string; label: string }[]
}) {
  return (
    <select
      className='bg-background h-8 rounded-md border px-2 text-xs'
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value=''>{label}：全部</option>
      {options.map((o) => (
        <option key={o.key} value={o.key}>
          {label}：{o.label}
        </option>
      ))}
    </select>
  )
}

export const Route = createFileRoute('/_authenticated/accounts/')({
  component: AccountsPage,
})
