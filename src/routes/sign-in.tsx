import { useState, useEffect } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Lock, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import grokApi from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

function SignInPage() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [authRequired, setAuthRequired] = useState<boolean | null>(null)

  // 启动时先检查后端是否要求认证
  useEffect(() => {
    grokApi
      .get('/auth/status')
      .then((res) => {
        const data = res.data as {
          auth_required: boolean
          authenticated: boolean
        }
        if (!data.auth_required || data.authenticated) {
          // 后端未启用密码 或 已认证，直接进仪表盘
          navigate({ to: '/dashboard' })
          return
        }
        setAuthRequired(true)
      })
      .catch(() => setAuthRequired(true))
  }, [navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password.trim()) {
      toast.error('请输入控制台密码')
      return
    }
    setLoading(true)
    try {
      await grokApi.post('/login', { password: password.trim() })
      localStorage.setItem('console_password', password.trim())
      toast.success('登录成功')
      navigate({ to: '/dashboard' })
    } catch {
      toast.error('密码错误')
    } finally {
      setLoading(false)
    }
  }

  if (authRequired === null) {
    return (
      <div className='flex min-h-screen items-center justify-center'>
        <Loader2 className='size-6 animate-spin' />
      </div>
    )
  }

  return (
    <div className='bg-muted/30 flex min-h-screen items-center justify-center p-4'>
      <Card className='w-full max-w-sm'>
        <CardContent className='p-8'>
          <div className='mb-8 flex flex-col items-center text-center'>
            <div className='bg-primary mb-4 flex size-14 items-center justify-center rounded-xl shadow-sm'>
              <Lock className='size-7 text-white' />
            </div>
            <h1 className='text-xl font-bold'>Grok Register</h1>
            <p className='text-muted-foreground mt-1 text-sm'>
              请输入控制台访问密码
            </p>
          </div>

          <form onSubmit={handleSubmit} className='space-y-4'>
            <div className='space-y-2'>
              <Label htmlFor='password'>控制台密码</Label>
              <Input
                id='password'
                type='password'
                autoFocus
                autoComplete='current-password'
                placeholder='请输入密码'
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>
            <Button type='submit' className='w-full' disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className='size-4 animate-spin' />
                  登录中...
                </>
              ) : (
                <>
                  <Lock className='size-4' />
                  进入控制台
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export const Route = createFileRoute('/sign-in')({
  component: SignInPage,
})
