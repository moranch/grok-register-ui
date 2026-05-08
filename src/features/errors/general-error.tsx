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
      <div className='m-auto flex h-full w-full flex-col items-center justify-center gap-2'>
        {!minimal && (
          <h1 className='text-[7rem] leading-tight font-bold'>500</h1>
        )}
        <span className='font-medium'>
          {t('页面出错了')} {`:')`}
        </span>
        <p className='text-muted-foreground text-center'>
          {t('页面渲染异常，常见原因：浏览器翻译插件或扩展改动了 DOM。')}
          <br />
          {t('建议：关闭中文翻译后刷新页面。')}
        </p>
        {!minimal && (
          <div className='mt-6 flex flex-wrap justify-center gap-4'>
            <Button variant='outline' onClick={() => history.go(-1)}>
              {t('返回')}
            </Button>
            <Button variant='outline' onClick={reload}>
              {t('刷新')}
            </Button>
            <Button onClick={() => navigate({ to: '/' })}>
              {t('回到首页')}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
