import { useNavigate, useRouter } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

type GeneralErrorProps = React.HTMLAttributes<HTMLDivElement> & {
  minimal?: boolean
}

export function GeneralError({
  className,
  minimal = false,
}: GeneralErrorProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { history } = useRouter()

  const reload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload()
    }
  }

  return (
    <div className={cn('h-svh w-full', className)}>
      <div className='m-auto flex h-full w-full flex-col items-center justify-center gap-3 px-6'>
        {!minimal && (
          <h1 className='text-[5rem] leading-tight font-bold'>500</h1>
        )}
        <span className='font-medium'>
          {t('页面出错了')} {`:')`}
        </span>
        <div className='text-muted-foreground max-w-md space-y-1 text-center text-sm'>
          <p>{t('常见原因：浏览器翻译插件 / 扩展修改了页面 DOM。')}</p>
          <p className='text-xs'>
            {t('请尝试关闭 Chrome 中文翻译、Grammarly、Dark Reader 等扩展，然后刷新。')}
          </p>
        </div>
        {!minimal && (
          <div className='mt-4 flex flex-wrap justify-center gap-2'>
            <Button variant='outline' size='sm' onClick={() => history.go(-1)}>
              {t('返回')}
            </Button>
            <Button size='sm' onClick={reload}>
              {t('刷新页面')}
            </Button>
            <Button
              variant='ghost'
              size='sm'
              onClick={() => navigate({ to: '/dashboard' })}
            >
              {t('回到仪表盘')}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
