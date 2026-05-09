import { useEffect, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
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
} from 'lucide-react'
import { toast } from 'sonner'
import { useGrokStore } from '@/stores/grok-store'
import type { SystemSettings } from '@/lib/grok-api'
import { cn } from '@/lib/utils'
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
}

type ExecutorKey = 'headless' | 'headed' | 'protocol'

const EXECUTOR_OPTIONS: {
  key: ExecutorKey
  icon: typeof Zap
  title: string
  desc: string
  hint: string
  accent: string
}[] = [
  {
    key: 'headless',
    icon: EyeOff,
    title: '无头浏览器',
    desc: '生产默认：--headless=new，资源最省',
    hint: '推荐生产使用',
    accent: 'border-sky-500/60 bg-sky-50 dark:border-sky-500/30 dark:bg-sky-900/10',
  },
  {
    key: 'headed',
    icon: Eye,
    title: '有头浏览器',
    desc: '通过 Xvfb + noVNC 可观察浏览器，反检测更佳',
    hint: '调试 / 反爬拦截排查',
    accent: 'border-amber-400/60 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-900/10',
  },
  {
    key: 'protocol',
    icon: Zap,
    title: '纯协议（实验）',
    desc: '直接 HTTP 请求，无浏览器。需要配置 Turnstile 远程 solver',
    hint: '当前为占位，按需后续接入',
    accent:
      'border-violet-400/60 bg-violet-50 dark:border-violet-500/30 dark:bg-violet-900/10',
  },
]

function SettingsPage() {
  const { settings, defaults, loadingSettings, fetchSettings, saveSettings } =
    useGrokStore()
  const [form, setForm] = useState<SystemSettings>(EMPTY_SETTINGS)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  useEffect(() => {
    const defaultsNormalized: Partial<SystemSettings> = (() => {
      const d = defaults as Record<string, unknown>
      const api = (d?.api as Record<string, unknown>) || {}
      return {
        proxy: typeof d?.proxy === 'string' ? d.proxy : '',
        browser_proxy:
          typeof d?.browser_proxy === 'string' ? d.browser_proxy : '',
        temp_mail_api_base:
          typeof d?.temp_mail_api_base === 'string' ? d.temp_mail_api_base : '',
        temp_mail_admin_password:
          typeof d?.temp_mail_admin_password === 'string'
            ? d.temp_mail_admin_password
            : '',
        temp_mail_domain:
          typeof d?.temp_mail_domain === 'string' ? d.temp_mail_domain : '',
        temp_mail_site_password:
          typeof d?.temp_mail_site_password === 'string'
            ? d.temp_mail_site_password
            : '',
        api_endpoint: typeof api?.endpoint === 'string' ? api.endpoint : '',
        api_token: typeof api?.token === 'string' ? api.token : '',
        api_append: typeof api?.append === 'boolean' ? api.append : true,
        debug_mode: typeof d?.debug_mode === 'boolean' ? d.debug_mode : false,
        executor: typeof d?.executor === 'string' ? d.executor : 'headless',
        lifecycle_enabled:
          typeof d?.lifecycle_enabled === 'boolean' ? d.lifecycle_enabled : false,
        lifecycle_check_hours:
          typeof d?.lifecycle_check_hours === 'number'
            ? d.lifecycle_check_hours
            : 6,
      }
    })()

    setForm({
      ...EMPTY_SETTINGS,
      ...defaultsNormalized,
      ...(settings || {}),
    })
  }, [settings, defaults])

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

  const update = <K extends keyof SystemSettings>(
    key: K,
    value: SystemSettings[K]
  ) => setForm((prev) => ({ ...prev, [key]: value }))

  return (
    <div className='space-y-6 p-6'>
      {/* 标题 */}
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-3'>
          <SettingsIcon className='text-primary size-6' />
          <div>
            <h1 className='text-2xl font-bold'>系统配置</h1>
            <p className='text-muted-foreground mt-0.5 text-sm'>
              配置代理、临时邮箱、Token 推送、执行器与账号生命周期
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

      <div className='grid gap-4 lg:grid-cols-2'>
        {/* 代理 */}
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2.5 text-base'>
              <Globe className='text-primary size-5' />
              代理配置
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-5'>
            <div className='space-y-2'>
              <Label htmlFor='browser_proxy'>浏览器代理</Label>
              <Input
                id='browser_proxy'
                placeholder='socks5://warp:1080'
                value={form.browser_proxy}
                onChange={(e) => update('browser_proxy', e.target.value)}
              />
              <p className='text-muted-foreground text-xs'>
                浏览器访问 x.ai 时走的代理；如果代理池有启用项，会被代理池挑选结果覆盖
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
                邮箱 API 等普通 HTTP 请求走的代理
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 临时邮箱 */}
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2.5 text-base'>
              <Mail className='text-primary size-5' />
              临时邮箱配置
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-5'>
            <div className='space-y-2'>
              <Label htmlFor='temp_mail_api_base'>邮箱 API Base</Label>
              <Input
                id='temp_mail_api_base'
                placeholder='https://mail.nnioj.com'
                value={form.temp_mail_api_base}
                onChange={(e) => update('temp_mail_api_base', e.target.value)}
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='temp_mail_admin_password'>
                邮箱管理口令 / API Key
              </Label>
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
            <div className='space-y-2'>
              <Label htmlFor='temp_mail_site_password'>站点密码</Label>
              <Input
                id='temp_mail_site_password'
                placeholder='可选'
                value={form.temp_mail_site_password}
                onChange={(e) =>
                  update('temp_mail_site_password', e.target.value)
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Token 推送（跨两列） */}
        <Card className='lg:col-span-2'>
          <CardHeader>
            <CardTitle className='flex items-center gap-2.5 text-base'>
              <Key className='text-primary size-5' />
              Token 推送配置
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-5'>
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
                <Label htmlFor='api_token'>API Token</Label>
                <Input
                  id='api_token'
                  placeholder='管理口令'
                  value={form.api_token}
                  onChange={(e) => update('api_token', e.target.value)}
                />
              </div>
            </div>
            <label
              htmlFor='api_append'
              className={cn(
                'flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors',
                form.api_append
                  ? 'border-primary bg-primary/5'
                  : 'bg-muted/30'
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

        {/* 执行器（跨两列） */}
        <Card className='lg:col-span-2'>
          <CardHeader>
            <CardTitle className='flex items-center gap-2.5 text-base'>
              <Cpu className='text-primary size-5' />
              执行器 / 运行模式
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='grid gap-3 md:grid-cols-3'>
              {EXECUTOR_OPTIONS.map((opt) => {
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
                        // headed 会隐式开启调试模式，headless/protocol 关闭
                        update('debug_mode', opt.key === 'headed')
                      }}
                    />
                    <div className='flex items-center justify-between'>
                      <div className='flex items-center gap-2'>
                        <Icon className='text-primary size-4' />
                        <span className='text-sm font-semibold'>
                          {opt.title}
                        </span>
                      </div>
                      {selected && (
                        <span className='bg-primary/20 text-primary rounded px-1.5 py-0.5 text-[10px] font-medium'>
                          已选
                        </span>
                      )}
                    </div>
                    <p className='text-muted-foreground text-xs leading-relaxed'>
                      {opt.desc}
                    </p>
                    <div className='text-muted-foreground text-[10px]'>
                      {opt.hint}
                    </div>
                  </label>
                )
              })}
            </div>
            <p className='text-muted-foreground mt-4 text-xs'>
              💡 选择"有头浏览器"后，启动任务时可以在侧边栏的
              <span className='font-medium'>可视化调试（noVNC）</span>
              页实时看到浏览器窗口。
            </p>
          </CardContent>
        </Card>

        {/* 生命周期（跨两列） */}
        <Card className='lg:col-span-2'>
          <CardHeader>
            <CardTitle className='flex items-center gap-2.5 text-base'>
              <Clock className='text-primary size-5' />
              账号生命周期
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-4'>
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
                    定时检测账号 / Token 有效性
                  </span>
                  {form.lifecycle_enabled && (
                    <span className='rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-300'>
                      已启用
                    </span>
                  )}
                </div>
                <p className='text-muted-foreground text-xs leading-relaxed'>
                  开启后，系统会按下方间隔周期性调用"Token 推送接口"做可达性检测。
                  失败时可以在"统计分析"页看到错误聚合。
                </p>
              </div>
              <Switch
                checked={form.lifecycle_enabled}
                onCheckedChange={(v: boolean) => update('lifecycle_enabled', v)}
              />
            </div>
            <div className='flex items-center gap-3'>
              <Label htmlFor='lifecycle-hours' className='shrink-0 text-sm'>
                检测间隔（小时）
              </Label>
              <Input
                id='lifecycle-hours'
                type='number'
                min={1}
                max={168}
                className='max-w-[120px]'
                value={form.lifecycle_check_hours}
                onChange={(e) =>
                  update(
                    'lifecycle_check_hours',
                    Math.max(1, Math.min(168, parseInt(e.target.value) || 6))
                  )
                }
              />
              <span className='text-muted-foreground text-xs'>
                推荐 6 小时；最小 1 小时，最大 168 小时
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export const Route = createFileRoute('/_authenticated/settings/')({
  component: SettingsPage,
})
