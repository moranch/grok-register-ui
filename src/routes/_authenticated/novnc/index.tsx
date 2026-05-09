import { useEffect, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import {
  Monitor,
  ExternalLink,
  Maximize2,
  Info,
  AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

function NoVncPage() {
  // noVNC 端口是 6080（docker-compose 里映射），host 用当前页面的 host
  // 使用相对协议让 http/https 都能工作
  const [port, setPort] = useState(() =>
    typeof window !== 'undefined'
      ? localStorage.getItem('grok_novnc_port') || '6080'
      : '6080'
  )
  const [autoconnect, setAutoconnect] = useState(true)

  const host =
    typeof window !== 'undefined' ? window.location.hostname : 'localhost'
  const vncUrl = `http://${host}:${port}/vnc.html?autoconnect=${
    autoconnect ? '1' : '0'
  }&resize=scale`
  const vncLiteUrl = `http://${host}:${port}/vnc_lite.html?autoconnect=${
    autoconnect ? '1' : '0'
  }&resize=scale`

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('grok_novnc_port', port)
    }
  }, [port])

  const openExternal = () => {
    window.open(vncUrl, '_blank', 'noopener')
  }

  return (
    <div className='space-y-6 p-6'>
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-3'>
          <Monitor className='text-primary size-6' />
          <div>
            <h1 className='text-2xl font-bold'>可视化调试（noVNC）</h1>
            <p className='text-muted-foreground mt-0.5 text-sm'>
              实时观察调试模式下的浏览器窗口，排查 Turnstile / 反爬拦截
            </p>
          </div>
        </div>
        <div className='flex items-center gap-2'>
          <Button variant='outline' size='sm' onClick={openExternal}>
            <ExternalLink size={16} />
            新窗口打开
          </Button>
          <Button
            variant='outline'
            size='sm'
            onClick={() => {
              const el = document.getElementById('novnc-frame')
              if (el) el.requestFullscreen?.()
            }}
          >
            <Maximize2 size={16} />
            全屏
          </Button>
        </div>
      </div>

      {/* 控制栏 */}
      <Card>
        <CardHeader className='pb-2'>
          <CardTitle className='text-base'>连接配置</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='flex flex-wrap items-center gap-4'>
            <div className='flex items-center gap-2'>
              <label htmlFor='novnc-port' className='text-sm font-medium'>
                noVNC 端口
              </label>
              <input
                id='novnc-port'
                className='bg-background h-9 w-24 rounded-md border px-2 text-sm'
                value={port}
                onChange={(e) => setPort(e.target.value.replace(/\D/g, ''))}
              />
            </div>
            <label className='flex cursor-pointer items-center gap-2 text-sm'>
              <input
                type='checkbox'
                checked={autoconnect}
                onChange={(e) => setAutoconnect(e.target.checked)}
              />
              自动连接
            </label>
            <div className='text-muted-foreground ml-auto flex items-center gap-1.5 text-xs'>
              <Info size={14} />
              使用 host: <code className='mx-1'>{host}</code>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 嵌入式 VNC */}
      <Card>
        <CardHeader className='pb-2'>
          <CardTitle className='text-base'>实时浏览器视图</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='overflow-hidden rounded-lg border bg-black'>
            <iframe
              id='novnc-frame'
              title='noVNC'
              src={vncLiteUrl}
              className='h-[720px] w-full'
              allow='clipboard-read; clipboard-write; fullscreen'
            />
          </div>
        </CardContent>
      </Card>

      {/* 说明 */}
      <Card>
        <CardContent className='space-y-3 py-4'>
          <div className='flex items-start gap-3 text-sm'>
            <Info className='mt-0.5 size-4 shrink-0 text-sky-500' />
            <div className='space-y-1'>
              <div className='font-medium'>使用前提</div>
              <ol className='text-muted-foreground list-decimal space-y-1 pl-5 text-xs leading-relaxed'>
                <li>
                  容器启动时
                  <code className='mx-1 rounded bg-muted px-1 py-0.5'>
                    GROK_ENABLE_NOVNC=1
                  </code>
                  （默认开启），入口脚本会拉起 Xvfb :99 + x11vnc + noVNC 6080
                </li>
                <li>
                  在"系统配置 → 运行模式"或"新建任务"里启用
                  <span className='font-medium'>调试模式</span>（有头浏览器）
                </li>
                <li>
                  docker-compose 里要把
                  <code className='mx-1 rounded bg-muted px-1 py-0.5'>
                    6080:6080
                  </code>
                  端口映射出去
                </li>
              </ol>
            </div>
          </div>
          <div className='flex items-start gap-3 text-sm'>
            <AlertCircle className='mt-0.5 size-4 shrink-0 text-amber-500' />
            <div className='space-y-1'>
              <div className='font-medium'>看不到画面？</div>
              <p className='text-muted-foreground text-xs leading-relaxed'>
                - 先新建一个<span className='font-medium'>调试模式</span>
                的注册任务，浏览器会渲染到
                <code className='mx-1 rounded bg-muted px-1 py-0.5'>
                  DISPLAY=:99
                </code>
                ，只有任务启动时你才会看到内容
                <br />- 如果显示"连接被拒绝"，检查服务器 6080 端口防火墙 /
                安全组是否放行
                <br />- 浏览器右上角会有连接状态指示灯，绿色=已连接
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export const Route = createFileRoute('/_authenticated/novnc/')({
  component: NoVncPage,
})
