/**
 * Exporter 推送状态徽章
 * Requirement: Task 9.2 - 公共组件
 */
import { CheckCircle2, XCircle, MinusCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

type ExporterStatusType = 'pushed' | 'failed' | 'not_configured'

interface ExporterStatusBadgeProps {
  status: ExporterStatusType
}

const STATUS_CONFIG: Record<
  ExporterStatusType,
  {
    label: string
    variant: 'default' | 'destructive' | 'secondary'
    icon: typeof CheckCircle2
  }
> = {
  pushed: {
    label: '已推送',
    variant: 'default',
    icon: CheckCircle2,
  },
  failed: {
    label: '推送失败',
    variant: 'destructive',
    icon: XCircle,
  },
  not_configured: {
    label: '未配置',
    variant: 'secondary',
    icon: MinusCircle,
  },
}

export function ExporterStatusBadge({ status }: ExporterStatusBadgeProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.not_configured
  const Icon = config.icon

  return (
    <Badge variant={config.variant} className='gap-1'>
      <Icon size={12} />
      {config.label}
    </Badge>
  )
}
