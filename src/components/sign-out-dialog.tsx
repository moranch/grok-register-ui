import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/confirm-dialog'

interface SignOutDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SignOutDialog({ open, onOpenChange }: SignOutDialogProps) {
  const { t } = useTranslation()

  const handleSignOut = () => {
    try {
      localStorage.removeItem('console_password')
      localStorage.removeItem('user')
    } catch {
      /* empty */
    }
    toast.success(t('已登出'))
    // 回到登录页（整页刷新清除所有内存状态）
    if (typeof window !== 'undefined') {
      window.location.href = '/sign-in'
    }
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('登出控制台')}
      desc={t('确定要登出吗？登出后需要重新输入密码才能访问。')}
      confirmText={t('登出')}
      handleConfirm={handleSignOut}
      className='sm:max-w-sm'
    />
  )
}
