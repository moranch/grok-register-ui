import { type SVGProps } from 'react'

/**
 * Grok Register 品牌 Logo（内联 SVG 组件）
 *
 * - 紫蓝渐变圆角方形背景
 * - 白色字母 "G"
 * - 右上角绿色勾号（代表注册成功）
 *
 * 用法：<GrokLogo width={24} height={24} />
 */
export function GrokLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      viewBox='0 0 64 64'
      fill='none'
      aria-hidden='true'
      {...props}
    >
      <defs>
        <linearGradient
          id='grok-logo-bg'
          x1='0'
          y1='0'
          x2='64'
          y2='64'
          gradientUnits='userSpaceOnUse'
        >
          <stop offset='0%' stopColor='#6366f1' />
          <stop offset='100%' stopColor='#8b5cf6' />
        </linearGradient>
      </defs>
      <rect x='0' y='0' width='64' height='64' rx='14' fill='url(#grok-logo-bg)' />
      <path
        d='M40 22.5 C 38 19.5 34.5 17.5 30 17.5 C 22 17.5 17 23.5 17 32 C 17 40.5 22 46.5 30 46.5 C 37 46.5 42 41.5 42 34.5 L 42 31 L 31 31 L 31 35.5 L 36.5 35.5 C 36 39 33.5 41.5 30 41.5 C 25 41.5 22.5 37.5 22.5 32 C 22.5 26.5 25 22.5 30 22.5 C 32.5 22.5 34.5 23.5 35.8 25.5 Z'
        fill='white'
      />
      <circle cx='50' cy='14' r='9' fill='#22c55e' stroke='white' strokeWidth='2' />
      <path
        d='M46 14 L49 17 L54 11'
        stroke='white'
        strokeWidth='2.2'
        strokeLinecap='round'
        strokeLinejoin='round'
        fill='none'
      />
    </svg>
  )
}
