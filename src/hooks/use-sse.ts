/**
 * useEventSource hook - SSE 实时事件订阅
 * Requirement: Task 9.3 - 自动断线重连 + 环形缓冲
 */
import { useEffect, useRef, useState, useCallback } from 'react'

export interface SSEEvent {
  id?: string
  type: string
  data: string
  timestamp: number
}

interface UseEventSourceOptions {
  /** 环形缓冲区最大容量，默认 2000 */
  maxEvents?: number
  /** 重连延迟（毫秒），默认 3000 */
  reconnectDelay?: number
  /** 最大重连次数，默认 10 */
  maxRetries?: number
}

interface UseEventSourceReturn {
  events: SSEEvent[]
  isConnected: boolean
  error: string | null
  clear: () => void
}

export function useEventSource(
  url: string | null,
  options: UseEventSourceOptions = {}
): UseEventSourceReturn {
  const {
    maxEvents = 2000,
    reconnectDelay = 3000,
    maxRetries = 10,
  } = options

  const [events, setEvents] = useState<SSEEvent[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const esRef = useRef<EventSource | null>(null)
  const retriesRef = useRef(0)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clear = useCallback(() => {
    setEvents([])
  }, [])

  useEffect(() => {
    if (!url) {
      // 清理旧连接
      if (esRef.current) {
        esRef.current.close()
        esRef.current = null
      }
      setIsConnected(false)
      setError(null)
      return
    }

    function connect() {
      try {
        const es = new EventSource(url!)
        esRef.current = es

        es.onopen = () => {
          setIsConnected(true)
          setError(null)
          retriesRef.current = 0
        }

        es.onmessage = (ev) => {
          const event: SSEEvent = {
            id: ev.lastEventId || undefined,
            type: ev.type,
            data: ev.data,
            timestamp: Date.now(),
          }
          setEvents((prev) => {
            // 环形缓冲：超出容量时截断前面的
            const next = prev.length >= maxEvents
              ? [...prev.slice(-(maxEvents - 100)), event]
              : [...prev, event]
            return next
          })
        }

        es.addEventListener('done', () => {
          es.close()
          setIsConnected(false)
        })

        es.onerror = () => {
          es.close()
          esRef.current = null
          setIsConnected(false)

          if (retriesRef.current < maxRetries) {
            retriesRef.current++
            setError(`连接断开，${reconnectDelay / 1000}s 后重连 (${retriesRef.current}/${maxRetries})`)
            reconnectTimerRef.current = setTimeout(connect, reconnectDelay)
          } else {
            setError('连接失败，已达最大重连次数')
          }
        }
      } catch (e) {
        setError('EventSource 创建失败')
        setIsConnected(false)
      }
    }

    connect()

    return () => {
      if (esRef.current) {
        esRef.current.close()
        esRef.current = null
      }
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current)
        reconnectTimerRef.current = null
      }
      setIsConnected(false)
    }
  }, [url, maxEvents, reconnectDelay, maxRetries])

  return { events, isConnected, error, clear }
}
