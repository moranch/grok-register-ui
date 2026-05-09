import { useEffect, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import {
  Mail,
  Plus,
  RefreshCw,
  Trash2,
  RotateCcw,
  Play,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  AlertCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { useGrokStore } from '@/stores/grok-store'
import type {
  MailboxEntry,
  MailboxProviderType,
} from '@/lib/grok-api'
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

const PROVIDER_OPTIONS: {
  key: MailboxProviderType
  label: string
  hint: string
}[] = [
  { key: 'tmail', label: 'TMail（API Key）', hint: '需要 API Key，生成 xxx@域名 格式邮箱' },
  { key: 'duckmail', label: 'DuckMail', hint: '公共临时邮箱，无需管理密码' },
  { key: 'moemail', label: 'MoeMail（自建）', hint: 'cloudflare_temp_email 风格，管理员口令' },
  { key: 'custom', label: '自定义', hint: '兼容 duckmail 协议的自部署接口' },
]

const EMPTY_FORM = {
  name: '',
  provider_type: 'tmail' as MailboxProviderType,
  api_base: '',
  admin_password: '',
  domain: '',
  site_password: '',
}

function MailboxesPage() {
  const {
    mailboxes,
    loadingMailboxes,
    fetchMailboxes,
    addMailbox,
    updateMailbox,
    deleteMailbox,
    testMailbox,
  } = useGrokStore()

  const [form, setForm] = useState(EMPTY_FORM)
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [testingId, setTestingId] = useState<number | null>(null)
  const [showSecrets, setShowSecrets] = useState(false)

  useEffect(() => {
    fetchMailboxes()
  }, [fetchMailboxes])

  const startEdit = (m: MailboxEntry) => {
    setEditingId(m.id)
    setForm({
      name: m.name,
      provider_type: m.provider_type,
      api_base: m.api_base,
      admin_password: m.admin_password,
      domain: m.domain,
      site_password: m.site_password,
    })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setForm(EMPTY_FORM)
  }

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast.error('请填写名称')
      return
    }
    if (!form.api_base.trim()) {
      toast.error('请填写 API Base')
      return
    }
    setAdding(true)
    try {
      if (editingId) {
        await updateMailbox(editingId, form)
        toast.success('已保存')
      } else {
        await addMailbox({ ...form, enabled: true })
        toast.success('已添加')
      }
      setEditingId(null)
      setForm(EMPTY_FORM)
    } catch (e) {
      const err = e as { response?: { data?: { detail?: string } } }
      toast.error(err?.response?.data?.detail || '操作失败')
    } finally {
      setAdding(false)
    }
  }

  const handleToggle = async (id: number, enabled: boolean) => {
    try {
      await updateMailbox(id, { enabled })
    } catch {
      toast.error('更新失败')
    }
  }

  const handleDelete = async (id: number) => {
    if (!window.confirm(`确认删除邮箱 Provider #${id}？`)) return
    try {
      await deleteMailbox(id)
      toast.success('已删除')
      if (editingId === id) cancelEdit()
    } catch {
      toast.error('删除失败')
    }
  }

  const handleResetStats = async (id: number) => {
    try {
      await updateMailbox(id, { reset_stats: true })
      toast.success('已重置统计')
    } catch {
      toast.error('操作失败')
    }
  }

  const handleTest = async (id: number) => {
    setTestingId(id)
    try {
      const { ok, message } = await testMailbox(id)
      if (ok) toast.success(`连通：${message}`)
      else toast.error(`异常：${message}`)
    } catch {
      toast.error('测试失败')
    } finally {
      setTestingId(null)
    }
  }

  const total = mailboxes.length
  const enabledCount = mailboxes.filter((m) => m.enabled).length
  const activeId = editingId

  return (
    <div className='space-y-6 p-6'>
      {/* 标题 */}
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-3'>
          <Mail className='text-primary size-6' />
          <div>
            <h1 className='text-2xl font-bold'>邮箱 Provider</h1>
            <p className='text-muted-foreground mt-0.5 text-sm'>
              支持配置多个临时邮箱接口，按成功率加权轮询，连续失败 5 次自动禁用
            </p>
          </div>
        </div>
        <div className='flex items-center gap-2'>
          <Button
            variant='outline'
            size='sm'
            onClick={() => setShowSecrets((v) => !v)}
          >
            {showSecrets ? <EyeOff size={16} /> : <Eye size={16} />}
            {showSecrets ? '隐藏密钥' : '显示密钥'}
          </Button>
          <Button
            variant='outline'
            size='sm'
            onClick={fetchMailboxes}
            disabled={loadingMailboxes}
          >
            <RefreshCw
              size={16}
              className={loadingMailboxes ? 'animate-spin' : ''}
            />
            刷新
          </Button>
        </div>
      </div>

      {/* 概览 */}
      <div className='grid gap-4 md:grid-cols-3'>
        <StatMini label='Provider 总数' value={total} />
        <StatMini label='启用中' value={enabledCount} accent='emerald' />
        <StatMini
          label='总成功率'
          value={(() => {
            const s = mailboxes.reduce((a, b) => a + b.success_count, 0)
            const f = mailboxes.reduce((a, b) => a + b.failure_count, 0)
            return s + f > 0 ? `${((s / (s + f)) * 100).toFixed(1)}%` : '-'
          })()}
          accent='violet'
        />
      </div>

      {/* 左右布局：右侧列表 + 左侧表单 */}
      <div className='grid gap-6 lg:grid-cols-[360px_1fr]'>
        {/* 左：表单 */}
        <Card className='h-fit'>
          <CardHeader>
            <CardTitle className='text-base'>
              {editingId ? `编辑 #${editingId}` : '新增 Provider'}
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-4'>
            {/* Provider 类型 */}
            <div className='space-y-2'>
              <Label>Provider 类型</Label>
              <div className='grid gap-2'>
                {PROVIDER_OPTIONS.map((opt) => {
                  const selected = form.provider_type === opt.key
                  return (
                    <label
                      key={opt.key}
                      className={cn(
                        'cursor-pointer rounded-md border p-2.5 text-xs transition-all',
                        selected
                          ? 'border-primary bg-primary/5 shadow-sm'
                          : 'hover:border-primary/40 hover:bg-muted/40'
                      )}
                    >
                      <input
                        type='radio'
                        name='provider_type'
                        className='sr-only'
                        checked={selected}
                        onChange={() =>
                          setForm({ ...form, provider_type: opt.key })
                        }
                      />
                      <div className='flex items-center justify-between'>
                        <span className='font-semibold'>{opt.label}</span>
                        {selected && (
                          <span className='bg-primary/20 text-primary rounded px-1.5 py-0.5 text-[10px]'>
                            已选
                          </span>
                        )}
                      </div>
                      <div className='text-muted-foreground mt-0.5 text-[11px]'>
                        {opt.hint}
                      </div>
                    </label>
                  )
                })}
              </div>
            </div>

            <div className='space-y-2'>
              <Label htmlFor='mbox-name'>名称</Label>
              <Input
                id='mbox-name'
                placeholder='例如：tmail-1'
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='mbox-api'>API Base</Label>
              <Input
                id='mbox-api'
                placeholder='https://mail.example.com'
                value={form.api_base}
                onChange={(e) =>
                  setForm({ ...form, api_base: e.target.value })
                }
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='mbox-admin'>管理口令 / API Key</Label>
              <Input
                id='mbox-admin'
                type={showSecrets ? 'text' : 'password'}
                placeholder='sk_xxx 或 adminToken'
                value={form.admin_password}
                onChange={(e) =>
                  setForm({ ...form, admin_password: e.target.value })
                }
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='mbox-domain'>域名（可选）</Label>
              <Input
                id='mbox-domain'
                placeholder='留空则自动选择'
                value={form.domain}
                onChange={(e) => setForm({ ...form, domain: e.target.value })}
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='mbox-site'>站点密码（可选）</Label>
              <Input
                id='mbox-site'
                type={showSecrets ? 'text' : 'password'}
                placeholder='x-custom-auth'
                value={form.site_password}
                onChange={(e) =>
                  setForm({ ...form, site_password: e.target.value })
                }
              />
            </div>
            <div className='flex gap-2 pt-2'>
              <Button
                className='flex-1'
                onClick={handleSubmit}
                disabled={adding}
              >
                {editingId ? <RotateCcw size={14} /> : <Plus size={14} />}
                {editingId ? '保存修改' : '添加'}
              </Button>
              {editingId && (
                <Button variant='outline' onClick={cancelEdit}>
                  取消
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 右：列表 */}
        <Card className='h-fit'>
          <CardHeader className='flex-row items-center justify-between'>
            <CardTitle className='text-base'>Provider 列表</CardTitle>
            <span className='text-muted-foreground text-xs'>
              共 {total} 个
            </span>
          </CardHeader>
          <CardContent>
            {mailboxes.length === 0 ? (
              <div className='text-muted-foreground py-10 text-center'>
                <Mail className='mx-auto mb-3 size-10 opacity-30' />
                <div className='text-sm'>
                  暂无邮箱 Provider，新任务会回落到系统配置里的邮箱
                </div>
              </div>
            ) : (
              <div className='space-y-3'>
                {mailboxes.map((m) => {
                  const isActive = activeId === m.id
                  return (
                    <div
                      key={m.id}
                      className={cn(
                        'rounded-lg border p-4 transition-colors',
                        isActive
                          ? 'border-primary bg-primary/5'
                          : 'hover:border-primary/40'
                      )}
                    >
                      <div className='mb-2 flex items-center justify-between gap-2'>
                        <div className='flex items-center gap-2'>
                          <span className='text-muted-foreground font-mono text-xs'>
                            #{m.id}
                          </span>
                          <span className='text-sm font-semibold'>
                            {m.name}
                          </span>
                          <Badge variant='outline' className='text-[10px]'>
                            {m.provider_type}
                          </Badge>
                        </div>
                        <Switch
                          checked={m.enabled}
                          onCheckedChange={(v: boolean) =>
                            handleToggle(m.id, v)
                          }
                        />
                      </div>
                      <div className='text-muted-foreground mb-2 truncate font-mono text-xs'>
                        {m.api_base}
                      </div>

                      <div className='mb-3 flex flex-wrap items-center gap-2 text-xs'>
                        <Badge
                          variant={
                            m.success_rate >= 70
                              ? 'default'
                              : m.success_rate >= 30
                                ? 'secondary'
                                : 'destructive'
                          }
                        >
                          成功率 {m.success_rate}%
                        </Badge>
                        <span className='text-emerald-600 dark:text-emerald-400'>
                          ✓ {m.success_count}
                        </span>
                        <span className='text-red-600 dark:text-red-400'>
                          ✗ {m.failure_count}
                        </span>
                        {m.consecutive_failures >= 3 && (
                          <span className='text-amber-600 dark:text-amber-400'>
                            连续失败 {m.consecutive_failures}
                            {m.consecutive_failures >= 5 && '（已禁用）'}
                          </span>
                        )}
                      </div>

                      <div className='flex flex-wrap gap-1.5'>
                        <Button
                          variant='outline'
                          size='sm'
                          className='h-7 text-xs'
                          onClick={() => handleTest(m.id)}
                          disabled={testingId === m.id}
                        >
                          {testingId === m.id ? (
                            <RefreshCw size={12} className='animate-spin' />
                          ) : (
                            <Play size={12} />
                          )}
                          测试
                        </Button>
                        <Button
                          variant='outline'
                          size='sm'
                          className='h-7 text-xs'
                          onClick={() => startEdit(m)}
                        >
                          编辑
                        </Button>
                        <Button
                          variant='outline'
                          size='sm'
                          className='h-7 text-xs'
                          onClick={() => handleResetStats(m.id)}
                        >
                          <RotateCcw size={12} />
                          重置
                        </Button>
                        <Button
                          variant='outline'
                          size='sm'
                          className='h-7 text-xs'
                          onClick={() => handleDelete(m.id)}
                        >
                          <Trash2 size={12} />
                          删除
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 说明 */}
      <Card>
        <CardContent className='space-y-3 py-4'>
          <div className='flex items-start gap-3 text-sm'>
            <CheckCircle2 className='mt-0.5 size-4 shrink-0 text-emerald-500' />
            <div>
              <div className='font-medium'>工作原理</div>
              <p className='text-muted-foreground mt-1 leading-relaxed'>
                每次启动任务时，系统会从"启用"状态的邮箱 Provider 里按
                <code className='bg-muted mx-1 rounded px-1 py-0.5 text-xs'>
                  (s+1)/(s+f+2)
                </code>
                加权随机挑一个，覆盖本次任务的
                <code className='bg-muted mx-1 rounded px-1 py-0.5 text-xs'>
                  temp_mail_*
                </code>
                字段。任务结束后按成功/失败反馈更新该 Provider 的统计。
              </p>
            </div>
          </div>
          <div className='flex items-start gap-3 text-sm'>
            <AlertCircle className='mt-0.5 size-4 shrink-0 text-amber-500' />
            <div>
              <div className='font-medium'>回落策略</div>
              <p className='text-muted-foreground mt-1 leading-relaxed'>
                没有启用的 Provider 时，任务会使用"系统配置 → 邮箱"里的默认接口。
                加权挑选会自动避开连续失败过多的 Provider。
              </p>
            </div>
          </div>
          <div className='flex items-start gap-3 text-sm'>
            <XCircle className='mt-0.5 size-4 shrink-0 text-sky-500' />
            <div>
              <div className='font-medium'>测试按钮</div>
              <p className='text-muted-foreground mt-1 leading-relaxed'>
                点击"测试"会向 API Base 发一个 GET 请求做可达性检测（不会真的创建邮箱）。
                返回 HTTP 200/401/404 一般都算"已可达"，只是具体能不能创建邮箱要看接口协议。
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
  accent?: 'emerald' | 'violet' | 'sky'
}) {
  const color =
    accent === 'emerald'
      ? 'text-emerald-600 dark:text-emerald-400'
      : accent === 'violet'
        ? 'text-violet-600 dark:text-violet-400'
        : accent === 'sky'
          ? 'text-sky-600 dark:text-sky-400'
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

export const Route = createFileRoute('/_authenticated/mailboxes/')({
  component: MailboxesPage,
})
