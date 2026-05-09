/**
 * JSON Schema 驱动的动态表单
 * Requirement: Task 9.2 - 支持 string / number / boolean / array / object 类型
 */
import { useCallback } from 'react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Plus, Trash2 } from 'lucide-react'

interface SchemaProperty {
  type: string
  title?: string
  description?: string
  default?: any
  enum?: any[]
  items?: SchemaProperty
  properties?: Record<string, SchemaProperty>
  required?: string[]
}

interface SchemaFormProps {
  /** JSON Schema 定义 */
  schema: {
    type?: string
    properties?: Record<string, SchemaProperty>
    required?: string[]
  }
  /** 当前值 */
  value: Record<string, any>
  /** 值变更回调 */
  onChange: (value: Record<string, any>) => void
  /** 自定义类名 */
  className?: string
}

export function SchemaForm({ schema, value, onChange, className }: SchemaFormProps) {
  const properties = schema.properties || {}
  const required = schema.required || []

  const handleFieldChange = useCallback(
    (key: string, fieldValue: any) => {
      onChange({ ...value, [key]: fieldValue })
    },
    [value, onChange]
  )

  return (
    <div className={cn('space-y-4', className)}>
      {Object.entries(properties).map(([key, prop]) => (
        <SchemaField
          key={key}
          name={key}
          schema={prop}
          value={value[key] ?? prop.default}
          required={required.includes(key)}
          onChange={(v) => handleFieldChange(key, v)}
        />
      ))}
    </div>
  )
}

/** 单个字段渲染 */
function SchemaField({
  name,
  schema,
  value,
  required,
  onChange,
}: {
  name: string
  schema: SchemaProperty
  value: any
  required: boolean
  onChange: (v: any) => void
}) {
  const label = schema.title || name
  const description = schema.description

  // 枚举类型 → select
  if (schema.enum && schema.enum.length > 0) {
    return (
      <div className='space-y-2'>
        <Label>
          {label}
          {required && <span className='ml-1 text-red-500'>*</span>}
        </Label>
        {description && (
          <p className='text-muted-foreground text-xs'>{description}</p>
        )}
        <select
          className='bg-background h-9 w-full rounded-md border px-3 text-sm'
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value=''>请选择</option>
          {schema.enum.map((opt) => (
            <option key={String(opt)} value={opt}>
              {String(opt)}
            </option>
          ))}
        </select>
      </div>
    )
  }

  switch (schema.type) {
    case 'boolean':
      return (
        <div className='flex items-center justify-between rounded-lg border p-3'>
          <div>
            <div className='text-sm font-medium'>{label}</div>
            {description && (
              <p className='text-muted-foreground text-xs'>{description}</p>
            )}
          </div>
          <Switch checked={!!value} onCheckedChange={onChange} />
        </div>
      )

    case 'number':
    case 'integer':
      return (
        <div className='space-y-2'>
          <Label>
            {label}
            {required && <span className='ml-1 text-red-500'>*</span>}
          </Label>
          {description && (
            <p className='text-muted-foreground text-xs'>{description}</p>
          )}
          <Input
            type='number'
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}
          />
        </div>
      )

    case 'array':
      return (
        <ArrayField
          name={name}
          label={label}
          description={description}
          itemSchema={schema.items}
          value={Array.isArray(value) ? value : []}
          required={required}
          onChange={onChange}
        />
      )

    case 'object':
      if (schema.properties) {
        return (
          <div className='space-y-2'>
            <Label>{label}</Label>
            {description && (
              <p className='text-muted-foreground text-xs'>{description}</p>
            )}
            <div className='rounded-lg border p-3'>
              <SchemaForm
                schema={schema}
                value={value || {}}
                onChange={onChange}
              />
            </div>
          </div>
        )
      }
      // 无 properties 的 object → JSON 文本框
      return (
        <div className='space-y-2'>
          <Label>
            {label}
            {required && <span className='ml-1 text-red-500'>*</span>}
          </Label>
          {description && (
            <p className='text-muted-foreground text-xs'>{description}</p>
          )}
          <textarea
            className='bg-background h-24 w-full rounded-md border p-2 font-mono text-xs'
            value={typeof value === 'object' ? JSON.stringify(value, null, 2) : value ?? ''}
            onChange={(e) => {
              try {
                onChange(JSON.parse(e.target.value))
              } catch {
                // 用户还在输入，暂不更新
              }
            }}
          />
        </div>
      )

    case 'string':
    default:
      return (
        <div className='space-y-2'>
          <Label>
            {label}
            {required && <span className='ml-1 text-red-500'>*</span>}
          </Label>
          {description && (
            <p className='text-muted-foreground text-xs'>{description}</p>
          )}
          <Input
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={schema.default ? `默认: ${schema.default}` : undefined}
          />
        </div>
      )
  }
}

/** 数组字段 */
function ArrayField({
  name,
  label,
  description,
  itemSchema,
  value,
  required,
  onChange,
}: {
  name: string
  label: string
  description?: string
  itemSchema?: SchemaProperty
  value: any[]
  required: boolean
  onChange: (v: any[]) => void
}) {
  const addItem = () => {
    const defaultValue = itemSchema?.type === 'object' ? {} : ''
    onChange([...value, defaultValue])
  }

  const removeItem = (index: number) => {
    onChange(value.filter((_, i) => i !== index))
  }

  const updateItem = (index: number, itemValue: any) => {
    const next = [...value]
    next[index] = itemValue
    onChange(next)
  }

  return (
    <div className='space-y-2'>
      <Label>
        {label}
        {required && <span className='ml-1 text-red-500'>*</span>}
      </Label>
      {description && (
        <p className='text-muted-foreground text-xs'>{description}</p>
      )}
      <div className='space-y-2'>
        {value.map((item, i) => (
          <div key={i} className='flex items-start gap-2'>
            <div className='flex-1'>
              {itemSchema?.type === 'object' && itemSchema.properties ? (
                <div className='rounded border p-2'>
                  <SchemaForm
                    schema={itemSchema}
                    value={item || {}}
                    onChange={(v) => updateItem(i, v)}
                  />
                </div>
              ) : (
                <Input
                  value={item ?? ''}
                  onChange={(e) => updateItem(i, e.target.value)}
                  placeholder={`${label} #${i + 1}`}
                />
              )}
            </div>
            <Button
              variant='outline'
              size='icon'
              className='h-9 w-9 shrink-0'
              onClick={() => removeItem(i)}
            >
              <Trash2 size={14} />
            </Button>
          </div>
        ))}
      </div>
      <Button variant='outline' size='sm' onClick={addItem}>
        <Plus size={14} />
        添加
      </Button>
    </div>
  )
}
