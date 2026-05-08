import { useEffect, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import {
  Save,
  RefreshCw,
  Settings as SettingsIcon,
  Globe,
  Mail,
  Key,
} from 'lucide-react'
import { toast } from 'sonner'
import { useGrokStore } from '@/stores/grok-store'
import type { SystemSettings } from '@/lib/grok-api'
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
}

function SettingsPage() {
  const { settings, defaults, loadingSettings, fetchSettings, saveSettings } =
    useGrokStore()
  const [form, setForm] = useState<SystemSettings>(EMPTY_SETTINGS)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  useEffect(() => {
    // 将后端 defaults（config.json + .env 里的默认值）与用户保存的 settings 合并：
    //   1. EMPTY_SETTINGS 保证每个字段都有值（防止 undefined 触发 React 警告）
    //   2. defaults 是后端的初始配置，用户没保存过时显示它
    //   3. settings 是用户保存后存在 DB 里的最终值，优先级最高
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
              配置代理、临时邮箱和 Token 推送接口
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

      {/* 2 列网格 + 1 跨列卡片（对齐原备份布局） */}
      <div className='grid gap-4 lg:grid-cols-2'>
        {/* 左上：代理配置 */}
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
                浏览器访问 x.ai 时走的代理
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

        {/* 右上：临时邮箱配置 */}
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

        {/* 下方跨两列：Token 推送 */}
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
              className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                form.api_append
                  ? 'border-primary bg-primary/5'
                  : 'bg-muted/30'
              }`}
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
      </div>
    </div>
  )
}

export const Route = createFileRoute('/_authenticated/settings/')({
  component: SettingsPage,
})
