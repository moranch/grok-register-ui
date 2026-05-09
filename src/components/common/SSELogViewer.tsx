/**
 * SSE 实时日志查看器
 * Requirement: Task 9.2 - 公共组件，使用 EventSource 订阅显示滚动日志列表
 */
import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { useEventSource, type SSEEvent } from '@/hooks/use-sse'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'

interface SSELogViewerProps {
  /** SSE 流 URL，传 null 则不连接 */
  url: string | null
  /** 收到事件时的回调 */
  onEvent?: (event: SSEEvent) => void
  /** 自定义高度，默认 400px */
  height?: string
  /** 自定义类名 */
  className?: string
}

export function SSELogViewer({ url, onEvent, height = '400px', className }: SSELogViewerProps) {
  const { events, isConnected, error, clear } = useEventSource(url)
  const [autoScroll, setAutoScroll] = useState(true)
  const logEndRef = useRef<HTMLDivElement>(null)

  // 回调通知
  useEffect(() => {
    if (onEvent && events.length > 0) {
      onEvent(events[events.length - 1])
    }
  }, [events.length, onEvent])

  // 自动滚动
  useEffect(() => {
    if (autoScroll) {
      logEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }
  }, [events.length, autoScroll])

  return (
    <div className={cn('space-y-2', className)}>
      {/* 工具栏 */}
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-2'>
          <span className='text-muted-foreground text-xs'>{events.length} 行</span>
          {isConnected ? (
            <Badge variant='default' className='gap-1 text-[10px]'>
              <span className='size-1.5 animate-pulse rounded-full bg-emerald-400' />
              已连接
            </Badge>
          ) : (
            <Badge variant='secondary' className='text-[10px]'>
              未连接
            </Badge>
          )}
          {error && (
            <span className='text-xs text-red-500'>{error}</span>
          )}
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
          <Button variant='outline' size='sm' className='h-6 text-xs' onClick={clear}>
            清空
          </Button>
        </div>
      </div>

      {/* 日志区域 */}
      <ScrollArea className='rounded-lg bg-[#1a1a2e]' style={{ height }}>
        <div className='p-4 font-mono text-xs leading-relaxed text-[#a0a0b0]'>
          {events.length === 0 ? (
            <div className='py-10 text-center text-[#6a6a7a]'>
              {url ? '等待日志...' : '未连接'}
            </div>
          ) : (
            events.map((event, i) => {
              let line: string
              try {
                const parsed = JSON.parse(event.data)
                line = parsed.line || parsed.message || event.data
              } catch {
                line = event.data
              }
              return (
                <div
                  key={i}
                  className={cn(
                    'rounded px-1 py-0.5 break-all whitespace-pre-wrap hover:bg-white/5',
                    getLogClass(line)
                  )}
                >
                  {line}
                </div>
              )
            })
          )}
          <div ref={logEndRef} />
        </div>
      </ScrollArea>
    </div>
  )
}

/** 根据日志内容返回颜色类名 */
function getLogClass(line: string): string {
  if (line.includes('成功') || line.toLowerCase().includes('success')) return 'text-green-400'
  if (line.includes('错误') || line.includes('失败') || line.includes('[Error]')) return 'text-red-400'
  if (line.includes('[*]') || line.includes('INFO')) return 'text-blue-400'
  if (line.includes('WARN') || line.includes('警告')) return 'text-amber-400'
  return ''
}
