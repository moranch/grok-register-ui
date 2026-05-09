/**
 * 配置中心（对齐 any-auto-register 的 9-tab 布局）
 *
 * 9 个 Tab：
 *   1. 通用       - 总览 + 快速入口
 *   2. 代理       - 默认代理 + 代理池跳转
 *   3. 邮箱       - 默认邮箱 + 邮箱 Provider 池跳转
 *   4. Token 推送 - grok2api sink 配置
 *   5. 注册策略   - 每轮间隔 / 超时 / 并发 / 熔断
 *   6. 验证服务   - Turnstile solver（占位）
 *   7. 执行器     - headless / headed / protocol
 *   8. 生命周期   - Token 续期 + 检测间隔
 *   9. 高级       - 日志级别 / 错误采集 / 清理 / 导入导出
 *   10. 关于      - 系统信息
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { createFileRoute, Link, useLocation } from '@tanstack/react-router'
import {
  Save,
  RefreshCw,
  Settings as SettingsIcon,
  Globe,
  Mail,
  Key,
  Cpu,
  Clock,
  Zap,
  EyeOff,
  Eye,
  Info,
  Shield,
  Sparkles,
  Wrench,
  Flame,
  Database,
  Upload,
  Download,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react'
import { toast } from 'sonner'
import { useGrokStore } from '@/stores/grok-store'
import {
  systemApi,
  type SystemSettings,
  type SystemInfo,
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
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { formatBackendTime } from '@/lib/grok-time'

// ============== 默认配置（必须和后端 SystemSettings 默认值对齐） ==============

const EMPTY_SETTINGS: SystemSettings = {
  proxy: '',
  browser_proxy: '',
  temp_mail_api_base: '',
  temp_mail_admin_password: '',
  temp_mail_domain: '',
  temp_mail_site_password: '',
  api_endpoint: '',
  api_token: '',
  api_append: true,
  debug_mode: false,
  executor: 'headless',
  lifecycle_enabled: false,
  lifecycle_check_hours: 6,
  round_interval_sec: 2,
  round_timeout_sec: 180,
  max_concurrent_tasks: 1,
  circuit_break_fail_threshold: 0,
  captcha_provider: 'none',
  captcha_api_key: '',
  log_level: 'info',
  collect_error_samples: true,
}

// ============== Tab 定义 ==============

type TabKey =
  | 'general'
  | 'proxy'
  | 'mailbox'
  | 'token'
  | 'register'
  | 'captcha'
  | 'executor'
  | 'lifecycle'
  | 'advanced'
  | 'about'

const TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: 'general', label: '通用', icon: Info },
  { key: 'proxy', label: '代理', icon: Globe },
  { key: 'mailbox', label: '邮箱', icon: Mail },
  { key: 'token', label: 'Token 推送', icon: Key },
  { key: 'register', label: '注册策略', icon: Sparkles },
  { key: 'captcha', label: '验证服务', icon: Shield },
  { key: 'executor', label: '执行器', icon: Cpu },
  { key: 'lifecycle', label: '生命周期', icon: Clock },
  { key: 'advanced', label: '高级', icon: Wrench },
  { key: 'about', label: '关于', icon: Database },
]

// ============== 主组件 ==============

function SettingsPage() {
  const { settings, defaults, loadingSettings, fetchSettings, saveSettings } =
    useGrokStore()
  const [form, setForm] = useState<SystemSettings>(EMPTY_SETTINGS)
  const [saving, setSaving] = useState(false)
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null)
  const [loadingInfo, setLoadingInfo] = useState(false)

  // 当前 tab 从 URL query 读取
  const search = useLocation({ select: (loc) => loc.searchStr })
  const activeTab: TabKey = useMemo(() => {
    const params = new URLSearchParams(search || '')
    const t = params.get('tab') as TabKey | null
    if (t && TABS.find((x) => x.key === t)) return t
    return 'general'
  }, [search])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  // settings/defaults 更新时同步表单
  useEffect(() => {
    const d = defaults as Record<string, unknown>
    const api = (d?.api as Record<string, unknown>) || {}
    const merged: SystemSettings = {
      ...EMPTY_SETTINGS,
      proxy: str(d?.proxy),
      browser_proxy: str(d?.browser_proxy),
      temp_mail_api_base: str(d?.temp_mail_api_base),
      temp_mail_admin_password: str(d?.temp_mail_admin_password),
      temp_mail_domain: str(d?.temp_mail_domain),
      temp_mail_site_password: str(d?.temp_mail_site_password),
      api_endpoint: str(api?.endpoint),
      api_token: str(api?.token),
      api_append: typeof api?.append === 'boolean' ? api.append : true,
      debug_mode: bool(d?.debug_mode, false),
      executor: str(d?.executor, 'headless'),
      lifecycle_enabled: bool(d?.lifecycle_enabled, false),
      lifecycle_check_hours: int(d?.lifecycle_check_hours, 6),
      round_interval_sec: int(d?.round_interval_sec, 2),
      round_timeout_sec: int(d?.round_timeout_sec, 180),
      max_concurrent_tasks: int(d?.max_concurrent_tasks, 1),
      circuit_break_fail_threshold: int(d?.circuit_break_fail_threshold, 0),
      captcha_provider: str(d?.captcha_provider, 'none'),
      captcha_api_key: str(d?.captcha_api_key, ''),
      log_level: str(d?.log_level, 'info'),
      collect_error_samples: bool(d?.collect_error_samples, true),
      ...(settings || {}),
    }
    setForm(merged)
  }, [settings, defaults])

  // 关于 tab 时拉系统信息
  useEffect(() => {
    if (activeTab !== 'about') return
    setLoadingInfo(true)
    systemApi
      .info()
      .then(({ data }) => setSystemInfo(data))
      .catch(() => setSystemInfo(null))
      .finally(() => setLoadingInfo(false))
  }, [activeTab])

  const update = <K extends keyof SystemSettings>(
    key: K,
    value: SystemSettings[K]
  ) => setForm((prev) => ({ ...prev, [key]: value }))

  const handleSave = async () => {
    setSaving(true)
    try {
      await saveSettings(form)
      toast.success('配置保存成功')
    } catch {
      toast.error('配置保存失败')
    } finally {
      setSaving(false)
    }
  }

  const activeMeta = TABS.find((t) => t.key === activeTab)!
  const ActiveIcon = activeMeta.icon

  return (
    <div className='p-6'>
      {/* 标题 */}
      <div className='mb-6 flex items-center justify-between'>
        <div className='flex items-center gap-3'>
          <SettingsIcon className='text-primary size-6' />
          <div>
            <h1 className='text-2xl font-bold'>配置中心</h1>
            <p className='text-muted-foreground mt-0.5 text-sm'>
              配置所有运行时参数 · 代理 · 邮箱 · 注册策略 · 执行器等
            </p>
          </div>
        </div>
        <div className='flex items-center gap-2'>
          <Button
            variant='outline'
            size='sm'
            onClick={fetchSettings}
            disabled={loadingSettings}
          >
            <RefreshCw
              size={16}
              className={loadingSettings ? 'animate-spin' : ''}
            />
            重新加载
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save size={16} />
            {saving ? '保存中...' : '保存配置'}
          </Button>
        </div>
      </div>

      <div className='grid gap-6 lg:grid-cols-[200px_1fr]'>
        {/* 左侧 sticky tab 列 */}
        <aside className='lg:sticky lg:top-4 lg:self-start'>
          <div className='bg-card rounded-lg border p-2'>
            <div className='text-muted-foreground mb-1 px-2 pt-1 pb-1 text-[11px] font-medium tracking-wider uppercase'>
              配置分组
            </div>
            <nav className='space-y-0.5'>
              {TABS.map((tab) => {
                const Icon = tab.icon
                const selected = activeTab === tab.key
                return (
                  <Link
                    key={tab.key}
                    to='/settings'
                    search={{ tab: tab.key } as never}
                    className={cn(
                      'relative flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-[13px] transition-colors',
                      selected
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    {selected && (
                      <span className='bg-primary absolute top-1/2 left-0 h-4 w-[2px] -translate-y-1/2 rounded-full' />
                    )}
                    <Icon size={14} className='shrink-0' />
                    <span>{tab.label}</span>
                  </Link>
                )
              })}
            </nav>
          </div>
        </aside>

        {/* 右侧 tab 内容 */}
        <div className='space-y-4'>
          <div className='flex items-center gap-2 text-base font-semibold'>
            <ActiveIcon className='text-primary size-5' />
            {activeMeta.label}
          </div>

          {activeTab === 'general' && (
            <GeneralTab
              form={form}
              update={update}
              systemInfo={systemInfo}
            />
          )}
          {activeTab === 'proxy' && <ProxyTab form={form} update={update} />}
          {activeTab === 'mailbox' && (
            <MailboxTab form={form} update={update} />
          )}
          {activeTab === 'token' && <TokenTab form={form} update={update} />}
          {activeTab === 'register' && (
            <RegisterTab form={form} update={update} />
          )}
          {activeTab === 'captcha' && (
            <CaptchaTab form={form} update={update} />
          )}
          {activeTab === 'executor' && (
            <ExecutorTab form={form} update={update} />
          )}
          {activeTab === 'lifecycle' && (
            <LifecycleTab form={form} update={update} />
          )}
          {activeTab === 'advanced' && (
            <AdvancedTab
              form={form}
              update={update}
            />
          )}
          {activeTab === 'about' && (
            <AboutTab info={systemInfo} loading={loadingInfo} />
          )}
        </div>
      </div>
    </div>
  )
}

// ============== 辅助 ==============

function str(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback
}
function bool(v: unknown, fallback: boolean): boolean {
  return typeof v === 'boolean' ? v : fallback
}
function int(v: unknown, fallback: number): number {
  return typeof v === 'number' ? v : fallback
}

type TabProps = {
  form: SystemSettings
  update: <K extends keyof SystemSettings>(
    key: K,
    value: SystemSettings[K]
  ) => void
}

// ============== 各 Tab 组件 ==============

function GeneralTab({
  form,
  systemInfo,
}: TabProps & { systemInfo: SystemInfo | null }) {
  return (
    <>
      <Card>
        <CardContent className='py-5'>
          <p className='text-muted-foreground text-sm leading-relaxed'>
            这里是配置中心，左侧 tab 把所有运行时参数分成了 10 个分组。
            <br />
            - 本页的"保存配置"按钮会保存除"关于"外所有 tab 的表单值
            <br />
            -"代理池""邮箱 Provider"如果非空，会覆盖默认代理/邮箱
            <br />- "高级"tab 里可以导入/导出整份配置，方便迁移到新服务器
          </p>
        </CardContent>
      </Card>
      <div className='grid gap-3 md:grid-cols-2 lg:grid-cols-4'>
        <MiniStat label='执行器' value={form.executor} />
        <MiniStat
          label='调试模式'
          value={form.debug_mode ? '开启' : '关闭'}
          accent={form.debug_mode ? 'amber' : undefined}
        />
        <MiniStat
          label='生命周期'
          value={
            form.lifecycle_enabled ? `每 ${form.lifecycle_check_hours}h` : '关闭'
          }
          accent={form.lifecycle_enabled ? 'emerald' : undefined}
        />
        <MiniStat
          label='并发任务'
          value={systemInfo?.max_concurrent_tasks ?? form.max_concurrent_tasks}
        />
      </div>
      {systemInfo && (
        <Card>
          <CardHeader className='pb-3'>
            <CardTitle className='text-sm'>系统概览</CardTitle>
          </CardHeader>
          <CardContent className='grid gap-2 text-xs md:grid-cols-2'>
            <KV k='任务数' v={systemInfo.counts.tasks} />
            <KV k='事件数' v={systemInfo.counts.events} />
            <KV k='账号池' v={systemInfo.counts.accounts} />
            <KV k='代理数' v={systemInfo.counts.proxies} />
            <KV k='邮箱 Provider' v={systemInfo.counts.mailboxes} />
            <KV k='版本' v={systemInfo.app_version} />
          </CardContent>
        </Card>
      )}
    </>
  )
}

function ProxyTab({ form, update }: TabProps) {
  return (
    <>
      <Card>
        <CardContent className='space-y-5 py-5'>
          <div className='space-y-2'>
            <Label htmlFor='browser_proxy'>浏览器代理</Label>
            <Input
              id='browser_proxy'
              placeholder='socks5://warp:1080'
              value={form.browser_proxy}
              onChange={(e) => update('browser_proxy', e.target.value)}
            />
            <p className='text-muted-foreground text-xs'>
              浏览器访问 x.ai 时走的代理；代理池里有启用项时会被覆盖
            </p>
          </div>
          <div className='space-y-2'>
            <Label htmlFor='proxy'>请求代理</Label>
            <Input
              id='proxy'
              placeholder='socks5://warp:1080'
              value={form.proxy}
              onChange={(e) => update('proxy', e.target.value)}
            />
            <p className='text-muted-foreground text-xs'>
              Python requests（邮箱 API、健康检查）走的代理
            </p>
          </div>
        </CardContent>
      </Card>
      <GotoCard
        to='/proxies'
        icon={Globe}
        title='代理池'
        desc='多代理按成功率加权轮询，连续失败 5 次自动禁用'
      />
    </>
  )
}

function MailboxTab({ form, update }: TabProps) {
  return (
    <>
      <Card>
        <CardContent className='space-y-5 py-5'>
          <div className='space-y-2'>
            <Label htmlFor='temp_mail_api_base'>邮箱 API Base</Label>
            <Input
              id='temp_mail_api_base'
              placeholder='https://mail.nnioj.com'
              value={form.temp_mail_api_base}
              onChange={(e) => update('temp_mail_api_base', e.target.value)}
            />
          </div>
          <div className='grid gap-4 md:grid-cols-2'>
            <div className='space-y-2'>
              <Label htmlFor='temp_mail_admin_password'>管理口令 / API Key</Label>
              <Input
                id='temp_mail_admin_password'
                placeholder='sk_xxx'
                value={form.temp_mail_admin_password}
                onChange={(e) =>
                  update('temp_mail_admin_password', e.target.value)
                }
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='temp_mail_domain'>邮箱域名</Label>
              <Input
                id='temp_mail_domain'
                placeholder='留空自动选择'
                value={form.temp_mail_domain}
                onChange={(e) => update('temp_mail_domain', e.target.value)}
              />
            </div>
            <div className='space-y-2 md:col-span-2'>
              <Label htmlFor='temp_mail_site_password'>站点密码</Label>
              <Input
                id='temp_mail_site_password'
                placeholder='可选（x-custom-auth）'
                value={form.temp_mail_site_password}
                onChange={(e) =>
                  update('temp_mail_site_password', e.target.value)
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>
      <GotoCard
        to='/mailboxes'
        icon={Mail}
        title='邮箱 Provider 池'
        desc='配置多套临时邮箱接口，按成功率加权轮询（对齐 any-auto-register）'
      />
    </>
  )
}

function TokenTab({ form, update }: TabProps) {
  return (
    <Card>
      <CardContent className='space-y-5 py-5'>
        <div className='grid gap-4 md:grid-cols-2'>
          <div className='space-y-2'>
            <Label htmlFor='api_endpoint'>上传接口</Label>
            <Input
              id='api_endpoint'
              placeholder='http://grok2api:8000/v1/admin/tokens'
              value={form.api_endpoint}
              onChange={(e) => update('api_endpoint', e.target.value)}
            />
          </div>
          <div className='space-y-2'>
            <Label htmlFor='api_token'>管理口令</Label>
            <Input
              id='api_token'
              placeholder='admin-password'
              value={form.api_token}
              onChange={(e) => update('api_token', e.target.value)}
            />
          </div>
        </div>
        <label
          htmlFor='api_append'
          className={cn(
            'flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors',
            form.api_append ? 'border-primary bg-primary/5' : 'bg-muted/30'
          )}
        >
          <Checkbox
            id='api_append'
            checked={form.api_append}
            onCheckedChange={(v: boolean) => update('api_append', !!v)}
            className='mt-0.5'
          />
          <div className='space-y-1'>
            <div className='text-sm font-medium'>追加写入 token</div>
            <p className='text-muted-foreground text-xs'>
              开启后会先读取线上已有 token，合并后再推送
            </p>
          </div>
        </label>
      </CardContent>
    </Card>
  )
}

function RegisterTab({ form, update }: TabProps) {
  return (
    <>
      <Card>
        <CardHeader className='pb-3'>
          <CardTitle className='text-sm'>节奏控制</CardTitle>
        </CardHeader>
        <CardContent className='grid gap-4 md:grid-cols-2'>
          <NumField
            id='round_interval_sec'
            label='每轮间隔（秒）'
            hint='0 表示无间隔'
            min={0}
            max={3600}
            value={form.round_interval_sec}
            onChange={(v) => update('round_interval_sec', v)}
          />
          <NumField
            id='round_timeout_sec'
            label='每轮超时（秒）'
            hint='超过认为失败，0 = 不限'
            min={0}
            max={7200}
            value={form.round_timeout_sec}
            onChange={(v) => update('round_timeout_sec', v)}
          />
          <NumField
            id='max_concurrent_tasks'
            label='最大并发任务'
            hint='1 = 串行，推荐 1'
            min={1}
            max={8}
            value={form.max_concurrent_tasks}
            onChange={(v) => update('max_concurrent_tasks', v)}
          />
          <NumField
            id='circuit_break_fail_threshold'
            label='连续失败熔断阈值'
            hint='连续 N 轮失败自动停止任务，0 = 不熔断'
            min={0}
            max={50}
            value={form.circuit_break_fail_threshold}
            onChange={(v) => update('circuit_break_fail_threshold', v)}
          />
        </CardContent>
      </Card>
    </>
  )
}

function CaptchaTab({ form, update }: TabProps) {
  const providers: {
    key: string
    label: string
    hint: string
  }[] = [
    { key: 'none', label: '不使用', hint: '依赖浏览器自动过 Turnstile' },
    { key: 'yescaptcha', label: 'YesCaptcha', hint: '远程 Turnstile 解码' },
    { key: '2captcha', label: '2Captcha', hint: '远程 Turnstile 解码' },
    {
      key: 'local',
      label: '本地 Solver',
      hint: '预留：对接 Camoufox 本地 solver',
    },
  ]
  const requireKey = form.captcha_provider !== 'none'
  return (
    <Card>
      <CardContent className='space-y-5 py-5'>
        <div className='grid gap-2 md:grid-cols-2'>
          {providers.map((p) => {
            const selected = form.captcha_provider === p.key
            return (
              <label
                key={p.key}
                className={cn(
                  'cursor-pointer rounded-md border p-3 transition-all',
                  selected
                    ? 'border-primary bg-primary/5 shadow-sm'
                    : 'hover:border-primary/40 hover:bg-muted/40'
                )}
              >
                <input
                  type='radio'
                  name='captcha_provider'
                  className='sr-only'
                  checked={selected}
                  onChange={() => update('captcha_provider', p.key)}
                />
                <div className='flex items-center justify-between'>
                  <span className='text-sm font-semibold'>{p.label}</span>
                  {selected && (
                    <Badge variant='default' className='text-[10px]'>
                      已选
                    </Badge>
                  )}
                </div>
                <div className='text-muted-foreground mt-0.5 text-xs'>
                  {p.hint}
                </div>
              </label>
            )
          })}
        </div>
        {requireKey && (
          <div className='space-y-2'>
            <Label htmlFor='captcha_api_key'>
              {form.captcha_provider === 'yescaptcha'
                ? 'YesCaptcha Client Key'
                : form.captcha_provider === '2captcha'
                  ? '2Captcha API Key'
                  : 'Solver 管理密钥'}
            </Label>
            <Input
              id='captcha_api_key'
              type='password'
              placeholder='cap_xxx'
              value={form.captcha_api_key}
              onChange={(e) => update('captcha_api_key', e.target.value)}
            />
          </div>
        )}
        <div className='rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs dark:border-amber-500/30 dark:bg-amber-900/10'>
          <div className='flex items-center gap-2 font-medium text-amber-700 dark:text-amber-300'>
            <AlertTriangle size={14} />
            说明
          </div>
          <p className='text-muted-foreground mt-1 leading-relaxed'>
            当前 Turnstile 主要依赖浏览器 + turnstilePatch 扩展过关，
            远程 solver 是实验性入口；接入代码可按需加到 DrissionPage_example.py。
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

function ExecutorTab({ form, update }: TabProps) {
  const opts: {
    key: string
    icon: React.ElementType
    title: string
    desc: string
    accent: string
  }[] = [
    {
      key: 'headless',
      icon: EyeOff,
      title: '无头浏览器',
      desc: '--headless=new，资源最省，推荐生产',
      accent:
        'border-sky-500/60 bg-sky-50 dark:border-sky-500/30 dark:bg-sky-900/10',
    },
    {
      key: 'headed',
      icon: Eye,
      title: '有头浏览器',
      desc: 'Xvfb + noVNC 可观察，反检测更佳',
      accent:
        'border-amber-400/60 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-900/10',
    },
    {
      key: 'protocol',
      icon: Zap,
      title: '纯协议（实验）',
      desc: 'curl_cffi 直接 HTTP，需要远程 Turnstile solver',
      accent:
        'border-violet-400/60 bg-violet-50 dark:border-violet-500/30 dark:bg-violet-900/10',
    },
  ]
  return (
    <Card>
      <CardContent className='space-y-4 py-5'>
        <div className='grid gap-3 md:grid-cols-3'>
          {opts.map((opt) => {
            const selected = form.executor === opt.key
            const Icon = opt.icon
            return (
              <label
                key={opt.key}
                className={cn(
                  'cursor-pointer space-y-2 rounded-lg border p-4 transition-all',
                  selected
                    ? opt.accent + ' shadow-sm'
                    : 'hover:border-primary/40 hover:bg-muted/40'
                )}
              >
                <input
                  type='radio'
                  name='executor'
                  className='sr-only'
                  value={opt.key}
                  checked={selected}
                  onChange={() => {
                    update('executor', opt.key)
                    update('debug_mode', opt.key === 'headed')
                  }}
                />
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-2'>
                    <Icon className='text-primary size-4' />
                    <span className='text-sm font-semibold'>{opt.title}</span>
                  </div>
                  {selected && (
                    <Badge variant='default' className='text-[10px]'>
                      已选
                    </Badge>
                  )}
                </div>
                <p className='text-muted-foreground text-xs leading-relaxed'>
                  {opt.desc}
                </p>
              </label>
            )
          })}
        </div>
        <p className='text-muted-foreground text-xs'>
          💡 选择"有头浏览器"后，启动任务时可以到"可视化调试（noVNC）"页实时查看浏览器窗口。
        </p>
      </CardContent>
    </Card>
  )
}

function LifecycleTab({ form, update }: TabProps) {
  return (
    <>
      <Card>
        <CardContent className='space-y-4 py-5'>
          <div
            className={cn(
              'flex items-start justify-between gap-4 rounded-lg border p-4 transition-colors',
              form.lifecycle_enabled
                ? 'border-emerald-400/60 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-900/10'
                : 'bg-muted/30'
            )}
          >
            <div className='space-y-1.5'>
              <div className='flex items-center gap-2'>
                <span className='text-sm font-semibold'>
                  定时检测 Token sink 可达性
                </span>
                {form.lifecycle_enabled && (
                  <Badge variant='default' className='text-[10px]'>
                    已启用
                  </Badge>
                )}
              </div>
              <p className='text-muted-foreground text-xs leading-relaxed'>
                开启后按下方间隔调用 Token 推送接口做可达性检测，
                账号的 last_checked_at 会被更新
              </p>
            </div>
            <Switch
              checked={form.lifecycle_enabled}
              onCheckedChange={(v: boolean) => update('lifecycle_enabled', v)}
            />
          </div>
          <NumField
            id='lifecycle_check_hours'
            label='检测间隔（小时）'
            hint='推荐 6 小时'
            min={1}
            max={168}
            value={form.lifecycle_check_hours}
            onChange={(v) => update('lifecycle_check_hours', v)}
          />
        </CardContent>
      </Card>
    </>
  )
}

function AdvancedTab({ form, update }: TabProps) {
  const [cleaning, setCleaning] = useState<string | null>(null)
  const [cleanupDays, setCleanupDays] = useState(30)
  const fileRef = useRef<HTMLInputElement | null>(null)

  const logLevels = ['debug', 'info', 'warn', 'error']

  const doCleanup = async (
    target: 'events' | 'finished_tasks' | 'all_tasks' | 'accounts',
    requireConfirm = true
  ) => {
    if (
      requireConfirm &&
      !window.confirm(`确认执行清理：${target} / ${cleanupDays} 天？`)
    )
      return
    setCleaning(target)
    try {
      const { data } = await systemApi.cleanup(target, cleanupDays)
      toast.success(`已清理 ${data.deleted} 条`)
    } catch {
      toast.error('清理失败')
    } finally {
      setCleaning(null)
    }
  }

  const doImport = async (file: File) => {
    try {
      const text = await file.text()
      const payload = JSON.parse(text)
      const { data } = await systemApi.importConfig(payload)
      toast.success(
        `导入完成：settings=${data.imported.settings}，proxies=${data.imported.proxies}，mailboxes=${data.imported.mailboxes}`
      )
    } catch (e) {
      toast.error(
        '导入失败：' + ((e as Error).message || '请检查 JSON 格式')
      )
    }
  }

  const doExport = () => {
    const pw = localStorage.getItem('console_password') || ''
    fetch(systemApi.exportConfigUrl(), {
      headers: pw ? { Authorization: `Bearer ${pw}` } : undefined,
    })
      .then((r) => r.blob().then((blob) => ({ r, blob })))
      .then(({ r, blob }) => {
        const cd = r.headers.get('content-disposition') || ''
        const m = cd.match(/filename="?([^";]+)"?/i)
        const filename = m ? m[1] : 'grok-config.json'
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        a.click()
        URL.revokeObjectURL(url)
      })
      .catch(() => toast.error('导出失败'))
  }

  return (
    <>
      {/* 日志与错误采集 */}
      <Card>
        <CardHeader className='pb-3'>
          <CardTitle className='text-sm'>日志与采集</CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='space-y-2'>
            <Label>日志级别</Label>
            <div className='grid grid-cols-4 gap-2'>
              {logLevels.map((lv) => (
                <label
                  key={lv}
                  className={cn(
                    'cursor-pointer rounded-md border p-2 text-center text-xs font-medium transition-colors',
                    form.log_level === lv
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'hover:bg-muted'
                  )}
                >
                  <input
                    type='radio'
                    name='log_level'
                    value={lv}
                    className='sr-only'
                    checked={form.log_level === lv}
                    onChange={() => update('log_level', lv)}
                  />
                  {lv.toUpperCase()}
                </label>
              ))}
            </div>
          </div>
          <label
            className={cn(
              'flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors',
              form.collect_error_samples
                ? 'border-primary bg-primary/5'
                : 'bg-muted/30'
            )}
          >
            <Checkbox
              checked={form.collect_error_samples}
              onCheckedChange={(v: boolean) =>
                update('collect_error_samples', !!v)
              }
              className='mt-0.5'
            />
            <div className='space-y-1'>
              <div className='text-sm font-medium'>
                在错误聚合里保留原始错误样本
              </div>
              <p className='text-muted-foreground text-xs'>
                关闭后只统计错误次数，不存储具体消息（隐私 / 存储敏感）
              </p>
            </div>
          </label>
        </CardContent>
      </Card>

      {/* 清理 */}
      <Card>
        <CardHeader className='pb-3'>
          <CardTitle className='flex items-center gap-2 text-sm'>
            <Flame className='text-red-500' size={14} />
            数据清理
          </CardTitle>
        </CardHeader>
        <CardContent className='space-y-3'>
          <div className='flex items-center gap-3'>
            <Label htmlFor='cleanup-days' className='shrink-0 text-sm'>
              保留天数
            </Label>
            <Input
              id='cleanup-days'
              type='number'
              min={1}
              max={3650}
              className='max-w-[120px]'
              value={cleanupDays}
              onChange={(e) =>
                setCleanupDays(
                  Math.max(1, Math.min(3650, parseInt(e.target.value) || 30))
                )
              }
            />
            <span className='text-muted-foreground text-xs'>
              仅影响"事件""已完成任务"这两个清理目标
            </span>
          </div>
          <div className='grid gap-2 md:grid-cols-2'>
            <CleanupBtn
              label='清理注册事件'
              hint={`删除 ${cleanupDays} 天前的 register_events`}
              loading={cleaning === 'events'}
              onClick={() => doCleanup('events')}
            />
            <CleanupBtn
              label='清理已完成任务'
              hint={`删除 ${cleanupDays} 天前的 completed/failed/stopped 任务`}
              loading={cleaning === 'finished_tasks'}
              onClick={() => doCleanup('finished_tasks')}
            />
            <CleanupBtn
              label='清理全部非运行任务'
              hint='高危：删除所有不在跑的任务（不影响 running）'
              danger
              loading={cleaning === 'all_tasks'}
              onClick={() => doCleanup('all_tasks')}
            />
            <CleanupBtn
              label='清空账号池'
              hint='高危：删除 accounts 表里的全部记录'
              danger
              loading={cleaning === 'accounts'}
              onClick={() => doCleanup('accounts')}
            />
          </div>
        </CardContent>
      </Card>

      {/* 导入导出 */}
      <Card>
        <CardHeader className='pb-3'>
          <CardTitle className='flex items-center gap-2 text-sm'>
            <Database size={14} />
            配置迁移
          </CardTitle>
        </CardHeader>
        <CardContent className='space-y-3'>
          <p className='text-muted-foreground text-xs leading-relaxed'>
            导出会把当前 settings + 代理池 + 邮箱池打成一个 JSON 文件。
            导入时系统会把 settings 整段覆盖，代理池和邮箱池按 URL / 名称增量新增。
          </p>
          <div className='flex gap-2'>
            <Button variant='outline' onClick={doExport}>
              <Download size={14} />
              导出配置
            </Button>
            <Button
              variant='outline'
              onClick={() => fileRef.current?.click()}
            >
              <Upload size={14} />
              导入配置
            </Button>
            <input
              ref={fileRef}
              type='file'
              accept='application/json'
              className='hidden'
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) doImport(f)
                e.target.value = ''
              }}
            />
          </div>
        </CardContent>
      </Card>
    </>
  )
}

function AboutTab({
  info,
  loading,
}: {
  info: SystemInfo | null
  loading: boolean
}) {
  if (loading) {
    return (
      <Card>
        <CardContent className='py-10 text-center text-sm text-muted-foreground'>
          <RefreshCw className='mx-auto mb-2 size-5 animate-spin' />
          加载中…
        </CardContent>
      </Card>
    )
  }
  if (!info) {
    return (
      <Card>
        <CardContent className='py-10 text-center text-sm text-muted-foreground'>
          暂无信息
        </CardContent>
      </Card>
    )
  }
  const toMB = (n: number) => (n / 1024 / 1024).toFixed(2) + ' MB'
  return (
    <>
      <Card>
        <CardHeader className='pb-3'>
          <CardTitle className='text-sm'>应用</CardTitle>
        </CardHeader>
        <CardContent className='grid gap-2 text-xs md:grid-cols-2'>
          <KV k='名称' v={info.app_name} />
          <KV k='版本' v={info.app_version} />
          <KV k='Python' v={info.python_version} />
          <KV k='Platform' v={info.platform} mono />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className='pb-3'>
          <CardTitle className='text-sm'>运行路径</CardTitle>
        </CardHeader>
        <CardContent className='grid gap-2 text-xs md:grid-cols-2'>
          <KV k='源码目录' v={info.source_project} mono />
          <KV k='Python 可执行' v={info.python_path} mono />
          <KV k='Runtime' v={info.runtime_dir} mono />
          <KV k='Tasks 目录' v={info.tasks_dir} mono />
          <KV k='WebUI 目录' v={info.webui_dir} mono />
          <KV k='SQLite' v={info.db_path} mono />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className='pb-3'>
          <CardTitle className='text-sm'>存储占用</CardTitle>
        </CardHeader>
        <CardContent className='grid gap-2 text-xs md:grid-cols-2'>
          <KV k='数据库' v={toMB(info.db_size_bytes)} />
          <KV k='任务目录' v={toMB(info.tasks_size_bytes)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className='pb-3'>
          <CardTitle className='text-sm'>数据统计</CardTitle>
        </CardHeader>
        <CardContent className='grid gap-2 text-xs md:grid-cols-3'>
          <KV k='任务' v={info.counts.tasks} />
          <KV k='注册事件' v={info.counts.events} />
          <KV k='账号' v={info.counts.accounts} />
          <KV k='代理' v={info.counts.proxies} />
          <KV k='邮箱 Provider' v={info.counts.mailboxes} />
          <KV k='最大并发' v={info.max_concurrent_tasks} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className='pb-3'>
          <CardTitle className='text-sm'>认证</CardTitle>
        </CardHeader>
        <CardContent className='text-xs'>
          <KV
            k='认证状态'
            v={info.auth_required ? '已启用密码' : '无密码（开放）'}
          />
        </CardContent>
      </Card>
    </>
  )
}

// ============== 小组件 ==============

function MiniStat({
  label,
  value,
  accent,
}: {
  label: string
  value: number | string
  accent?: 'emerald' | 'amber' | 'red'
}) {
  const color =
    accent === 'emerald'
      ? 'text-emerald-600 dark:text-emerald-400'
      : accent === 'amber'
        ? 'text-amber-600 dark:text-amber-400'
        : accent === 'red'
          ? 'text-red-600 dark:text-red-400'
          : 'text-foreground'
  return (
    <Card>
      <CardContent className='py-3'>
        <div className='text-muted-foreground mb-0.5 text-[10px] tracking-wider uppercase'>
          {label}
        </div>
        <div className={cn('text-lg font-bold', color)}>{value}</div>
      </CardContent>
    </Card>
  )
}

function KV({
  k,
  v,
  mono,
}: {
  k: string
  v: string | number
  mono?: boolean
}) {
  return (
    <div className='flex items-start justify-between gap-3 py-1'>
      <span className='text-muted-foreground shrink-0'>{k}</span>
      <span
        className={cn(
          'text-right break-all',
          mono && 'font-mono text-[11px]'
        )}
      >
        {v}
      </span>
    </div>
  )
}

function NumField({
  id,
  label,
  hint,
  min,
  max,
  value,
  onChange,
}: {
  id: string
  label: string
  hint?: string
  min: number
  max: number
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div className='space-y-2'>
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type='number'
        min={min}
        max={max}
        value={value}
        onChange={(e) => {
          const n = parseInt(e.target.value)
          onChange(Math.max(min, Math.min(max, isNaN(n) ? min : n)))
        }}
      />
      {hint && <p className='text-muted-foreground text-xs'>{hint}</p>}
    </div>
  )
}

function GotoCard({
  to,
  icon: Icon,
  title,
  desc,
}: {
  to: string
  icon: React.ElementType
  title: string
  desc: string
}) {
  return (
    <Link
      to={to}
      className='group hover:border-primary/60 hover:bg-primary/5 flex items-center justify-between rounded-lg border bg-card p-4 transition-colors'
    >
      <div className='flex items-center gap-3'>
        <div className='bg-primary/10 flex size-9 items-center justify-center rounded-md'>
          <Icon className='text-primary size-4' />
        </div>
        <div>
          <div className='text-sm font-semibold'>{title}</div>
          <div className='text-muted-foreground text-xs'>{desc}</div>
        </div>
      </div>
      <ExternalLink size={14} className='text-muted-foreground' />
    </Link>
  )
}

function CleanupBtn({
  label,
  hint,
  danger,
  loading,
  onClick,
}: {
  label: string
  hint: string
  danger?: boolean
  loading: boolean
  onClick: () => void
}) {
  return (
    <button
      type='button'
      onClick={onClick}
      disabled={loading}
      className={cn(
        'flex items-start gap-3 rounded-lg border p-3 text-left transition-colors',
        'disabled:opacity-50',
        danger
          ? 'border-red-300 bg-red-50 hover:border-red-500 dark:border-red-500/40 dark:bg-red-900/10'
          : 'hover:border-primary/40 hover:bg-muted/40'
      )}
    >
      {loading ? (
        <RefreshCw className='mt-0.5 size-4 shrink-0 animate-spin text-primary' />
      ) : danger ? (
        <Trash2 className='mt-0.5 size-4 shrink-0 text-red-600' />
      ) : (
        <CheckCircle2 className='mt-0.5 size-4 shrink-0 text-emerald-500' />
      )}
      <div className='space-y-0.5'>
        <div className='text-sm font-medium'>{label}</div>
        <div className='text-muted-foreground text-xs'>{hint}</div>
      </div>
    </button>
  )
}

export const Route = createFileRoute('/_authenticated/settings/')({
  component: SettingsPage,
})
