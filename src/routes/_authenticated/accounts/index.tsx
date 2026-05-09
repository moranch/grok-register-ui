import { useEffect, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import {
  Users,
  RefreshCw,
  Download,
  FileJson,
  FileText,
  FileSpreadsheet,
} from 'lucide-react'
import { useGrokStore } from '@/stores/grok-store'
import { accountApi } from '@/lib/grok-api'
import { formatBackendTime } from '@/lib/grok-time'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

function AccountsPage() {
  const { accounts, loadingAccounts, fetchAccounts } = useGrokStore()
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetchAccounts(1000)
  }, [fetchAccounts])

  const filtered = accounts.filter((a) => {
    const q = search.trim().toLowerCase()
    if (!q) return true
    return (
      a.email.toLowerCase().includes(q) ||
      a.sso.toLowerCase().includes(q) ||
      (a.proxy_url || '').toLowerCase().includes(q)
    )
  })

  const openExport = (fmt: 'json' | 'csv' | 'sso') => {
    const pw = localStorage.getItem('console_password') || ''
    // 导出接口需要 Authorization；由于 a 标签下载无法带自定义 header，
    // 采用 fetch + blob 的方式
    fetch(accountApi.exportUrl(fmt), {
      headers: pw ? { Authorization: `Bearer ${pw}` } : undefined,
    })
      .then((r) => r.blob().then((blob) => ({ blob, r })))
      .then(({ blob, r }) => {
        const cd = r.headers.get('content-disposition') || ''
        const m = cd.match(/filename="?([^";]+)"?/i)
        const filename = m ? m[1] : `grok-accounts.${fmt}`
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        a.click()
        URL.revokeObjectURL(url)
      })
      .catch(() => {
        alert('导出失败')
      })
  }

  return (
    <div className='space-y-6 p-6'>
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-3'>
          <Users className='text-primary size-6' />
          <div>
            <h1 className='text-2xl font-bold'>账号管理</h1>
            <p className='text-muted-foreground mt-0.5 text-sm'>
              全部注册成功的账号，支持导出 JSON / CSV / 纯 SSO 列表
            </p>
          </div>
        </div>
        <div className='flex items-center gap-2'>
          <Button
            variant='outline'
            size='sm'
            onClick={() => fetchAccounts(1000)}
            disabled={loadingAccounts}
          >
            <RefreshCw
              size={16}
              className={loadingAccounts ? 'animate-spin' : ''}
            />
            刷新
          </Button>
          <Button variant='outline' size='sm' onClick={() => openExport('json')}>
            <FileJson size={16} />
            JSON
          </Button>
          <Button variant='outline' size='sm' onClick={() => openExport('csv')}>
            <FileSpreadsheet size={16} />
            CSV
          </Button>
          <Button size='sm' onClick={() => openExport('sso')}>
            <Download size={16} />
            SSO 列表
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className='flex-row items-center justify-between'>
          <CardTitle className='text-base'>
            账号列表
            <span className='text-muted-foreground ml-2 text-xs font-normal'>
              共 {accounts.length} 个，过滤后 {filtered.length} 个
            </span>
          </CardTitle>
          <Input
            placeholder='按邮箱 / SSO / 代理 搜索'
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className='max-w-[280px]'
          />
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className='text-muted-foreground py-10 text-center text-sm'>
              <FileText className='mx-auto mb-3 size-10 opacity-30' />
              {accounts.length === 0 ? '暂无账号' : '没有匹配的账号'}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>邮箱</TableHead>
                  <TableHead>SSO Token</TableHead>
                  <TableHead>任务</TableHead>
                  <TableHead>代理</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>创建时间</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.slice(0, 500).map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className='font-mono text-xs'>
                      #{a.id}
                    </TableCell>
                    <TableCell className='max-w-[200px] truncate text-sm'>
                      {a.email || '-'}
                    </TableCell>
                    <TableCell className='max-w-[240px] truncate font-mono text-xs'>
                      {a.sso}
                    </TableCell>
                    <TableCell className='text-muted-foreground text-xs'>
                      {a.task_id ? `#${a.task_id}` : '-'}
                    </TableCell>
                    <TableCell className='max-w-[200px] truncate font-mono text-xs'>
                      {a.proxy_url || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          a.status === 'active' ? 'default' : 'secondary'
                        }
                      >
                        {a.status}
                      </Badge>
                    </TableCell>
                    <TableCell className='text-muted-foreground text-xs'>
                      {formatBackendTime(a.created_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {filtered.length > 500 && (
            <div className='text-muted-foreground mt-3 text-center text-xs'>
              仅显示前 500 条，导出可拿全部
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export const Route = createFileRoute('/_authenticated/accounts/')({
  component: AccountsPage,
})
